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
    def is_narrative_table(cls, rows_cells: List[List[str]]) -> bool:
        """
        Mendeteksi apakah tabel merupakan naskah naratif/kontrak dwibahasa
        (bukan tabel formulir isian data).
        """
        if not rows_cells or len(rows_cells) < 2:
            return False
        long_rows = 0
        total_len_c0 = 0
        count_c0 = 0
        for r in rows_cells:
            if len(r) >= 2:
                c0, c1 = r[0], r[1]
                if len(c0) > 80 or len(c1) > 80:
                    long_rows += 1
                total_len_c0 += len(c0)
                count_c0 += 1
        avg_c0 = total_len_c0 / count_c0 if count_c0 else 0
        return (long_rows / len(rows_cells) > 0.08) or (avg_c0 > 50)

    @classmethod
    def is_header_or_title(cls, text: str) -> bool:
        """
        Mendeteksi apakah baris teks merupakan judul pasal atau schedule lampiran.
        """
        t = text.strip().upper()
        keywords = ["SCHEDULE", "LAMPIRAN", "DETAIL OF", "DETAIL LAYANAN", "PERJANJIAN", "AGREEMENT", "PASAL", "ARTICLE"]
        return any(k in t for k in keywords)

    @classmethod
    def detect_entities(cls, docx_path: str) -> Dict[str, Dict[str, Any]]:
        """
        Mendeteksi seluruh pasangan [Label : Nilai], placeholder kurung siku [FIELD],
        dan field formulir dari dokumen .docx.
        """
        detected: Dict[str, Dict[str, Any]] = {}

        with zipfile.ZipFile(docx_path, 'r') as z:
            if 'word/document.xml' not in z.namelist():
                return detected
            tree = ET.fromstring(z.read('word/document.xml'))

        ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
        p_tag = f"{{{ns['w']}}}p"
        t_tag = f"{{{ns['w']}}}t"
        tbl_tag = f"{{{ns['w']}}}tbl"
        tr_tag = f"{{{ns['w']}}}tr"
        tc_tag = f"{{{ns['w']}}}tc"

        paras: List[str] = []
        for p in tree.iter(p_tag):
            text = ''.join([n.text for n in p.iter(t_tag) if n.text]).strip()
            if text:
                paras.append(text)

        bracket_pat = re.compile(r'\[([A-Z0-9_\s\.\/]{2,40})\]')
        def process_brackets(txt: str):
            for m in bracket_pat.finditer(txt):
                tag = m.group(1).strip()
                low = tag.lower()
                if any(ign in low for ign in ['blank', 'halaman', 'sisa', 'page', 'empty']):
                    continue
                if tag in ['...', '.....']:
                    continue
                k = cls.label_to_variable_key(tag)
                if k and k not in detected:
                    detected[k] = {
                        'label': tag.title(),
                        'value': f"[{tag}]",
                        'key': k,
                        'type': 'string',
                        'match_type': 'bracket'
                    }

        # 1. Deteksi dari Paragraf Teks
        for txt in paras:
            process_brackets(txt)
            if txt.count(':') <= 2:
                colon_match = re.match(r'^([A-Za-z0-9\s/.,\(\)-]{2,40})\s*[:=]\s*(.+)$', txt)
                if colon_match:
                    label_raw = colon_match.group(1).strip()
                    val_raw = colon_match.group(2).strip()

                    if not cls.is_header_or_title(label_raw) and ":" not in val_raw and 1 <= len(val_raw) <= 120:
                        var_key = cls.label_to_variable_key(label_raw)
                        if var_key and (var_key not in detected or len(val_raw) < len(detected[var_key]['value'])):
                            detected[var_key] = {
                                'label': label_raw,
                                'value': val_raw,
                                'key': var_key,
                                'type': cls._infer_type(val_raw),
                                'match_type': 'colon'
                            }

        # 2. Deteksi dari Struktur Tabel
        for tbl in tree.iter(tbl_tag):
            rows_cells = []
            for tr in tbl.iter(tr_tag):
                cells = []
                for tc in tr.iter(tc_tag):
                    cell_text = ''.join([n.text for n in tc.iter(t_tag) if n.text]).strip()
                    cells.append(cell_text)
                if cells:
                    rows_cells.append(cells)

            for row in rows_cells:
                for cell in row:
                    process_brackets(cell)

            is_nar = cls.is_narrative_table(rows_cells)

            for row in rows_cells:
                # Pola 3 kolom [Label, ":", Nilai] (misal tabel pengesahan tanda tangan)
                if len(row) == 3 and row[1] == ':' and 2 <= len(row[0]) <= 80:
                    lbl = row[0].strip()
                    val = row[2].strip()
                    k = cls.label_to_variable_key(lbl)
                    if k and k not in detected:
                        detected[k] = {
                            'label': lbl,
                            'value': val if val else f"[{lbl}]",
                            'key': k,
                            'type': 'string',
                            'match_type': 'table3',
                            'table_label': lbl
                        }

                # Pola 2 kolom [Label, Nilai] HANYA jika BUKAN tabel naskah naratif
                elif not is_nar and len(row) == 2:
                    c1 = row[0].rstrip(':').strip()
                    c2 = row[1].strip()
                    if 2 <= len(c1) <= 35 and 1 <= len(c2) <= 120 and ":" not in c2:
                        if not cls.is_header_or_title(c1) and not cls.is_header_or_title(c2):
                            key = cls.label_to_variable_key(c1)
                            if key and (key not in detected or len(c2) < len(detected[key]['value'])):
                                detected[key] = {
                                    'label': c1,
                                    'value': c2,
                                    'key': key,
                                    'type': cls._infer_type(c2),
                                    'match_type': 'table2'
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
        ns_w = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
        W_TC = f"{{{ns_w}}}tc"
        W_TR = f"{{{ns_w}}}tr"
        W_P = f"{{{ns_w}}}p"
        W_R = f"{{{ns_w}}}r"
        W_T = f"{{{ns_w}}}t"

        with zipfile.ZipFile(reconciled_stream, 'r') as zin:
            with zipfile.ZipFile(output_docx, 'w', compression=zipfile.ZIP_DEFLATED) as zout:
                for item in zin.infolist():
                    content = zin.read(item.filename)
                    if item.filename == 'word/document.xml':
                        tree = ET.fromstring(content)
                        # Sisipkan tag ke dalam sel kosong tabel 3 kolom (misal tanda tangan)
                        for ent in entities.values():
                            if ent.get('match_type') == 'table3' and ent.get('table_label'):
                                t_lbl = ent['table_label'].lower()
                                for tr in tree.iter(W_TR):
                                    tcs = list(tr.iter(W_TC))
                                    if len(tcs) == 3:
                                        c0_txt = "".join(tcs[0].itertext()).strip().lower()
                                        c1_txt = "".join(tcs[1].itertext()).strip()
                                        c2_txt = "".join(tcs[2].itertext()).strip()
                                        if c1_txt == ":" and not c2_txt and t_lbl in c0_txt:
                                            p = tcs[2].find(W_P)
                                            if p is None:
                                                p = ET.SubElement(tcs[2], W_P)
                                            r = ET.SubElement(p, W_R)
                                            t = ET.SubElement(r, W_T)
                                            t.text = f"{{{{ {ent['key']} }}}}"

                        xml_str = ET.tostring(tree, encoding='utf-8').decode('utf-8')
                        sorted_items = sorted(entities.values(), key=lambda x: len(x['value']), reverse=True)
                        for ent in sorted_items:
                            val = ent['value']
                            key = ent['key']
                            if len(val) >= 2 and ent.get('match_type') != 'table3':
                                escaped_val = val.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
                                if val in xml_str:
                                    xml_str = xml_str.replace(val, f"{{{{ {key} }}}}")
                                elif escaped_val in xml_str:
                                    xml_str = xml_str.replace(escaped_val, f"{{{{ {key} }}}}")
                        content = xml_str.encode('utf-8')
                    elif item.filename.startswith('word/') and item.filename.endswith('.xml'):
                        xml_str = content.decode('utf-8', errors='ignore')
                        sorted_items = sorted(entities.values(), key=lambda x: len(x['value']), reverse=True)
                        for ent in sorted_items:
                            val = ent['value']
                            key = ent['key']
                            if len(val) >= 2 and ent.get('match_type') != 'table3':
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
