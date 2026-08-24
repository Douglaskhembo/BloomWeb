import { createContext, useContext, useState, ReactNode, useEffect, useRef } from 'react';
import { setAuthToken, setUnauthorizedHandler } from '../services/api';
import Swal from 'sweetalert2';

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
  /** True if the user holds at least one of the given permissions. No argument (or an empty
   *  list) means "no permission required" — always true, matching the convention used
   *  throughout the app that an ungated screen/action is open to anyone authenticated. */
  hasPermission: (required?: string | string[]) => boolean;
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
      Swal.fire({ icon: 'error', title: 'Error', text: 'Your session has ended. Please log in again.', showConfirmButton: true });
    });
  }, []);

  const hasPermission = (required?: string | string[]) => {
    if (!required || (Array.isArray(required) && required.length === 0)) return true;
    const myPermissions = user?.permissions ?? [];
    const list = Array.isArray(required) ? required : [required];
    return list.some((p) => myPermissions.includes(p));
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated: !!token, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
