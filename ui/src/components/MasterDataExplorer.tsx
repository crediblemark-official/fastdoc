import { useState, useEffect } from 'react';
import { Database, UserCheck, Eye, X } from 'lucide-react';
import type { MasterEntity } from '../types';

interface MasterDataExplorerProps {
  onRefreshTrigger?: number;
  searchQuery?: string;
}

export const MasterDataExplorer = ({ onRefreshTrigger, searchQuery = '' }: MasterDataExplorerProps) => {
  const [entities, setEntities] = useState<MasterEntity[]>([]);
  const [selectedEntity, setSelectedEntity] = useState<MasterEntity | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchEntities = () => {
    setLoading(true);
    fetch(`/api/entities?q=${encodeURIComponent(searchQuery)}`)
      .then((res) => res.json())
      .then((res) => {
        if (res.status === 'success') {
          setEntities(res.data);
        }
      })
      .catch((err) => console.error('Gagal mengambil data master:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchEntities();
  }, [searchQuery, onRefreshTrigger]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '14px' }}>
      {/* Header Info Banner */}
      <div style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid var(--border-app)',
        borderRadius: '8px',
        padding: '14px 18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: 'var(--shadow-sm)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '8px',
            backgroundColor: '#EFF6FF',
            color: 'var(--accent-blue)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Database size={20} />
          </div>
          <div>
            <h2 style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-main)' }}>
              Master Registry Data Lake
            </h2>
            <p style={{ fontSize: '11.5px', color: 'var(--text-dim)', marginTop: '2px' }}>
              Pangkalan data terpusat cross-workspace (tersimpan permanen di SQLite). Dapat dipanggil dengan simbol <strong style={{ color: 'var(--accent-blue)' }}>@</strong> di formulir dokumen manapun.
            </p>
          </div>
        </div>

        <span style={{
          fontSize: '11.5px',
          fontWeight: 600,
          color: 'var(--accent-blue)',
          backgroundColor: '#EFF6FF',
          padding: '4px 10px',
          borderRadius: '12px',
        }}>
          {entities.length} Profil Terdaftar
        </span>
      </div>

      {/* Table Container */}
      <div style={{
        flex: 1,
        backgroundColor: '#FFFFFF',
        border: '1px solid var(--border-app)',
        borderRadius: '8px',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-sm)',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-dim)', fontSize: '12px' }}>
            Memuat data master...
          </div>
        ) : entities.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-dim)' }}>
            <p style={{ fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: 'var(--text-main)' }}>Belum ada data master</p>
            <p style={{ fontSize: '11.5px' }}>Impor file Excel atau input data di workspace manapun untuk mendaftarkan data master secara otomatis.</p>
          </div>
        ) : (
          <div style={{ overflowY: 'auto', flex: 1 }}>
            <table className="explorer-table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}></th>
                  <th>Nama Profil / Entitas</th>
                  <th>Tipe Entitas</th>
                  <th>ID Pokok (NISN / NIK)</th>
                  <th>Total Atribut</th>
                  <th>Terdaftar</th>
                  <th style={{ textAlign: 'right', width: '100px' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {entities.map((ent) => (
                  <tr key={ent.id} onClick={() => setSelectedEntity(ent)} style={{ cursor: 'pointer' }}>
                    <td style={{ textAlign: 'center', color: 'var(--accent-blue)' }}>
                      <UserCheck size={15} />
                    </td>
                    <td style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                      {ent.display_name}
                    </td>
                    <td>
                      <span style={{
                        fontSize: '10.5px',
                        textTransform: 'uppercase',
                        backgroundColor: '#F1F5F9',
                        padding: '3px 8px',
                        borderRadius: '4px',
                        color: 'var(--text-muted)',
                        fontWeight: 600,
                        letterSpacing: '0.03em',
                      }}>
                        {ent.entity_type}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '11.5px', color: 'var(--text-muted)' }}>
                      {ent.primary_identifier || '-'}
                    </td>
                    <td style={{ color: 'var(--text-dim)', fontSize: '11.5px' }}>
                      {Object.keys(ent.attributes || {}).length} variabel
                    </td>
                    <td style={{ color: 'var(--text-dim)', fontSize: '11.5px' }}>
                      {ent.created_at ? new Date(ent.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="btn-tool"
                        style={{ height: '26px', padding: '0 10px', fontSize: '11px', marginLeft: 'auto' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEntity(ent);
                        }}
                      >
                        <Eye size={12} />
                        <span>Rincian</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Inspector Detail Atribut */}
      {selectedEntity && (
        <div className="modal-overlay" onClick={() => setSelectedEntity(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{
            width: '640px',
            maxWidth: '95vw',
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
          }}>
            <div style={{
              backgroundColor: '#F8FAFC',
              borderBottom: '1px solid var(--border-app)',
              padding: '14px 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <UserCheck size={16} color="var(--accent-blue)" />
                <span style={{ fontWeight: 600, fontSize: '13.5px', color: 'var(--text-main)' }}>
                  Atribut Master: {selectedEntity.display_name}
                </span>
              </div>
              <button
                className="icon-btn"
                onClick={() => setSelectedEntity(null)}
              >
                <X size={15} />
              </button>
            </div>

            <div style={{ padding: '18px', overflowY: 'auto', flex: 1, backgroundColor: '#FFFFFF' }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '10px',
              }}>
                {Object.entries(selectedEntity.attributes || {}).map(([k, v]) => (
                  <div
                    key={k}
                    style={{
                      backgroundColor: '#F8FAFC',
                      border: '1px solid var(--border-app)',
                      borderRadius: '6px',
                      padding: '10px 12px',
                    }}
                  >
                    <div style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '3px', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                      {k}
                    </div>
                    <div style={{ fontSize: '12.5px', color: 'var(--text-main)', wordBreak: 'break-word', fontWeight: 500 }}>
                      {String(v ?? '-')}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{
              backgroundColor: '#F8FAFC',
              borderTop: '1px solid var(--border-app)',
              padding: '12px 18px',
              display: 'flex',
              justifyContent: 'flex-end',
            }}>
              <button className="btn-tool" onClick={() => setSelectedEntity(null)}>
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
