import { Clock, Play, Pause } from 'lucide-react';
import ManagementPage from '../components/layout/ManagementPage';
import { mockScheduledTasks } from '../mock/data';

export default function ScheduledTaskPage() {
  return (
    <ManagementPage
      title="scheduled-tasks"
      icon={Clock}
      actions={
        <button className="btn-primary flex items-center gap-1.5">
          + New Task
        </button>
      }
    >
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 text-left">
            <th className="py-2 px-2 font-normal">Task</th>
            <th className="py-2 px-2 font-normal">Schedule</th>
            <th className="py-2 px-2 font-normal">Status</th>
            <th className="py-2 px-2 font-normal">Last Run</th>
            <th className="py-2 px-2 font-normal">Next Run</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {mockScheduledTasks.map(task => (
            <tr key={task.id} className="hover:bg-slate-50">
              <td className="py-2 px-2">
                <div className="text-blue-600">{task.name}</div>
                <div className="text-[10px] text-slate-500/60">{task.description}</div>
              </td>
              <td className="py-2 px-2">
                <code className="px-1.5 py-0.5 bg-slate-50 rounded text-slate-500">{task.cron}</code>
              </td>
              <td className="py-2 px-2">
                <span className={`flex items-center gap-1
                  ${task.status === 'active' ? 'text-emerald-500' : 'text-amber-500'}`}>
                  {task.status === 'active' ? <Play size={10} /> : <Pause size={10} />}
                  {task.status}
                </span>
              </td>
              <td className="py-2 px-2 text-slate-500">{task.lastRun}</td>
              <td className="py-2 px-2 text-slate-500">{task.nextRun}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </ManagementPage>
  );
}
