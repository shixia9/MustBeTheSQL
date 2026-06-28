import { useState, type FormEvent, useEffect } from 'react';
import { Terminal } from 'lucide-react';
import storageUtils from '../utils/storageUtils';

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
    <div className="font-mono text-xs leading-relaxed">
      <span className="text-primary/70">{prefix || '$'}</span>{' '}
      <span className="text-on-surface-variant/80">{visible}</span>
      {visible.length < text.length && <span className="animate-pulse text-primary/70">_</span>}
    </div>
  );
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
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
    <div className="min-h-screen flex bg-surface">
      {/* Left: Login Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <Terminal size={20} className="text-primary" />
              <span className="font-mono text-sm font-semibold text-primary tracking-tight">MustBeTheSQL</span>
            </div>
            <h2 className="font-mono text-base text-on-surface font-semibold mb-1">
              {isLoginMode ? 'login' : 'register'}
            </h2>
            <p className="text-xs text-on-surface-variant font-mono">
              {isLoginMode ? 'authenticate to continue' : 'create a new account'}
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            {error && (
              <div className="px-3 py-2 border border-error text-error text-xs font-mono">{error}</div>
            )}

            {!isLoginMode && (
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-on-surface-variant mb-1 ml-0.5">username</label>
                <input className="w-full bg-surface-container-high border border-outline-variant text-on-surface text-xs font-mono px-3 py-2 outline-none focus:border-primary placeholder-on-surface-variant/40"
                  placeholder="username" type="text" value={username}
                  onChange={(e) => setUsername(e.target.value)} required={!isLoginMode} />
              </div>
            )}

            <div>
              <label className="block text-[10px] font-mono uppercase tracking-wider text-on-surface-variant mb-1 ml-0.5">email</label>
              <input className="w-full bg-surface-container-high border border-outline-variant text-on-surface text-xs font-mono px-3 py-2 outline-none focus:border-primary placeholder-on-surface-variant/40"
                placeholder="name@example.com" type="email" value={email}
                onChange={(e) => setEmail(e.target.value)} required />
            </div>

            <div>
              <label className="block text-[10px] font-mono uppercase tracking-wider text-on-surface-variant mb-1 ml-0.5">password</label>
              <input className="w-full bg-surface-container-high border border-outline-variant text-on-surface text-xs font-mono px-3 py-2 outline-none focus:border-primary placeholder-on-surface-variant/40"
                placeholder="..." type="password" value={password}
                onChange={(e) => setPassword(e.target.value)} required />
            </div>

            <button
              className="w-full py-2 border border-primary text-primary text-xs font-mono hover:bg-primary/10 transition-colors disabled:opacity-40"
              type="submit" disabled={isLoading}>
              {isLoading ? '...' : isLoginMode ? 'login' : 'register'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button type="button" onClick={() => { setIsLoginMode(!isLoginMode); setError(''); }}
              className="text-xs font-mono text-on-surface-variant hover:text-primary transition-colors">
              {isLoginMode ? 'create account' : 'sign in'}
            </button>
          </div>
        </div>
      </div>

      {/* Right: Terminal Animation */}
      <div className="hidden lg:flex lg:w-[45%] bg-surface-container-lowest border-l border-outline-variant items-center justify-center relative overflow-hidden">
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'linear-gradient(var(--color-outline-variant) 1px, transparent 1px), linear-gradient(90deg, var(--color-outline-variant) 1px, transparent 1px)', backgroundSize: '20px 20px' }} />

        <div className="relative z-10 w-full max-w-md p-10">
          {/* Terminal window chrome */}
          <div className="border border-outline-variant bg-surface-container-high overflow-hidden mb-6">
            <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-outline-variant bg-surface-container-highest">
              <span className="w-2.5 h-2.5 rounded-full bg-error/60" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400/60" />
              <span className="w-2.5 h-2.5 rounded-full bg-success/60" />
              <span className="ml-2 text-[9px] font-mono text-on-surface-variant/50">MustBeTheSQL — ssh</span>
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
              <div key={s.label} className="border border-outline-variant p-3 bg-surface-container-low">
                <div className="text-[10px] font-mono uppercase tracking-wider text-on-surface-variant/60 mb-1">{s.label}</div>
                <div className="text-lg font-mono font-semibold text-on-surface">{s.value}</div>
                <div className="text-[9px] font-mono text-on-surface-variant/50">{s.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
