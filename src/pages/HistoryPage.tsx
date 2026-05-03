import { useState, useEffect } from 'react';
import { Search, Calendar, ChevronLeft, ChevronRight, Play, Copy, Dock, Trash2, X, RefreshCw, Share2, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { QueryRecord } from '../types';

export default function HistoryPage({ user }: { user: any }) {
  const [selectedQuery, setSelectedQuery] = useState<QueryRecord | null>(null);
  const [queries, setQueries] = useState<QueryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Pagination & Filter States
  const [page, setPage] = useState(1);
  const [size] = useState(10);
  const [total, setTotal] = useState(0);
  const [keyword, setKeyword] = useState('');
  const [dbType, setDbType] = useState('All DB Types');
  const [model, setModel] = useState('All Models');
  
  // Lineage State
  const [lineage, setLineage] = useState<any[]>([]);
  const [isLoadingLineage, setIsLoadingLineage] = useState(false);

  // Copy Feedback State
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Debounce fetch when filters change
  useEffect(() => {
    if (user?.id) {
      const timer = setTimeout(() => {
        fetchHistory();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [user, page, keyword, dbType, model]);

  useEffect(() => {
    if (selectedQuery) {
      fetchLineage(selectedQuery.id);
    } else {
      setLineage([]);
    }
  }, [selectedQuery]);

  const fetchHistory = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        size: size.toString(),
      });
      if (keyword) params.append('keyword', keyword);
      if (dbType !== 'All DB Types') params.append('dbType', dbType);
      if (model !== 'All Models') params.append('model', model);

      const res = await fetch(`/api/v1/history/user/${user.id}?${params.toString()}`);
      const data = await res.json();
      if (data.code === 200 && data.data) {
        const records = data.data.records || [];
        setTotal(data.data.total || 0);
        
        const formattedQueries: QueryRecord[] = records.map((item: any) => ({
          id: item.id.toString(),
          prompt: item.prompt || '',
          database: item.databaseName || 'Unknown',
          connectionId: item.connectionId,
          sql: item.generatedSql || '',
          model: item.modelName || 'Unknown',
          latency: item.executeLatency != null ? `${item.executeLatency}ms` : '-',
          tokens: item.tokens || 0,
          rows: item.rowCount || 0,
          cost: item.cost || 0,
          parentId: item.parentId ? item.parentId.toString() : undefined,
          timestamp: new Date(item.createTime).toLocaleString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit'
          })
        }));
        setQueries(formattedQueries);
        
        // Auto-select first item if current selection is not in the list
        if (formattedQueries.length > 0 && (!selectedQuery || !formattedQueries.find(q => q.id === selectedQuery.id))) {
          setSelectedQuery(formattedQueries[0]);
        } else if (formattedQueries.length === 0) {
          setSelectedQuery(null);
        }
      }
    } catch (e) {
      console.error('Failed to fetch history', e);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLineage = async (historyId: string) => {
    try {
      setIsLoadingLineage(true);
      const res = await fetch(`/api/v1/history/${historyId}/lineage`);
      const data = await res.json();
      if (data.code === 200) {
        setLineage(data.data || []);
      }
    } catch (e) {
      console.error('Failed to fetch lineage', e);
    } finally {
      setIsLoadingLineage(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this query history?')) return;
    
    try {
      const res = await fetch(`/api/v1/history/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.code === 200) {
        if (selectedQuery?.id === id) {
          setSelectedQuery(null);
        }
        // If it's the last item on the page and not page 1, go back a page
        if (queries.length === 1 && page > 1) {
          setPage(p => p - 1);
        } else {
          fetchHistory();
        }
      }
    } catch (e) {
      console.error('Failed to delete history', e);
    }
  };

  const handleCopy = async (text: string, id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (e) {
      console.error('Failed to copy', e);
    }
  };

  const handleReRun = (query: QueryRecord, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    // Dispatch global event to jump to dashboard and re-run
    const detail = {
      prompt: query.prompt,
      sql: query.sql,
      connectionId: query.connectionId,
      parentHistoryId: query.id
    };
    window.dispatchEvent(new CustomEvent('re-run-query', { detail }));
    // Also change page to dashboard by dispatching an event that App.tsx can listen to,
    // Or simpler: We can dispatch a global event that Sidebar listens to.
    window.dispatchEvent(new CustomEvent('navigate', { detail: 'dashboard' }));
  };

  return (
    <main className="ml-64 pt-14 min-h-screen flex bg-surface-container-low">
      {/* Query Management Table Area */}
      <section className="flex-1 p-8 overflow-hidden flex flex-col gap-8">
        <div className="flex items-end justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant/70 block mb-1">Architecture Overview</span>
            <h1 className="text-3xl font-extrabold font-headline text-on-surface tracking-tight">Query Ledger</h1>
          </div>
          <div className="flex gap-4">
            <div className="px-4 py-2 bg-surface-container-highest/30 rounded-lg flex flex-col items-end">
              <span className="text-[10px] font-bold uppercase text-primary/70">Total Queries</span>
            <span className="font-mono text-lg font-bold">{isLoading ? '-' : total}</span>
          </div>
            <div className="px-4 py-2 bg-surface-container-highest/30 rounded-lg flex flex-col items-end">
              <span className="text-[10px] font-bold uppercase text-primary/70">Avg Latency</span>
              <span className="font-mono text-lg font-bold">
                {isLoading ? '-' : (queries.filter(q => q.latency !== '-').length > 0 
                  ? `${Math.round(queries.filter(q => q.latency !== '-').reduce((acc, q) => acc + parseInt(q.latency.replace('ms', '')), 0) / queries.filter(q => q.latency !== '-').length)}ms` 
                  : '-')}
              </span>
            </div>
          </div>
        </div>

        {/* Toolbar / Filters */}
        <div className="bg-surface-container-lowest p-4 rounded-xl shadow-sm flex flex-wrap items-center gap-4 border border-outline-variant/10">
          <div className="relative flex-1 min-w-[300px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/60" size={18} />
            <input 
              className="w-full pl-10 pr-4 py-2 bg-surface-container-low border-none rounded-md focus:ring-2 focus:ring-primary/20 text-sm text-on-surface" 
              placeholder="Search prompt excerpts or snippets..." 
              type="text"
              value={keyword}
              onChange={(e) => {
                setKeyword(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className="flex items-center gap-3">
            <select 
              className="bg-surface-container-low border-none text-xs font-semibold uppercase tracking-wider py-2 pl-3 pr-8 rounded-md focus:ring-2 focus:ring-primary/20 cursor-pointer text-on-surface"
              value={dbType}
              onChange={(e) => {
                setDbType(e.target.value);
                setPage(1);
              }}
            >
              <option>All DB Types</option>
              <option value="MySQL">MySQL</option>
              <option value="PostgreSQL">PostgreSQL</option>
            </select>
            <select 
              className="bg-surface-container-low border-none text-xs font-semibold uppercase tracking-wider py-2 pl-3 pr-8 rounded-md focus:ring-2 focus:ring-primary/20 cursor-pointer text-on-surface"
              value={model}
              onChange={(e) => {
                setModel(e.target.value);
                setPage(1);
              }}
            >
              <option>All Models</option>
              <option value="openAiStrategy">GPT-4o</option>
              <option value="claudeStrategy">Claude 3.5</option>
            </select>
            <button className="flex items-center gap-2 px-4 py-2 bg-surface-container-high hover:bg-surface-container-highest transition-colors rounded-md text-xs font-bold uppercase tracking-widest text-on-surface-variant">
              <Calendar size={14} />
              Date Range
            </button>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden flex flex-col border border-outline-variant/10">
          <table className="w-full text-left border-collapse">
            <thead className="bg-surface-container-high/50 border-b border-outline-variant/10">
              <tr>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant">Prompt Excerpt</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant">SQL Snippet</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant">LLM Model</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant">Date / Time</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/5">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-sm text-on-surface-variant">Loading history...</td>
                </tr>
              ) : queries.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-sm text-on-surface-variant">No history found. Try running a query!</td>
                </tr>
              ) : queries.map((q) => (
                <tr 
                  key={q.id} 
                  onClick={() => setSelectedQuery(q)}
                  className={`hover:bg-surface-container-high/20 transition-colors group cursor-pointer ${selectedQuery?.id === q.id ? 'bg-primary/5' : ''}`}
                >
                  <td className="px-6 py-5">
                    <p className="text-sm font-medium text-on-surface truncate max-w-xs">{q.prompt}</p>
                    <span className="text-[10px] text-primary font-bold uppercase flex items-center gap-1 mt-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary"></div> {q.database}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <code className="text-[11px] font-mono bg-inverse-surface/5 text-primary px-2 py-1 rounded truncate block max-w-[200px]">{q.sql}</code>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-surface-container-highest text-primary text-[10px] font-bold rounded uppercase">{q.model}</span>
                      <span className="text-[10px] text-on-surface-variant font-medium">{q.latency}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <p className="text-[11px] font-medium text-on-surface-variant">{q.timestamp.split(',')[0]}</p>
                    <p className="text-[10px] text-on-surface-variant/60">{q.timestamp.split(',')[1]}</p>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={(e) => handleReRun(q, e)}
                        className="p-1.5 hover:bg-primary/10 text-primary rounded" 
                        title="Re-run in Dashboard"
                      >
                        <Play size={16} />
                      </button>
                      <button 
                        onClick={(e) => handleCopy(q.sql, q.id, e)}
                        className="p-1.5 hover:bg-primary/10 text-primary rounded"
                        title="Copy SQL"
                      >
                        {copiedId === q.id ? <CheckCircle2 size={16} /> : <Copy size={16} />}
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setSelectedQuery(q); }}
                        className="p-1.5 hover:bg-primary/10 text-primary rounded"
                        title="View Details"
                      >
                        <Dock size={16} />
                      </button>
                      <button 
                        onClick={(e) => handleDelete(q.id, e)}
                        className="p-1.5 hover:bg-error/10 text-error rounded"
                        title="Delete Record"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          <div className="px-6 py-4 border-t border-outline-variant/10 flex items-center justify-between bg-surface-container-low/30">
            <span className="text-[10px] font-bold uppercase text-on-surface-variant/60 tracking-wider">
              Showing {queries.length > 0 ? (page - 1) * size + 1 : 0} - {Math.min(page * size, total)} of {total} queries
            </span>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1 text-on-surface-variant hover:bg-surface-container-high rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={18} />
              </button>
              <button className="px-3 py-1 bg-primary text-white text-xs font-bold rounded">{page}</button>
              <button 
                onClick={() => setPage(p => p + 1)}
                disabled={page * size >= total}
                className="p-1 text-on-surface-variant hover:bg-surface-container-high rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Detail Sidebar View */}
      <AnimatePresence>
        {selectedQuery && (
          <motion.aside 
            initial={{ x: 400 }}
            animate={{ x: 0 }}
            exit={{ x: 400 }}
            className="w-96 border-l border-outline-variant/20 bg-surface-container-low flex flex-col shadow-2xl z-10"
          >
            <div className="p-6 border-b border-outline-variant/10 flex items-center justify-between">
              <div>
                <h2 className="font-headline font-bold text-lg text-on-surface leading-tight">Query Detail</h2>
                <p className="text-[10px] font-bold uppercase text-primary tracking-widest">ID: {selectedQuery.id}</p>
              </div>
              <button 
                onClick={() => setSelectedQuery(null)}
                className="p-2 hover:bg-surface-container-high rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-3 block">Natural Language Prompt</span>
                <div className="bg-surface-container-lowest p-4 rounded-xl shadow-sm border border-outline-variant/10">
                  <p className="text-sm text-on-surface leading-relaxed italic">"{selectedQuery.prompt}"</p>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Generated SQL</span>
                  <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-bold rounded">{selectedQuery.model}</span>
                </div>
                <div className="bg-[#1e2433] rounded-xl overflow-hidden shadow-xl border border-white/5">
                  <div className="px-4 py-2 bg-slate-800/50 border-b border-white/5 flex justify-between items-center">
                    <span className="text-[10px] text-slate-400 font-mono uppercase">{selectedQuery.database}</span>
                    <button 
                      onClick={() => handleCopy(selectedQuery.sql, selectedQuery.id)}
                      className="text-slate-400 hover:text-white transition-colors"
                      title="Copy SQL"
                    >
                      {copiedId === selectedQuery.id ? <CheckCircle2 size={14} className="text-primary" /> : <Copy size={14} />}
                    </button>
                  </div>
                  <pre className="p-4 text-[11px] font-mono text-slate-200 leading-relaxed overflow-x-auto whitespace-pre-wrap">
                    <code>{selectedQuery.sql}</code>
                  </pre>
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-3 block">Execution Telemetry</span>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Latency', value: selectedQuery.latency },
                    { label: 'Tokens', value: selectedQuery.tokens },
                    { label: 'Rows', value: selectedQuery.rows },
                    { label: 'Cost', value: `$${selectedQuery.cost}` },
                  ].map((stat) => (
                    <div key={stat.label} className="bg-surface-container-lowest p-3 rounded-lg border border-outline-variant/10">
                      <p className="text-[10px] text-on-surface-variant/60 font-bold uppercase">{stat.label}</p>
                      <p className="font-mono text-sm font-bold">{stat.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-4 block">Process History Lineage</span>
                <div className="space-y-4 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-[1px] before:bg-outline-variant/30">
                  {isLoadingLineage ? (
                    <div className="pl-8 text-xs text-on-surface-variant">Loading lineage...</div>
                  ) : lineage.length > 0 ? (
                    lineage.map((item, index) => {
                      const isCurrent = item.id.toString() === selectedQuery.id;
                      return (
                        <div key={item.id} className="relative pl-8">
                          <div className={`absolute left-0 top-1 w-4 h-4 rounded-full border-4 border-surface-container-low ${isCurrent ? 'bg-primary' : 'bg-outline-variant'}`}></div>
                          <p className={`text-[11px] font-bold ${isCurrent ? 'text-primary' : 'text-on-surface'}`}>
                            {index === 0 ? 'Original Query' : 'Derived Query (Re-run)'}
                            {isCurrent && ' (Current)'}
                          </p>
                          <p className="text-[10px] text-on-surface-variant/70">
                            {new Date(item.createTime).toLocaleString()}
                          </p>
                        </div>
                      );
                    })
                  ) : (
                    <div className="pl-8 text-xs text-on-surface-variant">No lineage data.</div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6 bg-surface-container-highest/20 border-t border-outline-variant/10 grid grid-cols-2 gap-3">
              <button 
                onClick={() => handleReRun(selectedQuery)}
                className="flex items-center justify-center gap-2 py-2.5 primary-gradient text-white rounded-md font-bold text-xs uppercase tracking-widest shadow-md active:scale-95 transition-all"
              >
                <RefreshCw size={14} />
                Re-run
              </button>
              <button className="flex items-center justify-center gap-2 py-2.5 border border-outline-variant text-on-surface rounded-md font-bold text-xs uppercase tracking-widest hover:bg-surface-container-high transition-colors active:scale-95">
                <Share2 size={14} />
                Share
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </main>
  );
}
