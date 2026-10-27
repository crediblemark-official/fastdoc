#!/usr/bin/env python3
"""
FastDoc Native Desktop Launcher
Membuka aplikasi desktop native (WebView2 / Native Window) tanpa menampilkan konsol terminal,
serta menjalankan engine lokal FastAPI di latar belakang.
"""

import sys
import time
import socket
import threading
import urllib.request
import uvicorn
import webview

def find_free_port() -> int:
    """Mencari port TCP kosong yang tersedia."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(('127.0.0.1', 0))
        return s.getsockname()[1]

def wait_for_server(url: str, timeout: float = 10.0) -> bool:
    """Menunggu hingga server HTTP lokal siap menerima request."""
    start_time = time.time()
    while time.time() - start_time < timeout:
        try:
            with urllib.request.urlopen(url, timeout=1.0) as response:
                if response.status == 200:
                    return True
        except Exception:
            time.sleep(0.1)
    return False

def start_backend(port: int):
    """Menjalankan server FastAPI di thread terpisah."""
    uvicorn.run(
        "engine.api.server:app",
        host="127.0.0.1",
        port=port,
        log_level="error",
        reload=False
    )

def main():
    # Pilih port lokal (default 8765 jika bebas, atau port dinamis)
    port = 8765
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.bind(('127.0.0.1', port))
    except OSError:
        port = find_free_port()

    # Jalankan server FastAPI di thread latar belakang
    server_thread = threading.Thread(target=start_backend, args=(port,), daemon=True)
    server_thread.start()

    app_url = f"http://127.0.0.1:{port}"
    print(f"Menunggu FastDoc Engine di {app_url}...")

    if not wait_for_server(f"{app_url}/api/system/health"):
        print("Gagal memulai FastDoc Engine dalam batas waktu.")
        sys.exit(1)

    print("FastDoc Engine siap. Membuka jendela desktop native...")

    # Buka jendela desktop native
    window = webview.create_window(
        title="FastDoc - Universal Document Automation",
        url=app_url,
        width=1280,
        height=850,
        min_size=(980, 650),
        text_select=True,
    )

    webview.start(debug=False)

if __name__ == "__main__":
    main()
