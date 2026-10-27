import { useState, useEffect } from 'react';
import { Download, Sparkles, RefreshCw, FileCheck } from 'lucide-react';
import type { VariableMeta } from '../types';
import { AICopilotModal } from './AICopilotModal';
import { SignatureFieldWidget } from './SignatureFieldWidget';

interface SingleFormViewProps {
  templateId: string;
  templateFilename: string;
  variables: VariableMeta[];
  initialData?: Record<string, any>;
  onNotify: (msg: string, type: 'success' | 'error') => void;
}

export const SingleFormView = ({
  templateId,
  templateFilename,
  variables,
  initialData,
  onNotify,
}: SingleFormViewProps) => {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [outputFilename, setOutputFilename] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // State untuk modal AI Copilot
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiTargetKey, setAiTargetKey] = useState('');

  // Inisialisasi nilai form saat template berganti
  useEffect(() => {
    const data: Record<string, any> = {};

    // 1. Prioritaskan data yang diekstrak otomatis dari dokumen asli
    if (initialData && Object.keys(initialData).length > 0) {
      Object.assign(data, initialData);
    }

    // 2. Berikan default fallback untuk variabel yang belum terisi
    variables.forEach((v) => {
      if (!v.is_loop && !(v.key in data)) {
        if (v.key === 'nama_lengkap') data[v.key] = 'Fathan Azzam Alano';
        else if (v.key === 'nama_panggilan') data[v.key] = 'Azzam';
        else if (v.key === 'nisn') data[v.key] = '3198824801';
        else if (v.key === 'no_induk') data[v.key] = '1555';
        else data[v.key] = '';
      }
    });

    setFormData(data);
    const baseName = templateFilename.replace('.docx', '');
    setOutputFilename(`Hasil_${baseName}.docx`);
  }, [templateId, templateFilename, variables, initialData]);

  const handleInputChange = (key: string, value: any) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleOpenAi = (key: string) => {
    setAiTargetKey(key);
    setAiModalOpen(true);
  };

  const handleApplyNarrative = (text: string) => {
    if (aiTargetKey) {
      handleInputChange(aiTargetKey, text);
      onNotify('Narasi AI berhasil dimasukkan ke form!', 'success');
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);

    try {
      const res = await fetch('/api/generate/single', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template_id: templateId,
          output_filename: outputFilename,
          data: formData,
        }),
      });

      if (!res.ok) {
        throw new Error('Gagal men-generate dokumen');
      }

      // Download file biner langsung ke browser
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = outputFilename.endsWith('.docx') ? outputFilename : `${outputFilename}.docx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      onNotify('Dokumen .docx berhasil di-generate & diunduh!', 'success');
    } catch (err: any) {
      onNotify(`Gagal: ${err.message}`, 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const scalarVars = variables.filter((v) => !v.is_loop);

  return (
    <div>
      <form onSubmit={handleGenerate}>
        <div className="form-grid">
          {scalarVars.map((v) => {
            const isSignature = v.data_type === 'signature' ||
              v.key.startsWith('ttd') ||
              v.key.includes('tanda_tangan') ||
              v.key.includes('tandatangan') ||
              v.key.includes('signature') ||
              v.key.includes('paraf');

            const isMultiline = !isSignature && (v.data_type === 'text_multiline' || v.is_ai_candidate);
            const inputVal = formData[v.key] ?? '';

            return (
              <div
                key={v.key}
                className={`form-group ${isMultiline || isSignature ? 'full-width' : ''}`}
              >
                <div className="form-label">
                  <span>
                    {v.display_name} <code>({v.key})</code>
                  </span>
                  {isMultiline && (
                    <button
                      type="button"
                      className="btn btn-ai"
                      onClick={() => handleOpenAi(v.key)}
                    >
                      <Sparkles size={12} />
                      <span>Bantuan AI</span>
                    </button>
                  )}
                </div>

                {isSignature ? (
                  <SignatureFieldWidget
                    fieldKey={v.key}
                    fieldLabel={v.display_name}
                    value={inputVal}
                    onChange={(dataUrl) => handleInputChange(v.key, dataUrl)}
                  />
                ) : isMultiline ? (
                  <textarea
                    className="form-textarea"
                    value={inputVal}
                    onChange={(e) => handleInputChange(v.key, e.target.value)}
                    placeholder={`Masukkan ${v.display_name.toLowerCase()}...`}
                  />
                ) : (
                  <input
                    type={v.data_type === 'number' ? 'number' : v.data_type === 'date' ? 'date' : 'text'}
                    className="form-input"
                    value={inputVal}
                    onChange={(e) => handleInputChange(v.key, e.target.value)}
                    placeholder={`Masukkan nilai untuk ${v.display_name}...`}
                  />
                )}
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)' }}>
          <div className="form-group" style={{ maxWidth: '420px' }}>
            <label className="form-label">Nama File Dokumen Hasil:</label>
            <input
              className="form-input"
              value={outputFilename}
              onChange={(e) => setOutputFilename(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={isGenerating}
            >
              {isGenerating ? <RefreshCw size={18} className="animate-spin" /> : <Download size={18} />}
              <span>{isGenerating ? 'Menginjeksi XML...' : 'Generate & Download .DOCX'}</span>
            </button>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <FileCheck size={14} color="var(--accent-emerald)" /> 100% Presisi Layout
            </span>
          </div>
        </div>
      </form>

      {/* Modal AI Narrative Copilot */}
      <AICopilotModal
        isOpen={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        onApplyNarrative={handleApplyNarrative}
        targetFieldKey={aiTargetKey}
        defaultSubjectName={formData['nama_panggilan'] || formData['nama_lengkap'] || 'Murid'}
      />
    </div>
  );
};
