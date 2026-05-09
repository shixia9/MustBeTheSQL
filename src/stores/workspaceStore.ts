import { create } from 'zustand';

export interface TabItem {
  id: string;
  title: string;
  type: 'table' | 'query' | 'view' | 'ddl';
  connectionId: number;
  schemaName?: string;
  tableName?: string;
  content?: string;
}

export interface WorkspaceState {
  activeConnectionId: number | null;
  activeSchema: string | null;
  expandedKeys: Set<string>;
  tabs: TabItem[];
  activeTabId: string | null;
  
  setActiveConnectionId: (id: number | null) => void;
  setActiveSchema: (schema: string | null) => void;
  toggleExpand: (key: string) => void;
  
  addTab: (tab: TabItem) => void;
  removeTab: (id: string) => void;
  setActiveTabId: (id: string | null) => void;
  updateTabContent: (id: string, content: string) => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  activeConnectionId: null,
  activeSchema: null,
  expandedKeys: new Set(),
  tabs: [],
  activeTabId: null,

  setActiveConnectionId: (id) => set({ activeConnectionId: id }),
  setActiveSchema: (schema) => set({ activeSchema: schema }),
  
  toggleExpand: (key) => set((state) => {
    const newKeys = new Set(state.expandedKeys);
    if (newKeys.has(key)) {
      newKeys.delete(key);
    } else {
      newKeys.add(key);
    }
    return { expandedKeys: newKeys };
  }),

  addTab: (tab) => set((state) => {
    const exists = state.tabs.find(t => t.id === tab.id);
    if (exists) {
      return { activeTabId: tab.id };
    }
    return { 
      tabs: [...state.tabs, tab],
      activeTabId: tab.id
    };
  }),

  removeTab: (id) => set((state) => {
    const newTabs = state.tabs.filter(t => t.id !== id);
    let newActiveId = state.activeTabId;
    if (state.activeTabId === id) {
      newActiveId = newTabs.length > 0 ? newTabs[newTabs.length - 1].id : null;
    }
    return { tabs: newTabs, activeTabId: newActiveId };
  }),

  setActiveTabId: (id) => set({ activeTabId: id }),

  updateTabContent: (id, content) => set((state) => ({
    tabs: state.tabs.map(t => t.id === id ? { ...t, content } : t)
  }))
}));
