import { useState, useRef, useCallback, useEffect } from 'react';
import { Eye, EyeOff, School } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { authAPI } from '@/services/api';
import Swal from 'sweetalert2';
import { getBackendErrorMessage } from '@/utils/errorHandler';

type Step = 'login' | 'reset-password' | 'forgot-password' | 'forgot-reset';

export default function LoginPage() {
  const { login } = useAuth();
  const [step, setStep] = useState<Step>('login');
  const [loading, setLoading] = useState(false);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // first-login reset
  const [pendingUser, setPendingUser] = useState<any>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // forgot password
  const [forgotUsername, setForgotUsername] = useState('');
  const [forgotNew, setForgotNew] = useState('');
  const [forgotConfirm, setForgotConfirm] = useState('');
  const [forgotToken, setForgotToken] = useState('');
  const [showForgotNew, setShowForgotNew] = useState(false);
  const [showForgotConfirm, setShowForgotConfirm] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await authAPI.login({ username, password });
      const data = res.data?.body ?? res.data;
      if (data.firstLogin) {
        setPendingUser(data);
        setStep('reset-password');
      } else {
        login(data);
      }
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: getBackendErrorMessage(err, 'Invalid credentials'),
        showConfirmButton: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFirstLoginReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Passwords do not match',
        showConfirmButton: true,
      });
      return;
    }
    setLoading(true);
    try {
      await authAPI.resetPassword({ newPassword, confirmPassword }, pendingUser.token);
      Swal.fire({
        title: 'Success',
        text: 'Password updated. Logging you in...',
        icon: 'success',
        showConfirmButton: true,
      });
      login({ ...pendingUser, token: pendingUser.token, firstLogin: false });
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: getBackendErrorMessage(err, 'Failed to reset password'),
        showConfirmButton: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // BloomSchool uses admin reset — for self-service we just call reset-password with token from login
      // Here we trigger admin reset which logs the temp password server-side
      Swal.fire({
        icon: 'info',
        title: 'Contact your administrator to reset your password.',
        showConfirmButton: true,
      });
      setStep('login');
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: getBackendErrorMessage(err, 'Failed'),
        showConfirmButton: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const pwInput = (label: string, val: string, set: (v: string) => void, show: boolean, toggle: () => void, placeholder = '••••••••') => (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-foreground">{label}</label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          required
          value={val}
          onChange={e => set(e.target.value)}
          placeholder={placeholder}
          className="w-full border border-input rounded-lg px-3 py-2.5 pr-10 text-sm text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <button type="button" onClick={toggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-muted flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-card rounded-xl shadow-lg border border-border p-8 space-y-6">

        {/* Logo */}
        <div className="text-center space-y-1">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary mb-1">
            <School className="w-6 h-6 text-primary-foreground" />
          </div>
          <h1 className="text-xl font-bold text-foreground">
            {step === 'login' && 'Welcome Back'}
            {step === 'reset-password' && 'Set New Password'}
            {step === 'forgot-password' && 'Forgot Password'}
          </h1>
          <p className="text-muted-foreground text-xs">
            {step === 'login' && 'Sign in to your account'}
            {step === 'reset-password' && 'This is your first login. Please set a new password.'}
            {step === 'forgot-password' && 'Enter your username to reset your password'}
          </p>
        </div>

        {/* Login */}
        {step === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-foreground">Username</label>
              <input
                type="text" required value={username} onChange={e => setUsername(e.target.value)}
                placeholder="Enter your username"
                className="w-full border border-input rounded-lg px-3 py-2.5 text-sm text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            {pwInput('Password', password, setPassword, showPassword, () => setShowPassword(p => !p))}
            <button type="submit" disabled={loading}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-2.5 rounded-lg text-sm transition disabled:opacity-50">
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
            <button type="button" onClick={() => setStep('forgot-password')}
              className="w-full text-primary hover:underline text-sm text-center">
              Forgot password?
            </button>
          </form>
        )}

        {/* First-login reset */}
        {step === 'reset-password' && (
          <form onSubmit={handleFirstLoginReset} className="space-y-4">
            {pwInput('New Password', newPassword, setNewPassword, showNew, () => setShowNew(p => !p))}
            {pwInput('Confirm Password', confirmPassword, setConfirmPassword, showConfirm, () => setShowConfirm(p => !p))}
            <button type="submit" disabled={loading}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-2.5 rounded-lg text-sm transition disabled:opacity-50">
              {loading ? 'Saving...' : 'Set Password & Continue'}
            </button>
          </form>
        )}

        {/* Forgot password */}
        {step === 'forgot-password' && (
          <form onSubmit={handleForgotRequest} className="space-y-4">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-foreground">Username</label>
              <input
                type="text" required value={forgotUsername} onChange={e => setForgotUsername(e.target.value)}
                placeholder="Enter your username"
                className="w-full border border-input rounded-lg px-3 py-2.5 text-sm text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-2.5 rounded-lg text-sm transition disabled:opacity-50">
              {loading ? 'Processing...' : 'Request Reset'}
            </button>
            <button type="button" onClick={() => setStep('login')}
              className="w-full text-muted-foreground hover:underline text-sm text-center">
              Back to login
            </button>
          </form>
        )}

      </div>
    </div>
  );
}
