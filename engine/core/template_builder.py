"""
FastDoc Interactive Template Builder
Menyuntikkan tag Jinja2 {{ variabel }} ke dalam dokumen .docx berdasarkan
pemetaan teks yang dipilih oleh pengguna di Interactive UI Studio.
"""

import io
import re
import zipfile
import xml.etree.ElementTree as ET
from typing import List, Dict, Any
from engine.core.run_reconciler import RunReconciler
from engine.core.scanner import DocxTagScanner, TemplateSchema, VariableMeta


class TemplateBuilder:
    """
    Menyisipkan variabel Jinja2 secara presisi ke dalam berkas Word asli.
    """

    @classmethod
    def apply_tags_to_docx(
        cls,
        input_docx_path: str,
        output_docx_path: str,
        tags: List[Dict[str, Any]]
    ) -> TemplateSchema:
        """
        Menyisipkan daftar tag ke dokumen Word.
        Setiap tag berisi:
        - original_text: teks yang akan digantikan (misal "[COMPANY NAME]", "Azzam Nur Rayyan")
        - key: nama variabel Jinja2 (misal "company_name")
        - label: nama tampilan (misal "Nama Perusahaan")
        - data_type: tipe data ("string", "text_multiline", "number", "date", "signature")
        """
        if not tags:
            # Jika tidak ada tag, cukup salin dokumen
            with open(input_docx_path, "rb") as fin, open(output_docx_path, "wb") as fout:
                fout.write(fin.read())
            return DocxTagScanner(output_docx_path).scan()

        # 1. Jalankan run reconciler terlebih dahulu agar teks tidak terfragmentasi
        reconciled_stream = RunReconciler.reconcile_docx(input_docx_path)

        # 2. Urutkan tag berdasarkan panjang original_text terpanjang terlebih dahulu
        sorted_tags = sorted(tags, key=lambda x: len(x.get("original_text", "")), reverse=True)

        with zipfile.ZipFile(reconciled_stream, "r") as zin:
            with zipfile.ZipFile(output_docx_path, "w", compression=zipfile.ZIP_DEFLATED) as zout:
                for item in zin.infolist():
                    content = zin.read(item.filename)
                    if item.filename.startswith("word/") and item.filename.endswith(".xml"):
                        xml_str = content.decode("utf-8", errors="ignore")
                        for tag in sorted_tags:
                            orig = tag.get("original_text", "").strip()
                            key = tag.get("key", "").strip()
                            if not orig or not key:
                                continue

                            # Bentuk penggantian: {{ key }}
                            replacement = f"{{{{ {key} }}}}"

                            # Ganti bentuk raw dan bentuk XML-escaped
                            orig_escaped = (
                                orig.replace("&", "&amp;")
                                .replace("<", "&lt;")
                                .replace(">", "&gt;")
                            )

                            if orig in xml_str:
                                xml_str = xml_str.replace(orig, replacement)
                            elif orig_escaped in xml_str:
                                xml_str = xml_str.replace(orig_escaped, replacement)

                        content = xml_str.encode("utf-8")
                    zout.writestr(item, content)

        # 3. Pindai skema hasil
        scanner = DocxTagScanner(output_docx_path)
        schema = scanner.scan()

        # 4. Sinkronkan metadata variabel (display_name, data_type) dengan pilihan user
        tag_dict = {t["key"]: t for t in tags}
        for v in schema.variables:
            if v.key in tag_dict:
                user_tag = tag_dict[v.key]
                if user_tag.get("label"):
                    v.display_name = user_tag["label"]
                if user_tag.get("data_type"):
                    v.data_type = user_tag["data_type"]

        return schema
