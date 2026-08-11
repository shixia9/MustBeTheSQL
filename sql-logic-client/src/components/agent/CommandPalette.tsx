import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Wrench, Sparkles, Plug, ChevronUp, ChevronDown, CornerDownLeft, X } from 'lucide-react';
import type { ToolItem, ToolKind } from '../../types/agent';

/**
 * "/" command palette (Phase 5 / T7.2).
 *
 * Floating panel rendered above the chat input. Lists every {@link ToolItem}
 * surfaced by `GET /api/v1/tools`, filtered by a fuzzy query, grouped by kind
 * (内置工具 / 技能 / MCP 工具). Keyboard navigation (↑/↓/Enter/Esc) is handled
 * via a window `keydown` listener attached while the palette is mounted; the
 * parent input is expected to short-circuit those keys when the palette is open
 * (see ChatPage) so Enter doesn't double-fire as a chat submit.
 *
 * Entry animation matches {@link CompactionPanel} (opacity 0→1, y 8→0, ~200ms).
 */

/** Soft cap on displayed rows so the panel never grows unbounded. */
const MAX_EMPTY = 20;
const MAX_QUERY = 30;

/** Section labels + ordering per kind. */
const KIND_META: { kind: ToolKind; label: string; Icon: typeof Wrench }[] = [
  { kind: 'builtin', label: '内置工具', Icon: Wrench },
  { kind: 'skill', label: '技能', Icon: Sparkles },
  { kind: 'mcp', label: 'MCP 工具', Icon: Plug },
];

export interface CommandPaletteProps {
  items: ToolItem[];
  query: string;
  onSelect: (item: ToolItem) => void;
  onClose: () => void;
}

/** Subsequence fuzzy score; returns null when the query doesn't match. */
function fuzzyScore(query: string, text: string): number | null {
  if (!query) return 0;
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  // Substring match ranks highest; earlier + shorter wins.
  const subIdx = t.indexOf(q);
  if (subIdx >= 0) return 1000 - subIdx - t.length * 0.01;
  // Fall back to subsequence match with a gap penalty.
  let qi = 0;
  let prev = -1;
  let gaps = 0;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) {
      if (prev >= 0) gaps += ti - prev - 1;
      prev = ti;
      qi++;
    }
  }
  return qi === q.length ? 100 - gaps - t.length * 0.01 : null;
}

/** Best fuzzy score across name / displayName / description (name weighted). */
function scoreItem(query: string, item: ToolItem): number | null {
  if (!query) return 0;
  const fields: { text: string; bonus: number }[] = [
    { text: item.name, bonus: 50 },
    { text: item.displayName ?? '', bonus: 20 },
    { text: item.description ?? '', bonus: 0 },
  ];
  let best: number | null = null;
  for (const f of fields) {
    if (!f.text) continue;
    const s = fuzzyScore(query, f.text);
    if (s !== null) {
      const w = s + f.bonus;
      if (best === null || w > best) best = w;
    }
  }
  return best;
}

export default function CommandPalette({ items, query, onSelect, onClose }: CommandPaletteProps) {
  // Flat filtered + scored list (sorted desc), capped to keep the panel compact.
  const filtered = useMemo<ToolItem[]>(() => {
    const scored = items
      .map(it => ({ it, s: scoreItem(query, it) }))
      .filter((x): x is { it: ToolItem; s: number } => x.s !== null)
      .sort((a, b) => b.s - a.s)
      .map(x => x.it);
    const cap = query ? MAX_QUERY : MAX_EMPTY;
    return scored.slice(0, cap);
  }, [items, query]);

  // Group the capped list by kind, preserving the KIND_META order.
  const groups = useMemo(() => {
    const map = new Map<ToolKind, ToolItem[]>();
    for (const it of filtered) {
      const arr = map.get(it.kind) ?? [];
      arr.push(it);
      map.set(it.kind, arr);
    }
    return KIND_META
      .filter(m => map.has(m.kind))
      .map(m => ({ ...m, rows: map.get(m.kind)! }));
  }, [filtered]);

  const [selectedIndex, setSelectedIndex] = useState(0);

  // Keep the highlighted index in range as the filter changes.
  useEffect(() => {
    setSelectedIndex(i => (filtered.length === 0 ? 0 : Math.min(i, filtered.length - 1)));
  }, [filtered.length]);

  // Keyboard navigation via a window listener (only the 4 palette keys; the
  // parent input short-circuits these too so Enter never triggers a submit).
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(i => (filtered.length === 0 ? 0 : (i + 1) % filtered.length));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(i => (filtered.length === 0 ? 0 : (i - 1 + filtered.length) % filtered.length));
      } else if (e.key === 'Enter') {
        if (filtered.length > 0) {
          e.preventDefault();
          onSelect(filtered[selectedIndex] ?? filtered[0]);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [filtered, selectedIndex, onSelect, onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 4 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className="absolute bottom-full left-0 right-0 mb-1 rounded-lg z-50 overflow-hidden"
      style={{
        background: 'var(--color-panel-bg)',
        border: '1px solid var(--color-border-default)',
        boxShadow: '0 -4px 16px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.04)',
        maxHeight: '320px',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-1.5 px-3 py-1.5 flex-shrink-0"
        style={{ borderBottom: '0.5px solid var(--color-border-subtle)' }}
      >
        <span
          className="px-1.5 py-0.5 rounded"
          style={{
            fontSize: '10px',
            fontWeight: 600,
            color: 'var(--color-primary)',
            background: 'var(--color-primary-soft)',
            fontFamily: '"JetBrains Mono", ui-monospace, monospace',
          }}
        >/</span>
        <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--color-ink-tertiary)' }}>
          命令面板
        </span>
        {query && (
          <span
            className="ml-1 truncate"
            style={{ fontSize: '11px', color: 'var(--color-ink-secondary)', fontFamily: '"JetBrains Mono", ui-monospace, monospace' }}
          >{query}</span>
        )}
        <button
          onClick={onClose}
          className="ml-auto flex items-center justify-center w-5 h-5 rounded transition-colors"
          style={{ color: 'var(--color-ink-tertiary)' }}
          title="关闭 (Esc)"
        >
          <X size={12} />
        </button>
      </div>

      {/* Grouped list */}
      <div className="overflow-y-auto" style={{ maxHeight: '280px' }}>
        {groups.length === 0 && (
          <div className="px-3 py-4 text-center" style={{ fontSize: '12px', color: 'var(--color-ink-tertiary)' }}>
            未找到匹配的工具或技能
          </div>
        )}
        {groups.map(group => (
          <div key={group.kind}>
            <div
              className="px-3 pt-1.5 pb-0.5 flex items-center gap-1.5 sticky top-0"
              style={{ background: 'var(--color-panel-bg)', color: 'var(--color-ink-tertiary)' }}
            >
              <group.Icon size={10} style={{ opacity: 0.7 }} />
              <span style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                {group.label}
              </span>
              <span style={{ fontSize: '10px', color: 'var(--color-ink-tertiary)', opacity: 0.6 }}>
                {group.rows.length}
              </span>
            </div>
            {group.rows.map(item => {
              const flatIdx = filtered.indexOf(item);
              const selected = flatIdx === selectedIndex;
              return (
                <button
                  key={`${item.kind}:${item.name}`}
                  onMouseMove={() => setSelectedIndex(flatIdx)}
                  onClick={() => onSelect(item)}
                  className="w-full text-left px-3 py-1.5 flex items-center gap-2.5 transition-colors"
                  style={{
                    background: selected ? 'var(--color-primary-soft)' : 'transparent',
                  }}
                >
                  <group.Icon
                    size={13}
                    style={{
                      flexShrink: 0,
                      color: selected ? 'var(--color-primary)' : 'var(--color-ink-tertiary)',
                      opacity: selected ? 1 : 0.8,
                    }}
                  />
                  <div className="flex-1 min-w-0 flex flex-col">
                    <span
                      className="truncate"
                      style={{
                        fontSize: '12px',
                        fontWeight: 500,
                        color: selected ? 'var(--color-primary)' : 'var(--color-ink)',
                        fontFamily: item.kind === 'skill' ? '"Inter", ui-sans-serif, system-ui, sans-serif' : '"JetBrains Mono", ui-monospace, monospace',
                      }}
                    >
                      {item.displayName || item.name}
                    </span>
                    {item.description && (
                      <span
                        className="truncate"
                        style={{ fontSize: '10.5px', color: 'var(--color-ink-tertiary)', lineHeight: 1.3 }}
                      >
                        {item.description}
                      </span>
                    )}
                  </div>
                  {item.kind !== 'builtin' && (
                    <span
                      className="flex-shrink-0 px-1.5 py-0.5 rounded"
                      style={{
                        fontSize: '9.5px',
                        fontWeight: 500,
                        color: 'var(--color-ink-tertiary)',
                        background: 'var(--color-border-subtle)',
                        fontFamily: '"JetBrains Mono", ui-monospace, monospace',
                      }}
                    >
                      {item.source}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Footer hint */}
      <div
        className="flex items-center gap-3 px-3 py-1.5 flex-shrink-0"
        style={{ borderTop: '0.5px solid var(--color-border-subtle)', color: 'var(--color-ink-tertiary)' }}
      >
        <span className="flex items-center gap-1" style={{ fontSize: '10px' }}>
          <ChevronUp size={10} /><ChevronDown size={10} /> 导航
        </span>
        <span className="flex items-center gap-1" style={{ fontSize: '10px' }}>
          <CornerDownLeft size={10} /> 选择
        </span>
        <span className="flex items-center gap-1 ml-auto" style={{ fontSize: '10px' }}>
          <X size={10} /> 关闭
        </span>
      </div>
    </motion.div>
  );
}
