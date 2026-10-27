#!/usr/bin/env python3
"""
FastDoc Release Build Orchestrator
Mengotomatiskan kompilasi frontend, bundling PyInstaller, dan pembuatan installer (.exe / .msi).
"""

import os
import sys
import subprocess
import shutil

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def run_cmd(cmd: str, cwd: str = ROOT_DIR):
    print(f"\n[EXEC] {cmd} (in {cwd})")
    ret = subprocess.run(cmd, shell=True, cwd=cwd)
    if ret.returncode != 0:
        print(f"[ERROR] Perintah gagal dengan exit code {ret.returncode}: {cmd}")
        sys.exit(ret.returncode)

def main():
    print("=======================================================")
    print("  FastDoc Desktop Release Builder")
    print("=======================================================")

    # 1. Build Frontend UI
    print("\n--- 1. Membangun Frontend UI (Vite + React) ---")
    ui_dir = os.path.join(ROOT_DIR, "ui")
    run_cmd("npm run build", cwd=ui_dir)

    # 2. Bundle Desktop Application via PyInstaller
    print("\n--- 2. Membungkus Aplikasi Desktop via PyInstaller ---")
    run_cmd("pyinstaller --clean --noconfirm fastdoc.spec", cwd=ROOT_DIR)

    dist_fastdoc = os.path.join(ROOT_DIR, "dist", "FastDoc")
    if not os.path.exists(dist_fastdoc):
        print(f"[ERROR] Direktori hasil kompilasi tidak ditemukan di: {dist_fastdoc}")
        sys.exit(1)

    print(f"\n[OK] Aplikasi berhasil dikompilasi ke: {dist_fastdoc}")

    # 3. Cek ketersediaan Inno Setup (iscc) untuk membuat .exe installer
    iscc_path = shutil.which("iscc") or shutil.which("ISCC.exe")
    if iscc_path:
        print("\n--- 3. Menghasilkan Installer FastDoc-Setup.exe (Inno Setup) ---")
        iss_file = os.path.join(ROOT_DIR, "packaging", "inno_setup.iss")
        run_cmd(f'"{iscc_path}" "{iss_file}"')
    else:
        print("\n[NOTE] Compiler Inno Setup (iscc) tidak terdeteksi di PATH.")
        print("       Untuk membuat installer Windows .exe, jalankan packaging/inno_setup.iss di Inno Setup Compiler.")

    # 4. Buat paket Portable .zip
    print("\n--- 4. Mengemas Paket Portable FastDoc.zip ---")
    dist_dir = os.path.join(ROOT_DIR, "dist")
    archive_name = os.path.join(dist_dir, "FastDoc-Portable-v1.0.0")
    shutil.make_archive(archive_name, 'zip', dist_fastdoc)
    print(f"[OK] Paket Portable ZIP berhasil dibuat di: {archive_name}.zip")

    print("\n=======================================================")
    print("  Proses Build Release Selesai dengan Sukses!")
    print("=======================================================")

if __name__ == "__main__":
    main()
