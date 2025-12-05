import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, ShieldCheck, ShieldOff, QrCode, Copy, Check } from 'lucide-react';
import { authAPI } from '../../services/api';
import toast from 'react-hot-toast';
import Spinner from '../common/Spinner';

const TwoFactorAuth = () => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [setupMode, setSetupMode] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [qrCode, setQrCode] = useState(null);
  const [backupCodes, setBackupCodes] = useState([]);
  const [showBackupCodes, setShowBackupCodes] = useState(false);

  useEffect(() => {
    fetch2FAStatus();
  }, []);

  const fetch2FAStatus = async () => {
    try {
      setLoading(true);
      const response = await authAPI.get2FAStatus();
      setStatus(response.data);
    } catch (error) {
      // Handle 404 gracefully - endpoint might not be implemented yet
      if (error.response?.status === 404) {
        setStatus({ enabled: false });
        if (import.meta.env.DEV) {
          console.info('[2FA] Endpoint not available yet. Backend may not have implemented 2FA.');
        }
      } else {
        console.error('Error fetching 2FA status:', error);
        // Only show error toast for non-404 errors
        if (error.response?.status !== 404) {
          toast.error('Failed to load 2FA status');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSetup = async () => {
    try {
      setLoading(true);
      const response = await authAPI.setup2FA();
      setQrCode(response.data.qrCode);
      setBackupCodes(response.data.backupCodes || []);
      setSetupMode(true);
      setShowBackupCodes(true);
    } catch (error) {
      console.error('Error setting up 2FA:', error);
      toast.error(error.response?.data?.message || 'Failed to setup 2FA');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      toast.error('Please enter a valid 6-digit code');
      return;
    }

    try {
      setLoading(true);
      await authAPI.verify2FA(verificationCode);
      toast.success('2FA enabled successfully!');
      setSetupMode(false);
      setVerificationCode('');
      await fetch2FAStatus();
    } catch (error) {
      console.error('Error verifying 2FA:', error);
      toast.error(error.response?.data?.message || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      toast.error('Please enter your 2FA code to disable');
      return;
    }

    try {
      setLoading(true);
      await authAPI.disable2FA(verificationCode);
      toast.success('2FA disabled successfully');
      setVerificationCode('');
      await fetch2FAStatus();
    } catch (error) {
      console.error('Error disabling 2FA:', error);
      toast.error(error.response?.data?.message || 'Failed to disable 2FA');
    } finally {
      setLoading(false);
    }
  };

  const copyBackupCode = (code) => {
    navigator.clipboard.writeText(code);
    toast.success('Backup code copied!');
  };

  if (loading && !status) {
    return (
      <div className="flex items-center justify-center p-8">
        <Spinner size="lg" />
      </div>
    );
  }

  const isEnabled = status?.enabled || false;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">Two-Factor Authentication</h3>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Add an extra layer of security to your account
          </p>
        </div>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${
          isEnabled 
            ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300' 
            : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
        }`}>
          {isEnabled ? (
            <ShieldCheck className="w-4 h-4" />
          ) : (
            <ShieldOff className="w-4 h-4" />
          )}
          <span className="text-sm font-medium">{isEnabled ? 'Enabled' : 'Disabled'}</span>
        </div>
      </div>

      {setupMode && !isEnabled && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[var(--surface-subtle)] rounded-lg p-6 space-y-4"
        >
          <div>
            <h4 className="font-semibold text-[var(--text-primary)] mb-2">Scan QR Code</h4>
            <p className="text-sm text-[var(--text-secondary)] mb-4">
              Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
            </p>
            {qrCode && (
              <div className="flex justify-center mb-4">
                <img src={qrCode} alt="2FA QR Code" className="w-48 h-48 border border-[var(--border-subtle)] rounded-lg" />
              </div>
            )}
          </div>

          {showBackupCodes && backupCodes.length > 0 && (
            <div className="bg-[var(--surface-bg)] rounded-lg p-4 border border-[var(--border-subtle)]">
              <h4 className="font-semibold text-[var(--text-primary)] mb-2">Backup Codes</h4>
              <p className="text-xs text-[var(--text-secondary)] mb-3">
                Save these codes in a safe place. You can use them to access your account if you lose your device.
              </p>
              <div className="grid grid-cols-2 gap-2">
                {backupCodes.map((code, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-[var(--surface-subtle)] rounded font-mono text-sm"
                  >
                    <span>{code}</span>
                    <button
                      onClick={() => copyBackupCode(code)}
                      className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              Enter verification code
            </label>
            <input
              type="text"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              maxLength={6}
              className="w-full px-4 py-2 border border-[var(--border-subtle)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent bg-[var(--surface-bg)] text-[var(--text-primary)] font-mono text-center text-lg tracking-widest"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => {
                setSetupMode(false);
                setVerificationCode('');
                setQrCode(null);
                setBackupCodes([]);
              }}
              className="flex-1 btn btn-outline"
            >
              Cancel
            </button>
            <button
              onClick={handleVerify}
              disabled={verificationCode.length !== 6 || loading}
              className="flex-1 btn btn-primary"
            >
              {loading ? <Spinner size="sm" /> : 'Verify & Enable'}
            </button>
          </div>
        </motion.div>
      )}

      {!setupMode && (
        <div className="space-y-4">
          {!isEnabled ? (
            <button
              onClick={handleSetup}
              className="w-full btn btn-primary flex items-center justify-center gap-2"
            >
              <Shield className="w-4 h-4" />
              Enable 2FA
            </button>
          ) : (
            <div className="space-y-4">
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <p className="text-sm text-green-800 dark:text-green-200">
                  Two-factor authentication is enabled. Your account is protected with an extra layer of security.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Enter 2FA code to disable
                </label>
                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  maxLength={6}
                  className="w-full px-4 py-2 border border-[var(--border-subtle)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent bg-[var(--surface-bg)] text-[var(--text-primary)] font-mono text-center text-lg tracking-widest"
                />
              </div>

              <button
                onClick={handleDisable}
                disabled={verificationCode.length !== 6 || loading}
                className="w-full btn btn-outline text-red-600 border-red-300 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                {loading ? <Spinner size="sm" /> : 'Disable 2FA'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TwoFactorAuth;

