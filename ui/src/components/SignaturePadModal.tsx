import { useState, useRef, useEffect } from 'react';
import { 
  X, 
  PenTool, 
  Upload, 
  Bookmark, 
  RotateCcw, 
  Trash2, 
  Check, 
  FileCheck, 
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import type { MasterSignature } from '../types';

interface SignaturePadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (dataUrl: string, signerInfo?: { name?: string; role?: string }) => void;
  fieldKey?: string;
  fieldLabel?: string;
}

export const SignaturePadModal = ({
  isOpen,
  onClose,
  onConfirm,
  fieldKey,
  fieldLabel,
}: SignaturePadModalProps) => {
  const [activeTab, setActiveTab] = useState<'draw' | 'upload' | 'saved'>('draw');

  // Pen settings
  const [penColor, setPenColor] = useState<string>('#1E3A8A'); // Default: Biru Resmi Dokumen
  const [penWidth, setPenWidth] = useState<number>(3);
  const [hasDrawn, setHasDrawn] = useState<boolean>(false);

  // Stroke history for Undo
  const strokeHistoryRef = useRef<ImageData[]>([]);

  // Canvas ref
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef<boolean>(false);
  const lastPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Upload state
  const [uploadedDataUrl, setUploadedDataUrl] = useState<string>('');
  const [autoRemoveWhiteBg, setAutoRemoveWhiteBg] = useState<boolean>(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Saved signatures library
  const [savedSignatures, setSavedSignatures] = useState<MasterSignature[]>([]);
  const [selectedSavedSig, setSelectedSavedSig] = useState<MasterSignature | null>(null);
  const [loadingSaved, setLoadingSaved] = useState<boolean>(false);

  // Save to master registry checkbox
  const [saveToMaster, setSaveToMaster] = useState<boolean>(false);
  const [signerName, setSignerName] = useState<string>('');
  const [signerRole, setSignerRole] = useState<string>('');

  // Fetch saved signatures when modal opens
  useEffect(() => {
    if (isOpen) {
      setLoadingSaved(true);
      fetch('/api/signatures')
        .then((res) => res.json())
        .then((res) => {
          if (res.status === 'success') {
            setSavedSignatures(res.data);
          }
        })
        .catch((err) => console.error('Gagal mengambil daftar tanda tangan:', err))
        .finally(() => setLoadingSaved(false));
    }
  }, [isOpen]);

  // Set default role/name if fieldLabel suggests one
  useEffect(() => {
    if (fieldLabel) {
      if (fieldLabel.toLowerCase().includes('kepala') || fieldKey?.includes('kepsek')) {
        setSignerRole('Kepala Satuan Pendidikan');
      } else if (fieldLabel.toLowerCase().includes('guru') || fieldKey?.includes('guru')) {
        setSignerRole('Guru Kelompok / Wali Kelas');
      } else if (fieldLabel.toLowerCase().includes('wali') || fieldLabel.toLowerCase().includes('orang')) {
        setSignerRole('Orang Tua / Wali');
      }
    }
  }, [fieldLabel, fieldKey]);

  // Initialize canvas when Draw tab is active
  useEffect(() => {
    if (!isOpen || activeTab !== 'draw') return;

    const timer = setTimeout(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;

      // Set actual buffer size for high-DPI crispness
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = penColor;
        ctx.lineWidth = penWidth;

        // Save blank state in history
        const initialImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        strokeHistoryRef.current = [initialImageData];
        setHasDrawn(false);
      }
    }, 50);

    return () => clearTimeout(timer);
  }, [isOpen, activeTab]);

  // Update canvas stroke style when pen color/width changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = penColor;
        ctx.lineWidth = penWidth;
      }
    }
  }, [penColor, penWidth]);

  // Helper coordinate extractor for mouse & touch
  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    if ('touches' in e) {
      const touch = e.touches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
    } else {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Save previous state to history
    strokeHistoryRef.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
    if (strokeHistoryRef.current.length > 20) {
      strokeHistoryRef.current.shift();
    }

    isDrawingRef.current = true;
    const pos = getCanvasCoords(e);
    lastPosRef.current = pos;

    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    setHasDrawn(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pos = getCanvasCoords(e);

    // Smooth stroke drawing
    ctx.beginPath();
    ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();

    lastPosRef.current = pos;
  };

  const stopDrawing = () => {
    isDrawingRef.current = false;
  };

  const handleClearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    strokeHistoryRef.current = [];
    setHasDrawn(false);
  };

  const handleUndoCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (strokeHistoryRef.current.length > 0) {
      const prevState = strokeHistoryRef.current.pop()!;
      ctx.putImageData(prevState, 0, 0);
      if (strokeHistoryRef.current.length === 0) {
        setHasDrawn(false);
      }
    }
  };

  // Process uploaded image and optionally remove white background
  const processUploadedFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (!autoRemoveWhiteBg) {
        setUploadedDataUrl(dataUrl);
        return;
      }

      // Remove white background via canvas thresholding
      const img = new Image();
      img.onload = () => {
        const offCanvas = document.createElement('canvas');
        offCanvas.width = img.width;
        offCanvas.height = img.height;
        const ctx = offCanvas.getContext('2d');
        if (!ctx) {
          setUploadedDataUrl(dataUrl);
          return;
        }

        ctx.drawImage(img, 0, 0);
        const imgData = ctx.getImageData(0, 0, offCanvas.width, offCanvas.height);
        const d = imgData.data;

        // Pixel loop: convert near-white pixels (R, G, B > 215) to transparent
        for (let i = 0; i < d.length; i += 4) {
          const r = d[i];
          const g = d[i + 1];
          const b = d[i + 2];
          // Brightness threshold
          if (r > 200 && g > 200 && b > 200) {
            d[i + 3] = 0; // Transparent alpha
          }
        }

        ctx.putImageData(imgData, 0, 0);
        setUploadedDataUrl(offCanvas.toDataURL('image/png'));
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleFileUploadChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processUploadedFile(e.target.files[0]);
    }
  };

  const handleConfirm = async () => {
    let finalDataUrl = '';

    if (activeTab === 'draw') {
      const canvas = canvasRef.current;
      if (!canvas || !hasDrawn) {
        alert('Silakan gores tanda tangan pada kotak terlebih dahulu');
        return;
      }
      finalDataUrl = canvas.toDataURL('image/png');
    } else if (activeTab === 'upload') {
      if (!uploadedDataUrl) {
        alert('Silakan unggah gambar tanda tangan terlebih dahulu');
        return;
      }
      finalDataUrl = uploadedDataUrl;
    } else if (activeTab === 'saved') {
      if (!selectedSavedSig) {
        alert('Silakan pilih salah satu tanda tangan tersimpan');
        return;
      }
      finalDataUrl = selectedSavedSig.image_data;
    }

    if (!finalDataUrl) return;

    // If saveToMaster is checked, save to master signatures registry
    if (saveToMaster && signerName.trim()) {
      try {
        await fetch('/api/signatures', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: signerName.trim(),
            role_title: signerRole.trim(),
            image_data: finalDataUrl,
            pen_color: penColor,
          }),
        });
      } catch (err) {
        console.error('Gagal menyimpan tanda tangan ke master:', err);
      }
    }

    onConfirm(finalDataUrl, {
      name: signerName.trim() || selectedSavedSig?.name,
      role: signerRole.trim() || selectedSavedSig?.role_title,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1200 }}>
      <div 
        className="modal-content" 
        onClick={(e) => e.stopPropagation()} 
        style={{ width: '640px', maxWidth: '96vw', padding: 0, overflow: 'hidden', borderRadius: '10px' }}
      >
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-app)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#F8FAFC' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-blue)' }}>
                <PenTool size={15} />
              </div>
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-main)', margin: 0 }}>
                Bubuhkan Tanda Tangan Digital
              </h3>
            </div>
            {fieldLabel && (
              <span style={{ fontSize: '11.5px', color: 'var(--text-dim)', marginLeft: '36px' }}>
                Untuk kolom: <strong>{fieldLabel}</strong>
              </span>
            )}
          </div>
          <button className="icon-btn" onClick={onClose} title="Tutup">
            <X size={16} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-app)', background: '#FFFFFF' }}>
          <button
            type="button"
            onClick={() => setActiveTab('draw')}
            style={{
              flex: 1,
              padding: '11px 16px',
              border: 'none',
              background: activeTab === 'draw' ? '#FFFFFF' : '#F8FAFC',
              borderBottom: activeTab === 'draw' ? '2px solid var(--accent-blue)' : 'none',
              color: activeTab === 'draw' ? 'var(--accent-blue)' : 'var(--text-muted)',
              fontWeight: activeTab === 'draw' ? 600 : 500,
              fontSize: '12.5px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <PenTool size={14} />
            <span>Gores Langsung</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            style={{
              flex: 1,
              padding: '11px 16px',
              border: 'none',
              background: activeTab === 'upload' ? '#FFFFFF' : '#F8FAFC',
              borderBottom: activeTab === 'upload' ? '2px solid var(--accent-blue)' : 'none',
              color: activeTab === 'upload' ? 'var(--accent-blue)' : 'var(--text-muted)',
              fontWeight: activeTab === 'upload' ? 600 : 500,
              fontSize: '12.5px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <Upload size={14} />
            <span>Unggah Berkas</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('saved')}
            style={{
              flex: 1,
              padding: '11px 16px',
              border: 'none',
              background: activeTab === 'saved' ? '#FFFFFF' : '#F8FAFC',
              borderBottom: activeTab === 'saved' ? '2px solid var(--accent-blue)' : 'none',
              color: activeTab === 'saved' ? 'var(--accent-blue)' : 'var(--text-muted)',
              fontWeight: activeTab === 'saved' ? 600 : 500,
              fontSize: '12.5px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <Bookmark size={14} />
            <span>Pilih Tersimpan ({savedSignatures.length})</span>
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '20px', background: '#FAFAFA' }}>
          {/* TAB 1: DRAW CANVAS */}
          {activeTab === 'draw' && (
            <div>
              {/* Canvas Controls Top Bar */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                {/* Pen Color Selector */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '11.5px', color: 'var(--text-dim)', fontWeight: 500 }}>Warna Tinta:</span>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    {[
                      { color: '#1E3A8A', name: 'Biru Resmi Kedinasan' },
                      { color: '#0F172A', name: 'Hitam Formal' },
                      { color: '#0284C7', name: 'Biru Cerah' },
                    ].map((c) => (
                      <button
                        key={c.color}
                        type="button"
                        onClick={() => setPenColor(c.color)}
                        title={c.name}
                        style={{
                          width: '22px',
                          height: '22px',
                          borderRadius: '50%',
                          background: c.color,
                          border: penColor === c.color ? '2px solid #FFFFFF' : '1px solid rgba(0,0,0,0.1)',
                          outline: penColor === c.color ? '2px solid var(--accent-blue)' : 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {penColor === c.color && <Check size={12} color="#FFFFFF" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Stroke Width Selector */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '11.5px', color: 'var(--text-dim)', fontWeight: 500 }}>Tebal:</span>
                  {[
                    { label: 'Tipis', width: 2 },
                    { label: 'Sedang', width: 3 },
                    { label: 'Tebal', width: 4.5 },
                  ].map((w) => (
                    <button
                      key={w.width}
                      type="button"
                      onClick={() => setPenWidth(w.width)}
                      style={{
                        padding: '3px 8px',
                        fontSize: '11px',
                        borderRadius: '4px',
                        border: '1px solid var(--border-app)',
                        background: penWidth === w.width ? '#EFF6FF' : '#FFFFFF',
                        color: penWidth === w.width ? 'var(--accent-blue)' : 'var(--text-muted)',
                        fontWeight: penWidth === w.width ? 600 : 400,
                        cursor: 'pointer',
                      }}
                    >
                      {w.label}
                    </button>
                  ))}
                </div>

                {/* Canvas Actions: Undo & Clear */}
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    className="btn-tool"
                    onClick={handleUndoCanvas}
                    title="Urungkan goresan terakhir (Undo)"
                    style={{ height: '26px', padding: '0 8px', fontSize: '11px' }}
                  >
                    <RotateCcw size={12} />
                    <span>Undo</span>
                  </button>
                  <button
                    type="button"
                    className="btn-tool"
                    onClick={handleClearCanvas}
                    title="Bersihkan canvas tanda tangan"
                    style={{ height: '26px', padding: '0 8px', fontSize: '11px', color: '#EF4444' }}
                  >
                    <Trash2 size={12} />
                    <span>Hapus</span>
                  </button>
                </div>
              </div>

              {/* Drawing Canvas Board */}
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  height: '200px',
                  background: '#FFFFFF',
                  borderRadius: '8px',
                  border: '1px solid var(--border-app)',
                  boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.04)',
                  overflow: 'hidden',
                  cursor: 'crosshair',
                  touchAction: 'none',
                }}
              >
                <canvas
                  ref={canvasRef}
                  style={{ width: '100%', height: '100%', display: 'block' }}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                />

                {/* Signature Baseline Guide */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: '36px',
                    left: '40px',
                    right: '40px',
                    borderBottom: '1px dashed #CBD5E1',
                    display: 'flex',
                    justifyContent: 'space-between',
                    pointerEvents: 'none',
                  }}
                >
                  <span style={{ fontSize: '10px', color: '#94A3B8', transform: 'translateY(14px)' }}>
                    ✕ Tanda Tangan di atas garis ini
                  </span>
                  <span style={{ fontSize: '9px', color: '#94A3B8', transform: 'translateY(14px)' }}>
                    Presisi OpenXML 100%
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                <span style={{ fontSize: '10.5px', color: 'var(--text-dim)' }}>
                  Goreskan tanda tangan dengan mouse, touchpad, atau stylus pen layar sentuh.
                </span>
                <span style={{ fontSize: '10.5px', color: 'var(--accent-emerald)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                  <ShieldCheck size={12} /> Otomatis PNG Transparan
                </span>
              </div>
            </div>
          )}

          {/* TAB 2: UPLOAD IMAGE */}
          {activeTab === 'upload' && (
            <div>
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  width: '100%',
                  minHeight: '190px',
                  background: '#FFFFFF',
                  borderRadius: '8px',
                  border: '2px dashed var(--border-app)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '24px',
                  cursor: 'pointer',
                  transition: 'border-color 0.2s ease',
                  boxSizing: 'border-box',
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  style={{ display: 'none' }}
                  onChange={handleFileUploadChange}
                />

                {uploadedDataUrl ? (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ padding: '12px', background: '#F8FAFC', borderRadius: '6px', border: '1px solid var(--border-app)', display: 'inline-block', maxWidth: '320px' }}>
                      <img
                        src={uploadedDataUrl}
                        alt="Signature Preview"
                        style={{ maxHeight: '110px', maxWidth: '100%', objectFit: 'contain' }}
                      />
                    </div>
                    <p style={{ fontSize: '11.5px', color: 'var(--accent-blue)', marginTop: '8px', fontWeight: 500 }}>
                      Klik untuk mengganti gambar
                    </p>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: '#EFF6FF', color: 'var(--accent-blue)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px' }}>
                      <Upload size={20} />
                    </div>
                    <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)', margin: '0 0 4px 0' }}>
                      Pilih berkas tanda tangan (.png, .jpg, .webp)
                    </p>
                    <p style={{ fontSize: '11px', color: 'var(--text-dim)', margin: 0 }}>
                      Mendukung foto tanda tangan di atas kertas atau scan cap stempel
                    </p>
                  </div>
                )}
              </div>

              {/* White Background Removal Toggle */}
              <div style={{ marginTop: '12px', background: '#FFFFFF', border: '1px solid var(--border-app)', borderRadius: '6px', padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={14} color="#8B5CF6" />
                  <div>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-main)' }}>
                      Hapus Latar Belakang Putih Kertas (Auto-Transparent)
                    </span>
                    <p style={{ fontSize: '10.5px', color: 'var(--text-dim)', margin: 0 }}>
                      Membuat latar kertas foto menjadi transparan agar goresan tanda tangan menyatu alami di dokumen Word.
                    </p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={autoRemoveWhiteBg}
                  onChange={(e) => setAutoRemoveWhiteBg(e.target.checked)}
                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                />
              </div>
            </div>
          )}

          {/* TAB 3: SAVED SIGNATURES */}
          {activeTab === 'saved' && (
            <div>
              {loadingSaved ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-dim)', fontSize: '12px' }}>
                  Memuat daftar tanda tangan tersimpan...
                </div>
              ) : savedSignatures.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', background: '#FFFFFF', borderRadius: '8px', border: '1px dashed var(--border-app)' }}>
                  <Bookmark size={24} color="var(--text-dim)" style={{ marginBottom: '6px' }} />
                  <p style={{ fontSize: '12.5px', fontWeight: 500, color: 'var(--text-main)', margin: '0 0 4px 0' }}>
                    Belum ada tanda tangan tersimpan di Master Registry
                  </p>
                  <p style={{ fontSize: '11px', color: 'var(--text-dim)', margin: 0 }}>
                    Gores tanda tangan di tab "Gores Langsung" lalu centang "Simpan ke Master Registry".
                  </p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', maxHeight: '250px', overflowY: 'auto', paddingRight: '4px' }}>
                  {savedSignatures.map((sig) => {
                    const isSelected = selectedSavedSig?.id === sig.id;
                    return (
                      <div
                        key={sig.id}
                        onClick={() => setSelectedSavedSig(sig)}
                        style={{
                          background: isSelected ? '#EFF6FF' : '#FFFFFF',
                          border: isSelected ? '2px solid var(--accent-blue)' : '1px solid var(--border-app)',
                          borderRadius: '8px',
                          padding: '12px',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          boxShadow: isSelected ? '0 2px 6px rgba(37,99,235,0.12)' : 'none',
                        }}
                      >
                        <div style={{ height: '70px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC', borderRadius: '4px', marginBottom: '8px', padding: '4px' }}>
                          <img
                            src={sig.image_data}
                            alt={sig.name}
                            style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }}
                          />
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontWeight: 600, fontSize: '12px', color: 'var(--text-main)' }}>
                              {sig.name}
                            </span>
                            {isSelected && <Check size={14} color="var(--accent-blue)" />}
                          </div>
                          {sig.role_title && (
                            <span style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'block', marginTop: '2px' }}>
                              {sig.role_title}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Save to Master Registry Checkbox (Only for Draw or Upload) */}
          {activeTab !== 'saved' && (
            <div style={{ marginTop: '14px', background: '#FFFFFF', border: '1px solid var(--border-app)', borderRadius: '6px', padding: '12px 14px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none' }}>
                <input
                  type="checkbox"
                  checked={saveToMaster}
                  onChange={(e) => setSaveToMaster(e.target.checked)}
                  style={{ width: '15px', height: '15px', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-main)' }}>
                  Simpan tanda tangan ini ke Master Registry (dapat digunakan kembali di berkas lain)
                </span>
              </label>

              {saveToMaster && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid var(--border-app)' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 500, color: 'var(--text-dim)', marginBottom: '3px' }}>
                      Nama Penandatangan:
                    </label>
                    <input
                      type="text"
                      className="exp-input"
                      placeholder="Contoh: Sri Wastuti, S.Pd."
                      value={signerName}
                      onChange={(e) => setSignerName(e.target.value)}
                      style={{ height: '30px', fontSize: '11.5px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 500, color: 'var(--text-dim)', marginBottom: '3px' }}>
                      Jabatan / Peran:
                    </label>
                    <input
                      type="text"
                      className="exp-input"
                      placeholder="Contoh: Kepala Satuan Pendidikan"
                      value={signerRole}
                      onChange={(e) => setSignerRole(e.target.value)}
                      style={{ height: '30px', fontSize: '11.5px' }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div style={{ padding: '14px 20px', background: '#FFFFFF', borderTop: '1px solid var(--border-app)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FileCheck size={14} color="var(--accent-emerald)" />
            <span style={{ fontSize: '11.5px', color: 'var(--text-dim)' }}>
              Standar format Word OpenXML terjaga 100%
            </span>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="button" className="btn-tool" onClick={onClose}>
              Batal
            </button>
            <button
              type="button"
              className="btn-tool primary"
              onClick={handleConfirm}
              style={{ fontWeight: 600, padding: '0 16px' }}
            >
              <Check size={14} />
              <span>Bubuhkan Tanda Tangan</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
