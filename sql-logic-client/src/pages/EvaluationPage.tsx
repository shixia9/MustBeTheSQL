import { useState, useRef, useEffect, useCallback } from 'react';
import { Upload, Play, BarChart3, FileJson, Clock, CheckCircle, Loader2 } from 'lucide-react';
import ManagementPage from '../components/layout/ManagementPage';
import { api, apiFetch } from '../api/client';

interface EvalReport {
  taskId: string;
  dataset?: string;
  totalRecords?: number;
  elapsedMs?: number;
  metrics?: Record<string, { score: string; passing: number; total: number; percentage: string }>;
  details?: Array<{ questionId: string; exactMatch: boolean; prediction: string; groundTruth: string }>;
}

interface EvalStatus {
  taskId: string;
  completed: number;
  total: number;
  elapsedMs?: number;
  percentage: number;
}

const tabs = [
  { key: 'run', label: 'Run Evaluation' },
  { key: 'reports', label: 'Reports' },
];

export default function EvaluationPage() {
  const [tab, setTab] = useState('run');
  const [hasFile, setHasFile] = useState(false);
  const [parallelNum, setParallelNum] = useState(4);
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState<EvalStatus | null>(null);
  const [report, setReport] = useState<EvalReport | null>(null);
  const [completedReports, setCompletedReports] = useState<EvalReport[]>([]);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  const pollStatus = useCallback((tid: string) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(async () => {
      try {
        const r = await api.get<any>(`/eval/${tid}/status`);
        if (r.data) {
          setStatus(r.data);
          if (r.data.percentage >= 100) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            intervalRef.current = null;
            setRunning(false);
            try {
              const rep = await api.get<any>(`/eval/${tid}/report`);
              if (rep.data) {
                setReport(rep.data);
                setCompletedReports(prev => prev.some(r => r.taskId === rep.data.taskId) ? prev : [...prev, rep.data]);
              }
            } catch (e: any) { setError(e.message || 'Failed to load report'); }
          }
        }
      } catch (e: any) { setError(e.message || 'Polling failed'); }
    }, 2000);
  }, []);

  const runEval = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) { setError('Please select a dataset file'); return; }
    setError(null);
    setRunning(true);
    setStatus(null);
    setReport(null);
    try {
      const form = new FormData();
      form.append('dataset', file);
      form.append('parallelNum', String(parallelNum));
      const res = await apiFetch<any>('/eval/run', { method: 'POST', body: form, headers: {} });
      if (res.data?.taskId) {
        setStatus({ taskId: res.data.taskId, completed: 0, total: res.data.totalRecords || 0, percentage: 0 });
        pollStatus(res.data.taskId);
      } else if (res.data?.error) {
        setError(res.data.error);
        setRunning(false);
      } else {
        setError(res.message || 'Failed to start evaluation');
        setRunning(false);
      }
    } catch (e: any) {
      setError(e.message || 'Failed to start evaluation');
      setRunning(false);
    }
  };

  const onFileChange = () => {
    setHasFile(!!fileRef.current?.files?.[0]);
  };

  const selectedReport = selectedReportId
    ? completedReports.find(r => r.taskId === selectedReportId) || report
    : report;

  return (
    <ManagementPage title="Model Evaluation" icon={BarChart3} tabs={tabs} activeTab={tab} onTabChange={setTab}>
      {error && (
        <div className="mb-4 px-3 py-2 text-xs border border-red-300 text-red-600 bg-red-50 rounded-md">
          <span className="mr-2">✗</span>{error}
        </div>
      )}

      {tab === 'run' ? (
        <div className="max-w-[560px] space-y-4">
          <div className="bg-white border border-slate-200 rounded-lg p-5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-4">Upload Dataset</h3>
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-lg p-6 cursor-pointer hover:border-blue-300 transition-colors mb-4">
              <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={onFileChange} />
              {hasFile ? (
                <div className="flex items-center gap-2 text-blue-600">
                  <FileJson size={20} />
                  <span className="text-sm">{fileRef.current?.files?.[0]?.name}</span>
                </div>
              ) : (
                <div className="flex flex-col items-center text-slate-400">
                  <Upload size={20} />
                  <span className="text-xs mt-1.5">Click to select a .json dataset file</span>
                </div>
              )}
            </label>
            <div className="flex items-end gap-4">
              <div>
                <label className="block text-[10px] uppercase tracking-wider font-semibold text-slate-500 mb-1">Parallel Workers</label>
                <input type="number" value={parallelNum} onChange={e => setParallelNum(Math.max(1, Math.min(16, Number(e.target.value))))}
                  min={1} max={16}
                  className="w-20 px-3 py-2 text-sm border border-slate-200 rounded-md outline-none focus:border-blue-500" />
              </div>
              <button onClick={runEval} disabled={!hasFile || running}
                className="flex items-center gap-1.5 px-5 py-2 text-xs font-semibold bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-40">
                {running ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                {running ? 'Running...' : 'Start Evaluation'}
              </button>
            </div>
          </div>

          {/* Progress */}
          {status && (
            <div className="bg-white border border-slate-200 rounded-lg p-5">
              <div className="flex items-center gap-2 mb-3">
                {running ? <Loader2 size={14} className="animate-spin text-blue-600" /> : <CheckCircle size={14} className="text-emerald-600" />}
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Progress</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600">{status.completed} / {status.total} records</span>
                  <span className="font-semibold text-slate-900">{status.percentage}%</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600 rounded-full transition-all duration-500" style={{ width: `${status.percentage}%` }} />
                </div>
                {status.elapsedMs != null && (
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-1">
                    <Clock size={10} /> Elapsed: {(status.elapsedMs / 1000).toFixed(1)}s
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Report metrics */}
          {report && (
            <div className="bg-white border border-slate-200 rounded-lg p-5">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 size={14} className="text-blue-600" />
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Report Metrics</span>
                {report.dataset && <span className="text-[10px] text-slate-400 ml-auto">{report.dataset}</span>}
              </div>
              {report.metrics && Object.keys(report.metrics).length > 0 ? (
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(report.metrics).map(([k, v]) => (
                    <div key={k} className="border border-slate-100 rounded-lg p-3">
                      <div className="text-[10px] uppercase tracking-wider text-slate-400 mb-1">{k}</div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-lg font-semibold text-slate-900">{v.score}</span>
                        <span className="text-xs text-slate-500">{v.percentage}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{v.passing}/{v.total} passing</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400">No metrics available.</p>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {completedReports.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-400 text-sm">
              <BarChart3 size={28} className="mb-2 opacity-30" />
              No evaluation reports yet. Run an evaluation to see results here.
            </div>
          ) : (
            <>
              <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 text-left">
                      <th className="py-2.5 px-3 font-medium text-xs">Task ID</th>
                      <th className="py-2.5 px-3 font-medium text-xs">Dataset</th>
                      <th className="py-2.5 px-3 font-medium text-xs">Records</th>
                      <th className="py-2.5 px-3 font-medium text-xs">Elapsed</th>
                      <th className="py-2.5 px-3 font-medium text-xs">Metrics</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {completedReports.map(r => (
                      <tr key={r.taskId} onClick={() => setSelectedReportId(r.taskId)}
                        className={`cursor-pointer hover:bg-slate-50 ${selectedReportId === r.taskId ? 'bg-blue-50' : ''}`}>
                        <td className="py-2.5 px-3 font-mono text-xs text-blue-600">{r.taskId.slice(0, 8)}…</td>
                        <td className="py-2.5 px-3 text-slate-600 text-xs">{r.dataset || '—'}</td>
                        <td className="py-2.5 px-3 text-slate-600 text-xs">{r.totalRecords ?? '—'}</td>
                        <td className="py-2.5 px-3 text-slate-600 text-xs">{r.elapsedMs ? `${(r.elapsedMs / 1000).toFixed(1)}s` : '—'}</td>
                        <td className="py-2.5 px-3 text-xs">
                          {r.metrics && Object.keys(r.metrics).length > 0
                            ? Object.entries(r.metrics).map(([k, v]) => (
                                <span key={k} className="inline-block mr-2 text-slate-500">{k}: <span className="font-semibold text-slate-700">{v.score}</span></span>
                              ))
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {selectedReport && (
                <div className="bg-white border border-slate-200 rounded-lg p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <BarChart3 size={14} className="text-blue-600" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Report Details — {selectedReport.taskId.slice(0, 8)}…
                    </span>
                  </div>
                  {selectedReport.details && selectedReport.details.length > 0 ? (
                    <div className="overflow-auto max-h-80">
                      <table className="w-full text-xs">
                        <thead className="sticky top-0 bg-slate-50">
                          <tr className="text-slate-500 text-left">
                            <th className="py-2 px-2 font-medium">Question</th>
                            <th className="py-2 px-2 font-medium">Match</th>
                            <th className="py-2 px-2 font-medium">Prediction</th>
                            <th className="py-2 px-2 font-medium">Ground Truth</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {selectedReport.details.map((d, i) => (
                            <tr key={i}>
                              <td className="py-1.5 px-2 text-slate-600">{d.questionId}</td>
                              <td className="py-1.5 px-2">
                                {d.exactMatch
                                  ? <span className="text-emerald-600">✓</span>
                                  : <span className="text-red-500">✗</span>}
                              </td>
                              <td className="py-1.5 px-2 text-slate-500 font-mono text-[11px] max-w-xs truncate" title={d.prediction}>{d.prediction}</td>
                              <td className="py-1.5 px-2 text-slate-500 font-mono text-[11px] max-w-xs truncate" title={d.groundTruth}>{d.groundTruth}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">No detail records available.</p>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </ManagementPage>
  );
}
