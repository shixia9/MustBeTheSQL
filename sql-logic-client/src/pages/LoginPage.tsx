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
    <div className="min-h-screen flex bg-surface">
      {/* Left: Terminal Animation */}
      <div className="hidden lg:flex lg:w-[45%] bg-surface-container-lowest border-r border-outline-variant items-center justify-center relative overflow-hidden">
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

      {/* Right: Login Form */}
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
                <input type="text" placeholder="username"
                  className="w-full bg-surface-container-high border border-outline-variant text-on-surface text-xs font-mono px-3 py-2 outline-none focus:border-primary"
                  value={username} onChange={(e) => setUsername(e.target.value)} required={!isLoginMode} />
              </div>
            )}

            <div>
              <label className="block text-[10px] font-mono uppercase tracking-wider text-on-surface-variant mb-1 ml-0.5">email</label>
              <input type="email" placeholder="name@example.com"
                className="w-full bg-surface-container-high border border-outline-variant text-on-surface text-xs font-mono px-3 py-2 outline-none focus:border-primary"
                value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>

            <div>
              <label className="block text-[10px] font-mono uppercase tracking-wider text-on-surface-variant mb-1 ml-0.5">password</label>
              <input type="password" placeholder="..."
                className="w-full bg-surface-container-high border border-outline-variant text-on-surface text-xs font-mono px-3 py-2 outline-none focus:border-primary"
                value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>

            <button type="submit" disabled={isLoading}
              className="w-full py-2 border border-primary text-primary text-xs font-mono hover:bg-primary/10 transition-colors disabled:opacity-40">
              {isLoading ? '...' : isLoginMode ? 'login' : 'register'}
            </button>

            {githubEnabled && (
              <div className="pt-2">
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex-1 h-px bg-outline-variant/40" />
                  <span className="text-[10px] text-on-surface-variant/60 font-mono">or</span>
                  <div className="flex-1 h-px bg-outline-variant/40" />
                </div>
                <a
                  href="/api/v1/oauth/github/authorize"
                  className="w-full flex items-center justify-center gap-2 py-2 border border-outline-variant text-on-surface-variant text-xs font-mono hover:bg-surface-container-high hover:text-on-surface transition-colors"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                  </svg>
                  Sign in with GitHub
                </a>
              </div>
            )}
          </form>

          <div className="mt-6 text-center">
            <button type="button" onClick={() => { setIsLoginMode(!isLoginMode); setError(''); }}
              className="text-xs font-mono text-on-surface-variant hover:text-primary transition-colors">
              {isLoginMode ? 'create account' : 'sign in'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
