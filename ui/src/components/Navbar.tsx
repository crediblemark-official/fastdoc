import { FileText, Cpu } from 'lucide-react';
import type { SystemHealth } from '../types';

interface NavbarProps {
  systemHealth: SystemHealth | null;
}

export const Navbar = ({ systemHealth }: NavbarProps) => {
  return (
    <header className="navbar">
      <div className="brand">
        <div className="brand-icon">
          <FileText size={24} />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="brand-title">FastDoc</span>
            <span className="brand-badge">Desktop v1.0</span>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', margin: 0 }}>
            Universal Template-Preserving Document Automation
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div className="status-indicator">
          <span className="status-dot"></span>
          <span>{systemHealth ? 'Engine Lokal Aktif (127.0.0.1:8765)' : 'Menghubungkan ke Engine...'}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          <Cpu size={16} />
          <span>In-Place OpenXML</span>
        </div>
      </div>
    </header>
  );
};
