# FastDoc

> **Universal Template-Preserving Document Automation & Desktop Engine**  
> Otomasi dokumen massal berbasis Word (`.docx`) dan Excel (`.xlsx`) dengan perlindungan layout OpenXML 100%, pratinjau lembar langsung, ekspor PDF, dan AI Narrative Copilot.

---

## 🌟 Fitur Utama

1. **100% Layout & Format Preservation**
   - Mengisi dokumen Word tanpa mengubah kop surat, tabel, margin, font, maupun gambar.
   - Dilengkapi modul **OpenXML Run Reconciler** untuk menyatukan tag Jinja2 yang terpecah akibat spellcheck bawaan Word.

2. **Dua Mode Kerja Cepat**
   - **Mode Satuan (Single Form):** Formulir otomatis responsif dengan auto-complete data master (`@ mention`) dan sub-tabel dinamis.
   - **Mode Massal (Batch Excel):** Unggah 1 file spreadsheet Excel, sistem otomatis menghasilkan arsip `.zip` berisi ratusan dokumen dalam hitungan detik.

3. **Smart Fuzzy Column Matching**
   - Otomatis mencocokkan nama header kolom Excel ke variabel template (misal `Nama Siswa` -> `nama_lengkap`, `No. Induk` -> `no_induk`).

4. **Live Sheet Preview & PDF Export**
   - Pratinjau visual dokumen langsung di antarmuka sebelum dicetak.
   - Ekspor siap pakai dalam format Word (`.docx`) maupun `.pdf`.

5. **AI Narrative Copilot (Online & Offline)**
   - Mendukung Google Gemini (1.5 Flash) dan OpenAI (GPT-4o-mini) via REST API lokal.
   - Dilengkapi mesin sintesis tata bahasa offline resmi (Kurikulum Merdeka PAUD/SD, Kinerja Pegawai, Proposal/Surat).

6. **Penyimpanan Lokal & Data Lake (SQLite)**
   - Mendukung manajemen workspace dan data master lintas dokumen secara 100% offline dan privat di komputer lokal.

7. **Tanda Tangan Digital & Master Signatures Registry**
   - Mendukung pembubuhan tanda tangan langsung via Canvas Pad (mouse, touchpad, stylus pen).
   - Unggah gambar tanda tangan dengan filter **Auto-Transparent (Hapus Latar Putih Kertas)** otomatis.
   - Master Registry Tanda Tangan: simpan arsip tanda tangan pejabat, kepala sekolah, dan guru untuk dipakai berulang lintas dokumen.
   - Injeksi OpenXML InlineImage presisi tinggi dengan graceful fallback jika tanda tangan belum dibubuhkan.

---

## 🏗️ Arsitektur & Teknologi

- **Backend Engine:** Python 3.12, FastAPI, Uvicorn, `docxtpl`, `python-docx`, `openpyxl`, `mammoth`, `sqlite3`
- **Frontend UI:** React 18, TypeScript, Vite, Lucide Icons, Vanilla CSS
- **Desktop Launcher:** PyWebView / WebView2 Native Windows Runtime
- **Packaging:** PyInstaller, Inno Setup (`.exe`), WiX Toolset (`.msi`)

---

## 🚀 Menjalankan Secara Lokal

### 1. Prasyarat
- Python 3.10+
- Node.js 18+ & npm

### 2. Instalasi Dependensi Backend
```bash
python3 -m venv .venv
source .venv/bin/activate  # Di Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Instalasi Dependensi Frontend
```bash
cd ui
npm install
npm run build
cd ..
```

### 4. Menjalankan Aplikasi
```bash
# Menjalankan server backend lokal:
python3 run_engine.py

# Atau menjalankan mode native desktop window:
python3 desktop_launcher.py
```

Buka peramban di `http://127.0.0.1:8765` jika menjalankan via `run_engine.py`.

---

## 🧪 Menjalankan Pengujian (Unit Tests)

```bash
python3 -m unittest discover -s engine/tests
```

---

## 📖 Dokumentasi Lengkap

Dokumentasi lengkap arsitektur dan spesifikasi teknis tersedia di direktori `doc/`:
- [01_PRD_PRODUCT_REQUIREMENT.md](doc/01_PRD_PRODUCT_REQUIREMENT.md)
- [02_SYSTEM_ARCHITECTURE.md](doc/02_SYSTEM_ARCHITECTURE.md)
- [03_TEMPLATE_SYNTAX_GUIDE.md](doc/03_TEMPLATE_SYNTAX_GUIDE.md)
- [04_API_AND_DATA_SCHEMA.md](doc/04_API_AND_DATA_SCHEMA.md)
- [05_DESKTOP_PACKAGING_GUIDE.md](doc/05_DESKTOP_PACKAGING_GUIDE.md)
- [06_ROADMAP_AND_MILESTONES.md](doc/06_ROADMAP_AND_MILESTONES.md)

---

## 📄 Lisensi
Hak Cipta © 2026 FastDoc Team. Dilindungi Undang-Undang.
