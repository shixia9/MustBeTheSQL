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
      <table className="w-full text-xs font-mono">
        <thead>
          <tr className="border-b border-outline-variant text-on-surface-variant text-left">
            <th className="py-2 px-2 font-normal">Task</th>
            <th className="py-2 px-2 font-normal">Schedule</th>
            <th className="py-2 px-2 font-normal">Status</th>
            <th className="py-2 px-2 font-normal">Last Run</th>
            <th className="py-2 px-2 font-normal">Next Run</th>
          </tr>
        </thead>
        <tbody>
          {mockScheduledTasks.map(task => (
            <tr key={task.id} className="border-b border-outline-variant/50 hover:bg-surface-container-high">
              <td className="py-2 px-2">
                <div className="text-[#38bdf8]">{task.name}</div>
                <div className="text-[10px] text-on-surface-variant/60">{task.description}</div>
              </td>
              <td className="py-2 px-2">
                <code className="px-1.5 py-0.5 bg-surface-container-high rounded text-on-surface-variant">{task.cron}</code>
              </td>
              <td className="py-2 px-2">
                <span className={`flex items-center gap-1
                  ${task.status === 'active' ? 'text-[#a3e635]' : 'text-[#f59e0b]'}`}>
                  {task.status === 'active' ? <Play size={10} /> : <Pause size={10} />}
                  {task.status}
                </span>
              </td>
              <td className="py-2 px-2 text-on-surface-variant">{task.lastRun}</td>
              <td className="py-2 px-2 text-on-surface-variant">{task.nextRun}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </ManagementPage>
  );
}
