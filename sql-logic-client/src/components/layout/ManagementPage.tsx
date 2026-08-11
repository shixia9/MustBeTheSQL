import { type ReactNode } from 'react';
import { type LucideIcon } from 'lucide-react';
import TabNav from './TabNav';

interface ManagementPageProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  tabs?: { key: string; label: string }[];
  activeTab?: string;
  onTabChange?: (key: string) => void;
  actions?: ReactNode;
  children: ReactNode;
}

export default function ManagementPage({
  title,
  subtitle,
  icon: Icon,
  tabs,
  activeTab,
  onTabChange,
  actions,
  children,
}: ManagementPageProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className="flex items-center gap-3 px-6 py-3 flex-shrink-0"
        style={{
          background: 'var(--color-content-bg)',
          borderBottom: '1px solid var(--color-border-subtle)',
        }}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {Icon && <Icon size={18} className="text-blue-500 flex-shrink-0" />}
          <div className="min-w-0">
            <h1 className="text-sm font-semibold text-slate-900 truncate" style={{ letterSpacing: '-0.01em' }}>
              {title}
              {subtitle && (
                <span className="text-slate-400 font-normal ml-1.5">/ {subtitle}</span>
              )}
            </h1>
          </div>
        </div>
        {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
      </div>

      {/* Tab Navigation */}
      {tabs && (
        <div
          className="px-6"
          style={{
            background: 'var(--color-content-bg)',
            borderBottom: '1px solid var(--color-border-subtle)',
          }}
        >
          <TabNav tabs={tabs} activeTab={activeTab || tabs[0]?.key} onTabChange={onTabChange || (() => {})} />
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-auto p-6" style={{ background: 'var(--color-content-bg-alt)' }}>
        {children}
      </div>
    </div>
  );
}
