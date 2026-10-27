import { useState } from 'react';
import { PenTool, CheckCircle2, Trash2, ShieldCheck } from 'lucide-react';
import { SignaturePadModal } from './SignaturePadModal';

interface SignatureFieldWidgetProps {
  fieldKey: string;
  fieldLabel: string;
  value?: string;
  onChange: (dataUrl: string) => void;
  readOnly?: boolean;
}

export const SignatureFieldWidget = ({
  fieldKey,
  fieldLabel,
  value,
  onChange,
  readOnly = false,
}: SignatureFieldWidgetProps) => {
  const [modalOpen, setModalOpen] = useState(false);

  const hasSignature = Boolean(value && value.trim() && value.startsWith('data:image/'));

  const handleConfirmSignature = (dataUrl: string) => {
    onChange(dataUrl);
  };

  const handleClearSignature = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Hapus tanda tangan dari kolom ini?')) {
      onChange('');
    }
  };

  return (
    <div style={{ width: '100%', boxSizing: 'border-box' }}>
      {hasSignature ? (
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid var(--border-app)',
            borderRadius: '8px',
            padding: '12px 14px',
            position: 'relative',
            boxShadow: 'var(--shadow-sm)',
            transition: 'border-color 0.15s ease',
          }}
        >
          {/* Header Row: Status badge and Action buttons */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--accent-emerald)', background: '#ECFDF5', border: '1px solid #A7F3D0', padding: '2px 8px', borderRadius: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <CheckCircle2 size={12} />
                Telah Ditandatangani
              </span>
              <span style={{ fontSize: '10.5px', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                <ShieldCheck size={11} color="var(--accent-blue)" /> Digital InlineImage
              </span>
            </div>

            {!readOnly && (
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  className="btn-tool"
                  onClick={() => setModalOpen(true)}
                  style={{ height: '24px', padding: '0 8px', fontSize: '11px' }}
                  title="Ganti tanda tangan"
                >
                  <PenTool size={11} />
                  <span>Ubah</span>
                </button>
                <button
                  type="button"
                  className="btn-tool"
                  onClick={handleClearSignature}
                  style={{ height: '24px', padding: '0 6px', fontSize: '11px', color: '#EF4444' }}
                  title="Hapus tanda tangan"
                >
                  <Trash2 size={11} />
                </button>
              </div>
            )}
          </div>

          {/* Signature Image Preview Box */}
          <div
            onClick={() => !readOnly && setModalOpen(true)}
            style={{
              height: '84px',
              width: '100%',
              background: '#F8FAFC',
              borderRadius: '6px',
              border: '1px dashed #CBD5E1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '6px 12px',
              cursor: readOnly ? 'default' : 'pointer',
              boxSizing: 'border-box',
            }}
            title={readOnly ? '' : 'Klik untuk mengubah tanda tangan'}
          >
            <img
              src={value}
              alt={fieldLabel}
              style={{
                maxHeight: '74px',
                maxWidth: '100%',
                objectFit: 'contain',
                filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.06))',
              }}
            />
          </div>
        </div>
      ) : (
        <div
          onClick={() => !readOnly && setModalOpen(true)}
          style={{
            background: '#FFFFFF',
            border: '2px dashed var(--border-app)',
            borderRadius: '8px',
            padding: '16px',
            textAlign: 'center',
            cursor: readOnly ? 'default' : 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            if (!readOnly) {
              e.currentTarget.style.borderColor = 'var(--accent-blue)';
              e.currentTarget.style.background = '#F8FAFC';
            }
          }}
          onMouseLeave={(e) => {
            if (!readOnly) {
              e.currentTarget.style.borderColor = 'var(--border-app)';
              e.currentTarget.style.background = '#FFFFFF';
            }
          }}
        >
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: '#EFF6FF',
              color: 'var(--accent-blue)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '6px',
            }}
          >
            <PenTool size={16} />
          </div>
          <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '2px' }}>
            Bubuhkan Tanda Tangan
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
            Klik untuk gores langsung, unggah berkas, atau pilih dari arsip tersimpan
          </div>
        </div>
      )}

      {/* Signature Modal */}
      <SignaturePadModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={handleConfirmSignature}
        fieldKey={fieldKey}
        fieldLabel={fieldLabel}
      />
    </div>
  );
};
