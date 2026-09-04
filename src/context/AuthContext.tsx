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

// Idle session timeout: 5 minutes of no user activity, with a 60s warning
// before the auto-logout so the user can choose to stay signed in.
const IDLE_TIMEOUT_MS = 5 * 60 * 1000;
const IDLE_WARNING_MS = 60 * 1000;
const ACTIVITY_EVENTS: (keyof DocumentEventMap)[] = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'wheel'];
const ACTIVITY_THROTTLE_MS = 1000;
const EXPIRY_CHECK_INTERVAL_MS = 30 * 1000;

// Reads the `exp` claim out of a JWT without verifying its signature — good enough to
// decide whether a *locally stored* token is stale; the backend still verifies for real.
function getTokenExpiryMs(token: string): number | null {
  try {
    const payload = token.split('.')[1];
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const json = JSON.parse(decodeURIComponent(escape(atob(base64))));
    return typeof json.exp === 'number' ? json.exp * 1000 : null;
  } catch {
    return null;
  }
}

function isTokenExpired(token: string): boolean {
  const expMs = getTokenExpiryMs(token);
  return expMs !== null && Date.now() >= expMs;
}

// Session storage (not localStorage) is deliberately per-tab: a brand-new tab, or a copied
// URL pasted into one, starts with no session data at all, so it never inherits another
// tab's login. Only navigation *from* an already-authenticated tab (same browsing context,
// e.g. opening a link) keeps the session, matching how the rest of the app expects to work.
function loadStoredToken(): string | null {
  const token = sessionStorage.getItem('auth_token');
  if (token && isTokenExpired(token)) {
    sessionStorage.removeItem('auth_token');
    sessionStorage.removeItem('auth_user');
    return null;
  }
  return token;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    if (!loadStoredToken()) return null;
    try { return JSON.parse(sessionStorage.getItem('auth_user') ?? 'null'); } catch { return null; }
  });
  const [token, setToken] = useState<string | null>(loadStoredToken);
  const logoutRef = useRef<() => void>(() => {});
  const warnTimerRef = useRef<number | null>(null);
  const countdownIntervalRef = useRef<number | null>(null);
  const warningOpenRef = useRef(false);
  const suppressNextDismissRef = useRef(false);
  const lastResetAtRef = useRef(0);

  useEffect(() => {
    if (token) setAuthToken(token);
  }, []);

  const login = (userData: AuthUser) => {
    setUser(userData);
    setToken(userData.token);
    setAuthToken(userData.token);
    sessionStorage.setItem('auth_token', userData.token);
    sessionStorage.setItem('auth_user', JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setAuthToken(null);
    sessionStorage.removeItem('auth_token');
    sessionStorage.removeItem('auth_user');
  };

  logoutRef.current = logout;

  useEffect(() => {
    setUnauthorizedHandler(() => {
      logoutRef.current();
      Swal.fire({ icon: 'error', title: 'Error', text: 'Your session has ended. Please log in again.', showConfirmButton: true });
    });
  }, []);

  const clearIdleTimers = () => {
    if (warnTimerRef.current) { window.clearTimeout(warnTimerRef.current); warnTimerRef.current = null; }
    if (countdownIntervalRef.current) { window.clearInterval(countdownIntervalRef.current); countdownIntervalRef.current = null; }
  };

  const idleLogout = () => {
    clearIdleTimers();
    warningOpenRef.current = false;
    logoutRef.current();
    Swal.fire({ icon: 'info', title: 'Signed out', text: 'You were signed out due to inactivity.', confirmButtonText: 'OK' });
  };

  const countdownHtml = (secondsLeft: number) =>
    `You've been inactive. For your security, you'll be signed out in <b>${Math.max(secondsLeft, 0)}</b> second${secondsLeft === 1 ? '' : 's'}.`;

  const showIdleWarning = () => {
    if (warningOpenRef.current) return;
    warningOpenRef.current = true;
    let secondsLeft = IDLE_WARNING_MS / 1000;

    Swal.fire({
      icon: 'warning',
      title: 'Session about to expire',
      html: countdownHtml(secondsLeft),
      showCancelButton: true,
      confirmButtonText: 'Stay signed in',
      cancelButtonText: 'Sign out now',
      allowOutsideClick: false,
      allowEscapeKey: false,
      reverseButtons: true,
      timer: IDLE_WARNING_MS,
      timerProgressBar: true,
      didOpen: () => {
        countdownIntervalRef.current = window.setInterval(() => {
          secondsLeft -= 1;
          const el = Swal.getHtmlContainer();
          if (el) el.innerHTML = countdownHtml(secondsLeft);
        }, 1000);
      },
      willClose: () => {
        if (countdownIntervalRef.current) { window.clearInterval(countdownIntervalRef.current); countdownIntervalRef.current = null; }
      },
    }).then((result) => {
      warningOpenRef.current = false;
      if (suppressNextDismissRef.current) {
        suppressNextDismissRef.current = false;
        return;
      }
      if (result.isConfirmed) {
        recordActivity(true);
      } else {
        idleLogout();
      }
    });
  };

  const scheduleIdleTimers = () => {
    clearIdleTimers();
    warnTimerRef.current = window.setTimeout(showIdleWarning, IDLE_TIMEOUT_MS - IDLE_WARNING_MS);
  };

  const recordActivity = (force = false) => {
    if (warningOpenRef.current) return; // must respond to the warning dialog explicitly
    const now = Date.now();
    if (!force && now - lastResetAtRef.current < ACTIVITY_THROTTLE_MS) return;
    lastResetAtRef.current = now;
    scheduleIdleTimers();
  };

  // Track local activity and (re)start the idle clock whenever a session is active.
  useEffect(() => {
    if (!token) {
      clearIdleTimers();
      return;
    }
    scheduleIdleTimers();
    const handler = () => recordActivity();
    ACTIVITY_EVENTS.forEach((evt) => document.addEventListener(evt, handler, { passive: true }));
    return () => {
      ACTIVITY_EVENTS.forEach((evt) => document.removeEventListener(evt, handler));
      clearIdleTimers();
    };
  }, [token]);

  // Proactively catch a token that expired while this tab was open (or backgrounded) —
  // don't wait for an API call to 401 before reacting.
  useEffect(() => {
    if (!token) return;
    const checkExpiry = () => {
      if (isTokenExpired(token)) {
        clearIdleTimers();
        if (warningOpenRef.current) { suppressNextDismissRef.current = true; Swal.close(); }
        logoutRef.current();
        Swal.fire({ icon: 'info', title: 'Session expired', text: 'Your session has expired. Please log in again.', confirmButtonText: 'OK' });
      }
    };
    const onVisible = () => { if (document.visibilityState === 'visible') checkExpiry(); };
    const intervalId = window.setInterval(checkExpiry, EXPIRY_CHECK_INTERVAL_MS);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [token]);

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
