/**
 * RightPanelToggle — slim bookmark-style toggle pinned to the right edge.
 * Shows when the right panel is available (agent streaming or completed).
 * Collapsed state: "<" icon to expand. Expanded state: ">" icon to collapse.
 */
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  expanded: boolean;
  onClick: () => void;
  visible: boolean;
}

export default function RightPanelToggle({ expanded, onClick, visible }: Props) {
  if (!visible) return null;

  return (
    <div
      className="flex-shrink-0 flex items-center cursor-pointer transition-colors duration-150"
      style={{
        width: '24px',
        borderLeft: '1px solid var(--color-border-subtle)',
        background: 'var(--color-content-bg)',
      }}
      onClick={onClick}
      title={expanded ? 'Hide output panel' : 'Show output panel'}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.background = 'var(--color-app-bg)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.background = 'var(--color-content-bg)';
      }}
    >
      <div className="flex items-center justify-center h-full w-full" style={{ color: 'var(--color-ink-tertiary)' }}>
        {expanded ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </div>
    </div>
  );
}
