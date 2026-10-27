import { 
  ArrowLeft, 
  ArrowRight, 
  LayoutGrid, 
  List, 
  FileEdit, 
  RotateCw, 
  Search, 
  Home, 
  Folder, 
  Database,
  ChevronRight
} from 'lucide-react';

interface ExplorerNavbarProps {
  currentPath: string; // e.g. "Rapor TK Pembina" or "Master Data Lake"
  viewMode: 'grid' | 'table' | 'form';
  onViewModeChange: (mode: 'grid' | 'table' | 'form') => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onRefresh: () => void;
  onNavigateHome: () => void;
}

export const ExplorerNavbar = ({
  currentPath,
  viewMode,
  onViewModeChange,
  searchQuery,
  onSearchChange,
  onRefresh,
  onNavigateHome,
}: ExplorerNavbarProps) => {
  return (
    <header className="window-topbar">
      {/* Tombol Panah Navigasi */}
      <div className="nav-arrows">
        <button className="icon-btn" onClick={onNavigateHome} title="Kembali ke Beranda">
          <ArrowLeft size={15} />
        </button>
        <button className="icon-btn" disabled title="Maju">
          <ArrowRight size={15} />
        </button>
      </div>

      {/* Modern Segmented Breadcrumbs */}
      <nav className="path-bar" aria-label="Breadcrumb">
        <button className="path-crumb" onClick={onNavigateHome}>
          <Home size={14} color="var(--text-muted)" />
          <span>FastDoc</span>
        </button>
        <ChevronRight size={13} color="var(--text-disabled)" />

        <button className="path-crumb active">
          {currentPath.includes('Master') ? (
            <Database size={14} color="var(--accent-blue)" />
          ) : (
            <Folder size={14} color="#D97706" />
          )}
          <span>{currentPath}</span>
        </button>
      </nav>

      {/* Search Bar Minimalis */}
      <div className="explorer-search">
        <Search size={13} color="var(--text-dim)" />
        <input
          type="text"
          placeholder="Cari data..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      {/* View Mode Switcher (Grid / Table / Form) */}
      <div className="view-mode-group">
        <button
          className={`view-mode-btn ${viewMode === 'grid' ? 'active' : ''}`}
          onClick={() => onViewModeChange('grid')}
          title="Tampilan Ikon Grid"
        >
          <LayoutGrid size={14} />
        </button>
        <button
          className={`view-mode-btn ${viewMode === 'table' ? 'active' : ''}`}
          onClick={() => onViewModeChange('table')}
          title="Tampilan Detail Tabulasi"
        >
          <List size={14} />
        </button>
        <button
          className={`view-mode-btn ${viewMode === 'form' ? 'active' : ''}`}
          onClick={() => onViewModeChange('form')}
          title="Tampilan Formulir & Mention @"
        >
          <FileEdit size={14} />
        </button>
      </div>

      {/* Refresh Button */}
      <button className="icon-btn" onClick={onRefresh} title="Muat Ulang">
        <RotateCw size={14} />
      </button>
    </header>
  );
};
