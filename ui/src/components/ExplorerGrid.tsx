import type { WorkspaceRecord } from '../types';

interface ExplorerGridProps {
  records: WorkspaceRecord[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onOpenRecord: (record: WorkspaceRecord) => void;
}

export const ExplorerGrid = ({
  records,
  selectedIds,
  onToggleSelect,
  onOpenRecord,
}: ExplorerGridProps) => {
  if (records.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-dim)' }}>
        <p style={{ fontSize: '13px', marginBottom: '8px' }}>Folder ini kosong</p>
        <p style={{ fontSize: '11px' }}>Impor file Excel atau klik "+ Data Baru" di toolbar atas untuk menambahkan data.</p>
      </div>
    );
  }

  return (
    <div className="explorer-grid-container">
      {records.map((rec) => {
        const isSelected = selectedIds.has(rec.id);
        const name = rec.display_name;
        const nisn = rec.data.nisn || rec.data.nik || rec.data.no_induk || '';

        return (
          <div
            key={rec.id}
            className={`explorer-item-card ${isSelected ? 'selected' : ''}`}
            onClick={(e) => {
              // Jika klik pada checkbox, toggle saja
              if ((e.target as HTMLElement).tagName === 'INPUT') return;
              onOpenRecord(rec);
            }}
          >
            {/* Checkbox seleksi mirip OS file manager saat hover/select */}
            <input
              type="checkbox"
              className="item-select-checkbox"
              checked={isSelected}
              onChange={() => onToggleSelect(rec.id)}
            />

            {/* Thumbnail Dokumen Kertas Putih (Sesuai dengan screenshot user) */}
            <div className="item-thumbnail">
              <div className="doc-sheet-preview">
                <div className="doc-sheet-header"></div>
                <div className="doc-sheet-lines">
                  <div className="doc-sheet-line"></div>
                  <div className="doc-sheet-line"></div>
                  <div className="doc-sheet-line" style={{ width: '70%' }}></div>
                  <div className="doc-sheet-line"></div>
                  <div className="doc-sheet-line" style={{ width: '50%' }}></div>
                </div>
              </div>
            </div>

            {/* Label Nama & NISN di Bawah Ikon */}
            <span className="item-label" title={name}>
              {name}
            </span>
            {nisn && <span className="item-subtext">{nisn}</span>}
          </div>
        );
      })}
    </div>
  );
};
