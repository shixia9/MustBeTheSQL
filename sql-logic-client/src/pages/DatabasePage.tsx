import { useState, useEffect } from 'react';
import { Database, Plus, RefreshCw, Trash2, X } from 'lucide-react';
import { api } from '../api/client';
import ConfirmDialog from '../components/ConfirmDialog';

interface DatabasePageProps { user?: any; }

export default function DatabasePage({ user }: DatabasePageProps) {
  const uid = user?.id || 1;
  const [conns, setConns] = useState<any[]>([]);
  const [sid, setSid] = useState<number | 'new' | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);
  const [f, setF] = useState({ name: '', dbType: 'mysql', host: '', port: 3306, username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => { if (uid) load(); }, [uid]);

  const load = async () => { setLoading(true); try { const d = await api.get('/database/list?userId=' + uid); if (d.code === 200) { setConns(d.data); if (d.data.length > 0 && sid === null) setSid(d.data[0].id); } } catch {} finally { setLoading(false); } };

  useEffect(() => { if (sid === 'new') { setF({ name: '', dbType: 'mysql', host: '', port: 3306, username: '', password: '' }); } else if (sid) { const c = conns.find(x => x.id === sid); if (c) setF({ name: c.name || '', dbType: c.dbType || 'mysql', host: c.host || '', port: c.port || 3306, username: c.username || '', password: '' }); } }, [sid, conns]);

  const toast_ = (m: string, t: 'ok' | 'err' = 'ok') => { setToast({ msg: m, type: t }); setTimeout(() => setToast(null), 3000); };
  const testConn = async () => { setTesting(true); try { const p: any = { ...f, userId: uid }; if (sid !== 'new') p.id = sid; const d = await api.post('/database/test', p); toast_(d.code === 200 && d.data === true ? 'OK' : (d.message || 'Failed'), d.code === 200 && d.data === true ? 'ok' : 'err'); } catch { toast_('Error', 'err'); } finally { setTesting(false); } };
  const saveConn = async () => { setSaving(true); try { const p: any = { ...f, userId: uid }; const upd = sid !== 'new'; if (upd) p.id = sid; const d = upd ? await api.put('/database/update?userId=' + uid, p) : await api.post('/database/add', p); if (d.code === 200) { toast_(upd ? 'Updated' : 'Created', 'ok'); await load(); if (!upd) setSid(d.data.id); } else toast_(d.message || 'Failed', 'err'); } catch { toast_('Error', 'err'); } finally { setSaving(false); } };
  const delConn = async () => { if (sid === 'new') return; setConfirmDelete(false); try { const d = await api.delete('/database/delete/' + sid + '?userId=' + uid); if (d.code === 200) { toast_('Deleted', 'ok'); setSid(null); load(); } else toast_(d.message || 'Failed', 'err'); } catch { toast_('Error', 'err'); } };
  const isTest = sid !== 'new' && conns.find(c => c.id === sid)?.isTest === 1;  return (
    <div className="min-h-full">
      <div className="max-w-7xl mx-auto p-6">
        <header className="mb-6">
          <h1 className="text-sm font-mono font-semibold text-on-surface">Database Connections</h1>
          <p className="text-xs text-on-surface-variant mt-0.5 font-mono">manage connection endpoints</p>
        </header>
        <div className="grid grid-cols-12 gap-6 items-start">
          <section className="col-span-12 lg:col-span-4 space-y-3">
            <div className="border border-outline-variant bg-surface-container-lowest">
              <div className="p-3 border-b border-outline-variant flex justify-between items-center">
                <h3 className="text-xs font-mono font-semibold text-on-surface">Connections</h3>
                <span className="text-[10px] text-on-surface-variant font-mono">{conns.length} active</span>
              </div>
              <div className="max-h-[400px] overflow-y-auto divide-y divide-outline-variant">
                {loading ? <div className="p-6 text-center text-xs font-mono text-on-surface-variant">Loading...</div>
                : conns.length === 0 ? <div className="p-6 text-center text-xs font-mono text-on-surface-variant">No connections</div>
                : conns.map((c: any) => (
                  <div key={c.id} onClick={() => setSid(c.id)}
                    className={'p-3 hover:bg-surface-container-high cursor-pointer transition-colors ' + (sid === c.id ? 'bg-primary/5 border-l-2 border-primary' : '')}>
                    <div className="font-mono text-sm text-on-surface">{c.name}{c.isTest === 1 ? ' (test)' : ''}</div>
                    <div className="text-[10px] text-on-surface-variant font-mono mt-0.5">{c.host} / {c.dbType}</div>
                  </div>
                ))}
              </div>
              <button onClick={() => setSid('new')}
                className="flex items-center justify-center gap-2 w-full py-2.5 text-xs font-mono text-primary hover:bg-primary/5 border-t border-outline-variant transition-colors">
                <Plus size={13} /> Add Connection
              </button>
            </div>
          </section>

          {/* Right: Connection Form */}
          <section className="col-span-12 lg:col-span-8">
            {sid === null ? (
              <div className="border border-outline-variant bg-surface-container-lowest p-10 flex flex-col items-center justify-center text-on-surface-variant/50 font-mono text-xs">
                <Database size={32} className="mb-3 opacity-20" />
                <span>select a connection or create a new one</span>
              </div>
            ) : (
              <div className="border border-outline-variant bg-surface-container-lowest p-6">
                <div className="flex items-center justify-between mb-5 pb-4 border-b border-outline-variant">
                  <h2 className="text-sm font-mono font-semibold text-on-surface">
                    {sid === 'new' ? 'New Connection' : 'Edit Connection'}
                  </h2>
                  <select className="bg-surface-container-high border border-outline-variant text-xs font-mono text-on-surface px-2 py-1 outline-none focus:border-primary"
                    value={f.dbType} onChange={(e) => setF({ ...f, dbType: e.target.value })} disabled={isTest}>
                    <option value="mysql">MySQL</option>
                    <option value="postgresql">PostgreSQL</option>
                  </select>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-mono uppercase tracking-wider text-on-surface-variant mb-1">Connection Name</label>
                      <input type="text" placeholder="e.g. Production Data Warehouse"
                        className="w-full bg-surface-container-high border border-outline-variant text-on-surface text-xs font-mono px-3 py-2 outline-none focus:border-primary disabled:opacity-50"
                        value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} disabled={isTest} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-mono uppercase tracking-wider text-on-surface-variant mb-1">Host</label>
                      <input type="text" placeholder="localhost or 192.168.1.100"
                        className="w-full bg-surface-container-high border border-outline-variant text-on-surface text-xs font-mono px-3 py-2 outline-none focus:border-primary disabled:opacity-50"
                        value={f.host} onChange={(e) => setF({ ...f, host: e.target.value })} disabled={isTest} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-mono uppercase tracking-wider text-on-surface-variant mb-1">Port</label>
                      <input type="number"
                        className="w-full bg-surface-container-high border border-outline-variant text-on-surface text-xs font-mono px-3 py-2 outline-none focus:border-primary disabled:opacity-50"
                        value={f.port} onChange={(e) => setF({ ...f, port: parseInt(e.target.value) || 0 })} disabled={isTest} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-mono uppercase tracking-wider text-on-surface-variant mb-1">Username</label>
                      <input type="text"
                        className="w-full bg-surface-container-high border border-outline-variant text-on-surface text-xs font-mono px-3 py-2 outline-none focus:border-primary disabled:opacity-50"
                        value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} disabled={isTest} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-mono uppercase tracking-wider text-on-surface-variant mb-1">Password</label>
                      <input type="password" placeholder={sid !== 'new' && !isTest ? 'leave blank to keep' : ''}
                        className="w-full bg-surface-container-high border border-outline-variant text-on-surface text-xs font-mono px-3 py-2 outline-none focus:border-primary disabled:opacity-50"
                        value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} disabled={isTest} />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-5 border-t border-outline-variant">
                    {sid !== 'new' && !isTest ? (
                      <button onClick={() => setConfirmDelete(true)}
                        className="px-4 py-2 border border-error/50 text-error text-xs font-mono hover:bg-error/10 transition-colors flex items-center gap-1.5">
                        <Trash2 size={13} /> Delete
                      </button>
                    ) : <div />}

                    <div className="flex items-center gap-3">
                      <button onClick={testConn} disabled={testing}
                        className="flex items-center gap-1.5 px-4 py-2 border border-primary/30 text-primary text-xs font-mono hover:bg-primary/10 transition-colors disabled:opacity-50">
                        <RefreshCw size={13} className={testing ? 'animate-spin' : ''} /> {testing ? 'Testing...' : 'Test'}
                      </button>
                      {!isTest && (
                        <button onClick={saveConn} disabled={saving}
                          className="flex items-center gap-1.5 px-5 py-2 border border-primary bg-primary/10 text-primary text-xs font-mono hover:bg-primary/20 transition-colors disabled:opacity-50">
                          {saving ? 'Saving...' : 'Save'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>


        {toast && (
          <div className={'fixed bottom-6 right-6 z-50 px-4 py-3 border text-xs font-mono flex items-center gap-2 ' + (toast.type === 'ok' ? 'border-success/40 text-success bg-success/10' : 'border-error/40 text-error bg-error/10')}>
            <span>{toast.msg}</span>
            <button onClick={() => setToast(null)} className="ml-2 opacity-60 hover:opacity-100"><X size={13} /></button>
          </div>
        )}

      {confirmDelete && (
        <ConfirmDialog
          title="Delete Connection"
          message="Delete this connection permanently? All associated data will be lost."
          confirmLabel="Delete"
          variant="danger"
          onConfirm={delConn}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
      </div>
    </div>
  );
}