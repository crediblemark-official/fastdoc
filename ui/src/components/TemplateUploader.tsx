import { useRef, useState } from 'react';
import { UploadCloud, FileText, CheckCircle2, Sparkles, FolderOpen, Wand2 } from 'lucide-react';
import type { ScanResponse } from '../types';

interface TemplateUploaderProps {
  onScanSuccess: (data: ScanResponse['data']) => void;
  currentTemplate: ScanResponse['data'] | null;
}

export const TemplateUploader = ({
  onScanSuccess,
  currentTemplate,
}: TemplateUploaderProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file.name.endsWith('.docx')) {
      alert('Harap unggah file template bertipe Microsoft Word (.docx)');
      return;
    }

    setIsScanning(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/templates/scan', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        throw new Error('Gagal memindai template');
      }

      const json: ScanResponse = await res.json();
      onScanSuccess(json.data);
    } catch (err: any) {
      alert(`Error saat memindai: ${err.message || 'Koneksi gagal'}`);
    } finally {
      setIsScanning(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  // Memuat contoh template Raport TK yang sudah siap pakai langsung dari server
  const handleLoadPreset = async () => {
    setIsScanning(true);
    try {
      const res = await fetch('/api/templates/load-preset', {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Gagal memuat preset');
      const json: ScanResponse = await res.json();
      onScanSuccess(json.data);
    } catch (e: any) {
      alert(`Gagal memuat template contoh: ${e.message}`);
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="card-title">
          <FolderOpen size={20} color="var(--primary)" />
          <span>1. Template Dokumen</span>
        </h2>
        {currentTemplate && (
          <span style={{ fontSize: '0.75rem', color: 'var(--accent-emerald)', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
            <CheckCircle2 size={14} /> Terpilih
          </span>
        )}
      </div>

      <div
        className={`dropzone ${isDragging ? 'active' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          type="file"
          ref={fileInputRef}
          accept=".docx"
          style={{ display: 'none' }}
          onChange={(e) => e.target.files && e.target.files[0] && handleFile(e.target.files[0])}
        />

        <UploadCloud className="dropzone-icon" />
        <p className="dropzone-text">
          {isScanning ? 'Menganalisis & Mengonversi Dokumen...' : 'Klik atau Tarik File .docx ke Sini'}
        </p>
        <p className="dropzone-hint">
          Bisa file template bertag <code>&#123;&#123; variabel &#125;&#125;</code> atau <strong>dokumen Word mentah</strong> (sistem otomatis mendeteksi field).
        </p>
      </div>

      {currentTemplate && (
        <div style={{ marginTop: '16px', padding: '12px 14px', background: 'var(--bg-card-alt)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FileText size={22} color="var(--primary)" />
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <p style={{ fontSize: '0.9rem', fontWeight: 700, margin: 0, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                {currentTemplate.filename}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                  {currentTemplate.schema.total_variables} variabel terdeteksi
                </span>
                {currentTemplate.auto_converted && (
                  <span style={{ fontSize: '0.65rem', background: 'rgba(16, 185, 129, 0.15)', color: 'var(--accent-emerald)', padding: '1px 6px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <Wand2 size={10} /> Auto-Converted
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preset Bawaan */}
      <div className="presets-container">
        <p className="presets-label">Pilihan Contoh Template Cepat:</p>
        <button
          type="button"
          className="preset-chip"
          onClick={handleLoadPreset}
          disabled={isScanning}
          style={{ background: 'rgba(139, 92, 246, 0.12)', borderColor: 'rgba(139, 92, 246, 0.3)' }}
        >
          <Sparkles size={16} color="var(--accent-purple)" />
          <span>Muat Contoh Raport TK Pembina (16 Field Siap Pakai)</span>
        </button>
      </div>
    </div>
  );
};
