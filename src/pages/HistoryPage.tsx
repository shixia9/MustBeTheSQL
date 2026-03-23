import { useState } from 'react';
import { Search, Calendar, ChevronLeft, ChevronRight, Play, Copy, Dock, Trash2, X, RefreshCw, Share2, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MOCK_QUERIES } from '../constants';
import { QueryRecord } from '../types';

export default function HistoryPage() {
  const [selectedQuery, setSelectedQuery] = useState<QueryRecord | null>(MOCK_QUERIES[0]);

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
              <span className="font-mono text-lg font-bold">1,284</span>
            </div>
            <div className="px-4 py-2 bg-surface-container-highest/30 rounded-lg flex flex-col items-end">
              <span className="text-[10px] font-bold uppercase text-primary/70">Avg Latency</span>
              <span className="font-mono text-lg font-bold">42ms</span>
            </div>
          </div>
        </div>

        {/* Toolbar / Filters */}
        <div className="bg-surface-container-lowest p-4 rounded-xl shadow-sm flex flex-wrap items-center gap-4 border border-outline-variant/10">
          <div className="relative flex-1 min-w-[300px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/60" size={18} />
            <input 
              className="w-full pl-10 pr-4 py-2 bg-surface-container-low border-none rounded-md focus:ring-2 focus:ring-primary/20 text-sm" 
              placeholder="Search prompt excerpts or snippets..." 
              type="text"
            />
          </div>
          <div className="flex items-center gap-3">
            <select className="bg-surface-container-low border-none text-xs font-semibold uppercase tracking-wider py-2 pl-3 pr-8 rounded-md focus:ring-2 focus:ring-primary/20 cursor-pointer">
              <option>All DB Types</option>
              <option>PostgreSQL</option>
              <option>Snowflake</option>
            </select>
            <select className="bg-surface-container-low border-none text-xs font-semibold uppercase tracking-wider py-2 pl-3 pr-8 rounded-md focus:ring-2 focus:ring-primary/20 cursor-pointer">
              <option>All Models</option>
              <option>GPT-4o</option>
              <option>Claude 3.5</option>
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
              {MOCK_QUERIES.map((q) => (
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
                    <p className="text-[11px] font-medium text-on-surface-variant">{q.timestamp.split(' ')[0]}</p>
                    <p className="text-[10px] text-on-surface-variant/60">{q.timestamp.split(' ')[1]}</p>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-1.5 hover:bg-primary/10 text-primary rounded"><Play size={16} /></button>
                      <button className="p-1.5 hover:bg-primary/10 text-primary rounded"><Copy size={16} /></button>
                      <button className="p-1.5 hover:bg-primary/10 text-primary rounded"><Dock size={16} /></button>
                      <button className="p-1.5 hover:bg-error/10 text-error rounded"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          <div className="px-6 py-4 border-t border-outline-variant/10 flex items-center justify-between bg-surface-container-low/30">
            <span className="text-[10px] font-bold uppercase text-on-surface-variant/60 tracking-wider">Showing 1-10 of 1,284 queries</span>
            <div className="flex items-center gap-2">
              <button className="p-1 text-on-surface-variant/40 cursor-not-allowed"><ChevronLeft size={18} /></button>
              <button className="px-3 py-1 bg-primary text-white text-xs font-bold rounded">1</button>
              <button className="px-3 py-1 hover:bg-surface-container-high text-xs font-bold rounded transition-colors">2</button>
              <button className="px-3 py-1 hover:bg-surface-container-high text-xs font-bold rounded transition-colors">3</button>
              <button className="p-1 text-on-surface-variant hover:bg-surface-container-high rounded transition-colors"><ChevronRight size={18} /></button>
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
                  <div className="px-4 py-2 bg-surface-container-high/50 border-b border-white/5 flex justify-between items-center">
                    <span className="text-[10px] text-white/40 font-mono uppercase">PostgreSQL</span>
                    <button className="text-white/60 hover:text-white transition-colors"><Copy size={14} /></button>
                  </div>
                  <pre className="p-4 text-[11px] font-mono text-primary-fixed leading-relaxed overflow-x-auto">
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
                <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-4 block">Process History</span>
                <div className="space-y-4 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-[1px] before:bg-outline-variant/30">
                  <div className="relative pl-8">
                    <div className="absolute left-0 top-1 w-4 h-4 rounded-full bg-primary border-4 border-surface-container-low"></div>
                    <p className="text-[11px] font-bold text-on-surface">Query Executed</p>
                    <p className="text-[10px] text-on-surface-variant/70">{selectedQuery.timestamp}</p>
                  </div>
                  <div className="relative pl-8">
                    <div className="absolute left-0 top-1 w-4 h-4 rounded-full bg-outline-variant border-4 border-surface-container-low"></div>
                    <p className="text-[11px] font-bold text-on-surface">SQL Generated</p>
                    <p className="text-[10px] text-on-surface-variant/70">{selectedQuery.timestamp}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 bg-surface-container-highest/20 border-t border-outline-variant/10 grid grid-cols-2 gap-3">
              <button className="flex items-center justify-center gap-2 py-2.5 primary-gradient text-white rounded-md font-bold text-xs uppercase tracking-widest shadow-md active:scale-95 transition-all">
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
