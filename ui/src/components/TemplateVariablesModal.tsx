import React, { useState } from 'react';
import { X, Search, Tag, Copy, Check, Download, Sparkles, Hash, Calendar, Table2, AlignLeft, ShieldCheck } from 'lucide-react';
import type { WorkspaceTemplate } from '../types';

interface TemplateVariablesModalProps {
  template: WorkspaceTemplate;
  onClose: () => void;
  onOpenStudio?: () => void;
  onDownloadExcel?: () => void;
}

export const TemplateVariablesModal: React.FC<TemplateVariablesModalProps> = ({
  template,
  onClose,
  onOpenStudio,
  onDownloadExcel,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [copyAllStatus, setCopyAllStatus] = useState(false);

  const variables = template.schema?.variables || [];
  const filtered = variables.filter(
    (v) =>
      v.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.data_type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(`{{ ${key} }}`);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  const handleCopyAll = () => {
    const allKeys = variables.map((v) => `{{ ${v.key} }}`).join('\n');
    navigator.clipboard.writeText(allKeys);
    setCopyAllStatus(true);
    setTimeout(() => setCopyAllStatus(false), 2000);
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'number':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', background: '#FEF3C7', color: '#D97706', fontWeight: 600 }}>
            <Hash size={11} /> Angka
          </span>
        );
      case 'date':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', background: '#E0F2FE', color: '#0284C7', fontWeight: 600 }}>
            <Calendar size={11} /> Tanggal
          </span>
        );
      case 'signature':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', background: '#EDE9FE', color: '#7C3AED', fontWeight: 600 }}>
            <ShieldCheck size={11} /> Tanda Tangan
          </span>
        );
      case 'table':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', background: '#DCFCE7', color: '#16A34A', fontWeight: 600 }}>
            <Table2 size={11} /> Tabel/Daftar
          </span>
        );
      case 'text_multiline':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', background: '#F3E8FF', color: '#9333EA', fontWeight: 600 }}>
            <AlignLeft size={11} /> Paragraf
          </span>
        );
      default:
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', background: '#F1F5F9', color: '#475569', fontWeight: 600 }}>
            <Tag size={11} /> Teks
          </span>
        );
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1100 }}>
      <div
        className="modal-content"
        style={{
          maxWidth: '750px',
          width: '95%',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: '12px',
          padding: 0,
          overflow: 'hidden',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.08)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#F8FAFC',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '6px',
                  background: '#0284C7',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '11px',
                }}
              >
                DOCX
              </div>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>
                Variabel Terdaftar: {template.filename}
              </h3>
            </div>
            <p style={{ margin: '4px 0 0 36px', fontSize: '12px', color: '#64748B' }}>
              Daftar variabel dokumen yang otomatis tersimpan permanen dan menjadi acuan formulir & Excel.
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              padding: '6px',
              borderRadius: '6px',
              cursor: 'pointer',
              color: '#64748B',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Toolbar Pencarian & Aksi Cepat */}
        <div
          style={{
            padding: '12px 20px',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            background: '#FFFFFF',
          }}
        >
          <div style={{ position: 'relative', flex: 1, maxWidth: '340px' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
            <input
              type="text"
              placeholder="Cari nama variabel atau label..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 10px 6px 32px',
                fontSize: '12px',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={handleCopyAll}
              style={{
                height: '30px',
                padding: '0 10px',
                fontSize: '11.5px',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                background: '#FFFFFF',
                color: '#334155',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                fontWeight: 500,
              }}
            >
              {copyAllStatus ? <Check size={13} color="#16A34A" /> : <Copy size={13} />}
              <span>{copyAllStatus ? 'Tersalin!' : 'Salin Semua Tag'}</span>
            </button>

            {onDownloadExcel && (
              <button
                onClick={onDownloadExcel}
                style={{
                  height: '30px',
                  padding: '0 10px',
                  fontSize: '11.5px',
                  borderRadius: '6px',
                  border: '1px solid #86EFAC',
                  background: '#F0FDF4',
                  color: '#15803D',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  fontWeight: 600,
                }}
              >
                <Download size={13} />
                <span>Unduh Format Excel</span>
              </button>
            )}
          </div>
        </div>

        {/* Tabel Variabel */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px' }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94A3B8', fontSize: '13px' }}>
              Tidak ada variabel yang sesuai dengan pencarian "{searchQuery}"
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #E2E8F0', color: '#64748B', fontWeight: 600 }}>
                  <th style={{ padding: '12px 8px', width: '40px' }}>No</th>
                  <th style={{ padding: '12px 8px' }}>Kunci Tag Variabel</th>
                  <th style={{ padding: '12px 8px' }}>Nama Label</th>
                  <th style={{ padding: '12px 8px' }}>Tipe Data</th>
                  <th style={{ padding: '12px 8px', textAlign: 'right' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((v, idx) => (
                  <tr key={v.key} style={{ borderBottom: '1px solid #F1F5F9', transition: 'background 0.15s' }}>
                    <td style={{ padding: '10px 8px', color: '#94A3B8', fontWeight: 500 }}>{idx + 1}</td>
                    <td style={{ padding: '10px 8px' }}>
                      <code
                        style={{
                          background: '#EFF6FF',
                          color: '#1D4ED8',
                          padding: '3px 6px',
                          borderRadius: '4px',
                          fontWeight: 600,
                          fontSize: '12px',
                          fontFamily: 'monospace',
                        }}
                      >
                        {`{{ ${v.key} }}`}
                      </code>
                    </td>
                    <td style={{ padding: '10px 8px', color: '#1E293B', fontWeight: 500 }}>
                      {v.display_name || v.key}
                    </td>
                    <td style={{ padding: '10px 8px' }}>{getTypeBadge(v.data_type)}</td>
                    <td style={{ padding: '10px 8px', textAlign: 'right' }}>
                      <button
                        onClick={() => handleCopyKey(v.key)}
                        title="Salin tag ini ke clipboard"
                        style={{
                          background: copiedKey === v.key ? '#DCFCE7' : 'transparent',
                          border: '1px solid',
                          borderColor: copiedKey === v.key ? '#86EFAC' : '#E2E8F0',
                          color: copiedKey === v.key ? '#15803D' : '#64748B',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '11px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        {copiedKey === v.key ? (
                          <>
                            <Check size={11} /> Tersalin
                          </>
                        ) : (
                          <>
                            <Copy size={11} /> Salin
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '14px 20px',
            borderTop: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#F8FAFC',
          }}
        >
          <div style={{ fontSize: '12px', color: '#64748B' }}>
            Total <strong>{variables.length} variabel</strong> terkonfigurasi pada template ini.
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {onOpenStudio && (
              <button
                onClick={() => {
                  onClose();
                  onOpenStudio();
                }}
                style={{
                  height: '32px',
                  padding: '0 14px',
                  borderRadius: '6px',
                  border: '1px solid #38BDF8',
                  background: '#F0F9FF',
                  color: '#0284C7',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Sparkles size={13} color="#0284C7" />
                <span>Edit di Studio Word</span>
              </button>
            )}
            <button
              onClick={onClose}
              style={{
                height: '32px',
                padding: '0 16px',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                background: '#FFFFFF',
                color: '#334155',
                fontSize: '12px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
