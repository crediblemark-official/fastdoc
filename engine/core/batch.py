"""
FastDoc Batch Generation Engine
Memproses generasi dokumen massal dan mengemasnya ke dalam arsip ZIP secara streaming di memori.
"""

import io
import re
import zipfile
from typing import List, Dict, Any, Callable, Optional
from jinja2 import Template

from engine.core.renderer import TemplateRenderer


class BatchGenerator:
    """
    Mesin generasi dokumen massal ke arsip ZIP.
    """

    def __init__(self, template_bytes: bytes):
        self.template_bytes = template_bytes

    def generate_zip(
        self,
        records: List[Dict[str, Any]],
        filename_pattern: str = "Dokumen_{{ loop.index }}.docx",
        progress_callback: Optional[Callable[[int, int], None]] = None
    ) -> io.BytesIO:
        """
        Menghasilkan file ZIP di memori yang berisi seluruh dokumen ter-generate.
        """
        zip_stream = io.BytesIO()
        total_records = len(records)

        # Kompilasi pola nama file dengan Jinja2
        # Jika pengguna tidak menyertakan ekstensi .docx, tambahkan otomatis
        if not filename_pattern.endswith(".docx"):
            filename_pattern += ".docx"
        name_template = Template(filename_pattern)

        with zipfile.ZipFile(zip_stream, mode="w", compression=zipfile.ZIP_DEFLATED) as zip_file:
            for idx, record in enumerate(records, start=1):
                # 1. Buat renderer baru dari template bytes
                doc_stream = io.BytesIO(self.template_bytes)
                renderer = TemplateRenderer(doc_stream)

                # 2. Render dokumen dengan data record
                renderer.render(record)
                output_doc = renderer.save_to_stream()

                # 3. Hitung nama file hasil
                filename_ctx = {**record, "loop": {"index": idx}}
                try:
                    raw_filename = name_template.render(filename_ctx).strip()
                    # Bersihkan karakter terlarang di Windows filename: \ / : * ? " < > |
                    clean_filename = re.sub(r'[\\/*?:"<>|]', "_", raw_filename)
                except Exception:
                    clean_filename = f"Dokumen_{idx}.docx"

                # 4. Tulis langsung ke dalam file ZIP
                zip_file.writestr(clean_filename, output_doc.getvalue())

                # 5. Panggil callback progress jika tersedia
                if progress_callback:
                    progress_callback(idx, total_records)

        zip_stream.seek(0)
        return zip_stream
