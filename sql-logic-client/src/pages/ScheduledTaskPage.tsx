import { useState, useEffect, useCallback } from 'react';
import { Clock, Plus, Trash2, Pencil, Loader2, Play, Pause, Zap, History } from 'lucide-react';
import ManagementPage from '../components/layout/ManagementPage';
import { scheduledTaskApi } from '../api/client';
import type { ScheduledTask } from '../api/client';
import { useFlash } from '../hooks/useFlash';
import RunHistoryDrawer from './RunHistoryDrawer';

/** Signal-color mapping for the last-run status badge. */
function lastRunStatusColors(status?: string): { color: string; bg: string } {
  switch ((status || '').toLowerCase()) {
    case 'success':
      return { color: 'var(--color-sig-green)', bg: 'var(--color-sig-green-soft)' };
    case 'failed':
      return { color: 'var(--color-sig-red)', bg: 'var(--color-sig-red-soft)' };
    case 'timeout':
    case 'running':
      return { color: 'var(--color-sig-amber)', bg: 'var(--color-sig-amber-soft)' };
    default:
      return { color: '#9ca3af', bg: 'rgba(156, 163, 175, 0.10)' };
  }
}

function LastRunStatusBadge({ status }: { status?: string }) {
  if (!status) {
    return <span className="text-slate-300">—</span>;
  }
  const c = lastRunStatusColors(status);
  return (
    <span style={{
      fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 4,
      background: c.bg, color: c.color, textTransform: 'uppercase',
      letterSpacing: '0.3px', display: 'inline-flex', alignItems: 'center',
    }}>
      {status}
    </span>
  );
}

interface FormState {
  name: string;
  cronExpr: string;
  taskType: string;
  payload: string;
  description: string;
  timeZone: string;
  timeoutSeconds: string;
}

const EMPTY_FORM: FormState = {
  name: '',
  cronExpr: '',
  taskType: '',
  payload: '',
  description: '',
  timeZone: '',
  timeoutSeconds: '',
};

export default function ScheduledTaskPage() {
  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ScheduledTask | null>(null);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState<number | null>(null);
  const [running, setRunning] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [historyTaskId, setHistoryTaskId] = useState<number | null>(null);
  const { msg, flash } = useFlash();

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const list = await scheduledTaskApi.list();
      setTasks(list || []);
    } catch (e: any) { flash('error', e.message || 'Failed to load tasks'); }
    finally { setLoading(false); }
  }, [flash]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEdit = (t: ScheduledTask) => {
    setEditing(t);
    setForm({
      name: t.name,
      cronExpr: t.cronExpr,
      taskType: t.taskType || '',
      payload: t.payload || '',
      description: t.description || '',
      timeZone: t.timeZone || '',
      timeoutSeconds: t.timeoutSeconds != null ? String(t.timeoutSeconds) : '',
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.cronExpr.trim()) {
      flash('error', 'Name and cron expression are required');
      return;
    }
    setSaving(true);
    try {
      const timeoutNum = form.timeoutSeconds.trim() ? Number(form.timeoutSeconds.trim()) : undefined;
      if (form.timeoutSeconds.trim() && (isNaN(timeoutNum as number) || (timeoutNum as number) <= 0)) {
        flash('error', 'Timeout must be a positive number');
        setSaving(false);
        return;
      }
      const payload = {
        name: form.name.trim(),
        cronExpr: form.cronExpr.trim(),
        taskType: form.taskType.trim() || undefined,
        payload: form.payload.trim() || undefined,
        description: form.description.trim() || undefined,
        timeZone: form.timeZone.trim() || undefined,
        timeoutSeconds: timeoutNum,
      };
      const r = editing
        ? await scheduledTaskApi.update(editing.id, payload)
        : await scheduledTaskApi.create(payload);
      if (r.code === 200) { flash('success', editing ? 'Updated' : 'Created'); setShowForm(false); await fetchTasks(); }
      else flash('error', r.message || 'Failed');
    } catch (e: any) { flash('error', e.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this scheduled task?')) return;
    try {
      const r = await scheduledTaskApi.delete(id);
      if (r.code === 200) { flash('success', 'Deleted'); await fetchTasks(); }
      else flash('error', r.message || 'Failed');
    } catch (e: any) { flash('error', e.message || 'Failed'); }
  };

  const handleToggle = async (task: ScheduledTask) => {
    const enabled = task.status !== 1; // paused (0) → enable; running (1) → pause
    setToggling(task.id);
    try {
      const r = await scheduledTaskApi.toggle(task.id, enabled);
      if (r.code === 200) { flash('success', enabled ? 'Resumed' : 'Paused'); await fetchTasks(); }
      else flash('error', r.message || 'Failed');
    } catch (e: any) { flash('error', e.message || 'Failed'); }
    finally { setToggling(null); }
  };

  const handleRun = async (task: ScheduledTask) => {
    if (!confirm('Run this task now?')) return;
    setRunning(task.id);
    try {
      const r = await scheduledTaskApi.run(task.id);
      if (r.code === 200) { flash('success', 'Run started'); await fetchTasks(); }
      else flash('error', r.message || 'Failed to run');
    } catch (e: any) { flash('error', e.message || 'Failed to run'); }
    finally { setRunning(null); }
  };

  const openHistory = (task: ScheduledTask) => {
    setHistoryTaskId(task.id);
  };

  return (
    <ManagementPage
      title="scheduled-tasks"
      icon={Clock}
      actions={
        <button onClick={openCreate} className="btn-primary flex items-center gap-1.5">
          <Plus size={14} /> New Task
        </button>
      }
    >
      {msg && (
        <div className={`mb-4 px-3 py-2 text-xs border rounded-md ${
          msg.type === 'success' ? 'border-blue-300 text-blue-600 bg-blue-50' : 'border-red-300 text-red-600 bg-red-50'
        }`}>
          <span className="mr-2">{msg.type === 'success' ? '✓' : '✗'}</span>{msg.text}
        </div>
      )}

      {showForm && (
        <div className="mb-4 bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className={`w-3 h-3 rounded-sm ${editing ? 'bg-emerald-500' : 'bg-blue-600'}`} />
            <span className="text-xs uppercase tracking-wider font-semibold text-slate-700">
              {editing ? 'Edit' : 'New'} Scheduled Task
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] uppercase tracking-wider font-semibold text-slate-500 mb-1">Name *</label>
              <input className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md outline-none focus:border-blue-500"
                value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Daily Sales Report" />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider font-semibold text-slate-500 mb-1">Cron Expression *</label>
              <input className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-md outline-none focus:border-blue-500"
                value={form.cronExpr} onChange={e => setForm({ ...form, cronExpr: e.target.value })}
                placeholder="0 0 9 * * ?  (daily at 9am)" />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider font-semibold text-slate-500 mb-1">Task Type</label>
              <input className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md outline-none focus:border-blue-500"
                value={form.taskType} onChange={e => setForm({ ...form, taskType: e.target.value })}
                placeholder="SQL_EXPORT, REPORT, SYNC..." />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider font-semibold text-slate-500 mb-1">Time Zone</label>
              <input className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md outline-none focus:border-blue-500"
                value={form.timeZone} onChange={e => setForm({ ...form, timeZone: e.target.value })}
                placeholder="Asia/Shanghai" />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider font-semibold text-slate-500 mb-1">Description</label>
              <input className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md outline-none focus:border-blue-500"
                value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder="What this task does" />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider font-semibold text-slate-500 mb-1">Timeout (seconds)</label>
              <input className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md outline-none focus:border-blue-500"
                value={form.timeoutSeconds} onChange={e => setForm({ ...form, timeoutSeconds: e.target.value })}
                placeholder="600" inputMode="numeric" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[10px] uppercase tracking-wider font-semibold text-slate-500 mb-1">Payload (JSON)</label>
              <textarea rows={3} className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-md outline-none focus:border-blue-500"
                value={form.payload} onChange={e => setForm({ ...form, payload: e.target.value })}
                placeholder='{"query": "SELECT ...", "format": "csv"}' />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-slate-100">
            <button onClick={() => setShowForm(false)} className="px-3 py-1.5 text-xs border border-slate-200 rounded-md hover:bg-slate-50">Cancel</button>
            <button onClick={handleSave} disabled={saving}
              className="px-4 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-40 flex items-center gap-1.5">
              {saving ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
              {editing ? 'Save' : 'Create'}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-32 text-slate-400 text-sm">
          <Loader2 size={16} className="animate-spin mr-2" /> Loading...
        </div>
      ) : tasks.length === 0 ? (
        <div className="flex items-center justify-center h-32 text-slate-400 text-sm">No scheduled tasks yet.</div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 text-left">
                <th className="py-2.5 px-3 font-medium">Task</th>
                <th className="py-2.5 px-3 font-medium">Cron</th>
                <th className="py-2.5 px-3 font-medium">Type</th>
                <th className="py-2.5 px-3 font-medium">Status</th>
                <th className="py-2.5 px-3 font-medium">Last Run</th>
                <th className="py-2.5 px-3 font-medium">Last Status</th>
                <th className="py-2.5 px-3 font-medium">Next Run</th>
                <th className="py-2.5 px-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tasks.map(task => (
                <tr key={task.id} className="hover:bg-slate-50">
                  <td className="py-2.5 px-3">
                    <div className="text-blue-600 font-medium">{task.name}</div>
                    {task.description && <div className="text-[10px] text-slate-400 truncate max-w-[180px]" title={task.description}>{task.description}</div>}
                    {task.taskType && <div className="text-[10px] text-slate-400">{task.taskType}</div>}
                  </td>
                  <td className="py-2.5 px-3">
                    <code className="px-1.5 py-0.5 bg-slate-50 rounded text-slate-500">{task.cronExpr}</code>
                  </td>
                  <td className="py-2.5 px-3 text-slate-500">{task.taskType || '—'}</td>
                  <td className="py-2.5 px-3">
                    <span className={`inline-flex items-center gap-1 ${task.status === 1 ? 'text-emerald-500' : 'text-amber-500'}`}>
                      {task.status === 1 ? <Play size={11} /> : <Pause size={11} />}
                      {task.status === 1 ? 'running' : 'paused'}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-400">{task.lastRunTime || '—'}</td>
                  <td className="py-2.5 px-3">
                    <LastRunStatusBadge status={task.lastRunStatus} />
                  </td>
                  <td className="py-2.5 px-3 text-slate-400">{task.nextRunTime || '—'}</td>
                  <td className="py-2.5 px-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => handleRun(task)} disabled={running === task.id}
                        className="p-1.5 text-blue-500 hover:bg-blue-50 disabled:opacity-40" title="Run now">
                        {running === task.id ? <Loader2 size={13} className="animate-spin" /> : <Zap size={13} />}
                      </button>
                      <button onClick={() => handleToggle(task)} disabled={toggling === task.id}
                        className={`p-1.5 ${task.status === 1 ? 'text-amber-500 hover:bg-amber-50' : 'text-emerald-500 hover:bg-emerald-50'} disabled:opacity-40`}
                        title={task.status === 1 ? 'Pause' : 'Resume'}>
                        {toggling === task.id ? <Loader2 size={13} className="animate-spin" /> : task.status === 1 ? <Pause size={13} /> : <Play size={13} />}
                      </button>
                      <button onClick={() => openHistory(task)} className="p-1.5 text-slate-400 hover:text-slate-700" title="Run history">
                        <History size={13} />
                      </button>
                      <button onClick={() => openEdit(task)} className="p-1.5 text-slate-400 hover:text-blue-600" title="Edit">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => handleDelete(task.id)} className="p-1.5 text-slate-400 hover:text-red-600" title="Delete">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <RunHistoryDrawer
        taskId={historyTaskId ?? 0}
        open={historyTaskId !== null}
        onClose={() => setHistoryTaskId(null)}
      />
    </ManagementPage>
  );
}
