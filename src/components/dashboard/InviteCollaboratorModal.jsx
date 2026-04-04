import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Mail } from 'lucide-react';
import { collaborationsAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { getApiErrorMessage } from '../../utils/apiError.js';

const ROLE_HINTS = {
  'co-author': 'Edit content, publish/schedule with the team, polls — only the author can delete the post.',
  editor: 'Edit title and body; cannot publish, schedule, or delete.',
  reviewer: 'Read-only: review before publish — cannot edit or manage polls.',
};

/**
 * Quick invite flow for dashboard post rows (same API as post editor collaboration).
 */
const InviteCollaboratorModal = ({ isOpen, onClose, postId, postTitle }) => {
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('co-author');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleInvite = async () => {
    if (!inviteEmail.trim()) {
      toast.error('Please enter an email address');
      return;
    }
    if (!postId) {
      toast.error('Missing post');
      return;
    }
    try {
      setLoading(true);
      await collaborationsAPI.invite(postId, inviteEmail.trim(), inviteRole);
      toast.success(`Invitation sent to ${inviteEmail.trim()}`);
      setInviteEmail('');
      onClose?.();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to send invitation'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-[var(--surface-bg)] rounded-2xl border border-[var(--border-subtle)] p-6 max-w-md w-full shadow-[0_24px_60px_var(--shadow-elevated)]"
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h3 className="text-xl font-bold text-primary">Invite collaborator</h3>
            {postTitle ? (
              <p className="text-sm text-muted mt-1 line-clamp-2">{postTitle}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-[var(--surface-subtle)] rounded shrink-0"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Email</label>
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="collaborator@example.com"
              className="w-full px-4 py-2 border border-[var(--border-subtle)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent bg-[var(--surface-bg)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Role</label>
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              className="w-full px-4 py-2 border border-[var(--border-subtle)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] bg-[var(--surface-bg)] text-[var(--text-primary)]"
            >
              <option value="co-author">Co-Author</option>
              <option value="editor">Editor</option>
              <option value="reviewer">Reviewer</option>
            </select>
            <p className="text-xs text-muted mt-2 leading-relaxed">{ROLE_HINTS[inviteRole]}</p>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={handleInvite}
              disabled={loading}
              className="btn btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Mail className="w-4 h-4 mr-2" />
              {loading ? 'Sending…' : 'Send invitation'}
            </button>
            <button type="button" onClick={onClose} className="btn btn-outline">
              Cancel
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default InviteCollaboratorModal;
