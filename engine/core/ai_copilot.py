"""
FastDoc AI Narrative Copilot
Menyediakan asisten narasi cerdas dengan dukungan:
1. Online LLM API (Google Gemini 1.5 Flash / OpenAI GPT-4o-mini) jika API key tersedia.
2. Offline Multi-Domain Synthesizer (Kurikulum Merdeka PAUD/SD, Kinerja Pegawai, Proposal/Surat).
"""

import os
import json
import urllib.request
import urllib.error
from typing import Dict, Any, Optional, List


class AICopilotEngine:
    """
    Mesin Copilot yang menggabungkan kemampuan online LLM dan offline heuristic synthesizer.
    """

    @classmethod
    def generate(
        cls,
        bullet_notes: str,
        domain: str = "kurikulum_merdeka",
        target_subject: str = "Murid",
        tone: str = "formal_pedagogis",
        api_key: Optional[str] = None,
        provider: str = "auto"
    ) -> Dict[str, Any]:
        notes = bullet_notes.strip()
        if not notes:
            return {"narrative": "", "engine_mode": "empty"}

        # 1. Cek ketersediaan API key (dari request atau environment variable)
        gemini_key = api_key if (api_key and "AIza" in api_key) else os.environ.get("GEMINI_API_KEY")
        openai_key = api_key if (api_key and api_key.startswith("sk-")) else os.environ.get("OPENAI_API_KEY")

        if provider == "gemini" and api_key:
            gemini_key = api_key
        elif provider == "openai" and api_key:
            openai_key = api_key

        # 2. Coba eksekusi Online LLM jika key ada
        if gemini_key:
            try:
                narrative = cls._call_gemini(gemini_key, notes, domain, target_subject, tone)
                return {"narrative": narrative, "engine_mode": "gemini_online"}
            except Exception as e:
                print(f"[AICopilot] Gagal memanggil Gemini online: {e}. Mengalihkan ke offline engine.")

        if openai_key:
            try:
                narrative = cls._call_openai(openai_key, notes, domain, target_subject, tone)
                return {"narrative": narrative, "engine_mode": "openai_online"}
            except Exception as e:
                print(f"[AICopilot] Gagal memanggil OpenAI online: {e}. Mengalihkan ke offline engine.")

        # 3. Fallback Offline Multi-Domain Synthesizer
        offline_narrative = cls._synthesize_offline(notes, domain, target_subject, tone)
        return {"narrative": offline_narrative, "engine_mode": "offline_synthesizer"}

    @classmethod
    def _call_gemini(cls, api_key: str, notes: str, domain: str, subject: str, tone: str) -> str:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
        system_instruction = (
            f"Anda adalah asisten profesional pembuat narasi dokumen resmi Indonesia. "
            f"Domain: {domain}. Subjek: {subject}. Gaya bahasa: {tone}. "
            f"Tugas: Ubah poin-poin catatan kasar berikut menjadi paragraf narasi evaluasi yang mengalir alami, "
            f"baku, santun, dan sesuai kaidah resmi tanpa poin-poin balet. Langsung berikan teks narasi tanpa pembuka/penutup basa-basi."
        )

        payload = {
            "contents": [
                {
                    "parts": [
                        {"text": f"{system_instruction}\n\nCatatan kasar:\n{notes}"}
                    ]
                }
            ],
            "generationConfig": {
                "temperature": 0.3,
                "maxOutputTokens": 600
            }
        }

        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"}
        )

        with urllib.request.urlopen(req, timeout=12.0) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return data["candidates"][0]["content"]["parts"][0]["text"].strip()

    @classmethod
    def _call_openai(cls, api_key: str, notes: str, domain: str, subject: str, tone: str) -> str:
        url = "https://api.openai.com/v1/chat/completions"
        system_msg = (
            f"Anda adalah asisten pembuat narasi dokumen resmi Indonesia. Domain: {domain}. "
            f"Subjek: {subject}. Gaya: {tone}. Ubah catatan kasar menjadi paragraf narasi resmi yang mengalir "
            f"tanpa daftar bullet dan tanpa basa-basi."
        )

        payload = {
            "model": "gpt-4o-mini",
            "messages": [
                {"role": "system", "content": system_msg},
                {"role": "user", "content": f"Catatan kasar:\n{notes}"}
            ],
            "temperature": 0.3,
            "max_tokens": 500
        }

        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {api_key}"
            }
        )

        with urllib.request.urlopen(req, timeout=12.0) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return data["choices"][0]["message"]["content"].strip()

    @classmethod
    def _synthesize_offline(cls, notes: str, domain: str, subject: str, tone: str) -> str:
        """
        Mesin sintesis offline multi-domain berkaidah tata bahasa Indonesia baku.
        """
        poin_list = [p.strip().lstrip("-*• 0123456789.)") for p in notes.split("\n") if p.strip()]
        if not poin_list:
            return ""

        # DOMAIN: Kurikulum Merdeka (Rapor PAUD / SD / Sekolah)
        if "kurikulum" in domain.lower() or "rapor" in domain.lower() or "paud" in domain.lower():
            kalimat = []
            if tone == "inspiratif":
                kalimat.append(f"Ananda {subject} tumbuh dengan penuh semangat dan menunjukkan antusiasme belajar yang mengagumkan.")
            else:
                kalimat.append(f"Sepanjang semester ini, Ananda {subject} menunjukkan pertumbuhan dan perkembangan capaian pembelajaran yang positif.")

            for poin in poin_list:
                p_lower = poin.lower()
                if any(w in p_lower for w in ["aktif", "antusias", "semangat", "gembira", "senang", "fokus"]):
                    kalimat.append(f"Dalam aktivitas harian, Ananda senantiasa menunjukkan dedikasi yang tinggi saat {poin}.")
                elif any(w in p_lower for w in ["surah", "doa", "shalat", "ibadah", "agama", "iman", "akhlak"]):
                    kalimat.append(f"Pada aspek nilai agama dan budi pekerti, Ananda mampu {poin} secara khusyuk dan tertib.")
                elif any(w in p_lower for w in ["teman", "bagi", "santun", "sapa", "gotong", "bantu", "sosial"]):
                    kalimat.append(f"Dalam hubungan sosial emosional, Ananda terbiasa {poin} serta menghargai sesama teman.")
                elif any(w in p_lower for w in ["balok", "lego", "gambar", "motorik", "seni", "steam", "hitung", "angka", "huruf"]):
                    kalimat.append(f"Pada ranah literasi dan eksplorasi STEAM, Ananda menunjukkan rasa ingin tahu yang mendalam ketika {poin}.")
                elif any(w in p_lower for w in ["perlu", "bimbingan", "dorong", "tingkatkan", "ingatkan", "latih", "dampingi"]):
                    kalimat.append(f"Diharapkan kerja sama berkelanjutan antara guru dan orang tua untuk terus memfasilitasi Ananda dalam {poin}.")
                else:
                    kalimat.append(f"Ananda juga mampu membiasakan diri untuk {poin} dengan bimbingan yang santun.")

            kalimat.append(f"Semoga potensi dan karakter unggul Ananda {subject} terus berkembang optimal.")
            return " ".join(kalimat)

        # DOMAIN: Evaluasi Kinerja Pegawai / SDM
        elif "kinerja" in domain.lower() or "pegawai" in domain.lower() or "sdm" in domain.lower():
            kalimat = [f"Saudara {subject} menunjukkan komitmen kerja dan loyalitas yang baik dalam menjalankan tugas kedinasan."]
            for poin in poin_list:
                p_lower = poin.lower()
                if any(w in p_lower for w in ["target", "capai", "selesai", "tuntas", "kpi"]):
                    kalimat.append(f"Terkait pencapaian target kerja, yang bersangkutan berhasil {poin} secara efektif.")
                elif any(w in p_lower for w in ["disiplin", "waktu", "hadir", "taat", "sop"]):
                    kalimat.append(f"Dari sisi kedisiplinan dan kepatuhan prosedur, yang bersangkutan selalu {poin}.")
                elif any(w in p_lower for w in ["tim", "kerjasama", "bantu", "kolaborasi"]):
                    kalimat.append(f"Dalam dinamika tim, pegawai proaktif dalam {poin}.")
                elif any(w in p_lower for w in ["evaluasi", "perbaiki", "tingkatkan", "kurang", "perlu"]):
                    kalimat.append(f"Disarankan agar yang bersangkutan memfokuskan peningkatan pada hal {poin}.")
                else:
                    kalimat.append(f"Pegawai bersangkutan juga menunjukkan kapasitas positif dalam {poin}.")
            return " ".join(kalimat)

        # DOMAIN: Proposal / Surat Resmi
        else:
            kalimat = [f"Berdasarkan hasil pengamatan dan pertimbangan terhadap {subject}:"]
            for poin in poin_list:
                kalimat.append(f"Memperhatikan bahwa {poin}.")
            kalimat.append("Demikian pertimbangan ini disusun untuk dapat dipergunakan sebagaimana mestinya.")
            return " ".join(kalimat)
