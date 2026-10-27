import { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, 
  Save, 
  Download, 
  Sparkles, 
  AtSign, 
  UserCheck, 
  Layers,
  Search,
  CheckCircle2,
  Eye,
  Plus,
  Trash2
} from 'lucide-react';
import type { Workspace, WorkspaceRecord, MasterEntity, VariableMeta } from '../types';
import { SignatureFieldWidget } from './SignatureFieldWidget';

interface ExplorerFormViewProps {
  workspace: Workspace;
  record?: WorkspaceRecord | null;
  onSave: (data: Record<string, any>) => Promise<void>;
  onBack: () => void;
  onOpenAICopilot: (fieldKey: string, fieldLabel: string, currentVal: string) => void;
  onDownloadDocx: (recordId?: string, formData?: Record<string, any>) => void;
  onDownloadPdf: (recordId?: string, formData?: Record<string, any>) => void;
  onPreview: (formData: Record<string, any>) => void;
}

export const ExplorerFormView = ({
  workspace,
  record,
  onSave,
  onBack,
  onOpenAICopilot,
  onDownloadDocx,
  onDownloadPdf,
  onPreview,
}: ExplorerFormViewProps) => {
  const activeTemplate = workspace.templates?.[0];
  const templateVariables = activeTemplate?.schema?.variables || [];

  const [formData, setFormData] = useState<Record<string, any>>(() => {
    if (record?.data) return { ...record.data };
    return {};
  });

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Mention @ Data Master state
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [masterEntities, setMasterEntities] = useState<MasterEntity[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch Master Entities for @ auto-complete
  useEffect(() => {
    fetch('/api/entities')
      .then((res) => res.json())
      .then((res) => {
        if (res.status === 'success') {
          setMasterEntities(res.data);
        }
      })
      .catch((err) => console.error('Gagal mengambil data master:', err));
  }, []);

  // Close mention dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowMentionDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleFieldChange = (key: string, value: any) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  // Sub-table loop row handlers
  const handleAddTableRow = (tableKey: string, defaultRow: Record<string, any>) => {
    setFormData((prev) => {
      const currentRows = Array.isArray(prev[tableKey]) ? prev[tableKey] : [];
      return {
        ...prev,
        [tableKey]: [...currentRows, { ...defaultRow, no: currentRows.length + 1 }],
      };
    });
  };

  const handleRemoveTableRow = (tableKey: string, rowIndex: number) => {
    setFormData((prev) => {
      const currentRows = Array.isArray(prev[tableKey]) ? prev[tableKey] : [];
      return {
        ...prev,
        [tableKey]: currentRows.filter((_, idx) => idx !== rowIndex),
      };
    });
  };

  const handleTableCellChange = (tableKey: string, rowIndex: number, field: string, value: any) => {
    setFormData((prev) => {
      const currentRows = Array.isArray(prev[tableKey]) ? [...prev[tableKey]] : [];
      if (!currentRows[rowIndex]) currentRows[rowIndex] = {};
      currentRows[rowIndex] = { ...currentRows[rowIndex], [field]: value };
      return {
        ...prev,
        [tableKey]: currentRows,
      };
    });
  };

  // Mention @ auto-populate
  const handleSelectMasterEntity = (entity: MasterEntity) => {
    const merged = { ...formData, ...entity.attributes };
    // Prioritize display name
    if (!merged.nama_lengkap && !merged.nama) {
      merged.nama_lengkap = entity.display_name;
    }
    setFormData(merged);
    setShowMentionDropdown(false);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(formData);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } finally {
      setSaving(false);
    }
  };

  // Filter master entities by query
  const filteredEntities = masterEntities.filter((e) =>
    e.display_name.toLowerCase().includes(mentionQuery.toLowerCase()) ||
    (e.primary_identifier && e.primary_identifier.includes(mentionQuery))
  );

  // Group variables if there are many, or list them cleanly
  // If no template variables detected, infer from formData keys or provide default standard fields
  const displayVariables: VariableMeta[] = templateVariables.length > 0 
    ? templateVariables 
    : Object.keys(formData).map((k) => ({
        key: k,
        display_name: k.replace(/_/g, ' ').toUpperCase(),
        data_type: 'string' as const,
        is_loop: false,
        is_ai_candidate: k.includes('catatan') || k.includes('deskripsi') || k.includes('narasi'),
        filters_used: [],
        raw_tag: `{{ ${k} }}`,
        sub_fields: [],
      }));

  return (
    <div style={{ width: '100%', boxSizing: 'border-box' }}>
      {/* Top Action Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <button className="btn-tool" onClick={onBack}>
          <ArrowLeft size={13} />
          <span>Kembali ke Berkas</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Tombol Panggil Profil Master (@ Mention) */}
          <div style={{ position: 'relative' }} ref={dropdownRef}>
            <button
              type="button"
              className="btn-tool"
              style={{ background: '#EFF6FF', borderColor: '#BFDBFE', color: 'var(--accent-blue)', fontWeight: 600 }}
              onClick={() => setShowMentionDropdown(!showMentionDropdown)}
              title="Panggil data siswa dari Master Database untuk mengisi form otomatis"
            >
              <AtSign size={13} />
              <span>Panggil Data Master (@)</span>
            </button>

            {showMentionDropdown && (
              <div className="mention-dropdown" style={{ width: '320px' }}>
                <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-app)', display: 'flex', alignItems: 'center', gap: '6px', background: '#F8FAFC' }}>
                  <Search size={12} color="var(--text-dim)" />
                  <input
                    type="text"
                    placeholder="Ketik nama atau NISN..."
                    value={mentionQuery}
                    onChange={(e) => setMentionQuery(e.target.value)}
                    autoFocus
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', fontSize: '12px', outline: 'none', width: '100%' }}
                  />
                </div>
                <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  {filteredEntities.length === 0 ? (
                    <div style={{ padding: '14px', fontSize: '11.5px', color: 'var(--text-dim)', textAlign: 'center' }}>
                      Tidak ada data master ditemukan
                    </div>
                  ) : (
                    filteredEntities.map((ent) => (
                      <div
                        key={ent.id}
                        className="mention-option"
                        onClick={() => handleSelectMasterEntity(ent)}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <UserCheck size={14} color="var(--accent-blue)" />
                          <span style={{ fontWeight: 600, fontSize: '12.5px', color: 'var(--text-main)' }}>{ent.display_name}</span>
                        </div>
                        <span style={{ fontSize: '11px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                          {ent.primary_identifier || 'Auto'}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Pratinjau Dokumen Instan (Live Sheet Preview) */}
          <button
            type="button"
            className="btn-tool"
            onClick={() => onPreview(formData)}
            title="Lihat pratinjau lembar cetak dokumen instan"
          >
            <Eye size={13} color="var(--accent-blue)" />
            <span>Pratinjau</span>
          </button>

          {/* Cetak PDF Langsung */}
          <button
            type="button"
            className="btn-tool"
            onClick={() => onDownloadPdf(record?.id, formData)}
            title="Download dokumen langsung dalam format PDF siap cetak"
          >
            <Download size={13} color="var(--accent-rose)" />
            <span>Cetak (.pdf)</span>
          </button>

          {/* Cetak Dokumen Word (.docx) */}
          <button
            type="button"
            className="btn-tool"
            onClick={() => onDownloadDocx(record?.id, formData)}
            title="Download dokumen .docx dengan format baku Word terjaga 100%"
          >
            <Download size={13} color="var(--accent-blue)" />
            <span>Cetak (.docx)</span>
          </button>

          {/* Simpan Perubahan */}
          <button
            type="button"
            className="btn-tool primary"
            onClick={handleFormSubmit}
            disabled={saving}
          >
            {saveSuccess ? (
              <>
                <CheckCircle2 size={13} color="#fff" />
                <span>Tersimpan!</span>
              </>
            ) : (
              <>
                <Save size={13} />
                <span>{saving ? 'Menyimpan...' : 'Simpan ke Workspace'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Form Content Card */}
      <div style={{ background: '#FFFFFF', border: '1px solid var(--border-app)', borderRadius: '8px', padding: '22px', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ marginBottom: '18px', borderBottom: '1px solid var(--border-app)', paddingBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Layers size={16} color="var(--accent-blue)" />
              {record ? `Edit Data: ${record.display_name}` : 'Input Data Formulir Baru'}
            </h2>
            <p style={{ fontSize: '11.5px', color: 'var(--text-dim)', marginTop: '2px' }}>
              Template aktif: {activeTemplate?.filename || 'Tidak ada template terpasang'}
            </p>
          </div>
        </div>

        {displayVariables.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-dim)' }}>
            <p style={{ fontSize: '12px', marginBottom: '6px' }}>Belum ada variabel atau template di workspace ini.</p>
            <p style={{ fontSize: '11px' }}>Unggah file Word (.docx) pada workspace untuk membuat formulir otomatis.</p>
          </div>
        ) : (
          <form onSubmit={handleFormSubmit} className="inspector-form-grid">
            {displayVariables.map((v) => {
              const val = formData[v.key] ?? '';
              // Jika ini variabel tabel berulang (Looping Sub-Table)
              if (v.is_loop || v.data_type === 'table') {
                const subCols: string[] = (v.sub_fields && v.sub_fields.length > 0) ? v.sub_fields : ['nama_kegiatan', 'predikat', 'keterangan'];
                const tableRows = Array.isArray(formData[v.key]) ? formData[v.key] : [];

                return (
                  <div
                    key={v.key}
                    style={{
                      gridColumn: 'span 2',
                      background: '#F8FAFC',
                      border: '1px solid var(--border-app)',
                      borderRadius: '8px',
                      padding: '16px',
                      marginTop: '6px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <div>
                        <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-main)' }}>{v.display_name}</span>
                        <span style={{ fontSize: '11px', color: 'var(--text-dim)', marginLeft: '8px' }}>(Tabel Dinamis Berulang)</span>
                      </div>
                      <button
                        type="button"
                        className="btn-tool"
                        onClick={() => {
                          const initialObj: Record<string, any> = {};
                          subCols.forEach((c: string) => { initialObj[c] = ''; });
                          handleAddTableRow(v.key, initialObj);
                        }}
                        style={{ fontSize: '11.5px', height: '28px', background: '#EFF6FF', borderColor: '#BFDBFE', color: 'var(--accent-blue)' }}
                      >
                        <Plus size={12} />
                        <span>+ Tambah Baris</span>
                      </button>
                    </div>

                    {tableRows.length === 0 ? (
                      <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '12px', background: '#FFFFFF', borderRadius: '6px', border: '1px dashed var(--border-app)' }}>
                        Belum ada baris data. Klik <strong>"+ Tambah Baris"</strong> untuk mengisi rincian tabel dokumen.
                      </div>
                    ) : (
                      <div style={{ overflowX: 'auto', background: '#FFFFFF', borderRadius: '6px', border: '1px solid var(--border-app)' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                          <thead>
                            <tr style={{ background: '#F1F5F9', borderBottom: '1px solid var(--border-app)' }}>
                              <th style={{ width: '40px', padding: '8px', textAlign: 'center', color: 'var(--text-muted)' }}>#</th>
                              {subCols.map((col: string) => (
                                <th key={col} style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)' }}>
                                  {col.replace(/_/g, ' ').toUpperCase()}
                                </th>
                              ))}
                              <th style={{ width: '45px', padding: '8px', textAlign: 'center' }}></th>
                            </tr>
                          </thead>
                          <tbody>
                            {tableRows.map((rowItem: any, rIdx: number) => (
                              <tr key={rIdx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                                <td style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '6px' }}>{rIdx + 1}</td>
                                {subCols.map((col: string) => (
                                  <td key={col} style={{ padding: '6px 8px' }}>
                                    <input
                                      type="text"
                                      className="exp-input"
                                      style={{ height: '30px', padding: '4px 8px', fontSize: '12px' }}
                                      value={rowItem[col] || ''}
                                      onChange={(e) => handleTableCellChange(v.key, rIdx, col, e.target.value)}
                                      placeholder={`Isi ${col}...`}
                                    />
                                  </td>
                                ))}
                                <td style={{ textAlign: 'center', padding: '6px' }}>
                                  <button
                                    type="button"
                                    className="icon-btn"
                                    onClick={() => handleRemoveTableRow(v.key, rIdx)}
                                    style={{ color: '#EF4444' }}
                                    title="Hapus baris ini"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              }

              const isSignature = v.data_type === 'signature' ||
                v.key.startsWith('ttd') ||
                v.key.includes('tanda_tangan') ||
                v.key.includes('tandatangan') ||
                v.key.includes('signature') ||
                v.key.includes('paraf');

              const isMultiline = !isSignature && (v.data_type === 'text_multiline' || v.key.includes('catatan') || v.key.includes('deskripsi') || v.key.includes('narasi') || v.key.includes('keterangan'));

              return (
                <div
                  key={v.key}
                  style={{
                    gridColumn: isMultiline ? 'span 2' : 'span 1',
                  }}
                >
                  <label className="exp-label">
                    <span>{v.display_name}</span>
                    {v.is_ai_candidate && (
                      <button
                        type="button"
                        onClick={() => onOpenAICopilot(v.key, v.display_name, val)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#A78BFA',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          fontSize: '10.5px',
                          fontWeight: 500,
                        }}
                        title="Bantu susun narasi capaian dengan AI Pedagogis"
                      >
                        <Sparkles size={11} /> AI Copilot
                      </button>
                    )}
                  </label>

                  {isSignature ? (
                    <SignatureFieldWidget
                      fieldKey={v.key}
                      fieldLabel={v.display_name}
                      value={val}
                      onChange={(dataUrl) => handleFieldChange(v.key, dataUrl)}
                    />
                  ) : isMultiline ? (
                    <textarea
                      className="exp-textarea"
                      value={val}
                      onChange={(e) => handleFieldChange(v.key, e.target.value)}
                      placeholder={`Isi ${v.display_name.toLowerCase()}...`}
                    />
                  ) : (
                    <input
                      type={v.data_type === 'number' ? 'number' : 'text'}
                      className="exp-input"
                      value={val}
                      onChange={(e) => handleFieldChange(v.key, e.target.value)}
                      placeholder={`Isi ${v.display_name.toLowerCase()}...`}
                    />
                  )}
                </div>
              );
            })}
          </form>
        )}
      </div>
    </div>
  );
};
