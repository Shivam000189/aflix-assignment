import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

interface AuthPageProps {
  initialMode?: 'login' | 'register';
}

const DEMO_ACCOUNTS = [
  { role: 'Admin', email: 'admin@aflix.com', password: 'password123', color: 'hover:border-rose-400 hover:text-rose-600' },
  { role: 'Manager', email: 'manager@aflix.com', password: 'password123', color: 'hover:border-indigo-400 hover:text-indigo-600' },
  { role: 'User', email: 'user@aflix.com', password: 'password123', color: 'hover:border-sky-400 hover:text-sky-600' },
];

export default function AuthPage({ initialMode }: AuthPageProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, register } = useAuth();
  const { showToast } = useToast();

  // Determine active tab from URL path or prop
  const currentPathMode = location.pathname.includes('register') ? 'register' : 'login';
  const [mode, setMode] = useState<'login' | 'register'>(initialMode || currentPathMode);

  // Sync mode if URL changes
  useEffect(() => {
    if (location.pathname.includes('register')) {
      setMode('register');
    } else if (location.pathname.includes('login')) {
      setMode('login');
    }
  }, [location.pathname]);

  // Login form state
  const [loginEmail, setLoginEmail] = useState((location.state as any)?.registeredEmail || '');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Register form state
  const [name, setName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Status & feedback
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeDemo, setActiveDemo] = useState<string | null>(null);

  // Demo controls toggle (active in dev or via feature flag)
  const showDemoControls =
    Boolean(import.meta.env.DEV) || import.meta.env.VITE_ENABLE_DEMO_LOGIN === 'true';

  const switchMode = (newMode: 'login' | 'register') => {
    setMode(newMode);
    setError(null);
    navigate(newMode === 'login' ? '/login' : '/register', { replace: true });
  };

  const handleFillDemo = (acc: typeof DEMO_ACCOUNTS[0]) => {
    setLoginEmail(acc.email);
    setLoginPassword(acc.password);
    setActiveDemo(acc.role);
    setError(null);
    if (mode !== 'login') {
      switchMode('login');
    }
  };

  // Live password validation
  const hasMinLength = regPassword.length >= 6;
  const passwordsMatch = regPassword.length > 0 && regPassword === confirmPassword;

  const handleLoginSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!loginEmail.trim()) {
      setError('Please enter your email address');
      return;
    }
    if (!loginPassword) {
      setError('Please enter your password');
      return;
    }

    setIsSubmitting(true);
    const result = await login(loginEmail, loginPassword);
    setIsSubmitting(false);

    if (result.success) {
      showToast('Welcome back! Signed in successfully', 'success');
      navigate('/');
    } else {
      setError(result.error || 'Failed to authenticate');
    }
  };

  const handleRegisterSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Please provide your full name');
      return;
    }

    if (!regEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(regEmail.trim())) {
      setError('Please provide a valid work email address');
      return;
    }

    if (regPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    if (regPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsSubmitting(true);
    const regResult = await register({
      name: name.trim(),
      email: regEmail.trim(),
      password: regPassword,
      role: 'user',
      phone: phone.trim(),
    });

    if (!regResult.success) {
      setIsSubmitting(false);
      setError(regResult.error || 'Failed to create account');
      showToast(regResult.error || 'Registration failed', 'error');
      return;
    }

    showToast('Account created successfully! Logging you in...', 'success');

    try {
      const loginResult = await login(regEmail.trim(), regPassword);
      if (loginResult.success) {
        navigate('/');
      } else {
        setLoginEmail(regEmail.trim());
        switchMode('login');
        setError('Account created! Please sign in with your password.');
      }
    } catch {
      setLoginEmail(regEmail.trim());
      switchMode('login');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[100dvh] w-full bg-[#f8fafc] flex flex-col justify-center items-center px-3 sm:px-4 py-2 sm:py-4 relative overflow-x-hidden overflow-y-auto font-sans">
      {/* Decorative ambient background glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[320px] sm:w-[450px] h-[320px] sm:h-[450px] rounded-full bg-gradient-to-br from-red-400/10 to-indigo-500/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[320px] sm:w-[450px] h-[320px] sm:h-[450px] rounded-full bg-gradient-to-tl from-sky-400/10 to-indigo-600/10 blur-3xl pointer-events-none" />

      {/* Main Card - Fully responsive, single-frame viewport layout */}
      <div className="relative w-full max-w-[440px] sm:max-w-[480px] md:max-w-[500px] my-auto bg-white/95 backdrop-blur-md rounded-2xl sm:rounded-3xl shadow-[0_15px_40px_rgba(15,23,42,0.08),0_1px_3px_rgba(15,23,42,0.04)] border border-slate-200/80 px-4 py-4 sm:px-6 sm:py-5 md:px-7 md:py-5.5 z-10 max-h-[calc(100dvh-1.5rem)] overflow-y-auto custom-scrollbar">
        {/* Top Signature Gradient Bar */}
        <div
          className="absolute top-0 left-0 right-0 h-[3.5px]"
          style={{
            background: 'linear-gradient(90deg, #e12634 0%, #4a3cdb 55%, #169bf2 100%)',
          }}
        />

        {/* Brand & Heading Row */}
        <div className="flex items-center justify-between mb-2 sm:mb-2.5">
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-white font-black text-xs sm:text-sm shadow-xs flex-shrink-0"
              style={{
                background: 'linear-gradient(135deg, #e12634 0%, #4a3cdb 60%, #169bf2 100%)',
              }}
            >
              A
            </div>
            <div>
              <h1 className="text-sm sm:text-base md:text-lg font-extrabold text-[#091e3a] tracking-tight leading-none">
                Aflix Infotech
              </h1>
              <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">
                Enterprise CRM
              </span>
            </div>
          </div>

          <span className="text-[10px] sm:text-[11px] font-medium text-slate-500 bg-slate-100 px-2 sm:px-2.5 py-0.5 rounded-full border border-slate-200/60 whitespace-nowrap">
            {mode === 'login' ? 'Secure Access' : 'Quick Onboarding'}
          </span>
        </div>

        {/* Segmented Tab Switcher */}
        <div className="grid grid-cols-2 p-1 bg-slate-100/90 rounded-xl mb-2.5 sm:mb-3 border border-slate-200/70">
          <button
            type="button"
            onClick={() => switchMode('login')}
            className={`py-1.5 sm:py-2 text-xs sm:text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              mode === 'login'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
            <span>Sign In</span>
          </button>

          <button
            type="button"
            onClick={() => switchMode('register')}
            className={`py-1.5 sm:py-2 text-xs sm:text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              mode === 'register'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
              <circle cx="8.5" cy="7" r="4" />
              <line x1="20" y1="8" x2="20" y2="14" />
              <line x1="23" y1="11" x2="17" y2="11" />
            </svg>
            <span>Create Account</span>
          </button>
        </div>

        {/* Compact Demo Quick-Fill Bar (dev mode) */}
        {mode === 'login' && showDemoControls && (
          <div className="mb-2.5 sm:mb-3 px-2 sm:px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-[10.5px] sm:text-[11px] flex-wrap gap-1">
            <span className="font-semibold text-slate-500 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
              Demo:
            </span>
            <div className="flex items-center gap-1 sm:gap-1.5">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.role}
                  type="button"
                  onClick={() => handleFillDemo(acc)}
                  className={`px-1.5 sm:px-2 py-0.5 rounded-md border font-medium transition-all cursor-pointer ${
                    activeDemo === acc.role
                      ? 'bg-indigo-50 border-indigo-500 text-indigo-700 font-bold'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                  title={`Fill ${acc.email}`}
                >
                  {acc.role}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Error notification banner */}
        {error && (
          <div className="mb-2 px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-1.5 leading-snug">
            <svg className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* LOGIN FORM */}
        {mode === 'login' && (
          <form onSubmit={handleLoginSubmit} noValidate className="space-y-2 sm:space-y-2.5">
            <div>
              <label htmlFor="login-email" className="block text-[11px] sm:text-xs font-bold text-slate-700 mb-1">
                Work Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                </div>
                <input
                  id="login-email"
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  required
                  placeholder="name@company.com"
                  autoComplete="email"
                  className="w-full bg-slate-50/70 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-base sm:text-sm text-slate-900 placeholder-slate-400 outline-none transition-all focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="login-password" className="block text-[11px] sm:text-xs font-bold text-slate-700">
                  Password
                </label>
                {/* <span className="text-[10px] text-slate-400">Default: password123</span> */}
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0110 0v4" />
                  </svg>
                </div>
                <input
                  id="login-password"
                  type={showLoginPassword ? 'text' : 'password'}
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full bg-slate-50/70 border border-slate-200 rounded-xl pl-9 pr-12 py-2 text-base sm:text-sm text-slate-900 placeholder-slate-400 outline-none transition-all focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15"
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-slate-400 hover:text-slate-700 px-2 py-1 rounded cursor-pointer transition-colors"
                >
                  {showLoginPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 rounded-xl h-10 sm:h-11 px-4 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 cursor-pointer shadow-[0_8px_20px_-4px_rgba(79,70,229,0.4)] hover:opacity-95 hover:shadow-[0_10px_24px_-4px_rgba(79,70,229,0.5)] active:translate-y-0.5 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              style={{
                background: 'linear-gradient(90deg, #e12634 0%, #4a3cdb 50%, #169bf2 100%)',
              }}
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin w-4 h-4 text-white" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </>
              )}
            </button>
          </form>
        )}

        {/* REGISTER FORM */}
        {mode === 'register' && (
          <form onSubmit={handleRegisterSubmit} noValidate className="space-y-2 sm:space-y-2.5">
            {/* Row 1: Name and Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5">
              <div>
                <label htmlFor="reg-name" className="block text-[11px] sm:text-xs font-bold text-slate-700 mb-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </div>
                  <input
                    id="reg-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="Shivam Sharma"
                    className="w-full bg-slate-50/70 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 sm:py-2 text-base sm:text-sm text-slate-900 placeholder-slate-400 outline-none transition-all focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="reg-phone" className="block text-[11px] sm:text-xs font-bold text-slate-700 mb-1">
                  Phone <span className="text-slate-400 font-normal text-[10px]">(optional)</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
                    </svg>
                  </div>
                  <input
                    id="reg-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full bg-slate-50/70 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 sm:py-2 text-base sm:text-sm text-slate-900 placeholder-slate-400 outline-none transition-all focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15"
                  />
                </div>
              </div>
            </div>

            {/* Row 2: Work Email */}
            <div>
              <label htmlFor="reg-email" className="block text-[11px] sm:text-xs font-bold text-slate-700 mb-1">
                Work Email <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                </div>
                <input
                  id="reg-email"
                  type="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  required
                  placeholder="you@company.com"
                  autoComplete="email"
                  className="w-full bg-slate-50/70 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 sm:py-2 text-base sm:text-sm text-slate-900 placeholder-slate-400 outline-none transition-all focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15"
                />
              </div>
            </div>

            {/* Row 3: Password and Confirm Password */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="reg-pass" className="block text-[11px] sm:text-xs font-bold text-slate-700">
                    Password <span className="text-rose-500">*</span>
                  </label>
                  <span className={`text-[10px] ${hasMinLength ? 'text-emerald-600 font-semibold' : 'text-slate-400'}`}>
                    ≥ 6 chars
                  </span>
                </div>
                <div className="relative">
                  <input
                    id="reg-pass"
                    type={showRegPassword ? 'text' : 'password'}
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    autoComplete="new-password"
                    className="w-full bg-slate-50/70 border border-slate-200 rounded-xl px-3 pr-11 py-1.5 sm:py-2 text-base sm:text-sm text-slate-900 placeholder-slate-400 outline-none transition-all focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPassword(!showRegPassword)}
                    className="absolute right-1 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-slate-400 hover:text-slate-700 px-2 py-1 rounded cursor-pointer"
                  >
                    {showRegPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="reg-confirm" className="block text-[11px] sm:text-xs font-bold text-slate-700">
                    Confirm <span className="text-rose-500">*</span>
                  </label>
                  {confirmPassword && (
                    <span className={`text-[10px] font-semibold ${passwordsMatch ? 'text-emerald-600' : 'text-rose-500'}`}>
                      {passwordsMatch ? 'Match ✓' : 'Mismatch ✗'}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    id="reg-confirm"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    autoComplete="new-password"
                    className={`w-full bg-slate-50/70 border rounded-xl px-3 pr-11 py-1.5 sm:py-2 text-base sm:text-sm text-slate-900 placeholder-slate-400 outline-none transition-all ${
                      confirmPassword && !passwordsMatch
                        ? 'border-rose-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/15'
                        : 'border-slate-200 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-1 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-slate-400 hover:text-slate-700 px-2 py-1 rounded cursor-pointer"
                  >
                    {showConfirmPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 rounded-xl h-10 sm:h-11 px-4 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 cursor-pointer shadow-[0_8px_20px_-4px_rgba(79,70,229,0.4)] hover:opacity-95 hover:shadow-[0_10px_24px_-4px_rgba(79,70,229,0.5)] active:translate-y-0.5 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              style={{
                background: 'linear-gradient(90deg, #e12634 0%, #4a3cdb 50%, #169bf2 100%)',
              }}
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin w-4 h-4 text-white" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <span>Create Account</span>
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </>
              )}
            </button>
          </form>
        )}

        {/* Bottom Switch Note */}
        <div className="mt-2.5 sm:mt-3 pt-2 sm:pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>
            {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}
          </span>
          <button
            type="button"
            onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}
            className="font-bold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer py-1"
          >
            {mode === 'login' ? 'Register here' : 'Sign in here'}
          </button>
        </div>

        {/* Minimal Footer */}
        <p className="text-center text-[10px] sm:text-[10.5px] text-slate-400 mt-1.5 sm:mt-2">
          Aflix Infotech Full-Stack CRM • Protected by Enterprise RBAC
        </p>
      </div>
    </div>
  );
}
