# -*- mode: python ; coding: utf-8 -*-
"""
PyInstaller Specification File for FastDoc Desktop (.exe)
Menyatukan UI statis (ui/dist), modul OpenXML Engine, dan Native WebView2 Launcher.
"""

import sys
import os
from PyInstaller.utils.hooks import collect_data_files, collect_submodules

block_cipher = None

# Kumpulkan data dari modul terkait
datas = [
    ('ui/dist', 'ui/dist'),
    ('samples', 'samples'),
]

# Kumpulkan hidden imports untuk uvicorn, fastapi, docxtpl, openpyxl, pywebview
hiddenimports = [
    'uvicorn',
    'uvicorn.logging',
    'uvicorn.loops',
    'uvicorn.loops.auto',
    'uvicorn.protocols',
    'uvicorn.protocols.http',
    'uvicorn.protocols.http.auto',
    'uvicorn.lifespan',
    'uvicorn.lifespan.on',
    'fastapi',
    'starlette',
    'docxtpl',
    'docx',
    'openpyxl',
    'jinja2',
    'defusedxml',
    'python_multipart',
    'webview',
] + collect_submodules('engine')

a = Analysis(
    ['desktop_launcher.py'],
    pathex=['.'],
    binaries=[],
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=['tkinter', 'matplotlib', 'scipy'],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='FastDoc',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=False,  # False agar tidak memunculkan jendela hitam terminal/CMD di Windows!
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon='packaging/icon.ico' if os.path.exists('packaging/icon.ico') else None,
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='FastDoc',
)
