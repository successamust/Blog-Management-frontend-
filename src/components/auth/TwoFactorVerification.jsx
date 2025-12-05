import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, ArrowLeft } from 'lucide-react';
import Spinner from '../common/Spinner';

const TwoFactorVerification = ({ onVerify, onCancel, loading = false }) => {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const inputRefs = useRef([]);

  useEffect(() => {
    // Focus first input on mount
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  const handleChange = (index, value) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) {
      return;
    }

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits are entered
    if (value && index === 5) {
      const fullCode = newCode.join('');
      if (fullCode.length === 6) {
        onVerify(fullCode);
      }
    }
  };

  const handleKeyDown = (index, e) => {
    // Handle backspace
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    // Handle paste
    if (e.key === 'v' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      navigator.clipboard.readText().then((text) => {
        const digits = text.replace(/\D/g, '').slice(0, 6).split('');
        const newCode = [...code];
        digits.forEach((digit, i) => {
          if (i < 6) {
            newCode[i] = digit;
          }
        });
        setCode(newCode);
        if (digits.length === 6) {
          onVerify(newCode.join(''));
        } else {
          inputRefs.current[digits.length]?.focus();
        }
      });
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text');
    const digits = pastedData.replace(/\D/g, '').slice(0, 6).split('');
    const newCode = [...code];
    digits.forEach((digit, i) => {
      if (i < 6) {
        newCode[i] = digit;
      }
    });
    setCode(newCode);
    if (digits.length === 6) {
      onVerify(newCode.join(''));
    } else {
      inputRefs.current[digits.length]?.focus();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="text-center">
        <div className="flex justify-center mb-4">
          <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-full">
            <Shield className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
        </div>
        <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">
          Two-Factor Authentication
        </h3>
        <p className="text-sm text-[var(--text-secondary)]">
          Enter the 6-digit code from your authenticator app
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex justify-center gap-2">
          {code.map((digit, index) => (
            <input
              key={index}
              ref={(el) => (inputRefs.current[index] = el)}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={index === 0 ? handlePaste : undefined}
              className="w-12 h-14 text-center text-2xl font-bold border-2 border-[var(--border-subtle)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--accent)] bg-[var(--surface-bg)] text-[var(--text-primary)]"
              disabled={loading}
            />
          ))}
        </div>

        <div className="flex gap-3">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="flex-1 btn btn-outline flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          )}
          <button
            type="button"
            onClick={() => onVerify(code.join(''))}
            disabled={loading || code.join('').length !== 6}
            className="flex-1 btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Spinner size="sm" tone="light" /> : 'Verify'}
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default TwoFactorVerification;

