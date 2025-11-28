import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, ArrowLeft, Users } from 'lucide-react';
import { collaborationsAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import Spinner from '../../components/common/Spinner';
import Seo, { DEFAULT_OG_IMAGE } from '../../components/common/Seo';

const AcceptCollaboration = () => {
  const { invitationId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('idle'); // 'idle' | 'success' | 'error'
  const [errorMessage, setErrorMessage] = useState('');
  const [postTitle, setPostTitle] = useState('');
  const hasAttemptedAccept = useRef(false);

  const seoUrl = invitationId ? `/collaboration/accept/${invitationId}` : '/collaboration/accept';
  const seoNode = (
    <Seo
      title="Accept Collaboration Invitation"
      description="Accept a collaboration invitation to work on a post together."
      url={seoUrl}
      image={DEFAULT_OG_IMAGE}
    />
  );

  const handleAcceptInvitation = useCallback(async () => {
    if (!invitationId) {
      setStatus('error');
      setErrorMessage('Invalid invitation ID');
      toast.error('Invalid invitation ID');
      return;
    }

    setLoading(true);
    setStatus('idle');

    try {
      const response = await collaborationsAPI.acceptInvitation(invitationId);
      
      // Try to get post title from response if available
      if (response.data?.post?.title) {
        setPostTitle(response.data.post.title);
      } else if (response.data?.invitation?.post?.title) {
        setPostTitle(response.data.invitation.post.title);
      }

      setStatus('success');
      toast.success('Invitation accepted! You are now a collaborator.');
      
      // Redirect to dashboard after 3 seconds
      setTimeout(() => {
        navigate('/dashboard');
      }, 3000);
    } catch (error) {
      setStatus('error');
      
      if (error.response?.status === 404) {
        const message = 'Invitation not found. It may have been deleted or already processed.';
        setErrorMessage(message);
        toast.error(message);
      } else if (error.response?.status === 401) {
        const message = 'Please log in to accept invitations.';
        setErrorMessage(message);
        toast.error(message);
        navigate(`/login?redirect=/collaboration/accept/${invitationId}`);
      } else if (error.response?.status === 403) {
        const message = 'You do not have permission to accept this invitation.';
        setErrorMessage(message);
        toast.error(message);
      } else if (error.code === 'ERR_NETWORK' || error.message?.includes('Network Error')) {
        const message = 'Network error. Please check your connection and try again.';
        setErrorMessage(message);
        toast.error(message);
      } else {
        const message = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to accept invitation';
        setErrorMessage(message);
        toast.error(message);
      }
    } finally {
      setLoading(false);
    }
  }, [invitationId, navigate]);

  useEffect(() => {
    // If user is not authenticated, redirect to login with return URL
    if (!isAuthenticated) {
      const redirectUrl = `/collaboration/accept/${invitationId}`;
      navigate(`/login?redirect=${encodeURIComponent(redirectUrl)}`, { replace: true });
      return;
    }

    // Auto-accept invitation if user is authenticated (only once)
    if (isAuthenticated && invitationId && status === 'idle' && !loading && !hasAttemptedAccept.current) {
      hasAttemptedAccept.current = true;
      handleAcceptInvitation();
    }
  }, [isAuthenticated, invitationId, status, loading, handleAcceptInvitation, navigate]);

  if (!invitationId) {
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
              <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Invalid Invitation Link</h2>
              <p className="text-secondary mb-6">
                The collaboration invitation link is invalid or missing.
              </p>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Link
                  to="/dashboard"
                  className="inline-flex items-center text-[var(--accent)] hover:text-[var(--accent-hover)] font-medium transition-colors"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Go to Dashboard
                </Link>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </>
    );
  }

  if (status === 'success') {
    return (
      <>
        {seoNode}
        <div className="min-h-screen auth-shell flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="max-w-md w-full space-y-8"
          >
            <div className="surface-card p-8 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                className="w-20 h-20 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-6"
              >
                <CheckCircle2 className="w-12 h-12 text-green-600 dark:text-green-400" />
              </motion.div>
              <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Invitation Accepted!</h2>
              <p className="text-secondary mb-4">
                You have successfully accepted the collaboration invitation.
              </p>
              {postTitle && (
                <p className="text-sm text-[var(--accent)] font-medium mb-6">
                  Post: {postTitle}
                </p>
              )}
              <p className="text-sm text-muted mb-6">
                Redirecting to your dashboard...
              </p>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Link
                  to="/dashboard"
                  className="inline-flex items-center text-[var(--accent)] hover:text-[var(--accent-hover)] font-medium transition-colors"
                >
                  Go to Dashboard Now
                  <ArrowLeft className="w-4 h-4 ml-2 rotate-180" />
                </Link>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </>
    );
  }

  if (status === 'error') {
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
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                className="w-20 h-20 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-6"
              >
                <XCircle className="w-12 h-12 text-red-600 dark:text-red-400" />
              </motion.div>
              <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Unable to Accept Invitation</h2>
              <p className="text-secondary mb-6">
                {errorMessage || 'An error occurred while accepting the invitation.'}
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <motion.button
                  onClick={handleAcceptInvitation}
                  disabled={loading}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? <Spinner size="sm" tone="light" /> : 'Try Again'}
                </motion.button>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Link
                    to="/dashboard"
                    className="inline-flex items-center justify-center px-4 py-2 border border-[var(--border)] rounded-lg text-[var(--text-primary)] hover:bg-[var(--surface-bg)] transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Go to Dashboard
                  </Link>
                </motion.div>
              </div>
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
          <div className="surface-card p-8 text-center">
            <div className="flex justify-center mb-6">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                className="w-16 h-16 rounded-xl flex items-center justify-center shadow-lg shadow-[rgba(26,137,23,0.25)] bg-[var(--accent)] text-white"
              >
                <Users className="w-8 h-8" />
              </motion.div>
            </div>
            <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
              Accepting Invitation...
            </h2>
            <p className="text-secondary mb-6">
              Please wait while we process your collaboration invitation.
            </p>
            <div className="flex justify-center">
              <Spinner size="xl" />
            </div>
          </div>
        </motion.div>
      </div>
    </>
  );
};

export default AcceptCollaboration;

