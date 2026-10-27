import { useState, useRef } from 'react';
import { Download, Upload, Archive, CheckCircle2, RefreshCw } from 'lucide-react';

interface BatchExcelViewProps {
  templateId: string;
  templateFilename: string;
  onNotify: (msg: string, type: 'success' | 'error') => void;
}

export const BatchExcelView = ({
  templateId,
  templateFilename,
  onNotify,
}: BatchExcelViewProps) => {
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [filenamePattern, setFilenamePattern] = useState('Raport_{{ nama_panggilan }}_{{ no_induk }}.docx');
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDownloadExcelTemplate = () => {
    window.location.href = `/api/templates/${templateId}/excel-template`;
    onNotify('File template Excel berhasil diunduh. Silakan isi datanya.', 'success');
  };

  const handleGenerateBatch = async () => {
    if (!excelFile) {
      alert('Harap pilih atau unggah file data Excel (.xlsx) terlebih dahulu.');
      return;
    }

    setIsProcessing(true);
    const formData = new FormData();
    formData.append('template_id', templateId);
    formData.append('filename_pattern', filenamePattern);
    formData.append('data_file', excelFile);

    try {
      const res = await fetch('/api/generate/batch', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        throw new Error('Gagal memproses batch dokumen');
      }

      // Download file ZIP hasil
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Batch_${templateFilename.replace('.docx', '')}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      onNotify('Arsip ZIP berhasil dihasilkan & diunduh!', 'success');
    } catch (err: any) {
      onNotify(`Gagal batch: ${err.message}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="batch-steps">
      {/* Langkah 1 */}
      <div className="step-card">
        <div className="step-number">1</div>
        <div className="step-content">
          <h3 className="step-title">Unduh Format Spreadsheet Excel Otomatis</h3>
          <p className="step-desc">
            Sistem membuatkan file Excel (.xlsx) yang header kolomnya sudah otomatis sesuai dengan seluruh tag variabel yang terdeteksi di template ini.
          </p>
          <button
            className="btn btn-secondary"
            onClick={handleDownloadExcelTemplate}
          >
            <Download size={16} />
            <span>Unduh Format Excel Kosong (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* Langkah 2 */}
      <div className="step-card">
        <div className="step-number">2</div>
        <div className="step-content">
          <h3 className="step-title">Unggah File Excel yang Sudah Diisi</h3>
          <p className="step-desc">
            Satu baris di Excel mewakili 1 dokumen murid/karyawan. Anda bisa mengisi 10, 50, atau 500 baris sekaligus.
          </p>

          <input
            type="file"
            ref={fileInputRef}
            accept=".xlsx,.csv"
            style={{ display: 'none' }}
            onChange={(e) => e.target.files && setExcelFile(e.target.files[0])}
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              className="btn btn-secondary"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={16} />
              <span>{excelFile ? 'Ganti File Excel' : 'Pilih File Data Excel (.xlsx)'}</span>
            </button>
            {excelFile && (
              <span style={{ fontSize: '0.85rem', color: 'var(--accent-emerald)', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                <CheckCircle2 size={16} />
                <span>{excelFile.name} ({(excelFile.size / 1024).toFixed(1)} KB)</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Langkah 3 */}
      <div className="step-card">
        <div className="step-number">3</div>
        <div className="step-content">
          <h3 className="step-title">Format Penamaan File Dokumen Hasil</h3>
          <p className="step-desc">
            Tentukan pola nama file individual di dalam file ZIP menggunakan tag variabel.
          </p>
          <div style={{ maxWidth: '420px', marginBottom: '16px' }}>
            <input
              className="form-input"
              value={filenamePattern}
              onChange={(e) => setFilenamePattern(e.target.value)}
              placeholder="Contoh: Raport_{{ nama_panggilan }}.docx"
            />
          </div>

          <button
            className="btn btn-primary btn-lg"
            onClick={handleGenerateBatch}
            disabled={!excelFile || isProcessing}
          >
            {isProcessing ? <RefreshCw size={18} className="animate-spin" /> : <Archive size={18} />}
            <span>{isProcessing ? 'Memproses Streaming Dokumen...' : 'Generate Semua Dokumen (Download ZIP)'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
