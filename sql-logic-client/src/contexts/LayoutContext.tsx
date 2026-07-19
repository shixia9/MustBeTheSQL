import { createContext, useContext, useState, type ReactNode } from 'react';

interface LayoutState {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  rightPanelWidth: number;
  setRightPanelWidth: (w: number) => void;
}

const LayoutContext = createContext<LayoutState>({
  sidebarCollapsed: false,
  toggleSidebar: () => {},
  rightPanelWidth: 400,
  setRightPanelWidth: () => {},
});

export function LayoutProvider({ children }: { children: ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [rightPanelWidth, setRightPanelWidth] = useState(400);

  const toggleSidebar = () => setSidebarCollapsed(prev => !prev);

  return (
    <LayoutContext.Provider value={{ sidebarCollapsed, toggleSidebar, rightPanelWidth, setRightPanelWidth }}>
      {children}
    </LayoutContext.Provider>
  );
}

export function useLayout() {
  return useContext(LayoutContext);
}
