import React, { useState } from 'react';
import { Sparkles, X, Check, Loader2 } from 'lucide-react';

interface AICopilotModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyNarrative: (text: string) => void;
  targetFieldKey: string;
  defaultSubjectName?: string;
}

export const AICopilotModal: React.FC<AICopilotModalProps> = ({
  isOpen,
  onClose,
  onApplyNarrative,
  targetFieldKey,
  defaultSubjectName = 'Murid / Subjek',
}) => {
  const [subject, setSubject] = useState(defaultSubjectName);
  const [domain, setDomain] = useState('kurikulum_merdeka_paud');
  const [tone, setTone] = useState('formal_pedagogis');
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('fastdoc_ai_key') || '');
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [engineMode, setEngineMode] = useState<string>('');
  const [bulletNotes, setBulletNotes] = useState(
    'aktif menyusun balok menara tinggi\nhafal doa sebelum belajar dan surah pendek\nperlu bimbingan sabar mengantri cuci tangan'
  );
  const [generatedText, setGeneratedText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    if (!bulletNotes.trim()) {
      alert('Masukkan setidaknya 1-2 poin catatan kasar.');
      return;
    }

    setIsLoading(true);
    try {
      if (apiKey) {
        localStorage.setItem('fastdoc_ai_key', apiKey.trim());
      }
      const res = await fetch('/api/ai/narrative', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain,
          target_subject: subject,
          bullet_notes: bulletNotes,
          tone,
          api_key: apiKey.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (json.status === 'success') {
        setGeneratedText(json.data.narrative);
        setEngineMode(json.data.engine_mode || 'offline_synthesizer');
      } else {
        throw new Error('Gagal menghasilkan narasi');
      }
    } catch (e: any) {
      alert(`Error AI: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = () => {
    onApplyNarrative(generatedText);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ width: '560px', maxWidth: '95vw' }}>
        <div style={{
          backgroundColor: '#F8FAFC',
          borderBottom: '1px solid var(--border-app)',
          padding: '14px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: 32, height: 32, borderRadius: '6px', background: '#EFF6FF', color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Sparkles size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '13.5px', fontWeight: 600, margin: 0, color: 'var(--text-main)' }}>AI Narrative Copilot</h3>
              <p style={{ fontSize: '11px', color: 'var(--text-dim)', margin: 0 }}>
                Untuk kolom: <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-blue)' }}>{targetFieldKey}</code>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="icon-btn">
            <X size={15} />
          </button>
        </div>

        <div style={{ padding: '20px', backgroundColor: '#FFFFFF' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label className="exp-label">Nama Subjek / Murid</label>
              <input
                className="exp-input"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Misal: Azzam / Kenzi"
              />
            </div>
            <div>
              <label className="exp-label">Domain Standar</label>
              <select
                className="exp-input"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
              >
                <option value="kurikulum_merdeka_paud">Kurikulum Merdeka (PAUD/TK)</option>
                <option value="kurikulum_merdeka_sd">Kurikulum Merdeka (SD/SMP)</option>
                <option value="hrd_kpi">Evaluasi Kinerja Pegawai (HRD)</option>
                <option value="proposal_bisnis">Pengantar Proposal / Surat Resmi</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
            <div>
              <label className="exp-label">Gaya Bahasa (Tone)</label>
              <select
                className="exp-input"
                value={tone}
                onChange={(e) => setTone(e.target.value)}
              >
                <option value="formal_pedagogis">Baku & Formal Pedagogis</option>
                <option value="inspiratif">Inspiratif & Memotivasi</option>
                <option value="ringkas">Ringkas & Padat</option>
              </select>
            </div>
            <div>
              <label className="exp-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Model AI</span>
                <span
                  style={{ color: 'var(--accent-blue)', cursor: 'pointer', fontSize: '11px' }}
                  onClick={() => setShowKeyInput(!showKeyInput)}
                >
                  {showKeyInput ? 'Tutup Kunci' : '⚙️ Atur API Key'}
                </span>
              </label>
              <div style={{ fontSize: '11px', color: 'var(--text-dim)', paddingTop: '6px' }}>
                {apiKey ? '🟢 Terhubung ke Online LLM' : '⚡ Mesin Cerdas Offline (Tanpa Kuota)'}
              </div>
            </div>
          </div>

          {showKeyInput && (
            <div style={{ marginBottom: '14px', padding: '10px 12px', backgroundColor: '#F8FAFC', borderRadius: '6px', border: '1px solid var(--border-app)' }}>
              <label className="exp-label" style={{ marginBottom: '4px' }}>
                Google Gemini / OpenAI API Key (Opsional)
              </label>
              <input
                type="password"
                className="exp-input"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Tempel kunci AIza... atau sk-..."
              />
              <p style={{ fontSize: '10.5px', color: 'var(--text-dim)', margin: '4px 0 0 0' }}>
                Jika kosong, sistem otomatis memakai mesin tata bahasa offline berstandar resmi.
              </p>
            </div>
          )}

          <div style={{ marginBottom: '14px' }}>
            <label className="exp-label">
              <span>Catatan Singkat / Poin Karakter (Gaya Bebas):</span>
            </label>
            <textarea
              className="exp-textarea"
              style={{ minHeight: '75px', fontSize: '12px' }}
              value={bulletNotes}
              onChange={(e) => setBulletNotes(e.target.value)}
              placeholder="Tulis poin-poin singkat karakter atau capaian di sini..."
            />
          </div>

          <button
            className="btn-tool primary"
            style={{ width: '100%', height: '34px', justifyContent: 'center', marginBottom: '16px' }}
            onClick={handleGenerate}
            disabled={isLoading}
          >
            {isLoading ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
            <span>{isLoading ? 'Menyusun Narasi Baku...' : 'Rangkai Narasi Resmi Otomatis'}</span>
          </button>

          {generatedText && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label className="exp-label" style={{ color: 'var(--accent-blue)', margin: 0 }}>
                  Hasil Narasi yang Disusun:
                </label>
                {engineMode && (
                  <span style={{
                    fontSize: '10px',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    background: engineMode.includes('online') ? '#DCFCE7' : '#F1F5F9',
                    color: engineMode.includes('online') ? '#166534' : '#475569',
                    fontWeight: 500
                  }}>
                    {engineMode.includes('gemini') ? '✨ Gemini 1.5 Flash' :
                     engineMode.includes('openai') ? '✨ GPT-4o-mini' : '⚡ Mesin Offline Cerdas'}
                  </span>
                )}
              </div>
              <textarea
                className="exp-textarea"
                style={{
                  minHeight: '100px',
                  background: '#F0F9FF',
                  borderColor: '#BAE6FD',
                  fontSize: '12px',
                  lineHeight: '1.5',
                  color: 'var(--text-main)',
                }}
                value={generatedText}
                onChange={(e) => setGeneratedText(e.target.value)}
              />
            </div>
          )}
        </div>

        <div style={{
          backgroundColor: '#F8FAFC',
          borderTop: '1px solid var(--border-app)',
          padding: '12px 18px',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '8px',
        }}>
          <button className="btn-tool" onClick={onClose}>
            Batal
          </button>
          <button
            className="btn-tool primary"
            onClick={handleApply}
            disabled={!generatedText}
          >
            <Check size={14} />
            <span>Terapkan ke Formulir</span>
          </button>
        </div>
      </div>
    </div>
  );
};
