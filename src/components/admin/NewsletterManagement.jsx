import React, { useState, useEffect, useMemo } from 'react';
import { Mail, Send, Users, TrendingUp, FileText, Eye, Pencil } from 'lucide-react';
import { adminAPI, newsletterAPI } from '../../services/api';
import toast from 'react-hot-toast';
import RichTextEditor from './RichTextEditor';
import SkeletonLoader from '../common/SkeletonLoader';
import Spinner from '../common/Spinner';

const NewsletterManagement = () => {
  const [stats, setStats] = useState(null);
  const [subscribers, setSubscribers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSendForm, setShowSendForm] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendFormData, setSendFormData] = useState({
    subject: '',
    content: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statsRes, subscribersRes] = await Promise.all([
        adminAPI.getNewsletterStats().catch(() => null),
        adminAPI.getNewsletterSubscribers().catch(() => null),
      ]);

      const statsData = statsRes?.data || statsRes || {};
      const normalizedStats = {
        totalSubscribers:
          statsData.totalSubscribers ??
          statsData.subscriberCount ??
          statsData?.stats?.totalSubscribers ??
          0,
        totalNewslettersSent:
          statsData.totalNewslettersSent ??
          statsData.newslettersSent ??
          statsData?.stats?.totalNewslettersSent ??
          0,
        openRate:
          statsData.openRate ??
          statsData.averageOpenRate ??
          statsData?.stats?.openRate ??
          null,
        clickRate:
          statsData.clickRate ??
          statsData.averageClickRate ??
          statsData?.stats?.clickRate ??
          null,
        lastNewsletter:
          statsData.lastNewsletter ??
          statsData.mostRecentNewsletter ??
          null,
        raw: statsData,
      };

      setStats(normalizedStats);

      const subscriberData =
        subscribersRes?.data?.subscribers ||
        subscribersRes?.data ||
        subscribersRes ||
        [];

      const normalizedSubscribers = Array.isArray(subscriberData)
        ? subscriberData.map((subscriber) => ({
            _id: subscriber?._id || subscriber?.id || subscriber?.email,
            email: subscriber?.email || 'unknown@example.com',
            status: subscriber?.status || subscriber?.state || 'active',
            subscribedAt: subscriber?.subscribedAt || subscriber?.createdAt || subscriber?.updatedAt || Date.now(),
          }))
        : [];

      setSubscribers(normalizedSubscribers);
    } catch (error) {
      console.error('Error fetching newsletter data:', error);
      toast.error('Failed to load newsletter data');
    } finally {
      setLoading(false);
    }
  };

  const handleSendNewsletter = async (e) => {
    e.preventDefault();
    if (!sendFormData.subject.trim()) {
      toast.error('Please provide a subject for the newsletter');
      return;
    }

    if (!sendFormData.content || sendFormData.content.replace(/<[^>]*>/g, '').trim().length === 0) {
      toast.error('Newsletter content cannot be empty');
      return;
    }

    setSending(true);

    try {
      await adminAPI.sendNewsletter({
        subject: sendFormData.subject.trim(),
        content: sendFormData.content,
      });
      toast.success('Newsletter sent successfully');
      setSendFormData({ subject: '', content: '' });
      setShowSendForm(false);
      setPreviewMode(false);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send newsletter');
    } finally {
      setSending(false);
    }
  };

  const statsCards = useMemo(() => {
    if (!stats) return [];
    return [
      {
        title: 'Total Subscribers',
        value: stats.totalSubscribers || 0,
        icon: <Users className="w-8 h-8 text-[var(--accent)]" />,
        description: stats.lastNewsletter?.subject
          ? `Last: ${new Date(stats.lastNewsletter.sentAt || stats.lastNewsletter.date || Date.now()).toLocaleDateString()}`
          : 'Latest totals',
      },
      {
        title: 'Newsletters Sent',
        value: stats.totalNewslettersSent || 0,
        icon: <Send className="w-8 h-8 text-green-600" />,
        description: stats.lastNewsletter?.subject
          ? `Latest: ${stats.lastNewsletter.subject}`
          : 'Campaign history',
      },
      {
        title: 'Average Open Rate',
        value: stats.openRate != null ? `${stats.openRate}%` : 'N/A',
        icon: <TrendingUp className="w-8 h-8 text-purple-600" />,
        description: stats.clickRate != null ? `Click rate: ${stats.clickRate}%` : 'Click rate pending',
      },
    ];
  }, [stats]);

  if (loading) {
    return (
      <SkeletonLoader variant="list" count={5} />
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {statsCards.map((card) => (
            <div key={card.title} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{card.title}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{card.value}</p>
                  <p className="text-xs text-gray-500 mt-1 truncate" title={card.description}>
                    {card.description}
                  </p>
                </div>
                {card.icon}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Send Newsletter */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Send Newsletter</h2>
          <div className="flex items-center gap-3">
            {showSendForm && (
              <button
                type="button"
                onClick={() => setPreviewMode((prev) => !prev)}
                className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {previewMode ? <Pencil className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                <span>{previewMode ? 'Back to Editor' : 'Preview Newsletter'}</span>
              </button>
            )}
            <button
              onClick={() => {
                setShowSendForm((prev) => !prev);
                setPreviewMode(false);
              }}
              className="btn btn-primary !w-auto shadow-[0_12px_26px_rgba(26,137,23,0.2)]"
            >
              <Send className="w-4 h-4" />
              <span>{showSendForm ? 'Cancel' : 'New Newsletter'}</span>
            </button>
          </div>
        </div>

        {showSendForm && (
          <form onSubmit={handleSendNewsletter} className="space-y-6 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
              <input
                type="text"
                value={sendFormData.subject}
                onChange={(e) => setSendFormData({ ...sendFormData, subject: e.target.value })}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent bg-white"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">Content</label>
                <span className="text-xs text-gray-500">
                  {previewMode ? 'Previewing final email' : 'Use the editor to compose rich content'}
                </span>
              </div>
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                {previewMode ? (
                  <div className="prose max-w-none p-6 bg-white" dangerouslySetInnerHTML={{
                    __html: sendFormData.content || '<p class="text-gray-400">No content yet.</p>',
                  }} />
                ) : (
                  <RichTextEditor
                    value={sendFormData.content}
                    onChange={(value) => setSendFormData((prev) => ({ ...prev, content: value }))}
                    placeholder="Compose your newsletter..."
                  />
                )}
              </div>
            </div>
            <button
              type="submit"
              disabled={sending}
              className="btn btn-primary inline-flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed shadow-[0_12px_28px_rgba(26,137,23,0.2)]"
            >
              {sending ? <Spinner size="xs" tone="light" /> : <Send className="w-4 h-4" />}
              <span>{sending ? 'Sending...' : 'Send Newsletter'}</span>
            </button>
          </form>
        )}
      </div>

      {/* Subscribers List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Subscribers</h2>
        </div>
        {subscribers.length > 0 ? (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Subscribed At
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {subscribers.map((subscriber) => (
                    <tr key={subscriber._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{subscriber.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {new Date(subscriber.subscribedAt).toLocaleString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded-full capitalize ${
                            subscriber.status === 'unsubscribed'
                              ? 'bg-rose-100 text-rose-700'
                              : 'bg-green-100 text-green-700'
                          }`}
                        >
                          {subscriber.status || 'active'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="md:hidden space-y-4 p-4">
              {subscribers.map((subscriber) => (
                <div
                  key={subscriber._id}
                  className="rounded-xl border border-gray-200 p-4 flex flex-col gap-3 bg-white shadow-sm"
                >
                  <div>
                    <p className="text-base font-semibold text-gray-900 break-words">
                      {subscriber.email}
                    </p>
                    <p className="text-sm text-gray-500">
                      {new Date(subscriber.subscribedAt).toLocaleString()}
                    </p>
                  </div>
                  <span
                    className={`self-start px-2 py-1 text-xs font-semibold rounded-full capitalize ${
                      subscriber.status === 'unsubscribed'
                        ? 'bg-rose-100 text-rose-700'
                        : 'bg-green-100 text-green-700'
                    }`}
                  >
                    {subscriber.status || 'active'}
                  </span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <Mail className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No subscribers yet</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default NewsletterManagement;

