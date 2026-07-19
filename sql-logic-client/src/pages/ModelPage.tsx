import { Cpu } from 'lucide-react';
import ManagementPage from '../components/layout/ManagementPage';
import { useLlmConfig } from '../contexts/LlmConfigContext';
import { getIcon } from '../assets/icons';

const tabs = [
  { key: 'configured', label: 'Configured' },
  { key: 'ha', label: 'HA Strategy' },
];

export default function ModelPage() {
  const { configs } = useLlmConfig();
  const ZapIcon = getIcon('live');

  return (
    <ManagementPage title="models" icon={Cpu} tabs={tabs} activeTab="configured">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 text-left">
            <th className="py-2 px-2 font-normal">Model</th>
            <th className="py-2 px-2 font-normal">Provider</th>
            <th className="py-2 px-2 font-normal">Default</th>
            <th className="py-2 px-2 font-normal">Status</th>
            <th className="py-2 px-2 font-normal">Created</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {configs?.map((cfg: any) => (
            <tr key={cfg.id} className="hover:bg-slate-50">
              <td className="py-2 px-2 text-blue-600">{cfg.configName || cfg.modelName || `#${cfg.id}`}</td>
              <td className="py-2 px-2 text-slate-500">{cfg.providerType || 'OPENAI_COMPATIBLE'}</td>
              <td className="py-2 px-2">
                {cfg.isDefault && <ZapIcon size={12} className="text-amber-500" />}
              </td>
              <td className="py-2 px-2">
                <span className={`${cfg.status === 1 ? 'text-emerald-500' : 'text-slate-500'}`}>
                  {cfg.status === 1 ? 'active' : 'inactive'}
                </span>
              </td>
              <td className="py-2 px-2 text-slate-500/60">{cfg.createTime}</td>
            </tr>
          ))}
          {(!configs || configs.length === 0) && (
            <tr>
              <td colSpan={5} className="py-8 text-center text-slate-500/40">
                &gt; no models configured — add one in Settings
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </ManagementPage>
  );
}
