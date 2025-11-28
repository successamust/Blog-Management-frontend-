import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { 
  MessageCircle, 
  Heart, 
  Edit, 
  Trash2, 
  Reply, 
  Check, 
  X, 
  User,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const CommentThread = ({ 
  comment, 
  onEdit, 
  onDelete, 
  onLike, 
  onReply,
  level = 0,
  maxLevel = 3
}) => {
  const { user, isAdmin } = useAuth();
  const [isReplying, setIsReplying] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(comment.content);
  const [showReplies, setShowReplies] = useState(true);
  const [submittingReply, setSubmittingReply] = useState(false);

  const canEdit = user?._id === comment.author?._id || isAdmin();
  const isLiked = comment.likes?.includes(user?._id);
  const hasReplies = comment.replies && comment.replies.length > 0;

  const handleReplySubmit = async (e) => {
    e.preventDefault();
    if (!replyText.trim()) return;

    setSubmittingReply(true);
    try {
      await onReply(comment._id, replyText);
      setReplyText('');
      setIsReplying(false);
      toast.success('Reply posted');
    } catch (error) {
      toast.error('Failed to post reply');
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleEditSubmit = async () => {
    if (!editText.trim()) return;
    try {
      await onEdit(comment._id, editText);
      setIsEditing(false);
      toast.success('Comment updated');
    } catch (error) {
      toast.error('Failed to update comment');
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this comment?')) {
      try {
        await onDelete(comment._id);
        toast.success('Comment deleted');
      } catch (error) {
        toast.error('Failed to delete comment');
      }
    }
  };

  return (
    <div className={`${level > 0 ? 'ml-8 mt-4 border-l-2 border-[var(--border-subtle)] pl-4' : ''}`}>
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="bg-surface-subtle rounded-xl p-4 mb-4"
      >
        {/* Comment Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[var(--accent)]/15 text-[var(--accent)] rounded-full flex items-center justify-center text-sm font-semibold">
              {comment.author?.username?.charAt(0).toUpperCase() || <User className="w-5 h-5" />}
            </div>
            <div>
              <div className="font-medium text-primary">
                {comment.author?.username || 'Anonymous'}
              </div>
              <div className="text-xs text-muted">
                {format(new Date(comment.createdAt), 'MMM d, yyyy • h:mm a')}
                {comment.updatedAt && comment.updatedAt !== comment.createdAt && (
                  <span className="ml-2">(edited)</span>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <button
                  onClick={handleEditSubmit}
                  className="p-1 text-emerald-600 hover:text-emerald-700 transition-colors"
                  aria-label="Save edit"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditText(comment.content);
                  }}
                  className="p-1 text-secondary hover:text-primary transition-colors"
                  aria-label="Cancel edit"
                >
                  <X className="w-4 h-4" />
                </button>
              </>
            ) : (
              <>
                {canEdit && (
                  <>
                    <button
                      onClick={() => setIsEditing(true)}
                      className="p-1 text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors"
                      aria-label="Edit comment"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleDelete}
                      className="p-1 text-rose-600 hover:text-rose-700 transition-colors"
                      aria-label="Delete comment"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
                <button
                  onClick={() => onLike(comment._id)}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-colors ${
                    isLiked
                      ? 'text-rose-500 bg-rose-50 dark:bg-rose-900/20'
                      : 'text-[var(--text-muted)] hover:text-rose-500 hover:bg-[var(--surface-subtle)]'
                  }`}
                  aria-label={isLiked ? 'Unlike comment' : 'Like comment'}
                >
                  <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
                  <span className="text-sm">{comment.likes?.length || 0}</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Comment Content */}
        {isEditing ? (
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            className="w-full px-3 py-2 border border-[var(--border-subtle)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent resize-none"
            rows="3"
            autoFocus
          />
        ) : (
          <div className="text-secondary whitespace-pre-wrap mb-3">
            {comment.content}
          </div>
        )}

        {/* Reply Button */}
        {!isEditing && level < maxLevel && (
          <button
            onClick={() => setIsReplying(!isReplying)}
            className="flex items-center gap-1 text-sm text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors"
          >
            <Reply className="w-4 h-4" />
            <span>Reply</span>
          </button>
        )}

        {/* Reply Form */}
        {isReplying && (
          <form onSubmit={handleReplySubmit} className="mt-3">
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Write a reply..."
              rows="3"
              className="w-full px-3 py-2 glass-card rounded-xl focus:ring-2 focus:ring-[var(--accent)]/50 focus:border-[var(--accent)]/35 focus:bg-[var(--surface-bg)]/90 resize-none transition-all mb-2"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={!replyText.trim() || submittingReply}
                className="btn btn-primary text-sm disabled:opacity-50"
              >
                {submittingReply ? 'Posting...' : 'Post Reply'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsReplying(false);
                  setReplyText('');
                }}
                className="btn btn-outline text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Replies Toggle */}
        {hasReplies && (
          <button
            onClick={() => setShowReplies(!showReplies)}
            className="flex items-center gap-1 mt-3 text-sm text-muted hover:text-[var(--accent)] transition-colors"
          >
            {showReplies ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
            <span>{comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}</span>
          </button>
        )}
      </motion.div>

      {/* Nested Replies */}
      {hasReplies && showReplies && (
        <div className="space-y-2">
          {comment.replies.map((reply) => (
            <CommentThread
              key={reply._id}
              comment={reply}
              onEdit={onEdit}
              onDelete={onDelete}
              onLike={onLike}
              onReply={onReply}
              level={level + 1}
              maxLevel={maxLevel}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default CommentThread;

