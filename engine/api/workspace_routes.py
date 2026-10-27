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
    get_db_connection
)
from engine.core.scanner import DocxTagScanner
from engine.core.renderer import TemplateRenderer
from engine.core.excel_parser import ExcelManager
from engine.core.batch import BatchGenerator
from engine.core.auto_tagger import SmartAutoTagger

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
