import React from 'react';
import { X, CheckCircle2, Clock, Trash2, Eye, Sparkles, Plus, AlertCircle, FileText } from 'lucide-react';
import type { WorkspaceTemplate } from '../types';

interface TemplateManagerModalProps {
  templates: WorkspaceTemplate[];
  activeTemplateId?: string;
  workspaceName: string;
  onClose: () => void;
  onSelectActiveTemplate: (templateId: string) => void;
  onDeleteTemplate: (templateId: string) => void;
  onUploadNew: () => void;
  onOpenStudio?: () => void;
  onPreviewTemplate?: () => void;
}

export const TemplateManagerModal: React.FC<TemplateManagerModalProps> = ({
  templates,
  activeTemplateId,
  workspaceName,
  onClose,
  onSelectActiveTemplate,
  onDeleteTemplate,
  onUploadNew,
  onOpenStudio,
  onPreviewTemplate,
}) => {
  return (
    <div className="modal-overlay" style={{ zIndex: 1100 }}>
      <div
        className="modal-content"
        style={{
          maxWidth: '680px',
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
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>
              Pengelolaan & Riwayat Template Word
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748B' }}>
              Workspace: <strong>{workspaceName}</strong>. Template Anda tersimpan permanen di database lokal SQLite.
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
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Informasi Status Penyimpanan */}
        <div
          style={{
            padding: '10px 20px',
            background: '#F0FDF4',
            borderBottom: '1px solid #DCFCE7',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '12px',
            color: '#166534',
          }}
        >
          <CheckCircle2 size={15} color="#16A34A" />
          <span>
            <strong>Tersimpan Aman:</strong> Anda <em>tidak perlu</em> memasang ulang template setiap kali membuka aplikasi atau generate berkas. Template aktif saat ini akan selalu digunakan secara otomatis.
          </span>
        </div>

        {/* List of Templates */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {templates.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94A3B8' }}>
              <AlertCircle size={32} style={{ margin: '0 auto 8px', color: '#CBD5E1' }} />
              <p style={{ margin: 0, fontSize: '13px' }}>Belum ada template tersimpan di workspace ini.</p>
            </div>
          ) : (
            templates.map((tpl) => {
              const isActive = tpl.id === activeTemplateId || (!activeTemplateId && templates[0]?.id === tpl.id);
              const varCount = tpl.schema?.total_variables || tpl.schema?.variables?.length || 0;

              return (
                <div
                  key={tpl.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 16px',
                    borderRadius: '8px',
                    border: '1px solid',
                    borderColor: isActive ? '#38BDF8' : '#E2E8F0',
                    background: isActive ? '#F0F9FF' : '#FFFFFF',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '8px',
                        background: isActive ? '#0284C7' : '#F1F5F9',
                        color: isActive ? '#FFFFFF' : '#64748B',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <FileText size={18} />
                    </div>

                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 600, fontSize: '13px', color: '#1E293B' }}>
                          {tpl.filename}
                        </span>
                        {isActive ? (
                          <span
                            style={{
                              fontSize: '11px',
                              background: '#DCFCE7',
                              color: '#15803D',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: '12px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            ● Aktif
                          </span>
                        ) : (
                          <span
                            style={{
                              fontSize: '11px',
                              background: '#F1F5F9',
                              color: '#64748B',
                              padding: '2px 8px',
                              borderRadius: '12px',
                            }}
                          >
                            Tersimpan
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px', fontSize: '11.5px', color: '#64748B' }}>
                        <span style={{ color: '#0284C7', fontWeight: 500 }}>
                          🏷️ {varCount} variabel
                        </span>
                        <span>•</span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={11} /> {tpl.created_at || 'Baru'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    {!isActive && (
                      <button
                        onClick={() => onSelectActiveTemplate(tpl.id)}
                        style={{
                          height: '28px',
                          padding: '0 10px',
                          borderRadius: '6px',
                          border: '1px solid #CBD5E1',
                          background: '#FFFFFF',
                          color: '#0F172A',
                          fontSize: '11.5px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Jadikan Aktif
                      </button>
                    )}

                    {isActive && onPreviewTemplate && (
                      <button
                        onClick={onPreviewTemplate}
                        title="Pratinjau HTML Dokumen"
                        style={{
                          height: '28px',
                          padding: '0 10px',
                          borderRadius: '6px',
                          border: '1px solid #CBD5E1',
                          background: '#FFFFFF',
                          color: '#475569',
                          fontSize: '11.5px',
                          fontWeight: 500,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <Eye size={12} />
                        <span>Pratinjau</span>
                      </button>
                    )}

                    {templates.length > 1 && (
                      <button
                        onClick={() => onDeleteTemplate(tpl.id)}
                        title="Hapus versi template ini dari workspace"
                        style={{
                          height: '28px',
                          padding: '0 8px',
                          borderRadius: '6px',
                          border: '1px solid #FECACA',
                          background: '#FEF2F2',
                          color: '#EF4444',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Actions */}
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
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => {
                onClose();
                onUploadNew();
              }}
              style={{
                height: '32px',
                padding: '0 12px',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                background: '#FFFFFF',
                color: '#334155',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Plus size={13} />
              <span>Unggah Template Lain</span>
            </button>

            {onOpenStudio && (
              <button
                onClick={() => {
                  onClose();
                  onOpenStudio();
                }}
                style={{
                  height: '32px',
                  padding: '0 12px',
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
          </div>

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
  );
};
