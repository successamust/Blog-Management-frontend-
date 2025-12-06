import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { authAPI } from '../../services/api';
import Spinner from '../../components/common/Spinner';
import BrandWordmark from '../../components/common/BrandWordmark';
import Seo, { DEFAULT_OG_IMAGE } from '../../components/common/Seo';
import TwoFactorVerification from '../../components/auth/TwoFactorVerification';
import toast from 'react-hot-toast';

const LOGIN_DESCRIPTION = 'Sign in to Nexus to manage your publications, subscriptions, and saved reading list.';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [show2FA, setShow2FA] = useState(false);
  const [verifying2FA, setVerifying2FA] = useState(false);
  const [tempToken, setTempToken] = useState(null);
  const { login, logout, loading, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const redirectParam = searchParams.get('redirect');

  const from = location.state?.from?.pathname || redirectParam || '/dashboard';

  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await login(formData);
    
    // Check if 2FA is required
    if (result.requires2FA) {
      setTempToken(result.tempToken);
      setShow2FA(true);
      return;
    }
    
    if (result.success) {
      navigate(from, { replace: true });
    }
  };

  const handle2FAVerify = async (code) => {
    if (!tempToken) {
      toast.error('Session expired. Please try logging in again.');
      setShow2FA(false);
      return;
    }

    setVerifying2FA(true);
    try {
      const response = await authAPI.verify2FALogin(code, tempToken);
      const { token, accessToken, user, expiresIn } = response.data;
      
      // Use accessToken if available, otherwise fall back to token
      const finalToken = accessToken || token;
      
      // Set tokens using auth context methods
      const { setAuthToken } = await import('../../utils/tokenStorage.js');
      const { setAccessTokenExpiry } = await import('../../utils/refreshToken.js');
      
      setAuthToken(finalToken);
      
      if (expiresIn) {
        const expiry = Date.now() + (expiresIn * 1000);
        setAccessTokenExpiry(expiry);
      }
      
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('lastAuthCheck', Date.now().toString());
      
      toast.success('Login successful!');
      navigate(from, { replace: true });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Invalid verification code');
    } finally {
      setVerifying2FA(false);
    }
  };

  const handle2FACancel = () => {
    setShow2FA(false);
    setTempToken(null);
    setFormData({ email: formData.email, password: '' });
  };

  return (
    <>
      <Seo
        title="Sign In"
        description={LOGIN_DESCRIPTION}
        url={`/login${location.search || ''}`}
        image={DEFAULT_OG_IMAGE}
      />
      <div className="min-h-screen auth-shell flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full space-y-8"
      >
        <div>
          <div className="flex justify-center">
            <motion.div
              whileHover={{ scale: 1.1, rotate: 5 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 17 }}
            >
              <img 
                src="/nexus-logo-icon.svg" 
                alt="Nexus Logo" 
                className="logo-theme-aware w-12 h-12"
              />
            </motion.div>
          </div>
          <div className="mt-4 flex justify-center text-[var(--text-primary)]">
            <BrandWordmark />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-[var(--text-primary)]">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-secondary">
            Or{' '}
            <Link
              to="/register"
              className="font-medium text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors"
            >
              create a new account
            </Link>
          </p>
        </div>
        <AnimatePresence mode="wait">
          {!show2FA ? (
            <motion.form
              key="login-form"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="mt-8 space-y-6 surface-card p-8"
              onSubmit={handleSubmit}
            >
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[var(--text-primary)]">
                Email address
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-muted" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="appearance-none relative block w-full pl-10 pr-3 py-3 glass-card placeholder-[var(--text-muted)] text-[var(--text-primary)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50 focus:border-[var(--accent)]/35 focus:bg-[var(--surface-bg)]/90 focus:z-10 sm:text-sm transition-all"
                  placeholder="Enter your email"
                />
              </div>
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-[var(--text-primary)]">
                Password
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-muted" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="appearance-none relative block w-full pl-10 pr-10 py-3 glass-card placeholder-[var(--text-muted)] text-[var(--text-primary)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50 focus:border-[var(--accent)]/35 focus:bg-[var(--surface-bg)]/90 focus:z-10 sm:text-sm transition-all"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-muted" />
                  ) : (
                    <Eye className="h-5 w-5 text-muted" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="h-4 w-4 text-[var(--accent)] focus:ring-[var(--accent)] border-[var(--border-subtle)] rounded"
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-secondary">
                Remember me
              </label>
            </div>

            <div className="text-sm">
              <Link
                to="/forgot-password"
                className="font-medium text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors"
              >
                Forgot your password?
              </Link>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary group relative disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_14px_30px_rgba(26,137,23,0.2)]"
            >
              {loading ? <Spinner size="sm" tone="light" /> : 'Sign in'}
            </button>
          </div>
        </motion.form>
          ) : (
            <motion.div
              key="2fa-form"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="mt-8 surface-card p-8"
            >
              <TwoFactorVerification
                onVerify={handle2FAVerify}
                onCancel={handle2FACancel}
                loading={verifying2FA}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
      </div>
    </>
  );
};

export default Login;