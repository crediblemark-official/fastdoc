"""
FastDoc OpenXML Tag Scanner
Memindai berkas .docx dan mendeteksi semua variabel {{ ... }},
loop {% for %}, kondisional {% if %}, serta menghasilkan skema variabel terstruktur.
"""

import re
import zipfile
import xml.etree.ElementTree as ET
from typing import Dict, List, Any, Set
from pydantic import BaseModel, Field


class VariableMeta(BaseModel):
    key: str
    display_name: str
    data_type: str = "string"  # string, number, date, text_multiline, table, boolean
    is_loop: bool = False
    is_ai_candidate: bool = False
    filters_used: List[str] = Field(default_factory=list)
    raw_tag: str = ""
    sub_fields: List[str] = Field(default_factory=list)


class TemplateSchema(BaseModel):
    template_name: str
    total_variables: int
    variables: List[VariableMeta]
    loop_blocks: List[str] = Field(default_factory=list)
    has_tables: bool = False
    has_headers_footers: bool = False


class DocxTagScanner:
    """
    Scanner untuk membedah OpenXML Word dan mengekstrak tag Jinja/docxtpl.
    """

    # Pola RegEx untuk mendeteksi {{ variabel }} dan {% tag %}
    VAR_PATTERN = re.compile(r"\{\{\s*([^{}]+?)\s*\}\}")
    TAG_PATTERN = re.compile(r"\{%\s*([^{}]+?)\s*\%\}")

    def __init__(self, docx_path: str):
        self.docx_path = docx_path
        self.detected_vars: Dict[str, VariableMeta] = {}
        self.loop_blocks: Set[str] = set()

    def scan(self) -> TemplateSchema:
        """
        Memindai document.xml, headers, dan footers.
        """
        xml_paragraphs = []
        has_headers_footers = False

        with zipfile.ZipFile(self.docx_path, 'r') as z:
            for filename in z.namelist():
                if filename.startswith("word/") and filename.endswith(".xml"):
                    if filename == "word/document.xml":
                        content = z.read(filename)
                        xml_paragraphs.extend(self._extract_paragraphs_from_xml(content))
                    elif "header" in filename or "footer" in filename:
                        has_headers_footers = True
                        content = z.read(filename)
                        xml_paragraphs.extend(self._extract_paragraphs_from_xml(content))

        extracted_text = "\n".join(xml_paragraphs)

        # 1. Cari Loop Blocks: {% for item in items %} atau {% tr for item in items %}
        for match in self.TAG_PATTERN.finditer(extracted_text):
            tag_inner = match.group(1).strip()
            # Cek looping
            loop_match = re.search(r"(?:tr\s+)?for\s+(\w+)\s+in\s+(\w+)", tag_inner)
            if loop_match:
                item_var = loop_match.group(1)
                list_name = loop_match.group(2)
                self.loop_blocks.add(list_name)
                
                # Cari sub-atribut: {{ item.nama }}, {{ item.nilai }}
                sub_fields = sorted(list(set(re.findall(rf"\{{\{{\s*{re.escape(item_var)}\.(\w+)", extracted_text))))
                if not sub_fields:
                    sub_fields = ["item"]

                if list_name not in self.detected_vars:
                    self.detected_vars[list_name] = VariableMeta(
                        key=list_name,
                        display_name=self._format_label(list_name),
                        data_type="table",
                        is_loop=True,
                        raw_tag=f"{{% for {item_var} in {list_name} %}}",
                        sub_fields=sub_fields
                    )
                else:
                    self.detected_vars[list_name].sub_fields = sub_fields

        # 2. Cari Variabel {{ ... }}
        for match in self.VAR_PATTERN.finditer(extracted_text):
            raw_expr = match.group(1).strip()
            self._process_var_expression(raw_expr)

        tpl_name = self.docx_path.split("/")[-1].split("\\")[-1] if isinstance(self.docx_path, str) else "Template"
        schema = TemplateSchema(
            template_name=tpl_name,
            total_variables=len(self.detected_vars),
            variables=list(self.detected_vars.values()),
            loop_blocks=list(self.loop_blocks),
            has_tables=len(self.loop_blocks) > 0,
            has_headers_footers=has_headers_footers
        )
        return schema

    def _process_var_expression(self, expr: str) -> None:
        """
        Menganalisis ekspresi variabel dan mengekstrak nama kunci serta filter.
        Contoh: 'nama_siswa | upper' -> key: 'nama_siswa', filters: ['upper']
        """
        # Abaikan jika ini ekspresi logika if murni seperti: "✓" if status == "BSB"
        if " if " in expr or " else " in expr:
            # Cari variabel di dalam ekspresi kondisional
            tokens = re.findall(r"\b[a-zA-Z_][a-zA-Z0-9_]*\b", expr)
            reserved = {"if", "else", "and", "or", "not", "in", "is", "True", "False", "None"}
            for token in tokens:
                if token not in reserved and token not in self.detected_vars:
                    self.detected_vars[token] = VariableMeta(
                        key=token,
                        display_name=self._format_label(token),
                        data_type="string",
                        raw_tag=expr
                    )
            return

        # Cek apakah tag merupakan deklarasi gambar eksplisit: {{ image:ttd_kepsek:width=4.5cm }} atau {{ img:foto }}
        is_image_tag = False
        if expr.startswith("image:") or expr.startswith("img:"):
            is_image_tag = True
            prefix_len = 6 if expr.startswith("image:") else 4
            content = expr[prefix_len:].strip()
            # Pemisah bisa berupa titik dua :width=... atau tanda pipa |width=...
            sub_parts = re.split(r"[:|]", content)
            key = sub_parts[0].strip()
            filters = sub_parts[1:] if len(sub_parts) > 1 else []
        else:
            parts = [p.strip() for p in expr.split("|")]
            key = parts[0]
            filters = parts[1:] if len(parts) > 1 else []

        # Bersihkan pemanggilan fungsi atau atribut (contoh: item.nama -> ambil nama dasarnya)
        if "." in key:
            # Misal bagian dari loop table: item.harga
            return

        if not re.match(r"^[a-zA-Z_][a-zA-Z0-9_]*$", key):
            # Bukan identifier variabel valid
            return

        # Inferensi tipe data berdasarkan nama atau filter yang digunakan
        data_type = "string"
        is_ai_candidate = False

        key_lower = key.lower()
        if any(s in key_lower for s in ["ttd", "tanda_tangan", "tandatangan", "signature", "paraf"]):
            data_type = "signature"
        elif is_image_tag or any(s in key_lower for s in ["foto", "gambar", "logo", "avatar", "image"]):
            data_type = "image"
        elif any(f in filters for f in ["rupiah", "ribuan"]) or "gaji" in key or "harga" in key or "nominal" in key or "biaya" in key:
            data_type = "number"
        elif any(f in filters for f in ["format_date"]) or "tgl" in key or "tanggal" in key or "lahir" in key:
            data_type = "date"
        elif "narasi" in key or "catatan" in key or "deskripsi" in key or "pesan" in key or "latar_belakang" in key:
            data_type = "text_multiline"
            is_ai_candidate = True

        if key not in self.detected_vars:
            self.detected_vars[key] = VariableMeta(
                key=key,
                display_name=self._format_label(key),
                data_type=data_type,
                is_loop=False,
                is_ai_candidate=is_ai_candidate,
                filters_used=filters,
                raw_tag=f"{{{{ {expr} }}}}"
            )
        else:
            # Perbarui filter dan tipe jika lebih spesifik
            if data_type in ("signature", "image"):
                self.detected_vars[key].data_type = data_type
            for f in filters:
                if f not in self.detected_vars[key].filters_used:
                    self.detected_vars[key].filters_used.append(f)

    def _extract_paragraphs_from_xml(self, xml_bytes: bytes) -> List[str]:
        """
        Mengekstrak teks per paragraf <w:p> secara utuh.
        Run <w:t> di dalam paragraf yang sama digabungkan langsung tanpa spasi liar,
        sehingga tag Jinja yang terpecah tidak rusak.
        """
        try:
            tree = ET.fromstring(xml_bytes)
            ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
            paras = []
            for p in tree.iter(f'{{{ns["w"]}}}p'):
                p_text = ''.join(n.text for n in p.iter(f'{{{ns["w"]}}}t') if n.text)
                if p_text:
                    paras.append(p_text)
            return paras
        except Exception:
            raw_matches = re.findall(r"<w:t[^>]*>(.*?)</w:t>", xml_bytes.decode('utf-8', errors='ignore'))
            return ["".join(raw_matches)]

    def _format_label(self, snake_str: str) -> str:
        """
        Mengubah 'nama_lengkap_siswa' -> 'Nama Lengkap Siswa'
        """
        special_names = {
            "ttd_kepsek": "Tanda Tangan Kepala Sekolah",
            "ttd_guru": "Tanda Tangan Guru Kelompok",
            "ttd_wali": "Tanda Tangan Orang Tua / Wali",
            "ttd_orang_tua": "Tanda Tangan Orang Tua",
            "ttd": "Tanda Tangan Digital",
            "nisn": "NISN",
            "nik": "NIK",
            "ttl": "Tempat & Tanggal Lahir",
        }
        lower = snake_str.lower()
        if lower in special_names:
            return special_names[lower]

        if lower.startswith("ttd_"):
            sub = snake_str[4:].replace("_", " ").title()
            return f"Tanda Tangan {sub}"

        return " ".join(word.capitalize() for word in snake_str.replace("_", " ").split())
