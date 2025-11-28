import React, { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { authAPI } from '../../services/api';
import toast from 'react-hot-toast';
import Spinner from '../../components/common/Spinner';
import Seo, { DEFAULT_OG_IMAGE } from '../../components/common/Seo';

const RESET_PASSWORD_DESCRIPTION = 'Choose a new Nexus password so you can continue reading, writing, and curating your publication.';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const seoUrl = token ? `/reset-password?token=${encodeURIComponent(token)}` : '/reset-password';
  const seoNode = (
    <Seo
      title="Reset Password"
      description={RESET_PASSWORD_DESCRIPTION}
      url={seoUrl}
      image={DEFAULT_OG_IMAGE}
    />
  );

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    if (!token) {
      toast.error('Invalid reset token');
      return;
    }

    setLoading(true);

    try {
      await authAPI.resetPassword({
        token,
        password: formData.password,
      });
      toast.success('Password reset successfully');
      navigate('/login');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <>
        {seoNode}
        <div className="min-h-screen auth-shell flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-md w-full space-y-8"
        >
          <div className="surface-card p-8 text-center">
            <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Invalid Reset Link</h2>
            <p className="text-secondary mb-6">
              The password reset link is invalid or has expired.
            </p>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link
                to="/forgot-password"
                className="inline-flex items-center text-[var(--accent)] hover:text-[var(--accent-hover)] font-medium transition-colors"
              >
                Request a new reset link
              </Link>
            </motion.div>
          </div>
        </motion.div>
        </div>
      </>
    );
  }

  return (
    <>
      {seoNode}
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
              className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg shadow-[rgba(26,137,23,0.25)] bg-[var(--accent)] text-white font-bold text-lg"
            >
              B
            </motion.div>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-[var(--text-primary)]">
            Reset Password
          </h2>
          <p className="mt-2 text-center text-sm text-[var(--text-secondary)]">
            Enter your new password below.
          </p>
        </div>
        <form className="mt-8 space-y-6 surface-card p-8" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-secondary">
                New Password
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-muted" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="appearance-none relative block w-full pl-10 pr-10 py-3 glass-card placeholder-[var(--text-muted)] text-[var(--text-primary)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50 focus:border-[var(--accent)]/35 focus:bg-[var(--surface-bg)]/90 focus:z-10 sm:text-sm transition-all"
                  placeholder="Enter new password"
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
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-secondary">
                Confirm Password
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-muted" />
                </div>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="appearance-none relative block w-full pl-10 pr-10 py-3 glass-card placeholder-[var(--text-muted)] text-[var(--text-primary)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50 focus:border-[var(--accent)]/35 focus:bg-[var(--surface-bg)]/90 focus:z-10 sm:text-sm transition-all"
                  placeholder="Confirm new password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5 text-muted" />
                  ) : (
                    <Eye className="h-5 w-5 text-muted" />
                  )}
                </button>
              </div>
            </div>
          </div>

        <div>
          <motion.button
            type="submit"
            disabled={loading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="btn btn-primary group relative disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_14px_30px_rgba(26,137,23,0.2)]"
          >
            {loading ? <Spinner size="sm" tone="light" /> : 'Reset Password'}
          </motion.button>
        </div>

        <div className="text-center">
          <Link
            to="/login"
            className="inline-flex items-center text-sm font-medium text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Login
          </Link>
        </div>
        </form>
      </motion.div>
      </div>
    </>
  );
};

export default ResetPassword;

