"""
FastDoc Core Filters
Koleksi filter kustom Jinja2 untuk format tanggal Indonesia, mata uang Rupiah,
terbilang angka, dan fungsi pembantu ceklis/centang.
"""

from datetime import datetime, date
from typing import Any, Union


def format_date(value: Any, format_str: str = "%d %B %Y") -> str:
    """
    Format tanggal ke dalam bahasa Indonesia baku.
    Contoh: datetime(2019, 9, 12) -> "12 September 2019"
    """
    if value is None or value == "":
        return ""

    bulan_indo = {
        1: "Januari", 2: "Februari", 3: "Maret", 4: "April",
        5: "Mei", 6: "Juni", 7: "Juli", 8: "Agustus",
        9: "September", 10: "Oktober", 11: "November", 12: "Desember"
    }

    dt = None
    if isinstance(value, (datetime, date)):
        dt = value
    elif isinstance(value, str):
        value_str = value.strip()
        for parse_fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y", "%Y/%m/%d"):
            try:
                dt = datetime.strptime(value_str, parse_fmt)
                break
            except ValueError:
                continue

    if dt:
        nama_bulan = bulan_indo.get(dt.month, "")
        return f"{dt.day} {nama_bulan} {dt.year}"

    return str(value)


def rupiah(value: Any) -> str:
    """
    Format angka menjadi format mata uang Rupiah Indonesia.
    Contoh: 15500000 -> "Rp 15.500.000,00"
    """
    if value is None or value == "":
        return "Rp 0,00"

    try:
        if isinstance(value, str):
            clean_str = value.replace("Rp", "").replace(".", "").replace(" ", "").strip()
            if "," in clean_str:
                clean_str = clean_str.replace(",", ".")
            num = float(clean_str)
        else:
            num = float(value)

        formatted = f"{num:,.2f}"
        # Swap separators: 15,500,000.00 -> 15.500.000,00
        formatted = formatted.replace(",", "_").replace(".", ",").replace("_", ".")
        return f"Rp {formatted}"
    except (ValueError, TypeError):
        return str(value)


def ribuan(value: Any) -> str:
    """
    Format angka dengan pemisah ribuan titik tanpa simbol Rp.
    Contoh: 15500 -> "15.500"
    """
    if value is None or value == "":
        return ""
    try:
        num = int(float(str(value).replace(".", "").replace(",", ".")))
        return f"{num:,}".replace(",", ".")
    except (ValueError, TypeError):
        return str(value)


def terbilang(n: Union[int, float, str]) -> str:
    """
    Mengonversi angka nominal menjadi teks terbilang dalam bahasa Indonesia.
    Contoh: 1500000 -> "Satu Juta Lima Ratus Ribu Rupiah"
    """
    try:
        if isinstance(n, str):
            clean = n.replace("Rp", "").replace(".", "").replace(" ", "").strip()
            if "," in clean:
                clean = clean.split(",")[0]
            nilai = int(clean)
        else:
            nilai = int(n)
    except (ValueError, TypeError):
        return str(n)

    if nilai < 0:
        raw_text = "Minus " + _konversi_terbilang(abs(nilai)) + " Rupiah"
    elif nilai == 0:
        raw_text = "Nol Rupiah"
    else:
        raw_text = _konversi_terbilang(nilai) + " Rupiah"

    # Bersihkan spasi ganda
    return " ".join(raw_text.split())


def _konversi_terbilang(x: int) -> str:
    satuan = ["", "Satu", "Dua", "Tiga", "Empat", "Lima", "Enam", "Tujuh", "Delapan", "Sembilan", "Sepuluh", "Sebelas"]
    if x < 12:
        return satuan[x]
    elif x < 20:
        return _konversi_terbilang(x - 10) + " Belas"
    elif x < 100:
        return _konversi_terbilang(x // 10) + " Puluh " + _konversi_terbilang(x % 10)
    elif x < 200:
        return "Seratus " + _konversi_terbilang(x - 100)
    elif x < 1000:
        return _konversi_terbilang(x // 100) + " Ratus " + _konversi_terbilang(x % 100)
    elif x < 2000:
        return "Seribu " + _konversi_terbilang(x - 1000)
    elif x < 1000000:
        return _konversi_terbilang(x // 1000) + " Ribu " + _konversi_terbilang(x % 1000)
    elif x < 1000000000:
        return _konversi_terbilang(x // 1000000) + " Juta " + _konversi_terbilang(x % 1000000)
    elif x < 1000000000000:
        return _konversi_terbilang(x // 1000000000) + " Miliar " + _konversi_terbilang(x % 1000000000)
    else:
        return _konversi_terbilang(x // 1000000000000) + " Triliun " + _konversi_terbilang(x % 1000000000000)


def ceklis(kondisi: bool) -> str:
    """
    Mengembalikan simbol centang jika kondisi True, atau string kosong jika False.
    Sangat berguna untuk tabel capaian nilai raport (BB, MB, BSH, BSB).
    """
    return "✓" if bool(kondisi) else ""


def register_filters(jinja_env) -> None:
    """
    Daftarkan semua custom filters ke dalam Jinja Environment.
    """
    jinja_env.filters["format_date"] = format_date
    jinja_env.filters["rupiah"] = rupiah
    jinja_env.filters["ribuan"] = ribuan
    jinja_env.filters["terbilang"] = terbilang
    jinja_env.filters["ceklis"] = ceklis
