import { createContext, useContext, useState, type ReactNode } from 'react';

interface LayoutState {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  rightPanelWidth: number;
  setRightPanelWidth: (w: number) => void;
  rightPanelExpanded: boolean;
  setRightPanelExpanded: (v: boolean) => void;
  rightPanelVisible: boolean;
  setRightPanelVisible: (v: boolean) => void;
}

const LayoutContext = createContext<LayoutState>({
  sidebarCollapsed: false,
  toggleSidebar: () => {},
  rightPanelWidth: 400,
  setRightPanelWidth: () => {},
  rightPanelExpanded: false,
  setRightPanelExpanded: () => {},
  rightPanelVisible: false,
  setRightPanelVisible: () => {},
});

export function LayoutProvider({ children }: { children: ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [rightPanelWidth, setRightPanelWidth] = useState(400);
  const [rightPanelExpanded, setRightPanelExpanded] = useState(false);
  const [rightPanelVisible, setRightPanelVisible] = useState(false);

  const toggleSidebar = () => setSidebarCollapsed(prev => !prev);

  return (
    <LayoutContext.Provider value={{
      sidebarCollapsed, toggleSidebar,
      rightPanelWidth, setRightPanelWidth,
      rightPanelExpanded, setRightPanelExpanded,
      rightPanelVisible, setRightPanelVisible,
    }}>
      {children}
    </LayoutContext.Provider>
  );
}

export function useLayout() {
  return useContext(LayoutContext);
}
