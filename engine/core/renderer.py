"""
FastDoc In-Place Template Renderer
Mesin injeksi template berbasis docxtpl & Jinja2 dengan perlindungan 100% layout OpenXML.
"""

import io
import os
import base64
from typing import Dict, Any, Union
from docxtpl import DocxTemplate, InlineImage
from docx.shared import Mm
import jinja2

from engine.core.filters import register_filters
from engine.core.run_reconciler import RunReconciler


class TemplateRenderer:
    """
    Renderer untuk mengisi template .docx secara in-place dengan
    rekonsiliasi run OpenXML otomatis dan penanganan media yang aman.
    """

    def __init__(self, template_path_or_stream: Union[str, io.BytesIO]):
        self.template_source = template_path_or_stream

        # Rekonsiliasi run XML sebelum diserahkan ke DocxTemplate
        # untuk mencegah TemplateSyntaxError akibat tag terpecah di OpenXML
        reconciled_stream = RunReconciler.reconcile_docx(template_path_or_stream)
        self.doc = DocxTemplate(reconciled_stream)

        # Inisialisasi Environment Jinja2 mandiri dengan custom filters
        self.jinja_env = jinja2.Environment()
        register_filters(self.jinja_env)

    def render(self, context: Dict[str, Any]) -> None:
        """
        Melakukan injeksi data ke dalam template secara in-place.
        """
        processed_context = self._process_special_types(context)
        # Teruskan jinja_env dengan custom filters ke docxtpl render
        self.doc.render(processed_context, jinja_env=self.jinja_env)

    def save(self, output_path: str) -> str:
        """
        Menyimpan hasil dokumen ke file lokal.
        """
        os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
        self.doc.save(output_path)
        return output_path

    def save_to_stream(self) -> io.BytesIO:
        """
        Menyimpan hasil ke dalam buffer in-memory stream (BytesIO).
        Sangat penting untuk kompresi ZIP batch tanpa menulis ke disk fisik.
        """
        stream = io.BytesIO()
        self.doc.save(stream)
        stream.seek(0)
        return stream

    def _process_special_types(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Menangani tipe data khusus seperti gambar InlineImage (kompatibel path Windows,
        custom width/height, dictionary metadata, maupun base64 data uri).
        """
        clean_ctx = {}
        for k, v in context.items():
            if isinstance(v, str) and (v.startswith("img:") or v.startswith("image:")):
                # Potong prefix tanpa merusak drive letter Windows (misal C:\...)
                prefix_len = 6 if v.startswith("image:") else 4
                rest = v[prefix_len:].strip()

                width_mm = 30.0
                height_mm = None

                # Dukung opsi pemisah tanda pipa |width=30|height=40
                if "|" in rest:
                    parts = rest.split("|")
                    img_path = parts[0].strip()
                    for opt in parts[1:]:
                        opt_lower = opt.lower().strip()
                        if opt_lower.startswith("width=") or opt_lower.startswith("w="):
                            try:
                                width_mm = float(opt.split("=")[1].replace("mm", "").strip())
                            except ValueError:
                                pass
                        elif opt_lower.startswith("height=") or opt_lower.startswith("h="):
                            try:
                                height_mm = float(opt.split("=")[1].replace("mm", "").strip())
                            except ValueError:
                                pass
                else:
                    img_path = rest

                if os.path.exists(img_path):
                    kwargs = {"width": Mm(width_mm)}
                    if height_mm is not None:
                        kwargs["height"] = Mm(height_mm)
                    clean_ctx[k] = InlineImage(self.doc, img_path, **kwargs)
                else:
                    clean_ctx[k] = ""

            elif isinstance(v, dict) and ("image_path" in v or "img_path" in v):
                # Dukung input berupa objek konfigurasi gambar
                path = v.get("image_path") or v.get("img_path")
                width_mm = float(v.get("width_mm", 30))
                height_mm = v.get("height_mm")
                if path and os.path.exists(path):
                    kwargs = {"width": Mm(width_mm)}
                    if height_mm:
                        kwargs["height"] = Mm(float(height_mm))
                    clean_ctx[k] = InlineImage(self.doc, path, **kwargs)
                else:
                    clean_ctx[k] = ""
            else:
                clean_ctx[k] = v
        return clean_ctx
