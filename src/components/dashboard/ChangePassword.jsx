import React, { useState } from 'react';
import { Lock, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import PasswordStrength from '../common/PasswordStrength';
import { validatePassword } from '../../utils/securityUtils';

const ChangePassword = () => {
  const { changePassword } = useAuth();
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.newPassword !== formData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    // Use security utils for password validation
    const passwordValidation = validatePassword(formData.newPassword, {
      minLength: 8,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: true,
    });

    if (!passwordValidation.valid) {
      toast.error(passwordValidation.errors[0] || 'Password does not meet requirements');
      return;
    }

    setSubmitting(true);

    try {
      const result = await changePassword({
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword,
      });

      if (result.success) {
        setFormData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
    }
  } catch (error) {
    toast.error(error.response?.data?.message || 'Failed to change password');
  } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="surface-card p-6">
      <h2 className="text-2xl font-bold text-primary mb-6">Change Password</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
            Current Password
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-[var(--text-muted)]" />
            </div>
            <input
              type={showCurrentPassword ? 'text' : 'password'}
              name="currentPassword"
              value={formData.currentPassword}
              onChange={handleChange}
              required
              className="appearance-none relative block w-full pl-10 pr-10 py-3 border border-[var(--border-subtle)] placeholder-[var(--text-muted)] text-[var(--text-primary)] rounded-lg focus:outline-none focus:ring-[var(--accent)] focus:border-[var(--accent)] focus:z-10 sm:text-sm bg-[var(--surface-bg)]"
              placeholder="Enter current password"
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
            >
              {showCurrentPassword ? (
                <EyeOff className="h-5 w-5 text-[var(--text-muted)]" />
              ) : (
                <Eye className="h-5 w-5 text-[var(--text-muted)]" />
              )}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
            New Password
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-[var(--text-muted)]" />
            </div>
            <input
              type={showNewPassword ? 'text' : 'password'}
              name="newPassword"
              value={formData.newPassword}
              onChange={handleChange}
              required
              className="appearance-none relative block w-full pl-10 pr-10 py-3 border border-[var(--border-subtle)] placeholder-[var(--text-muted)] text-[var(--text-primary)] rounded-lg focus:outline-none focus:ring-[var(--accent)] focus:border-[var(--accent)] focus:z-10 sm:text-sm bg-[var(--surface-bg)]"
              placeholder="Enter new password"
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
              onClick={() => setShowNewPassword(!showNewPassword)}
            >
              {showNewPassword ? (
                <EyeOff className="h-5 w-5 text-[var(--text-muted)]" />
              ) : (
                <Eye className="h-5 w-5 text-[var(--text-muted)]" />
              )}
            </button>
          </div>
          <PasswordStrength 
            password={formData.newPassword} 
            requirements={{
              minLength: 8,
              requireUppercase: true,
              requireLowercase: true,
              requireNumbers: true,
              requireSpecialChars: true,
            }}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
            Confirm New Password
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-[var(--text-muted)]" />
            </div>
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              className="appearance-none relative block w-full pl-10 pr-10 py-3 border border-[var(--border-subtle)] placeholder-[var(--text-muted)] text-[var(--text-primary)] rounded-lg focus:outline-none focus:ring-[var(--accent)] focus:border-[var(--accent)] focus:z-10 sm:text-sm bg-[var(--surface-bg)]"
              placeholder="Confirm new password"
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              {showConfirmPassword ? (
                <EyeOff className="h-5 w-5 text-[var(--text-muted)]" />
              ) : (
                <Eye className="h-5 w-5 text-[var(--text-muted)]" />
              )}
            </button>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_12px_28px_rgba(26,137,23,0.2)]"
          >
            {submitting ? 'Changing...' : 'Change Password'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChangePassword;

