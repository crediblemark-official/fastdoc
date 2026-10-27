"""
FastDoc PDF Conversion Engine
Mengonversi dokumen .docx hasil render ke format .pdf berkualitas tinggi.
Mendukung:
1. Microsoft Word Native COM Automation (Windows) - 100% identik dengan hasil cetak Word asli.
2. LibreOffice / soffice Headless CLI (Cross-platform Linux & Windows).
3. Fallback graceful jika engine PDF eksternal belum terpasang.
"""

import os
import io
import sys
import shutil
import tempfile
import subprocess
from typing import Union, Optional


class PDFConverter:
    """
    Konverter .docx ke .pdf mandiri.
    """

    @classmethod
    def is_available(cls) -> bool:
        """Cek apakah ada engine PDF yang dapat digunakan di sistem ini."""
        if sys.platform == "win32":
            return True  # Word COM atau LibreOffice
        return shutil.which("libreoffice") is not None or shutil.which("soffice") is not None

    @classmethod
    def convert_docx_to_pdf(
        cls,
        docx_source: Union[str, bytes, io.BytesIO],
        output_path: Optional[str] = None
    ) -> io.BytesIO:
        """
        Mengonversi docx ke PDF dan mengembalikan stream BytesIO.
        """
        with tempfile.TemporaryDirectory() as tmpdir:
            temp_docx = os.path.join(tmpdir, "input.docx")
            temp_pdf = os.path.join(tmpdir, "input.pdf")

            # Tulis sumber docx ke file sementara
            if isinstance(docx_source, str):
                shutil.copyfile(docx_source, temp_docx)
            elif isinstance(docx_source, bytes):
                with open(temp_docx, "wb") as f:
                    f.write(docx_source)
            elif isinstance(docx_source, io.BytesIO):
                docx_source.seek(0)
                with open(temp_docx, "wb") as f:
                    f.write(docx_source.read())

            success = False

            # 1. Coba Microsoft Word COM Automation di Windows
            if sys.platform == "win32":
                try:
                    import win32com.client
                    import pythoncom
                    pythoncom.CoInitialize()
                    word = win32com.client.DispatchEx("Word.Application")
                    word.Visible = False
                    word.DisplayAlerts = False
                    doc = word.Documents.Open(os.path.abspath(temp_docx))
                    # 17 = wdFormatPDF
                    doc.SaveAs(os.path.abspath(temp_pdf), FileFormat=17)
                    doc.Close(False)
                    word.Quit()
                    pythoncom.CoUninitialize()
                    if os.path.exists(temp_pdf):
                        success = True
                except Exception as e:
                    print(f"[PDFConverter] Word COM gagal: {e}. Mencoba fallback...")

            # 2. Coba LibreOffice / soffice headless (Linux & Windows)
            if not success:
                lo_bin = shutil.which("libreoffice") or shutil.which("soffice")
                if lo_bin:
                    try:
                        cmd = [
                            lo_bin,
                            "--headless",
                            "--convert-to", "pdf",
                            "--outdir", tmpdir,
                            temp_docx
                        ]
                        subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=25, check=True)
                        if os.path.exists(temp_pdf):
                            success = True
                    except Exception as e:
                        print(f"[PDFConverter] LibreOffice gagal: {e}")

            if not success or not os.path.exists(temp_pdf):
                raise RuntimeError(
                    "Konversi PDF memerlukan Microsoft Word (di Windows) atau LibreOffice terpasang pada sistem. "
                    "Pastikan salah satunya tersedia."
                )

            # Jika output_path diminta, simpan ke lokasi tersebut
            if output_path:
                os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
                shutil.copyfile(temp_pdf, output_path)

            pdf_stream = io.BytesIO()
            with open(temp_pdf, "rb") as f:
                pdf_stream.write(f.read())
            pdf_stream.seek(0)
            return pdf_stream
