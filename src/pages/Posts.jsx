import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { postsAPI } from '../services/api';
import toast from 'react-hot-toast';
import ModernPostCard from '../components/posts/ModernPostCard';
import Spinner from '../components/common/Spinner';
import Seo, { DEFAULT_OG_IMAGE } from '../components/common/Seo';

const DEFAULT_POSTS_DESCRIPTION = 'Browse the latest stories and reporting from the Nexus community.';

const Posts = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalPosts: 0,
    limit: 12,
  });

  const currentPage = parseInt(searchParams.get('page')) || 1;
  const category = searchParams.get('category');
  const tag = searchParams.get('tag');
  const queryString = searchParams.toString();

  const filterDescriptions = [
    category ? `category “${category}”` : null,
    tag ? `tag “${tag}”` : null,
  ].filter(Boolean);

  const seoDescription = filterDescriptions.length
    ? `${DEFAULT_POSTS_DESCRIPTION} Currently filtered by ${filterDescriptions.join(' and ')}.`
    : DEFAULT_POSTS_DESCRIPTION;

  const seoUrl = queryString ? `/posts?${queryString}` : '/posts';

  useEffect(() => {
    fetchPosts();
  }, [currentPage, category, tag]);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        limit: pagination.limit,
        status: 'published',
      };

      if (category) params.category = category;
      if (tag) params.tag = tag;

      // COMMENTED OUT FOR TESTING
      /*
      const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
      const makeRequestWithRetry = async (retries = 2) => {
        for (let i = 0; i <= retries; i++) {
          try {
            return await postsAPI.getAll(params);
          } catch (err) {
            if (err.response?.status === 429 && i < retries) {
              const waitTime = (i + 1) * 1000;
              await delay(waitTime);
              continue;
            }
            throw err;
          }
        }
      };

      const response = await makeRequestWithRetry();
      */
      const response = await postsAPI.getAll(params);
      const rawPosts = response.data.posts || [];
      
      // Client-side filter to ensure all published posts are shown
      // Since we're requesting status='published' from backend, trust it and only filter out explicitly non-published posts
      const isPublishedPost = (post) => {
        if (!post) return false;
        
        // Only filter out if explicitly marked as draft or non-published
        const status = (post?.status || post?.state || '').toString().toLowerCase().trim();
        
        // Explicitly non-published statuses - filter these out
        if (status && ['draft', 'scheduled', 'archived', 'unpublished', 'pending'].includes(status)) {
          return false;
        }
        
        // Explicitly draft flags - filter these out
        if (post?.isDraft === true) {
          return false;
        }
        
        // Explicitly non-published flags - filter these out
        if (post?.isPublished === false || post?.published === false) {
          return false;
        }
        
        // If scheduled but not yet published, filter out
        if (post?.scheduledAt && post?.publishedAt) {
          const scheduledDate = new Date(post.scheduledAt);
          const publishedDate = new Date(post.publishedAt);
          if (!isNaN(scheduledDate.getTime()) && scheduledDate > new Date() && scheduledDate > publishedDate) {
            return false;
          }
        }
        
        // Otherwise, trust the backend since we requested status='published'
        // This ensures we don't filter out valid published posts with status variations
        return true;
      };
      
      const filteredPosts = rawPosts.filter(isPublishedPost);
      
      // Debug logging in development
      if (import.meta.env.DEV && rawPosts.length !== filteredPosts.length) {
        console.log(`[Posts] Filtered ${rawPosts.length} posts to ${filteredPosts.length} published posts`);
        const filteredOut = rawPosts.filter(p => !isPublishedPost(p));
        if (filteredOut.length > 0) {
          console.log('[Posts] Filtered out posts:', filteredOut.map(p => ({
            id: p._id || p.id,
            title: p.title,
            status: p.status,
            isPublished: p.isPublished,
            published: p.published,
            isDraft: p.isDraft
          })));
        }
      }
      
      setPosts(filteredPosts);
      setPagination({
        currentPage: response.data.currentPage || currentPage,
        totalPages: response.data.totalPages || 1,
        totalPosts: response.data.totalPosts || filteredPosts.length,
        limit: response.data.limit || 12,
      });
    } catch (error) {
      console.error('Error fetching posts:', error);
      // if (error.response?.status === 429) { // COMMENTED OUT FOR TESTING
      //   toast.error('Too many requests. Please try again in a moment.');
      // } else {
        toast.error('Failed to load posts');
      // }
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('page', newPage.toString());
    setSearchParams(newParams);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-page">
        <Spinner size="2xl" />
      </div>
    );
  }

  return (
    <>
      <Seo
        title="All Articles"
        description={seoDescription}
        url={seoUrl}
        image={DEFAULT_OG_IMAGE}
      />
      <div className="bg-page min-h-screen">
      <div className="bg-content">
        <div className="layout-container max-w-6xl mx-auto section-spacing-y">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="mb-12"
        >
          <h1 className="text-4xl sm:text-5xl font-bold text-primary mb-4 tracking-tight">
            All Articles
          </h1>
          <p className="text-sm sm:text-base text-muted">
            {pagination.totalPosts} {pagination.totalPosts === 1 ? 'article' : 'articles'}
            {category ? ` · Category: ${category}` : ''}
            {tag ? ` · Tag: ${tag}` : ''}
          </p>
        </motion.div>

        {/* Posts List */}
        {posts.length > 0 ? (
          <div className="space-y-10">
            {posts.map((post, index) => (
              <ModernPostCard key={post._id || post.id || index} post={post} delay={index * 0.05} />
            ))}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16 border border-dashed border-[var(--border-subtle)] rounded-2xl bg-surface-subtle"
          >
            <p className="text-muted text-lg mb-4">No posts available at the moment.</p>
            <Link
              to="/"
              className="inline-flex items-center px-4 py-2 border border-[var(--border-subtle)] text-secondary rounded-full hover:bg-surface-subtle transition-colors"
            >
              Return to home
            </Link>
          </motion.div>
        )}

        {/* Pagination */}
        {posts.length > 0 && pagination.totalPages > 1 && (
          <motion.div
            className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-0 sm:space-x-2"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
          <motion.button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              whileHover={{ scale: currentPage === 1 ? 1 : 1.04 }}
              whileTap={{ scale: currentPage === 1 ? 1 : 0.96 }}
              className="btn btn-outline !w-auto disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              <span>Previous</span>
            </motion.button>

            <div className="flex items-center space-x-1 overflow-x-auto max-w-full">
              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((page) => {
                if (
                  page === 1 ||
                  page === pagination.totalPages ||
                  (page >= currentPage - 1 && page <= currentPage + 1)
                ) {
                  const isActive = page === currentPage;
                  return (
                    <motion.button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      whileHover={{ scale: isActive ? 1 : 1.08 }}
                      whileTap={{ scale: isActive ? 1 : 0.94 }}
                      className={`btn !w-auto ${
                        isActive
                          ? 'btn-primary'
                          : 'btn-outline'
                      }`}
                    >
                      {page}
                    </motion.button>
                  );
                }

                if (page === currentPage - 2 || page === currentPage + 2) {
                  return (
                    <span key={page} className="px-2 text-[var(--text-muted)]">
                      …
                    </span>
                  );
                }

                return null;
              })}
            </div>

          <motion.button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === pagination.totalPages}
              whileHover={{ scale: currentPage === pagination.totalPages ? 1 : 1.04 }}
              whileTap={{ scale: currentPage === pagination.totalPages ? 1 : 0.96 }}
              className="btn btn-outline !w-auto disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span>Next</span>
              <ArrowRight className="w-4 h-4 ml-2" />
            </motion.button>
          </motion.div>
        )}
        </div>
      </div>
      </div>
    </>
  );
};


export default Posts;

