import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, CheckCircle, XCircle, ArrowLeft } from 'lucide-react';
import { newsletterAPI } from '../../services/api';
import toast from 'react-hot-toast';

const Unsubscribe = () => {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  const handleUnsubscribe = async (emailToUnsubscribe = null) => {
    const emailValue = emailToUnsubscribe || email;
    
    if (!emailValue || !emailValue.trim()) {
      toast.error('Please enter your email address');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailValue)) {
      toast.error('Please enter a valid email address');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await newsletterAPI.unsubscribe(emailValue);
      setSuccess(true);
      toast.success('Successfully unsubscribed from newsletter');
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to unsubscribe';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Get email from URL query parameter
    const emailParam = searchParams.get('email');
    if (emailParam) {
      setEmail(emailParam);
      // Auto-unsubscribe if email is provided in URL
      handleUnsubscribe(emailParam);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleSubmit = (e) => {
    e.preventDefault();
    handleUnsubscribe();
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-br from-slate-50 via-indigo-50/20 to-purple-50/30">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full"
      >
        <div className="card-elevated card-elevated-hover p-8 text-center">
          {success ? (
            <>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200 }}
                className="mb-6"
              >
                <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle className="w-10 h-10 text-emerald-600" />
                </div>
              </motion.div>
              <h1 className="text-2xl font-bold text-slate-900 mb-4">
                Successfully Unsubscribed
              </h1>
              <p className="text-slate-600 mb-6">
                You have been successfully unsubscribed from our newsletter. 
                We're sorry to see you go!
              </p>
              <p className="text-sm text-slate-500 mb-6">
                If you change your mind, you can always subscribe again from our website.
              </p>
              <Link
                to="/"
                className="inline-flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:shadow-lg hover:shadow-indigo-500/25 transition-all"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Home</span>
              </Link>
            </>
          ) : error ? (
            <>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200 }}
                className="mb-6"
              >
                <div className="w-20 h-20 bg-rose-100 rounded-full flex items-center justify-center mx-auto">
                  <XCircle className="w-10 h-10 text-rose-600" />
                </div>
              </motion.div>
              <h1 className="text-2xl font-bold text-slate-900 mb-4">
                Unsubscribe Failed
              </h1>
              <p className="text-slate-600 mb-6">
                {error}
              </p>
              <button
                onClick={() => {
                  setError(null);
                  setEmail('');
                }}
                className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:shadow-lg hover:shadow-indigo-500/25 transition-all"
              >
                Try Again
              </button>
            </>
          ) : (
            <>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200 }}
                className="mb-6"
              >
                <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto">
                  <Mail className="w-10 h-10 text-indigo-600" />
                </div>
              </motion.div>
              <h1 className="text-2xl font-bold text-slate-900 mb-4">
                Unsubscribe from Newsletter
              </h1>
              <p className="text-slate-600 mb-6">
                Enter your email address to unsubscribe from our newsletter.
              </p>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address"
                    required
                    disabled={loading}
                    className="w-full px-4 py-3 glass-card rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-300/50 focus:bg-white/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
                <motion.button
                  type="submit"
                  disabled={loading || !email.trim()}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full px-6 py-3 bg-gradient-to-r from-rose-600 to-pink-600 text-white rounded-xl hover:shadow-lg hover:shadow-rose-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {loading ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Unsubscribing...</span>
                    </div>
                  ) : (
                    'Unsubscribe'
                  )}
                </motion.button>
              </form>
              
              <div className="mt-6 pt-6 border-t border-slate-200">
                <Link
                  to="/"
                  className="inline-flex items-center space-x-2 text-slate-600 hover:text-indigo-600 transition-colors text-sm"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Home</span>
                </Link>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default Unsubscribe;

