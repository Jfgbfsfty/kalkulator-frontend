import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import api from '../services/api.js';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const refreshTimerRef = useRef(null);

  // Ustaw access token i zaplanuj jego odświeżenie (co 14 minut, token żyje 15)
  const setTokenAndScheduleRefresh = useCallback((token) => {
    setAccessToken(token);
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

    // Wyczyść poprzedni timer
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);

    // Odśwież token po 14 minutach (1 minuta przed wygaśnięciem)
    refreshTimerRef.current = setTimeout(() => {
      refreshAccessToken();
    }, 14 * 60 * 1000);
  }, []);

  // Próba odświeżenia access tokenu przy starcie aplikacji
  const refreshAccessToken = useCallback(async () => {
    try {
      const res = await api.post('/auth/refresh');
      if (res.data.success) {
        setTokenAndScheduleRefresh(res.data.accessToken);
        setUser(res.data.user);
        return true;
      }
    } catch {
      // Refresh token wygasł lub nieprawidłowy – wyloguj
      setUser(null);
      setAccessToken(null);
      delete api.defaults.headers.common['Authorization'];
    }
    return false;
  }, [setTokenAndScheduleRefresh]);

  // Przy montowaniu komponentu – sprawdź, czy użytkownik jest zalogowany
  useEffect(() => {
    const init = async () => {
      await refreshAccessToken();
      setLoading(false);
    };
    init();

    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, [refreshAccessToken]);

  const login = async (username, password) => {
    const res = await api.post('/auth/login', { username, password });
    if (res.data.success) {
      setTokenAndScheduleRefresh(res.data.accessToken);
      setUser(res.data.user);
    }
    return res.data;
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignoruj błędy podczas wylogowania
    }
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    setUser(null);
    setAccessToken(null);
    delete api.defaults.headers.common['Authorization'];
  };

  // Sprawdź, czy użytkownik ma daną rolę (lub wyższą)
  const hasRole = (requiredRole) => {
    const hierarchy = { SUPERADMIN: 3, SZEF: 2, ZASTEPCA: 1.5, POLICJANT: 1 };
    return (hierarchy[user?.role] || 0) >= (hierarchy[requiredRole] || 0);
  };

  return (
    <AuthContext.Provider value={{ user, accessToken, loading, login, logout, hasRole, refreshAccessToken }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth musi być użyty wewnątrz AuthProvider');
  return ctx;
};
