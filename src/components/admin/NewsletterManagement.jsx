import React, { useState, useEffect } from 'react';
import { Mail, Send, Users, TrendingUp, FileText } from 'lucide-react';
import { adminAPI, newsletterAPI } from '../../services/api';
import toast from 'react-hot-toast';

const NewsletterManagement = () => {
  const [stats, setStats] = useState(null);
  const [subscribers, setSubscribers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSendForm, setShowSendForm] = useState(false);
  const [sendFormData, setSendFormData] = useState({
    subject: '',
    content: '',
  });

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statsRes, subscribersRes] = await Promise.all([
        adminAPI.getNewsletterStats(),
        adminAPI.getNewsletterSubscribers(),
      ]);
      setStats(statsRes.data || {});
      setSubscribers(subscribersRes.data?.subscribers || []);
    } catch (error) {
      console.error('Error fetching newsletter data:', error);
      toast.error('Failed to load newsletter data');
    } finally {
      setLoading(false);
    }
  };

  const handleSendNewsletter = async (e) => {
    e.preventDefault();
    try {
      await adminAPI.sendNewsletter(sendFormData);
      toast.success('Newsletter sent successfully');
      setSendFormData({ subject: '', content: '' });
      setShowSendForm(false);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send newsletter');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Subscribers</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalSubscribers || 0}</p>
              </div>
              <Users className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Newsletters Sent</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalNewslettersSent || 0}</p>
              </div>
              <Send className="w-8 h-8 text-green-600" />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Open Rate</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {stats.openRate ? `${stats.openRate}%` : 'N/A'}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-600" />
            </div>
          </div>
        </div>
      )}

      {/* Send Newsletter */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Send Newsletter</h2>
          <button
            onClick={() => setShowSendForm(!showSendForm)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Send className="w-4 h-4" />
            <span>{showSendForm ? 'Cancel' : 'New Newsletter'}</span>
          </button>
        </div>

        {showSendForm && (
          <form onSubmit={handleSendNewsletter} className="space-y-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
              <input
                type="text"
                value={sendFormData.subject}
                onChange={(e) => setSendFormData({ ...sendFormData, subject: e.target.value })}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Content</label>
              <textarea
                value={sendFormData.content}
                onChange={(e) => setSendFormData({ ...sendFormData, content: e.target.value })}
                required
                rows="10"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Send Newsletter
            </button>
          </form>
        )}
      </div>

      {/* Subscribers List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Subscribers</h2>
        </div>
        <div className="overflow-x-auto">
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
                <tr key={subscriber._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{subscriber.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {new Date(subscriber.subscribedAt).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                      Active
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {subscribers.length === 0 && (
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

