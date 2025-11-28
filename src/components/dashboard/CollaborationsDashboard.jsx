import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, UserPlus, X, Mail, Check, Clock, Send, FileText, ExternalLink } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { collaborationsAPI, postsAPI } from '../../services/api';
import toast from 'react-hot-toast';
import SkeletonLoader from '../common/SkeletonLoader';

const CollaborationsDashboard = () => {
  const { user } = useAuth();
  const [receivedInvitations, setReceivedInvitations] = useState([]);
  const [sentInvitations, setSentInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchAllInvitations();
  }, []);

  const retryWithBackoff = async (apiCall) => {
    return await apiCall();
  };

  const fetchAllInvitations = async () => {
    try {
      setLoading(true);
      
      const userEmail = user?.email?.toLowerCase();
      const userId = String(user?._id || user?.id || '');
      
      let received = [];
      let sent = [];
      
      try {
        const response = await retryWithBackoff(() => 
          collaborationsAPI.getMyInvitations(true)
        );
        
        if (response.data?.invitations) {
          const allInvitations = response.data.invitations;
          
          received = allInvitations.filter(inv => {
            if (inv.type === 'received') return true;
            if (inv.type === 'sent') return false;
            return inv.email?.toLowerCase() === userEmail;
          });
          
          sent = allInvitations.filter(inv => {
            if (inv.type === 'sent') return true;
            if (inv.type === 'received') return false;
            const inviterId = String(inv.invitedBy?._id || inv.invitedBy || '');
            return inviterId === userId && inv.email?.toLowerCase() !== userEmail;
          });
        }
      } catch (error) {
        // Error handled silently, will try fallback methods
      }
      
      if (received.length === 0) {
        try {
          const receivedResponse = await retryWithBackoff(() => 
            collaborationsAPI.getMyInvitations(false)
          );
          
          if (receivedResponse.data?.invitations) {
            received = receivedResponse.data.invitations.filter(inv => 
              inv.email?.toLowerCase() === userEmail
            );
          }
        } catch (error) {
          if (error.response?.status === 429) {
            toast.error('Too many requests. Please wait a moment and refresh.');
          }
        }
      }
      
      if (sent.length === 0) {
        try {
          const sentResponse = await retryWithBackoff(() => 
            collaborationsAPI.getMySentInvitations()
          );
          
          if (sentResponse.data?.invitations) {
            sent = sentResponse.data.invitations;
          }
        } catch (error) {
          // Error handled silently
        }
      }
      
      setReceivedInvitations(received);
      
      const sentWithDetails = sent.map(inv => ({
        ...inv,
        postTitle: inv.post?.title || 'Unknown Post',
        postSlug: inv.post?.slug,
        postId: inv.post?._id || inv.post
      }));
      
      setSentInvitations(sentWithDetails);
      
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInvitation = async (invitationId, event) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    if (!invitationId) {
      toast.error('Invalid invitation ID');
      return;
    }

    try {
      setActionLoading(true);
      await collaborationsAPI.acceptInvitation(invitationId);
      
      toast.success('Invitation accepted! You are now a collaborator.');
      await fetchAllInvitations();
    } catch (error) {
      console.error('Error accepting invitation:', error);
      
      if (error.response?.status === 404) {
        toast.error('Invitation not found. It may have been deleted or already processed.');
      } else if (error.response?.status === 401) {
        toast.error('Please log in to accept invitations.');
      } else if (error.response?.status === 403) {
        toast.error('You do not have permission to accept this invitation.');
      } else if (error.code === 'ERR_NETWORK' || error.message?.includes('Network Error')) {
        toast.error('Network error. Please check your connection and try again.');
      } else {
        const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to accept invitation';
        toast.error(errorMessage);
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectInvitation = async (invitationId) => {
    if (!invitationId) {
      toast.error('Invalid invitation ID');
      return;
    }

    try {
      setActionLoading(true);
      await collaborationsAPI.rejectInvitation(invitationId);
      
      toast.success('Invitation rejected');
      await fetchAllInvitations();
    } catch (error) {
      console.error('Error rejecting invitation:', error);
      
      if (error.response?.status === 404) {
        toast.error('Invitation not found. It may have been deleted or already processed.');
      } else if (error.response?.status === 401) {
        toast.error('Please log in to reject invitations.');
      } else if (error.response?.status === 403) {
        toast.error('You do not have permission to reject this invitation.');
      } else {
        toast.error(error.response?.data?.message || error.message || 'Failed to reject invitation');
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleRevokeInvitation = async (invitationId) => {
    if (!invitationId) {
      toast.error('Invalid invitation ID');
      return;
    }

    if (!window.confirm('Are you sure you want to revoke this invitation?')) {
      return;
    }

    try {
      setActionLoading(true);
      await collaborationsAPI.revokeInvitation(invitationId);
      
      toast.success('Invitation revoked');
      await fetchAllInvitations();
    } catch (error) {
      console.error('Error revoking invitation:', error);
      
      if (error.response?.status === 404) {
        toast.error('Invitation not found. It may have been deleted or already processed.');
      } else if (error.response?.status === 400) {
        const message = error.response?.data?.message || 'Cannot revoke this invitation';
        toast.error(message);
      } else if (error.response?.status === 401) {
        toast.error('Please log in to revoke invitations.');
      } else if (error.response?.status === 403) {
        toast.error('You do not have permission to revoke this invitation.');
      } else if (error.response?.status === 500) {
        toast.error(error.response?.data?.message || 'Server error. Please try again later.');
      } else {
        toast.error(error.response?.data?.message || error.message || 'Failed to revoke invitation');
      }
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto">
        <SkeletonLoader variant="post-card" count={3} />
      </div>
    );
  }

  const pendingReceived = receivedInvitations.filter(inv => inv.status === 'pending');
  const pendingSent = sentInvitations.filter(inv => inv.status === 'pending');
  const allSent = sentInvitations;

  return (
    <div className="max-w-6xl mx-auto space-y-6 px-4 sm:px-6">
      {/* Received Invitations */}
      {pendingReceived.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="surface-card p-4 sm:p-6"
        >
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h2 className="text-lg sm:text-xl font-bold text-primary flex items-center gap-2">
              <Mail className="w-4 h-4 sm:w-5 sm:h-5" />
              Received Invitations
            </h2>
            <span className="px-2 sm:px-3 py-1 bg-amber-100 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200 rounded-full text-xs sm:text-sm font-medium">
              {pendingReceived.length}
            </span>
          </div>
          <div className="space-y-3">
            {pendingReceived.map((invitation) => {
              const invitationId = invitation._id || invitation.id;
              const postTitle = invitation.post?.title || 'Unknown Post';
              const postSlug = invitation.post?.slug;
              const postId = invitation.post?._id || invitation.post;
              
              return (
                <motion.div
                  key={invitationId}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 sm:p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800"
                >
                  <div className="flex items-start sm:items-center gap-3 sm:gap-4 flex-1 min-w-0">
                    <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 flex-shrink-0 mt-0.5 sm:mt-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-primary break-words">
                        {postTitle}
                      </p>
                      <p className="text-xs text-muted mt-1">Invited as {invitation.role}</p>
                      {postSlug && (
                        <Link
                          to={`/admin/posts/edit/${postId}`}
                          className="text-xs text-[var(--accent)] hover:underline flex items-center gap-1 mt-2 sm:hidden"
                        >
                          View Post
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      )}
                    </div>
                    {postSlug && (
                      <Link
                        to={`/admin/posts/edit/${postId}`}
                        className="text-xs text-[var(--accent)] hover:underline flex items-center gap-1 flex-shrink-0 hidden sm:flex"
                      >
                        View Post
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    )}
                  </div>
                  <div className="flex items-center gap-2 sm:ml-4 justify-end sm:justify-start">
                    <button
                      type="button"
                      onClick={(e) => handleAcceptInvitation(invitationId, e)}
                      disabled={actionLoading}
                      className="p-2 bg-green-100 dark:bg-green-900/20 text-green-600 rounded hover:bg-green-200 dark:hover:bg-green-900/30 disabled:opacity-50 transition-colors"
                      title="Accept invitation"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRejectInvitation(invitationId)}
                      disabled={actionLoading}
                      className="p-2 bg-red-100 dark:bg-red-900/20 text-red-600 rounded hover:bg-red-200 dark:hover:bg-red-900/30 disabled:opacity-50 transition-colors"
                      title="Reject invitation"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Sent Invitations */}
      {(pendingSent.length > 0 || allSent.length > 0) && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="surface-card p-4 sm:p-6"
        >
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h2 className="text-lg sm:text-xl font-bold text-primary flex items-center gap-2">
              <Send className="w-4 h-4 sm:w-5 sm:h-5" />
              Sent Invitations
            </h2>
            <span className="px-2 sm:px-3 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 rounded-full text-xs sm:text-sm font-medium">
              {pendingSent.length} {allSent.length > pendingSent.length ? `(${allSent.length} total)` : ''}
            </span>
          </div>
          {pendingSent.length > 0 ? (
            <div className="space-y-3">
              {pendingSent.map((invitation) => {
              const invitationId = invitation._id || invitation.id;
              const postTitle = invitation.postTitle || invitation.post?.title || 'Unknown Post';
              const postSlug = invitation.postSlug || invitation.post?.slug;
              const postId = invitation.postId || invitation.post?._id || invitation.post;
              
              return (
                <motion.div
                  key={invitationId}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 sm:p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800"
                >
                  <div className="flex items-start sm:items-center gap-3 sm:gap-4 flex-1 min-w-0">
                    <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0 mt-0.5 sm:mt-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-primary break-words">
                        {postTitle}
                      </p>
                      <p className="text-xs text-muted mt-1 break-words">
                        {invitation.email} • Invited as {invitation.role}
                      </p>
                      {postId && (
                        <Link
                          to={`/admin/posts/edit/${postId}`}
                          className="text-xs text-[var(--accent)] hover:underline flex items-center gap-1 mt-2 sm:hidden"
                        >
                          View Post
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      )}
                    </div>
                    {postId && (
                      <Link
                        to={`/admin/posts/edit/${postId}`}
                        className="text-xs text-[var(--accent)] hover:underline flex items-center gap-1 flex-shrink-0 hidden sm:flex"
                      >
                        View Post
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    )}
                  </div>
                  <div className="flex items-center gap-2 sm:ml-4 justify-end sm:justify-start">
                    <button
                      type="button"
                      onClick={() => handleRevokeInvitation(invitationId)}
                      disabled={actionLoading}
                      className="p-2 bg-red-100 dark:bg-red-900/20 text-red-600 rounded hover:bg-red-200 dark:hover:bg-red-900/30 disabled:opacity-50 transition-colors"
                      title="Revoke invitation"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
          ) : (
            <div className="text-center py-4 text-muted text-sm px-4">
              No pending sent invitations. All sent invitations have been accepted, rejected, or revoked.
            </div>
          )}
        </motion.div>
      )}

      {/* Empty State */}
      {pendingReceived.length === 0 && pendingSent.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="surface-card p-6 sm:p-8 text-center"
        >
          <Users className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 text-muted" />
          <h3 className="text-lg sm:text-xl font-bold text-primary mb-2">No Pending Invitations</h3>
          <p className="text-sm sm:text-base text-muted mb-6 px-4">
            You don't have any pending invitations at the moment.
          </p>
          <Link
            to="/admin/posts"
            className="btn btn-primary inline-flex items-center gap-2 text-sm sm:text-base"
          >
            <FileText className="w-4 h-4" />
            Manage Posts
          </Link>
        </motion.div>
      )}
    </div>
  );
};

export default CollaborationsDashboard;

