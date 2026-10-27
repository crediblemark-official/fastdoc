"""
FastDoc Live Document Preview Engine
Mengonversi dokumen .docx yang telah dirender menjadi tampilan HTML visual instan
menggunakan mammoth dan styling A4 sheet.
"""

import io
from typing import Dict, Any, Union
import mammoth
from engine.core.renderer import TemplateRenderer


class PreviewRenderer:
    """
    Penghasil pratinjau visual HTML dokumen langsung di browser / desktop view.
    """

    @classmethod
    def render_preview_html(cls, docx_source: Union[str, io.BytesIO], context: Dict[str, Any] = None) -> str:
        """
        Merender template dengan data context (jika ada), lalu mengonversi hasilnya ke HTML.
        """
        if context is not None:
            renderer = TemplateRenderer(docx_source)
            renderer.render(context)
            stream = renderer.save_to_stream()
        else:
            if isinstance(docx_source, str):
                with open(docx_source, "rb") as f:
                    stream = io.BytesIO(f.read())
            elif isinstance(docx_source, io.BytesIO):
                stream = docx_source
            else:
                stream = io.BytesIO(docx_source)

        stream.seek(0)
        conversion = mammoth.convert_to_html(stream)
        raw_html = conversion.value

        # Sisipkan pembungkus styling lembar dokumen A4 yang rapi
        styled_html = f"""
        <div class="fastdoc-preview-sheet">
            <style>
                .fastdoc-preview-sheet {{
                    background: #FFFFFF;
                    color: #1E293B;
                    font-family: 'Times New Roman', Times, serif, system-ui;
                    line-height: 1.5;
                    font-size: 13.5px;
                    padding: 36px 48px;
                    margin: 0 auto;
                    max-width: 820px;
                    min-height: 1000px;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
                    border-radius: 4px;
                    box-sizing: border-box;
                }}
                .fastdoc-preview-sheet table {{
                    width: 100%;
                    border-collapse: collapse;
                    margin: 14px 0;
                }}
                .fastdoc-preview-sheet th,
                .fastdoc-preview-sheet td {{
                    border: 1px solid #334155;
                    padding: 6px 10px;
                    vertical-align: top;
                    font-size: 12.5px;
                }}
                .fastdoc-preview-sheet p {{
                    margin: 6px 0;
                }}
                .fastdoc-preview-sheet h1, 
                .fastdoc-preview-sheet h2, 
                .fastdoc-preview-sheet h3 {{
                    text-align: center;
                    margin: 8px 0;
                    font-weight: bold;
                }}
                .fastdoc-preview-sheet img {{
                    max-width: 100%;
                    height: auto;
                    display: inline-block;
                }}
            </style>
            {raw_html}
        </div>
        """
        return styled_html
