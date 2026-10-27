import { useState } from 'react';
import { 
  FolderPlus, 
  Database, 
  Layers, 
  Plus, 
  X, 
  GraduationCap, 
  Award, 
  FileCheck
} from 'lucide-react';
import type { Workspace } from '../types';

interface SidebarProps {
  workspaces: Workspace[];
  activeWorkspaceId: string;
  onSelectWorkspace: (id: string) => void;
  onSelectMasterData: () => void;
  isMasterDataActive: boolean;
  onCreateWorkspace: (name: string, description: string, category: string) => void;
  totalMasterEntities: number;
}

export const Sidebar = ({
  workspaces,
  activeWorkspaceId,
  onSelectWorkspace,
  onSelectMasterData,
  isMasterDataActive,
  onCreateWorkspace,
  totalMasterEntities,
}: SidebarProps) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [newWsName, setNewWsName] = useState('');
  const [newWsDesc, setNewWsDesc] = useState('');
  const [newWsCategory, setNewWsCategory] = useState('rapor');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWsName.trim()) return;
    onCreateWorkspace(newWsName, newWsDesc, newWsCategory);
    setNewWsName('');
    setNewWsDesc('');
    setModalOpen(false);
  };

  const getWsIcon = (cat: string) => {
    switch (cat) {
      case 'rapor': return <GraduationCap size={16} />;
      case 'sertifikat': return <Award size={16} />;
      default: return <Layers size={16} />;
    }
  };

  return (
    <aside className="studio-sidebar">
      <div className="sidebar-header">
        <div className="sidebar-brand">
          <div className="brand-icon">
            <FileCheck size={20} />
          </div>
          <div>
            <span className="brand-title">FastDoc</span>
            <span style={{ fontSize: '0.65rem', display: 'block', color: 'var(--text-dim)', fontWeight: 600 }}>
              STUDIO EDITION
            </span>
          </div>
        </div>
      </div>

      <div className="sidebar-nav">
        {/* Navigasi Master Data Hub */}
        <div style={{ marginBottom: '20px' }}>
          <div className="nav-section-title">
            <span>DATA LAKE TERPUSAT</span>
          </div>
          <div
            className={`workspace-item ${isMasterDataActive ? 'active' : ''}`}
            onClick={onSelectMasterData}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Database size={16} color={isMasterDataActive ? 'var(--primary)' : 'var(--text-muted)'} />
              <span>Master Registry Data</span>
            </div>
            <span className="workspace-badge">{totalMasterEntities} Profil</span>
          </div>
        </div>

        {/* Daftar Workspaces Dokumen */}
        <div>
          <div className="nav-section-title">
            <span>WORKSPACES DOKUMEN</span>
            <button
              onClick={() => setModalOpen(true)}
              style={{ background: 'transparent', border: 'none', color: 'var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '2px' }}
              title="Buat Workspace Baru"
            >
              <Plus size={14} />
            </button>
          </div>

          {workspaces.map((ws) => {
            const isActive = !isMasterDataActive && ws.id === activeWorkspaceId;
            return (
              <div
                key={ws.id}
                className={`workspace-item ${isActive ? 'active' : ''}`}
                onClick={() => onSelectWorkspace(ws.id)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                  {getWsIcon(ws.category)}
                  <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                    {ws.name}
                  </span>
                </div>
                <span className="workspace-badge">{ws.total_records || 0}</span>
              </div>
            );
          })}

          <button
            className="btn btn-secondary"
            style={{ width: '100%', marginTop: '12px', fontSize: '0.8rem', padding: '7px 12px' }}
            onClick={() => setModalOpen(true)}
          >
            <FolderPlus size={14} />
            <span>+ Workspace Baru</span>
          </button>
        </div>
      </div>

      {/* Modal Buat Workspace Baru */}
      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Buat Workspace Dokumen Baru</h3>
              <button
                onClick={() => setModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Nama Proyek / Dokumen:</label>
                  <input
                    className="form-input"
                    value={newWsName}
                    onChange={(e) => setNewWsName(e.target.value)}
                    placeholder="Contoh: Rapor Semester 1 / Sertifikat Lomba"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Kategori Dokumen:</label>
                  <select
                    className="form-input"
                    value={newWsCategory}
                    onChange={(e) => setNewWsCategory(e.target.value)}
                  >
                    <option value="rapor">Rapor / Penilaian Sekolah</option>
                    <option value="sertifikat">Sertifikat / Piagam Penghargaan</option>
                    <option value="surat">Surat Keputusan / Tugas / Kontrak</option>
                    <option value="keuangan">Kwitansi / Invoice / SPJ</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Deskripsi Ringkas (Opsional):</label>
                  <input
                    className="form-input"
                    value={newWsDesc}
                    onChange={(e) => setNewWsDesc(e.target.value)}
                    placeholder="Keterangan singkat peruntukan dokumen..."
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>
                  Batal
                </button>
                <button type="submit" className="btn btn-primary">
                  Buat Workspace
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </aside>
  );
};
