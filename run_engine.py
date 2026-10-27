#!/usr/bin/env python3
"""
FastDoc Engine Runner
Menjalankan local REST API service untuk FastDoc desktop.
"""

import sys
import uvicorn

def main():
    port = 8765
    print(f"==================================================")
    print(f"  FastDoc Desktop Core Engine v1.0.0")
    print(f"  Local API Endpoint: http://127.0.0.1:{port}")
    print(f"  API Documentation : http://127.0.0.1:{port}/docs")
    print(f"==================================================")

    uvicorn.run(
        "engine.api.server:app",
        host="127.0.0.1",
        port=port,
        log_level="info",
        reload=True
    )

if __name__ == "__main__":
    main()
