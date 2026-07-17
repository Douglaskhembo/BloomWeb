import { useState, useRef, useCallback, useEffect } from 'react';
import { Eye, EyeOff, School } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { authAPI } from '@/services/api';
import { toast } from 'sonner';
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
      toast.error(getBackendErrorMessage(err, 'Invalid credentials'));
    } finally {
      setLoading(false);
    }
  };

  const handleFirstLoginReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) { toast.error('Passwords do not match'); return; }
    setLoading(true);
    try {
      await authAPI.resetPassword({ newPassword, confirmPassword }, pendingUser.token);
      toast.success('Password updated. Logging you in...');
      login({ ...pendingUser, token: pendingUser.token, firstLogin: false });
    } catch (err: any) {
      toast.error(getBackendErrorMessage(err, 'Failed to reset password'));
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
      toast.info('Contact your administrator to reset your password.');
      setStep('login');
    } catch (err: any) {
      toast.error(getBackendErrorMessage(err, 'Failed'));
    } finally {
      setLoading(false);
    }
  };

  const pwInput = (label: string, val: string, set: (v: string) => void, show: boolean, toggle: () => void, placeholder = '••••••••') => (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-slate-700">{label}</label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          required
          value={val}
          onChange={e => set(e.target.value)}
          placeholder={placeholder}
          className="w-full border border-slate-300 rounded-lg px-3 py-2.5 pr-10 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button type="button" onClick={toggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-xl shadow-lg border border-slate-200 p-8 space-y-6">

        {/* Logo */}
        <div className="text-center space-y-1">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary mb-1">
            <School className="w-6 h-6 text-primary-foreground" />
          </div>
          <h1 className="text-xl font-bold text-slate-800">
            {step === 'login' && 'Welcome Back'}
            {step === 'reset-password' && 'Set New Password'}
            {step === 'forgot-password' && 'Forgot Password'}
          </h1>
          <p className="text-slate-500 text-xs">
            {step === 'login' && 'Sign in to your account'}
            {step === 'reset-password' && 'This is your first login. Please set a new password.'}
            {step === 'forgot-password' && 'Enter your username to reset your password'}
          </p>
        </div>

        {/* Login */}
        {step === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-700">Username</label>
              <input
                type="text" required value={username} onChange={e => setUsername(e.target.value)}
                placeholder="Enter your username"
                className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {pwInput('Password', password, setPassword, showPassword, () => setShowPassword(p => !p))}
            <button type="submit" disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg text-sm transition disabled:opacity-50">
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
            <button type="button" onClick={() => setStep('forgot-password')}
              className="w-full text-blue-600 hover:underline text-sm text-center">
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
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg text-sm transition disabled:opacity-50">
              {loading ? 'Saving...' : 'Set Password & Continue'}
            </button>
          </form>
        )}

        {/* Forgot password */}
        {step === 'forgot-password' && (
          <form onSubmit={handleForgotRequest} className="space-y-4">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-700">Username</label>
              <input
                type="text" required value={forgotUsername} onChange={e => setForgotUsername(e.target.value)}
                placeholder="Enter your username"
                className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg text-sm transition disabled:opacity-50">
              {loading ? 'Processing...' : 'Request Reset'}
            </button>
            <button type="button" onClick={() => setStep('login')}
              className="w-full text-slate-500 hover:underline text-sm text-center">
              Back to login
            </button>
          </form>
        )}

      </div>
    </div>
  );
}
