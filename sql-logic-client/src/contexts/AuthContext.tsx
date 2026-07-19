import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import storageUtils from '../utils/storageUtils';

interface AuthState {
  user: any;
  loading: boolean;
  login: (userData: any) => void;
  logout: () => void;
  updateUser: (userData: any) => void;
}

const AuthContext = createContext<AuthState>({
  user: null, loading: true,
  login: () => {}, logout: () => {}, updateUser: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const init = async () => {
      const localUser = storageUtils.getUser();
      if (!localUser) { setLoading(false); navigate('/login'); return; }
      try {
        const res = await api.get<any>('/user/info');
        if (res.code === 200 && res.data) {
          setUser(res.data);
          storageUtils.saveUser(res.data);
        } else {
          storageUtils.deleteUser();
          navigate('/login');
        }
      } catch {
        // Keep local user data as fallback if server is unreachable
        setUser(localUser);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const login = useCallback((userData: any) => {
    storageUtils.saveUser(userData);
    setUser(userData);
  }, []);

  const logout = useCallback(async () => {
    try { await api.post('/user/logout', {}); } catch {}
    storageUtils.deleteUser();
    setUser(null);
    navigate('/login');
  }, [navigate]);

  const updateUser = useCallback((userData: any) => {
    storageUtils.saveUser(userData);
    setUser(userData);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
