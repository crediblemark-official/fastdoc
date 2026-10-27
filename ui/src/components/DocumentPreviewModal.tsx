import React, { useRef } from 'react';
import { X, Printer, Download, Eye, Loader2 } from 'lucide-react';

interface DocumentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  htmlContent: string;
  templateName?: string;
  isLoading?: boolean;
  onDownloadDocx?: () => void;
  onDownloadPdf?: () => void;
}

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
  isOpen,
  onClose,
  htmlContent,
  templateName = 'Dokumen',
  isLoading = false,
  onDownloadDocx,
  onDownloadPdf,
}) => {
  const printFrameRef = useRef<HTMLIFrameElement>(null);

  if (!isOpen) return null;

  const handlePrint = () => {
    if (!printFrameRef.current) return;
    const frameDoc = printFrameRef.current.contentWindow;
    if (frameDoc) {
      frameDoc.focus();
      frameDoc.print();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 9999 }}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '920px',
          maxWidth: '96vw',
          height: '92vh',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          background: '#F1F5F9',
          borderRadius: '8px',
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        }}
      >
        {/* Header Bar */}
        <div
          style={{
            background: '#FFFFFF',
            borderBottom: '1px solid var(--border-app)',
            padding: '12px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '6px',
                background: '#EFF6FF',
                color: 'var(--accent-blue)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Eye size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '13.5px', fontWeight: 600, margin: 0, color: 'var(--text-main)' }}>
                Pratinjau Dokumen (Live Sheet Preview)
              </h3>
              <p style={{ fontSize: '11px', color: 'var(--text-dim)', margin: 0 }}>
                {templateName}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              className="btn-tool"
              onClick={handlePrint}
              disabled={isLoading || !htmlContent}
              title="Cetak langsung ke printer lokal"
            >
              <Printer size={13} />
              <span>Cetak Printer</span>
            </button>

            {onDownloadPdf && (
              <button
                type="button"
                className="btn-tool"
                onClick={onDownloadPdf}
                disabled={isLoading}
                title="Download dalam format PDF"
              >
                <Download size={13} color="var(--accent-rose)" />
                <span>Unduh PDF</span>
              </button>
            )}

            {onDownloadDocx && (
              <button
                type="button"
                className="btn-tool primary"
                onClick={onDownloadDocx}
                disabled={isLoading}
                title="Download dalam format Word .docx"
              >
                <Download size={13} />
                <span>Unduh Word (.docx)</span>
              </button>
            )}

            <button onClick={onClose} className="icon-btn" style={{ marginLeft: '6px' }}>
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Preview Scroll Canvas */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px 16px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-start',
            background: '#E2E8F0',
          }}
        >
          {isLoading ? (
            <div style={{ textAlign: 'center', margin: 'auto', padding: '40px' }}>
              <Loader2 size={28} className="animate-spin" color="var(--accent-blue)" style={{ margin: '0 auto 12px' }} />
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Merender pratinjau lembar dokumen...</p>
            </div>
          ) : htmlContent ? (
            <iframe
              ref={printFrameRef}
              srcDoc={`<!DOCTYPE html><html><head><meta charset="utf-8"/><style>body{margin:0;padding:20px;background:#E2E8F0;display:flex;justify-content:center;}</style></head><body>${htmlContent}</body></html>`}
              style={{
                width: '100%',
                maxWidth: '850px',
                height: '100%',
                minHeight: '800px',
                border: 'none',
                background: 'transparent',
              }}
              title="Document Preview Frame"
            />
          ) : (
            <div style={{ textAlign: 'center', margin: 'auto', color: 'var(--text-dim)' }}>
              <p>Tidak ada konten pratinjau yang tersedia.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
