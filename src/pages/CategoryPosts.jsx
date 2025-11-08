import React, { useState, useEffect } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, Eye, Heart, ArrowLeft, ArrowRight, Folder } from 'lucide-react';
import { format } from 'date-fns';
import { categoriesAPI, postsAPI } from '../services/api';
import toast from 'react-hot-toast';

const CategoryPosts = () => {
  const { slug } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [category, setCategory] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalPosts: 0,
    limit: 12,
  });

  const currentPage = parseInt(searchParams.get('page')) || 1;

  useEffect(() => {
    fetchCategoryData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, currentPage]);

  const fetchCategoryData = async () => {
    try {
      setLoading(true);
      const [categoryRes, postsRes] = await Promise.all([
        categoriesAPI.getBySlug(slug),
        categoriesAPI.getPosts(slug, { page: currentPage, limit: 12 }),
      ]);

      setCategory(categoryRes.data.category);
      setPosts(postsRes.data.posts || []);
      setPagination({
        currentPage: postsRes.data.currentPage || currentPage,
        totalPages: postsRes.data.totalPages || 1,
        totalPosts: postsRes.data.totalPosts || 0,
        limit: postsRes.data.limit || 12,
      });
    } catch (error) {
      console.error('Error fetching category data:', error);
      toast.error('Failed to load category');
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

  if (!category) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Category Not Found</h1>
          <Link to="/categories" className="text-blue-600 hover:text-blue-700">
            Back to Categories
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Category Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8 card-elevated p-6"
      >
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-3 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-xl">
            <Folder className="w-6 h-6 text-indigo-600" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900">{category.name}</h1>
        </div>
        {category.description && (
          <p className="text-slate-600 mb-4 leading-relaxed">{category.description}</p>
        )}
        <p className="text-sm text-slate-500">
          {pagination.totalPosts} {pagination.totalPosts === 1 ? 'post' : 'posts'} in this category
        </p>
      </motion.div>

      {/* Posts Grid */}
      {posts.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {posts.map((post) => (
              <PostCard key={post._id} post={post} />
            ))}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex items-center justify-center space-x-2"
            >
              <motion.button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center px-4 py-2 glass-card rounded-xl hover:bg-white/80 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm font-medium text-slate-700"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Previous
              </motion.button>

              <div className="flex items-center space-x-1">
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
                Next
                <ArrowRight className="w-4 h-4 ml-2" />
              </motion.button>
            </motion.div>
          )}
        </>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-16 card-elevated"
        >
          <Folder className="w-16 h-16 mx-auto text-slate-300 mb-4" />
          <p className="text-slate-500 text-lg mb-4">No posts in this category yet</p>
          <Link
            to="/categories"
            className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:shadow-lg hover:shadow-indigo-500/25 transition-all"
          >
            Browse other categories
          </Link>
        </motion.div>
      )}
    </div>
  );
};

const PostCard = ({ post }) => (
  <motion.div
    whileHover={{ y: -4 }}
    transition={{ type: 'spring', stiffness: 300 }}
  >
    <Link
      to={`/posts/${post.slug}`}
      className="block group card-elevated card-elevated-hover overflow-hidden"
    >
      {post.featuredImage && (
        <img
          src={post.featuredImage}
          alt={post.title}
          className="w-full h-48 object-cover"
        />
      )}
      <div className="p-6">
        <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-indigo-600 transition-colors line-clamp-2">
          {post.title}
        </h3>
        <p className="text-slate-600 mb-4 line-clamp-3 text-sm leading-relaxed">{post.excerpt}</p>
        
        <div className="flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center space-x-4">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {format(new Date(post.publishedAt), 'MMM d, yyyy')}
            </span>
            <span className="flex items-center gap-1">
              <Eye className="w-3 h-3" />
              {post.viewCount || 0}
            </span>
          </div>
          <span className="flex items-center gap-1">
            <Heart className="w-3 h-3" />
            {post.likes?.length || 0}
          </span>
        </div>
      </div>
    </Link>
  </motion.div>
);

export default CategoryPosts;

