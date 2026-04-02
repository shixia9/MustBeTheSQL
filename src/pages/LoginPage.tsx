import { useState, type FormEvent } from 'react';
import { Database, Terminal, Share2, Mail, Lock, LogIn, ArrowRight, User } from 'lucide-react';
import { motion } from 'motion/react';

interface LoginPageProps {
  onLogin: (user: any) => void;
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
      const body = isLoginMode 
        ? { email, password } 
        : { email, username, password };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const res = await response.json();

      if (res.code !== 200) {
        throw new Error(res.message || (isLoginMode ? 'Login failed' : 'Registration failed'));
      }

      onLogin(res.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row overflow-hidden bg-surface">
      {/* Left Side: Marketing */}
      <div className="hidden md:flex md:w-1/2 lg:w-3/5 bg-surface-container-low relative items-center justify-center p-12 overflow-hidden">
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div 
            className="absolute top-0 left-0 w-full h-full" 
            style={{ 
              backgroundImage: 'radial-gradient(circle at 2px 2px, #003490 1px, transparent 0)', 
              backgroundSize: '32px 32px' 
            }}
          ></div>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="z-10 max-w-lg"
        >
          <div className="mb-8 flex items-center gap-3">
            <div className="w-12 h-12 primary-gradient rounded-lg flex items-center justify-center text-white shadow-lg">
              <Database size={28} />
            </div>
            <h1 className="font-headline text-3xl font-extrabold tracking-tight text-primary">Must Be the SQL</h1>
          </div>

          <h2 className="font-headline text-4xl font-bold leading-tight mb-6 text-on-surface">
            Architecture for the <span className="text-primary">Data-Driven</span> Enterprise.
          </h2>

          <div className="grid grid-cols-1 gap-4">
            <div className="p-5 bg-surface-container-lowest rounded-xl diffusion-shadow flex gap-4 items-start border border-outline-variant/10">
              <Terminal className="text-primary mt-1" size={20} />
              <div>
                <p className="font-label text-xs font-semibold uppercase tracking-widest text-on-surface-variant mb-1">Query Editor</p>
                <p className="text-on-surface-variant text-sm">Real-time SQL intelligence with AI-powered schema mapping.</p>
              </div>
            </div>
            <div className="p-5 bg-surface-container-lowest rounded-xl diffusion-shadow flex gap-4 items-start border border-outline-variant/10">
              <div className="w-5 h-5 text-primary mt-1 flex items-center justify-center">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                <div className="absolute w-4 h-4 border border-primary rounded-full"></div>
              </div>
              <div>
                <p className="font-label text-xs font-semibold uppercase tracking-widest text-on-surface-variant mb-1">Logic Ledger</p>
                <p className="text-on-surface-variant text-sm">Immutable history of every execution across your infrastructure.</p>
              </div>
            </div>
          </div>

          <div className="mt-12 flex items-center gap-4">
            <div className="flex -space-x-3">
              {[1, 2, 3].map((i) => (
                <img 
                  key={i}
                  src={`https://picsum.photos/seed/user${i}/100/100`} 
                  alt={`User ${i}`} 
                  className="w-10 h-10 rounded-full border-2 border-surface-container-low"
                  referrerPolicy="no-referrer"
                />
              ))}
            </div>
            <p className="text-sm text-on-surface-variant italic font-medium">Joined by 2,000+ data architects this week.</p>
          </div>
        </motion.div>

        <div className="absolute -bottom-16 -right-16 w-64 h-64 bg-primary-container/10 rounded-full blur-3xl"></div>
      </div>

      {/* Right Side: Login Form */}
      <main className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-full max-w-md"
        >
          <div className="md:hidden flex items-center gap-2 mb-8 justify-center">
            <div className="w-8 h-8 primary-gradient rounded flex items-center justify-center text-white">
              <Database size={18} />
            </div>
            <span className="font-headline font-bold text-primary tracking-tight">Must Be the SQL</span>
          </div>

          <div className="mb-10 text-center md:text-left">
            <h3 className="font-headline text-2xl font-bold text-on-surface mb-2">
              {isLoginMode ? 'Welcome Back' : 'Create an Account'}
            </h3>
            <p className="text-on-surface-variant">
              {isLoginMode ? 'Log in to manage your logic clusters.' : 'Sign up to start your journey.'}
            </p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-sm">
                {error}
              </div>
            )}
            
            {!isLoginMode && (
              <div>
                <label className="block font-label text-xs font-semibold uppercase tracking-widest text-on-surface-variant mb-2 ml-1" htmlFor="username">Username</label>
                <div className="relative">
                  <input 
                    className="w-full px-4 py-3 bg-surface-container-low border-none rounded-lg focus:ring-2 focus:ring-primary/20 text-on-surface placeholder:text-outline-variant transition-all" 
                    id="username" 
                    placeholder="architect_01" 
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required={!isLoginMode}
                  />
                  <User className="absolute right-4 top-1/2 -translate-y-1/2 text-outline-variant" size={18} />
                </div>
              </div>
            )}

            <div>
              <label className="block font-label text-xs font-semibold uppercase tracking-widest text-on-surface-variant mb-2 ml-1" htmlFor="email">Work Email</label>
              <div className="relative">
                <input 
                  className="w-full px-4 py-3 bg-surface-container-low border-none rounded-lg focus:ring-2 focus:ring-primary/20 text-on-surface placeholder:text-outline-variant transition-all" 
                  id="email" 
                  placeholder="name@company.com" 
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <Mail className="absolute right-4 top-1/2 -translate-y-1/2 text-outline-variant" size={18} />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2 ml-1">
                <label className="block font-label text-xs font-semibold uppercase tracking-widest text-on-surface-variant" htmlFor="password">Security Key</label>
                <a className="text-xs font-semibold text-primary hover:underline decoration-2 underline-offset-4" href="#">Forgot Password?</a>
              </div>
              <div className="relative">
                <input 
                  className="w-full px-4 py-3 bg-surface-container-low border-none rounded-lg focus:ring-2 focus:ring-primary/20 text-on-surface placeholder:text-outline-variant transition-all" 
                  id="password" 
                  placeholder="••••••••" 
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <Lock className="absolute right-4 top-1/2 -translate-y-1/2 text-outline-variant" size={18} />
              </div>
            </div>

            <div className="flex items-center">
              <input 
                className="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary/20" 
                id="remember" 
                type="checkbox" 
              />
              <label className="ml-2 text-sm text-on-surface-variant font-medium select-none" htmlFor="remember">Maintain persistent session</label>
            </div>

            <button 
              className="w-full py-3.5 primary-gradient text-white font-headline font-bold rounded-lg diffusion-shadow hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50" 
              type="submit"
              disabled={isLoading}
            >
              <span>
                {isLoading 
                  ? (isLoginMode ? 'Logging in...' : 'Registering...') 
                  : (isLoginMode ? 'Log In' : 'Sign Up')}
              </span>
              {!isLoading && <LogIn size={18} />}
            </button>
          </form>

          <div className="mt-10 relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-outline-variant/30"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase tracking-widest font-semibold">
              <span className="bg-surface px-4 text-outline-variant">SSO Integration</span>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4">
            <button className="flex items-center justify-center gap-2 px-4 py-2.5 bg-surface-container-low hover:bg-surface-container-high transition-colors rounded-lg border border-outline-variant/20">
              <img 
                src="https://www.google.com/favicon.ico" 
                alt="Google" 
                className="w-4 h-4" 
                referrerPolicy="no-referrer"
              />
              <span className="text-sm font-semibold text-on-surface">Google</span>
            </button>
            <button className="flex items-center justify-center gap-2 px-4 py-2.5 bg-surface-container-low hover:bg-surface-container-high transition-colors rounded-lg border border-outline-variant/20">
              <Terminal size={16} />
              <span className="text-sm font-semibold text-on-surface">GitHub</span>
            </button>
          </div>

          <p className="mt-10 text-center text-sm text-on-surface-variant">
            {isLoginMode ? (
              <>
                New to the engine? 
                <button 
                  type="button"
                  onClick={() => {
                    setIsLoginMode(false);
                    setError('');
                  }}
                  className="font-bold text-primary hover:underline decoration-2 underline-offset-4 ml-1"
                >
                  Create an architect account
                </button>
              </>
            ) : (
              <>
                Already an architect? 
                <button 
                  type="button"
                  onClick={() => {
                    setIsLoginMode(true);
                    setError('');
                  }}
                  className="font-bold text-primary hover:underline decoration-2 underline-offset-4 ml-1"
                >
                  Log in to your account
                </button>
              </>
            )}
          </p>

          <footer className="mt-12 pt-8 border-t border-outline-variant/10 text-center">
            <div className="flex justify-center gap-6 mb-4">
              <a className="text-xs font-medium text-outline-variant hover:text-primary transition-colors" href="#">Privacy Policy</a>
              <a className="text-xs font-medium text-outline-variant hover:text-primary transition-colors" href="#">Terms of Service</a>
              <a className="text-xs font-medium text-outline-variant hover:text-primary transition-colors" href="#">System Status</a>
            </div>
            <p className="text-[10px] uppercase tracking-widest font-bold text-outline-variant/50">Logic Ledger v4.2.0-stable</p>
          </footer>
        </motion.div>
      </main>

      <div className="fixed bottom-6 right-6 z-50">
        <div className="glass-panel p-3 rounded-xl border border-white/20 diffusion-shadow flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
          <span className="font-mono text-[10px] text-primary font-bold tracking-tight">NODES ONLINE: 1,402</span>
        </div>
      </div>
    </div>
  );
}
