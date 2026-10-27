"""
FastDoc OpenXML Run Reconciler
Menggabungkan pecahan run XML bawaan Microsoft Word (<w:r><w:t>)
agar tag Jinja2/docxtpl {{ variabel }} dan {% tag %} tidak terputus di tengah jalan.
"""

import io
import re
import zipfile
import xml.etree.ElementTree as ET
from typing import Union

# Namespace OpenXML WordprocessingML
W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
ET.register_namespace('w', W_NS)

W_P = f"{{{W_NS}}}p"
W_R = f"{{{W_NS}}}r"
W_T = f"{{{W_NS}}}t"
W_PROOFERR = f"{{{W_NS}}}proofErr"


class RunReconciler:
    """
    Modul rekonsiliasi run XML untuk menjamin keutuhan tag Jinja2 di dalam dokumen Word.
    """

    @classmethod
    def reconcile_xml(cls, xml_content: Union[str, bytes]) -> bytes:
        """
        Membersihkan XML Word dari proofErr dan menyatukan tag {{ ... }} serta {% ... %}
        yang terpecah antar elemen <w:r><w:t>.
        """
        if isinstance(xml_content, str):
            xml_bytes = xml_content.encode("utf-8")
        else:
            xml_bytes = xml_content

        try:
            tree = ET.fromstring(xml_bytes)
        except Exception:
            return xml_bytes

        # 1. Hapus tag <w:proofErr> (Word spellcheck/grammar markers)
        for parent in tree.iter():
            to_remove = [child for child in parent if child.tag == W_PROOFERR]
            for child in to_remove:
                parent.remove(child)

        # 2. Rekonsiliasi run di setiap paragraf
        for p in tree.iter(W_P):
            cls._reconcile_paragraph(p)

        return ET.tostring(tree, encoding="utf-8", xml_declaration=True)

    @classmethod
    def _reconcile_paragraph(cls, p_elem: ET.Element) -> None:
        """
        Menyatukan tag Jinja yang terfragmentasi di dalam satu paragraf <w:p>.
        """
        # Kumpulkan semua elemen <w:t> yang memiliki teks
        t_elems = []
        for r in p_elem.iter(W_R):
            for t in r.iter(W_T):
                t_elems.append(t)

        if len(t_elems) < 2:
            return

        combined_text = "".join(t.text or "" for t in t_elems)
        # Jika tidak ada karakter '{', tidak ada tag Jinja2 yang terancam terpecah
        if "{" not in combined_text:
            return

        # Pola deteksi tag Jinja: {{ ... }} atau {% ... %}
        jinja_pattern = re.compile(r"(\{\{[^{}]*?\}\}|\{%[^{}]*?%\})")

        # Petakan rentang indeks setiap t_elem dalam combined_text
        char_index = 0
        elem_ranges = []
        for t in t_elems:
            text = t.text or ""
            start = char_index
            end = start + len(text)
            elem_ranges.append((start, end, t))
            char_index = end

        # Untuk setiap tag Jinja yang terdeteksi
        for match in jinja_pattern.finditer(combined_text):
            tag_start = match.start()
            tag_end = match.end()
            tag_str = match.group(0)

            # Cari elemen yang memuat tag_start dan elemen yang memuat tag_end
            start_elem_idx = None
            end_elem_idx = None

            for i, (elem_start, elem_end, _) in enumerate(elem_ranges):
                if elem_start <= tag_start < elem_end:
                    start_elem_idx = i
                if elem_start < tag_end <= elem_end:
                    end_elem_idx = i

            # Jika tag terpecah di lebih dari satu elemen <w:t>
            if start_elem_idx is not None and end_elem_idx is not None and start_elem_idx != end_elem_idx:
                first_elem_info = elem_ranges[start_elem_idx]
                first_t = first_elem_info[2]
                
                # Hitung offset di dalam first_t
                offset_in_first = tag_start - first_elem_info[0]
                prefix = (first_t.text or "")[:offset_in_first]
                
                # Masukkan seluruh tag utuh ke first_t
                first_t.text = prefix + tag_str

                # Kosongkan bagian tag dari elemen-elemen berikutnya
                for mid_idx in range(start_elem_idx + 1, end_elem_idx):
                    elem_ranges[mid_idx][2].text = ""

                last_elem_info = elem_ranges[end_elem_idx]
                last_t = last_elem_info[2]
                offset_in_last = tag_end - last_elem_info[0]
                last_t.text = (last_t.text or "")[offset_in_last:]

    @classmethod
    def reconcile_docx(cls, docx_source: Union[str, io.BytesIO]) -> io.BytesIO:
        """
        Memproses berkas .docx utuh (path string atau buffer BytesIO)
        dan mengembalikan buffer BytesIO yang sudah direkonsiliasi.
        """
        if isinstance(docx_source, str):
            with open(docx_source, "rb") as f:
                in_bytes = io.BytesIO(f.read())
        elif isinstance(docx_source, io.BytesIO):
            docx_source.seek(0)
            in_bytes = io.BytesIO(docx_source.read())
        else:
            raise TypeError("docx_source harus berupa path string atau io.BytesIO")

        out_buffer = io.BytesIO()

        with zipfile.ZipFile(in_bytes, "r") as zin:
            with zipfile.ZipFile(out_buffer, "w", compression=zipfile.ZIP_DEFLATED) as zout:
                for item in zin.infolist():
                    content = zin.read(item.filename)
                    # Rekonsiliasi file XML utama dokumen, header, dan footer
                    if item.filename.startswith("word/") and item.filename.endswith(".xml"):
                        if (
                            item.filename == "word/document.xml"
                            or "header" in item.filename
                            or "footer" in item.filename
                        ):
                            content = cls.reconcile_xml(content)
                    zout.writestr(item, content)

        out_buffer.seek(0)
        return out_buffer
