"""
FastDoc In-Place Template Renderer
Mesin injeksi template berbasis docxtpl & Jinja2 dengan perlindungan 100% layout OpenXML.
"""

import io
import os
import base64
from typing import Dict, Any, Union, Optional
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
        custom width/height, dictionary metadata, data URI base64, maupun tanda tangan digital).
        """
        clean_ctx = {}
        for k, v in context.items():
            k_lower = k.lower()
            is_sig_key = any(s in k_lower for s in ["ttd", "tanda_tangan", "tandatangan", "signature", "paraf"])
            is_img_key = is_sig_key or any(s in k_lower for s in ["foto", "gambar", "logo", "avatar", "image"])

            default_w = 38.0 if is_sig_key else 30.0

            # 1. Jika value adalah None atau string kosong
            if v is None or v == "":
                clean_ctx[k] = "" if is_img_key else v
                continue

            # 2. Jika value berupa dict konfigurasi gambar / tanda tangan
            if isinstance(v, dict):
                img_data = v.get("data_url") or v.get("signature") or v.get("image_data") or v.get("image_path") or v.get("img_path")
                w_mm = float(v.get("width_mm", default_w))
                h_mm = float(v["height_mm"]) if "height_mm" in v and v["height_mm"] else None

                res = self._create_inline_image(img_data, width_mm=w_mm, height_mm=h_mm)
                clean_ctx[k] = res if res is not None else ""
                continue

            # 3. Jika value berupa string
            if isinstance(v, str):
                v_trimmed = v.strip()

                # Cek jika diawali data URL (seperti hasil canvas tanda tangan)
                if v_trimmed.startswith("data:image/"):
                    res = self._create_inline_image(v_trimmed, width_mm=default_w)
                    clean_ctx[k] = res if res is not None else ""
                    continue

                # Cek jika menggunakan prefix (image:, img:, atau sig:)
                if v_trimmed.startswith(("image:", "img:", "sig:")):
                    prefix_len = v_trimmed.find(":") + 1
                    rest = v_trimmed[prefix_len:].strip()

                    w_mm = default_w
                    h_mm = None

                    if "|" in rest:
                        parts = rest.split("|")
                        src = parts[0].strip()
                        for opt in parts[1:]:
                            opt_lower = opt.lower().strip()
                            if opt_lower.startswith(("width=", "w=")):
                                try:
                                    val_str = opt.split("=")[1].strip()
                                    if "cm" in val_str:
                                        w_mm = float(val_str.replace("cm", "")) * 10
                                    else:
                                        w_mm = float(val_str.replace("mm", ""))
                                except ValueError:
                                    pass
                            elif opt_lower.startswith(("height=", "h=")):
                                try:
                                    val_str = opt.split("=")[1].strip()
                                    if "cm" in val_str:
                                        h_mm = float(val_str.replace("cm", "")) * 10
                                    else:
                                        h_mm = float(val_str.replace("mm", ""))
                                except ValueError:
                                    pass
                    else:
                        src = rest

                    res = self._create_inline_image(src, width_mm=w_mm, height_mm=h_mm)
                    clean_ctx[k] = res if res is not None else ""
                    continue

                # Cek jika variabel bertipe signature / image dan bernilai path lokal
                if is_img_key and os.path.exists(v_trimmed):
                    res = self._create_inline_image(v_trimmed, width_mm=default_w)
                    clean_ctx[k] = res if res is not None else ""
                    continue

            clean_ctx[k] = v

        return clean_ctx

    def _create_inline_image(
        self,
        source: Any,
        width_mm: float = 30.0,
        height_mm: Optional[float] = None
    ) -> Optional[InlineImage]:
        """
        Membuat objek InlineImage dari data URL base64, buffer bytes, atau file path lokal.
        """
        if not source or not isinstance(source, (str, bytes, io.BytesIO)):
            return None

        kwargs = {"width": Mm(width_mm)}
        if height_mm is not None:
            kwargs["height"] = Mm(height_mm)

        try:
            # 1. Kasus Data URL (data:image/...)
            if isinstance(source, str) and source.startswith("data:image/"):
                _, b64_part = source.split(",", 1)
                img_bytes = base64.b64decode(b64_part)
                return InlineImage(self.doc, io.BytesIO(img_bytes), **kwargs)

            # 2. Kasus Bytes langsung
            if isinstance(source, bytes):
                return InlineImage(self.doc, io.BytesIO(source), **kwargs)

            # 3. Kasus BytesIO
            if isinstance(source, io.BytesIO):
                source.seek(0)
                return InlineImage(self.doc, source, **kwargs)

            # 4. Kasus path file lokal
            if isinstance(source, str) and os.path.exists(source):
                return InlineImage(self.doc, source, **kwargs)

        except Exception as e:
            # Fallback aman jika format gambar tidak valid
            print(f"[TemplateRenderer] Gagal menyematkan gambar: {e}")
            return None

        return None
