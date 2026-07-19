import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Loader2, Activity, Zap } from 'lucide-react';
import { llmStrategyApi } from '../api/client';
import type { LlmConfig } from '../types';

const STRATEGIES: { value: string; label: string; desc: string }[] = [
  { value: 'LOCAL', label: '本地直连', desc: '仅用本实例，不负载均衡（回退链仍生效）' },
  { value: 'ROUND_ROBIN', label: '轮询', desc: '在健康实例间循环分配请求' },
  { value: 'LATENCY_FIRST', label: '延迟优先', desc: '选平均延迟最低的实例' },
  { value: 'SUCCESS_RATE_FIRST', label: '成功率优先', desc: '选成功率最高的实例' },
  { value: 'SMART', label: '智能评分', desc: '综合成功率/延迟/负载加权评分' },
];

export default function LlmStrategyPanel({ config, peers }: { config: LlmConfig; peers: LlmConfig[] }) {
  const [open, setOpen] = useState(false);
  const [strategy, setStrategy] = useState<string>(config.strategyType || 'LOCAL');
  const [fallback, setFallback] = useState<number[]>(() => parseFallback(config.fallbackChain));
  const [metrics, setMetrics] = useState<{ successRate?: number; avgLatencyMs?: number; circuitState?: string; totalRequests?: number } | null>(null);
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    setStrategy(config.strategyType || 'LOCAL');
    setFallback(parseFallback(config.fallbackChain));
  }, [config.strategyType, config.fallbackChain]);

  const loadMetrics = async () => {
    setLoadingMetrics(true);
    try {
      const data = await llmStrategyApi.getMetrics(config.id);
      if (data.code === 200) setMetrics(data.data);
    } catch { /* ignore */ }
    finally { setLoadingMetrics(false); }
  };

  useEffect(() => {
    if (open && !metrics) loadMetrics();
  }, [open]);

  const flash = (type: 'success' | 'error', text: string) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 2500);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const data = await llmStrategyApi.updateStrategy(config.id, { strategyType: strategy, fallbackChain: fallback });
      if (data.code === 200) {
        flash('success', '策略已保存');
        loadMetrics();
      } else flash('error', data.message || '保存失败');
    } catch (e: any) { flash('error', e.message || '保存失败'); }
    finally { setSaving(false); }
  };

  const toggleFallback = (id: number) => {
    setFallback(f => f.includes(id) ? f.filter(x => x !== id) : [...f, id]);
  };

  const otherConfigs = peers.filter(c => c.id !== config.id && c.status === 1);
  const circuitColor = metrics?.circuitState === 'OPEN'
    ? 'text-red-600 bg-red-50 border-red-200'
    : metrics?.circuitState === 'HALF_OPEN'
    ? 'text-amber-600 bg-amber-50 border-amber-200'
    : 'text-emerald-600 bg-emerald-50 border-emerald-200';

  return (
    <div className="border-t border-slate-100 mt-2 pt-2">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between py-1 text-[11px] font-semibold text-slate-500 uppercase tracking-wider hover:text-blue-600 transition-colors"
      >
        <span className="flex items-center gap-1.5"><Activity size={11} /> HA 策略与健康状态</span>
        {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>

      {open && (
        <div className="py-2 space-y-3">
          {/* Health metrics */}
          <div className="flex flex-wrap items-center gap-2 text-[10px]">
            <span className={`px-1.5 py-0.5 rounded border ${circuitColor}`}>
              熔断: {metrics?.circuitState || 'CLOSED'}
            </span>
            {metrics?.successRate != null && (
              <span className="px-1.5 py-0.5 rounded bg-slate-50 border border-slate-200 text-slate-600">
                成功率: {(metrics.successRate * 100).toFixed(0)}%
              </span>
            )}
            {metrics?.avgLatencyMs != null && (
              <span className="px-1.5 py-0.5 rounded bg-slate-50 border border-slate-200 text-slate-600">
                均延迟: {metrics.avgLatencyMs.toFixed(0)}ms
              </span>
            )}
            {metrics?.totalRequests != null && (
              <span className="px-1.5 py-0.5 rounded bg-slate-50 border border-slate-200 text-slate-600">
                总调用: {metrics.totalRequests}
              </span>
            )}
            <button onClick={loadMetrics} disabled={loadingMetrics} className="ml-1 text-slate-400 hover:text-blue-600">
              {loadingMetrics ? <Loader2 size={11} className="inline animate-spin" /> : <Zap size={11} />}
            </button>
          </div>

          {/* Strategy selector */}
          <div>
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">负载策略</label>
            <div className="mt-1 grid grid-cols-2 gap-1.5">
              {STRATEGIES.map(s => (
                <button
                  key={s.value}
                  onClick={() => setStrategy(s.value)}
                  title={s.desc}
                  className={`px-2 py-1.5 text-left text-[11px] rounded-md border transition-colors ${
                    strategy === s.value
                      ? 'border-blue-300 bg-blue-50 text-blue-700'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Fallback chain */}
          <div>
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">降级回退链 (主实例失败时按序尝试)</label>
            {otherConfigs.length === 0 ? (
              <p className="mt-1 text-[10px] text-slate-400">无其他可用配置，请先在上方新增至少一个 LLM 配置以启用回退。</p>
            ) : (
              <div className="mt-1 flex flex-wrap gap-1.5">
                {otherConfigs.map(c => (
                  <button
                    key={c.id}
                    onClick={() => toggleFallback(c.id)}
                    className={`px-2 py-1 text-[11px] rounded-md border transition-colors ${
                      fallback.includes(c.id)
                        ? 'border-blue-300 bg-blue-50 text-blue-700'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {fallback.includes(c.id) ? '✓ ' : ''}{c.configName}
                  </button>
                ))}
              </div>
            )}
            {fallback.length > 0 && (
              <p className="mt-1 text-[10px] text-slate-400">
                回退顺序: {fallback.map(id => otherConfigs.find(c => c.id === id)?.configName || id).join(' → ')}
              </p>
            )}
          </div>

          {msg && (
            <div className={`px-2 py-1 text-[10px] rounded border ${
              msg.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-600'
            }`}>
              {msg.text}
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary text-[11px]"
          >
            {saving ? <Loader2 size={12} className="animate-spin" /> : null}
            保存策略
          </button>
        </div>
      )}
    </div>
  );
}

function parseFallback(raw?: string | null): number[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.map(Number).filter(n => !isNaN(n)) : [];
  } catch { return []; }
}
