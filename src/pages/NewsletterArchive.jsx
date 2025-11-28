import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Mail, Calendar, Search, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { newsletterAPI } from '../services/api';
import Spinner from '../components/common/Spinner';
import Seo from '../components/common/Seo';
import EmptyState from '../components/common/EmptyState';
import toast from 'react-hot-toast';

const NewsletterArchive = () => {
  const [newsletters, setNewsletters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchNewsletters();
  }, []);

  const fetchNewsletters = async () => {
    try {
      setLoading(true);
      // Note: This assumes your backend has a newsletters endpoint
      // Adjust based on your actual API structure
      const response = await newsletterAPI.getAll?.() || { data: { newsletters: [] } };
      setNewsletters(response.data?.newsletters || response.data?.data || []);
    } catch (error) {
      console.error('Error fetching newsletters:', error);
      toast.error('Failed to load newsletter archive');
    } finally {
      setLoading(false);
    }
  };

  const filteredNewsletters = newsletters.filter(newsletter =>
    newsletter.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    newsletter.content?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <Seo
        title="Newsletter Archive"
        description="Browse past newsletters from Nexus"
        url="/newsletter/archive"
      />
      <div className="bg-page min-h-screen">
        <div className="layout-container-wide py-6 sm:py-8">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-secondary hover:text-[var(--accent)] mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-[var(--accent)]/10 rounded-xl">
                <Mail className="w-6 h-6 text-[var(--accent)]" />
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold text-primary">
                  Newsletter Archive
                </h1>
                <p className="text-secondary mt-1">
                  Browse past newsletters and updates
                </p>
              </div>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search newsletters..."
                className="w-full pl-10 pr-4 py-2 border border-[var(--border-subtle)] rounded-lg focus:ring-2 focus:ring-[var(--accent)]"
              />
            </div>
          </motion.div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Spinner size="xl" />
            </div>
          ) : filteredNewsletters.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredNewsletters.map((newsletter, index) => (
                <motion.div
                  key={newsletter._id || index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-[var(--surface-bg)] rounded-xl p-6 border border-[var(--border-subtle)] hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Mail className="w-5 h-5 text-[var(--accent)]" />
                      <h3 className="font-semibold text-primary line-clamp-2">
                        {newsletter.subject || 'Newsletter'}
                      </h3>
                    </div>
                  </div>
                  <p className="text-sm text-secondary mb-4 line-clamp-3">
                    {newsletter.content || newsletter.body || newsletter.excerpt || ''}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted">
                    <Calendar className="w-4 h-4" />
                    <span>
                      {newsletter.sentAt 
                        ? format(new Date(newsletter.sentAt), 'MMM d, yyyy')
                        : newsletter.createdAt
                        ? format(new Date(newsletter.createdAt), 'MMM d, yyyy')
                        : 'Unknown date'}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Mail}
              title="No Newsletters Found"
              description={searchQuery ? 'Try a different search term' : 'No newsletters have been sent yet.'}
            />
          )}
        </div>
      </div>
    </>
  );
};

export default NewsletterArchive;

