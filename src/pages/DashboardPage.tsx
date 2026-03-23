import { useState, useRef, useEffect } from 'react';
import { Send, Copy, Play, AlignLeft, Download, Maximize2, Sparkles, Loader2, CheckCircle2, Paperclip, FileText, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useSettings } from '../contexts/SettingsContext';

export default function DashboardPage() {
  const { fontSize } = useSettings();
  const [query, setQuery] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [messages, setMessages] = useState([
    { 
      role: 'ai', 
      content: "I've generated a query to fetch the monthly revenue trends for the current fiscal year. Would you like me to add a breakdown by product category as well?" 
    },
    { 
      role: 'user', 
      content: "Yes, please include the category breakdown and sort by the highest performing month." 
    }
  ]);

  const handleSend = async () => {
    if (!query.trim()) return;
    
    const userMessage = { role: 'user', content: query };
    setMessages(prev => [...prev, userMessage]);
    setQuery('');
    setIsStreaming(true);
    
    try {
      const response = await fetch('http://localhost:8080/api/v1/sql/generate/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream'
        },
        body: JSON.stringify({
          userInput: query,
          schemaContext: 'schema_production.sales_ledger(sale_date, category_name, amount, order_id)',
          strategyName: 'openAiStrategy'
        })
      });

      if (!response.body) throw new Error('No readable stream');
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let aiMessage = '';
      
      setMessages(prev => [...prev, { role: 'ai', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        // The SSE chunk usually looks like "data: some content\n\n"
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('data:')) {
            const data = line.replace('data:', '');
            if (data.trim() !== '') {
               aiMessage += data;
               setMessages(prev => {
                 const newMessages = [...prev];
                 newMessages[newMessages.length - 1].content = aiMessage;
                 return newMessages;
               });
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
                  <p className="text-sm leading-relaxed">{msg.content}</p>
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
                <Paperclip size={14} />
                Attach Schema
              </button>
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
              {Array.from({ length: 15 }).map((_, i) => <span key={i}>{i + 1}</span>)}
            </div>
            <div className="flex-1 p-4 overflow-auto bg-[#1e2433]">
              <div className="text-indigo-300"><span className="text-pink-400">SELECT</span></div>
              <div className="pl-4 text-slate-200">
                EXTRACT(MONTH <span className="text-pink-400">FROM</span> sale_date) <span className="text-pink-400">AS</span> month,
              </div>
              <div className="pl-4 text-slate-200">category_name,</div>
              <div className="pl-4 text-slate-200">
                SUM(amount) <span className="text-pink-400">AS</span> total_revenue,
              </div>
              <div className="pl-4 text-slate-200">
                COUNT(order_id) <span className="text-pink-400">AS</span> transaction_count
              </div>
              <div className="text-indigo-300"><span className="text-pink-400">FROM</span></div>
              <div className="pl-4 text-slate-200">
                schema_production.sales_ledger <span className="text-slate-400">-- main fact table</span>
              </div>
              <div className="text-indigo-300"><span className="text-pink-400">WHERE</span></div>
              <div className="pl-4 text-slate-200">
                sale_date &gt;= <span className="text-emerald-400">'2024-01-01'</span>
              </div>
              <div className="text-indigo-300"><span className="text-pink-400">GROUP BY</span> <span className="text-slate-200">1, 2</span></div>
              <div className="text-indigo-300"><span className="text-pink-400">ORDER BY</span> <span className="text-slate-200">1, 3 DESC;</span></div>
              <motion.div 
                animate={{ opacity: [1, 0] }}
                transition={{ repeat: Infinity, duration: 0.8 }}
                className="h-4 w-1 bg-primary/40 mt-1"
              ></motion.div>
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
