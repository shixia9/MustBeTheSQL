import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import { LlmConfig } from '../types';

interface LlmConfigContextType {
  configs: LlmConfig[];
  selectedConfigId: number | null;
  selectedConfig: LlmConfig | null;
  setSelectedConfigId: (id: number | null) => void;
  refreshConfigs: () => Promise<void>;
  loading: boolean;
}

const LlmConfigContext = createContext<LlmConfigContextType | undefined>(undefined);

export function LlmConfigProvider({ children }: { children: React.ReactNode }) {
  const [configs, setConfigs] = useState<LlmConfig[]>([]);
  const [selectedConfigId, setSelectedConfigId] = useState<number | null>(() => {
    const saved = localStorage.getItem('selected_llm_config_id');
    return saved ? Number(saved) : null;
  });
  const [loading, setLoading] = useState(true);

  const refreshConfigs = useCallback(async () => {
    try {
      const data = await api.get<LlmConfig[]>('/llm-config/list');
      if (data.code === 200 && data.data) {
        setConfigs(data.data);
      }
    } catch (e) {
      console.error('Failed to load LLM configs', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshConfigs();
  }, [refreshConfigs]);

  // Persist selected config to localStorage
  useEffect(() => {
    if (selectedConfigId !== null && selectedConfigId !== 0) {
      localStorage.setItem('selected_llm_config_id', String(selectedConfigId));
    } else {
      localStorage.removeItem('selected_llm_config_id');
    }
  }, [selectedConfigId]);

  // Compute the effective selected config
  const selectedConfig: LlmConfig | null =
    selectedConfigId === 0 ? null :
    configs.find(c => c.id === selectedConfigId && c.status === 1) ||
    configs.find(c => c.isDefault && c.status === 1) ||
    configs.find(c => c.status === 1) ||
    null;

  return (
    <LlmConfigContext.Provider value={{
      configs,
      selectedConfigId,
      selectedConfig,
      setSelectedConfigId,
      refreshConfigs,
      loading
    }}>
      {children}
    </LlmConfigContext.Provider>
  );
}

export function useLlmConfig() {
  const context = useContext(LlmConfigContext);
  if (context === undefined) {
    throw new Error('useLlmConfig must be used within a LlmConfigProvider');
  }
  return context;
}