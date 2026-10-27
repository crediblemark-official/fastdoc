# Rencana Kerja & Tahapan Pengembangan: FastDoc

Dokumen ini memuat peta jalan pengembangan (*development roadmap*), pembagian milestone, deliverable kunci, dan kriteria pengujian untuk merealisasikan FastDoc dari tahap fondasi hingga rilis aplikasi desktop `.exe` dan `.msi` siap pakai.

---

## 1. Ikhtisar Milestone Pengembangan

```
Fase 1: Core Engine ──► Fase 2: Batch & Excel ──► Fase 3: Desktop UI ──► Fase 4: AI Copilot ──► Fase 5: Packaging .exe/.msi
(OpenXML Preservation)   (Streaming ZIP Generator) (Web Dashboard React)   (Asisten Narasi Rapor)  (Inno Setup & WiX Installer)
```

---

## 2. Rincian Setiap Fase

### Fase 1: Core OpenXML Engine & In-Place Injection
* **Tujuan:** Membangun mesin pemroses template `.docx` yang mampu mendeteksi variabel, merekonsiliasi run XML yang terpecah, dan melakukan penggantian teks secara in-place tanpa merusak kop surat, tabel, margin, font, dan gambar.
* **Deliverable Utama:**
  1. Modul Scanner Tag OpenXML (deteksi `{{ tag }}`, `{% tr %}`, `{% if %}`).
  2. Modul Run Reconciler (menggabungkan pecahan run XML bawaan Word).
  3. Modul Render Engine (in-place injection presisi).
* **Kriteria Pengujian (Validation):**
  - Menguji dokumen raport nyata (`AZZAM.docx`, `KENZI (1).docx`, `QIYAS.docx`).
  - Menghasilkan dokumen output dan memverifikasi bahwa kop surat TK Pembina Jatipurno, tabel ceklis 50 baris, margin, dan tanda tangan 100% identik dengan aslinya.

---

### Fase 2: Dynamic Schema, Excel Parser & Batch Engine
* **Tujuan:** Mengotomatiskan pembuatan skema formulir dan pemrosesan data massal via file spreadsheet.
* **Deliverable Utama:**
  1. Generator JSON Schema otomatis dari file template `.docx`.
  2. Generator Template Excel Kosong (`.xlsx`) berbasis tag yang terdeteksi.
  3. Parser & Normalizer Excel dengan fitur pembersihan data otomatis.
  4. Parallel Batch Processor dengan streaming kompresi ZIP di memori.
* **Kriteria Pengujian (Validation):**
  - Mengunggah 1 file Excel berisi 50 baris data siswa/karyawan.
  - Sistem menghasilkan 1 file `hasil_dokumen.zip` berisi 50 file `.docx` terpisah dalam waktu < 2 detik.

---

### Fase 3: Modern Desktop User Interface (UI/UX)
* **Tujuan:** Membangun antarmuka pengguna yang elegan, responsif, dan mudah digunakan oleh guru maupun staf kantor awam.
* **Deliverable Utama:**
  1. Komponen Drag & Drop Upload Template `.docx`.
  2. Panel Penampil Tag Variabel yang Terdeteksi (*Live Variable Inspector*).
  3. Formulir Input Dinamis Otomatis (Mode Cetak Satuan).
  4. Batch Spreadsheet Grid Uploader (Mode Cetak Massal).
  5. Download Center & Status Progress Bar.
* **Kriteria Pengujian (Validation):**
  - Pengguna dapat menyelesaikan alur dari unggah template hingga mengunduh dokumen hanya dalam 3 langkah mudah di layar.

---

### Fase 4: Integrasi AI Narrative Copilot
* **Tujuan:** Membantu pengguna menyusun teks narasi panjang (deskripsi capaian belajar murid atau latar belakang proposal bisnis) dari catatan kasar.
* **Deliverable Utama:**
  1. Preset Domain Prompt (Kurikulum Merdeka PAUD/SD, Kinerja SDM, Proposal Bisnis).
  2. Modal Dialog Interaktif AI Copilot di sebelah kolom narasi form.
  3. Fallback Offline: AI dapat dinonaktifkan tanpa mengganggu fungsi cetak dokumen utama.
* **Kriteria Pengujian (Validation):**
  - Input catatan singkat: *"Azzam aktif, hafal surah pendek, mandiri"* -> AI menghasilkan 1 paragraf narasi evaluasi baku sesuai kaidah pedagogis Kurikulum Merdeka.

---

### Fase 5: Desktop Packaging (.exe & .msi) & Final Polish
* **Tujuan:** Membungkus seluruh aplikasi ke dalam paket instalasi Windows mandiri yang siap didistribusikan.
* **Deliverable Utama:**
  1. Script PyInstaller untuk kompilasi Core Engine Python ke biner lokal mandiri.
  2. Konfigurasi Launcher Desktop WebView2 Windows.
  3. Script Inno Setup untuk membuat installer `FastDoc-Setup-1.0.0.exe`.
  4. Konfigurasi WiX Toolset untuk membuat installer `FastDoc-Enterprise.msi`.
  5. Versi `FastDoc-Portable.exe` siap pakai dari flashdisk.
* **Kriteria Pengujian (Validation):**
  - Menjalankan file installer pada komputer Windows bersih (tanpa Python dan tanpa Node.js terpasang).
  - Aplikasi berhasil terpasang, shortcut muncul di Desktop, dan aplikasi dapat langsung digunakan untuk mencetak dokumen.
