import { useState } from 'react';
import { Sliders, Palette, ShieldCheck, Edit, Plus, Clock, ChevronDown, Sun, Moon, CheckCircle2, RefreshCw } from 'lucide-react';
import { motion } from 'motion/react';
import { useSettings } from '../contexts/SettingsContext';

export default function SettingsPage({ user }: { user: any }) {
  const [creativeControl, setCreativeControl] = useState(0.2);
  const { theme, setTheme, fontSize, setFontSize } = useSettings();
  const [isSaving, setIsSaving] = useState(false);
  const [apiKey, setApiKey] = useState(user?.apiKey || '');
  const [secretKey, setSecretKey] = useState(user?.secretKey || '');

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const params = new URLSearchParams({
        userId: user?.id,
        apiKey: apiKey || '',
        secretKey: secretKey || ''
      });
      const res = await fetch(`/api/v1/user/updateKeys?${params.toString()}`, {
        method: 'POST'
      });
      if (!res.ok) throw new Error('Failed to save settings');
      // If there's a global user context, you might want to update it here.
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="ml-64 pt-14 min-h-screen bg-surface">
      <div className="max-w-6xl mx-auto px-8 py-10">
        <div className="mb-10">
          <h1 className="text-3xl font-extrabold font-headline text-on-surface tracking-tight">System Configuration</h1>
          <p className="text-on-surface-variant mt-1 text-sm font-medium">Fine-tune the Must Be the SQL parameters and security protocols.</p>
        </div>

        <div className="grid grid-cols-12 gap-6 pb-24">
          {/* Left: Configuration Sections */}
          <section className="col-span-12 lg:col-span-8 space-y-6">
            <div className="bg-surface-container-lowest rounded-xl p-6 border border-outline-variant/20 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-primary/10 p-2 rounded-lg text-primary">
                  <Sliders size={20} />
                </div>
                <h2 className="text-lg font-bold font-headline">General Configuration</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant font-label">Default LLM Selection</label>
                  <div className="relative">
                    <select className="w-full bg-surface-container-low border-none rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-primary appearance-none font-medium">
                      <option>GPT-4o</option>
                      <option>Claude 3.5 Sonnet</option>
                      <option>Gemini 1.5 Pro</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-3 pointer-events-none text-outline-variant" size={20} />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant font-label">Default Database Engine</label>
                  <div className="flex bg-surface-container-low p-1 rounded-lg">
                    <button className="flex-1 py-2 text-xs font-bold rounded-md bg-white text-primary shadow-sm">PostgreSQL</button>
                    <button className="flex-1 py-2 text-xs font-bold rounded-md text-on-surface-variant hover:text-on-surface transition-colors">MySQL</button>
                  </div>
                </div>
              </div>

              <div className="mt-8 space-y-4">
                <div className="flex justify-between items-end">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant font-label">SQL Creative Control</label>
                    <p className="text-xs text-on-surface-variant/70">Adjust strictness vs. creativity for query generation.</p>
                  </div>
                  <span className="text-xs font-mono font-bold text-primary bg-primary/10 px-2 py-1 rounded">{creativeControl} Strict</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="1" 
                  step="0.1" 
                  value={creativeControl}
                  onChange={(e) => setCreativeControl(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-surface-container-high rounded-lg appearance-none cursor-pointer accent-primary"
                />
                <div className="flex justify-between text-[10px] font-mono text-outline-variant uppercase">
                  <span>Precise</span>
                  <span>Experimental</span>
                </div>
              </div>
            </div>

            <div className="bg-surface-container-lowest rounded-xl p-6 border border-outline-variant/20 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-primary/10 p-2 rounded-lg text-primary">
                  <Palette size={20} />
                </div>
                <h2 className="text-lg font-bold font-headline">Interface Preferences</h2>
              </div>

              <div className="flex flex-wrap gap-12">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant font-label">Theme Mode</label>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setTheme('light')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                        theme === 'light' 
                          ? 'bg-surface-container-high border border-primary/20 text-primary font-bold shadow-sm' 
                          : 'hover:bg-surface-container-low text-on-surface-variant font-bold'
                      } text-xs`}
                    >
                      <Sun size={16} />
                      Light
                    </button>
                    <button 
                      onClick={() => setTheme('dark')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                        theme === 'dark' 
                          ? 'bg-surface-container-high border border-primary/20 text-primary font-bold shadow-sm' 
                          : 'hover:bg-surface-container-low text-on-surface-variant font-bold'
                      } text-xs`}
                    >
                      <Moon size={16} />
                      Dark
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant font-label">Editor Font Size</label>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => setFontSize(Math.max(10, fontSize - 1))}
                      className="w-8 h-8 rounded border border-outline-variant/30 flex items-center justify-center hover:bg-surface-container-low transition-colors active:scale-90"
                    >
                      -
                    </button>
                    <span className="font-mono text-sm font-bold w-10 text-center">{fontSize}px</span>
                    <button 
                      onClick={() => setFontSize(Math.min(24, fontSize + 1))}
                      className="w-8 h-8 rounded border border-outline-variant/30 flex items-center justify-center hover:bg-surface-container-low transition-colors active:scale-90"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>


          {/* Right: Security Sidebar */}
          <aside className="col-span-12 lg:col-span-4 space-y-6">
            <div className="bg-primary-container text-white rounded-xl p-6 relative overflow-hidden shadow-lg">
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle2 className="text-white" size={20} />
                  <h3 className="font-bold font-headline text-white tracking-tight">Security Best Practices</h3>
                </div>
                <ul className="space-y-3">
                  <li className="flex gap-3 items-start">
                    <div className="w-1.5 h-1.5 rounded-full bg-white/70 mt-1.5 shrink-0"></div>
                    <p className="text-xs text-white/90 leading-relaxed"><span className="font-bold">Credential Masking:</span> All keys are encrypted at rest and masked in UI.</p>
                  </li>
                  <li className="flex gap-3 items-start">
                    <div className="w-1.5 h-1.5 rounded-full bg-white/70 mt-1.5 shrink-0"></div>
                    <p className="text-xs text-white/90 leading-relaxed"><span className="font-bold">Read-Only Access:</span> We recommend using read-only credentials for query generation.</p>
                  </li>
                </ul>
                <button className="mt-6 w-full py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded text-[10px] font-bold uppercase tracking-widest transition-colors">View Security Audit</button>
              </div>
              <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
            </div>

            <div className="bg-surface-container-lowest rounded-xl p-6 border border-outline-variant/20 shadow-sm">
              <h3 className="font-bold font-headline mb-4 text-sm uppercase tracking-tight">API Key Management</h3>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-outline-variant uppercase tracking-wider">Custom API Key</label>
                  <div className="flex gap-2">
                    <input 
                      className="flex-1 bg-surface-container-low border-none rounded px-3 py-2 text-xs font-mono" 
                      type="password" 
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="sk-••••••••••••••••" 
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-outline-variant uppercase tracking-wider">Custom Secret Key</label>
                  <div className="flex gap-2">
                    <input 
                      className="flex-1 bg-surface-container-low border-none rounded px-3 py-2 text-xs font-mono" 
                      type="password" 
                      value={secretKey}
                      onChange={(e) => setSecretKey(e.target.value)}
                      placeholder="sk-secret-••••••••••••" 
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-surface-container-lowest rounded-xl p-6 border border-outline-variant/20 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold font-headline text-sm uppercase tracking-tight">Session Protection</h3>
                <Clock className="text-outline-variant" size={20} />
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-on-surface-variant font-medium">Auto-logout timeout</span>
                  <select className="bg-transparent border-none text-xs font-bold text-primary focus:ring-0 cursor-pointer">
                    <option>30 Minutes</option>
                    <option>1 Hour</option>
                    <option>Never</option>
                  </select>
                </div>
                <div className="pt-4 border-t border-outline-variant/20">
                  <button className="w-full py-2.5 rounded text-xs font-bold text-error border border-error/20 hover:bg-error/5 transition-colors">
                    Revoke All Active Sessions
                  </button>
                </div>
              </div>
            </div>
          </aside>
        </div>

        {/* Floating Action Bar */}
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 glass-panel px-6 py-4 rounded-xl border border-white/20 shadow-2xl z-50">
          <p className="text-xs font-medium text-primary whitespace-nowrap hidden sm:block">Unsaved changes in General Configuration</p>
          <div className="h-6 w-px bg-primary/20 hidden sm:block"></div>
          <div className="flex gap-3">
            <button className="px-4 py-2 text-xs font-bold text-on-surface-variant hover:text-on-surface transition-colors">Reset to Default</button>
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className={`primary-gradient text-white px-6 py-2 rounded-lg text-xs font-bold shadow-lg shadow-primary/30 active:scale-95 transition-all flex items-center gap-2 ${isSaving ? 'opacity-80 cursor-not-allowed' : ''}`}
            >
              {isSaving ? (
                <>
                  <RefreshCw className="animate-spin" size={14} />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="fixed bottom-4 right-6 pointer-events-none select-none opacity-5">
        <span className="font-mono text-8xl font-black">LOGIC.SQL</span>
      </div>
    </main>
  );
}
