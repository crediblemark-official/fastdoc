"""
FastDoc Local REST API Server
Menyediakan endpoint lokal untuk Desktop UI: scan template, ekspor excel,
generasi dokumen satuan & massal (ZIP), dan asisten narasi.
"""

import os
import io
import uuid
import shutil
from typing import Dict, Any, Optional
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel

from engine.core.scanner import DocxTagScanner, TemplateSchema
from engine.core.renderer import TemplateRenderer
from engine.core.excel_parser import ExcelManager
from engine.core.batch import BatchGenerator

app = FastAPI(
    title="FastDoc Desktop Engine API",
    version="1.0.0",
    description="Local background API service for FastDoc desktop application"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def add_no_cache_headers(request: Request, call_next):
    response = await call_next(request)
    # Cegah caching pada file HTML agar browser selalu mengambil aset Vite terbaru
    path = request.url.path
    if path == "/" or path.endswith(".html") or not "." in path.split("/")[-1]:
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
    return response

# Inisialisasi Database SQLite Lokal & Seeding
from engine.db.database import seed_initial_demo_data
seed_initial_demo_data()

# Hubungkan Workspace & Master Entity Router
from engine.api.workspace_routes import router as workspace_router
app.include_router(workspace_router)

# Direktori cache penyimpanan template lokal
STORAGE_DIR = os.path.join(os.path.expanduser("~"), ".fastdoc", "storage")
os.makedirs(STORAGE_DIR, exist_ok=True)

# In-memory registry untuk template yang sedang aktif
TEMPLATE_REGISTRY: Dict[str, Dict[str, Any]] = {}


@app.get("/api/system/health")
def health_check():
    """
    Cek status kesehatan engine lokal.
    """
    return {
        "status": "online",
        "app_name": "FastDoc Engine",
        "version": "1.0.0",
        "storage_dir": STORAGE_DIR
    }


from engine.core.auto_tagger import SmartAutoTagger

@app.post("/api/templates/scan")
async def scan_template(file: UploadFile = File(...)):
    """
    Mengunggah template .docx. Jika dokumen mentah (belum ada tag {{ }}),
    sistem secara otomatis mendeteksi field entitas dan mengubahnya menjadi template.
    """
    if not file.filename.endswith(".docx"):
        raise HTTPException(status_code=400, detail="File wajib berformat .docx")

    template_id = f"tpl_{uuid.uuid4().hex[:10]}"
    file_bytes = await file.read()

    # Simpan template ke storage lokal
    saved_path = os.path.join(STORAGE_DIR, f"{template_id}_{file.filename}")
    with open(saved_path, "wb") as f:
        f.write(file_bytes)

    # 1. Jalankan scanner OpenXML awal
    scanner = DocxTagScanner(saved_path)
    schema = scanner.scan()
    auto_converted = False
    extracted_data = {}

    # 2. Jika 0 variabel terdeteksi, jalankan Smart Auto-Tagger
    if schema.total_variables == 0:
        entities = SmartAutoTagger.detect_entities(saved_path)
        if entities:
            converted_path = os.path.join(STORAGE_DIR, f"{template_id}_converted_{file.filename}")
            SmartAutoTagger.convert_to_template(saved_path, converted_path, entities)
            
            # Baca bytes yang sudah terkonversi
            with open(converted_path, "rb") as f:
                file_bytes = f.read()
            saved_path = converted_path

            # Pindai ulang template hasil konversi
            scanner = DocxTagScanner(converted_path)
            schema = scanner.scan()
            auto_converted = True
            extracted_data = {k: v["value"] for k, v in entities.items()}

    # Daftarkan ke registry
    TEMPLATE_REGISTRY[template_id] = {
        "id": template_id,
        "filename": file.filename,
        "file_path": saved_path,
        "bytes": file_bytes,
        "schema": schema,
        "extracted_data": extracted_data
    }

    return {
        "status": "success",
        "data": {
            "template_id": template_id,
            "filename": file.filename,
            "schema": schema.model_dump(),
            "auto_converted": auto_converted,
            "extracted_data": extracted_data
        }
    }


@app.post("/api/templates/load-preset")
def load_preset_template():
    """
    Memuat template contoh Raport TK Pembina Jatipurno yang sudah siap dengan variabel lengkap.
    """
    preset_file = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "samples", "TEMPLATE_RAPORT_TK_FULL.docx")
    if not os.path.exists(preset_file):
        raise HTTPException(status_code=404, detail="File preset tidak ditemukan")

    template_id = f"tpl_preset_{uuid.uuid4().hex[:8]}"
    with open(preset_file, "rb") as f:
        file_bytes = f.read()

    saved_path = os.path.join(STORAGE_DIR, f"{template_id}_Raport_TK_Pembina.docx")
    with open(saved_path, "wb") as f:
        f.write(file_bytes)

    scanner = DocxTagScanner(saved_path)
    schema = scanner.scan()

    sample_values = {
        "nama_lengkap": "Kenzi Albiansyah Oktavian Prasetya",
        "nama_panggilan": "Kenzi",
        "no_induk": "1563",
        "nisn": "3197752667",
        "jenis_kelamin": "Laki-laki",
        "ttl": "Wonogiri, 3 Oktober 2019",
        "agama": "Islam",
        "nama_ayah": "Sidik Dwi Prastia",
        "nama_ibu": "Shela Zuliana Sofi",
        "ayah": "Wiraswasta",
        "kelurahan": "Balepanjang",
        "kecamatan": "Jatipurno",
        "kabupaten": "Wonogiri",
        "provinsi": "Jawa Tengah",
        "tahun_pelajaran": "2025/2026",
        "fase": "Fondasi",
        "pesan_penguatan": "Ananda Kenzi memiliki potensi dan kemampuan yang baik dalam berbagai aspek perkembangan. Dengan kerja sama yang baik antara orang tua dan sekolah, Ananda diharapkan semakin mampu mengembangkan fokus dan memaksimalkan potensi yang dimilikinya."
    }

    TEMPLATE_REGISTRY[template_id] = {
        "id": template_id,
        "filename": "Template_Raport_TK_Pembina.docx",
        "file_path": saved_path,
        "bytes": file_bytes,
        "schema": schema,
        "extracted_data": sample_values
    }

    return {
        "status": "success",
        "data": {
            "template_id": template_id,
            "filename": "Template_Raport_TK_Pembina.docx",
            "schema": schema.model_dump(),
            "auto_converted": False,
            "extracted_data": sample_values
        }
    }



@app.get("/api/templates/{template_id}/excel-template")
def get_excel_template(template_id: str):
    """
    Mengunduh file Excel (.xlsx) kosong yang header-nya sudah terpetakan otomatis.
    """
    if template_id not in TEMPLATE_REGISTRY:
        raise HTTPException(status_code=404, detail="Template ID tidak ditemukan")

    entry = TEMPLATE_REGISTRY[template_id]
    schema: TemplateSchema = entry["schema"]

    stream = ExcelManager.generate_template(schema.variables)
    excel_filename = f"Format_Data_{os.path.splitext(entry['filename'])[0]}.xlsx"

    return StreamingResponse(
        stream,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{excel_filename}"'}
    )


from engine.core.pdf_converter import PDFConverter
from engine.core.preview_renderer import PreviewRenderer

class SingleGenerateRequest(BaseModel):
    template_id: str
    output_filename: Optional[str] = None
    output_format: Optional[str] = "docx"
    data: Dict[str, Any]


@app.post("/api/generate/single")
def generate_single_doc(req: SingleGenerateRequest):
    """
    Menghasilkan 1 dokumen (.docx atau .pdf) berdasarkan data JSON form.
    """
    if req.template_id not in TEMPLATE_REGISTRY:
        raise HTTPException(status_code=404, detail="Template ID tidak ditemukan")

    entry = TEMPLATE_REGISTRY[req.template_id]
    template_bytes = entry["bytes"]

    doc_stream = io.BytesIO(template_bytes)
    renderer = TemplateRenderer(doc_stream)
    renderer.render(req.data)
    output_stream = renderer.save_to_stream()

    base_name = os.path.splitext(req.output_filename or f"Hasil_{entry['filename']}")[0]

    if req.output_format and req.output_format.lower() == "pdf":
        try:
            pdf_stream = PDFConverter.convert_docx_to_pdf(output_stream)
            return StreamingResponse(
                pdf_stream,
                media_type="application/pdf",
                headers={"Content-Disposition": f'attachment; filename="{base_name}.pdf"'}
            )
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Gagal konversi ke PDF: {str(e)}")

    filename = f"{base_name}.docx"
    return StreamingResponse(
        output_stream,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )


class PreviewSingleRequest(BaseModel):
    template_id: str
    data: Dict[str, Any]


@app.post("/api/generate/preview")
def preview_single_doc(req: PreviewSingleRequest):
    """
    Pratinjau HTML instan untuk dokumen tunggal.
    """
    if req.template_id not in TEMPLATE_REGISTRY:
        raise HTTPException(status_code=404, detail="Template ID tidak ditemukan")

    entry = TEMPLATE_REGISTRY[req.template_id]
    doc_stream = io.BytesIO(entry["bytes"])
    try:
        html = PreviewRenderer.render_preview_html(doc_stream, req.data)
        return {
            "status": "success",
            "data": {
                "html": html,
                "template_name": entry["filename"]
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal membuat pratinjau: {str(e)}")


@app.post("/api/system/clean-cache")
def clean_storage_cache():
    """
    Membersihkan file temporary di folder cache storage.
    """
    cleaned_count = 0
    if os.path.exists(STORAGE_DIR):
        for f in os.listdir(STORAGE_DIR):
            file_path = os.path.join(STORAGE_DIR, f)
            try:
                if os.path.isfile(file_path):
                    os.remove(file_path)
                    cleaned_count += 1
            except Exception:
                pass
    return {"status": "success", "message": f"Berhasil membersihkan {cleaned_count} file cache"}


@app.post("/api/generate/batch")
async def generate_batch_docs(
    template_id: str = Form(...),
    filename_pattern: str = Form("Dokumen_{{ loop.index }}.docx"),
    data_file: UploadFile = File(...)
):
    """
    Menghasilkan banyak dokumen dari file Excel (.xlsx) dan mengembalikan file ZIP.
    """
    if template_id not in TEMPLATE_REGISTRY:
        raise HTTPException(status_code=404, detail="Template ID tidak ditemukan")

    entry = TEMPLATE_REGISTRY[template_id]
    excel_bytes = await data_file.read()

    # Baca baris-baris data dari Excel
    excel_stream = io.BytesIO(excel_bytes)
    records = ExcelManager.parse_data(excel_stream)

    if not records:
        raise HTTPException(status_code=400, detail="File Excel kosong atau tidak memiliki baris data")

    # Jalankan batch generator
    batch_gen = BatchGenerator(entry["bytes"])
    zip_stream = batch_gen.generate_zip(records, filename_pattern=filename_pattern)

    zip_filename = f"Batch_{os.path.splitext(entry['filename'])[0]}.zip"

    return StreamingResponse(
        zip_stream,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{zip_filename}"'}
    )


class NarrativeRequest(BaseModel):
    domain: str = "kurikulum_merdeka"
    target_subject: str = "Murid"
    bullet_notes: str
    tone: str = "formal_pedagogis"
    api_key: Optional[str] = None
    provider: Optional[str] = "auto"


from engine.core.ai_copilot import AICopilotEngine

@app.post("/api/ai/narrative")
def generate_narrative(req: NarrativeRequest):
    """
    Asisten narasi deskriptif. Mendukung online LLM (Gemini 1.5 Flash / OpenAI GPT-4o-mini)
    jika API key disetel, serta fallback cerdas offline multi-domain.
    """
    result = AICopilotEngine.generate(
        bullet_notes=req.bullet_notes,
        domain=req.domain,
        target_subject=req.target_subject,
        tone=req.tone,
        api_key=req.api_key,
        provider=req.provider or "auto"
    )

    return {
        "status": "success",
        "data": result
    }


# Mount Static UI Assets jika sudah di-build
from fastapi.staticfiles import StaticFiles

UI_DIST_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "ui", "dist")
if os.path.exists(UI_DIST_PATH):
    app.mount("/", StaticFiles(directory=UI_DIST_PATH, html=True), name="ui_static")

