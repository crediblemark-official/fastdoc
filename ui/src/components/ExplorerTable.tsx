import type { WorkspaceRecord } from '../types';
import { FileText, Download, Edit3, Trash2, CheckCircle2, Clock } from 'lucide-react';

interface ExplorerTableProps {
  records: WorkspaceRecord[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  onOpenRecord: (record: WorkspaceRecord) => void;
  onDownloadSingle: (record: WorkspaceRecord) => void;
  onDeleteRecord: (id: string) => void;
}

export const ExplorerTable = ({
  records,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onOpenRecord,
  onDownloadSingle,
  onDeleteRecord,
}: ExplorerTableProps) => {
  if (records.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-dim)' }}>
        <p style={{ fontSize: '13px', marginBottom: '8px' }}>Tidak ada data dalam tabel ini</p>
        <p style={{ fontSize: '11px' }}>Impor file Excel atau buat data baru untuk memulai.</p>
      </div>
    );
  }

  const allSelected = records.length > 0 && selectedIds.size === records.length;

  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="explorer-table">
        <thead>
          <tr>
            <th style={{ width: '38px', textAlign: 'center' }}>
              <input
                type="checkbox"
                checked={allSelected}
                onChange={onToggleSelectAll}
                title="Pilih Semua"
              />
            </th>
            <th style={{ width: '40px' }}></th>
            <th>Nama Dokumen / Target</th>
            <th>ID / NISN</th>
            <th>Induk / Kode</th>
            <th>Status Data</th>
            <th>Terakhir Diubah</th>
            <th style={{ textAlign: 'right', width: '120px' }}>Tindakan</th>
          </tr>
        </thead>
        <tbody>
          {records.map((rec) => {
            const isSelected = selectedIds.has(rec.id);
            const nisn = rec.data.nisn || rec.data.nik || '-';
            const induk = rec.data.no_induk || rec.data.kode || rec.data.nomor || '-';
            const isComplete = rec.is_completed === 1;

            return (
              <tr
                key={rec.id}
                className={isSelected ? 'selected' : ''}
                onClick={(e) => {
                  if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).closest('button')) return;
                  onOpenRecord(rec);
                }}
                style={{ cursor: 'pointer' }}
              >
                <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggleSelect(rec.id)}
                  />
                </td>
                <td style={{ color: 'var(--text-dim)' }}>
                  <FileText size={16} color="var(--accent-blue)" />
                </td>
                <td style={{ fontWeight: 600 }}>
                  <span style={{ color: 'var(--text-main)' }}>{rec.display_name}</span>
                </td>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: '11.5px', color: 'var(--text-muted)' }}>
                  {nisn}
                </td>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: '11.5px', color: 'var(--text-muted)' }}>
                  {induk}
                </td>
                <td>
                  {isComplete ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: '#ECFDF5', color: '#059669', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>
                      <CheckCircle2 size={12} /> Lengkap
                    </span>
                  ) : (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: '#FFFBEB', color: '#D97706', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>
                      <Clock size={12} /> Draf
                    </span>
                  )}
                </td>
                <td style={{ color: 'var(--text-dim)', fontSize: '11.5px' }}>
                  {rec.updated_at ? new Date(rec.updated_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                </td>
                <td style={{ textAlign: 'right' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                    <button
                      className="table-action-btn"
                      title="Edit Formulir"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenRecord(rec);
                      }}
                    >
                      <Edit3 size={13} />
                    </button>
                    <button
                      className="table-action-btn"
                      title="Unduh Dokumen .docx"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDownloadSingle(rec);
                      }}
                    >
                      <Download size={13} color="var(--accent-blue)" />
                    </button>
                    <button
                      className="table-action-btn delete"
                      title="Hapus Data"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteRecord(rec.id);
                      }}
                    >
                      <Trash2 size={13} color="var(--accent-rose)" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
