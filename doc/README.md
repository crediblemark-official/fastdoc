# Dokumentasi Sistem FastDoc

Selamat datang di repositori dokumentasi resmi **FastDoc** (*Universal Template-Preserving Document Automation & Desktop Engine*).

FastDoc adalah aplikasi desktop mandiri (tersedia dalam format installer `.exe` dan `.msi`) yang memungkinkan instansi, sekolah, kantor hukum, dan korporasi untuk menghasilkan ribuan dokumen bervariasi dengan data dan AI tanpa merusak 1 milimeter pun tata letak (*layout*), kop surat, tabel, margin, font, dan format asli Microsoft Word.

---

## Daftar Isi Dokumentasi

Seluruh spesifikasi teknis dan perancangan sistem telah disusun secara modular di dalam direktori `doc/`:

| No | Dokumen | Deskripsi |
| :---: | :--- | :--- |
| **01** | [01_PRD_PRODUCT_REQUIREMENT.md](file:///media/rasyiqi/7653717A1C07B131/fastdoc/doc/01_PRD_PRODUCT_REQUIREMENT.md) | **Product Requirement Document (PRD)**<br>Latar belakang, profil pengguna target, use-case universal (sekolah, hukum, HR, keuangan), dan kriteria penerimaan produk. |
| **02** | [02_SYSTEM_ARCHITECTURE.md](file:///media/rasyiqi/7653717A1C07B131/fastdoc/doc/02_SYSTEM_ARCHITECTURE.md) | **Arsitektur Sistem & Engine**<br>Arsitektur aplikasi desktop (Tauri/WebView2 + Embedded Python), mekanisme in-place XML injection, run reconciliation, dan pipeline batch. |
| **03** | [03_TEMPLATE_SYNTAX_GUIDE.md](file:///media/rasyiqi/7653717A1C07B131/fastdoc/doc/03_TEMPLATE_SYNTAX_GUIDE.md) | **Panduan Sintaks Template Universal**<br>Standar penulisan variabel `{{ tag }}`, tabel looping baris `{% tr %}`, kondisional `{% if %}`, format tanggal/mata uang, dan penyisipan gambar dinamis. |
| **04** | [04_API_AND_DATA_SCHEMA.md](file:///media/rasyiqi/7653717A1C07B131/fastdoc/doc/04_API_AND_DATA_SCHEMA.md) | **Spesifikasi Skema Data & API Internal**<br>JSON Schema dinamis, format file spreadsheet Excel/CSV massal, dan spesifikasi IPC/REST API internal antarmuka. |
| **05** | [05_DESKTOP_PACKAGING_GUIDE.md](file:///media/rasyiqi/7653717A1C07B131/fastdoc/doc/05_DESKTOP_PACKAGING_GUIDE.md) | **Panduan Packaging Desktop (.exe & .msi)**<br>Strategi bundling runtime Python tanpa instalasi, pembuatan installer NSIS `.exe`, Windows Installer `.msi`, dan versi Portable. |
| **06** | [06_ROADMAP_AND_MILESTONES.md](file:///media/rasyiqi/7653717A1C07B131/fastdoc/doc/06_ROADMAP_AND_MILESTONES.md) | **Rencana Kerja & Tahapan Pengembangan**<br>Milestone pengembangan dari Fase 1 (Core Engine) hingga Fase rilis binary installer siap pakai. |

---

## Ringkasan Alur Kerja Pengguna

```
┌─────────────────────────────────┐
│ 1. Siapkan Template Dokumen     │ Pengguna mendesain dokumen di MS Word sesuka hati
│    (Surat / Kontrak / Raport)   │ dan menyisipkan penanda tag variabel {{ ... }}.
└────────────────┬────────────────┘
                 ▼
┌─────────────────────────────────┐
│ 2. Buka Aplikasi Desktop        │ Aplikasi otomatis membaca tag dan menyediakan:
│    (FastDoc.exe)                │ • Form isian instan di layar
│                                 │ • Template file Excel siap unduh
└────────────────┬────────────────┘
                 ▼
┌─────────────────────────────────┐
│ 3. Isi Data & Bantuan AI        │ • Input manual satuan, atau upload rekap Excel
│                                 │ • AI membantu mengarang narasi/paragraf resmi
└────────────────┬────────────────┘
                 ▼
┌─────────────────────────────────┐
│ 4. Cetak Instan (1-Click)       │ Menghasilkan 1 dokumen langsung atau bundle ZIP
│    (100% Layout Terkunci)       │ berisi ratusan dokumen (.docx / .pdf).
└─────────────────────────────────┘
```
