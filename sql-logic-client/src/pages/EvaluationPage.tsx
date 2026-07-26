import { useState, useRef } from 'react';
import { Upload, Play, BarChart3 } from 'lucide-react';
import ManagementPage from '../components/layout/ManagementPage';
import { api, apiFetch } from '../api/client';

export default function EvaluationPage() {
  const [tab, setTab] = useState<'run' | 'reports'>('run');
  const [taskId, setTaskId] = useState<string | null>(null);
  const [status, setStatus] = useState<any>(null);
  const [report, setReport] = useState<any>(null);
  const [parallelNum, setParallelNum] = useState(4);
  const fileRef = useRef<HTMLInputElement>(null);

  const runEval = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    const form = new FormData();
    form.append('dataset', file);
    form.append('parallelNum', String(parallelNum));
    const res = await apiFetch<any>('/eval/run', { method: 'POST', body: form, headers: {} });
    if (res.data?.taskId) {
      setTaskId(res.data.taskId);
      pollStatus(res.data.taskId);
    }
  };

  const pollStatus = (tid: string) => {
    const interval = setInterval(async () => {
      const r = await api.get<any>(`/eval/${tid}/status`);
      if (r.data) setStatus(r.data);
      if (r.data?.percentage >= 100) {
        clearInterval(interval);
        const rep = await api.get<any>(`/eval/${tid}/report`);
        if (rep.data) setReport(rep.data);
      }
    }, 2000);
  };

  return (
    <ManagementPage title="Model Evaluation" icon={BarChart3}>
      <div className="flex gap-2 mb-4">
        <button onClick={() => setTab('run')} className="px-4 py-1.5 rounded-md text-[12px] font-semibold"
          style={{ background: tab === 'run' ? 'var(--color-primary-soft)' : 'transparent', color: tab === 'run' ? 'var(--color-primary)' : 'var(--color-ink-secondary)' }}>
          Run Evaluation
        </button>
        <button onClick={() => setTab('reports')} className="px-4 py-1.5 rounded-md text-[12px] font-semibold"
          style={{ background: tab === 'reports' ? 'var(--color-primary-soft)' : 'transparent', color: tab === 'reports' ? 'var(--color-primary)' : 'var(--color-ink-secondary)' }}>
          Reports
        </button>
      </div>

      {tab === 'run' && (
        <div className="rounded-xl p-5 max-w-[500px]" style={{ background: 'var(--color-panel-bg)', border: '1px solid var(--color-border-subtle)' }}>
          <h3 className="text-[11px] font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--color-ink-tertiary)' }}>Upload Dataset</h3>
          <input ref={fileRef} type="file" accept=".json" className="mb-3 text-[12px]" style={{ color: 'var(--color-ink)' }} />
          <label className="text-[11px] font-semibold mb-1 block" style={{ color: 'var(--color-ink-secondary)' }}>Parallel Num</label>
          <input type="number" value={parallelNum} onChange={e => setParallelNum(Number(e.target.value))} min={1} max={16}
            className="w-20 px-3 py-2 rounded-md text-[13px] outline-none mb-4"
            style={{ background: 'var(--color-app-bg)', border: '1px solid var(--color-border-default)', color: 'var(--color-ink)' }} />
          <button onClick={runEval} disabled={!fileRef.current?.files?.[0]}
            className="flex items-center gap-1.5 px-4 py-2 rounded-md text-[12px] font-semibold"
            style={{ background: 'var(--color-primary)', color: '#fff', opacity: !fileRef.current?.files?.[0] ? 0.5 : 1 }}>
            <Play size={14} /> Start Evaluation
          </button>

          {status && (
            <div className="mt-4 p-3 rounded-md" style={{ background: 'var(--color-app-bg)' }}>
              <p className="text-[12px]" style={{ color: 'var(--color-ink)' }}>Progress: {status.completed}/{status.total} ({status.percentage}%)</p>
              {report && (
                <div className="mt-2 space-y-1">
                  {Object.entries(report.metrics || {}).map(([k, v]: [string, any]) => (
                    <p key={k} className="text-[12px]" style={{ color: 'var(--color-ink-secondary)' }}>
                      {k}: {v.score} ({v.passing}/{v.total} = {v.percentage})
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {tab === 'reports' && (
        <p className="text-[12px]" style={{ color: 'var(--color-ink-tertiary)' }}>Evaluation reports will appear here after running evaluations.</p>
      )}
    </ManagementPage>
  );
}
