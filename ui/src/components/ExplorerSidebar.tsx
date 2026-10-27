import { useState } from 'react';
import { 
  Folder, 
  Database, 
  HardDrive, 
  Plus, 
  X, 
  Award, 
  ShieldCheck,
  PenTool
} from 'lucide-react';
import type { Workspace } from '../types';

interface ExplorerSidebarProps {
  workspaces: Workspace[];
  activeWorkspaceId: string;
  onSelectWorkspace: (id: string) => void;
  onSelectMasterData: () => void;
  isMasterDataActive: boolean;
  onSelectSignatures: () => void;
  isSignaturesActive: boolean;
  onCreateWorkspace: (name: string, description: string, category: string) => void;
  totalMasterEntities: number;
  totalSignatures: number;
}

export const ExplorerSidebar = ({
  workspaces,
  activeWorkspaceId,
  onSelectWorkspace,
  onSelectMasterData,
  isMasterDataActive,
  onSelectSignatures,
  isSignaturesActive,
  onCreateWorkspace,
  totalMasterEntities,
  totalSignatures,
}: ExplorerSidebarProps) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [newWsName, setNewWsName] = useState('');
  const [newWsCategory, setNewWsCategory] = useState('rapor');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWsName.trim()) return;
    onCreateWorkspace(newWsName, '', newWsCategory);
    setNewWsName('');
    setModalOpen(false);
  };

  return (
    <aside className="explorer-sidebar">
      {/* Bagian 1: Workspaces Dokumen */}
      <div style={{ marginBottom: '16px' }}>
        <div className="sidebar-section-header">
          <span>Workspaces Dokumen</span>
          <button
            onClick={() => setModalOpen(true)}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px' }}
            title="Tambah Workspace Baru"
          >
            <Plus size={13} />
          </button>
        </div>

        {workspaces.map((ws) => {
          const isActive = !isMasterDataActive && !isSignaturesActive && ws.id === activeWorkspaceId;
          return (
            <div
              key={ws.id}
              className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
              onClick={() => onSelectWorkspace(ws.id)}
              title={ws.name}
            >
              <div className="sidebar-item-left">
                {ws.category === 'sertifikat' ? (
                  <Award size={15} color={isActive ? 'var(--accent-blue)' : '#D97706'} />
                ) : (
                  <Folder size={15} color={isActive ? 'var(--accent-blue)' : '#D97706'} />
                )}
                <span className="sidebar-item-text">{ws.name}</span>
              </div>
              <span className="sidebar-count">{ws.total_records || 0}</span>
            </div>
          );
        })}
      </div>

      {/* Bagian 2: Data Lake Terpusat */}
      <div style={{ marginBottom: '16px' }}>
        <div className="sidebar-section-header">
          <span>Master Registry Data</span>
        </div>

        <div
          className={`sidebar-nav-item ${isMasterDataActive ? 'active' : ''}`}
          onClick={onSelectMasterData}
          title="Master Database Siswa (Tersimpan Permanen)"
        >
          <div className="sidebar-item-left">
            <Database size={15} color={isMasterDataActive ? 'var(--accent-blue)' : '#0284C7'} />
            <span className="sidebar-item-text">Master Data Siswa</span>
          </div>
          <span className="sidebar-count">{totalMasterEntities}</span>
        </div>

        <div
          className={`sidebar-nav-item ${isSignaturesActive ? 'active' : ''}`}
          onClick={onSelectSignatures}
          title="Master Tanda Tangan Digital Resmi (Pejabat & Guru)"
        >
          <div className="sidebar-item-left">
            <PenTool size={15} color={isSignaturesActive ? 'var(--accent-blue)' : '#8B5CF6'} />
            <span className="sidebar-item-text">Master Tanda Tangan</span>
          </div>
          <span className="sidebar-count">{totalSignatures}</span>
        </div>
      </div>

      {/* Bagian 3: Storage Card Minimalis */}
      <div className="sidebar-footer">
        <div className="storage-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <HardDrive size={13} color="var(--accent-blue)" />
              <span style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-main)' }}>SQLite Local DB</span>
            </div>
            <span style={{ fontSize: '10.5px', color: 'var(--accent-emerald)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '3px' }}>
              <ShieldCheck size={11} /> Offline
            </span>
          </div>
          <div className="storage-bar-track">
            <div className="storage-bar-fill"></div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
            <span style={{ fontSize: '10px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>fastdoc.db</span>
            <span style={{ fontSize: '10px', color: 'var(--text-dim)' }}>Tersinkron</span>
          </div>
        </div>
      </div>

      {/* Modal Buat Workspace Baru */}
      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ width: '420px', maxWidth: '95vw' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-app)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F8FAFC' }}>
              <span style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-main)' }}>Tambah Workspace Baru</span>
              <button className="icon-btn" onClick={() => setModalOpen(false)}>
                <X size={15} />
              </button>
            </div>
            <form onSubmit={handleCreate}>
              <div style={{ padding: '18px', backgroundColor: '#FFFFFF' }}>
                <div style={{ marginBottom: '14px' }}>
                  <label className="exp-label">Nama Dokumen / Workspace:</label>
                  <input
                    className="exp-input"
                    value={newWsName}
                    onChange={(e) => setNewWsName(e.target.value)}
                    placeholder="Contoh: Rapor PAUD Semester 1 / Sertifikat"
                    autoFocus
                    required
                  />
                </div>
                <div>
                  <label className="exp-label">Kategori Berkas:</label>
                  <select
                    className="exp-input"
                    value={newWsCategory}
                    onChange={(e) => setNewWsCategory(e.target.value)}
                  >
                    <option value="rapor">Rapor / Penilaian</option>
                    <option value="sertifikat">Sertifikat / Piagam</option>
                    <option value="surat">Surat Resmi / Tugas</option>
                    <option value="lainnya">Lainnya</option>
                  </select>
                </div>
              </div>
              <div style={{ padding: '12px 18px', background: '#F8FAFC', borderTop: '1px solid var(--border-app)', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" className="btn-tool" onClick={() => setModalOpen(false)}>Batal</button>
                <button type="submit" className="btn-tool primary">Buat Workspace</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </aside>
  );
};
