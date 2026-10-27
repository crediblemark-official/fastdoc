import { Tag, Sparkles, Table2, Calendar, Hash, AlignLeft } from 'lucide-react';
import type { VariableMeta } from '../types';

interface VariableInspectorProps {
  variables: VariableMeta[];
}

export const VariableInspector = ({ variables }: VariableInspectorProps) => {
  if (variables.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '24px 12px', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
        Belum ada template yang dipindai. Unggah file .docx di atas untuk melihat variabel.
      </div>
    );
  }

  const getIcon = (type: string, isAi: boolean) => {
    if (isAi) return <Sparkles size={12} color="var(--accent-purple)" />;
    switch (type) {
      case 'number': return <Hash size={12} color="var(--accent-amber)" />;
      case 'date': return <Calendar size={12} color="var(--accent-cyan)" />;
      case 'table': return <Table2 size={12} color="var(--primary)" />;
      case 'text_multiline': return <AlignLeft size={12} color="var(--accent-purple)" />;
      default: return <Tag size={12} color="var(--text-muted)" />;
    }
  };

  return (
    <div className="variables-section">
      <div className="variables-title">
        <span>Variabel Terdeteksi ({variables.length})</span>
        <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-dim)' }}>Auto Schema</span>
      </div>

      <div className="variable-pills">
        {variables.map((v) => (
          <div key={v.key} className={`var-pill ${v.is_ai_candidate ? 'ai' : ''}`} title={v.raw_tag}>
            {getIcon(v.data_type, v.is_ai_candidate)}
            <span>{v.key}</span>
            {v.filters_used.length > 0 && (
              <span style={{ opacity: 0.6, fontSize: '0.65rem' }}>
                | {v.filters_used.join(', ')}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
