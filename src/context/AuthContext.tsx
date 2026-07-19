import { createContext, useContext, useState, ReactNode, useEffect, useRef } from 'react';
import { setAuthToken, setUnauthorizedHandler } from '../services/api';
import { toast } from 'sonner';

export interface AuthUser {
  userUuid: string;
  userName: string;
  firstName: string;
  otherNames: string;
  email: string;
  phoneNumber: string;
  roles: string;
  permissions: string[];
  firstLogin: boolean;
  enable2FA: boolean;
  token: string;
  redirectPath: string;
  profileRef?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  login: (user: AuthUser) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try { return JSON.parse(localStorage.getItem('auth_user') ?? 'null'); } catch { return null; }
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('auth_token'));
  const logoutRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (token) setAuthToken(token);
  }, []);

  const login = (userData: AuthUser) => {
    setUser(userData);
    setToken(userData.token);
    setAuthToken(userData.token);
    localStorage.setItem('auth_token', userData.token);
    localStorage.setItem('auth_user', JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setAuthToken(null);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
  };

  logoutRef.current = logout;

  useEffect(() => {
    setUnauthorizedHandler(() => {
      logoutRef.current();
      toast.error('Your session has ended. Please log in again.');
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
