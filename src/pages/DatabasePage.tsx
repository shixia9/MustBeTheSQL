import { useState, useEffect } from 'react';
import { Database, CheckCircle2, Link as LinkIcon, Eye, RefreshCw, Star, ShieldCheck, X, Activity, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface DatabasePageProps {
  user?: any;
}

export default function DatabasePage({ user }: DatabasePageProps) {
  const [connections, setConnections] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<number | 'new' | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  
  const [formData, setFormData] = useState({
    name: '',
    dbType: 'mysql',
    host: '',
    port: 3306,
    username: '',
    password: '',
    dbName: ''
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user?.id) {
      fetchConnections();
    }
  }, [user]);

  const fetchConnections = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/v1/database/list?userId=${user.id}`);
      const data = await res.json();
      if (data.code === 200) {
        setConnections(data.data);
        if (data.data.length > 0 && selectedId === null) {
          setSelectedId(data.data[0].id);
        }
      }
    } catch (e) {
      showNotification('Failed to fetch connections', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedId === 'new') {
      setFormData({
        name: '',
        dbType: 'mysql',
        host: '',
        port: 3306,
        username: '',
        password: '',
        dbName: ''
      });
    } else if (selectedId) {
      const conn = connections.find(c => c.id === selectedId);
      if (conn) {
        setFormData({
          name: conn.name || '',
          dbType: conn.dbType || 'mysql',
          host: conn.host || '',
          port: conn.port || 3306,
          username: conn.username || '',
          password: '', // Hidden password
          dbName: conn.dbName || ''
        });
      }
    }
  }, [selectedId, connections]);

  const showNotification = (msg: string, type: 'success' | 'error' = 'success') => {
    setToastMessage(msg);
    setToastType(type);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    try {
      const payload: any = { ...formData, userId: user.id };
      if (selectedId !== 'new') {
        payload.id = selectedId;
      }
      
      const res = await fetch('/api/v1/database/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      
      if (data.code === 200 && data.data === true) {
        showNotification('Connection Successful!', 'success');
      } else {
        showNotification(data.message || 'Connection Failed', 'error');
      }
    } catch (e) {
      showNotification('Error testing connection', 'error');
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload: any = { ...formData, userId: user.id };
      const isUpdate = selectedId !== 'new';
      
      if (isUpdate) {
        payload.id = selectedId;
      }
      
      const endpoint = isUpdate ? `/api/v1/database/update?userId=${user.id}` : '/api/v1/database/add';
      const method = isUpdate ? 'PUT' : 'POST';
      
      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      
      if (data.code === 200) {
        showNotification(isUpdate ? 'Connection updated' : 'Connection created', 'success');
        await fetchConnections();
        if (!isUpdate) {
          setSelectedId(data.data.id);
        }
      } else {
        showNotification(data.message || 'Failed to save', 'error');
      }
    } catch (e) {
      showNotification('Error saving connection', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (selectedId === 'new') return;
    if (!confirm('Are you sure you want to delete this connection?')) return;
    
    try {
      const res = await fetch(`/api/v1/database/delete/${selectedId}?userId=${user.id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.code === 200) {
        showNotification('Connection deleted', 'success');
        setSelectedId(null);
        fetchConnections();
      } else {
        showNotification(data.message || 'Failed to delete', 'error');
      }
    } catch (e) {
      showNotification('Error deleting connection', 'error');
    }
  };

  const selectedConnIsTest = selectedId !== 'new' && connections.find(c => c.id === selectedId)?.isTest === 1;

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
                  <span className="bg-primary/10 text-primary text-[10px] px-2 py-0.5 rounded-full font-bold">{connections.length} Active</span>
                </div>
                <div className="divide-y divide-outline-variant/10 max-h-[500px] overflow-y-auto">
                  {isLoading ? (
                    <div className="p-8 text-center text-sm text-outline-variant">Loading...</div>
                  ) : connections.length === 0 ? (
                    <div className="p-8 text-center text-sm text-outline-variant">No connections found.</div>
                  ) : (
                    connections.map((conn) => (
                      <div 
                        key={conn.id}
                        onClick={() => setSelectedId(conn.id)}
                        className={`p-4 hover:bg-surface-container-high transition-colors cursor-pointer group ${selectedId === conn.id ? 'bg-primary/5' : ''}`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <h4 className={`font-semibold text-sm ${selectedId === conn.id ? 'text-primary' : 'text-on-surface'}`}>
                            {conn.name} {conn.isTest === 1 && <span className="ml-2 text-[10px] bg-secondary-container text-on-secondary-container px-1.5 py-0.5 rounded">TEST DB</span>}
                          </h4>
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 text-[10px] font-mono text-on-surface-variant">
                          <span className="flex items-center gap-1"><Database size={12} /> {conn.host}</span>
                          <span className="text-outline-variant">|</span>
                          <span>{conn.dbType}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <button 
                  onClick={() => setSelectedId('new')}
                  className="flex items-center justify-center gap-2 w-full py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-primary hover:bg-primary/5 transition-colors border-t border-outline-variant/10"
                >
                  <Plus size={14} /> Add New Connection
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
            {selectedId === null ? (
              <div className="h-64 flex flex-col items-center justify-center text-outline-variant">
                <Database size={48} className="mb-4 opacity-20" />
                <p>Select a connection or create a new one</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-8 pb-4 border-b border-outline-variant/10">
                  <div>
                    <h2 className="text-xl font-headline font-bold text-on-surface">
                      {selectedId === 'new' ? 'New Connection Profile' : 'Connection Profile'}
                    </h2>
                    <p className="text-xs text-on-surface-variant mt-1 font-body">Configure endpoint security and logical parameters.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <select 
                      className="bg-surface-container-low text-xs font-bold text-on-surface px-3 py-1.5 rounded-lg border-none focus:ring-2 focus:ring-primary"
                      value={formData.dbType}
                      onChange={(e) => setFormData({...formData, dbType: e.target.value})}
                      disabled={selectedConnIsTest}
                    >
                      <option value="mysql">MySQL</option>
                      <option value="postgresql">PostgreSQL</option>
                    </select>
                  </div>
                </div>

                <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2 space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant ml-1">Connection Name</label>
                      <input 
                        className="w-full px-4 py-3 bg-surface-container-low text-on-surface border-none rounded-lg font-mono text-sm focus:ring-2 focus:ring-primary transition-all disabled:opacity-50" 
                        type="text" 
                        placeholder="e.g. Production Data Warehouse"
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        disabled={selectedConnIsTest}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant ml-1">Host Endpoint</label>
                      <div className="relative">
                        <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-outline-variant" size={18} />
                        <input 
                          className="w-full pl-10 pr-4 py-3 bg-surface-container-low text-on-surface border-none rounded-lg font-mono text-sm focus:ring-2 focus:ring-primary transition-all disabled:opacity-50" 
                          type="text" 
                          placeholder="localhost or 192.168.1.100"
                          value={formData.host}
                          onChange={(e) => setFormData({...formData, host: e.target.value})}
                          disabled={selectedConnIsTest}
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant ml-1">Port</label>
                      <input 
                        className="w-full px-4 py-3 bg-surface-container-low text-on-surface border-none rounded-lg font-mono text-sm focus:ring-2 focus:ring-primary transition-all disabled:opacity-50" 
                        type="number" 
                        value={formData.port}
                        onChange={(e) => setFormData({...formData, port: parseInt(e.target.value) || 0})}
                        disabled={selectedConnIsTest}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant ml-1">Logic Architect (User)</label>
                      <input 
                        className="w-full px-4 py-3 bg-surface-container-low text-on-surface border-none rounded-lg font-mono text-sm focus:ring-2 focus:ring-primary transition-all disabled:opacity-50" 
                        type="text" 
                        value={formData.username}
                        onChange={(e) => setFormData({...formData, username: e.target.value})}
                        disabled={selectedConnIsTest}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant ml-1">Access Token (Password)</label>
                      <div className="relative">
                        <input 
                          className="w-full px-4 py-3 bg-surface-container-low text-on-surface border-none rounded-lg font-mono text-sm focus:ring-2 focus:ring-primary transition-all disabled:opacity-50" 
                          type="password" 
                          placeholder={selectedId !== 'new' && !selectedConnIsTest ? '•••••••• (Leave blank to keep)' : ''}
                          value={formData.password}
                          onChange={(e) => setFormData({...formData, password: e.target.value})}
                          disabled={selectedConnIsTest}
                        />
                        <Eye className="absolute right-3 top-1/2 -translate-y-1/2 text-outline-variant cursor-pointer" size={18} />
                      </div>
                    </div>
                    <div className="md:col-span-2 space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant ml-1">Target Database Schema</label>
                      <input 
                        className="w-full px-4 py-3 bg-surface-container-low text-on-surface border-none rounded-lg font-mono text-sm focus:ring-2 focus:ring-primary transition-all disabled:opacity-50" 
                        type="text" 
                        value={formData.dbName}
                        onChange={(e) => setFormData({...formData, dbName: e.target.value})}
                        disabled={selectedConnIsTest}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-6 border-t border-outline-variant/10">
                    {selectedId !== 'new' && !selectedConnIsTest ? (
                      <button 
                        onClick={handleDelete}
                        className="px-6 py-3 border border-error/50 text-error font-bold text-xs uppercase tracking-widest rounded-lg hover:bg-error/10 transition-all"
                      >
                        Delete Connection
                      </button>
                    ) : <div></div>}
                    
                    <div className="flex items-center gap-4">
                      <button 
                        onClick={handleTestConnection}
                        disabled={isTesting}
                        className="group flex items-center gap-2 px-6 py-3 bg-surface-container-high text-primary font-bold text-xs uppercase tracking-widest rounded-lg hover:bg-primary/10 transition-all border border-primary/20 disabled:opacity-50"
                      >
                        <RefreshCw className={isTesting ? "animate-spin" : "group-hover:rotate-180 transition-transform duration-500"} size={16} />
                        {isTesting ? 'Testing...' : 'Test Connection'}
                      </button>
                      
                      {!selectedConnIsTest && (
                        <button 
                          onClick={handleSave}
                          disabled={isSaving}
                          className="px-8 py-3 primary-gradient text-white font-bold text-xs uppercase tracking-[0.2em] rounded-lg shadow-lg hover:shadow-primary/20 transition-all active:scale-95 disabled:opacity-50"
                        >
                          {isSaving ? 'Saving...' : 'Save Config'}
                        </button>
                      )}
                    </div>
                  </div>
                </form>
              </>
            )}
          </section>
        </div>
      </div>

      {/* Toast Notification */}
      <AnimatePresence>
        {showToast && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed bottom-8 right-8 z-[60]"
          >
            <div className={`backdrop-blur-xl border p-4 rounded-xl shadow-2xl flex items-center gap-4 max-w-sm ${toastType === 'success' ? 'bg-primary/90 border-white/20' : 'bg-error/90 border-error/50'}`}>
              <div className="bg-white/20 p-2 rounded-lg text-white">
                {toastType === 'success' ? (
                  <CheckCircle2 size={24} fill="currentColor" className={toastType === 'success' ? 'text-primary' : 'text-error'} />
                ) : (
                  <X size={24} className="text-white" />
                )}
              </div>
              <div>
                <p className="text-xs font-bold text-white uppercase tracking-widest">{toastType === 'success' ? 'Success' : 'Error'}</p>
                <p className="text-[10px] text-white/90 font-medium break-all">{toastMessage}</p>
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
