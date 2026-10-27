# Panduan Lengkap Sintaks Template Dokumen: FastDoc

Panduan ini adalah acuan resmi bagi pengguna atau pembuat template dokumen (`.docx`) agar dapat memanfaatkan seluruh fitur otomatisasi FastDoc secara maksimal.

---

## 1. Prinsip Dasar Pembuatan Template

1. **Gunakan Microsoft Word atau Google Docs Seperti Biasa:**  
   Buat kop surat, atur margin, pasang logo, buat tabel, dan tentukan jenis huruf (*font*) sesuai standar resmi instansi Anda.
2. **Ganti Teks Dinamis dengan Tag Kurung Kurawal Ganda:**  
   Setiap bagian yang isinya berubah-ubah (seperti nama orang, nomor surat, tanggal, atau nilai) diganti dengan penanda format `{{ nama_variabel }}`.
3. **Simpan Sebagai `.docx`:**  
   Format file wajib berekstensi `.docx` (Office OpenXML).

---

## 2. Sintaks Variabel Teks Standar

Sintaks paling sederhana untuk mengganti kata atau kalimat pendek:

```jinja2
Nama Lengkap      : {{ nama_lengkap }}
Nomor Induk / NIK : {{ nomor_induk }}
Alamat Tinggal    : {{ alamat }}
```

### 2.1 Filter Format Otomatis
FastDoc menyediakan filter cerdas untuk memformat angka, tanggal, dan huruf secara otomatis:

| Filter | Contoh Penulisan Tag | Hasil Output |
| :--- | :--- | :--- |
| **Rupiah / Mata Uang** | `{{ nominal \| rupiah }}` | `Rp 15.500.000,00` |
| **Format Tanggal Indo** | `{{ tgl_lahir \| format_date }}` | `12 September 2019` |
| **Huruf Kapital Penuh** | `{{ nama \| upper }}` | `FATHAN AZZAM ALANO` |
| **Huruf Awal Kapital** | `{{ nama \| title }}` | `Fathan Azzam Alano` |
| **Terbilang Angka** | `{{ nominal \| terbilang }}` | *Lima Belas Juta Lima Ratus Ribu Rupiah* |

---

## 3. Tabel Berulang Dinamis (Table Row Loop: `{% tr %}`)

Fitur ini digunakan saat jumlah baris dalam sebuah tabel bersifat dinamis (bisa 2 baris, 5 baris, atau 50 baris), misalnya pada rincian belanja, daftar nilai, atau invoice.

### Cara Penulisan di Dalam Baris Tabel Word:
Letakkan tag `{% tr for ... %}` di sel paling kiri dan `{% tr endfor %}` di sel paling kanan:

| No | Nama Barang / Uraian | Qty | Harga Satuan | Total |
| :---: | :--- | :---: | :---: | :---: |
| `{% tr for item in daftar_belanja %}` {{ loop.index }} | {{ item.nama }} | {{ item.qty }} | {{ item.harga \| rupiah }} | {{ item.subtotal \| rupiah }} `{% tr endfor %}` |

* **Kelebihan Sintaks `{% tr %}`:** FastDoc akan menduplikasi baris tabel tersebut secara otomatis ke bawah dengan gaya garis border, warna latar sel, dan lebar kolom yang **100% presisi**.

---

## 4. Logika Kondisional (`{% if %}`)

Digunakan jika suatu teks, paragraf, atau klausul hanya boleh muncul apabila syarat tertentu terpenuhi:

### Contoh 1: Keterangan Kelulusan
```jinja2
{% if nilai_akhir >= 75 %}
Dinyatakan: LULUS dengan predikat Memuaskan.
{% else %}
Dinyatakan: BELUM LULUS dan wajib mengikuti ujian remedial.
{% endif %}
```

### Contoh 2: Tanda Ceklis Otomatis (✓) pada Kolom Nilai Rapor
Pada dokumen raport (seperti kasus `AZZAM.docx`), terdapat tabel ceklis capaian: `BB`, `MB`, `BSH`, `BSB`.  
Anda cukup menuliskan ekspresi ceklis:

| Indikator Capaian | BB | MB | BSH | BSB |
| :--- | :---: | :---: | :---: | :---: |
| Menirukan gerakan shalat | {{ "✓" if capaian == "BB" }} | {{ "✓" if capaian == "MB" }} | {{ "✓" if capaian == "BSH" }} | {{ "✓" if capaian == "BSB" }} |

---

## 5. Penyisipan Gambar Dinamis (Dynamic Image)

Digunakan untuk menyisipkan foto profil siswa, foto kegiatan dokumentasi, atau tanda tangan digital:

```jinja2
{{ image:foto_siswa:width=3cm,height=4cm }}
{{ image:tanda_tangan_kepsek:width=4.5cm }}
{{ ttd_guru }}
{{ ttd_kepsek }}
```

* Nilai di dalam data dapat berupa data Base64 / Data URI canvas (`data:image/png;base64,...`), path file lokal, atau konfigurasi objek.
* Jika tanda tangan atau foto tidak dibubuhkan, sistem akan mengosongkan area secara elegan tanpa memunculkan error (*graceful fallback*).
* Sistem FastDoc otomatis menyediakan widget **Signature Canvas Pad** (gores langsung, unggah dengan auto-remove background putih kertas, dan pilihan dari Master Registry).

---

## 6. Contoh Nyata Penerapan di Berbagai Jenis Dokumen

### Kasus A: Rapor TK / PAUD (Kurikulum Merdeka)
```jinja2
Nama Murid     : {{ nama_lengkap }}
Nomor Induk    : {{ no_induk }}
NISN           : {{ nisn }}

ELEMEN NILAI AGAMA DAN BUDI PEKERTI
{{ narasi_nilai_agama }}

PESAN-PESAN DAN PENGUATAN
{{ pesan_dan_penguatan }}

Kepala Satuan Pendidikan               Guru Kelompok
{{ nama_kepala_sekolah }}             {{ nama_guru }}
NIP. {{ nip_kepala_sekolah }}          NIP. {{ nip_guru }}
```

### Kasus B: Surat Perjanjian Kerja (SPK)
```jinja2
SURAT PERJANJIAN KERJA WAKTU TERTENTU
Nomor: {{ no_spk }}

Pada hari ini, {{ tanggal_spk | format_date }}, telah disepakati perjanjian kerja antara:
1. {{ nama_perusahaan }}, beralamat di {{ alamat_perusahaan }} (Pihak Pertama)
2. {{ nama_karyawan }}, NIK: {{ nik_karyawan }} (Pihak Kedua)

Pasal 1: Posisi & Masa Kontrak
Pihak Kedua diterima bekerja sebagai {{ jabatan }} untuk masa kerja selama {{ masa_bulan }} bulan, terhitung mulai tanggal {{ tgl_mulai | format_date }} hingga {{ tgl_selesai | format_date }}.

Pasal 2: Kompensasi
Pihak Pertama memberikan gaji pokok sebesar {{ gaji_pokok | rupiah }} ({{ gaji_pokok | terbilang }}) per bulan.
```

---

## 7. Tips Praktis Menghindari Kesalahan (*Best Practices*)

1. **Ketik Tag Secara Langsung:**  
   Hindari mengetik tag dengan cara menghapus dan mengedit huruf di tengah kurung berkali-kali. Jika tag terlihat aneh di Word, hapus seluruh tag dan ketik ulang dari awal secara utuh.
2. **Gunakan Huruf Kecil dan Garis Bawah (*snake_case*):**  
   Gunakan penamaan variabel yang jelas dan konsisten, misalnya `{{ nama_lengkap }}` atau `{{ no_telepon }}` alih-alih `{{ Nama Lengkap (Murid) }}`.
3. **Uji Coba dengan Fitur Scan FastDoc:**  
   Setelah membuat template, unggah ke aplikasi FastDoc. Aplikasi akan langsung menampilkan daftar tag yang berhasil terbaca. Jika ada tag yang terlewat, Anda dapat mengetahuinya secara instan sebelum melakukan cetak massal.
