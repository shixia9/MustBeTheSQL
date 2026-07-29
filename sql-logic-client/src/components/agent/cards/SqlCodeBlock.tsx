/**
 * SqlCodeBlock — Apple-style syntax-highlighted SQL / Python code block.
 *
 * Features:
 * - Shiki syntax highlighting with theme-aware light/dark switching
 * - macOS-style title bar with traffic-light dots (red / yellow / green)
 * - Line numbers via CSS counters
 * - Copy + Execute buttons (hover-revealed)
 * - SQL auto-formatting via sql-formatter
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { Copy, Check, Play } from 'lucide-react';
import { createHighlighter, type Highlighter } from 'shiki';
import { format } from 'sql-formatter';

interface HighlighterCache {
  dark: Highlighter | null;
  light: Highlighter | null;
}

const cache: HighlighterCache = { dark: null, light: null };

async function getHighlighter(theme: 'dark' | 'light'): Promise<Highlighter> {
  const shikiTheme = theme === 'dark' ? 'dark-plus' : 'github-light';
  if (!cache[theme]) {
    cache[theme] = await createHighlighter({
      themes: [shikiTheme],
      langs: ['sql', 'python'],
    });
  }
  return cache[theme]!;
}

function useTheme(): 'dark' | 'light' {
  const [theme, setTheme] = useState<'dark' | 'light'>(() =>
    document.documentElement.classList.contains('dark') ? 'dark' : 'light'
  );

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setTheme(document.documentElement.classList.contains('dark') ? 'dark' : 'light');
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  return theme;
}

interface Props {
  code: string;
  language?: 'sql' | 'python';
  /** If provided, an "Execute" play button calls this callback */
  onExecute?: () => void;
  /** Show a spinner on the execute button */
  executing?: boolean;
  /** Hide the title bar (default false) */
  hideTitleBar?: boolean;
}

export default function SqlCodeBlock({
  code, language = 'sql', onExecute, executing, hideTitleBar = false,
}: Props) {
  const [html, setHtml] = useState<string>('');
  const [lineCount, setLineCount] = useState(0);
  const [copied, setCopied] = useState(false);
  const theme = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const hl = await getHighlighter(theme);
        if (cancelled) return;
        let formatted = code;
        if (language === 'sql') {
          try { formatted = format(code, { language: 'mysql' }); } catch { /* keep raw */ }
        }
        const result = hl.codeToHtml(formatted, {
          lang: language,
          theme: theme === 'dark' ? 'dark-plus' : 'github-light',
        });
        if (!cancelled) {
          setHtml(result);
          setLineCount(formatted.split('\n').length);
        }
      } catch {
        if (!cancelled) {
          setHtml(`<pre class="shiki-fallback"><code>${escapeHtml(code)}</code></pre>`);
          setLineCount(code.split('\n').length);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [code, language, theme]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard not available */ }
  }, [code]);

  if (!code) return null;

  const isDark = theme === 'dark';
  const titleBarBg = isDark ? '#2d2d2d' : '#e8e8ea';
  const codeBg = isDark ? '#1e1e1e' : '#f6f8fa';
  const border = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
  const titleText = isDark ? '#999' : '#888';
  const langLabel = language === 'sql' ? 'SQL' : 'Python';

  return (
    <div
      ref={containerRef}
      className="apple-code-block group relative"
      style={{
        borderRadius: '10px',
        overflow: 'hidden',
        border: `1px solid ${border}`,
        boxShadow: isDark
          ? '0 2px 8px rgba(0,0,0,0.3)'
          : '0 1px 4px rgba(0,0,0,0.06)',
      }}
    >
      {/* ── Title bar ── */}
      {!hideTitleBar && (
        <div className="flex items-center justify-between px-3 py-2 select-none" style={{ background: titleBarBg }}>
          {/* Traffic lights */}
          <div className="flex items-center gap-1.5">
            <span className="inline-block rounded-full" style={{ width: 11, height: 11, background: '#ff5f57' }} />
            <span className="inline-block rounded-full" style={{ width: 11, height: 11, background: '#febc2e' }} />
            <span className="inline-block rounded-full" style={{ width: 11, height: 11, background: '#28c840' }} />
          </div>

          {/* Language label */}
          <span className="text-[10px] font-medium tracking-wider uppercase" style={{ color: titleText, fontFamily: '"Inter", system-ui, sans-serif' }}>
            {langLabel}
          </span>

          {/* Action buttons */}
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
            {onExecute && (
              <button
                onClick={onExecute}
                disabled={executing}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors"
                style={{ color: titleText, fontFamily: '"Inter", system-ui, sans-serif' }}
                title="Execute SQL"
              >
                {executing ? (
                  <span className="inline-block w-2.5 h-2.5 border border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Play size={10} />
                )}
                <span>Run</span>
              </button>
            )}
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors"
              style={{ color: titleText, fontFamily: '"Inter", system-ui, sans-serif' }}
              title="Copy code"
            >
              {copied ? <Check size={10} style={{ color: '#28c840' }} /> : <Copy size={10} />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Code body ── */}
      <div className="overflow-x-auto" style={{ background: codeBg }}>
        {html ? (
          <div
            className="apple-code-body shiki-wrapper"
            style={{
              /* CSS custom properties for line-number offset */
              '--ln-gutter': '3rem',
              counterReset: 'line',
              fontSize: '12px',
              lineHeight: 1.4,
              fontFamily: '"JetBrains Mono", ui-monospace, SFMono-Regular, monospace',
            } as React.CSSProperties}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        ) : (
          <pre className="px-4 py-3 text-xs whitespace-pre-wrap" style={{
            fontFamily: '"JetBrains Mono", ui-monospace, monospace',
            color: 'var(--color-ink-secondary)',
          }}>
            <code>{code}</code>
          </pre>
        )}
      </div>

      {/* Inject line-number CSS into the shiki output */}
      <style>{`
        .apple-code-body .shiki,
        .apple-code-body pre {
          counter-reset: line;
          padding: 0.75rem 0;
          margin: 0;
          overflow-x: auto;
          tab-size: 2;
        }
        .apple-code-body .line {
          counter-increment: line;
          display: block;
          padding: 0 1rem 0 calc(var(--ln-gutter) + 0.5rem);
          position: relative;
          min-height: 1.25em;
        }
        .apple-code-body .line::before {
          content: counter(line);
          position: absolute;
          left: 0;
          width: var(--ln-gutter);
          text-align: right;
          padding-right: 0.75rem;
          color: ${isDark ? '#5a5a5a' : '#b0b0b0'};
          font-size: 11px;
          font-weight: 400;
          user-select: none;
          -webkit-user-select: none;
        }
        .apple-code-body .line:hover {
          background: ${isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'};
        }
        /* shiki fallback */
        .apple-code-body .shiki-fallback {
          padding: 0.75rem 1rem;
          color: ${isDark ? '#d4d4d4' : '#24292f'};
        }
      `}</style>
    </div>
  );
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
