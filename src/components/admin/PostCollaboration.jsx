import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, UserPlus, X, Mail, Check, Clock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { collaborationsAPI } from '../../services/api';
import toast from 'react-hot-toast';

const PostCollaboration = ({ postId, currentAuthor, onCollaboratorsChange }) => {
  const { user } = useAuth();
  const [collaborators, setCollaborators] = useState([]);
  const [receivedInvitations, setReceivedInvitations] = useState([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('co-author');
  const [loading, setLoading] = useState(false);
  const [loadingCollaborators, setLoadingCollaborators] = useState(true);

  const isOwner = user?._id === currentAuthor?._id || user?._id === currentAuthor;

  // Fetch collaborators from backend
  useEffect(() => {
    if (postId) {
      fetchCollaborators();
      fetchReceivedInvitations();
    }
  }, [postId, isOwner]);

  const fetchCollaborators = async () => {
    if (!postId) return;
    try {
      setLoadingCollaborators(true);
      const response = await collaborationsAPI.getCollaborators(postId);
      if (response.data?.collaborators) {
        setCollaborators(response.data.collaborators);
      }
    } catch (error) {
      if (error.response?.status !== 404) {
        console.error('Failed to fetch collaborators:', error);
      }
    } finally {
      setLoadingCollaborators(false);
    }
  };

  const fetchReceivedInvitations = async () => {
    if (!postId) return;
    try {
      const response = await collaborationsAPI.getMyInvitations();
      if (response.data?.invitations) {
        // Filter invitations for this post that are received by the current user
        const postInvitations = response.data.invitations.filter(
          inv => (inv.post?._id === postId || inv.post === postId) && 
                 inv.email === user?.email
        );
        setReceivedInvitations(postInvitations);
      }
    } catch (error) {
      // User might not have any invitations
      console.error('Failed to fetch received invitations:', error);
    }
  };


  const handleInvite = async () => {
    if (!inviteEmail.trim()) {
      toast.error('Please enter an email address');
      return;
    }

    if (!postId) {
      toast.error('Post ID is required');
      return;
    }

    try {
      setLoading(true);
      const response = await collaborationsAPI.invite(postId, inviteEmail.trim(), inviteRole);
      toast.success(`Invitation sent to ${inviteEmail}`);
      setInviteEmail('');
      setShowInviteModal(false);
      // Refresh received invitations
      await fetchReceivedInvitations();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send invitation');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveCollaborator = async (userId) => {
    if (!postId) {
      toast.error('Post ID is required');
      return;
    }

    try {
      setLoading(true);
      await collaborationsAPI.removeCollaborator(postId, userId);
      toast.success('Collaborator removed');
      await fetchCollaborators();
      if (onCollaboratorsChange) {
        onCollaboratorsChange(collaborators.filter(c => c.user?._id !== userId && c.user !== userId));
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to remove collaborator');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInvitation = async (invitationId, event) => {
    // Prevent any default behavior or navigation
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    if (!invitationId) {
      toast.error('Invalid invitation ID');
      return;
    }

    try {
      setLoading(true);
      const response = await collaborationsAPI.acceptInvitation(invitationId);
      
      toast.success('Invitation accepted! You are now a collaborator.');
      await fetchCollaborators();
      await fetchReceivedInvitations();
    } catch (error) {
      // Handle different error types
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
      setLoading(false);
    }
  };

  const handleRejectInvitation = async (invitationId) => {
    if (!invitationId) {
      toast.error('Invalid invitation ID');
      return;
    }

    try {
      setLoading(true);
      await collaborationsAPI.rejectInvitation(invitationId);
      
      toast.success('Invitation rejected');
      await fetchReceivedInvitations();
    } catch (error) {
      // Handle different error types
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
      setLoading(false);
    }
  };


  // Show component if user is owner, has collaborators, or has received invitations
  if (!isOwner && collaborators.length === 0 && receivedInvitations.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-primary flex items-center gap-2">
          <Users className="w-5 h-5" />
          Collaborators
        </h3>
        {isOwner && (
          <button
            type="button"
            onClick={() => setShowInviteModal(true)}
            className="btn btn-outline text-sm"
          >
            <UserPlus className="w-4 h-4 mr-1" />
            Invite
          </button>
        )}
      </div>

      {/* Current Collaborators */}
      {collaborators.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-secondary">Active Collaborators</h4>
          {collaborators.map((collaborator, index) => {
            const collaboratorId = collaborator.user?._id || collaborator.user || collaborator._id || collaborator.id || `collab-${index}`;
            const userId = collaborator.user?._id || collaborator.user || collaboratorId;
            return (
              <motion.div
                key={collaboratorId}
                className="flex items-center justify-between p-3 bg-surface-subtle rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-[var(--accent)]/20 rounded-full flex items-center justify-center">
                    <Users className="w-4 h-4 text-[var(--accent)]" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-primary">{collaborator.email || collaborator.user?.email}</p>
                    <p className="text-xs text-muted capitalize">{collaborator.role}</p>
                  </div>
                </div>
                {isOwner && (
                  <button
                    type="button"
                    onClick={() => handleRemoveCollaborator(userId)}
                    className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded text-red-600 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Received Invitations */}
      {receivedInvitations.filter(inv => inv.status === 'pending').length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-secondary flex items-center gap-2">
            <Mail className="w-4 h-4" />
            Received Invitations
          </h4>
          {receivedInvitations
            .filter(inv => inv.status === 'pending')
            .map((invitation, index) => {
              const invitationId = invitation._id || invitation.id || `inv-${index}`;
              return (
                <motion.div
                  key={invitationId}
                  className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800"
                >
                  <div className="flex items-center gap-3">
                    <Clock className="w-4 h-4 text-amber-600" />
                    <div>
                      <p className="text-sm font-medium text-primary">Invited as {invitation.role}</p>
                      <p className="text-xs text-muted">Click to accept or reject</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleAcceptInvitation(invitationId, e);
                      }}
                      disabled={loading}
                      className="p-1.5 bg-green-100 dark:bg-green-900/20 text-green-600 rounded hover:bg-green-200 dark:hover:bg-green-900/30 disabled:opacity-50 transition-colors"
                      title="Accept invitation"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRejectInvitation(invitationId)}
                      disabled={loading}
                      className="p-1.5 bg-red-100 dark:bg-red-900/20 text-red-600 rounded hover:bg-red-200 dark:hover:bg-red-900/30 disabled:opacity-50 transition-colors"
                      title="Reject invitation"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[var(--surface-bg)] dark:bg-[var(--surface-bg)] rounded-xl p-6 max-w-md w-full"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-primary">Invite Collaborator</h3>
              <button
                type="button"
                onClick={() => setShowInviteModal(false)}
                className="p-1 hover:bg-[var(--surface-subtle)] rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="collaborator@example.com"
                  className="w-full px-4 py-2 border border-[var(--border-subtle)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent bg-[var(--surface-bg)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Role
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="w-full px-4 py-2 border border-[var(--border-subtle)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent bg-[var(--surface-bg)] text-[var(--text-primary)]"
                >
                  <option value="co-author">Co-Author</option>
                  <option value="editor">Editor</option>
                  <option value="reviewer">Reviewer</option>
                </select>
              </div>

              <div className="flex gap-2">
                <button 
                  type="button"
                  onClick={handleInvite} 
                  disabled={loading}
                  className="btn btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  {loading ? 'Sending...' : 'Send Invitation'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="btn btn-outline"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default PostCollaboration;

