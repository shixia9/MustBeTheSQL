import { useState, useEffect, useRef, useMemo } from 'react';
import { Table2, ChevronDown, Search, X } from 'lucide-react';
import { api } from '../../api/client';

interface TableSelectorProps {
  connectionId: number | null;
  schemaName: string | null;
  selectedTables: string[];
  onChange: (tables: string[]) => void;
}

interface TableInfo {
  name: string;
  comment?: string;
}

export default function TableSelector({ connectionId, schemaName, selectedTables, onChange }: TableSelectorProps) {
  const [open, setOpen] = useState(false);
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch tables when connection/schema changes
  useEffect(() => {
    if (!connectionId) { setTables([]); return; }
    setLoading(true);
    const params = new URLSearchParams({ connectionId: String(connectionId) });
    if (schemaName) params.set('schemaName', schemaName);
    api.get<any[]>(`/schema/tables?${params}`)
      .then(res => {
        if (res.code === 200 && Array.isArray(res.data)) {
          setTables(res.data.map((t: any) => ({ name: t.name || t, comment: t.comment })));
        } else {
          setTables([]);
        }
      })
      .catch(() => setTables([]))
      .finally(() => setLoading(false));
  }, [connectionId, schemaName]);

  // Clear selected when connection/schema changes
  useEffect(() => {
    onChange([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectionId, schemaName]);

  // Reset filter on close
  useEffect(() => {
    if (!open) setFilter('');
  }, [open]);

  // Focus search on open
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  const filtered = useMemo(() => {
    if (!filter.trim()) return tables;
    const q = filter.toLowerCase();
    return tables.filter(t =>
      t.name.toLowerCase().includes(q) ||
      (t.comment && t.comment.toLowerCase().includes(q))
    );
  }, [tables, filter]);

  const toggleTable = (name: string) => {
    if (selectedTables.includes(name)) {
      onChange(selectedTables.filter(n => n !== name));
    } else {
      onChange([...selectedTables, name]);
    }
  };

  const pillLabel = selectedTables.length === 0
    ? 'All tables'
    : `${selectedTables.length} table${selectedTables.length > 1 ? 's' : ''}`;

  return (
    <div className="relative" data-dropdown>
      <button
        onClick={() => setOpen(!open)}
        disabled={!connectionId}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors"
        style={{
          fontSize: '11.5px', fontWeight: 500,
          background: open ? 'var(--color-primary-soft)' : 'transparent',
          color: selectedTables.length > 0 ? 'var(--color-primary)' : 'var(--color-ink)',
          border: '1px solid var(--color-border-subtle)',
          fontFamily: '"Inter", ui-sans-serif, system-ui, -apple-system, sans-serif',
          letterSpacing: '-0.01em',
          opacity: !connectionId ? 0.5 : 1,
        }}
        title={selectedTables.length > 0 ? selectedTables.join(', ') : undefined}
      >
        <Table2 size={12} style={{ color: 'var(--color-primary)', opacity: 0.8 }} />
        <span className="max-w-[110px] truncate">{pillLabel}</span>
        {selectedTables.length > 0 && (
          <span className="text-[10px] px-1 rounded-sm" style={{ background: 'var(--color-primary-soft)', color: 'var(--color-primary)', lineHeight: '1.4' }}>
            {selectedTables.length}
          </span>
        )}
        <ChevronDown size={10} style={{ color: 'var(--color-ink-tertiary)', transition: 'transform 150ms', transform: open ? 'rotate(180deg)' : 'rotate(0)' }} />
      </button>
      {open && (
        <div className="absolute bottom-full left-0 mb-1 w-64 rounded-lg z-50 overflow-hidden"
          style={{ background: 'var(--color-panel-bg)', border: '1px solid var(--color-border-default)', boxShadow: '0 -4px 16px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.04)' }}>
          {/* Search */}
          <div className="px-2 pt-2 pb-1">
            <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-md" style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border-subtle)' }}>
              <Search size={12} style={{ color: 'var(--color-ink-tertiary)', flexShrink: 0 }} />
              <input
                ref={inputRef}
                value={filter}
                onChange={e => setFilter(e.target.value)}
                placeholder="过滤表名..."
                className="w-full bg-transparent outline-none"
                style={{ fontSize: '12px', color: 'var(--color-ink)', fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif' }}
              />
              {filter && (
                <button onClick={() => setFilter('')} className="flex-shrink-0" style={{ color: 'var(--color-ink-tertiary)' }}>
                  <X size={12} />
                </button>
              )}
            </div>
          </div>
          {/* Table list */}
          <div className="max-h-56 overflow-y-auto py-1">
            {loading && (
              <div className="px-3 py-2 text-[11px]" style={{ color: 'var(--color-ink-tertiary)' }}>加载中...</div>
            )}
            {!loading && filtered.length === 0 && (
              <div className="px-3 py-2 text-[11px]" style={{ color: 'var(--color-ink-tertiary)' }}>
                {filter ? '无匹配表' : '无可用表'}
              </div>
            )}
            {!loading && filtered.map(t => (
              <label
                key={t.name}
                className="flex items-center gap-2 px-3 py-1.5 cursor-pointer transition-colors hover:opacity-90"
                style={{ fontSize: '12px', color: 'var(--color-ink)' }}
              >
                <input
                  type="checkbox"
                  checked={selectedTables.includes(t.name)}
                  onChange={() => toggleTable(t.name)}
                  className="rounded flex-shrink-0"
                  style={{ accentColor: 'var(--color-primary)', width: '14px', height: '14px' }}
                />
                <span className="font-mono truncate" style={{ fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: '12px' }}>
                  {t.name}
                </span>
                {t.comment && (
                  <span className="truncate flex-shrink min-w-0 ml-auto text-right" style={{ color: 'var(--color-ink-tertiary)', fontSize: '10.5px', maxWidth: '100px' }}>
                    {t.comment}
                  </span>
                )}
              </label>
            ))}
          </div>
          {/* Footer */}
          <div className="flex items-center justify-between px-3 py-1.5" style={{ borderTop: '0.5px solid var(--color-border-subtle)' }}>
            <span style={{ fontSize: '10.5px', color: 'var(--color-ink-tertiary)' }}>
              已选 {selectedTables.length}/{tables.length}
            </span>
            {selectedTables.length > 0 && (
              <button
                onClick={() => onChange([])}
                className="text-[10.5px] font-medium transition-colors"
                style={{ color: 'var(--color-ink-tertiary)' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-ink)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-ink-tertiary)')}
              >
                清除全部
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
