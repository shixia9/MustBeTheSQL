import { useCallback, useEffect, useState } from 'react';
import { X, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { scheduledTaskApi } from '../api/client';
import type { ScheduledRun } from '../api/client';

interface RunHistoryDrawerProps {
  taskId: number;
  open: boolean;
  onClose: () => void;
}

const PAGE_SIZE = 50;

/** Map a run status to the project's signal-color convention. */
function statusColors(status?: string): { color: string; bg: string } {
  switch ((status || '').toLowerCase()) {
    case 'success':
      return { color: 'var(--color-sig-green)', bg: 'var(--color-sig-green-soft)' };
    case 'failed':
      return { color: 'var(--color-sig-red)', bg: 'var(--color-sig-red-soft)' };
    case 'timeout':
    case 'running':
      return { color: 'var(--color-sig-amber)', bg: 'var(--color-sig-amber-soft)' };
    default:
      return { color: '#6b7280', bg: 'rgba(107, 114, 128, 0.10)' };
  }
}

function StatusBadge({ status }: { status?: string }) {
  const c = statusColors(status);
  return (
    <span style={{
      fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 4,
      background: c.bg, color: c.color, textTransform: 'uppercase',
      letterSpacing: '0.3px', display: 'inline-flex', alignItems: 'center',
    }}>
      {status || 'unknown'}
    </span>
  );
}

/** Human-readable duration between two ISO timestamps, or null if not computable. */
function formatDuration(start?: string, end?: string): string | null {
  if (!start || !end) return null;
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (isNaN(ms) || ms < 0) return null;
  if (ms < 1000) return `${ms}ms`;
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1)}s`;
  const m = Math.floor(s / 60);
  const rem = Math.round(s % 60);
  return `${m}m ${rem}s`;
}

/** Compact timestamp for display. */
function fmtTime(t?: string): string {
  if (!t) return '—';
  const d = new Date(t);
  if (isNaN(d.getTime())) return t;
  return d.toLocaleString();
}

export default function RunHistoryDrawer({ taskId, open, onClose }: RunHistoryDrawerProps) {
  const [runs, setRuns] = useState<ScheduledRun[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRuns = useCallback(async (task: number, off: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await scheduledTaskApi.runs(task, PAGE_SIZE, off);
      setRuns(res?.runs || []);
      setTotal(res?.total || 0);
    } catch (e: any) {
      setError(e?.message || 'Failed to load run history');
      setRuns([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open && taskId) {
      setOffset(0);
      fetchRuns(taskId, 0);
    }
  }, [open, taskId, fetchRuns]);

  // Reset transient state when the drawer closes.
  useEffect(() => {
    if (!open) {
      setRuns([]);
      setTotal(0);
      setOffset(0);
      setError(null);
    }
  }, [open]);

  if (!open) return null;

  const hasNext = offset + PAGE_SIZE < total;
  const hasPrev = offset > 0;

  const goPrev = () => {
    if (!hasPrev) return;
    const next = Math.max(0, offset - PAGE_SIZE);
    setOffset(next);
    fetchRuns(taskId, next);
  };

  const goNext = () => {
    if (!hasNext) return;
    const next = offset + PAGE_SIZE;
    setOffset(next);
    fetchRuns(taskId, next);
  };

  const colorInk = 'var(--color-ink)';
  const colorInkSecondary = 'var(--color-ink-secondary)';
  const colorInkTertiary = 'var(--color-ink-tertiary)';
  const colorPanelBg = 'var(--color-panel-bg)';
  const colorAppBg = 'var(--color-app-bg)';
  const colorBorderSubtle = 'var(--color-border-subtle)';

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        display: 'flex', justifyContent: 'flex-end',
        background: 'rgba(0,0,0,0.35)',
      }}
      onClick={onClose}
    >
      <div
        className="run-history-panel"
        style={{
          width: 480, maxWidth: '100vw', height: '100vh',
          background: colorPanelBg,
          borderLeft: `1px solid ${colorBorderSubtle}`,
          display: 'flex', flexDirection: 'column',
          boxShadow: '-12px 0 40px rgba(0,0,0,0.18)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 18px',
          borderBottom: `1px solid ${colorBorderSubtle}`,
          flexShrink: 0,
        }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: colorInk }}>Run History</div>
            <div style={{ fontSize: 11, color: colorInkTertiary, marginTop: 2 }}>
              Task #{taskId} · {total} run{total === 1 ? '' : 's'} total
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: `1px solid ${colorBorderSubtle}`, borderRadius: 6,
            padding: '6px 10px', cursor: 'pointer', color: colorInkSecondary,
            display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600,
          }}>
            <X size={14} /> Close
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 18px' }}>
          {loading && (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              padding: '40px 0', color: colorInkTertiary, fontSize: 12,
            }}>
              <Loader2 size={20} className="animate-spin" style={{ marginBottom: 10 }} />
              Loading runs...
            </div>
          )}

          {!loading && error && (
            <div style={{
              padding: '10px 12px', fontSize: 12, color: 'var(--color-sig-red)',
              background: 'var(--color-sig-red-soft)', borderRadius: 6,
              border: '1px solid var(--color-sig-red-soft)',
            }}>
              {error}
            </div>
          )}

          {!loading && !error && runs.length === 0 && (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              padding: '48px 0', color: colorInkTertiary, fontSize: 12,
            }}>
              No runs yet.
            </div>
          )}

          {!loading && !error && runs.map((run, i) => {
            const duration = formatDuration(run.startedAt, run.finishedAt);
            const showError = run.errorMessage &&
              (run.status === 'failed' || run.status === 'timeout');
            return (
              <div key={run.id} style={{
                background: colorAppBg,
                border: `1px solid ${colorBorderSubtle}`,
                borderRadius: 8,
                padding: '10px 14px',
                marginBottom: i === runs.length - 1 ? 0 : 10,
              }}>
                {/* Header row */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  flexWrap: 'wrap', marginBottom: 6,
                }}>
                  <StatusBadge status={run.status} />
                  <span style={{ fontSize: 11, color: colorInkSecondary, fontFamily: 'var(--font-mono)' }}>
                    #{run.id}
                  </span>
                  {run.attempt != null && (
                    <span style={{ fontSize: 10, color: colorInkTertiary }}>
                      attempt {run.attempt}
                    </span>
                  )}
                  <div style={{ flex: 1 }} />
                  {duration && (
                    <span style={{
                      fontSize: 10, color: colorInkTertiary, fontFamily: 'var(--font-mono)',
                    }}>
                      {duration}
                    </span>
                  )}
                </div>

                {/* Time range */}
                <div style={{ fontSize: 11, color: colorInkTertiary, marginBottom: 6 }}>
                  {fmtTime(run.startedAt)} → {fmtTime(run.finishedAt)}
                </div>

                {/* Result summary (markdown) */}
                {run.resultSummary && (
                  <div className="md-output" style={{
                    margin: '6px 0 0 0', padding: '8px 12px',
                    background: colorPanelBg,
                    border: `1px solid ${colorBorderSubtle}`,
                    borderRadius: 6,
                    maxHeight: 260,
                    overflowY: 'auto',
                    fontSize: 12, lineHeight: 1.55,
                    color: colorInk,
                  }}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{run.resultSummary}</ReactMarkdown>
                  </div>
                )}

                {/* Error message (raw pre) */}
                {showError && (
                  <pre style={{
                    margin: '6px 0 0 0', padding: '8px 10px',
                    background: 'var(--color-sig-red-soft)',
                    border: '1px solid var(--color-sig-red-soft)',
                    borderRadius: 6,
                    fontSize: 11, lineHeight: 1.5,
                    color: 'var(--color-sig-red)',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    maxHeight: 200,
                    overflowY: 'auto',
                    fontFamily: "'JetBrains Mono', 'Cascadia Code', 'Fira Code', monospace",
                  }}>
                    {run.errorMessage}
                  </pre>
                )}

                {/* Output conversation link hint */}
                {run.outputConversationId && (
                  <div style={{ marginTop: 6, fontSize: 10, color: colorInkTertiary }}>
                    output conversation: <code style={{ fontFamily: 'var(--font-mono)' }}>{run.outputConversationId}</code>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer: pagination */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 18px',
          borderTop: `1px solid ${colorBorderSubtle}`,
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 11, color: colorInkTertiary }}>
            {total === 0 ? '0' : `${offset + 1}–${Math.min(offset + runs.length, total)}`} of {total}
          </span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={goPrev} disabled={!hasPrev || loading}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '4px 8px', fontSize: 11, fontWeight: 600,
                border: `1px solid ${colorBorderSubtle}`, borderRadius: 6,
                background: 'none', cursor: hasPrev && !loading ? 'pointer' : 'not-allowed',
                color: colorInkSecondary, opacity: hasPrev && !loading ? 1 : 0.4,
              }}>
              <ChevronLeft size={13} /> Prev
            </button>
            <button onClick={goNext} disabled={!hasNext || loading}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '4px 8px', fontSize: 11, fontWeight: 600,
                border: `1px solid ${colorBorderSubtle}`, borderRadius: 6,
                background: 'none', cursor: hasNext && !loading ? 'pointer' : 'not-allowed',
                color: colorInkSecondary, opacity: hasNext && !loading ? 1 : 0.4,
              }}>
              Next <ChevronRight size={13} />
            </button>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes rh-slide-in {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .run-history-panel {
          animation: rh-slide-in 0.22s cubic-bezier(0.33, 1, 0.68, 1);
        }
        .md-output > :first-child { margin-top: 0; }
        .md-output > :last-child { margin-bottom: 0; }
        .md-output h1, .md-output h2, .md-output h3, .md-output h4 {
          margin: 10px 0 6px; font-size: 12.5px; font-weight: 700; line-height: 1.3;
        }
        .md-output h3 { font-size: 12px; }
        .md-output p { margin: 4px 0; }
        .md-output ul, .md-output ol { margin: 4px 0; padding-left: 18px; }
        .md-output li { margin: 2px 0; }
        .md-output code {
          font-family: 'JetBrains Mono', 'Cascadia Code', 'Fira Code', monospace;
          font-size: 11px; background: var(--color-app-bg);
          padding: 1px 4px; border-radius: 4px;
        }
        .md-output pre {
          background: var(--color-app-bg); padding: 8px 10px; border-radius: 6px;
          overflow-x: auto; margin: 6px 0;
        }
        .md-output pre code { background: none; padding: 0; }
        .md-output table { border-collapse: collapse; width: 100%; margin: 6px 0; font-size: 11px; }
        .md-output th, .md-output td { border: 1px solid var(--color-border-subtle); padding: 4px 6px; text-align: left; }
        .md-output th { background: var(--color-app-bg); font-weight: 600; }
        .md-output blockquote {
          margin: 4px 0; padding-left: 10px; border-left: 2px solid var(--color-border-subtle);
          color: var(--color-ink-secondary);
        }
        .md-output a { color: #5b7fd9; }
      `}</style>
    </div>
  );
}
