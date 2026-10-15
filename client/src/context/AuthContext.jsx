import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, getToken, setAuthFailureHandler, setToken } from '../api.js';
import { resetMeta } from '../lib/meta.js';
import { useToast } from './ToastContext.jsx';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const toast = useToast();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(getToken()));

  const clearSession = useCallback(
    (message) => {
      setToken(null);
      resetMeta();
      setUser(null);
      if (message) toast.error(message);
    },
    [toast],
  );

  useEffect(() => {
    setAuthFailureHandler((error) => {
      if (!getToken()) return;
      clearSession(
        error.code === 'ROLE_INACTIVE'
          ? 'Your role has been deactivated. Contact an administrator.'
          : 'Your session has ended. Please sign in again.',
      );
    });
  }, [clearSession]);

  const refresh = useCallback(async () => {
    try {
      const res = await api.get('/auth/me');
      setUser(res.user);
    } catch {
    }
  }, []);

  useEffect(() => {
    if (!getToken()) return;
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  useEffect(() => {
    if (!user) return undefined;
    const onFocus = () => refresh();
    window.addEventListener('focus', onFocus);
    const timer = setInterval(refresh, 60000);
    return () => {
      window.removeEventListener('focus', onFocus);
      clearInterval(timer);
    };
  }, [user?.id, refresh]);

  const login = useCallback(async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    setToken(res.token);
    setUser(res.user);
    return res.user;
  }, []);

  const logout = useCallback(() => clearSession(), [clearSession]);

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      logout,
      refresh,
      isAdmin: Boolean(user?.role?.isSystem),
      can: (module, action) => user?.permissions?.some((p) => p.module === module && p.actions.includes(action)) ?? false,
    }),
    [user, loading, login, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
