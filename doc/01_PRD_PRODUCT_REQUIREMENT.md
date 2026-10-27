# Product Requirement Document (PRD): FastDoc

**Nama Produk:** FastDoc  
**Kategori:** Desktop Productivity & Document Automation  
**Target Pengguna:** Guru, Staf Tata Usaha, HRD, Notaris/Legal, Bagian Pengadaan, Pemerintahan  
**Platform Target:** Windows Desktop (`.exe` Installer, `.msi` Enterprise, Portable `.exe`)  

---

## 1. Latar Belakang & Masalah (Problem Statement)

Banyak profesi dan instansi bekerja dengan ratusan dokumen yang memiliki format baku (resmi):
* **Sekolah/TK:** Rapor siswa Kurikulum Merdeka (seperti contoh `AZZAM.docx`, `KENZI (1).docx`, `QIYAS.docx`), surat kelulusan, sertifikat piagam.
* **Kantor Notaris & Hukum:** Perjanjian Kerjasama (MoU), Surat Perjanjian Kerja (SPK), Akta Sewa, Surat Kuasa.
* **Perusahaan & HRD:** Surat Tugas, Surat Peringatan (SP), Offering Letter, Slip Gaji.
* **Pengadaan & Bisnis:** Surat Penawaran Harga (Quotation/RAB), Invoice Resmi, Bukti Pembayaran.

### Hambatan Saat Ini:
1. **Pekerjaan Manual yang Membosankan:**  
   Pengguna harus membuka Microsoft Word satu per satu, menggulir (*scroll*), mengklik pointer secara manual ke setiap kolom yang ingin diubah (nama, NISN, nilai, catatan), lalu melakukan *Save As*. Jika ada 30 murid atau 100 karyawan, proses ini memakan waktu seharian penuh dan sangat rentan terhadap kesalahan ketik (*human error*).
2. **Kelemahan Fatal AI Generatif Biasa:**  
   Jika pengguna meminta ChatGPT, Claude, atau AI agent membuatkan dokumen, AI akan membuat dokumen baru dari nol (*scratch*). Akibatnya:
   - Kop surat dan logo instansi hilang atau posisinya bergeser.
   - Margin kertas dan posisi *page-break* rusak.
   - Tabel berbaris banyak (seperti tabel ceklis capaian 50 baris di raport) lebar kolomnya berubah dan tidak simetris.
   - Dokumen hasil tidak dapat langsung dicetak karena tidak sesuai standar resmi instansi.

---

## 2. Solusi Produk & Nilai Tambah (Value Proposition)

FastDoc hadir dengan pendekatan **Universal Template-Preserving Engine**:
1. **100% Presisi Format Asli:** Pengguna tetap mendesain dokumen sesuka hati di Microsoft Word. FastDoc hanya mengganti teks di dalam tanda kurung kurawal ganda `{{ ... }}` tanpa menyentuh satu milimeter pun kop surat, tabel, margin, font, atau logo.
2. **Satu Aplikasi untuk Dokumen Apapun (Agnostik):** Tidak terkunci pada raport sekolah; format surat dinas, kontrak hukum, sertifikat, atau invoice dapat diproses oleh mesin yang sama.
3. **Pengisian Fleksibel (Satuan & Massal):**
   - **Mode Form Satuan:** Isi form cepat di aplikasi untuk cetak 1 dokumen instan.
   - **Mode Batch Excel:** Unggah 1 file Excel (misal rekap nilai 50 siswa), klik *Generate*, dan seluruh 50 dokumen Word/PDF langsung siap dalam 1 file ZIP.
4. **AI Narrative Copilot:** AI bertindak sebagai asisten pengarang narasi deskriptif (misal: menyusun catatan capaian siswa atau latar belakang proposal berdasarkan beberapa poin catatan singkat dari pengguna).
5. **Aplikasi Desktop Mandiri (.exe & .msi):**
   - Pengguna tinggal *double-click* ikon di Desktop.
   - Tidak membutuhkan instalasi Python/Node.js sama sekali.
   - Bisa berjalan **100% offline** (menjamin kerahasiaan data rahasia instansi/murid).

---

## 3. Profil Pengguna (Target Personas)

### Persona 1: Bu Guru Puput (Guru TK / SD)
* **Kebutuhan:** Menyiapkan 35 buku laporan pertumbuhan & perkembangan siswa setiap akhir semester.
* **Frustrasi:** Mengetik ulang nama, TTL, nomor induk, ceklis tabel nilai, dan pusing mengarang kalimat narasi evaluasi untuk setiap anak.
* **Solusi FastDoc:** Bu Guru upload master raport `.docx`, upload rekap nilai Excel, tulis poin karakter murid, AI merangkai narasi raport formal, lalu 35 raport selesai ter-generate dalam 3 detik.

### Persona 2: Pak Hendra (Staf SDM / HRD Korporasi)
* **Kebutuhan:** Menerbitkan 80 Surat Perjanjian Kerja (SPK) untuk karyawan kontrak baru dengan klausul gaji dan masa kerja yang berbeda-beda.
* **Frustrasi:** *Mail merge* bawaan Word sering merusak format font dan sulit menangani tabel dinamis atau kondisi tertentu.
* **Solusi FastDoc:** Template SPK dipetakan dengan variabel `{{ nama }}`, `{{ gaji }}`, dan `{{ masa_kontrak }}`. Sekali klik, 80 SPK terbit rapi dalam format `.docx` dan `.pdf`.

### Persona 3: Mbak Rina (Sekretaris Notaris / Kantor Hukum)
* **Kebutuhan:** Membuat draft Perjanjian Sewa / Akta Jual Beli berdasarkan identitas pihak pertama dan pihak kedua.
* **Frustrasi:** Takut salah ketik NIK atau alamat, serta tidak boleh mengunggah dokumen rahasia klien ke website cloud pihak ketiga.
* **Solusi FastDoc:** Berjalan secara offline di laptop kantor via aplikasi desktop `.exe`, menjamin data klien tidak pernah keluar ke internet.

---

## 4. Kebutuhan Fungsional (Functional Requirements)

### 4.1 Modul Pengelolaan Template
* **FR-1.1:** Pengguna dapat mengunggah file template bertipe `.docx`.
* **FR-1.2:** Sistem secara otomatis mendeteksi semua tag variabel `{{ variabel }}` di dalam isi dokumen, header, footer, maupun tabel.
* **FR-1.3:** Sistem mendukung penanda baris tabel berulang (*table row loops*) dengan tag `{% tr for item in list %}` ... `{% tr endfor %}`.
* **FR-1.4:** Sistem mendukung logika kondisional `{% if syarat %}` ... `{% endif %}`.
* **FR-1.5:** Sistem menyediakan tombol untuk mengekspor template Excel kosong (`.xlsx`) yang header kolomnya otomatis sesuai dengan daftar tag yang terdeteksi.

### 4.2 Modul Pengisian Data
* **FR-2.1 (Single Mode):** Sistem otomatis membuat formulir web dinamis berdasarkan tag yang ada di template (input teks, angka/uang, tanggal, dan tabel).
* **FR-2.2 (Batch Mode):** Pengguna dapat mengunggah file Excel (`.xlsx`) atau CSV yang memuat data banyak entitas (1 baris = 1 dokumen).
* **FR-2.3 (Smart Fuzzy Match):** Jika nama kolom di Excel sedikit berbeda dengan nama tag di template (contoh: kolom `Nama Murid` vs tag `nama_murid`), sistem otomatis mencocokkan (*auto-map*).

### 4.3 Modul AI Copilot (Opsional/Bisa Dimatikan Saat Offline)
* **FR-3.1:** Pengguna dapat menginput beberapa poin catatan mentah (contoh: *"aktif, suka balok, perlu didorong antre"*).
* **FR-3.2:** AI mengubah poin tersebut menjadi paragraf narasi resmi sesuai dengan domain yang dipilih (Kurikulum Merdeka, Laporan Kinerja HR, atau Pengantar Legal).
* **FR-3.3:** Pengguna dapat meninjau dan mengedit hasil narasi AI sebelum dicetak.

### 4.4 Modul Generasi & Ekspor
* **FR-4.1:** Menghasilkan dokumen keluaran dalam format `.docx` dengan layout, font, kop surat, margin, dan gambar 100% identik dengan template asli.
* **FR-4.2:** Menyediakan opsi ekspor ke format `.pdf` berkualitas tinggi.
* **FR-4.3:** Untuk mode batch, sistem mengemas seluruh dokumen hasil ke dalam satu file arsip `.zip` dengan penamaan file yang rapi (contoh: `Raport_Azzam.docx`, `Raport_Kenzi.docx`).

---

## 5. Kebutuhan Non-Fungsional (Non-Functional Requirements)

* **NFR-1 (Kecepatan):** Waktu pembuatan 1 dokumen tidak boleh lebih dari 50 milidetik. Pembuatan batch 100 dokumen harus selesai di bawah 3 detik.
* **NFR-2 (Privasi & Keamanan Data):** Seluruh pemrosesan dokumen berjalan secara lokal di laptop pengguna. Tidak ada data nama, NIK, atau nilai yang dikirim ke server luar (kecuali teks yang secara eksplisit dikirim ke AI Copilot).
* **NFR-3 (Ukuran Aplikasi & Efisiensi):** Ukuran installer Windows tidak melebihi 60 MB. Penggunaan memori RAM saat idle di bawah 100 MB.
* **NFR-4 (Kompatibilitas Sistem Operasi):** Berjalan lancar di Windows 10 (64-bit) dan Windows 11 tanpa memerlukan hak akses Administrator (bisa dipasang per-user atau portable).
