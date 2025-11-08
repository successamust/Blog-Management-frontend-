import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { postsAPI } from '../services/api';
import toast from 'react-hot-toast';
import AnimatedCard from '../components/common/AnimatedCard';
import InteractivePostCard from '../components/posts/InteractivePostCard';

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

  useEffect(() => {
    fetchPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, category, tag]);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        limit: pagination.limit,
      };

      if (category) params.category = category;
      if (tag) params.tag = tag;

      const response = await postsAPI.getAll(params);
      setPosts(response.data.posts || []);
      setPagination({
        currentPage: response.data.currentPage || currentPage,
        totalPages: response.data.totalPages || 1,
        totalPosts: response.data.totalPosts || 0,
        limit: response.data.limit || 12,
      });
    } catch (error) {
      console.error('Error fetching posts:', error);
      toast.error('Failed to load posts');
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-2">
          All <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Posts</span>
        </h1>
        <p className="text-sm sm:text-base text-slate-600">
          {pagination.totalPosts} {pagination.totalPosts === 1 ? 'post' : 'posts'} found
          {category && ` in category: ${category}`}
          {tag && ` with tag: ${tag}`}
        </p>
      </motion.div>

      {/* Posts Grid */}
      {posts.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {posts.map((post, index) => (
              <AnimatedCard key={post._id} delay={index * 0.1}>
                <InteractivePostCard post={post} featured />
              </AnimatedCard>
            ))}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <motion.div
              className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-0 sm:space-x-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <motion.button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center px-4 py-2 glass-card rounded-xl hover:bg-white/80 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm font-medium text-slate-700"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Previous</span>
                <span className="sm:hidden">Prev</span>
              </motion.button>

              <div className="flex items-center space-x-1 overflow-x-auto max-w-full">
                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((page) => {
                  if (
                    page === 1 ||
                    page === pagination.totalPages ||
                    (page >= currentPage - 1 && page <= currentPage + 1)
                  ) {
                    return (
                      <motion.button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        className={`px-4 py-2 rounded-xl transition-all text-sm font-medium ${
                          page === currentPage
                            ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/25'
                            : 'glass-card text-slate-700 hover:bg-white/80'
                        }`}
                      >
                        {page}
                      </motion.button>
                    );
                  } else if (page === currentPage - 2 || page === currentPage + 2) {
                    return <span key={page} className="px-2 text-slate-400">...</span>;
                  }
                  return null;
                })}
              </div>

              <motion.button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === pagination.totalPages}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center px-4 py-2 glass-card rounded-xl hover:bg-white/80 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm font-medium text-slate-700"
              >
                <span className="hidden sm:inline">Next</span>
                <span className="sm:hidden">Next</span>
                <ArrowRight className="w-4 h-4 ml-2" />
              </motion.button>
            </motion.div>
          )}
        </>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-16"
        >
          <p className="text-slate-500 text-lg mb-4">No posts found</p>
          <Link
            to="/"
            className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:shadow-lg hover:shadow-indigo-500/25 transition-all"
          >
            Go back to home
          </Link>
        </motion.div>
      )}
    </div>
  );
};


export default Posts;

