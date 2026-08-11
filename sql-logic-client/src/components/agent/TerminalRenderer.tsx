/**
 * TerminalRenderer — a macOS-style simulated terminal that renders one sandbox
 * code execution. The terminal is always dark regardless of the app theme.
 */
import { useEffect, useRef } from 'react';

export interface TerminalExecution {
  language: string;
  code: string;
  /** Accumulated stdout (may stream in incrementally). */
  stdout: string;
  /** Accumulated stderr (may stream in incrementally). */
  stderr: string;
  /** Process exit code (set on FINISHED; -1 = killed/never started). */
  exitCode?: number;
  /** Wall-clock duration in ms (set on FINISHED). */
  durationMs?: number;
  /** Terminal status: success / error / timeout / resource_limit. */
  status?: string;
  /** True while the execution is still streaming (between STARTED and FINISHED). */
  isRunning?: boolean;
  /** VNC/GUI URL — when present, a noVNC iframe is rendered instead of terminal output. */
  guiUrl?: string;
  /** Files produced in the sandbox working directory (from FINISHED event). */
  files?: string[];
  /** Supplementary logs (e.g. pip install output) from FINISHED event. */
  logs?: string[];
}

interface Props {
  execution: TerminalExecution;
  /** Optional index label when multiple executions are stacked (e.g. "#1"). */
  indexLabel?: string;
}

// Terminal palette — fixed dark theme (convention, not theme-driven).
const BG = '#0d1117';
const BG_SOFT = '#161b22';
const BORDER = '#30363d';
const STDOUT_COLOR = '#c9d1d9';
const STDERR_COLOR = '#f85149';
const PROMPT_COLOR = '#3fb950';
const PATH_COLOR = '#58a6ff';
const MUTED = '#8b949e';
const DOT_RED = '#ff5f57';
const DOT_YELLOW = '#febc2e';
const DOT_GREEN = '#28c840';

export default function TerminalRenderer({ execution, indexLabel }: Props) {
  const outputRef = useRef<HTMLDivElement>(null);
  const { language, code, stdout, stderr, exitCode, durationMs, status, isRunning, guiUrl, files, logs } = execution;

  // Auto-scroll to bottom as output streams in.
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [stdout, stderr, isRunning]);

  const lang = (language || 'python').toLowerCase();
  const command = lang === 'bash' || lang === 'shell' || lang === 'sh'
    ? 'bash script.sh'
    : `${lang} script${extFor(lang)}`;
  const langLabel = lang === 'bash' || lang === 'shell' ? 'bash' : lang;

  const isError = status === 'error' || status === 'timeout' || status === 'resource_limit';
  const finished = !isRunning && status != null;
  const statusColor = finished
    ? (isError ? STDERR_COLOR : PROMPT_COLOR)
    : MUTED;

  return (
    <div
      className="terminal-renderer"
      style={{
        borderRadius: '10px',
        overflow: 'hidden',
        border: `1px solid ${BORDER}`,
        background: BG,
        boxShadow: '0 4px 16px rgba(0,0,0,0.35)',
        fontFamily: '"JetBrains Mono", "SF Mono", "Menlo", monospace',
      }}
    >
      {/* ── macOS title bar ── */}
      <div
        className="flex items-center px-3 py-2 select-none"
        style={{ background: BG_SOFT, borderBottom: `1px solid ${BORDER}` }}
      >
        <div className="flex items-center gap-2">
          <span style={{ width: 11, height: 11, borderRadius: '50%', background: DOT_RED, display: 'inline-block' }} />
          <span style={{ width: 11, height: 11, borderRadius: '50%', background: DOT_YELLOW, display: 'inline-block' }} />
          <span style={{ width: 11, height: 11, borderRadius: '50%', background: DOT_GREEN, display: 'inline-block' }} />
        </div>
        <div className="flex items-center gap-2 mx-auto" style={{ color: MUTED, fontSize: 11, fontWeight: 500 }}>
          <span>sandbox</span>
          <span style={{ opacity: 0.4 }}>—</span>
          <span style={{ color: PATH_COLOR }}>{langLabel}</span>
          {indexLabel && <span style={{ opacity: 0.6 }}>{indexLabel}</span>}
        </div>
        {/* status pill */}
        <div
          className="flex items-center gap-1.5"
          style={{ fontSize: 10, fontWeight: 600, color: statusColor, minWidth: 64, justifyContent: 'flex-end' }}
        >
          {isRunning ? (
            <>
              <span
                className="animate-pulse"
                style={{ width: 6, height: 6, borderRadius: '50%', background: DOT_YELLOW, display: 'inline-block' }}
              />
              running
            </>
          ) : finished ? (
            <>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: statusColor, display: 'inline-block' }} />
              {isError ? 'failed' : 'done'}
            </>
          ) : (
            <span style={{ opacity: 0.5 }}>idle</span>
          )}
        </div>
      </div>

      {/* ── Terminal body ── */}
      <div style={{ padding: '12px 14px', fontSize: 12.5, lineHeight: 1.55 }}>
        {/* VNC/GUI iframe — rendered when guiUrl is present (VNC language sessions). */}
        {guiUrl && (
          <div style={{ marginBottom: 10 }}>
            <div style={{ marginBottom: 6, fontSize: 10, fontWeight: 600, color: PATH_COLOR, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              GUI · VNC
            </div>
            <iframe
              src={guiUrl}
              title="Sandbox VNC"
              style={{
                width: '100%',
                height: 320,
                border: `1px solid ${BORDER}`,
                borderRadius: 6,
                background: '#000',
              }}
              sandbox="allow-scripts allow-same-origin"
            />
            <div style={{ marginTop: 4, fontSize: 10, color: MUTED }}>
              <a href={guiUrl} target="_blank" rel="noopener noreferrer" style={{ color: PATH_COLOR }}>
                Open in new tab →
              </a>
            </div>
          </div>
        )}

        {/* prompt + command */}
        <div style={{ marginBottom: 8 }}>
          <span style={{ color: PROMPT_COLOR }}>user@sandbox</span>
          <span style={{ color: MUTED }}>:</span>
          <span style={{ color: PATH_COLOR }}>~</span>
          <span style={{ color: MUTED }}>$ </span>
          <span style={{ color: STDOUT_COLOR }}>{command}</span>
        </div>

        {/* code (collapsible when long) */}
        {code && (
          <pre
            style={{
              margin: '0 0 10px 0',
              padding: '10px 12px',
              background: 'rgba(255,255,255,0.03)',
              border: `1px solid ${BORDER}`,
              borderRadius: 6,
              color: '#aab2bc',
              fontSize: 11.5,
              lineHeight: 1.5,
              maxHeight: 220,
              overflow: 'auto',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {code}
          </pre>
        )}

        {/* output region */}
        <div ref={outputRef} style={{ maxHeight: 360, overflow: 'auto' }}>
          {stdout && (
            <pre style={{ margin: 0, color: STDOUT_COLOR, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {stdout}
            </pre>
          )}
          {stderr && (
            <pre style={{ margin: stdout ? '6px 0 0 0' : 0, color: STDERR_COLOR, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {stderr}
            </pre>
          )}
          {/* running cursor */}
          {isRunning && (
            <span
              className="animate-pulse"
              style={{ display: 'inline-block', color: PROMPT_COLOR, fontWeight: 700 }}
            >
              ▋
            </span>
          )}
          {/* empty-state while running with no output yet */}
          {isRunning && !stdout && !stderr && (
            <span style={{ color: MUTED, fontStyle: 'italic' }}>executing…</span>
          )}
        </div>

        {/* footer: exit code + duration + files + logs */}
        {finished && (
          <div
            style={{
              marginTop: 10,
              paddingTop: 8,
              borderTop: `1px solid ${BORDER}`,
              display: 'flex',
              flexWrap: 'wrap',
              gap: 16,
              fontSize: 10.5,
              color: MUTED,
            }}
          >
            <span>
              exit{' '}
              <span style={{ color: isError ? STDERR_COLOR : PROMPT_COLOR, fontWeight: 600 }}>
                {exitCode ?? -1}
              </span>
            </span>
            {durationMs != null && <span>{formatDuration(durationMs)}</span>}
            {status && <span style={{ textTransform: 'uppercase', letterSpacing: '0.04em' }}>{status}</span>}
            {files && files.length > 0 && (
              <span>
                files{' '}
                <span style={{ color: PATH_COLOR }}>{files.join(', ')}</span>
              </span>
            )}
          </div>
        )}

        {/* supplementary logs (e.g. pip install output) — collapsible */}
        {logs && logs.length > 0 && (
          <details style={{ marginTop: 8, fontSize: 10.5, color: MUTED }}>
            <summary style={{ cursor: 'pointer', userSelect: 'none' }}>
              logs ({logs.length} lines)
            </summary>
            <pre style={{
              margin: '6px 0 0 0',
              padding: '8px 10px',
              background: 'rgba(255,255,255,0.02)',
              border: `1px solid ${BORDER}`,
              borderRadius: 4,
              color: MUTED,
              fontSize: 10,
              lineHeight: 1.45,
              maxHeight: 180,
              overflow: 'auto',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}>
              {logs.join('\n')}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}

function extFor(lang: string): string {
  switch (lang) {
    case 'python': case 'python-vnc': return '.py';
    case 'javascript': return '.js';
    case 'java': return '.java';
    case 'cpp': return '.cpp';
    case 'go': return '.go';
    case 'rust': return '.rs';
    default: return '.sh';
  }
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}
