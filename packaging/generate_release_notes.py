import os
import glob
import hashlib
from datetime import datetime, timezone

def calculate_sha256(filepath):
    h = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(8192):
            h.update(chunk)
    return h.hexdigest()

def main():
    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    
    installer_files = glob.glob(os.path.join(root_dir, "dist_installer", "*.exe"))
    portable_files = glob.glob(os.path.join(root_dir, "dist", "*.zip"))

    installer_path = installer_files[0] if installer_files else None
    portable_path = portable_files[0] if portable_files else None

    app_version = os.environ.get("APP_VERSION", "1.0.0")
    run_number = os.environ.get("GITHUB_RUN_NUMBER", "dev")
    commit_sha = os.environ.get("GITHUB_SHA", "local")[:7]
    release_date = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")

    table_rows = []
    if installer_path and os.path.exists(installer_path):
        name = os.path.basename(installer_path)
        size = f"{os.path.getsize(installer_path) / (1024 * 1024):.2f} MB"
        sha = calculate_sha256(installer_path)
        table_rows.append(f"| **{name}** | Windows Installer (.exe) | {size} | `{sha}` |")
        installer_name = name
    else:
        installer_name = f"FastDoc-Setup-{app_version}.exe"

    if portable_path and os.path.exists(portable_path):
        name = os.path.basename(portable_path)
        size = f"{os.path.getsize(portable_path) / (1024 * 1024):.2f} MB"
        sha = calculate_sha256(portable_path)
        table_rows.append(f"| **{name}** | Portable Archive (.zip) | {size} | `{sha}` |")
        portable_name = name
    else:
        portable_name = f"FastDoc-Portable-v{app_version}-windows-x64.zip"

    table_content = "\n".join(table_rows) if table_rows else "| File not found | - | - | - |"

    body = f"""# 🚀 FastDoc for Windows v{app_version}

Aplikasi Desktop Otomasi Dokumen & Generator Template Cepat untuk Windows.

---

### 📦 Berkas Unduhan & Verifikasi Keaslian (Checksum SHA-256)

| Berkas | Tipe | Ukuran | Checksum SHA-256 |
| :--- | :--- | :--- | :--- |
{table_content}

---

### ✨ Fitur Unggulan di Versi Ini
- 🎨 **Visual Template Studio**: Pemetaan variabel interaktif langsung di atas dokumen dengan mode terang modern (cukup drag & select teks untuk menentukan nama variabel).
- ✍️ **Master Signature Explorer**: Manajemen tanda tangan digital terpusat, pengisian dinamis, dan pratinjau dokumen instan.
- ⚡ **High-Speed OpenXML Engine**: Pemrosesan template DOCX cepat dan stabil berbasis Jinja2 & python-docx.
- 📊 **Excel Batch Processing**: Pembuatan ratusan dokumen otomatis dari file data spreadsheet Excel dalam hitungan detik.
- 🪟 **Modern Desktop GUI**: Tampilan native responsif berbasis Microsoft Edge WebView2 tanpa memunculkan jendela terminal hitam CMD.

---

### 💻 Panduan Instalasi & Penggunaan
1. **Varian Setup Installer (`.exe`)**:
   - Unduh berkas **{installer_name}**.
   - Jalankan file installer dan ikuti wizard pemasangan (shortcut otomatis dibuat di Desktop & Start Menu).
2. **Varian Portable Standalone (`.zip`)**:
   - Unduh berkas **{portable_name}**.
   - Ekstrak ke folder mana pun di PC Anda.
   - Buka folder hasil ekstraksi dan jalankan **FastDoc.exe** langsung tanpa perlu install.

> 💡 **Catatan Keamanan Windows SmartScreen**:
> Jika Windows menampilkan proteksi *"Windows protected your PC"* saat membuka aplikasi untuk pertama kali, klik **More info** (Informasi selengkapnya) lalu pilih **Run anyway** (Tetap jalankan). Hal ini lumrah terjadi pada aplikasi rilis baru yang belum menggunakan sertifikat berbayar.

---

### 🖥️ Kebutuhan Sistem
- **Sistem Operasi**: Windows 10 (64-bit) / Windows 11
- **Runtime**: Microsoft Edge WebView2 (sudah bawaan Windows 10/11)
- **Arsitektur**: x64

---
*Build: #{run_number} | Commit: {commit_sha} | Waktu Rilis: {release_date}*
"""

    out_file = os.path.join(root_dir, "release_body.md")
    with open(out_file, "w", encoding="utf-8") as f:
        f.write(body)
    print(f"[OK] release_body.md generated successfully at {out_file}")

if __name__ == "__main__":
    main()
