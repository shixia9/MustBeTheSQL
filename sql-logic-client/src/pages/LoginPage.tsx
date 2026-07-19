import { useState, type FormEvent, useEffect } from 'react';
import { Terminal } from 'lucide-react';
import storageUtils from '../utils/storageUtils';
import { api } from '../api/client';

interface LoginPageProps { onLogin: (user: any) => void; }

function TerminalLine({ text, delay, prefix }: { text: string; delay: number; prefix?: string }) {
  const [visible, setVisible] = useState('');
  useEffect(() => {
    const t = setTimeout(() => {
      let i = 0;
      const iv = setInterval(() => { i++; setVisible(text.slice(0, i)); if (i >= text.length) clearInterval(iv); }, 30);
    }, delay);
    return () => clearTimeout(t);
  }, [text, delay]);
  return (
    <div className="text-xs leading-relaxed">
      <span className="text-blue-600/70">{prefix || '$'}</span>{' '}
      <span className="text-slate-400">{visible}</span>
      {visible.length < text.length && <span className="animate-pulse text-blue-600/70">_</span>}
    </div>
  );
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [githubEnabled, setGithubEnabled] = useState(false);

  useEffect(() => {
    api.get<{ configured: boolean }>('/oauth/github/status').then(res => {
      if (res.code === 200 && res.data?.configured) setGithubEnabled(true);
    }).catch(() => {});
  }, []);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      const endpoint = isLoginMode ? '/api/v1/user/login' : '/api/v1/user/register';
      const body = isLoginMode ? { email, password, rememberMe: false } : { email, username, password };
      const response = await fetch(endpoint, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        credentials: 'include', body: JSON.stringify(body),
      });
      const res = await response.json();
      if (res.code !== 200) throw new Error(res.message || 'Login failed');
      storageUtils.saveUser(res.data);
      onLogin(res.data);
    } catch (err: any) { setError(err.message); }
    finally { setIsLoading(false); }
  };

  const terminalLines = [
    { text: 'ssh sql-engine@gateway.local', delay: 400, prefix: '>' },
    { text: 'authenticating...', delay: 900 },
    { text: 'connected to sql-engine v2.0', delay: 1400 },
    { text: 'schema loaded: 12 tables, 4 views', delay: 1900 },
    { text: 'LLM endpoint: online (latency 42ms)', delay: 2400 },
    { text: 'ready.', delay: 2900, prefix: '>' },
  ];

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Left: Terminal Animation */}
      <div className="hidden lg:flex lg:w-[45%] bg-white border-r border-slate-200 items-center justify-center relative overflow-hidden">
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'linear-gradient(#94a3b8 1px, transparent 1px), linear-gradient(90deg, #94a3b8 1px, transparent 1px)', backgroundSize: '20px 20px' }} />

        <div className="relative z-10 w-full max-w-md p-10">
          {/* Terminal window chrome */}
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden mb-6 shadow-sm">
            <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-slate-200 bg-slate-100">
              <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <span className="ml-2 text-[9px] text-slate-400">MustBeTheSQL -- ssh</span>
            </div>
            <div className="p-4 space-y-1.5 min-h-[200px]">
              {terminalLines.map((line, i) => (
                <TerminalLine key={i} text={line.text} delay={line.delay} prefix={line.prefix} />
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'connections', value: '12', sub: 'active' },
              { label: 'queries', value: '4,281', sub: 'today' },
              { label: 'latency', value: '42ms', sub: 'avg' },
              { label: 'uptime', value: '99.9', sub: 'percent' },
            ].map(s => (
              <div key={s.label} className="bg-white border border-slate-200 rounded-lg p-3">
                <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1 font-medium">{s.label}</div>
                <div className="text-lg font-semibold text-slate-900">{s.value}</div>
                <div className="text-[9px] text-slate-400">{s.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right: Login Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="login-card w-full max-w-sm flex flex-col">
          <div className="login-header">
            <div className="login-brand flex items-center">
              <div className="login-brand-icon"><Terminal size={18} /></div>
              <span className="text-[13px] font-semibold text-slate-900" style={{letterSpacing:'-0.01em'}}>MustBeTheSQL</span>
            </div>
            <h2 className="login-heading">{isLoginMode ? 'Sign in' : 'Create account'}</h2>
            <p className="login-subtitle">{isLoginMode ? 'Enter your credentials to continue' : 'Fill in the details to get started'}</p>
          </div>
          <form className="login-form flex flex-col" onSubmit={handleSubmit}>
            {error && <div className="px-3 py-2 border border-red-200 text-red-600 text-[12px] rounded-md bg-red-50">{error}</div>}
            {!isLoginMode && (
              <div className="login-field flex flex-col">
                <label className="login-label">Username</label>
                <input type="text" placeholder="Your username" className="login-input" value={username} onChange={(e) => setUsername(e.target.value)} required={!isLoginMode} />
              </div>
            )}
            <div className="login-field flex flex-col">
              <label className="login-label">Email</label>
              <input type="email" placeholder="name@example.com" className="login-input" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="login-field flex flex-col">
              <label className="login-label">Password</label>
              <input type="password" placeholder="Enter your password" className="login-input" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <button type="submit" disabled={isLoading} className="login-submit btn-primary w-full disabled:opacity-40">{isLoading ? 'Signing in...' : isLoginMode ? 'Sign in' : 'Create account'}</button>
            {githubEnabled && (
              <div className="login-divider-section">
                <div className="flex items-center gap-3 mb-3">
                  <div className="login-or-line" /><span className="login-or-text">or</span><div className="login-or-line" />
                </div>
                <a href="/api/v1/oauth/github/authorize" className="login-social-btn">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                  GitHub
                </a>
              </div>
            )}
          </form>
          <div className="login-switch text-center">
            <button type="button" onClick={() => { setIsLoginMode(!isLoginMode); setError(''); }} className="login-switch-btn">
              {isLoginMode ? 'Create account' : 'Sign in instead'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
