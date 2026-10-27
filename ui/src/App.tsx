import { useState, useEffect, useRef } from 'react';
import { 
  FilePlus, 
  Upload, 
  Download, 
  Zap, 
  Trash2, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { ExplorerNavbar } from './components/ExplorerNavbar';
import { ExplorerSidebar } from './components/ExplorerSidebar';
import { ExplorerGrid } from './components/ExplorerGrid';
import { ExplorerTable } from './components/ExplorerTable';
import { ExplorerFormView } from './components/ExplorerFormView';
import { ExplorerImportModal } from './components/ExplorerImportModal';
import { MasterDataExplorer } from './components/MasterDataExplorer';
import { AICopilotModal } from './components/AICopilotModal';
import { DocumentPreviewModal } from './components/DocumentPreviewModal';
import { MasterSignatureExplorer } from './components/MasterSignatureExplorer';
import { VisualTemplateStudioModal } from './components/VisualTemplateStudioModal';
import { WorkspaceTemplateCard } from './components/WorkspaceTemplateCard';
import { TemplateVariablesModal } from './components/TemplateVariablesModal';
import { TemplateManagerModal } from './components/TemplateManagerModal';
import type { Workspace, WorkspaceRecord } from './types';

export function App() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string>('');
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null);
  const [isMasterDataActive, setIsMasterDataActive] = useState<boolean>(false);
  const [isSignaturesActive, setIsSignaturesActive] = useState<boolean>(false);
  const [masterEntitiesCount, setMasterEntitiesCount] = useState<number>(0);
  const [signaturesCount, setSignaturesCount] = useState<number>(0);

  const [viewMode, setViewMode] = useState<'grid' | 'table' | 'form'>('grid');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedRecordIds, setSelectedRecordIds] = useState<Set<string>>(new Set());
  const [editingRecord, setEditingRecord] = useState<WorkspaceRecord | null>(null);

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isUploadingTemplate, setIsUploadingTemplate] = useState(false);
  const [isGeneratingBatch, setIsGeneratingBatch] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // AI Copilot Modal State
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiFieldKey, setAiFieldKey] = useState('');

  // Document Preview Modal State
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [currentPreviewFormData, setCurrentPreviewFormData] = useState<Record<string, any> | null>(null);

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const templateFileInputRef = useRef<HTMLInputElement>(null);

  // Visual Template Studio State
  const [visualStudioOpen, setVisualStudioOpen] = useState(false);
  const [visualStudioData, setVisualStudioData] = useState<{
    tempId: string;
    filename: string;
    html: string;
    suggestedTags: any[];
  } | null>(null);
  const visualStudioFileInputRef = useRef<HTMLInputElement>(null);

  // Template Inspection & History Modals
  const [variablesModalOpen, setVariablesModalOpen] = useState(false);
  const [managerModalOpen, setManagerModalOpen] = useState(false);
  const [isAddSignatureModalOpen, setIsAddSignatureModalOpen] = useState(false);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // 1. Fetch workspaces and master entity count
  useEffect(() => {
    fetch('/api/workspaces')
      .then((res) => res.json())
      .then((res) => {
        if (res.status === 'success' && res.data.length > 0) {
          setWorkspaces(res.data);
          if (!activeWorkspaceId) {
            setActiveWorkspaceId(res.data[0].id);
          }
        }
      })
      .catch((err) => console.error('Gagal mengambil daftar workspace:', err));

    fetch('/api/entities')
      .then((res) => res.json())
      .then((res) => {
        if (res.status === 'success') {
          setMasterEntitiesCount(res.data.length);
        }
      })
      .catch((err) => console.error('Gagal mengambil data master:', err));

    fetch('/api/signatures')
      .then((res) => res.json())
      .then((res) => {
        if (res.status === 'success') {
          setSignaturesCount(res.data.length);
        }
      })
      .catch((err) => console.error('Gagal mengambil data tanda tangan:', err));
  }, [refreshKey]);

  // 2. Fetch full active workspace details (including records & templates)
  useEffect(() => {
    if (!activeWorkspaceId || isMasterDataActive || isSignaturesActive) return;
    fetch(`/api/workspaces/${activeWorkspaceId}`)
      .then((res) => res.json())
      .then((res) => {
        if (res.status === 'success') {
          setActiveWorkspace(res.data);
          setSelectedRecordIds(new Set()); // Reset selections on workspace change
        }
      })
      .catch((err) => console.error('Gagal mengambil detail workspace:', err));
  }, [activeWorkspaceId, isMasterDataActive, isSignaturesActive, refreshKey]);

  // Switch to Master Data View
  const handleSelectMasterData = () => {
    setIsMasterDataActive(true);
    setIsSignaturesActive(false);
    setViewMode('table');
  };

  // Switch to Master Signatures View
  const handleSelectSignatures = () => {
    setIsSignaturesActive(true);
    setIsMasterDataActive(false);
    setViewMode('table');
  };

  // Switch to a Workspace
  const handleSelectWorkspace = (id: string) => {
    setIsMasterDataActive(false);
    setIsSignaturesActive(false);
    setActiveWorkspaceId(id);
    if (viewMode === 'form') {
      setViewMode('grid');
      setEditingRecord(null);
    }
  };

  // Create Workspace
  const handleCreateWorkspace = async (name: string, description: string, category: string) => {
    try {
      const res = await fetch('/api/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, category }),
      });
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        showToast(`Workspace "${name}" berhasil dibuat!`, 'success');
        setRefreshKey((k) => k + 1);
        setActiveWorkspaceId(data.data.id);
        setIsMasterDataActive(false);
      } else {
        showToast(data.detail || 'Gagal membuat workspace', 'error');
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Upload Word Template (.docx)
  const handleUploadTemplate = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !activeWorkspaceId) return;
    const file = e.target.files[0];
    setIsUploadingTemplate(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`/api/workspaces/${activeWorkspaceId}/templates`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        showToast(`Template Word "${file.name}" berhasil dipindai dan dipasang!`, 'success');
        setRefreshKey((k) => k + 1);
      } else {
        showToast(data.detail || 'Gagal memproses template Word', 'error');
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsUploadingTemplate(false);
      if (templateFileInputRef.current) templateFileInputRef.current.value = '';
    }
  };

  // Buka file .docx ke dalam Visual Template Studio (Word-like Mapper)
  const handleOpenVisualStudioFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !activeWorkspaceId) return;
    const file = e.target.files[0];
    setIsUploadingTemplate(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`/api/workspaces/${activeWorkspaceId}/preview-docx-html`, {
        method: 'POST',
        body: formData,
      });
      const json = await res.json();
      if (res.ok && json.status === 'success') {
        setVisualStudioData({
          tempId: json.data.temp_id,
          filename: json.data.filename,
          html: json.data.html,
          suggestedTags: json.data.suggested_tags || [],
        });
        setVisualStudioOpen(true);
      } else {
        showToast(json.detail || 'Gagal memuat pratinjau dokumen untuk studio', 'error');
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsUploadingTemplate(false);
      if (visualStudioFileInputRef.current) visualStudioFileInputRef.current.value = '';
    }
  };

  // Buka template yang sedang aktif langsung ke dalam Visual Studio (tanpa upload ulang)
  const handleOpenStudioForActiveTemplate = async () => {
    if (!activeWorkspaceId) return;
    setIsUploadingTemplate(true);
    try {
      const res = await fetch(`/api/workspaces/${activeWorkspaceId}/active-template/open-studio`, {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        setVisualStudioData({
          tempId: data.data.temp_id,
          filename: data.data.filename,
          html: data.data.html,
          suggestedTags: data.data.suggested_tags || [],
        });
        setVisualStudioOpen(true);
      } else {
        showToast(data.detail || 'Gagal membuka template di Studio', 'error');
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsUploadingTemplate(false);
    }
  };

  // Ganti template aktif dari riwayat workspace
  const handleSetActiveTemplate = async (templateId: string) => {
    if (!activeWorkspaceId) return;
    try {
      const res = await fetch(`/api/workspaces/${activeWorkspaceId}/active-template/${templateId}`, {
        method: 'PUT',
      });
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        setActiveWorkspace(data.data);
        showToast('Template aktif berhasil diganti!', 'success');
        setRefreshKey((k) => k + 1);
      } else {
        showToast(data.detail || 'Gagal mengganti template', 'error');
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Hapus versi template dari riwayat workspace
  const handleDeleteTemplate = async (templateId: string) => {
    if (!activeWorkspaceId) return;
    try {
      const res = await fetch(`/api/workspaces/${activeWorkspaceId}/templates/${templateId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        setActiveWorkspace(data.data);
        showToast('Template berhasil dihapus dari workspace', 'success');
        setRefreshKey((k) => k + 1);
      } else {
        showToast(data.detail || 'Gagal menghapus template', 'error');
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Toggle selection
  const handleToggleSelect = (id: string) => {
    setSelectedRecordIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Toggle Select All
  const handleToggleSelectAll = () => {
    if (!activeWorkspace?.records) return;
    if (selectedRecordIds.size === activeWorkspace.records.length) {
      setSelectedRecordIds(new Set());
    } else {
      setSelectedRecordIds(new Set(activeWorkspace.records.map((r) => r.id)));
    }
  };

  // Open Record in Form View
  const handleOpenRecord = (record: WorkspaceRecord) => {
    setEditingRecord(record);
    setViewMode('form');
  };

  // Create New Record in Form View
  const handleNewRecord = () => {
    setEditingRecord(null);
    setViewMode('form');
  };

  // Save Record (Insert or Update)
  const handleSaveRecord = async (formData: Record<string, any>) => {
    if (!activeWorkspaceId) return;

    if (editingRecord) {
      // Update
      const res = await fetch(`/api/workspaces/${activeWorkspaceId}/records/${editingRecord.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: formData }),
      });
      if (res.ok) {
        showToast('Data berhasil diperbarui!', 'success');
        setRefreshKey((k) => k + 1);
      } else {
        showToast('Gagal memperbarui data', 'error');
      }
    } else {
      // Create
      const res = await fetch(`/api/workspaces/${activeWorkspaceId}/records`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: formData }),
      });
      if (res.ok) {
        showToast('Data baru berhasil disimpan ke workspace & database master!', 'success');
        setRefreshKey((k) => k + 1);
        setViewMode('grid');
      } else {
        showToast('Gagal menyimpan data baru', 'error');
      }
    }
  };

  // Delete Single Record
  const handleDeleteRecord = async (recordId: string) => {
    if (!activeWorkspaceId) return;
    if (!confirm('Yakin ingin menghapus dokumen ini dari workspace?')) return;

    try {
      const res = await fetch(`/api/workspaces/${activeWorkspaceId}/records/${recordId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        showToast('Dokumen berhasil dihapus dari workspace', 'success');
        setRefreshKey((k) => k + 1);
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Bulk Delete Selected
  const handleDeleteSelected = async () => {
    if (!activeWorkspaceId || selectedRecordIds.size === 0) return;
    if (!confirm(`Hapus ${selectedRecordIds.size} dokumen terpilih dari workspace?`)) return;

    for (const id of Array.from(selectedRecordIds)) {
      await fetch(`/api/workspaces/${activeWorkspaceId}/records/${id}`, { method: 'DELETE' });
    }
    showToast(`${selectedRecordIds.size} dokumen berhasil dihapus`, 'success');
    setSelectedRecordIds(new Set());
    setRefreshKey((k) => k + 1);
  };

  // Download Single Docx / PDF
  const handleDownloadSingle = (record?: WorkspaceRecord | null, formData?: Record<string, any>, format: string = 'docx') => {
    if (!activeWorkspaceId) return;
    if (record?.id) {
      window.open(`/api/workspaces/${activeWorkspaceId}/records/${record.id}/generate?format=${format}`, '_blank');
    } else if (formData) {
      showToast('Simpan data terlebih dahulu sebelum mengunduh', 'error');
    }
  };

  // Preview Document Sheet Instantly
  const handlePreviewDocument = async (formData: Record<string, any>) => {
    if (!activeWorkspaceId) return;
    setCurrentPreviewFormData(formData);
    setPreviewLoading(true);
    setPreviewModalOpen(true);
    try {
      const res = await fetch(`/api/workspaces/${activeWorkspaceId}/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: formData }),
      });
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        setPreviewHtml(data.data.html);
      } else {
        throw new Error(data.detail || 'Gagal menghasilkan pratinjau dokumen');
      }
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally {
      setPreviewLoading(false);
    }
  };

  // Batch Generate Selected Records into ZIP
  const handleGenerateBatchSelected = async () => {
    if (!activeWorkspaceId) return;
    const ids = Array.from(selectedRecordIds);
    if (ids.length === 0) {
      showToast('Pilih setidaknya 1 dokumen menggunakan checkbox untuk cetak massal', 'error');
      return;
    }

    setIsGeneratingBatch(true);
    try {
      const res = await fetch(`/api/workspaces/${activeWorkspaceId}/generate-selected`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ record_ids: ids }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Gagal menghasilkan berkas ZIP');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Batch_${(activeWorkspace?.name || 'Dokumen').replace(/\s+/g, '_')}_${ids.length}_Dokumen.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      showToast(`Berhasil mencetak ${ids.length} dokumen dalam format ZIP!`, 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsGeneratingBatch(false);
    }
  };

  // AI Copilot synthesis trigger
  const handleOpenAICopilot = (fieldKey: string) => {
    setAiFieldKey(fieldKey);
    setAiModalOpen(true);
  };

  // Apply narrative from AI Copilot
  const handleApplyNarrative = (text: string) => {
    if (editingRecord) {
      setEditingRecord({
        ...editingRecord,
        data: { ...editingRecord.data, [aiFieldKey]: text },
      });
    }
    setAiModalOpen(false);
    showToast('Narasi AI berhasil dimasukkan ke formulir!', 'success');
  };

  // Filter records by search
  const records = activeWorkspace?.records || [];
  const filteredRecords = records.filter((r) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.display_name.toLowerCase().includes(q) ||
      Object.values(r.data).some((v) => String(v).toLowerCase().includes(q))
    );
  });

  const activeTemplate = activeWorkspace?.templates?.[0];
  const currentPathTitle = isSignaturesActive
    ? 'Master Registry: Tanda Tangan Digital'
    : isMasterDataActive
    ? 'Master Registry Data Lake'
    : (activeWorkspace?.name || 'Workspace');

  return (
    <div className="explorer-window">
      {/* 1. Window Top Navigation & Path Bar */}
      <ExplorerNavbar
        currentPath={currentPathTitle}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onRefresh={() => setRefreshKey((k) => k + 1)}
        onNavigateHome={() => {
          setIsMasterDataActive(false);
          setIsSignaturesActive(false);
          setViewMode('grid');
        }}
        isSignaturesActive={isSignaturesActive}
        onAddSignature={() => setIsAddSignatureModalOpen(true)}
      />

      {/* 2. Main Body: Left Sidebar + Center Canvas */}
      <div className="explorer-body">
        {/* Left Sidebar Tree */}
        <ExplorerSidebar
          workspaces={workspaces}
          activeWorkspaceId={activeWorkspaceId}
          onSelectWorkspace={handleSelectWorkspace}
          onSelectMasterData={handleSelectMasterData}
          isMasterDataActive={isMasterDataActive}
          onSelectSignatures={handleSelectSignatures}
          isSignaturesActive={isSignaturesActive}
          onCreateWorkspace={handleCreateWorkspace}
          totalMasterEntities={masterEntitiesCount}
          totalSignatures={signaturesCount}
        />

        {/* Center Canvas */}
        <main className="explorer-canvas">
          {/* Action Toolbar (Utilitarian Desktop Style) */}
          {!isMasterDataActive && !isSignaturesActive && (
            <div className="canvas-toolbar">
              <div className="toolbar-left">
                {/* Tombol Input Data Baru */}
                <button className="btn-tool primary" onClick={handleNewRecord}>
                  <FilePlus size={14} />
                  <span>+ Data Baru</span>
                </button>

                {/* Tombol Impor Data Excel */}
                <button
                  className="btn-tool"
                  onClick={() => setIsImportModalOpen(true)}
                  disabled={!activeTemplate}
                  title={activeTemplate ? 'Impor data spreadsheet (.xlsx)' : 'Unggah template Word terlebih dahulu'}
                >
                  <Upload size={14} color="var(--accent-emerald)" />
                  <span>Impor Excel</span>
                </button>

                <div className="toolbar-divider" />

                {/* Tombol Studio Pembuat Template Interaktif */}
                <button
                  className="btn-tool"
                  onClick={() => {
                    if (activeTemplate) {
                      handleOpenStudioForActiveTemplate();
                    } else {
                      visualStudioFileInputRef.current?.click();
                    }
                  }}
                  disabled={isUploadingTemplate}
                  style={{ background: 'rgba(56, 189, 248, 0.12)', border: '1px solid rgba(56, 189, 248, 0.4)' }}
                  title={activeTemplate ? "Buka template aktif ini ke Visual Studio untuk mengedit variabel" : "Buka dokumen Word ke Visual Studio untuk klik dan tentukan variabel"}
                >
                  <Sparkles size={14} color="#0284C7" />
                  <span style={{ color: '#0284C7', fontWeight: 600 }}>Studio Template Word</span>
                </button>
                <input
                  type="file"
                  ref={visualStudioFileInputRef}
                  onChange={handleOpenVisualStudioFile}
                  accept=".docx"
                  style={{ display: 'none' }}
                />

                {/* Tombol Pasang / Ganti Template Word */}
                <button
                  className="btn-tool"
                  onClick={() => templateFileInputRef.current?.click()}
                  disabled={isUploadingTemplate}
                  title={activeTemplate ? "Ganti atau pasang file template Word (.docx) baru" : "Pasang template berkas Word (.docx) untuk workspace ini"}
                >
                  <FileSpreadsheet size={14} color="var(--accent-blue)" />
                  <span>{isUploadingTemplate ? 'Memproses...' : activeTemplate ? 'Ganti Template' : 'Pasang Template Word'}</span>
                </button>
                <input
                  type="file"
                  ref={templateFileInputRef}
                  onChange={handleUploadTemplate}
                  accept=".docx"
                  style={{ display: 'none' }}
                />

                {/* Tombol Unduh Format Template Excel */}
                {activeTemplate && (
                  <button
                    className="btn-tool"
                    onClick={() => window.open(`/api/workspaces/${activeWorkspaceId}/excel-template`, '_blank')}
                    title="Unduh tabel Excel kosong yang kolomnya otomatis cocok 100% dengan dokumen ini"
                  >
                    <Download size={14} color="var(--accent-emerald)" />
                    <span>Format Excel</span>
                  </button>
                )}
              </div>

              <div className="toolbar-right">
                {/* Generate Terpilih (ZIP) */}
                {selectedRecordIds.size > 0 && (
                  <>
                    <span style={{ fontSize: '11.5px', color: 'var(--accent-blue)', fontWeight: 600, background: '#EFF6FF', padding: '4px 10px', borderRadius: '12px' }}>
                      {selectedRecordIds.size} item dipilih
                    </span>

                    <button
                      className="btn-tool primary"
                      onClick={handleGenerateBatchSelected}
                      disabled={isGeneratingBatch}
                    >
                      <Zap size={13} />
                      <span>{isGeneratingBatch ? 'Mengekstrak...' : 'Cetak Terpilih (ZIP)'}</span>
                    </button>

                    <button
                      className="btn-tool"
                      onClick={handleDeleteSelected}
                      style={{ color: 'var(--accent-rose)', borderColor: '#FECACA' }}
                    >
                      <Trash2 size={13} />
                      <span>Hapus</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Canvas Scroll View */}
          <div className="canvas-scroll-view">
            {isSignaturesActive ? (
              <MasterSignatureExplorer
                onBackToWorkspace={() => setIsSignaturesActive(false)}
                onNotify={showToast}
                searchQuery={searchQuery}
                refreshTrigger={refreshKey}
                isAddModalOpen={isAddSignatureModalOpen}
                onOpenAddModal={() => setIsAddSignatureModalOpen(true)}
                onCloseAddModal={() => setIsAddSignatureModalOpen(false)}
                onSignatureAdded={() => {
                  setRefreshKey((k) => k + 1);
                  fetch('/api/signatures')
                    .then((res) => res.json())
                    .then((res) => {
                      if (res.status === 'success') setSignaturesCount(res.data.length);
                    });
                }}
              />
            ) : isMasterDataActive ? (
              <MasterDataExplorer searchQuery={searchQuery} onRefreshTrigger={refreshKey} />
            ) : (
              <>
                {/* Hero / Banner Kartu Template Aktif */}
                {activeWorkspace && (
                  <WorkspaceTemplateCard
                    workspace={activeWorkspace}
                    activeTemplate={activeTemplate}
                    onOpenVariables={() => setVariablesModalOpen(true)}
                    onOpenManager={() => setManagerModalOpen(true)}
                    onOpenStudioDirect={handleOpenStudioForActiveTemplate}
                    onOpenStudioFilePicker={() => visualStudioFileInputRef.current?.click()}
                    onUploadTemplatePicker={() => templateFileInputRef.current?.click()}
                    onPreviewTemplate={() => handlePreviewDocument({})}
                    onDownloadExcelTemplate={() => window.open(`/api/workspaces/${activeWorkspaceId}/excel-template`, '_blank')}
                    isProcessingStudio={isUploadingTemplate}
                  />
                )}

                {viewMode === 'form' ? (
                  activeWorkspace ? (
                    <ExplorerFormView
                      workspace={activeWorkspace}
                      record={editingRecord}
                      onSave={handleSaveRecord}
                      onBack={() => setViewMode('grid')}
                      onOpenAICopilot={handleOpenAICopilot}
                      onDownloadDocx={(recId, fData) => {
                        if (recId) handleDownloadSingle(editingRecord, undefined, 'docx');
                        else handleDownloadSingle(null, fData, 'docx');
                      }}
                      onDownloadPdf={(recId, fData) => {
                        if (recId) handleDownloadSingle(editingRecord, undefined, 'pdf');
                        else handleDownloadSingle(null, fData, 'pdf');
                      }}
                      onPreview={handlePreviewDocument}
                    />
                  ) : null
                ) : viewMode === 'table' ? (
                  <ExplorerTable
                    records={filteredRecords}
                    selectedIds={selectedRecordIds}
                    onToggleSelect={handleToggleSelect}
                    onToggleSelectAll={handleToggleSelectAll}
                    onOpenRecord={handleOpenRecord}
                    onDownloadSingle={handleDownloadSingle}
                    onDeleteRecord={handleDeleteRecord}
                  />
                ) : (
                  <ExplorerGrid
                    records={filteredRecords}
                    selectedIds={selectedRecordIds}
                    onToggleSelect={handleToggleSelect}
                    onOpenRecord={handleOpenRecord}
                  />
                )}
              </>
            )}
          </div>
        </main>
      </div>

      {/* 3. Window Statusbar di Bagian Bawah */}
      <footer className="window-statusbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontWeight: 500 }}>
            {isSignaturesActive
              ? `${signaturesCount} tanda tangan tersimpan`
              : isMasterDataActive 
              ? `${masterEntitiesCount} entitas master` 
              : `${records.length} item`}
          </span>

          {!isMasterDataActive && !isSignaturesActive && (
            <>
              <span style={{ color: 'var(--border-subtle)' }}>•</span>
              <span style={{
                color: selectedRecordIds.size > 0 ? 'var(--accent-blue)' : 'var(--text-dim)',
                fontWeight: selectedRecordIds.size > 0 ? 600 : 400,
              }}>
                {selectedRecordIds.size} dipilih
              </span>
            </>
          )}

          {activeTemplate && !isMasterDataActive && (
            <>
              <span style={{ color: 'var(--border-subtle)' }}>•</span>
              <span
                style={{ color: 'var(--text-muted)', cursor: 'pointer' }}
                onClick={() => setVariablesModalOpen(true)}
                title="Klik untuk membuka rincian variabel template"
              >
                Template Aktif: <strong style={{ color: 'var(--accent-blue)', fontWeight: 600 }}>{activeTemplate.filename}</strong> ({activeTemplate.schema.total_variables} variabel)
              </span>
            </>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <span style={{ color: 'var(--text-dim)' }}>FastDoc Engine v1.0.0</span>
          <span style={{ color: 'var(--accent-emerald)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
            ● SQLite Ready
          </span>
        </div>
      </footer>

      {/* 5. Modals */}
      {isImportModalOpen && activeWorkspace && (
        <ExplorerImportModal
          workspaceId={activeWorkspace.id}
          workspaceName={activeWorkspace.name}
          onClose={() => setIsImportModalOpen(false)}
          onImportSuccess={(msg) => {
            showToast(msg, 'success');
            setRefreshKey((k) => k + 1);
          }}
        />
      )}

      {aiModalOpen && (
        <AICopilotModal
          isOpen={aiModalOpen}
          onClose={() => setAiModalOpen(false)}
          onApplyNarrative={handleApplyNarrative}
          targetFieldKey={aiFieldKey}
          defaultSubjectName={editingRecord?.display_name || 'Murid'}
        />
      )}

      {previewModalOpen && (
        <DocumentPreviewModal
          isOpen={previewModalOpen}
          onClose={() => setPreviewModalOpen(false)}
          htmlContent={previewHtml}
          templateName={activeWorkspace?.templates?.[0]?.filename || 'Pratinjau Dokumen'}
          isLoading={previewLoading}
          onDownloadDocx={() => {
            if (editingRecord?.id) handleDownloadSingle(editingRecord, undefined, 'docx');
            else if (currentPreviewFormData) handleDownloadSingle(null, currentPreviewFormData, 'docx');
          }}
          onDownloadPdf={() => {
            if (editingRecord?.id) handleDownloadSingle(editingRecord, undefined, 'pdf');
            else if (currentPreviewFormData) handleDownloadSingle(null, currentPreviewFormData, 'pdf');
          }}
        />
      )}

      {/* Visual Template Studio Modal (Word-like Field Mapper) */}
      {visualStudioOpen && visualStudioData && activeWorkspace && (
        <VisualTemplateStudioModal
          isOpen={visualStudioOpen}
          onClose={() => setVisualStudioOpen(false)}
          workspaceId={activeWorkspace.id}
          tempId={visualStudioData.tempId}
          filename={visualStudioData.filename}
          initialHtml={visualStudioData.html}
          suggestedTags={visualStudioData.suggestedTags}
          onSuccess={(updatedWs) => {
            setActiveWorkspace(updatedWs);
            showToast(`Template Word "${visualStudioData.filename}" berhasil dibuat dan diaktifkan!`, 'success');
            setRefreshKey((k) => k + 1);
          }}
        />
      )}

      {/* Template Variables Modal */}
      {variablesModalOpen && activeTemplate && (
        <TemplateVariablesModal
          template={activeTemplate}
          onClose={() => setVariablesModalOpen(false)}
          onOpenStudio={handleOpenStudioForActiveTemplate}
          onDownloadExcel={() => window.open(`/api/workspaces/${activeWorkspaceId}/excel-template`, '_blank')}
        />
      )}

      {/* Template Manager / Switcher Modal */}
      {managerModalOpen && activeWorkspace && (
        <TemplateManagerModal
          templates={activeWorkspace.templates || []}
          activeTemplateId={activeTemplate?.id}
          workspaceName={activeWorkspace.name}
          onClose={() => setManagerModalOpen(false)}
          onSelectActiveTemplate={handleSetActiveTemplate}
          onDeleteTemplate={handleDeleteTemplate}
          onUploadNew={() => templateFileInputRef.current?.click()}
          onOpenStudio={handleOpenStudioForActiveTemplate}
          onPreviewTemplate={() => handlePreviewDocument({})}
        />
      )}

      {/* Floating Toast Notification */}
      {toast && (
        <div className={`toast ${toast.type}`}>
          {toast.type === 'success' ? (
            <CheckCircle2 size={16} color="var(--accent-emerald)" />
          ) : (
            <AlertCircle size={16} color="var(--accent-rose)" />
          )}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}

export default App;
