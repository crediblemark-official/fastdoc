"""
FastDoc Workspace & Master Entity API Routes
Menyediakan endpoint untuk Workspace, Tabulasi Data, Master Registry,
dan Integrasi Mention @.
"""

import os
import io
import json
import uuid
import zipfile
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from engine.db.database import (
    get_all_workspaces,
    get_workspace_by_id,
    create_workspace,
    delete_workspace,
    get_master_entities,
    upsert_master_entity,
    add_record_to_workspace,
    update_workspace_record,
    delete_workspace_record,
    get_master_signatures,
    get_master_signature_by_id,
    upsert_master_signature,
    delete_master_signature,
    get_db_connection
)
from engine.core.scanner import DocxTagScanner
from engine.core.renderer import TemplateRenderer
from engine.core.excel_parser import ExcelManager
from engine.core.batch import BatchGenerator
from engine.core.auto_tagger import SmartAutoTagger
from engine.core.preview_renderer import PreviewRenderer
from engine.core.template_builder import TemplateBuilder

router = APIRouter(prefix="/api", tags=["Workspaces & Master Hub"])

STORAGE_DIR = os.path.join(os.path.expanduser("~"), ".fastdoc", "storage")
os.makedirs(STORAGE_DIR, exist_ok=True)


# ==============================================================================
# Workspaces Endpoints
# ==============================================================================

@router.get("/workspaces")
def list_workspaces():
    return {"status": "success", "data": get_all_workspaces()}


class CreateWorkspaceRequest(BaseModel):
    name: str
    description: Optional[str] = ""
    category: Optional[str] = "sekolah"
    icon: Optional[str] = "folder"


@router.post("/workspaces")
def create_new_workspace(req: CreateWorkspaceRequest):
    ws = create_workspace(req.name, req.description, req.category, req.icon)
    return {"status": "success", "data": ws}


@router.get("/workspaces/{workspace_id}")
def get_workspace_detail(workspace_id: str):
    ws = get_workspace_by_id(workspace_id)
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace tidak ditemukan")
    return {"status": "success", "data": ws}


@router.delete("/workspaces/{workspace_id}")
def remove_workspace(workspace_id: str):
    delete_workspace(workspace_id)
    return {"status": "success", "message": "Workspace berhasil dihapus"}


# ==============================================================================
# Workspace Template Management
# ==============================================================================

@router.post("/workspaces/{workspace_id}/templates")
async def upload_workspace_template(workspace_id: str, file: UploadFile = File(...)):
    ws = get_workspace_by_id(workspace_id)
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace tidak ditemukan")

    file_bytes = await file.read()
    tpl_id = f"tpl_{uuid.uuid4().hex[:8]}"
    saved_path = os.path.join(STORAGE_DIR, f"{tpl_id}_{file.filename}")

    with open(saved_path, "wb") as f:
        f.write(file_bytes)

    # 1. Pindai template
    scanner = DocxTagScanner(saved_path)
    schema = scanner.scan()

    # 2. Jika 0 variabel, gunakan smart auto tagger
    if schema.total_variables == 0:
        entities = SmartAutoTagger.detect_entities(saved_path)
        if entities:
            converted_path = os.path.join(STORAGE_DIR, f"{tpl_id}_converted_{file.filename}")
            SmartAutoTagger.convert_to_template(saved_path, converted_path, entities)
            saved_path = converted_path
            scanner = DocxTagScanner(converted_path)
            schema = scanner.scan()

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
    INSERT INTO workspace_templates (id, workspace_id, filename, file_path, schema_json)
    VALUES (?, ?, ?, ?, ?)
    """, (tpl_id, workspace_id, file.filename, saved_path, json.dumps(schema.model_dump())))

    cursor.execute("UPDATE workspaces SET active_template_id = ? WHERE id = ?", (tpl_id, workspace_id))
    conn.commit()
    conn.close()

    return {"status": "success", "data": get_workspace_by_id(workspace_id)}


class CommitCustomTemplateRequest(BaseModel):
    temp_id: str
    filename: str
    tags: List[Dict[str, Any]]


@router.post("/workspaces/{workspace_id}/preview-docx-html")
async def preview_docx_html_for_workspace(workspace_id: str, file: UploadFile = File(...)):
    """
    Mengunggah file .docx mentah untuk ditampilkan di Visual Template Studio.
    Mengembalikan HTML lembar A4 yang interaktif dan daftar saran placeholder.
    """
    ws = get_workspace_by_id(workspace_id)
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace tidak ditemukan")
    if not file.filename.endswith(".docx"):
        raise HTTPException(status_code=400, detail="File wajib berformat .docx")

    import re
    temp_id = f"temp_{uuid.uuid4().hex[:8]}"
    file_bytes = await file.read()
    temp_path = os.path.join(STORAGE_DIR, f"{temp_id}_{file.filename}")
    with open(temp_path, "wb") as f:
        f.write(file_bytes)

    # 1. Konversi ke HTML lembar A4
    styled_html = PreviewRenderer.render_preview_html(temp_path)

    # 2. Pindai jika ada tag {{ ... }} yang sudah ada
    existing_scanner = DocxTagScanner(temp_path)
    existing_schema = existing_scanner.scan()

    # 3. Ekstrak placeholder kurung siku seperti [COMPANY NAME] sebagai saran
    suggested_tags = []
    seen = set()
    bracket_matches = re.findall(r"\[([A-Z0-9_\s\.\/]{2,40})\]", styled_html)
    for tag in bracket_matches:
        tag_str = tag.strip()
        low = tag_str.lower()
        if any(ign in low for ign in ["blank", "halaman", "sisa", "page", "empty"]):
            continue
        if tag_str not in seen:
            seen.add(tag_str)
            clean_key = re.sub(r"[^a-zA-Z0-9\s]+", " ", tag_str.lower()).strip()
            clean_key = re.sub(r"\s+", "_", clean_key).strip("_")
            suggested_tags.append({
                "original_text": f"[{tag_str}]",
                "key": clean_key or "field",
                "label": tag_str.title(),
                "data_type": "string"
            })

    return {
        "status": "success",
        "data": {
            "temp_id": temp_id,
            "filename": file.filename,
            "html": styled_html,
            "existing_variables": [v.model_dump() for v in existing_schema.variables],
            "suggested_tags": suggested_tags
        }
    }


@router.post("/workspaces/{workspace_id}/commit-custom-template")
def commit_custom_template(workspace_id: str, req: CommitCustomTemplateRequest):
    """
    Menyimpan hasil pemetaan variabel dari Visual Template Studio ke dalam berkas Word asli.
    """
    ws = get_workspace_by_id(workspace_id)
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace tidak ditemukan")

    temp_path = None
    for f in os.listdir(STORAGE_DIR):
        if f.startswith(f"{req.temp_id}_"):
            temp_path = os.path.join(STORAGE_DIR, f)
            break

    if not temp_path or not os.path.exists(temp_path):
        raise HTTPException(status_code=404, detail="Berkas draf sementara tidak ditemukan atau sudah kedaluwarsa")

    tpl_id = f"tpl_{uuid.uuid4().hex[:8]}"
    saved_path = os.path.join(STORAGE_DIR, f"{tpl_id}_{req.filename}")

    # Suntikkan tag yang ditentukan user ke docx
    schema = TemplateBuilder.apply_tags_to_docx(temp_path, saved_path, req.tags)

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
    INSERT INTO workspace_templates (id, workspace_id, filename, file_path, schema_json)
    VALUES (?, ?, ?, ?, ?)
    """, (tpl_id, workspace_id, req.filename, saved_path, json.dumps(schema.model_dump())))

    cursor.execute("UPDATE workspaces SET active_template_id = ? WHERE id = ?", (tpl_id, workspace_id))
    conn.commit()
    conn.close()

    # Bersihkan file temp
    try:
        os.remove(temp_path)
    except Exception:
        pass

    return {
        "status": "success",
        "data": get_workspace_by_id(workspace_id),
        "schema": schema.model_dump()
    }


@router.post("/workspaces/{workspace_id}/active-template/open-studio")
def open_active_template_in_studio(workspace_id: str):
    """
    Membuka template yang saat ini aktif di workspace langsung ke Visual Template Studio
    tanpa perlu mengunggah ulang file dari komputer.
    """
    import shutil
    import re
    ws = get_workspace_by_id(workspace_id)
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace tidak ditemukan")
    if not ws.get("templates"):
        raise HTTPException(status_code=400, detail="Workspace belum memiliki template aktif")

    active_tpl = ws["templates"][0]
    source_path = active_tpl["file_path"]
    if not os.path.exists(source_path):
        raise HTTPException(status_code=404, detail="Berkas fisik template tidak ditemukan")

    temp_id = f"temp_{uuid.uuid4().hex[:8]}"
    temp_path = os.path.join(STORAGE_DIR, f"{temp_id}_{active_tpl['filename']}")
    shutil.copy2(source_path, temp_path)

    styled_html = PreviewRenderer.render_preview_html(temp_path)
    existing_scanner = DocxTagScanner(temp_path)
    existing_schema = existing_scanner.scan()

    suggested_tags = []
    seen = set()
    bracket_matches = re.findall(r"\[([A-Z0-9_\s\.\/]{2,40})\]", styled_html)
    for tag in bracket_matches:
        tag_str = tag.strip()
        low = tag_str.lower()
        if any(ign in low for ign in ["blank", "halaman", "sisa", "page", "empty"]):
            continue
        if tag_str not in seen:
            seen.add(tag_str)
            clean_key = re.sub(r"[^a-zA-Z0-9\s]+", " ", tag_str.lower()).strip()
            clean_key = re.sub(r"\s+", "_", clean_key).strip("_")
            suggested_tags.append({
                "original_text": f"[{tag_str}]",
                "key": clean_key or "field",
                "label": tag_str.title(),
                "data_type": "string"
            })

    return {
        "status": "success",
        "data": {
            "temp_id": temp_id,
            "filename": active_tpl["filename"],
            "html": styled_html,
            "existing_variables": [v.model_dump() for v in existing_schema.variables],
            "suggested_tags": suggested_tags
        }
    }


@router.put("/workspaces/{workspace_id}/active-template/{template_id}")
def set_active_template_for_workspace(workspace_id: str, template_id: str):
    """
    Mengganti template aktif pada workspace ke salah satu template yang tersimpan.
    """
    ws = get_workspace_by_id(workspace_id)
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace tidak ditemukan")

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM workspace_templates WHERE id = ? AND workspace_id = ?", (template_id, workspace_id))
    tpl = cursor.fetchone()
    if not tpl:
        conn.close()
        raise HTTPException(status_code=404, detail="Template tidak ditemukan di workspace ini")

    cursor.execute("UPDATE workspaces SET active_template_id = ? WHERE id = ?", (template_id, workspace_id))
    conn.commit()
    conn.close()

    return {"status": "success", "data": get_workspace_by_id(workspace_id)}


@router.delete("/workspaces/{workspace_id}/templates/{template_id}")
def delete_workspace_template(workspace_id: str, template_id: str):
    """
    Menghapus template tertentu dari riwayat workspace.
    """
    ws = get_workspace_by_id(workspace_id)
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace tidak ditemukan")

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT file_path FROM workspace_templates WHERE id = ? AND workspace_id = ?", (template_id, workspace_id))
    row = cursor.fetchone()
    if row and row["file_path"] and os.path.exists(row["file_path"]):
        try:
            os.remove(row["file_path"])
        except Exception:
            pass

    cursor.execute("DELETE FROM workspace_templates WHERE id = ? AND workspace_id = ?", (template_id, workspace_id))

    if ws.get("active_template_id") == template_id:
        cursor.execute("SELECT id FROM workspace_templates WHERE workspace_id = ? ORDER BY created_at DESC LIMIT 1", (workspace_id,))
        remaining = cursor.fetchone()
        new_active = remaining["id"] if remaining else None
        cursor.execute("UPDATE workspaces SET active_template_id = ? WHERE id = ?", (new_active, workspace_id))

    conn.commit()
    conn.close()

    return {"status": "success", "data": get_workspace_by_id(workspace_id)}


@router.get("/workspaces/{workspace_id}/excel-template")
def download_workspace_excel_template(workspace_id: str):
    ws = get_workspace_by_id(workspace_id)
    if not ws or not ws.get("templates"):
        raise HTTPException(status_code=400, detail="Workspace belum memiliki template aktif")

    active_tpl = ws["templates"][0]
    variables = active_tpl["schema"]["variables"]

    from engine.core.scanner import VariableMeta
    var_objs = [VariableMeta(**v) for v in variables]
    stream = ExcelManager.generate_template(var_objs)

    filename = f"Format_{ws['name'].replace(' ', '_')}.xlsx"
    return StreamingResponse(
        stream,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )


# ==============================================================================
# Workspace Tabulation Records & Smart Import
# ==============================================================================

class SaveRecordRequest(BaseModel):
    data: Dict[str, Any]
    entity_id: Optional[str] = None


@router.post("/workspaces/{workspace_id}/records")
def add_record(workspace_id: str, req: SaveRecordRequest):
    # Simpan juga ke Master Entities agar bisa dipakai di workspace lain (Cross-Workspace)!
    display_name = str(req.data.get("nama_lengkap") or req.data.get("nama_murid") or req.data.get("nama") or "Data")
    ent = upsert_master_entity(display_name, req.data)

    rec = add_record_to_workspace(workspace_id, req.data, entity_id=ent["id"])
    return {"status": "success", "data": rec}


@router.put("/workspaces/{workspace_id}/records/{record_id}")
def update_record(workspace_id: str, record_id: str, req: SaveRecordRequest):
    rec = update_workspace_record(record_id, req.data)
    # Sinkronisasi ke master entities jika ada nama
    display_name = str(req.data.get("nama_lengkap") or req.data.get("nama_murid") or req.data.get("nama") or "Data")
    upsert_master_entity(display_name, req.data)
    return {"status": "success", "data": rec}


@router.delete("/workspaces/{workspace_id}/records/{record_id}")
def remove_record(workspace_id: str, record_id: str):
    delete_workspace_record(record_id)
    return {"status": "success", "message": "Record berhasil dihapus"}


from engine.core.pdf_converter import PDFConverter
from engine.core.preview_renderer import PreviewRenderer

@router.post("/workspaces/{workspace_id}/import-excel")
async def import_excel_to_workspace(workspace_id: str, data_file: UploadFile = File(...)):
    """
    Mengimpor data dari Excel langsung ke dalam Tabulasi Workspace,
    menggunakan Smart Fuzzy Column Matching otomatis!
    """
    ws = get_workspace_by_id(workspace_id)
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace tidak ditemukan")

    target_vars = []
    if ws.get("templates"):
        schema = ws["templates"][0].get("schema", {})
        target_vars = [v["key"] for v in schema.get("variables", [])]

    excel_bytes = await data_file.read()
    excel_stream = io.BytesIO(excel_bytes)
    records = ExcelManager.parse_data(excel_stream, target_variables=target_vars if target_vars else None)

    imported_count = 0
    for r in records:
        display_name = str(r.get("nama_lengkap") or r.get("nama_murid") or r.get("nama") or f"Data #{imported_count+1}")
        # Smart Deduplication & Upsert ke Master Lake
        ent = upsert_master_entity(display_name, r)
        # Tambah ke workspace
        add_record_to_workspace(workspace_id, r, entity_id=ent["id"])
        imported_count += 1

    return {
        "status": "success",
        "message": f"Berhasil mengimpor {imported_count} baris data ke workspace (dengan Smart Fuzzy Matching)",
        "data": get_workspace_by_id(workspace_id)
    }


# ==============================================================================
# Selective Generation (Cetak 1 Murid atau Batch Murid Terpilih)
# ==============================================================================

class BatchSelectedRequest(BaseModel):
    record_ids: List[str]
    filename_pattern: Optional[str] = "Dokumen_{{ nama_panggilan }}.docx"


@router.post("/workspaces/{workspace_id}/generate-selected")
def generate_selected_records(workspace_id: str, req: BatchSelectedRequest):
    ws = get_workspace_by_id(workspace_id)
    if not ws or not ws.get("templates"):
        raise HTTPException(status_code=400, detail="Workspace belum memiliki template aktif")

    active_tpl = ws["templates"][0]
    template_path = active_tpl["file_path"]

    with open(template_path, "rb") as f:
        template_bytes = f.read()

    # Ambil hanya data records yang dipilih oleh pengguna
    records_to_generate = [r["data"] for r in ws["records"] if r["id"] in req.record_ids]
    if not records_to_generate:
        # Jika kosong, ambil semua
        records_to_generate = [r["data"] for r in ws["records"]]

    if not records_to_generate:
        raise HTTPException(status_code=400, detail="Tidak ada data yang dipilih untuk di-generate")

    batch_gen = BatchGenerator(template_bytes)
    zip_stream = batch_gen.generate_zip(records_to_generate, filename_pattern=req.filename_pattern)

    zip_filename = f"Batch_{ws['name'].replace(' ', '_')}.zip"
    return StreamingResponse(
        zip_stream,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{zip_filename}"'}
    )


@router.get("/workspaces/{workspace_id}/records/{record_id}/generate")
def generate_single_record_doc(workspace_id: str, record_id: str, format: str = "docx"):
    ws = get_workspace_by_id(workspace_id)
    if not ws or not ws.get("templates"):
        raise HTTPException(status_code=400, detail="Workspace belum memiliki template aktif")

    active_tpl = ws["templates"][0]
    template_path = active_tpl["file_path"]

    target_rec = next((r for r in ws.get("records", []) if r["id"] == record_id), None)
    if not target_rec:
        raise HTTPException(status_code=404, detail="Data record tidak ditemukan")

    with open(template_path, "rb") as f:
        template_bytes = f.read()

    doc_stream = io.BytesIO(template_bytes)
    renderer = TemplateRenderer(doc_stream)
    renderer.render(target_rec["data"])
    output_stream = renderer.save_to_stream()

    safe_name = target_rec.get("display_name", "Dokumen").replace(" ", "_")
    base_filename = os.path.splitext(active_tpl['filename'])[0]

    if format.lower() == "pdf":
        try:
            pdf_stream = PDFConverter.convert_docx_to_pdf(output_stream)
            filename = f"{safe_name}_{base_filename}.pdf"
            return StreamingResponse(
                pdf_stream,
                media_type="application/pdf",
                headers={"Content-Disposition": f'attachment; filename="{filename}"'}
            )
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Gagal konversi ke PDF: {str(e)}")

    filename = f"{safe_name}_{base_filename}.docx"
    return StreamingResponse(
        output_stream,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )


class PreviewRequest(BaseModel):
    data: Dict[str, Any]


@router.post("/workspaces/{workspace_id}/preview")
def preview_workspace_document(workspace_id: str, req: PreviewRequest):
    """
    Menghasilkan pratinjau HTML instan untuk data formulir yang sedang diisi (Live Preview).
    """
    ws = get_workspace_by_id(workspace_id)
    if not ws or not ws.get("templates"):
        raise HTTPException(status_code=400, detail="Workspace belum memiliki template aktif")

    active_tpl = ws["templates"][0]
    template_path = active_tpl["file_path"]

    try:
        html = PreviewRenderer.render_preview_html(template_path, req.data)
        return {
            "status": "success",
            "data": {
                "html": html,
                "template_name": active_tpl["filename"]
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal membuat pratinjau: {str(e)}")


# ==============================================================================
# Master Data Hub (Global Auto-Complete & Mention @)
# ==============================================================================

@router.get("/entities")
def search_entities(q: str = "", type: str = ""):
    """
    Endpoint pencarian master entities untuk fitur auto-complete mention @ di formulir.
    """
    entities = get_master_entities(search=q, entity_type=type)
    return {"status": "success", "data": entities}


class UpsertEntityRequest(BaseModel):
    display_name: str
    attributes: Dict[str, Any]
    entity_type: Optional[str] = "siswa"


@router.post("/entities")
def save_entity(req: UpsertEntityRequest):
    ent = upsert_master_entity(req.display_name, req.attributes, req.entity_type)
    return {"status": "success", "data": ent}


# ==============================================================================
# Master Signatures Hub (Tanda Tangan Digital Tersimpan)
# ==============================================================================

@router.get("/signatures")
def list_signatures():
    """
    Mengambil seluruh daftar tanda tangan resmi yang tersimpan di Master Registry.
    """
    signatures = get_master_signatures()
    return {"status": "success", "data": signatures}


class UpsertSignatureRequest(BaseModel):
    id: Optional[str] = None
    name: str
    role_title: Optional[str] = ""
    image_data: str
    pen_color: Optional[str] = "#1E3A8A"


@router.post("/signatures")
def save_signature(req: UpsertSignatureRequest):
    """
    Menyimpan atau memperbarui tanda tangan ke Master Registry.
    """
    sig = upsert_master_signature(
        name=req.name,
        role_title=req.role_title or "",
        image_data=req.image_data,
        pen_color=req.pen_color or "#1E3A8A",
        sig_id=req.id
    )
    return {"status": "success", "data": sig}


@router.delete("/signatures/{sig_id}")
def remove_signature(sig_id: str):
    """
    Menghapus tanda tangan dari Master Registry.
    """
    delete_master_signature(sig_id)
    return {"status": "success", "message": "Tanda tangan berhasil dihapus"}
