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

  // Helper function to retry API calls with exponential backoff for 429 errors
  const retryWithBackoff = async (apiCall, maxRetries = 3, baseDelay = 1000) => {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await apiCall();
      } catch (error) {
        if (error.response?.status === 429 && attempt < maxRetries) {
          const delay = baseDelay * Math.pow(2, attempt);
          console.log(`Rate limited (429), retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        throw error;
      }
    }
  };

  const fetchAllInvitations = async () => {
    try {
      setLoading(true);
      
      // Make ONE call to get all invitations, then separate into sent/received
      let allInvitations = [];
      try {
        const response = await retryWithBackoff(() => collaborationsAPI.getMyInvitations());
        if (response.data?.invitations) {
          allInvitations = response.data.invitations;
        }
      } catch (error) {
        if (error.response?.status === 429) {
          toast.error('Too many requests. Please wait a moment and refresh.');
        } else {
          console.error('Failed to fetch invitations:', error);
        }
        return;
      }

      // Separate received invitations (where user's email matches invitation email)
      const userEmail = user?.email;
      const received = allInvitations.filter(inv => inv.email === userEmail);
      setReceivedInvitations(received);

      // For sent invitations, we need to check which posts the user owns
      // Only fetch posts if we have invitations that might be sent
      if (allInvitations.length > 0) {
        try {
          // Add a small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 500));
          
          const postsResponse = await retryWithBackoff(() => 
            postsAPI.getAll({ limit: 1000, includeDrafts: true, status: 'all' })
          );
          const posts = postsResponse.data?.posts || postsResponse.data?.data || [];
          
          // Create a map of post IDs to post details
          const postsMap = new Map();
          posts.forEach(post => {
            const postId = post._id || post.id;
            if (postId) {
              postsMap.set(String(postId), {
                title: post.title,
                slug: post.slug,
                id: postId,
                authorId: post.author?._id || post.author || post.authorId
              });
            }
          });

          // Find posts owned by the user
          const userId = String(user?._id || user?.id || '');
          const userPostIds = new Set();
          postsMap.forEach((postInfo, postId) => {
            if (String(postInfo.authorId) === userId) {
              userPostIds.add(postId);
            }
          });

          // Filter sent invitations:
          // 1. Invitation is for a post owned by the user
          // 2. Invitation email is NOT the user's email (not a self-invite)
          // 3. OR user is explicitly marked as sender
          const sent = allInvitations.filter(inv => {
            const invPostId = String(inv.post?._id || inv.post || '');
            const isUserPost = userPostIds.has(invPostId);
            const isNotSelfInvite = inv.email !== userEmail;
            
            // Check if user is explicitly marked as sender
            const isExplicitSender = 
              String(inv.sender?._id || inv.sender || '') === userId ||
              String(inv.invitedBy?._id || inv.invitedBy || '') === userId ||
              String(inv.createdBy?._id || inv.createdBy || '') === userId;
            
            return (isUserPost && isNotSelfInvite) || isExplicitSender;
          });

          // Add post details to sent invitations
          const sentWithPostDetails = sent.map(inv => {
            const postId = String(inv.post?._id || inv.post || '');
            const postInfo = postsMap.get(postId);
            return {
              ...inv,
              postTitle: postInfo?.title || 'Unknown Post',
              postSlug: postInfo?.slug,
              postId: postId
            };
          });

          setSentInvitations(sentWithPostDetails);
        } catch (error) {
          if (error.response?.status === 429) {
            toast.error('Too many requests. Please wait a moment and refresh.');
          } else {
            console.error('Failed to fetch posts for invitation details:', error);
            // Still set sent invitations without post details
            const userId = String(user?._id || user?.id || '');
            const userEmail = user?.email;
            const sent = allInvitations.filter(inv => {
              const isNotSelfInvite = inv.email !== userEmail;
              const isExplicitSender = 
                String(inv.sender?._id || inv.sender || '') === userId ||
                String(inv.invitedBy?._id || inv.invitedBy || '') === userId ||
                String(inv.createdBy?._id || inv.createdBy || '') === userId;
              return isNotSelfInvite && isExplicitSender;
            });
            setSentInvitations(sent);
          }
        }
      }
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
      const response = await collaborationsAPI.acceptInvitation(invitationId);
      
      if (response?.data?.redirect) {
        console.warn('API returned redirect URL, but we will not navigate:', response.data.redirect);
      }
      
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
      const response = await collaborationsAPI.rejectInvitation(invitationId);
      
      if (response?.data?.redirect) {
        console.warn('API returned redirect URL, but we will not navigate:', response.data.redirect);
      }
      
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
      const response = await collaborationsAPI.revokeInvitation(invitationId);
      
      if (response?.data?.redirect) {
        console.warn('API returned redirect URL, but we will not navigate:', response.data.redirect);
      }
      
      toast.success('Invitation revoked');
      await fetchAllInvitations();
    } catch (error) {
      console.error('Error revoking invitation:', error);
      
      if (error.response?.status === 404) {
        toast.error('Invitation not found. It may have been deleted or already processed.');
      } else if (error.response?.status === 401) {
        toast.error('Please log in to revoke invitations.');
      } else if (error.response?.status === 403) {
        toast.error('You do not have permission to revoke this invitation.');
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

  // Show tab if user has any invitations or is admin/author
  const hasInvitations = pendingReceived.length > 0 || pendingSent.length > 0;
  const isAuthorOrAdmin = user?.role === 'author' || user?.role === 'admin';

  if (!hasInvitations && !isAuthorOrAdmin) {
    return (
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="surface-card p-8 text-center"
        >
          <Users className="w-16 h-16 mx-auto mb-4 text-muted" />
          <h3 className="text-xl font-bold text-primary mb-2">No Collaborations</h3>
          <p className="text-muted mb-6">
            You don't have any pending invitations. Invitations will appear here when you receive or send them.
          </p>
          <Link
            to="/admin/posts"
            className="btn btn-primary inline-flex items-center gap-2"
          >
            <FileText className="w-4 h-4" />
            Go to Posts
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Received Invitations */}
      {pendingReceived.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="surface-card p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-primary flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Received Invitations
            </h2>
            <span className="px-3 py-1 bg-amber-100 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200 rounded-full text-sm font-medium">
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
                  className="flex items-center justify-between p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <Clock className="w-5 h-5 text-amber-600 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-primary truncate">
                        {postTitle}
                      </p>
                      <p className="text-xs text-muted">Invited as {invitation.role}</p>
                    </div>
                    {postSlug && (
                      <Link
                        to={`/admin/posts/edit/${postId}`}
                        className="text-xs text-[var(--accent)] hover:underline flex items-center gap-1 flex-shrink-0"
                      >
                        View Post
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-4">
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
      {pendingSent.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="surface-card p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-primary flex items-center gap-2">
              <Send className="w-5 h-5" />
              Sent Invitations
            </h2>
            <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 rounded-full text-sm font-medium">
              {pendingSent.length}
            </span>
          </div>
          <div className="space-y-3">
            {pendingSent.map((invitation) => {
              const invitationId = invitation._id || invitation.id;
              
              return (
                <motion.div
                  key={invitationId}
                  className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <Send className="w-5 h-5 text-blue-600 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-primary truncate">
                        {invitation.postTitle || 'Unknown Post'}
                      </p>
                      <p className="text-xs text-muted">
                        {invitation.email} • Invited as {invitation.role}
                      </p>
                    </div>
                    {invitation.postId && (
                      <Link
                        to={`/admin/posts/edit/${invitation.postId}`}
                        className="text-xs text-[var(--accent)] hover:underline flex items-center gap-1 flex-shrink-0"
                      >
                        View Post
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRevokeInvitation(invitationId)}
                    disabled={actionLoading}
                    className="p-2 bg-red-100 dark:bg-red-900/20 text-red-600 rounded hover:bg-red-200 dark:hover:bg-red-900/30 disabled:opacity-50 transition-colors ml-4"
                    title="Revoke invitation"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Empty State */}
      {pendingReceived.length === 0 && pendingSent.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="surface-card p-8 text-center"
        >
          <Users className="w-16 h-16 mx-auto mb-4 text-muted" />
          <h3 className="text-xl font-bold text-primary mb-2">No Pending Invitations</h3>
          <p className="text-muted mb-6">
            You don't have any pending invitations at the moment.
          </p>
          <Link
            to="/admin/posts"
            className="btn btn-primary inline-flex items-center gap-2"
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

