import React, { useState, useEffect } from 'react';
import { MessageSquare, Send } from 'lucide-react';
import { collaborationsAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { getApiErrorMessage } from '../../utils/apiError.js';

const REC_LABELS = {
  none: 'Feedback only',
  ready: 'Looks good to publish (suggestion, non-binding)',
  revision: 'Needs changes before publish (suggestion, non-binding)',
};

/**
 * Reviewers: send notes + soft recommendation to the author.
 * Author / co-authors / editors: read the thread (does not auto-publish or unpublish).
 */
const ReviewerFeedbackPanel = ({ postId, mode, onSent }) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [body, setBody] = useState('');
  const [recommendation, setRecommendation] = useState('none');
  const [sending, setSending] = useState(false);

  const load = async () => {
    if (!postId) return;
    try {
      setLoading(true);
      const res = await collaborationsAPI.getReviewMessages(postId);
      setMessages(res.data?.messages || []);
    } catch (e) {
      if (e.response?.status !== 403) {
        toast.error(getApiErrorMessage(e, 'Could not load review notes'));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (mode === 'reviewer' || mode === 'viewer') {
      load();
    }
  }, [postId, mode]);

  const send = async () => {
    if (!body.trim()) {
      toast.error('Write a message for the author');
      return;
    }
    try {
      setSending(true);
      await collaborationsAPI.postReviewMessage(postId, {
        message: body.trim(),
        recommendation,
      });
      toast.success('Sent to the author');
      setBody('');
      setRecommendation('none');
      await load();
      onSent?.();
    } catch (e) {
      toast.error(getApiErrorMessage(e, 'Failed to send'));
    } finally {
      setSending(false);
    }
  };

  if (mode === 'reviewer') {
    return (
      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-subtle)] p-4 sm:p-5 space-y-4">
        <div className="flex items-start gap-2">
          <MessageSquare className="w-5 h-5 text-[var(--accent)] shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-[var(--text-primary)]">Message the author</h3>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              You have read-only access to this draft. Use this to share feedback; it does not publish or
              unpublish the post.
            </p>
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-[var(--text-secondary)] mb-2">Recommendation (optional)</label>
          <select
            value={recommendation}
            onChange={(e) => setRecommendation(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-bg)] text-[var(--text-primary)] text-sm"
          >
            <option value="none">{REC_LABELS.none}</option>
            <option value="ready">{REC_LABELS.ready}</option>
            <option value="revision">{REC_LABELS.revision}</option>
          </select>
          <p className="text-xs text-[var(--text-muted)] mt-2">
            This is a signal for the author only. We intentionally do not use hard “approve / reject” buttons
            that change publication state—those belong to the author or co-authors who can publish.
          </p>
        </div>
        <div>
          <label className="block text-xs font-medium text-[var(--text-secondary)] mb-2">Message</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={5}
            placeholder="Your feedback for the author…"
            className="w-full px-3 py-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-bg)] text-[var(--text-primary)] text-sm"
          />
        </div>
        <button
          type="button"
          onClick={send}
          disabled={sending}
          className="btn btn-primary text-sm inline-flex items-center gap-2 disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
          {sending ? 'Sending…' : 'Send to author'}
        </button>
        {messages.length > 0 && (
          <div className="pt-4 border-t border-[var(--border-subtle)]">
            <p className="text-xs font-medium text-[var(--text-secondary)] mb-2">Your previous notes</p>
            <ul className="space-y-2 max-h-40 overflow-y-auto">
              {messages.map((m) => (
                <li key={m._id} className="text-xs text-[var(--text-secondary)] bg-[var(--surface-bg)] rounded-lg p-2">
                  <span className="text-[var(--text-muted)]">{new Date(m.createdAt).toLocaleString()}</span>
                  {m.recommendation && m.recommendation !== 'none' && (
                    <span className="ml-2 text-[var(--accent)]">· {REC_LABELS[m.recommendation] || m.recommendation}</span>
                  )}
                  <p className="text-[var(--text-primary)] mt-1 whitespace-pre-wrap">{m.body}</p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  if (mode === 'viewer') {
    return (
      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-subtle)] p-4 sm:p-5">
        <h3 className="font-semibold text-[var(--text-primary)] flex items-center gap-2 mb-3">
          <MessageSquare className="w-5 h-5 text-[var(--accent)]" />
          Reviewer feedback
        </h3>
        {loading ? (
          <p className="text-sm text-[var(--text-secondary)]">Loading…</p>
        ) : messages.length === 0 ? (
          <p className="text-sm text-[var(--text-secondary)]">No review notes yet.</p>
        ) : (
          <ul className="space-y-3">
            {messages.map((m) => (
              <li key={m._id} className="rounded-lg bg-[var(--surface-bg)] border border-[var(--border-subtle)] p-3">
                <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-muted)]">
                  <span>{m.fromUser?.username || 'Reviewer'}</span>
                  <span>·</span>
                  <span>{new Date(m.createdAt).toLocaleString()}</span>
                  {m.recommendation && m.recommendation !== 'none' && (
                    <span className="text-[var(--accent)]">· {REC_LABELS[m.recommendation]}</span>
                  )}
                </div>
                <p className="text-sm text-[var(--text-primary)] mt-2 whitespace-pre-wrap">{m.body}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  return null;
};

export default ReviewerFeedbackPanel;
