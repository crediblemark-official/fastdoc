import { useState, useEffect } from 'react';
import { 
  PenTool, 
  Plus, 
  Trash2, 
  ShieldCheck, 
  Bookmark, 
  RefreshCw
} from 'lucide-react';
import type { MasterSignature } from '../types';
import { SignaturePadModal } from './SignaturePadModal';

interface MasterSignatureExplorerProps {
  onBackToWorkspace?: () => void;
  onNotify: (msg: string, type: 'success' | 'error') => void;
  searchQuery?: string;
  refreshTrigger?: number;
  isAddModalOpen?: boolean;
  onOpenAddModal?: () => void;
  onCloseAddModal?: () => void;
  onSignatureAdded?: () => void;
}

export const MasterSignatureExplorer = ({
  onNotify,
  searchQuery = '',
  refreshTrigger = 0,
  isAddModalOpen: externalIsAddModalOpen,
  onOpenAddModal,
  onCloseAddModal,
  onSignatureAdded,
}: MasterSignatureExplorerProps) => {
  const [signatures, setSignatures] = useState<MasterSignature[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [internalIsAddModalOpen, setInternalIsAddModalOpen] = useState<boolean>(false);

  const isModalOpen = externalIsAddModalOpen !== undefined ? externalIsAddModalOpen : internalIsAddModalOpen;
  const openModal = onOpenAddModal || (() => setInternalIsAddModalOpen(true));
  const closeModal = onCloseAddModal || (() => setInternalIsAddModalOpen(false));

  const fetchSignatures = () => {
    setLoading(true);
    fetch('/api/signatures')
      .then((res) => res.json())
      .then((res) => {
        if (res.status === 'success') {
          setSignatures(res.data);
        }
      })
      .catch((err) => {
        console.error('Gagal mengambil daftar tanda tangan:', err);
        onNotify('Gagal memuat tanda tangan: ' + err.message, 'error');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchSignatures();
  }, [refreshTrigger]);

  const handleAddSignature = async (dataUrl: string, info?: { name?: string; role?: string }) => {
    if (!info?.name) {
      onNotify('Nama penandatangan wajib diisi', 'error');
      return;
    }

    try {
      const res = await fetch('/api/signatures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: info.name,
          role_title: info.role || '',
          image_data: dataUrl,
          pen_color: '#1E3A8A',
        }),
      });
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        onNotify(`Tanda tangan "${info.name}" berhasil ditambahkan ke Master Registry!`, 'success');
        fetchSignatures();
        closeModal();
        if (onSignatureAdded) onSignatureAdded();
      } else {
        onNotify(data.detail || 'Gagal menyimpan tanda tangan', 'error');
      }
    } catch (err: any) {
      onNotify('Gagal menyimpan: ' + err.message, 'error');
    }
  };

  const handleDeleteSignature = async (id: string, name: string) => {
    if (!confirm(`Hapus tanda tangan "${name}" dari Master Registry?`)) return;

    try {
      const res = await fetch(`/api/signatures/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        onNotify(`Tanda tangan "${name}" berhasil dihapus`, 'success');
        setSignatures((prev) => prev.filter((s) => s.id !== id));
        if (onSignatureAdded) onSignatureAdded();
      } else {
        onNotify('Gagal menghapus tanda tangan', 'error');
      }
    } catch (err: any) {
      onNotify('Gagal menghapus: ' + err.message, 'error');
    }
  };

  const filtered = signatures.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.role_title && s.role_title.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div style={{ width: '100%', boxSizing: 'border-box' }}>
      {/* Sub-header Banner Keterangan Master Registry */}
      <div style={{
        marginBottom: '16px',
        padding: '12px 18px',
        background: '#FFFFFF',
        border: '1px solid var(--border-app)',
        borderLeft: '4px solid var(--accent-blue)',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            background: '#EFF6FF',
            color: 'var(--accent-blue)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <PenTool size={18} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '13.5px', fontWeight: 700, color: '#0F172A' }}>
              Master Registry: Tanda Tangan Digital Resmi
            </h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '11.5px', color: '#64748B' }}>
              Kelola arsip tanda tangan pejabat, kepala sekolah, dan guru untuk pembubuhan dokumen otomatis.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{
            fontSize: '11.5px',
            fontWeight: 600,
            background: '#EFF6FF',
            color: '#1D4ED8',
            padding: '4px 10px',
            borderRadius: '12px',
            border: '1px solid #BFDBFE'
          }}>
            {signatures.length} Tanda Tangan Terdaftar
          </span>
        </div>
      </div>

      {/* Content Area */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-dim)', fontSize: '12px' }}>
          <RefreshCw size={24} className="animate-spin" style={{ marginBottom: '8px', color: 'var(--accent-blue)' }} />
          <p>Memuat Master Tanda Tangan...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', background: '#FFFFFF', borderRadius: '8px', border: '1px dashed var(--border-app)' }}>
          <Bookmark size={32} color="var(--text-dim)" style={{ marginBottom: '8px' }} />
          <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)', margin: '0 0 4px 0' }}>
            {searchQuery ? 'Tidak ada tanda tangan yang sesuai pencarian' : 'Belum Ada Tanda Tangan di Master Registry'}
          </p>
          <p style={{ fontSize: '11.5px', color: 'var(--text-dim)', margin: '0 0 16px 0' }}>
            Tambahkan tanda tangan kepala sekolah atau guru untuk dapat digunakan di seluruh dokumen.
          </p>
          <button className="btn-tool primary" onClick={openModal}>
            <Plus size={13} />
            <span>+ Buat Tanda Tangan Pertama</span>
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
          {filtered.map((sig) => (
            <div
              key={sig.id}
              style={{
                background: '#FFFFFF',
                border: '1px solid var(--border-app)',
                borderRadius: '8px',
                padding: '16px',
                boxShadow: 'var(--shadow-sm)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'box-shadow 0.2s ease, transform 0.2s ease',
              }}
            >
              <div>
                {/* Header: Name, Role and Delete button */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div>
                    <h3 style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-main)', margin: 0 }}>
                      {sig.name}
                    </h3>
                    <span style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'block', marginTop: '2px' }}>
                      {sig.role_title || 'Pejabat Penandatangan'}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() => handleDeleteSignature(sig.id, sig.name)}
                    title="Hapus tanda tangan"
                    style={{ color: '#EF4444' }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>

                {/* Signature Preview Canvas Box */}
                <div
                  style={{
                    height: '96px',
                    background: '#F8FAFC',
                    borderRadius: '6px',
                    border: '1px dashed #CBD5E1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '8px 16px',
                    marginBottom: '12px',
                  }}
                >
                  <img
                    src={sig.image_data}
                    alt={sig.name}
                    style={{
                      maxHeight: '84px',
                      maxWidth: '100%',
                      objectFit: 'contain',
                      filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.06))',
                    }}
                  />
                </div>
              </div>

              {/* Card Footer: Metadata and Status badge */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '10px', borderTop: '1px solid #F1F5F9' }}>
                <span style={{ fontSize: '10.5px', color: 'var(--accent-emerald)', display: 'flex', alignItems: 'center', gap: '3px', fontWeight: 500 }}>
                  <ShieldCheck size={11} /> Format OpenXML Valid
                </span>
                <span style={{ fontSize: '10px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                  {sig.id}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Tambah Tanda Tangan Baru */}
      <SignaturePadModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onConfirm={handleAddSignature}
        fieldLabel="Master Tanda Tangan Resmi"
      />
    </div>
  );
};
