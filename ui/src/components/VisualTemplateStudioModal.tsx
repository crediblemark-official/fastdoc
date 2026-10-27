import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Save,
  Tag,
  Sparkles,
  Trash2,
  CheckCircle2,
  MousePointer,
  Plus,
  Loader2,
  Edit3
} from 'lucide-react';

export interface MappedTag {
  id: string;
  original_text: string;
  key: string;
  label: string;
  data_type: 'string' | 'text_multiline' | 'number' | 'date' | 'signature';
}

interface VisualTemplateStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  tempId: string;
  filename: string;
  initialHtml: string;
  suggestedTags?: Array<{
    original_text: string;
    key: string;
    label: string;
    data_type: string;
  }>;
  onSuccess: (updatedWorkspace: any) => void;
}

export const VisualTemplateStudioModal: React.FC<VisualTemplateStudioModalProps> = ({
  isOpen,
  onClose,
  workspaceId,
  tempId,
  filename,
  initialHtml,
  suggestedTags = [],
  onSuccess,
}) => {
  const [tags, setTags] = useState<MappedTag[]>([]);
  const [currentHtml, setCurrentHtml] = useState<string>(initialHtml);
  const [isSaving, setIsSaving] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualText, setManualText] = useState('');
  const [manualKey, setManualKey] = useState('');
  const [manualLabel, setManualLabel] = useState('');
  const [manualType, setManualType] = useState<'string' | 'text_multiline' | 'number' | 'date' | 'signature'>('string');

  // Popover state
  const [popover, setPopover] = useState<{
    visible: boolean;
    x: number;
    y: number;
    selectedText: string;
    key: string;
    label: string;
    dataType: 'string' | 'text_multiline' | 'number' | 'date' | 'signature';
  }>({
    visible: false,
    x: 0,
    y: 0,
    selectedText: '',
    key: '',
    label: '',
    dataType: 'string',
  });

  const docContainerRef = useRef<HTMLDivElement>(null);
  const inputKeyRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCurrentHtml(initialHtml);
    setTags([]);
  }, [initialHtml]);

  useEffect(() => {
    if (popover.visible && inputKeyRef.current) {
      inputKeyRef.current.focus();
      inputKeyRef.current.select();
    }
  }, [popover.visible]);

  if (!isOpen) return null;

  // Helper untuk konversi teks ke format snake_case key
  const formatToKey = (text: string): string => {
    const clean = text
      .replace(/[\[\]\(\)\{\}\:\.\,\/\\\"\']/g, ' ')
      .trim()
      .toLowerCase();
    const key = clean.replace(/\s+/g, '_');
    return key || 'field';
  };

  // Helper untuk konversi teks ke format Title Case label
  const formatToLabel = (text: string): string => {
    const clean = text.replace(/[\[\]\(\)\{\}\:\.\,\/\\\"\']/g, ' ').trim();
    return clean
      .split(/\s+/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ') || 'Field';
  };

  // Deteksi seleksi teks oleh mouse pengguna (dengan timeout agar range selesai diproses browser)
  const handleMouseUp = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    // Jangan buka popover baru jika user sedang klik di dalam popover
    if (target.closest('.popover-card') || target.closest('button') || target.closest('input')) {
      return;
    }

    setTimeout(() => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) return;

      const selectedText = selection.toString().trim();
      if (!selectedText || selectedText.length < 1 || selectedText.length > 250) return;

      try {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();

        const suggestedKey = formatToKey(selectedText);
        const suggestedLabel = formatToLabel(selectedText);

        let inferredType: 'string' | 'text_multiline' | 'number' | 'date' | 'signature' = 'string';
        const low = selectedText.toLowerCase();
        if (low.includes('tanggal') || low.includes('date') || /^\d{1,2}[-/\s]\d{1,2}[-/\s]\d{2,4}/.test(selectedText)) {
          inferredType = 'date';
        } else if (low.includes('tanda tangan') || low.includes('signature') || low.includes('ttd')) {
          inferredType = 'signature';
        } else if (selectedText.length > 60 || selectedText.includes('\n')) {
          inferredType = 'text_multiline';
        } else if (/^[0-9.,Rp\s]+$/.test(selectedText)) {
          inferredType = 'number';
        }

        const popoverWidth = 330;
        const popoverHeight = 310;

        let x = rect.left + rect.width / 2 - popoverWidth / 2;
        x = Math.max(16, Math.min(x, window.innerWidth - popoverWidth - 20));

        let y = rect.top - popoverHeight - 12;
        if (y < 65) {
          y = rect.bottom + 12;
        }
        y = Math.max(65, Math.min(y, window.innerHeight - popoverHeight - 20));

        setPopover({
          visible: true,
          x,
          y,
          selectedText,
          key: suggestedKey,
          label: suggestedLabel,
          dataType: inferredType,
        });
      } catch (err) {
        console.warn('Gagal membaca posisi seleksi:', err);
      }
    }, 40);
  };

  // Tambahkan variabel baru dari popover
  const handleApplyTag = () => {
    if (!popover.key.trim() || !popover.selectedText.trim()) return;

    const newKey = formatToKey(popover.key);
    // Cegah duplikasi key
    if (tags.some((t) => t.key === newKey)) {
      alert(`Variabel dengan nama "${newKey}" sudah terdaftar. Harap gunakan nama key lain.`);
      return;
    }

    const newTag: MappedTag = {
      id: `tag_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      original_text: popover.selectedText,
      key: newKey,
      label: popover.label.trim() || newKey,
      data_type: popover.dataType,
    };

    const getBadgeHtml = (key: string) =>
      `<span class="fastdoc-visual-badge" style="background: #EFF6FF; color: #1D4ED8; padding: 2px 8px; border-radius: 4px; font-weight: 700; font-size: 11.5px; display: inline-block; margin: 0 2px; box-shadow: 0 1px 2px rgba(0,0,0,0.06); border: 1px solid #93C5FD;">{{ ${key} }}</span>`;

    if (currentHtml.includes(newTag.original_text)) {
      setCurrentHtml(currentHtml.replace(newTag.original_text, getBadgeHtml(newTag.key)));
    }

    setTags([...tags, newTag]);
    setPopover((prev) => ({ ...prev, visible: false }));
    window.getSelection()?.removeAllRanges();
  };

  // Tambah variabel manual (dari dialog manual)
  const handleApplyManualTag = () => {
    if (!manualText.trim() || !manualKey.trim()) return;

    const newKey = formatToKey(manualKey);
    if (tags.some((t) => t.key === newKey)) {
      alert(`Variabel "${newKey}" sudah terdaftar.`);
      return;
    }

    const newTag: MappedTag = {
      id: `tag_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      original_text: manualText.trim(),
      key: newKey,
      label: manualLabel.trim() || newKey,
      data_type: manualType,
    };

    const getBadgeHtml = (key: string) =>
      `<span class="fastdoc-visual-badge" style="background: #EFF6FF; color: #1D4ED8; padding: 2px 8px; border-radius: 4px; font-weight: 700; font-size: 11.5px; display: inline-block; margin: 0 2px; box-shadow: 0 1px 2px rgba(0,0,0,0.06); border: 1px solid #93C5FD;">{{ ${key} }}</span>`;

    if (currentHtml.includes(newTag.original_text)) {
      setCurrentHtml(currentHtml.replace(newTag.original_text, getBadgeHtml(newTag.key)));
    }

    setTags([...tags, newTag]);
    setShowManualModal(false);
    setManualText('');
    setManualKey('');
    setManualLabel('');
  };

  // Pasang cepat dari saran placeholder (chip)
  const handleApplySuggestion = (sug: { original_text: string; key: string; label: string; data_type: string }) => {
    if (tags.some((t) => t.key === sug.key || t.original_text === sug.original_text)) return;

    const newTag: MappedTag = {
      id: `tag_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      original_text: sug.original_text,
      key: sug.key,
      label: sug.label,
      data_type: sug.data_type as any,
    };

    const getBadgeHtml = (key: string) =>
      `<span class="fastdoc-visual-badge" style="background: #EFF6FF; color: #1D4ED8; padding: 2px 8px; border-radius: 4px; font-weight: 700; font-size: 11.5px; display: inline-block; margin: 0 2px; box-shadow: 0 1px 2px rgba(0,0,0,0.06); border: 1px solid #93C5FD;">{{ ${key} }}</span>`;

    if (currentHtml.includes(newTag.original_text)) {
      setCurrentHtml(currentHtml.replace(newTag.original_text, getBadgeHtml(newTag.key)));
    }

    setTags([...tags, newTag]);
  };

  // Hapus tag dan kembalikan teks asli
  const handleRemoveTag = (tagId: string) => {
    const targetTag = tags.find((t) => t.id === tagId);
    if (!targetTag) return;

    const getBadgeHtml = (key: string) =>
      `<span class="fastdoc-visual-badge" style="background: #EFF6FF; color: #1D4ED8; padding: 2px 8px; border-radius: 4px; font-weight: 700; font-size: 11.5px; display: inline-block; margin: 0 2px; box-shadow: 0 1px 2px rgba(0,0,0,0.06); border: 1px solid #93C5FD;">{{ ${key} }}</span>`;
    setCurrentHtml(currentHtml.replace(getBadgeHtml(targetTag.key), targetTag.original_text));
    setTags(tags.filter((t) => t.id !== tagId));
  };

  // Simpan dan Terapkan Template ke Workspace
  const handleSaveTemplate = async () => {
    if (tags.length === 0) {
      if (!confirm('Anda belum menandai variabel apa pun. Tetap ingin menyimpan template tanpa variabel dinamis?')) {
        return;
      }
    }

    setIsSaving(true);
    try {
      const payload = {
        temp_id: tempId,
        filename,
        tags: tags.map((t) => ({
          original_text: t.original_text,
          key: t.key,
          label: t.label,
          data_type: t.data_type,
        })),
      };

      const res = await fetch(`/api/workspaces/${workspaceId}/commit-custom-template`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || json.status !== 'success') {
        throw new Error(json.detail || 'Gagal menyimpan template');
      }

      onSuccess(json.data);
      onClose();
    } catch (err: any) {
      alert(`Error saat menyimpan template: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 9999 }}>
      <div
        className="modal-content"
        style={{
          width: '98vw',
          maxWidth: '1440px',
          height: '95vh',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          background: '#FFFFFF',
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.25)',
          position: 'relative',
          border: '1px solid #CBD5E1',
        }}
      >
        {/* Top Header Bar */}
        <div
          style={{
            background: '#FFFFFF',
            borderBottom: '1px solid #E2E8F0',
            padding: '12px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #0284C7, #0369A1)',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 6px rgba(2, 132, 199, 0.25)',
              }}
            >
              <Sparkles size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                  Visual Template Studio (Interactive Field Mapper)
                </h2>
                <span
                  style={{
                    background: tags.length > 0 ? '#DCFCE7' : '#F1F5F9',
                    color: tags.length > 0 ? '#15803D' : '#64748B',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: 700,
                  }}
                >
                  {tags.length} Variabel Ditandai
                </span>
              </div>
              <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0 0' }}>
                Dokumen: <strong style={{ color: '#1E293B' }}>{filename}</strong> — 
                <span style={{ color: '#0284C7', marginLeft: '6px', fontWeight: 500 }}>
                  Blok / seleksi teks pada lembar dokumen di bawah untuk menjadikannya variabel formulir.
                </span>
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              className="btn-tool"
              onClick={onClose}
              style={{ background: '#FFFFFF', color: '#475569', border: '1px solid #CBD5E1' }}
              disabled={isSaving}
            >
              <X size={14} />
              <span>Batal</span>
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={handleSaveTemplate}
              disabled={isSaving}
              style={{
                background: '#0284C7',
                color: '#FFFFFF',
                padding: '8px 18px',
                borderRadius: '6px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 2px 6px rgba(2, 132, 199, 0.3)',
                cursor: 'pointer',
                border: 'none',
              }}
            >
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              <span>Simpan & Terapkan Template</span>
            </button>
          </div>
        </div>

        {/* Main Workspace Layout */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Document Canvas Area (Center) */}
          <div
            ref={docContainerRef}
            onMouseUp={handleMouseUp}
            style={{
              flex: 1,
              overflowY: 'auto',
              background: '#F1F5F9',
              padding: '28px 20px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              userSelect: 'text',
              WebkitUserSelect: 'text',
              cursor: 'text',
              position: 'relative',
            }}
          >
            {/* Guide Banner */}
            <div
              style={{
                width: '100%',
                maxWidth: '840px',
                background: '#EFF6FF',
                border: '1px solid #BAE6FD',
                borderRadius: '8px',
                padding: '10px 16px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                color: '#0369A1',
                fontSize: '12px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MousePointer size={15} color="#0284C7" />
                <span>
                  <strong>Cara Pakai:</strong> Tarik mouse untuk menyeleksi kata/kalimat apa saja di lembar dokumen putih di bawah, jendela kecil untuk menyimpan variabel akan langsung muncul!
                </span>
              </div>
              <span style={{ fontSize: '11px', color: '#0284C7', fontWeight: 600, whiteSpace: 'nowrap' }}>Lembar A4</span>
            </div>

            {/* Document A4 Sheet */}
            <div
              dangerouslySetInnerHTML={{ __html: currentHtml }}
              style={{
                width: '100%',
                maxWidth: '840px',
                background: '#FFFFFF',
                borderRadius: '4px',
                border: '1px solid #CBD5E1',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
                userSelect: 'text',
                WebkitUserSelect: 'text',
              }}
            />
          </div>

          {/* Right Sidebar: Tagged Variables List & Suggestions */}
          <div
            style={{
              width: '340px',
              background: '#FFFFFF',
              borderLeft: '1px solid #E2E8F0',
              display: 'flex',
              flexDirection: 'column',
              overflowY: 'auto',
              flexShrink: 0,
            }}
          >
            {/* Sidebar Header */}
            <div style={{ padding: '14px 18px', borderBottom: '1px solid #E2E8F0', background: '#F8FAFC' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 style={{ fontSize: '13.5px', fontWeight: 700, color: '#0F172A', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Tag size={15} color="#0284C7" />
                  <span>Daftar Variabel ({tags.length})</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setShowManualModal(true)}
                  style={{
                    background: '#EFF6FF',
                    color: '#0284C7',
                    border: '1px solid #BFDBFE',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                  title="Tambah variabel dengan mengetik teks yang ingin diganti"
                >
                  <Plus size={12} />
                  <span>Ketik Manual</span>
                </button>
              </div>
              <p style={{ fontSize: '11.5px', color: '#64748B', margin: '4px 0 0 0' }}>
                Variabel yang telah Anda tandai akan menjadi kolom isian di formulir dan template Excel.
              </p>
            </div>

            {/* Suggested Placeholders Chips */}
            {suggestedTags.length > 0 && (
              <div style={{ padding: '12px 18px', borderBottom: '1px solid #E2E8F0', background: '#F8FAFC' }}>
                <div style={{ fontSize: '11px', fontWeight: 600, color: '#0284C7', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Sparkles size={13} />
                  <span>Saran Placeholder Dokumen:</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {suggestedTags.map((sug, idx) => {
                    const isAlreadyAdded = tags.some((t) => t.key === sug.key);
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleApplySuggestion(sug)}
                        disabled={isAlreadyAdded}
                        style={{
                          background: isAlreadyAdded ? '#F1F5F9' : '#EFF6FF',
                          color: isAlreadyAdded ? '#94A3B8' : '#0284C7',
                          border: isAlreadyAdded ? '1px solid #E2E8F0' : '1px solid #BFDBFE',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 500,
                          cursor: isAlreadyAdded ? 'default' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                        title={isAlreadyAdded ? 'Sudah ditambahkan' : `Klik untuk jadikan variabel: ${sug.label}`}
                      >
                        {isAlreadyAdded ? <CheckCircle2 size={11} color="#16A34A" /> : <Plus size={11} />}
                        <span>{sug.original_text}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tagged Items List */}
            <div style={{ flex: 1, padding: '14px 18px', overflowY: 'auto' }}>
              {tags.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 10px', color: '#94A3B8' }}>
                  <MousePointer size={28} style={{ margin: '0 auto 10px', opacity: 0.6, color: '#94A3B8' }} />
                  <p style={{ fontSize: '12.5px', margin: 0, fontWeight: 600, color: '#475569' }}>
                    Belum Ada Variabel Ditandai
                  </p>
                  <p style={{ fontSize: '11.5px', margin: '6px 0 0 0', lineHeight: 1.5, color: '#64748B' }}>
                    Tarik mouse di lembar dokumen putih sebelah kiri untuk menandai teks apa saja, atau klik salah satu saran placeholder di atas.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {tags.map((tag) => (
                    <div
                      key={tag.id}
                      style={{
                        background: '#FFFFFF',
                        border: '1px solid #CBD5E1',
                        borderLeft: '3px solid #0284C7',
                        borderRadius: '6px',
                        padding: '10px 12px',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span
                          style={{
                            background: '#EFF6FF',
                            color: '#1D4ED8',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 700,
                            fontFamily: 'monospace',
                            border: '1px solid #BFDBFE',
                          }}
                        >
                          {`{{ ${tag.key} }}`}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#94A3B8',
                            cursor: 'pointer',
                            padding: '2px',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = '#EF4444')}
                          onMouseLeave={(e) => (e.currentTarget.style.color = '#94A3B8')}
                          title="Hapus variabel ini dan kembalikan teks asli"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>

                      <div style={{ fontSize: '12px', fontWeight: 600, color: '#1E293B', marginTop: '2px' }}>
                        {tag.label}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', fontSize: '10.5px', color: '#64748B' }}>
                        <span style={{ textTransform: 'uppercase', background: '#F1F5F9', color: '#475569', fontWeight: 600, padding: '1px 5px', borderRadius: '3px' }}>
                          {tag.data_type}
                        </span>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '160px' }}>
                          Teks: "{tag.original_text}"
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer Summary */}
            <div style={{ padding: '12px 18px', borderTop: '1px solid #E2E8F0', background: '#F8FAFC', fontSize: '11px', color: '#64748B' }}>
              <span>Total <strong>{tags.length} variabel</strong> siap disimpan ke file Word.</span>
            </div>
          </div>
        </div>

        {/* Floating Variable Creator Popover */}
        {popover.visible && (
          <div
            className="popover-card"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'fixed',
              left: `${popover.x}px`,
              top: `${popover.y}px`,
              zIndex: 10005,
              width: '320px',
              background: '#FFFFFF',
              border: '2px solid #0284C7',
              borderRadius: '8px',
              padding: '14px',
              boxShadow: '0 12px 30px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(2, 132, 199, 0.1)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', fontWeight: 700, color: '#0F172A' }}>
                <Sparkles size={14} color="#0284C7" />
                <span>Jadikan Variabel Dinamis</span>
              </div>
              <button
                type="button"
                onClick={() => setPopover((prev) => ({ ...prev, visible: false }))}
                style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: 0 }}
              >
                <X size={15} />
              </button>
            </div>

            <div style={{ fontSize: '11.5px', color: '#475569', marginBottom: '10px', background: '#EFF6FF', border: '1px solid #BFDBFE', padding: '6px 8px', borderRadius: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              Teks Dipilih: <strong style={{ color: '#0284C7' }}>"{popover.selectedText}"</strong>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div>
                <label style={{ fontSize: '11px', color: '#475569', fontWeight: 600, display: 'block', marginBottom: '2px' }}>
                  Key Variabel (Jinja):
                </label>
                <input
                  ref={inputKeyRef}
                  type="text"
                  value={popover.key}
                  onChange={(e) => setPopover({ ...popover, key: e.target.value })}
                  placeholder="misal: nama_lengkap"
                  style={{
                    width: '100%',
                    padding: '6px 8px',
                    background: '#FFFFFF',
                    border: '1px solid #CBD5E1',
                    borderRadius: '4px',
                    color: '#0F172A',
                    fontSize: '12px',
                    fontFamily: 'monospace',
                    boxSizing: 'border-box',
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleApplyTag();
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', color: '#475569', fontWeight: 600, display: 'block', marginBottom: '2px' }}>
                  Label Tampilan di Formulir:
                </label>
                <input
                  type="text"
                  value={popover.label}
                  onChange={(e) => setPopover({ ...popover, label: e.target.value })}
                  placeholder="misal: Nama Lengkap Murid"
                  style={{
                    width: '100%',
                    padding: '6px 8px',
                    background: '#FFFFFF',
                    border: '1px solid #CBD5E1',
                    borderRadius: '4px',
                    color: '#0F172A',
                    fontSize: '12px',
                    boxSizing: 'border-box',
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleApplyTag();
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', color: '#475569', fontWeight: 600, display: 'block', marginBottom: '2px' }}>
                  Tipe Data:
                </label>
                <select
                  value={popover.dataType}
                  onChange={(e) => setPopover({ ...popover, dataType: e.target.value as any })}
                  style={{
                    width: '100%',
                    padding: '6px 8px',
                    background: '#FFFFFF',
                    border: '1px solid #CBD5E1',
                    borderRadius: '4px',
                    color: '#0F172A',
                    fontSize: '12px',
                    boxSizing: 'border-box',
                  }}
                >
                  <option value="string">Teks Singkat</option>
                  <option value="text_multiline">Teks Panjang / Paragraf</option>
                  <option value="number">Angka / Nilai</option>
                  <option value="date">Tanggal</option>
                  <option value="signature">Tanda Tangan Digital</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setPopover((prev) => ({ ...prev, visible: false }))}
                  style={{
                    flex: 1,
                    padding: '7px',
                    background: '#FFFFFF',
                    border: '1px solid #CBD5E1',
                    borderRadius: '4px',
                    color: '#475569',
                    fontSize: '11.5px',
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleApplyTag}
                  style={{
                    flex: 2,
                    padding: '7px',
                    background: '#0284C7',
                    border: 'none',
                    borderRadius: '4px',
                    color: '#FFFFFF',
                    fontSize: '11.5px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  ✓ Tambah Variabel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Ketik Manual Variabel */}
        {showManualModal && (
          <div
            className="modal-overlay"
            style={{ zIndex: 10010 }}
            onClick={() => setShowManualModal(false)}
          >
            <div
              className="modal-content"
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '380px',
                background: '#FFFFFF',
                border: '1px solid #CBD5E1',
                borderRadius: '8px',
                padding: '20px',
                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <h3 style={{ fontSize: '13.5px', fontWeight: 700, color: '#0F172A', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Edit3 size={15} color="#0284C7" />
                  <span>Tambah Variabel Manual</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setShowManualModal(false)}
                  style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}
                >
                  <X size={15} />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: '#475569', fontWeight: 600, display: 'block', marginBottom: '3px' }}>
                    Teks yang Ingin Diganti di Dokumen:
                  </label>
                  <input
                    type="text"
                    value={manualText}
                    onChange={(e) => {
                      setManualText(e.target.value);
                      if (!manualKey) setManualKey(formatToKey(e.target.value));
                      if (!manualLabel) setManualLabel(formatToLabel(e.target.value));
                    }}
                    placeholder="misal: [COMPANY NAME] atau Azzam"
                    style={{
                      width: '100%',
                      padding: '7px 9px',
                      background: '#FFFFFF',
                      border: '1px solid #CBD5E1',
                      borderRadius: '4px',
                      color: '#0F172A',
                      fontSize: '12px',
                      boxSizing: 'border-box',
                    }}
                    autoFocus
                  />
                </div>

                <div>
                  <label style={{ fontSize: '11px', color: '#475569', fontWeight: 600, display: 'block', marginBottom: '3px' }}>
                    Nama Key Variabel (Jinja):
                  </label>
                  <input
                    type="text"
                    value={manualKey}
                    onChange={(e) => setManualKey(e.target.value)}
                    placeholder="misal: company_name"
                    style={{
                      width: '100%',
                      padding: '7px 9px',
                      background: '#FFFFFF',
                      border: '1px solid #CBD5E1',
                      borderRadius: '4px',
                      color: '#0F172A',
                      fontSize: '12px',
                      fontFamily: 'monospace',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '11px', color: '#475569', fontWeight: 600, display: 'block', marginBottom: '3px' }}>
                    Label Formulir:
                  </label>
                  <input
                    type="text"
                    value={manualLabel}
                    onChange={(e) => setManualLabel(e.target.value)}
                    placeholder="misal: Nama Perusahaan"
                    style={{
                      width: '100%',
                      padding: '7px 9px',
                      background: '#FFFFFF',
                      border: '1px solid #CBD5E1',
                      borderRadius: '4px',
                      color: '#0F172A',
                      fontSize: '12px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '11px', color: '#475569', fontWeight: 600, display: 'block', marginBottom: '3px' }}>
                    Tipe Data:
                  </label>
                  <select
                    value={manualType}
                    onChange={(e) => setManualType(e.target.value as any)}
                    style={{
                      width: '100%',
                      padding: '7px 9px',
                      background: '#FFFFFF',
                      border: '1px solid #CBD5E1',
                      borderRadius: '4px',
                      color: '#0F172A',
                      fontSize: '12px',
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value="string">Teks Singkat</option>
                    <option value="text_multiline">Teks Panjang / Paragraf</option>
                    <option value="number">Angka / Nilai</option>
                    <option value="date">Tanggal</option>
                    <option value="signature">Tanda Tangan Digital</option>
                  </select>
                </div>

                <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setShowManualModal(false)}
                    style={{
                      flex: 1,
                      padding: '7px',
                      background: '#FFFFFF',
                      border: '1px solid #CBD5E1',
                      borderRadius: '4px',
                      color: '#475569',
                      fontSize: '12px',
                      cursor: 'pointer',
                    }}
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleApplyManualTag}
                    style={{
                      flex: 2,
                      padding: '7px',
                      background: '#0284C7',
                      border: 'none',
                      borderRadius: '4px',
                      color: '#FFFFFF',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    ✓ Tambahkan
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
