import { useState, useRef, useEffect } from 'react';
import { Send, Copy, Play, AlignLeft, Download, Maximize2, Sparkles, Loader2, CheckCircle2, Paperclip, FileText, Info, Database, Table2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { useSettings } from '../contexts/SettingsContext';

export default function DashboardPage({ user }: { user: any }) {
  const { fontSize } = useSettings();
  const [query, setQuery] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [messages, setMessages] = useState([
    { 
      role: 'ai', 
      content: `Welcome, ${user?.username || 'User'}! You have ${user?.tokenQuota || 0} AI tokens remaining. How can I help you today?` 
    }
  ]);
  const [generatedSql, setGeneratedSql] = useState('');

  // Schema context states
  const [connections, setConnections] = useState<any[]>([]);
  const [selectedConnId, setSelectedConnId] = useState<number | ''>('');
  const [tables, setTables] = useState<string[]>([]);
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [showTableSelect, setShowTableSelect] = useState(false);

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
      let fullResponse = '';
      
      setMessages(prev => [...prev, { role: 'ai', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('data:')) {
            const data = line.replace('data:', '');
            if (data.trim() !== '') {
               fullResponse += data;
               
               // Parse the full response to separate SQL and explanation
               // Looking for ```sql ... ``` or ```sql\n ... \n```
               // We use [\s\S]*? to match across multiple lines and \s* to handle optional newlines
               const sqlMatch = fullResponse.match(/```sql\s*([\s\S]*?)\s*```/i);
               
               if (sqlMatch && sqlMatch[1]) {
                 setGeneratedSql(sqlMatch[1].trim());
                 // Remove the SQL block from the chat message content
                 const explanation = fullResponse.replace(/```sql\s*[\s\S]*?\s*```/i, '').trim();
                 setMessages(prev => {
                   const newMessages = [...prev];
                   newMessages[newMessages.length - 1].content = explanation;
                   return newMessages;
                 });
               } else {
                 // If no SQL block is complete yet, show everything in chat
                 setMessages(prev => {
                   const newMessages = [...prev];
                   newMessages[newMessages.length - 1].content = fullResponse;
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
              <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white hover:bg-white/5 rounded transition-colors">
                <Copy size={14} />
                Copy
              </button>
              <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white hover:bg-white/5 rounded transition-colors">
                <AlignLeft size={14} />
                Format
              </button>
              <div className="h-4 w-px bg-white/10 mx-1"></div>
              <button className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold primary-gradient text-white rounded transition-all hover:brightness-110 active:scale-95">
                <Play size={14} fill="currentColor" />
                Run Query
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
              {generatedSql ? (
                <pre className="text-slate-200 font-mono whitespace-pre-wrap">
                  {/* Basic syntax highlighting simulation */}
                  {generatedSql.split(/(\bSELECT\b|\bFROM\b|\bWHERE\b|\bGROUP BY\b|\bORDER BY\b|\bJOIN\b|\bON\b|\bAND\b|\bOR\b|\bAS\b|\bLIMIT\b)/i).map((part, i) => {
                    if (['SELECT', 'FROM', 'WHERE', 'GROUP BY', 'ORDER BY', 'JOIN', 'ON', 'AND', 'OR', 'AS', 'LIMIT'].includes(part.toUpperCase())) {
                      return <span key={i} className="text-pink-400 font-bold">{part}</span>;
                    }
                    if (part.trim().startsWith('--')) {
                       return <span key={i} className="text-slate-400 italic">{part}</span>;
                    }
                    return <span key={i}>{part}</span>;
                  })}
                </pre>
              ) : (
                <div className="text-slate-500 italic mt-4 ml-4">
                  AI generated SQL will appear here...
                </div>
              )}
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
                <span className="text-[10px] px-2 py-0.5 bg-primary-fixed text-primary font-bold rounded-full">1,248 Rows</span>
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
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-surface-container-low/95 backdrop-blur-sm z-10">
                  <tr className="border-b border-outline-variant/20">
                    {['Month', 'Category', 'Revenue', 'Transactions'].map((h) => (
                      <th key={h} className={`px-4 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest font-label ${h === 'Revenue' || h === 'Transactions' ? 'text-right' : ''}`}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10 text-sm">
                  {[
                    { month: 'January', cat: 'Enterprise Cloud', rev: '$1,240,500.00', trans: '14,202' },
                    { month: 'January', cat: 'Consumer Apps', rev: '$842,120.50', trans: '98,124' },
                    { month: 'February', cat: 'Enterprise Cloud', rev: '$1,450,200.00', trans: '16,110' },
                    { month: 'February', cat: 'Consulting Services', rev: '$320,000.00', trans: '42' },
                  ].map((row, i) => (
                    <tr key={i} className="hover:bg-surface-container-high/40 transition-colors">
                      <td className="px-4 py-2.5 font-medium">{row.month}</td>
                      <td className="px-4 py-2.5">{row.cat}</td>
                      <td className="px-4 py-2.5 text-right font-mono">{row.rev}</td>
                      <td className="px-4 py-2.5 text-right font-mono">{row.trans}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
