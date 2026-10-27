# Spesifikasi Skema Data & API Internal: FastDoc

Dokumen ini mendefinisikan kontrak komunikasi data antara **Frontend Antarmuka Desktop** dan **FastDoc Core Python Engine**, serta format standar file spreadsheet untuk operasi pengisian massal (*batch generation*).

---

## 1. Spesifikasi API Internal (Local IPC / REST API)

Core Engine berjalan secara lokal sebagai microservice di `http://127.0.0.1:{PORT}` yang diakses secara eksklusif oleh antarmuka desktop.

### 1.1 Endpoint: Pemindaian Template (`POST /api/templates/scan`)
Menerima file `.docx` mentah, melakukan rekonsiliasi run XML, dan mengekstrak seluruh tag variabel.

* **Metode:** `POST`
* **Content-Type:** `multipart/form-data`
* **Parameter:**
  * `file`: File biner `.docx`
* **Contoh Respons Sukses (200 OK):**
```json
{
  "status": "success",
  "data": {
    "template_id": "tpl_9f83a12",
    "filename": "Raport_TK_Pembina.docx",
    "file_size_bytes": 456096,
    "total_variables": 5,
    "variables": [
      {
        "key": "nama_lengkap",
        "display_name": "Nama Lengkap",
        "data_type": "string",
        "is_loop": false,
        "is_ai_candidate": false
      },
      {
        "key": "nisn",
        "display_name": "NISN",
        "data_type": "string",
        "is_loop": false,
        "is_ai_candidate": false
      },
      {
        "key": "narasi_nilai_agama",
        "display_name": "Narasi Nilai Agama dan Budi Pekerti",
        "data_type": "text_multiline",
        "is_loop": false,
        "is_ai_candidate": true
      },
      {
        "key": "rincian_kegiatan",
        "display_name": "Rincian Kegiatan",
        "data_type": "table",
        "is_loop": true,
        "sub_fields": ["no", "nama_kegiatan", "predikat"]
      }
    ]
  }
}
```

---

### 1.2 Endpoint: Ekspor Format Excel Kosong (`GET /api/templates/{id}/excel-template`)
Mengunduh file `.xlsx` yang kolom-kolomnya otomatis terpetakan sesuai daftar tag yang terdeteksi pada template.

* **Metode:** `GET`
* **Parameter URL:** `template_id`
* **Respons:** File biner stream `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` dengan nama `Template_Data_[template_id].xlsx`.

---

### 1.3 Endpoint: Generasi Dokumen Satuan (`POST /api/generate/single`)
Menghasilkan 1 file dokumen hasil berdasarkan data input form web.

* **Metode:** `POST`
* **Content-Type:** `application/json`
* **Payload Request:**
```json
{
  "template_id": "tpl_9f83a12",
  "output_format": "docx",
  "output_filename": "Raport_Azzam.docx",
  "variables": {
    "nama_lengkap": "Fathan Azzam Alano",
    "nisn": "3198824801",
    "narasi_nilai_agama": "Ananda Azzam menunjukkan capaian yang sangat baik dalam membaca doa harian..."
  }
}
```
* **Respons:** File stream dokumen hasil (`.docx` atau `.pdf`).

---

### 1.4 Endpoint: Generasi Dokumen Massal (`POST /api/generate/batch`)
Menerima file Excel/CSV berisi banyak baris data, lalu memproses seluruhnya secara paralel dan mengembalikan arsip ZIP.

* **Metode:** `POST`
* **Content-Type:** `multipart/form-data`
* **Parameter:**
  * `template_id`: String ID template
  * `data_file`: File `.xlsx` atau `.csv`
  * `filename_pattern`: Pola penamaan file hasil (contoh: `Raport_{{ nama_lengkap }}`)
  * `output_format`: `docx`, `pdf`, atau `both`
* **Respons:** File stream arsip `application/zip` yang langsung dapat disimpan pengguna ke folder lokal / flashdisk.

---

### 1.5 Endpoint: Asisten Narasi AI (`POST /api/ai/narrative`)
Menyusun paragraf narasi deskriptif berdasarkan poin-poin catatan kasar pengguna.

* **Metode:** `POST`
* **Content-Type:** `application/json`
* **Payload Request:**
```json
{
  "domain": "kurikulum_merdeka_paud",
  "target_subject": "Kenzi",
  "bullet_notes": "Suka bermain balok, konsentrasi bagus, ramah dengan teman, masih perlu diingatkan cuci tangan sebelum makan",
  "tone": "formal_pedagogis"
}
```
* **Contoh Respons Sukses (200 OK):**
```json
{
  "status": "success",
  "data": {
    "generated_text": "Ananda Kenzi berkembang sangat baik dalam kemampuan motorik dan konsentrasi melalui kegiatan rancang bangun balok. Dalam interaksi sosial, Ananda menunjukkan sikap ramah dan senang bermain bersama rekan sekelas. Guru akan terus memfasilitasi pembiasaan hidup bersih dan sehat, khususnya mencuci tangan sebelum makan, agar kemandirian Ananda semakin optimal."
  }
}
```

---

## 2. Format Standar Spreadsheet Excel (`.xlsx`) untuk Batch Data

Agar dapat dibaca secara mulus oleh sistem, file Excel yang diunggah pengguna mengikuti aturan berikut:

### 2.1 Struktur Baris & Kolom:
* **Baris 1 (Header):** Wajib berisi nama-nama variabel yang persis sama dengan tag di template (contoh: `nama_lengkap`, `nisn`, `nilai_agama`).
* **Baris 2 ke Bawah:** Berisi data masing-masing entitas (1 baris mewakili 1 dokumen yang akan dicetak).

| Baris | nama_lengkap | nisn | tgl_lahir | narasi_agama |
| :---: | :--- | :--- | :--- | :--- |
| **2** | Fathan Azzam Alano | 3198824801 | 2019-09-12 | Ananda Azzam berkembang sangat baik... |
| **3** | Kenzi Albiansyah | 3197752667 | 2019-10-03 | Ananda Kenzi menunjukkan antusiasme... |
| **4** | Qdisa Rinqiyas | 3205881930 | 2020-07-05 | Ananda Qiyas sangat aktif dan mandiri... |

### 2.2 Penanganan Otomatis (*Auto-Coercion & Normalization*):
* **Format Tanggal:** Format tanggal dari Excel (baik tipe Date asli Excel maupun teks string seperti `"12/09/2019"`) secara otomatis dikonversi menjadi tanggal bahasa Indonesia baku (`12 September 2019`).
* **Format Angka:** Angka numerik dibersihkan dari spasi liar tanpa merusak koma desimal.
* **Kolom Ceklis (✓):** Nilai berupa huruf kapital (`BSB`, `BSH`, `MB`, `BB`) otomatis diubah menjadi simbol tanda centang (`✓`) pada template rapor yang bersangkutan.
