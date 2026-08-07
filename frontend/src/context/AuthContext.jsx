import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { api, clearToken, getToken, setToken } from "../services/api.js";
import { closeSocket } from "../services/socket.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setTokenState] = useState(getToken());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function bootstrap() {
      if (!getToken()) {
        setLoading(false);
        return;
      }
      try {
        const { user } = await api.auth.me();
        if (!cancelled) setUser(user);
      } catch {
        if (!cancelled) {
          clearToken();
          setTokenState(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (credentials) => {
    const { token, user } = await api.auth.login(credentials);
    setToken(token);
    setTokenState(token);
    setUser(user);
    return user;
  }, []);

  const register = useCallback(async (details) => {
    const { token, user } = await api.auth.register(details);
    setToken(token);
    setTokenState(token);
    setUser(user);
    return user;
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setTokenState(null);
    setUser(null);
    closeSocket();
  }, []);

  const updateUser = useCallback((nextUser) => setUser(nextUser), []);

  const value = useMemo(
    () => ({ user, token, loading, login, register, logout, updateUser }),
    [user, token, loading, login, register, logout, updateUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>.");
  return ctx;
}
