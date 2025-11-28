import React, { useMemo, useState } from 'react';
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
  ChevronRight,
  Flag,
  BadgeCheck
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const CommentThread = ({ 
  comment, 
  onEdit, 
  onDelete, 
  onLike, 
  onReply,
  onReport,
  reportedCommentIds,
  postAuthorId,
  level = 0,
  maxLevel = 3
}) => {
  const { user, isAdmin, isAuthenticated } = useAuth();
  const [isReplying, setIsReplying] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(comment.content);
  const [showReplies, setShowReplies] = useState(true);
  const [submittingReply, setSubmittingReply] = useState(false);
  const [expandedReplies, setExpandedReplies] = useState(false);
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reporting, setReporting] = useState(false);

  const normalizeId = (value) => {
    if (!value) return null;
    if (typeof value === 'string') return value;
    if (typeof value === 'object') {
      return value._id || value.id || null;
    }
    return null;
  };

  const commentAuthorId = normalizeId(comment.author);
  const canEdit = user?._id === commentAuthorId || isAdmin();
  const isLiked = comment.likes?.includes(user?._id);
  const hasReplies = comment.replies && comment.replies.length > 0;
  const isPostAuthorComment =
    postAuthorId && commentAuthorId && String(postAuthorId) === String(commentAuthorId);
  const isReported = useMemo(() => {
    if (!reportedCommentIds) return false;
    if (typeof reportedCommentIds.has === 'function') {
      return reportedCommentIds.has(comment._id);
    }
    if (Array.isArray(reportedCommentIds)) {
      return reportedCommentIds.includes(comment._id);
    }
    return Boolean(reportedCommentIds[comment._id]);
  }, [reportedCommentIds, comment._id]);
  const canReport = Boolean(onReport) && isAuthenticated;
  const profileLink = comment.author?.username
    ? `/authors/${comment.author.username}`
    : null;

  const INITIAL_REPLIES_VISIBLE = 2;
  const visibleReplies = useMemo(() => {
    if (!hasReplies) return [];
    if (expandedReplies) return comment.replies;
    return comment.replies.slice(0, INITIAL_REPLIES_VISIBLE);
  }, [comment.replies, expandedReplies, hasReplies]);

  const hiddenRepliesCount = hasReplies
    ? Math.max(0, comment.replies.length - visibleReplies.length)
    : 0;

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

  const handleReactionClick = async () => {
    await onLike(comment._id);
  };

  const handleReportSubmit = async (event) => {
    event.preventDefault();
    if (!reportReason.trim()) {
      toast.error('Please provide a short reason for the report.');
      return;
    }
    if (!onReport) return;
    setReporting(true);
    try {
      const success = await onReport(comment, reportReason.trim());
      if (success) {
        setShowReportForm(false);
        setReportReason('');
      }
    } finally {
      setReporting(false);
    }
  };

  return (
    <div
      className={`relative ${
        level > 0
          ? 'ml-8 mt-4 border-l border-dashed border-[var(--border-subtle)] pl-6'
          : ''
      }`}
    >
      {level > 0 && (
        <span className="absolute -left-[11px] top-4 h-3 w-3 rounded-full bg-[var(--surface-bg)] border border-[var(--border-subtle)]" />
      )}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="pb-6 mb-6 border-b border-[var(--border-subtle)] last:border-b-0 last:pb-0 last:mb-0"
      >
        <div className="flex items-start gap-4">
          <Link
            to={profileLink || '#'}
            className="w-11 h-11 rounded-full bg-[var(--accent)]/15 text-[var(--accent)] flex items-center justify-center text-base font-semibold shrink-0 hover:opacity-90 transition-opacity"
            aria-label={`View ${comment.author?.username || 'user'} profile`}
          >
            {comment.author?.username?.charAt(0).toUpperCase() || (
              <User className="w-5 h-5" />
            )}
          </Link>

          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--text-muted)]">
              {profileLink ? (
                <Link
                  to={profileLink}
                  className="font-semibold text-[var(--text-primary)] hover:text-[var(--accent)] transition-colors"
                >
                  {comment.author?.username}
                </Link>
              ) : (
                <span className="font-semibold text-[var(--text-primary)]">
                  {comment.author?.username || 'Anonymous'}
                </span>
              )}
              {isPostAuthorComment && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
                  <BadgeCheck className="w-3 h-3" />
                  Author
                </span>
              )}
              <span>•</span>
              <span>{format(new Date(comment.createdAt), 'MMM d, yyyy')}</span>
              <span>•</span>
              <span>{format(new Date(comment.createdAt), 'h:mm a')}</span>
              {comment.updatedAt && comment.updatedAt !== comment.createdAt && (
                <>
                  <span>•</span>
                  <span>edited</span>
                </>
              )}
              {!isEditing && canEdit && (
                <div className="flex items-center gap-1 ml-auto text-[var(--text-muted)]">
                  <button
                    onClick={() => setIsEditing(true)}
                    className="p-1 hover:text-[var(--accent)] transition-colors"
                    aria-label="Edit comment"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleDelete}
                    className="p-1 hover:text-rose-500 transition-colors"
                    aria-label="Delete comment"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            <div className="mt-3 text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">
              {isEditing ? (
                <textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--border-subtle)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent resize-none"
                  rows="3"
                  autoFocus
                />
              ) : (
                comment.content
              )}
            </div>

            {isEditing && (
              <div className="flex items-center gap-2 mt-3">
                <button
                  onClick={handleEditSubmit}
                  className="btn btn-primary btn-sm"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditText(comment.content);
                  }}
                  className="btn btn-outline btn-sm"
                >
                  Cancel
                </button>
              </div>
            )}

            {!isEditing && (
              <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-[var(--text-muted)]">
                <button
                  onClick={handleReactionClick}
                  className={`flex items-center gap-1 px-2 py-1 rounded-full border border-transparent transition-colors ${
                    isLiked
                      ? 'text-rose-400 border-rose-300/60 bg-rose-300/10'
                      : 'text-[var(--text-muted)] hover:text-rose-400 hover:border-rose-300/60'
                  }`}
                  aria-label={isLiked ? 'Unlike comment' : 'Love comment'}
                >
                  <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
                  <span>{comment.likes?.length || 0}</span>
                </button>

                {hasReplies && (
                  <>
                    <button
                      onClick={() => setShowReplies(!showReplies)}
                      className="flex items-center gap-1 hover:text-[var(--accent)] transition-colors"
                    >
                      <MessageCircle className="w-4 h-4" />
                      {comment.replies.length}{' '}
                      {comment.replies.length === 1 ? 'reply' : 'replies'}
                      {showReplies ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </button>
                  </>
                )}

                {level < maxLevel && (
                  <button
                    onClick={() => setIsReplying(!isReplying)}
                    className="flex items-center gap-1 hover:text-[var(--accent)] transition-colors"
                  >
                    <Reply className="w-4 h-4" />
                    Reply
                  </button>
                )}

                {canReport && (
                  <button
                    onClick={() => setShowReportForm((prev) => !prev)}
                    className={`flex items-center gap-1 transition-colors ${
                      isReported
                        ? 'text-amber-500 cursor-not-allowed'
                        : 'hover:text-amber-600 text-[var(--text-muted)]'
                    }`}
                    disabled={isReported}
                  >
                    <Flag className="w-4 h-4" />
                    {isReported ? 'Reported' : 'Report'}
                  </button>
                )}
              </div>
            )}

            {isReplying && (
              <form onSubmit={handleReplySubmit} className="mt-4">
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Write a reply..."
                  rows="3"
                  className="w-full px-3 py-2 glass-card rounded-xl focus:ring-2 focus:ring-[var(--accent)]/50 focus:border-[var(--accent)]/35 focus:bg-[var(--surface-bg)]/90 resize-none transition-all mb-3"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={!replyText.trim() || submittingReply}
                    className="btn btn-primary btn-sm disabled:opacity-50"
                  >
                    {submittingReply ? 'Posting...' : 'Post reply'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsReplying(false);
                      setReplyText('');
                    }}
                    className="btn btn-outline btn-sm"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {showReportForm && canReport && (
              <form onSubmit={handleReportSubmit} className="mt-4 space-y-3">
                <textarea
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  placeholder="Tell us what feels off about this comment..."
                  rows="3"
                  className="w-full px-3 py-2 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-400 focus:border-transparent resize-none bg-amber-50/60"
                  disabled={reporting}
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="btn btn-primary btn-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={reporting || !reportReason.trim()}
                  >
                    {reporting ? 'Sending...' : 'Submit report'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => {
                      setShowReportForm(false);
                      setReportReason('');
                    }}
                    disabled={reporting}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {hasReplies && hiddenRepliesCount > 0 && showReplies && !expandedReplies && (
              <button
                className="mt-3 text-xs text-[var(--accent)] hover:text-[var(--accent-hover)]"
                onClick={() => setExpandedReplies(true)}
              >
                View {hiddenRepliesCount} more repl
                {hiddenRepliesCount === 1 ? 'y' : 'ies'}
              </button>
            )}
            {hasReplies && expandedReplies && hiddenRepliesCount > 0 && (
              <button
                className="mt-3 text-xs text-[var(--accent)] hover:text-[var(--accent-hover)]"
                onClick={() => setExpandedReplies(false)}
              >
                Hide additional replies
              </button>
            )}
          </div>
        </div>
      </motion.div>

      {hasReplies && showReplies && (
        <div className="space-y-2">
          {visibleReplies.map((reply) => (
            <CommentThread
              key={reply._id}
              comment={reply}
              onEdit={onEdit}
              onDelete={onDelete}
              onLike={onLike}
              onReply={onReply}
              onReport={onReport}
              reportedCommentIds={reportedCommentIds}
              postAuthorId={postAuthorId}
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

