import { useState } from 'react';
import { Database, CheckCircle2, Link as LinkIcon, Eye, RefreshCw, Star, ShieldCheck, X, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MOCK_CONNECTIONS } from '../constants';

export default function DatabasePage() {
  const [selectedId, setSelectedId] = useState(MOCK_CONNECTIONS[0].id);
  const [showToast, setShowToast] = useState(true);

  const selectedConn = MOCK_CONNECTIONS.find(c => c.id === selectedId) || MOCK_CONNECTIONS[0];

  return (
    <main className="ml-64 pt-14 min-h-screen bg-surface">
      <div className="max-w-7xl mx-auto p-8">
        <header className="flex flex-col mb-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary bg-primary/10 px-2 py-0.5 rounded">Architecture</span>
            <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-outline-variant">/ Configuration</span>
          </div>
          <h1 className="text-4xl font-extrabold font-headline tracking-tight text-on-surface">Database Ledger</h1>
          <p className="text-on-surface-variant max-w-2xl mt-2 font-body text-sm leading-relaxed">
            Manage high-concurrency connections and structural schemas. Define your logic endpoints with architectural precision.
          </p>
        </header>

        <div className="grid grid-cols-12 gap-8 items-start">
          {/* Left: List View */}
          <section className="col-span-12 lg:col-span-4 space-y-4">
            <div className="bg-surface-container-low p-1 rounded-xl shadow-sm">
              <div className="bg-surface-container-lowest rounded-lg border border-outline-variant/10 overflow-hidden">
                <div className="p-4 border-b border-outline-variant/10 flex justify-between items-center bg-surface-container-low/30">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-on-surface">Connections</h3>
                  <span className="bg-primary/10 text-primary text-[10px] px-2 py-0.5 rounded-full font-bold">2 Active</span>
                </div>
                <div className="divide-y divide-outline-variant/10">
                  {MOCK_CONNECTIONS.map((conn) => (
                    <div 
                      key={conn.id}
                      onClick={() => setSelectedId(conn.id)}
                      className={`p-4 hover:bg-surface-container-high transition-colors cursor-pointer group ${selectedId === conn.id ? 'bg-primary/5' : ''}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <h4 className={`font-semibold text-sm ${selectedId === conn.id ? 'text-primary' : 'text-on-surface'}`}>{conn.name}</h4>
                        <div className="flex items-center gap-1.5">
                          {conn.status === 'active' ? (
                            <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                          ) : (
                            <div className="w-2 h-2 rounded-full bg-outline-variant"></div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] font-mono text-on-surface-variant">
                        <span className="flex items-center gap-1"><Database size={12} /> {conn.host}</span>
                        <span className="text-outline-variant">|</span>
                        <span>port: {conn.port}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <button className="w-full py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-primary hover:bg-primary/5 transition-colors border-t border-outline-variant/10">
                  + Add New Connection
                </button>
              </div>
            </div>

            <div className="bg-inverse-surface text-white p-5 rounded-xl flex items-center justify-between shadow-xl">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-white/60 mb-1">Avg Latency</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-mono font-bold">24</span>
                  <span className="text-xs text-white/60">ms</span>
                </div>
              </div>
              <div className="h-10 w-24 bg-primary/20 rounded-md overflow-hidden relative">
                <Activity className="absolute inset-0 w-full h-full text-primary opacity-40" />
              </div>
            </div>
          </section>

          {/* Right: Form View */}
          <section className="col-span-12 lg:col-span-8 bg-surface-container-lowest rounded-2xl p-8 border border-outline-variant/10 shadow-sm">
            <div className="flex items-center justify-between mb-8 pb-4 border-b border-outline-variant/10">
              <div>
                <h2 className="text-xl font-headline font-bold text-on-surface">Connection Profile</h2>
                <p className="text-xs text-on-surface-variant mt-1 font-body">Configure endpoint security and logical parameters.</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold font-mono bg-secondary-container text-on-secondary-container px-2 py-1 rounded">SSL: REQUIRED</span>
              </div>
            </div>

            <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant ml-1">Host Endpoint</label>
                  <div className="relative">
                    <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-outline-variant" size={18} />
                    <input 
                      className="w-full pl-10 pr-4 py-3 bg-surface-container-low text-on-surface border-none rounded-lg font-mono text-sm focus:ring-2 focus:ring-primary transition-all" 
                      type="text" 
                      defaultValue={selectedConn.host}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant ml-1">Port</label>
                  <input 
                    className="w-full px-4 py-3 bg-surface-container-low text-on-surface border-none rounded-lg font-mono text-sm focus:ring-2 focus:ring-primary transition-all" 
                    type="number" 
                    defaultValue={selectedConn.port}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant ml-1">Logic Architect (User)</label>
                  <input 
                    className="w-full px-4 py-3 bg-surface-container-low text-on-surface border-none rounded-lg font-mono text-sm focus:ring-2 focus:ring-primary transition-all" 
                    type="text" 
                    defaultValue={selectedConn.user}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant ml-1">Access Token (Password)</label>
                  <div className="relative">
                    <input 
                      className="w-full px-4 py-3 bg-surface-container-low text-on-surface border-none rounded-lg font-mono text-sm focus:ring-2 focus:ring-primary transition-all" 
                      type="password" 
                      defaultValue="••••••••••••"
                    />
                    <Eye className="absolute right-3 top-1/2 -translate-y-1/2 text-outline-variant cursor-pointer" size={18} />
                  </div>
                </div>
                <div className="md:col-span-2 space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant ml-1">Target Database Schema</label>
                  <input 
                    className="w-full px-4 py-3 bg-surface-container-low text-on-surface border-none rounded-lg font-mono text-sm focus:ring-2 focus:ring-primary transition-all" 
                    type="text" 
                    defaultValue="analytics_warehouse_v2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-6">
                <div className="flex items-center justify-between p-4 rounded-xl bg-surface-container-low border border-outline-variant/10">
                  <div className="flex items-center gap-3">
                    <Star className="text-primary fill-primary" size={20} />
                    <div>
                      <p className="text-xs font-bold text-on-surface">Default Gateway</p>
                      <p className="text-[10px] text-on-surface-variant">Set as primary source for queries</p>
                    </div>
                  </div>
                  <div className="w-10 h-5 bg-primary rounded-full relative cursor-pointer shadow-inner">
                    <div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full transition-all"></div>
                  </div>
                </div>
                <div className="flex items-center justify-between p-4 rounded-xl bg-surface-container-low border border-outline-variant/10">
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="text-primary" size={20} />
                    <div>
                      <p className="text-xs font-bold text-on-surface">SSL Enforcement</p>
                      <p className="text-[10px] text-on-surface-variant">Strict handshake validation</p>
                    </div>
                  </div>
                  <div className="w-10 h-5 bg-primary rounded-full relative cursor-pointer shadow-inner">
                    <div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full transition-all"></div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-6 border-t border-outline-variant/10">
                <button className="px-6 py-3 border border-outline-variant text-on-surface-variant font-bold text-xs uppercase tracking-widest rounded-lg hover:bg-surface-container-high transition-all">
                  Delete Connection
                </button>
                <div className="flex items-center gap-4">
                  <button className="group flex items-center gap-2 px-6 py-3 bg-surface-container-high text-primary font-bold text-xs uppercase tracking-widest rounded-lg hover:bg-primary/10 transition-all border border-primary/20">
                    <RefreshCw className="group-hover:rotate-180 transition-transform duration-500" size={16} />
                    Test Connection
                  </button>
                  <button className="px-8 py-3 primary-gradient text-white font-bold text-xs uppercase tracking-[0.2em] rounded-lg shadow-lg hover:shadow-primary/20 transition-all active:scale-95">
                    Save Config
                  </button>
                </div>
              </div>
            </form>
          </section>
        </div>
      </div>

      {/* Success Toast */}
      <AnimatePresence>
        {showToast && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed bottom-8 right-8 z-[60]"
          >
            <div className="bg-primary/90 backdrop-blur-xl border border-white/20 p-4 rounded-xl shadow-2xl flex items-center gap-4 max-w-xs">
              <div className="bg-white/20 p-2 rounded-lg text-white">
                <CheckCircle2 size={24} fill="currentColor" className="text-primary" />
              </div>
              <div>
                <p className="text-xs font-bold text-white uppercase tracking-widest">Handshake Valid</p>
                <p className="text-[10px] text-white/80 font-medium">PostgreSQL response received in 12ms.</p>
              </div>
              <button 
                onClick={() => setShowToast(false)}
                className="ml-auto text-white/50 hover:text-white transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
