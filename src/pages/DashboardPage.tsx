import { useState, useRef, useEffect, type KeyboardEvent } from 'react';
import { Send, Copy, Play, AlignLeft, Download, Maximize2, Sparkles, Loader2, CheckCircle2, Paperclip, FileText, Info, Database, Table2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { format as formatSql } from 'sql-formatter';
import { useSettings } from '../contexts/SettingsContext';

export default function DashboardPage({ user }: { user: any }) {
  const { fontSize } = useSettings();
  const editorRef = useRef<HTMLTextAreaElement | null>(null);
  const [query, setQuery] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  
  // Use localStorage to cache messages and generatedSql
  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem(`chat_messages_${user?.id}`);
    if (saved) return JSON.parse(saved);
    return [{ 
      role: 'ai', 
      content: `Welcome, ${user?.username || 'User'}! You have ${user?.tokenQuota || 0} AI tokens remaining. How can I help you today?` 
    }];
  });
  
  const [generatedSql, setGeneratedSql] = useState(() => {
    return localStorage.getItem(`chat_sql_${user?.id}`) || '';
  });

  const [executeResult, setExecuteResult] = useState<any>(null);
  const [executeError, setExecuteError] = useState<string>('');
  const [clipboardJustCopied, setClipboardJustCopied] = useState(false);

  // Schema context states
  const [connections, setConnections] = useState<any[]>([]);
  const [selectedConnId, setSelectedConnId] = useState<number | ''>(() => {
    const saved = localStorage.getItem(`chat_conn_${user?.id}`);
    return saved ? Number(saved) : '';
  });
  const [tables, setTables] = useState<string[]>([]);
  const [selectedTables, setSelectedTables] = useState<string[]>(() => {
    const saved = localStorage.getItem(`chat_tables_${user?.id}`);
    return saved ? JSON.parse(saved) : [];
  });
  const [showTableSelect, setShowTableSelect] = useState(false);

  // Save to localStorage whenever state changes
  useEffect(() => {
    if (user?.id) {
      localStorage.setItem(`chat_messages_${user.id}`, JSON.stringify(messages));
      localStorage.setItem(`chat_sql_${user.id}`, generatedSql);
      localStorage.setItem(`chat_conn_${user.id}`, selectedConnId.toString());
      localStorage.setItem(`chat_tables_${user.id}`, JSON.stringify(selectedTables));
    }
  }, [messages, generatedSql, selectedConnId, selectedTables, user?.id]);

  useEffect(() => {
    const handleNewQuery = () => {
      setMessages([{ 
        role: 'ai', 
        content: `Welcome, ${user?.username || 'User'}! You have ${user?.tokenQuota || 0} AI tokens remaining. How can I help you today?` 
      }]);
      setGeneratedSql('');
      setExecuteResult(null);
      setExecuteError('');
    };

    window.addEventListener('new-query', handleNewQuery);
    return () => window.removeEventListener('new-query', handleNewQuery);
  }, [user?.username, user?.tokenQuota]);

  useEffect(() => {
    if (user?.id) {
      fetchConnections();
    }
  }, [user]);

  const fetchConnections = async () => {
    try {
      const res = await fetch(`/api/v1/database/list?userId=${user.id}`);
      const data = await res.json();
      if (data.code === 200) {
        setConnections(data.data);
        if (data.data.length > 0) {
          setSelectedConnId(data.data[0].id);
        }
      }
    } catch (e) {
      console.error('Failed to fetch connections', e);
    }
  };

  useEffect(() => {
    if (selectedConnId) {
      fetchTables(selectedConnId as number);
      setSelectedTables([]);
    } else {
      setTables([]);
    }
  }, [selectedConnId]);

  const fetchTables = async (connId: number) => {
    try {
      const res = await fetch(`/api/v1/database/${connId}/tables`);
      const data = await res.json();
      if (data.code === 200) {
        setTables(data.data);
      }
    } catch (e) {
      console.error('Failed to fetch tables', e);
    }
  };

  const toggleTableSelection = (tableName: string) => {
    setSelectedTables(prev => 
      prev.includes(tableName) 
        ? prev.filter(t => t !== tableName)
        : [...prev, tableName]
    );
  };

  const handleSend = async () => {
    if (!query.trim()) return;
    
    const userMessage = { role: 'user', content: query };
    setMessages(prev => [...prev, userMessage]);
    setQuery('');
    setIsStreaming(true);
    
    try {
      const response = await fetch('/api/v1/sql/generate/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream'
        },
        body: JSON.stringify({
          userId: user?.id || 1,
          userInput: query,
          connectionId: selectedConnId || null,
          tableNames: selectedTables,
          strategyName: 'openAiStrategy'
        })
      });

      if (!response.body) throw new Error('No readable stream');
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      let currentExplain = '';
      let currentSql = '';
      
      setMessages(prev => [...prev, { role: 'ai', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        for (let line of lines) {
          line = line.trim();
          if (line.startsWith('data:')) {
            let dataStr = line;
            while (dataStr.startsWith('data:')) {
              dataStr = dataStr.replace('data:', '').trim();
            }
            if (dataStr !== '') {
               try {
                 const dataObj = JSON.parse(dataStr);
                 if (dataObj.type === 'explain') {
                   currentExplain += dataObj.content;
                   setMessages(prev => {
                     const newMessages = [...prev];
                     newMessages[newMessages.length - 1].content = currentExplain;
                     return newMessages;
                   });
                 } else if (dataObj.type === 'sql') {
                   currentSql += dataObj.content;
                   setGeneratedSql(currentSql);

                  //  setMessages(prev => {
                  //   const newMessages = [...prev];
                  //   newMessages[newMessages.length - 1].content = currentExplain + "\n```sql\n" + currentSql + "\n```";
                  //   return newMessages;
                  // });
                 }
               } catch (e) {
                 // On fallback or parse error, treat as raw explanation text
                 currentExplain += dataStr;
                 setMessages(prev => {
                   const newMessages = [...prev];
                   newMessages[newMessages.length - 1].content = currentExplain;
                   return newMessages;
                 });
               }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error fetching streaming SQL:', error);
      setMessages(prev => [...prev, { role: 'ai', content: 'Sorry, I encountered an error generating the SQL.' }]);
    } finally {
      setIsStreaming(false);
    }
  };

  const handleCopySql = async () => {
    if (!generatedSql.trim()) return;
    try {
      await navigator.clipboard.writeText(generatedSql);
      setClipboardJustCopied(true);
      window.setTimeout(() => setClipboardJustCopied(false), 1200);
    } catch (e) {
      setExecuteError('Copy failed. Please check browser permissions.');
    }
  };

  const handleFormatSql = () => {
    if (!generatedSql.trim()) return;
    const selectedConn = connections.find(c => c.id === selectedConnId);
    const dbType = (selectedConn?.dbType || '').toLowerCase();
    const language = dbType === 'postgresql' ? 'postgresql' : 'mysql';
    try {
      setGeneratedSql(formatSql(generatedSql, { language }));
    } catch (e) {
      setExecuteError('SQL format failed.');
    }
  };

  const handleEditorKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== 'Tab') return;
    e.preventDefault();

    const textarea = editorRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart ?? 0;
    const end = textarea.selectionEnd ?? 0;
    const insert = '  ';
    const nextValue = generatedSql.slice(0, start) + insert + generatedSql.slice(end);
    setGeneratedSql(nextValue);

    window.requestAnimationFrame(() => {
      textarea.selectionStart = textarea.selectionEnd = start + insert.length;
    });
  };

  const runQuery = async (confirmed: boolean = false) => {
    if (!generatedSql.trim()) {
      setExecuteError('No SQL to execute.');
      return;
    }
    if (!selectedConnId) {
      setExecuteError('Please select a database connection first.');
      return;
    }

    setIsExecuting(true);
    setExecuteError('');

    try {
      const res = await fetch('/api/v1/sql/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          sql: generatedSql,
          connectionId: selectedConnId,
          confirmed
        })
      });
      const data = await res.json();

      if (data.code === 200) {
        setExecuteResult(data.data);
        return;
      }

      if (data.code === 409) {
        const ok = window.confirm(`${data.message}\n\nExecute anyway?`);
        if (ok) {
          await runQuery(true);
        } else {
          setExecuteError('Execution cancelled.');
        }
        return;
      }

      setExecuteError(data.message || 'Execution failed.');
    } catch (e) {
      setExecuteError('Execution failed. Please check backend availability.');
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <main className="ml-64 pt-14 flex flex-col h-screen overflow-hidden bg-surface">
      <div className="flex-1 flex flex-col lg:flex-row gap-0 overflow-hidden">
        {/* Left Side: Chat & Assistant */}
        <section className="w-full lg:w-1/3 flex flex-col border-r border-outline-variant/10 bg-surface-container-low">
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {messages.map((msg, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex flex-col gap-2 max-w-[90%] ${msg.role === 'user' ? 'ml-auto items-end' : ''}`}
              >
                {msg.role === 'ai' && (
                  <div className="flex items-center gap-2">
                    <Sparkles className="text-primary" size={14} />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-primary font-label">Logic Architect</span>
                  </div>
                )}
                <div className={`p-4 rounded-xl shadow-sm border border-outline-variant/10 ${
                  msg.role === 'ai' 
                    ? 'bg-surface-container-lowest rounded-tl-none' 
                    : 'bg-primary text-white rounded-tr-none'
                }`}>
                  {msg.role === 'ai' ? (
                    <div className="text-sm leading-relaxed prose prose-sm prose-invert max-w-none">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <p className="text-sm leading-relaxed">{msg.content}</p>
                  )}
                </div>
              </motion.div>
            ))}

            <AnimatePresence>
              {isStreaming && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col gap-2 max-w-[90%]"
                >
                  <div className="flex items-center gap-2">
                    <Loader2 className="text-primary animate-spin" size={14} />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-primary font-label">Streaming Response...</span>
                  </div>
                  <div className="bg-surface-container-lowest/60 p-4 rounded-xl rounded-tl-none border border-dashed border-outline-variant">
                    <div className="flex flex-col gap-2">
                      <div className="h-2 bg-surface-container-highest rounded-full w-full animate-pulse"></div>
                      <div className="h-2 bg-surface-container-highest rounded-full w-4/5 animate-pulse"></div>
                      <div className="h-2 bg-surface-container-highest rounded-full w-2/3 animate-pulse"></div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Input Area */}
          <div className="p-4 bg-surface-container-low border-t border-outline-variant/20">
            <div className="flex items-center gap-4 mb-3">
              <div className="flex items-center gap-2">
                <Database size={14} className="text-primary" />
                <select 
                  className="bg-surface-container-lowest text-xs font-semibold text-on-surface px-2 py-1 rounded border border-outline-variant/30 focus:ring-1 focus:ring-primary outline-none"
                  value={selectedConnId}
                  onChange={(e) => setSelectedConnId(e.target.value ? Number(e.target.value) : '')}
                >
                  <option value="">Select Database</option>
                  {connections.map(conn => (
                    <option key={conn.id} value={conn.id}>{conn.name}</option>
                  ))}
                </select>
              </div>

              {selectedConnId && (
                <div className="relative">
                  <button 
                    onClick={() => setShowTableSelect(!showTableSelect)}
                    className={`flex items-center gap-1 text-[10px] font-semibold font-label transition-colors ${selectedTables.length > 0 ? 'text-primary' : 'text-on-surface-variant hover:text-primary'}`}
                  >
                    <Table2 size={14} />
                    {selectedTables.length > 0 ? `${selectedTables.length} Tables Attached` : 'Attach Schema'}
                  </button>
                  
                  {showTableSelect && (
                    <div className="absolute bottom-full left-0 mb-2 w-64 bg-surface-container-high border border-outline-variant/20 rounded-xl shadow-xl z-50 overflow-hidden">
                      <div className="p-2 border-b border-outline-variant/20 bg-surface-container-highest flex justify-between items-center">
                        <span className="text-xs font-bold text-on-surface">Select Tables</span>
                        <span className="text-[10px] text-on-surface-variant">{selectedTables.length} selected</span>
                      </div>
                      <div className="max-h-48 overflow-y-auto p-1">
                        {tables.length === 0 ? (
                          <div className="p-4 text-center text-xs text-on-surface-variant">No tables found</div>
                        ) : (
                          tables.map(table => (
                            <label key={table} className="flex items-center gap-2 px-3 py-2 hover:bg-surface-container-highest rounded cursor-pointer">
                              <input 
                                type="checkbox" 
                                className="rounded border-outline-variant/30 text-primary focus:ring-primary/20"
                                checked={selectedTables.includes(table)}
                                onChange={() => toggleTableSelection(table)}
                              />
                              <span className="text-xs font-mono text-on-surface">{table}</span>
                            </label>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="relative group">
              <textarea 
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
                className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-4 pr-14 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none h-24 shadow-sm" 
                placeholder="Ask the Logic Engine to generate or modify SQL..."
              ></textarea>
              <button 
                onClick={handleSend}
                className="absolute bottom-3 right-3 p-2 primary-gradient text-white rounded-lg shadow-md transition-transform active:scale-90"
              >
                <Send size={18} />
              </button>
            </div>
            <div className="flex items-center gap-3 mt-3">
              <button className="flex items-center gap-1 text-[10px] font-semibold text-on-surface-variant font-label hover:text-primary transition-colors">
                <FileText size={14} />
                Templates
              </button>
            </div>
          </div>
        </section>

        {/* Right Side: Editor & Results */}
        <section className="flex-1 flex flex-col bg-[#1e2433] relative">
          {/* Editor Toolbar */}
          <div className="h-12 flex items-center justify-between px-4 border-b border-white/5 bg-slate-800/50">
            <div className="flex items-center gap-4">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-label flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-orange-400"></div>
                main_query.sql
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopySql}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white hover:bg-white/5 rounded transition-colors"
              >
                <Copy size={14} />
                {clipboardJustCopied ? 'Copied' : 'Copy'}
              </button>
              <button
                onClick={handleFormatSql}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white hover:bg-white/5 rounded transition-colors"
              >
                <AlignLeft size={14} />
                Format
              </button>
              <div className="h-4 w-px bg-white/10 mx-1"></div>
              <button
                disabled={isExecuting}
                onClick={() => runQuery(false)}
                className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold primary-gradient text-white rounded transition-all hover:brightness-110 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isExecuting ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} fill="currentColor" />}
                {isExecuting ? 'Running...' : 'Run Query'}
              </button>
            </div>
          </div>

          {/* Editor Surface */}
          <div 
            className="flex-1 flex font-mono leading-relaxed overflow-hidden transition-all duration-200"
            style={{ fontSize: `${fontSize}px` }}
          >
            <div className="w-12 bg-slate-900/50 flex flex-col items-center py-4 text-slate-600 select-none border-r border-white/5">
              {Array.from({ length: Math.max(15, generatedSql.split('\n').length) }).map((_, i) => <span key={i}>{i + 1}</span>)}
            </div>
            <div className="flex-1 p-4 overflow-auto bg-[#1e2433]">
              <textarea
                ref={editorRef}
                value={generatedSql}
                readOnly={isStreaming}
                onChange={(e) => setGeneratedSql(e.target.value)}
                onKeyDown={handleEditorKeyDown}
                spellCheck={false}
                autoCapitalize="off"
                autoCorrect="off"
                className="w-full h-full min-h-[240px] bg-transparent text-slate-200 font-mono outline-none resize-none"
                placeholder="AI generated SQL will appear here..."
              />
              {isStreaming && (
                <motion.div 
                  animate={{ opacity: [1, 0] }}
                  transition={{ repeat: Infinity, duration: 0.8 }}
                  className="h-4 w-1 bg-primary/40 mt-1 inline-block"
                ></motion.div>
              )}
            </div>
          </div>

          {/* Result Panel */}
          <div className="h-64 bg-surface-container-lowest border-t border-outline-variant/30 flex flex-col">
            <div className="h-10 flex items-center justify-between px-4 border-b border-outline-variant/10 bg-surface-container-low/50">
              <div className="flex items-center gap-4">
                <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest font-label">Query Results</span>
                {executeResult?.resultType === 'QUERY' && (
                  <span className="text-[10px] px-2 py-0.5 bg-primary-fixed text-primary font-bold rounded-full">
                    {(executeResult?.rowCount ?? 0).toLocaleString()} Rows
                  </span>
                )}
                {executeResult?.resultType === 'UPDATE' && (
                  <span className="text-[10px] px-2 py-0.5 bg-primary-fixed text-primary font-bold rounded-full">
                    Affected: {(executeResult?.affectedRows ?? 0).toLocaleString()}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <button className="text-on-surface-variant hover:text-primary transition-colors">
                  <Download size={16} />
                </button>
                <button className="text-on-surface-variant hover:text-primary transition-colors">
                  <Maximize2 size={16} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto">
              {executeError ? (
                <div className="p-4 text-sm text-red-400">{executeError}</div>
              ) : executeResult?.resultType === 'QUERY' ? (
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-surface-container-low/95 backdrop-blur-sm z-10">
                    <tr className="border-b border-outline-variant/20">
                      {(executeResult?.columns || []).map((h: string) => (
                        <th key={h} className="px-4 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest font-label">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/10 text-sm">
                    {(executeResult?.rows || []).map((row: any, i: number) => (
                      <tr key={i} className="hover:bg-surface-container-high/40 transition-colors">
                        {(executeResult?.columns || []).map((col: string) => (
                          <td key={col} className="px-4 py-2.5 font-mono">
                            {row?.[col] === null || row?.[col] === undefined ? '' : String(row[col])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : executeResult?.resultType === 'UPDATE' ? (
                <div className="p-4 text-sm text-on-surface">
                  {executeResult?.affectedRows === null || executeResult?.affectedRows === undefined
                    ? 'Statement executed.'
                    : `Statement executed. Affected rows: ${executeResult.affectedRows}`}
                </div>
              ) : (
                <div className="p-4 text-sm text-on-surface-variant">No results yet.</div>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* Status Bar */}
      <footer className="h-8 bg-surface-container-high border-t border-outline-variant/20 px-4 flex items-center justify-between z-50">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </div>
            <span className="text-[10px] font-bold text-on-surface-variant font-label uppercase">PostgreSQL Connected</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 size={14} className="text-on-surface-variant" />
            <span className="text-[10px] font-bold text-on-surface-variant font-label uppercase">Sync Active</span>
          </div>
          <div className="h-3 w-px bg-outline-variant/30"></div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-on-surface-variant font-label uppercase">Schema: production_v4</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 bg-primary/5 px-2 py-0.5 rounded border border-primary/10">
            <span className="text-[10px] font-bold text-primary font-label uppercase">Latency: 24ms</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-on-surface-variant font-label uppercase">UTF-8</span>
            <Info size={14} className="text-on-surface-variant" />
          </div>
        </div>
      </footer>
    </main>
  );
}
