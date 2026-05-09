import React, { useState, useEffect } from 'react';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { X, RefreshCw, FileJson, FileCode } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import TableCell from './TableCell';
import DdlConsole from './DdlConsole';

export default function WorkspaceEditor() {
  const { tabs, activeTabId, removeTab, setActiveTabId } = useWorkspaceStore();
  const activeTab = tabs.find(t => t.id === activeTabId);

  const [tableData, setTableData] = useState<any[]>([]);
  const [columns, setColumns] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (activeTab && activeTab.type === 'table' && activeTab.tableName) {
      // Fetch table preview data
      fetchTablePreview(activeTab.connectionId, activeTab.schemaName, activeTab.tableName);
    } else {
      setTableData([]);
      setColumns([]);
    }
  }, [activeTabId, activeTab?.connectionId, activeTab?.schemaName, activeTab?.tableName]);

  const fetchTablePreview = async (connId: number, schemaName?: string, tableName?: string) => {
    setLoading(true);
    try {
      const sql = `SELECT * FROM ${schemaName ? `\`${schemaName}\`.` : ''}\`${tableName}\` LIMIT 100`;
      const res = await fetch('/api/v1/sql/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 1, // Will be overridden by backend token
          connectionId: connId,
          sql: sql,
          forceExecute: true
        })
      });
      const json = await res.json();
      if (json.code === 200 && json.data && json.data.rows) {
        setTableData(json.data.rows);
        if (json.data.columns && json.data.columns.length > 0) {
          setColumns(json.data.columns);
        } else if (json.data.rows.length > 0) {
          setColumns(Object.keys(json.data.rows[0]));
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (tabs.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-on-surface-variant h-full bg-surface">
        <DatabaseIcon className="w-16 h-16 mb-4 opacity-20" />
        <p>No tabs open. Double-click a table or right-click to open DDL/Query.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-surface w-full overflow-hidden">
      {/* Tabs Header */}
      <div className="flex bg-surface-container-low border-b border-outline-variant/30 overflow-x-auto custom-scrollbar">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={`flex items-center min-w-0 max-w-[200px] px-4 py-2 text-sm border-r border-outline-variant/30 cursor-pointer select-none
              ${activeTabId === tab.id ? 'bg-surface text-primary border-t-2 border-t-primary' : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-highest'}`}
            onClick={() => setActiveTabId(tab.id)}
          >
            <span className="truncate mr-2 flex-1">{tab.title}</span>
            <X 
              className="w-3 h-3 hover:text-error flex-shrink-0" 
              onClick={(e) => {
                e.stopPropagation();
                removeTab(tab.id);
              }}
            />
          </div>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto relative p-4 bg-surface custom-scrollbar">
        {activeTab && (
          <div className="h-full flex flex-col">
            <div className="flex items-center justify-between mb-4 border-b border-outline-variant/30 pb-2">
              <h2 className="text-lg font-medium flex items-center gap-2">
                {activeTab.type === 'table' ? <TableIcon className="w-5 h-5 text-primary" /> : 
                 activeTab.type === 'ddl' ? <FileCode className="w-5 h-5 text-primary" /> :
                 <FileJson className="w-5 h-5 text-primary" />}
                {activeTab.title}
              </h2>
              {activeTab.type === 'table' && (
                <button 
                  onClick={() => fetchTablePreview(activeTab.connectionId, activeTab.schemaName, activeTab.tableName)}
                  className="flex items-center gap-1 px-3 py-1 bg-surface-container-low hover:bg-primary/10 hover:text-primary rounded-md text-sm transition-colors border border-outline-variant/30"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
                </button>
              )}
            </div>

            {activeTab.type === 'ddl' && (
              <div className="flex-1 min-h-0">
                <DdlConsole tab={activeTab} />
              </div>
            )}

            {activeTab.type === 'query' && (
              <div className="flex-1 bg-surface-container-lowest rounded-md p-4 overflow-auto border border-outline-variant/30">
                <ReactMarkdown
                  components={{
                    code({ node, inline, className, children, ...props }: any) {
                      const match = /language-(\w+)/.exec(className || 'language-sql');
                      return !inline ? (
                        <pre className="bg-[#1e1e1e] p-4 rounded-md overflow-x-auto font-mono text-sm leading-relaxed text-gray-300 shadow-inner">
                          <code className={className} {...props}>
                            {children}
                          </code>
                        </pre>
                      ) : (
                        <code className="bg-primary/10 px-1.5 py-0.5 rounded text-sm font-mono text-primary" {...props}>
                          {children}
                        </code>
                      );
                    }
                  }}
                >
                  {`\`\`\`sql\n${activeTab.content}\n\`\`\``}
                </ReactMarkdown>
              </div>
            )}

            {activeTab.type === 'table' && (
              <div className="flex-1 overflow-auto rounded-xl border border-outline-variant/30 relative bg-surface-container-lowest shadow-sm">
                {loading && (
                  <div className="absolute inset-0 bg-surface/50 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center rounded-xl transition-all">
                    <div className="bg-surface-container-highest p-3 rounded-full shadow-lg mb-3">
                      <RefreshCw className="w-6 h-6 animate-spin text-primary" />
                    </div>
                    <span className="text-sm font-medium text-on-surface-variant tracking-wide">Loading Data...</span>
                  </div>
                )}
                {tableData.length > 0 ? (
                  <table className="w-full text-left border-collapse text-sm">
                    <thead className="bg-surface-container-low sticky top-0 z-20 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
                      <tr>
                        <th className="py-3 px-4 border-b border-outline-variant/30 font-bold text-on-surface-variant w-12 text-center">#</th>
                        {columns.map((col, i) => (
                          <th key={i} className="py-3 px-4 border-b border-outline-variant/30 font-bold text-on-surface tracking-wide whitespace-nowrap">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="font-mono text-[13px]">
                      {tableData.map((row, i) => (
                        <tr 
                          key={i} 
                          className={`hover:bg-primary/5 transition-colors border-b border-outline-variant/20 last:border-0 ${i % 2 === 0 ? 'bg-surface-container-lowest' : 'bg-surface-container-low/30'}`}
                        >
                          <td className="py-2.5 px-4 whitespace-nowrap text-on-surface-variant/50 text-center font-sans text-xs">
                            {i + 1}
                          </td>
                          {columns.map((col, j) => (
                            <td key={j} className="py-2.5 px-4 whitespace-nowrap">
                              <TableCell value={row[col]} maxWidth={250} />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-on-surface-variant">
                    {loading ? '' : (
                      <>
                        <TableIcon className="w-12 h-12 mb-3 opacity-20" />
                        <p className="font-medium">No data found in this table.</p>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Inline mock icons to avoid missing imports if they differ
const DatabaseIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/><path d="M3 12A9 3 0 0 0 21 12"/></svg>
);
const TableIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M12 3v18"/><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/></svg>
);
