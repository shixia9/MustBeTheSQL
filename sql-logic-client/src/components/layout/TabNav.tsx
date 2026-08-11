interface TabNavProps {
  tabs: { key: string; label: string }[];
  activeTab: string;
  onTabChange: (key: string) => void;
}

export default function TabNav({ tabs, activeTab, onTabChange }: TabNavProps) {
  return (
    <nav className="flex gap-0 -mb-[1px]" role="tablist">
      {tabs.map(tab => (
        <button
          key={tab.key}
          className={`tab-item ${tab.key === activeTab ? 'active' : ''}`}
          onClick={() => onTabChange(tab.key)}
          role="tab"
          aria-selected={tab.key === activeTab}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
