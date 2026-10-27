import { useState, useRef } from 'react';
import { X, Upload, FileSpreadsheet, Download, CheckCircle2, AlertCircle } from 'lucide-react';

interface ExplorerImportModalProps {
  workspaceId: string;
  workspaceName: string;
  onClose: () => void;
  onImportSuccess: (msg: string) => void;
}

export const ExplorerImportModal = ({
  workspaceId,
  workspaceName,
  onClose,
  onImportSuccess,
}: ExplorerImportModalProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDownloadTemplate = () => {
    window.open(`/api/workspaces/${workspaceId}/excel-template`, '_blank');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Silakan pilih berkas Excel (.xlsx) terlebih dahulu.');
      return;
    }

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('data_file', file);

    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/import-excel`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Gagal mengimpor berkas Excel');
      }

      onImportSuccess(data.message || 'Data Excel berhasil diimpor!');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan sistem');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{
        width: '540px',
        maxWidth: '95vw',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Header Modal ala Native Dialog */}
        <div style={{
          backgroundColor: '#F8FAFC',
          borderBottom: '1px solid var(--border-app)',
          padding: '14px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)', fontWeight: 600, fontSize: '13.5px' }}>
            <FileSpreadsheet size={17} color="var(--accent-emerald)" />
            <span>Impor Data Spreadsheet — {workspaceName}</span>
          </div>
          <button onClick={onClose} className="icon-btn">
            <X size={15} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} style={{ padding: '20px', backgroundColor: '#FFFFFF' }}>
          {error && (
            <div style={{
              backgroundColor: '#FEF2F2',
              border: '1px solid #FECACA',
              color: '#DC2626',
              padding: '10px 14px',
              borderRadius: '6px',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '16px',
            }}>
              <AlertCircle size={15} />
              <span>{error}</span>
            </div>
          )}

          {/* Unduh Format Template */}
          <div style={{
            backgroundColor: '#F8FAFC',
            border: '1px solid var(--border-app)',
            borderRadius: '6px',
            padding: '12px 14px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <div>
              <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-main)' }}>
                Belum punya format Excel?
              </div>
              <div style={{ fontSize: '11.5px', color: 'var(--text-dim)', marginTop: '2px' }}>
                Unduh format tabel yang kolomnya otomatis cocok 100% dengan dokumen ini.
              </div>
            </div>
            <button
              type="button"
              className="btn-tool"
              onClick={handleDownloadTemplate}
            >
              <Download size={13} color="var(--accent-emerald)" />
              <span>Unduh Format</span>
            </button>
          </div>

          {/* Area Pilih Berkas */}
          <div
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: '1.5px dashed var(--border-subtle)',
              borderRadius: '8px',
              padding: '32px 20px',
              textAlign: 'center',
              cursor: 'pointer',
              backgroundColor: file ? '#F0FDF4' : '#F8FAFC',
              borderColor: file ? 'var(--accent-emerald)' : 'var(--border-subtle)',
              transition: 'all 0.15s ease',
            }}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".xlsx,.xls,.csv"
              style={{ display: 'none' }}
            />
            {file ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                <CheckCircle2 size={32} color="var(--accent-emerald)" />
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>{file.name}</span>
                <span style={{ fontSize: '11.5px', color: 'var(--text-dim)' }}>
                  {(file.size / 1024).toFixed(1)} KB — Klik untuk mengganti berkas
                </span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <Upload size={32} color="var(--text-dim)" />
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>
                  Pilih Berkas Excel (.xlsx)
                </span>
                <span style={{ fontSize: '11.5px', color: 'var(--text-dim)' }}>
                  atau seret berkas langsung ke dalam kotak ini
                </span>
              </div>
            )}
          </div>

          {/* Info Smart Deduplication */}
          <div style={{ marginTop: '14px', fontSize: '11.5px', color: 'var(--text-dim)', lineHeight: '1.4' }}>
            <strong style={{ color: 'var(--accent-blue)' }}>Smart Data Lake:</strong> Jika terdapat siswa atau data yang sudah pernah diimpor sebelumnya, sistem otomatis melakukan deduplikasi & sinkronisasi data master tanpa membuat data ganda.
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '22px' }}>
            <button
              type="button"
              className="btn-tool"
              onClick={onClose}
              disabled={loading}
            >
              Batal
            </button>
            <button
              type="submit"
              className="btn-tool primary"
              disabled={loading || !file}
            >
              {loading ? 'Mengimpor...' : 'Impor ke Workspace'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
