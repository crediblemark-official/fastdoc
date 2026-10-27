"""
FastDoc Local SQLite Database Layer
Menyediakan penyimpanan lokal permanen untuk Workspaces, Templates,
Master Entity Registry (Data Siswa/Pegawai/Klien lintas dokumen),
dan integrasi Smart Merge & Deduplication.
"""

import os
import json
import sqlite3
import uuid
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime

DB_DIR = os.path.join(os.path.expanduser("~"), ".fastdoc")
os.makedirs(DB_DIR, exist_ok=True)
DB_PATH = os.path.join(DB_DIR, "fastdoc.db")


def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """
    Inisialisasi tabel database SQLite.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    # 1. Tabel Workspaces (Proyek per jenis dokumen)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS workspaces (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        category TEXT DEFAULT 'general',
        icon TEXT DEFAULT 'folder',
        active_template_id TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

    # 2. Tabel Workspace Templates (.docx)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS workspace_templates (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL,
        filename TEXT NOT NULL,
        file_path TEXT NOT NULL,
        schema_json TEXT NOT NULL,
        is_active INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
    )
    """)

    # 3. Tabel Master Entities (Global Data Lake lintas workspace)
    # Menyimpan data murid, karyawan, atau klien yang bisa dipakai di dokumen mana saja
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS master_entities (
        id TEXT PRIMARY KEY,
        entity_type TEXT DEFAULT 'siswa',
        primary_identifier TEXT, -- NISN, NIK, No Induk (kunci unik deduplikasi)
        display_name TEXT NOT NULL,
        attributes_json TEXT NOT NULL, -- Seluruh kolom atribut tersimpan di sini
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

    # 4. Tabel Workspace Records (Data spesifik di dalam workspace/tabulasi)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS workspace_records (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL,
        entity_id TEXT, -- Relasi opsional ke master_entities
        display_name TEXT NOT NULL,
        data_json TEXT NOT NULL,
        is_completed INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
        FOREIGN KEY (entity_id) REFERENCES master_entities(id) ON DELETE SET NULL
    )
    """)

    conn.commit()
    conn.close()


# ==============================================================================
# CRUD Workspaces
# ==============================================================================

def get_all_workspaces() -> List[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
    SELECT w.*, 
           (SELECT COUNT(*) FROM workspace_records r WHERE r.workspace_id = w.id) as total_records,
           (SELECT t.filename FROM workspace_templates t WHERE t.id = w.active_template_id) as active_template_name
    FROM workspaces w
    ORDER BY w.created_at DESC
    """)
    rows = cursor.fetchall()
    result = [dict(r) for r in rows]
    conn.close()
    return result


def get_workspace_by_id(workspace_id: str) -> Optional[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM workspaces WHERE id = ?", (workspace_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        return None

    ws = dict(row)
    # Ambil template aktif
    cursor.execute("SELECT * FROM workspace_templates WHERE workspace_id = ? ORDER BY created_at DESC", (workspace_id,))
    templates = [dict(t) for t in cursor.fetchall()]
    for t in templates:
        t["schema"] = json.loads(t["schema_json"])
    ws["templates"] = templates

    # Ambil data records di workspace ini
    cursor.execute("SELECT * FROM workspace_records WHERE workspace_id = ? ORDER BY created_at ASC", (workspace_id,))
    records = []
    for r in cursor.fetchall():
        item = dict(r)
        item["data"] = json.loads(item["data_json"])
        records.append(item)
    ws["records"] = records

    conn.close()
    return ws


def create_workspace(name: str, description: str = "", category: str = "sekolah", icon: str = "folder") -> Dict[str, Any]:
    conn = get_db_connection()
    cursor = conn.cursor()
    ws_id = f"ws_{uuid.uuid4().hex[:8]}"
    cursor.execute("""
    INSERT INTO workspaces (id, name, description, category, icon)
    VALUES (?, ?, ?, ?, ?)
    """, (ws_id, name, description, category, icon))
    conn.commit()
    conn.close()
    return get_workspace_by_id(ws_id)


def delete_workspace(workspace_id: str) -> bool:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM workspaces WHERE id = ?", (workspace_id,))
    conn.commit()
    conn.close()
    return True


# ==============================================================================
# Master Data Hub (Global Data Lake dengan Smart Deduplication)
# ==============================================================================

def get_master_entities(search: str = "", entity_type: str = "") -> List[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    query = "SELECT * FROM master_entities WHERE 1=1"
    params = []

    if entity_type:
        query += " AND entity_type = ?"
        params.append(entity_type)

    if search:
        query += " AND (display_name LIKE ? OR primary_identifier LIKE ?)"
        params.extend([f"%{search}%", f"%{search}%"])

    query += " ORDER BY display_name ASC"
    cursor.execute(query, params)
    rows = cursor.fetchall()
    result = []
    for r in rows:
        item = dict(r)
        item["attributes"] = json.loads(item["attributes_json"])
        result.append(item)
    conn.close()
    return result


def upsert_master_entity(display_name: str, attributes: Dict[str, Any], entity_type: str = "siswa") -> Dict[str, Any]:
    """
    Menyimpan atau menggabungkan (merge) profil entitas ke master data.
    Jika NISN / NIK / Nama sudah ada, sistem otomatis menggabungkan kolom-kolom baru (Smart Merge)!
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    # Tentukan kunci unik primer (prioritas: nisn -> nik -> no_induk -> nama_lengkap)
    primary_id = (
        str(attributes.get("nisn") or attributes.get("nik") or attributes.get("no_induk") or attributes.get("nomor_induk") or "")
    ).strip()

    existing = None
    if primary_id:
        cursor.execute("SELECT * FROM master_entities WHERE primary_identifier = ?", (primary_id,))
        existing = cursor.fetchone()

    if not existing:
        # Cari berdasarkan nama jika identifier belum ada
        cursor.execute("SELECT * FROM master_entities WHERE LOWER(display_name) = LOWER(?)", (display_name.strip(),))
        existing = cursor.fetchone()

    now = datetime.now().isoformat()

    if existing:
        # MERGE: Gabungkan data atribut yang sudah ada dengan yang baru
        entity_id = existing["id"]
        old_attributes = json.loads(existing["attributes_json"])
        merged_attributes = {**old_attributes, **attributes}

        cursor.execute("""
        UPDATE master_entities 
        SET display_name = ?, primary_identifier = COALESCE(?, primary_identifier), attributes_json = ?, updated_at = ?
        WHERE id = ?
        """, (display_name, primary_id or existing["primary_identifier"], json.dumps(merged_attributes), now, entity_id))
    else:
        # INSERT baru
        entity_id = f"ent_{uuid.uuid4().hex[:8]}"
        cursor.execute("""
        INSERT INTO master_entities (id, entity_type, primary_identifier, display_name, attributes_json, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (entity_id, entity_type, primary_id or None, display_name, json.dumps(attributes), now, now))

    conn.commit()
    conn.close()

    return {
        "id": entity_id,
        "display_name": display_name,
        "primary_identifier": primary_id,
        "attributes": attributes
    }


# ==============================================================================
# Workspace Records (Tabulasi Dokumen)
# ==============================================================================

def add_record_to_workspace(workspace_id: str, data: Dict[str, Any], entity_id: Optional[str] = None) -> Dict[str, Any]:
    conn = get_db_connection()
    cursor = conn.cursor()

    record_id = f"rec_{uuid.uuid4().hex[:8]}"
    display_name = str(data.get("nama_lengkap") or data.get("nama_murid") or data.get("nama") or f"Data #{record_id[-4:]}")

    cursor.execute("""
    INSERT INTO workspace_records (id, workspace_id, entity_id, display_name, data_json)
    VALUES (?, ?, ?, ?, ?)
    """, (record_id, workspace_id, entity_id, display_name, json.dumps(data)))

    conn.commit()
    conn.close()

    return {
        "id": record_id,
        "workspace_id": workspace_id,
        "entity_id": entity_id,
        "display_name": display_name,
        "data": data
    }


def update_workspace_record(record_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
    conn = get_db_connection()
    cursor = conn.cursor()
    display_name = str(data.get("nama_lengkap") or data.get("nama_murid") or data.get("nama") or "Data")

    cursor.execute("""
    UPDATE workspace_records
    SET display_name = ?, data_json = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
    """, (display_name, json.dumps(data), record_id))

    conn.commit()
    conn.close()
    return {"id": record_id, "display_name": display_name, "data": data}


def delete_workspace_record(record_id: str) -> bool:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM workspace_records WHERE id = ?", (record_id,))
    conn.commit()
    conn.close()
    return True


# ==============================================================================
# Seeding Awal Data Nyata (Kenzi, Azzam, Qiyas, Rayyan, Inara)
# ==============================================================================

def seed_initial_demo_data():
    """
    Mengisi data awal jika database masih kosong.
    """
    init_db()
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) as count FROM workspaces")
    count = cursor.fetchone()["count"]
    conn.close()

    if count > 0:
        return

    print("Mengisi data awal FastDoc Studio...")

    # 1. Buat Master Entities Siswa
    murid_samples = [
        {
            "display_name": "Kenzi Albiansyah Oktavian Prasetya",
            "attributes": {
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
                "pesan_penguatan": "Ananda Kenzi memiliki potensi dan kemampuan yang baik dalam berbagai aspek perkembangan. Ananda diharapkan semakin mampu mengembangkan fokus dan memaksimalkan potensi belajarnya."
            }
        },
        {
            "display_name": "Fathan Azzam Alano",
            "attributes": {
                "nama_lengkap": "Fathan Azzam Alano",
                "nama_panggilan": "Azzam",
                "no_induk": "1555",
                "nisn": "3198824801",
                "jenis_kelamin": "Laki-laki",
                "ttl": "Wonogiri, 12 September 2019",
                "agama": "Islam",
                "nama_ayah": "Parwoto",
                "nama_ibu": "Lia Muslika",
                "ayah": "Wiraswasta",
                "kelurahan": "Jatipurno",
                "kecamatan": "Jatipurno",
                "kabupaten": "Wonogiri",
                "provinsi": "Jawa Tengah",
                "pesan_penguatan": "Selamat kepada Ananda Azzam atas perkembangan yang telah dicapai selama belajar di TK Negeri Pembina Jatipurno. Ananda menunjukkan sikap mandiri dan percaya diri yang sangat baik."
            }
        },
        {
            "display_name": "Qdisa Rinqiyas Anindira",
            "attributes": {
                "nama_lengkap": "Qdisa Rinqiyas Anindira",
                "nama_panggilan": "Qiyas",
                "no_induk": "1574",
                "nisn": "3205881930",
                "jenis_kelamin": "Perempuan",
                "ttl": "Wonogiri, 5 Juli 2020",
                "agama": "Islam",
                "nama_ayah": "Rudi Haryanto",
                "nama_ibu": "Dwi Astuti",
                "ayah": "Karyawan Swasta",
                "kelurahan": "Jatipurno",
                "kecamatan": "Jatipurno",
                "kabupaten": "Wonogiri",
                "provinsi": "Jawa Tengah",
                "pesan_penguatan": "Ananda Qiyas merupakan anak yang memiliki semangat belajar positif dan ceria. Teruslah berkreasi dan mengasah keberanian tampil di depan kelas."
            }
        },
        {
            "display_name": "Muhammad Rayyan Al-Ghifari",
            "attributes": {
                "nama_lengkap": "Muhammad Rayyan Al-Ghifari",
                "nama_panggilan": "Rayyan",
                "no_induk": "1588",
                "nisn": "3219988771",
                "jenis_kelamin": "Laki-laki",
                "ttl": "Wonogiri, 17 Januari 2020",
                "agama": "Islam",
                "nama_ayah": "Ahmad Fauzi",
                "nama_ibu": "Siti Nurhaliza",
                "ayah": "PNS",
                "kelurahan": "Girimarto",
                "kecamatan": "Girimarto",
                "kabupaten": "Wonogiri",
                "provinsi": "Jawa Tengah",
                "pesan_penguatan": "Ananda Rayyan berkembang sangat baik dalam daya imajinasi dan kemampuan sosial emosional."
            }
        },
        {
            "display_name": "Aisyah Ayudia Inara",
            "attributes": {
                "nama_lengkap": "Aisyah Ayudia Inara",
                "nama_panggilan": "Inara",
                "no_induk": "1589",
                "nisn": "3219988772",
                "jenis_kelamin": "Perempuan",
                "ttl": "Wonogiri, 22 April 2020",
                "agama": "Islam",
                "nama_ayah": "Bambang Susilo",
                "nama_ibu": "Rina Marlina",
                "ayah": "Wiraswasta",
                "kelurahan": "Jatipurno",
                "kecamatan": "Jatipurno",
                "kabupaten": "Wonogiri",
                "provinsi": "Jawa Tengah",
                "pesan_penguatan": "Ananda Inara sangat teliti, santun, dan senang membantu teman-temannya dalam kegiatan kelompok."
            }
        }
    ]

    saved_entities = []
    for m in murid_samples:
        ent = upsert_master_entity(m["display_name"], m["attributes"], entity_type="siswa")
        saved_entities.append(ent)

    # 2. Buat Default Workspace: "Rapor TK Pembina Jatipurno"
    ws = create_workspace(
        name="Rapor Semester Genap - TK Pembina",
        description="Laporan Pertumbuhan dan Perkembangan Murid PAUD / TK Kurikulum Merdeka",
        category="rapor",
        icon="graduation-cap"
    )
    ws_id = ws["id"]

    # Pasang template master ke workspace ini
    sample_tpl = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "samples", "TEMPLATE_RAPORT_TK_FULL.docx")
    if os.path.exists(sample_tpl):
        from engine.core.scanner import DocxTagScanner
        scanner = DocxTagScanner(sample_tpl)
        schema = scanner.scan()

        conn = get_db_connection()
        cursor = conn.cursor()
        tpl_id = f"tpl_{uuid.uuid4().hex[:8]}"
        cursor.execute("""
        INSERT INTO workspace_templates (id, workspace_id, filename, file_path, schema_json)
        VALUES (?, ?, ?, ?, ?)
        """, (tpl_id, ws_id, "TEMPLATE_RAPORT_TK_FULL.docx", sample_tpl, json.dumps(schema.model_dump())))
        cursor.execute("UPDATE workspaces SET active_template_id = ? WHERE id = ?", (tpl_id, ws_id))
        conn.commit()
        conn.close()

    # Masukkan 5 murid ke workspace tabulasi ini
    for ent in saved_entities:
        add_record_to_workspace(ws_id, ent["attributes"], entity_id=ent["id"])

    # 3. Buat Workspace Kedua untuk demo Cross-Workspace: "Piagam Penghargaan Siswa"
    ws_cert = create_workspace(
        name="Piagam & Sertifikat Prestasi",
        description="Penerbitan piagam kelulusan dan piagam lomba siswa",
        category="sertifikat",
        icon="award"
    )
    print("Inisialisasi database dan demo data selesai!")


if __name__ == "__main__":
    init_db()
    seed_initial_demo_data()
