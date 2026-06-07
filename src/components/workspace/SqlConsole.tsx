import React, { useState, useRef, useEffect } from 'react';
import { Play, Loader2, CheckCircle2, AlertTriangle, ListTree, Download } from 'lucide-react';
import SqlEditor from '../editor/SqlEditor';
import { useWorkspaceStore, TabItem } from '../../stores/workspaceStore';
import storageUtils from '../../utils/storageUtils';
import TableCell from './TableCell';
import { api } from '../../api/client';

interface SqlConsoleProps {
  tab: TabItem;
}

interface ExecutionLog {
  id: string;
  time: string;
  sql: string;
  success: boolean;
  affectedRows?: number;
  latency?: number;
  errorMessage?: string;
  errorLine?: number;
  columns?: string[];
  rows?: any[];
}

export default function SqlConsole({ tab }: SqlConsoleProps) {
  const { updateTabContent } = useWorkspaceStore();
  const editorRef = useRef<any>(null);
  
  const [autoCommit, setAutoCommit] = useState(true);
  const [isExecuting, setIsExecuting] = useState(false);
  const [logs, setLogs] = useState<ExecutionLog[]>([]);
  const [userId, setUserId] = useState<number>(1);

  const [activeBottomTab, setActiveBottomTab] = useState<'log' | 'result'>('log');

  useEffect(() => {
    const user = storageUtils.getUser();
    if (user && user.id) {
      setUserId(user.id);
    }
  }, []);

  const handleContentChange = (val: string) => {
    updateTabContent(tab.id, val);
  };

  const executeSql = async (mode: 'all' | 'selected' | 'current') => {
    let sqlToExecute = '';
    
    if (!editorRef.current) return;
    const editor = editorRef.current;
    
    if (mode === 'all') {
      sqlToExecute = editor.getValue();
    } else if (mode === 'selected') {
      const selection = editor.getSelection();
      sqlToExecute = editor.getModel().getValueInRange(selection);
    } else if (mode === 'current') {
      // simplistic: just get current line for 'current' statement if not properly parsed
      const position = editor.getPosition();
      sqlToExecute = editor.getModel().getLineContent(position.lineNumber);
    }

    if (!sqlToExecute.trim()) {
      const newLog: ExecutionLog = {
        id: Date.now().toString(),
        time: new Date().toLocaleTimeString(),
        sql: sqlToExecute,
        success: false,
        errorMessage: 'No SQL to execute.'
      };
      setLogs(prev => [newLog, ...prev]);
      return;
    }

    setIsExecuting(true);

    try {
      const json = await api.post('/workspace/console/execute', {
        connectionId: tab.connectionId,
        sql: sqlToExecute,
        autoCommit: autoCommit,
        userId: userId
      });
      
      const newLog: ExecutionLog = {
        id: Date.now().toString(),
        time: new Date().toLocaleTimeString(),
        sql: sqlToExecute,
        success: json.code === 200 ? json.data.success : false,
        affectedRows: json.data?.affectedRows,
        latency: json.data?.latency,
        errorMessage: json.code === 200 ? json.data.errorMessage : json.message,
        errorLine: json.data?.errorLine,
        columns: json.data?.columns,
        rows: json.data?.rows
      };
      setLogs(prev => [newLog, ...prev]);
      
      // Auto-switch to result tab if there are results
      if (json.data?.columns && json.data?.columns.length > 0) {
        setActiveBottomTab('result');
      } else {
        setActiveBottomTab('log');
      }
      
    } catch (e: any) {
      const newLog: ExecutionLog = {
        id: Date.now().toString(),
        time: new Date().toLocaleTimeString(),
        sql: sqlToExecute,
        success: false,
        errorMessage: 'Network error: ' + e.message
      };
      setLogs(prev => [newLog, ...prev]);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleExportCsv = () => {
    if (logs.length === 0) return;
    
    const headers = ['Time', 'Status', 'Latency(ms)', 'Affected Rows', 'SQL', 'Error Message'];
    const rows = logs.map(log => [
      log.time,
      log.success ? 'SUCCESS' : 'FAILED',
      log.latency || '',
      log.affectedRows || '',
      `"${log.sql.replace(/"/g, '""')}"`,
      `"${(log.errorMessage || '').replace(/"/g, '""')}"`
    ]);
    
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `sql_execution_log_${Date.now()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col h-full bg-[#1e2433] rounded-xl border border-outline-variant/30 overflow-hidden shadow-sm">
      {/* Toolbar */}
      <div className="h-12 flex items-center justify-between px-4 border-b border-white/5 bg-slate-800/50 flex-shrink-0">
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-xs font-bold text-slate-300 cursor-pointer">
            <input 
              type="checkbox" 
              checked={autoCommit} 
              onChange={(e) => setAutoCommit(e.target.checked)}
              className="rounded border-outline-variant/30 text-primary focus:ring-primary/20"
            />
            Auto Commit
          </label>
        </div>
        <div className="flex items-center gap-2">
          <button
            disabled={isExecuting || !tab.content?.trim()}
            onClick={() => executeSql('current')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white hover:bg-white/5 rounded transition-colors disabled:opacity-50"
            title="Execute Current Line (Ctrl+Shift+Enter)"
          >
            <ListTree size={14} />
            Current
          </button>
          <button
            disabled={isExecuting || !tab.content?.trim()}
            onClick={() => executeSql('selected')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white hover:bg-white/5 rounded transition-colors disabled:opacity-50"
            title="Execute Selected"
          >
            <ListTree size={14} />
            Selected
          </button>
          <div className="h-4 w-px bg-white/10 mx-1"></div>
          <button
            disabled={isExecuting || !tab.content?.trim()}
            onClick={() => executeSql('all')}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold primary-gradient text-white rounded transition-all hover:brightness-110 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
            title="Execute All (Ctrl+Enter)"
          >
            {isExecuting ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} fill="currentColor" />}
            {isExecuting ? 'Running...' : 'Execute All'}
          </button>
        </div>
      </div>

      {/* Editor Area */}
      <div className="flex-1 relative min-h-[200px]">
        <SqlEditor
          value={tab.content || ''}
          onChange={handleContentChange}
          readOnly={isExecuting}
          editorRef={editorRef}
          errorLine={logs.length > 0 ? logs[0].errorLine : null}
          onExecuteAll={() => executeSql('all')}
          onExecuteCurrent={() => executeSql('current')}
        />
      </div>

      {/* Result Panel */}
      <div className="h-64 bg-surface-container-lowest border-t border-outline-variant/30 flex flex-col flex-shrink-0">
        <div className="h-10 flex items-center justify-between px-4 border-b border-outline-variant/10 bg-surface-container-low/50">
          <div className="flex items-center gap-6 h-full">
            <button 
              onClick={() => setActiveBottomTab('log')}
              className={`h-full flex items-center text-[11px] font-bold uppercase tracking-widest transition-colors border-b-2 ${activeBottomTab === 'log' ? 'text-primary border-primary' : 'text-on-surface-variant border-transparent hover:text-on-surface'}`}
            >
              Execution Log
            </button>
            <button 
              onClick={() => setActiveBottomTab('result')}
              className={`h-full flex items-center text-[11px] font-bold uppercase tracking-widest transition-colors border-b-2 ${activeBottomTab === 'result' ? 'text-primary border-primary' : 'text-on-surface-variant border-transparent hover:text-on-surface'}`}
            >
              Result Set
            </button>
          </div>
          {activeBottomTab === 'log' && (
            <button 
              onClick={handleExportCsv}
              disabled={logs.length === 0}
              className="flex items-center gap-1 text-[10px] font-medium text-on-surface-variant hover:text-primary disabled:opacity-50 transition-colors"
              title="Export Logs as CSV"
            >
              <Download size={12} />
              Export CSV
            </button>
          )}
        </div>
        
        <div className="flex-1 overflow-hidden relative">
          {/* Log Tab Content */}
          {activeBottomTab === 'log' && (
            <div className="absolute inset-0 p-4 overflow-y-auto text-sm font-mono custom-scrollbar flex flex-col gap-2">
              {logs.length === 0 && !isExecuting && (
                <span className="text-on-surface-variant/50 italic">Ready to execute.</span>
              )}
              {isExecuting && (
                <span className="text-primary flex items-center gap-2 mb-2">
                  <Loader2 size={14} className="animate-spin" /> Executing script...
                </span>
              )}
              {logs.map((log) => (
                <div key={log.id} className={`p-3 rounded border ${log.success ? 'bg-primary/5 border-primary/20 text-on-surface' : 'bg-error/5 border-error/20 text-error'}`}>
                  {log.success ? (
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2 text-primary font-bold">
                        <CheckCircle2 size={16} /> [{log.time}] Execution Successful
                      </div>
                      <div className="text-xs text-on-surface-variant mt-2 flex flex-col gap-1">
                        <div>Affected Rows: {log.affectedRows} | Latency: {log.latency}ms</div>
                        <div className="text-on-surface-variant/50 truncate" title={log.sql}>SQL: {log.sql}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2 font-bold">
                        <AlertTriangle size={16} /> [{log.time}] Execution Failed
                      </div>
                      {log.errorLine && (
                        <div className="text-xs mt-1">Error near line: {log.errorLine}</div>
                      )}
                      <div className="text-xs mt-2 whitespace-pre-wrap">{log.errorMessage}</div>
                      <div className="text-xs mt-1 text-error/50 truncate" title={log.sql}>SQL: {log.sql}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Result Tab Content */}
          {activeBottomTab === 'result' && (
            <div className="absolute inset-0 overflow-auto bg-surface-container-lowest custom-scrollbar p-2">
              {logs.length > 0 && logs[0].columns ? (
                logs[0].rows && logs[0].rows.length > 0 ? (
                  <table className="w-full text-left border-collapse text-[12px]">
                    <thead className="bg-surface-container-low sticky top-0 z-10 shadow-sm">
                      <tr>
                        <th className="py-2 px-3 border-b border-outline-variant/30 font-bold text-on-surface-variant w-10 text-center">#</th>
                        {logs[0].columns.map((col, i) => (
                          <th key={i} className="py-2 px-3 border-b border-outline-variant/30 font-bold text-on-surface tracking-wide whitespace-nowrap">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="font-mono">
                      {logs[0].rows.map((row, i) => (
                        <tr key={i} className="hover:bg-primary/5 border-b border-outline-variant/10 last:border-0 transition-colors">
                          <td className="py-1.5 px-3 whitespace-nowrap text-on-surface-variant/50 text-center font-sans">
                            {i + 1}
                          </td>
                          {logs[0].columns!.map((col, j) => (
                            <td key={j} className="py-1.5 px-3 whitespace-nowrap text-on-surface-variant">
                              <TableCell value={row[col]} maxWidth={300} />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="flex items-center justify-center h-full text-on-surface-variant/50 italic text-sm">
                    No data returned for this query.
                  </div>
                )
              ) : (
                <div className="flex items-center justify-center h-full text-on-surface-variant/50 italic text-sm">
                  {logs.length === 0 ? "Execute a query to see results." : "The last executed statement did not return a result set."}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}