import React from 'react';
import {
  FileText,
  Sparkles,
  Eye,
  Download,
  Settings2,
  CheckCircle2,
  Upload,
  AlertCircle,
  Layers,
  ChevronRight,
} from 'lucide-react';
import type { Workspace, WorkspaceTemplate } from '../types';

interface WorkspaceTemplateCardProps {
  workspace: Workspace;
  activeTemplate?: WorkspaceTemplate;
  onOpenVariables: () => void;
  onOpenManager: () => void;
  onOpenStudioDirect: () => void;
  onOpenStudioFilePicker: () => void;
  onUploadTemplatePicker: () => void;
  onPreviewTemplate: () => void;
  onDownloadExcelTemplate: () => void;
  isProcessingStudio?: boolean;
}

export const WorkspaceTemplateCard: React.FC<WorkspaceTemplateCardProps> = ({
  workspace,
  activeTemplate,
  onOpenVariables,
  onOpenManager,
  onOpenStudioDirect,
  onOpenStudioFilePicker,
  onUploadTemplatePicker,
  onPreviewTemplate,
  onDownloadExcelTemplate,
  isProcessingStudio = false,
}) => {
  // Jika workspace belum memiliki template aktif
  if (!activeTemplate) {
    return (
      <div
        style={{
          margin: '0 0 16px 0',
          padding: '16px 20px',
          background: 'linear-gradient(135deg, #F8FAFC 0%, #EFF6FF 100%)',
          border: '1.5px dashed #93C5FD',
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '8px',
              background: '#DBEAFE',
              color: '#2563EB',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <AlertCircle size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h4 style={{ margin: 0, fontSize: '13.5px', fontWeight: 700, color: '#1E293B' }}>
                Belum Ada Template Word Aktif di Workspace Ini
              </h4>
            </div>
            <p style={{ margin: '3px 0 0 0', fontSize: '11.5px', color: '#64748B' }}>
              Pasang dokumen Word Anda sekali, dan FastDoc akan menyimpannya <strong>secara permanen</strong> di database SQLite lokal Anda.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <button
            onClick={onOpenStudioFilePicker}
            style={{
              height: '32px',
              padding: '0 12px',
              borderRadius: '6px',
              border: '1px solid #38BDF8',
              background: '#0284C7',
              color: '#FFFFFF',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
            }}
          >
            <Sparkles size={13} color="#FFFFFF" />
            <span>Studio Template Word</span>
          </button>

          <button
            onClick={onUploadTemplatePicker}
            style={{
              height: '32px',
              padding: '0 12px',
              borderRadius: '6px',
              border: '1px solid #CBD5E1',
              background: '#FFFFFF',
              color: '#334155',
              fontSize: '12px',
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Upload size={13} />
            <span>Pasang Template Jadi (.docx)</span>
          </button>
        </div>
      </div>
    );
  }

  const varCount = activeTemplate.schema?.total_variables || activeTemplate.schema?.variables?.length || 0;
  const totalSaved = workspace.templates?.length || 1;

  return (
    <div
      style={{
        margin: '0 0 16px 0',
        padding: '12px 18px',
        background: '#FFFFFF',
        border: '1px solid #CBD5E1',
        borderLeft: '4px solid #0284C7',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
      }}
    >
      {/* Sisi Kiri: Info Template Aktif */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
        {/* Ikon DOCX Keren */}
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)',
            color: '#FFFFFF',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            boxShadow: '0 2px 4px rgba(2, 132, 199, 0.25)',
          }}
        >
          <FileText size={16} />
          <span style={{ fontSize: '9px', fontWeight: 800, letterSpacing: '0.5px', marginTop: '1px' }}>DOCX</span>
        </div>

        {/* Info Nama & Badge */}
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              Template Aktif:
            </span>
            <span
              style={{
                fontSize: '13.5px',
                fontWeight: 700,
                color: '#0F172A',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '320px',
              }}
              title={activeTemplate.filename}
            >
              {activeTemplate.filename}
            </span>

            {/* Badge Status Tersimpan Permanen */}
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '11px',
                background: '#DCFCE7',
                color: '#15803D',
                fontWeight: 600,
              }}
              title="Template ini tersimpan permanen di database lokal SQLite (~/.fastdoc/fastdoc.db) dan tetap ada saat aplikasi ditutup/dibuka kembali."
            >
              <CheckCircle2 size={11} color="#16A34A" />
              <span>Tersimpan Permanen</span>
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px', fontSize: '11.5px', color: '#64748B' }}>
            {/* Badge Klik untuk lihat variabel */}
            <button
              onClick={onOpenVariables}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '2px 8px',
                borderRadius: '6px',
                fontSize: '11px',
                background: '#EFF6FF',
                border: '1px solid #BFDBFE',
                color: '#1D4ED8',
                fontWeight: 600,
                cursor: 'pointer',
              }}
              title="Klik untuk melihat seluruh daftar variabel yang terdaftar di template ini"
            >
              <span>🏷️ {varCount} Variabel Terdaftar</span>
              <ChevronRight size={11} />
            </button>

            {/* Badge Riwayat Template Jika Lebih dari 1 */}
            {totalSaved > 1 && (
              <button
                onClick={onOpenManager}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  color: '#475569',
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
                title="Kelola atau ganti template aktif dari riwayat template"
              >
                <Layers size={11} />
                <span>{totalSaved} Versi Tersimpan</span>
              </button>
            )}

            <span style={{ color: '#94A3B8' }}>•</span>
            <span style={{ color: '#94A3B8' }}>{activeTemplate.created_at || 'Siap cetak'}</span>
          </div>
        </div>
      </div>

      {/* Sisi Kanan: Aksi Cepat Terkait Template Aktif */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
        {/* Tombol Pratinjau Dokumen Langsung */}
        <button
          onClick={onPreviewTemplate}
          style={{
            height: '30px',
            padding: '0 10px',
            borderRadius: '6px',
            border: '1px solid #CBD5E1',
            background: '#FFFFFF',
            color: '#334155',
            fontSize: '11.5px',
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
          }}
          title="Pratinjau lembar A4 dari template aktif ini"
        >
          <Eye size={13} color="#64748B" />
          <span>Pratinjau</span>
        </button>

        {/* Tombol Buka Langsung di Visual Studio */}
        <button
          onClick={onOpenStudioDirect}
          disabled={isProcessingStudio}
          style={{
            height: '30px',
            padding: '0 11px',
            borderRadius: '6px',
            border: '1px solid #38BDF8',
            background: '#F0F9FF',
            color: '#0284C7',
            fontSize: '11.5px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
          }}
          title="Buka template ini ke dalam Visual Studio untuk menambah atau mengubah pemetaan variabel"
        >
          <Sparkles size={13} color="#0284C7" />
          <span>{isProcessingStudio ? 'Membuka...' : 'Buka di Studio'}</span>
        </button>

        {/* Tombol Unduh Format Excel */}
        <button
          onClick={onDownloadExcelTemplate}
          style={{
            height: '30px',
            padding: '0 10px',
            borderRadius: '6px',
            border: '1px solid #86EFAC',
            background: '#F0FDF4',
            color: '#15803D',
            fontSize: '11.5px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
          }}
          title="Unduh format spreadsheet (.xlsx) kosong yang kolomnya otomatis cocok 100% dengan dokumen ini"
        >
          <Download size={13} color="#15803D" />
          <span>Format Excel</span>
        </button>

        {/* Tombol Kelola / Ganti Template */}
        <button
          onClick={onOpenManager}
          style={{
            height: '30px',
            padding: '0 8px',
            borderRadius: '6px',
            border: '1px solid #CBD5E1',
            background: '#FFFFFF',
            color: '#475569',
            fontSize: '11.5px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title="Kelola riwayat template atau unggah template pengganti"
        >
          <Settings2 size={13} />
        </button>
      </div>
    </div>
  );
};
