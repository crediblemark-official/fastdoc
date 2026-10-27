"""
FastDoc Universal Auto-Tagger & Entity Extractor (Document-Agnostic)
Menganalisis dokumen Word mentah APAPUN tanpa kamus kata hardcoded.
Menggunakan heuristik struktural OpenXML, pemetaan dinamis bahasa-agnostik,
dan algoritma perbandingan multi-dokumen (diff-based template discovery).
"""

import re
import zipfile
import xml.etree.ElementTree as ET
from typing import Dict, Any, List, Optional, Tuple


class SmartAutoTagger:
    """
    Ekstraktor entitas universal dan pembuat template otomatis non-hardcoded.
    Bekerja untuk bahasa apapun (Indonesia, Inggris, dll.) dan domain apapun
    (surat, kontrak hukum, invoice, raport, resume medis, proposal, dll.).
    """

    @classmethod
    def label_to_variable_key(cls, label: str) -> str:
        """
        Mengubah label teks bebas apapun menjadi nama variabel Python/Jinja2 yang valid.
        Contoh:
        - 'Confidential Information' -> 'confidential_information'
        - 'Nomor Perkara / Gugatan' -> 'nomor_perkara_gugatan'
        - 'Due Date (Est.)' -> 'due_date_est'
        - 'Tempat dan Tanggal Lahir' -> 'tempat_dan_tanggal_lahir'
        """
        # 1. Bersihkan karakter khusus dan simbol
        clean = re.sub(r'[^a-zA-Z0-9\s]+', ' ', label.strip().lower())
        # 2. Satukan spasi menjadi single underscore
        key = re.sub(r'\s+', '_', clean).strip('_')
        # 3. Pastikan tidak dimulai dengan angka
        if key and key[0].isdigit():
            key = f"var_{key}"
        return key or "field"

    @classmethod
    def detect_entities(cls, docx_path: str) -> Dict[str, Dict[str, Any]]:
        """
        Mendeteksi seluruh pasangan [Label : Nilai] dan field dinamis
        dari dokumen .docx secara murni berbasis struktur dokumen (tanpa kamus kata statis).
        """
        detected: Dict[str, Dict[str, Any]] = {}

        with zipfile.ZipFile(docx_path, 'r') as z:
            if 'word/document.xml' not in z.namelist():
                return detected
            tree = ET.fromstring(z.read('word/document.xml'))

        ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
        
        # 1. Deteksi dari Paragraf Teks
        paras: List[str] = []
        for p in tree.iter(f'{{{ns["w"]}}}p'):
            text = ''.join([n.text for n in p.iter(f'{{{ns["w"]}}}t') if n.text]).strip()
            if text:
                paras.append(text)

        # Pola umum dokumen universal:
        # Pola A: Label : Nilai
        # Pola B: Label ... Nilai (titik-titik leader)
        for i, text in enumerate(paras):
            # Abaikan jika ada banyak tanda titik dua di satu baris (teks menyatu tanpa pemisah rapi)
            if text.count(':') > 2:
                continue

            colon_match = re.match(r'^([A-Za-z0-9\s/.,\(\)-]{2,40})\s*[:=]\s*(.+)$', text)
            if colon_match:
                label_raw = colon_match.group(1).strip()
                val_raw = colon_match.group(2).strip()

                # Pastikan nilai tidak memuat titik dua lagi (menandakan ada label lain di baris yang sama)
                if ":" in val_raw:
                    continue

                # Abaikan jika nilai kosong atau terlalu panjang (paragraf penuh)
                if 1 <= len(val_raw) <= 120:
                    var_key = cls.label_to_variable_key(label_raw)
                    # Jika belum ada atau jika entitas sebelumnya memiliki nilai yang lebih panjang/kotor
                    if var_key:
                        if var_key not in detected or len(val_raw) < len(detected[var_key]['value']):
                            detected[var_key] = {
                                'label': label_raw,
                                'value': val_raw,
                                'key': var_key,
                                'type': cls._infer_type(val_raw)
                            }

        # 2. Deteksi dari Struktur Tabel Pasangan 2 Kolom (Label di Kolom 1, Nilai di Kolom 2)
        for tbl in tree.iter(f'{{{ns["w"]}}}tbl'):
            for tr in tbl.iter(f'{{{ns["w"]}}}tr'):
                cells = []
                for tc in tr.iter(f'{{{ns["w"]}}}tc'):
                    cell_text = ''.join([n.text for n in tc.iter(f'{{{ns["w"]}}}t') if n.text]).strip()
                    cells.append(cell_text)
                
                # Jika tabel berisi 2 kolom atau kolom 1 diakhiri tanda titik dua
                if len(cells) >= 2:
                    c1 = cells[0].rstrip(':').strip()
                    c2 = cells[1].strip()
                    if 2 <= len(c1) <= 35 and 1 <= len(c2) <= 120 and ":" not in c2:
                        key = cls.label_to_variable_key(c1)
                        if key:
                            if key not in detected or len(c2) < len(detected[key]['value']):
                                detected[key] = {
                                    'label': c1,
                                    'value': c2,
                                    'key': key,
                                    'type': cls._infer_type(c2)
                                }

        return detected

    @classmethod
    def diff_and_extract_template(cls, doc_paths: List[str], output_template_path: str) -> Tuple[str, List[str]]:
        """
        METODE PALING MURNI & AGNOSTIK:
        Membandingkan 2 atau lebih dokumen sejenis (misal: AZZAM.docx dan KENZI.docx).
        - Teks yang sama di semua dokumen = TEMPLATE (Kop, judul, format tabel)
        - Teks yang berbeda antar dokumen = VARIABEL DINAMIS OTOMATIS!
        
        Mengembalikan path template hasil dan daftar variabel yang ditemukan.
        """
        if len(doc_paths) < 2:
            raise ValueError("Dibutuhkan minimal 2 dokumen sejenis untuk ekstraksi berbasis diferensial.")

        # Ambil teks paragraf dari dokumen acuan
        all_doc_paras = []
        for path in doc_paths:
            with zipfile.ZipFile(path, 'r') as z:
                tree = ET.fromstring(z.read('word/document.xml'))
            ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
            paras = [''.join([n.text for n in p.iter(f'{{{ns["w"]}}}t') if n.text]).strip() for p in tree.iter(f'{{{ns["w"]}}}p')]
            all_doc_paras.append(paras)

        base_paras = all_doc_paras[0]
        other_paras = all_doc_paras[1:]

        # Temukan paragraf yang berbeda
        diff_indices = []
        for idx in range(min(len(base_paras), *(len(p) for p in other_paras))):
            base_val = base_paras[idx]
            if any(p[idx] != base_val for p in other_paras) and len(base_val) > 0:
                diff_indices.append((idx, base_val))

        # Ganti teks yang berbeda pada dokumen pertama dengan tag variabel dinamis
        detected_vars = []
        replacements = {}
        for idx, val in diff_indices:
            # Cari konteks label dari paragraf sebelumnya jika ada
            prev_label = base_paras[idx - 1] if idx > 0 and len(base_paras[idx - 1]) < 30 else f"var_{idx}"
            key = cls.label_to_variable_key(prev_label)
            if key not in detected_vars:
                detected_vars.append(key)
                replacements[val] = key

        # Tulis template hasil
        with zipfile.ZipFile(doc_paths[0], 'r') as zin:
            with zipfile.ZipFile(output_template_path, 'w') as zout:
                for item in zin.infolist():
                    content = zin.read(item.filename)
                    if item.filename == 'word/document.xml':
                        xml_str = content.decode('utf-8')
                        for val, key in sorted(replacements.items(), key=lambda x: len(x[0]), reverse=True):
                            if val in xml_str:
                                xml_str = xml_str.replace(val, f"{{{{ {key} }}}}")
                        content = xml_str.encode('utf-8')
                    zout.writestr(item, content)

        return output_template_path, detected_vars

    @classmethod
    def convert_to_template(cls, input_docx: str, output_docx: str, entities: Dict[str, Dict[str, Any]]) -> str:
        """
        Mengonversi dokumen mentah apapun menjadi template dengan mengganti teks nilai menjadi {{ key }}.
        Melakukan rekonsiliasi run terlebih dahulu agar teks tidak terfragmentasi.
        """
        from engine.core.run_reconciler import RunReconciler
        reconciled_stream = RunReconciler.reconcile_docx(input_docx)

        with zipfile.ZipFile(reconciled_stream, 'r') as zin:
            with zipfile.ZipFile(output_docx, 'w', compression=zipfile.ZIP_DEFLATED) as zout:
                for item in zin.infolist():
                    content = zin.read(item.filename)
                    if item.filename.startswith('word/') and item.filename.endswith('.xml'):
                        xml_str = content.decode('utf-8', errors='ignore')
                        sorted_items = sorted(entities.values(), key=lambda x: len(x['value']), reverse=True)
                        for ent in sorted_items:
                            val = ent['value']
                            key = ent['key']
                            if len(val) >= 2:
                                # Cek bentuk teks langsung dan bentuk XML-escaped
                                escaped_val = val.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
                                if val in xml_str:
                                    xml_str = xml_str.replace(val, f"{{{{ {key} }}}}")
                                elif escaped_val in xml_str:
                                    xml_str = xml_str.replace(escaped_val, f"{{{{ {key} }}}}")
                        content = xml_str.encode('utf-8')
                    zout.writestr(item, content)

        return output_docx

    @staticmethod
    def _infer_type(val: str) -> str:
        """
        Menentukan tipe data secara universal berdasarkan karakteristik nilai (bukan nama kata).
        """
        val_strip = val.strip()
        # Jika nilai murni angka atau format mata uang
        if re.match(r'^[0-9.,\s$€£Rp]+$', val_strip) and any(c.isdigit() for c in val_strip):
            return "number"
        # Jika nilai berformat tanggal (ISO, slash, dash)
        if re.match(r'^\d{1,4}[-/\s]\d{1,2}[-/\s]\d{2,4}', val_strip):
            return "date"
        # Jika nilai merupakan teks panjang
        if len(val_strip) > 75 or "\n" in val_strip:
            return "text_multiline"
        return "string"
