import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, UserCheck, PenTool, Sparkles, ChevronDown, ChevronUp, Mail, TrendingUp, Clock, Eye, Heart } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { postsAPI, categoriesAPI, searchAPI, newsletterAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import ModernPostCard from '../components/posts/ModernPostCard';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import Spinner from '../components/common/Spinner';

const Home = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [featuredPosts, setFeaturedPosts] = useState([]);
  const [recentPosts, setRecentPosts] = useState([]);
  const [trendingPosts, setTrendingPosts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [popularTags, setPopularTags] = useState([]);
  const [totalPosts, setTotalPosts] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isAuthorSectionOpen, setIsAuthorSectionOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [subscribing, setSubscribing] = useState(false);
  
  // Check if user can apply to become an author
  const canApplyForAuthor = isAuthenticated && user?.role !== 'author' && user?.role !== 'admin';

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
      if (window.innerWidth >= 640) {
        setIsAuthorSectionOpen(true);
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const fetchHomeData = async () => {
      try {
        setLoading(true);
        const [postsRes, categoriesRes, tagsRes] = await Promise.all([
          postsAPI.getAll({ page: 1, limit: 100 }).catch(() => ({ data: { posts: [] } })),
          categoriesAPI.getAll().catch(() => ({ data: { categories: [] } })),
          searchAPI.getPopularTags().catch(() => ({ data: { tags: [] } }))
        ]);

        const postsData = postsRes.data?.posts || 
                         postsRes.data?.data || 
                         (Array.isArray(postsRes.data) ? postsRes.data : []) || 
                         [];

        const normalizeDate = (value) => {
          if (!value) return null;
          try {
            const date = new Date(value);
            return Number.isNaN(date.getTime()) ? null : date;
          } catch {
            return null;
          }
        };

        const getPostDate = (post) => {
          if (!post) return new Date(0);
          const date = normalizeDate(post.publishedAt) || 
                      normalizeDate(post.createdAt) || 
                      normalizeDate(post.updatedAt);
          return date || new Date(0);
        };

        const sortedPosts = Array.isArray(postsData)
          ? [...postsData]
              .filter(post => post && (post.publishedAt || post.createdAt))
              .sort((a, b) => {
                const dateA = getPostDate(a);
                const dateB = getPostDate(b);
                return dateB.getTime() - dateA.getTime();
              })
          : [];

        // Calculate trending posts (by views and likes)
        const trending = [...sortedPosts]
          .sort((a, b) => {
            const scoreA = (a.viewCount || 0) + ((a.likes?.length || 0) * 10);
            const scoreB = (b.viewCount || 0) + ((b.likes?.length || 0) * 10);
            return scoreB - scoreA;
          })
          .slice(0, 5);

        const categoriesData = categoriesRes.data?.categories || 
                               categoriesRes.data?.data || 
                               (Array.isArray(categoriesRes.data) ? categoriesRes.data : []) || 
                               [];
        
        const tagsData = tagsRes.data?.tags || 
                        tagsRes.data?.data || 
                        (Array.isArray(tagsRes.data) ? tagsRes.data : []) || 
                        [];

        const categoriesWithCounts = (Array.isArray(categoriesData) ? categoriesData : [])
          .filter(Boolean)
          .map(category => {
          const categoryId = category?._id ?? category?.id ?? category?.categoryId ?? null;
          const categorySlug = category?.slug ?? null;

          const categoryPostCount = sortedPosts.filter(post => {
            if (!post) return false;
            const postCategory = post.category;
            const postCategories = post.categories;

            const matchesSingleCategory = () => {
              if (!postCategory) return false;
              const postCategoryId = postCategory._id || postCategory.id || postCategory;
              const postCategorySlug = postCategory.slug;
              return (
                (categoryId && String(postCategoryId) === String(categoryId)) ||
                (categorySlug && postCategorySlug && postCategorySlug === categorySlug)
              );
            };

            const matchesCategoryArray = () => {
              if (!Array.isArray(postCategories)) return false;
              return postCategories.some(cat => {
                const catId = cat?._id || cat?.id || cat;
                const catSlug = cat?.slug;
                return (
                  (categoryId && String(catId) === String(categoryId)) ||
                  (categorySlug && catSlug && catSlug === categorySlug)
                );
              });
            };

            return matchesSingleCategory() || matchesCategoryArray();
          }).length;

          return {
            ...category,
            postCount: categoryPostCount,
          };
        });

        setFeaturedPosts(sortedPosts.slice(0, 2));
        setRecentPosts(sortedPosts.slice(0, 10));
        setTrendingPosts(trending);
        setCategories(Array.isArray(categoriesWithCounts) ? categoriesWithCounts.slice(0, 8) : []);
        setPopularTags(Array.isArray(tagsData) ? tagsData.slice(0, 12) : []);
        setTotalPosts(sortedPosts.length);
      } catch (error) {
        console.error('Error fetching home data:', error);
        setFeaturedPosts([]);
        setRecentPosts([]);
        setTrendingPosts([]);
        setCategories([]);
        setPopularTags([]);
      } finally {
        setLoading(false);
      }
    };

    fetchHomeData();
  }, []);

  const handleNewsletterSubscribe = async (e) => {
    e.preventDefault();
    if (!newsletterEmail.trim()) {
      toast.error('Please enter your email');
      return;
    }

    setSubscribing(true);
    try {
      await newsletterAPI.subscribe(newsletterEmail);
      toast.success('Successfully subscribed to newsletter!');
      setNewsletterEmail('');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to subscribe');
    } finally {
      setSubscribing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-page">
        <Spinner size="2xl" />
      </div>
    );
  }

  return (
    <div className="bg-page min-h-screen">
      {/* Minimal Hero Section - Medium/Substack Style */}
      <section className="border-b border-[var(--border-subtle)]">
        <div className="layout-container section-hero-spacing-y">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 mb-6 leading-tight tracking-tight">
              Stories worth sharing
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-gray-600 mb-8 max-w-2xl mx-auto leading-relaxed">
              Discover thoughtful articles, insights, and stories from our community of writers
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center w-full max-w-xl mx-auto">
              <Link
                to="/posts"
                className="btn btn-primary"
              >
                Start Reading
                <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
              {canApplyForAuthor && (
                <Link
                  to="/dashboard?tab=author"
                  className="btn btn-outline text-[var(--accent)]"
                >
                  Write for us
                </Link>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Main Content */}
      <div className="layout-container section-spacing-y">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          {/* Main Content Area */}
          <div className="lg:col-span-8">
            {/* Featured Posts */}
            {featuredPosts.length > 0 && (
              <section className="mb-16">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Featured</h2>
                  <Link
                    to="/posts"
                    className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    View all →
                  </Link>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                  {featuredPosts.map((post, index) => (
                    <ModernPostCard key={post._id || post.id || index} post={post} featured delay={index * 0.1} />
                  ))}
                </div>
              </section>
            )}

            {/* Latest Articles */}
            <section className="mb-16">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Latest</h2>
                <Link
                  to="/posts"
                  className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                >
                  View all →
                </Link>
              </div>
              <div className="space-y-8">
                {recentPosts.length > 0 ? (
                  recentPosts.map((post, index) => (
                    <ModernPostCard key={post._id || post.id || index} post={post} delay={index * 0.05} />
                  ))
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <p>No posts available yet. Check back soon!</p>
                  </div>
                )}
              </div>
            </section>

            {/* Load More */}
            {recentPosts.length > 0 && (
              <div className="text-center pt-8">
                <Link
                  to="/posts"
                  className="btn btn-outline"
                >
                  Load more articles
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Link>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <aside className="lg:col-span-4 space-y-8">
            {/* Newsletter Subscription - Substack Style */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="bg-surface-subtle rounded-2xl p-6 border border-[var(--border-subtle)] shadow-sm"
            >
              <div className="flex items-center mb-4">
                <Mail className="w-5 h-5 text-gray-900 mr-2" />
                <h3 className="text-lg font-bold text-gray-900">Subscribe to our newsletter</h3>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Get the latest stories delivered to your inbox
              </p>
              <form onSubmit={handleNewsletterSubscribe} className="space-y-3">
                <input
                  type="email"
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  className="w-full px-4 py-2.5 bg-surface border border-[var(--border-subtle)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent text-sm"
                />
                <button
                  type="submit"
                  disabled={subscribing}
                  className="btn btn-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {subscribing ? 'Subscribing...' : 'Subscribe'}
                </button>
              </form>
            </motion.div>

            {/* Become Author CTA */}
            {canApplyForAuthor && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="surface-card p-6 hover:border-[#d6cfc6] transition-colors"
              >
                <button
                  onClick={() => setIsAuthorSectionOpen(!isAuthorSectionOpen)}
                  className="w-full flex items-center justify-between focus:outline-none"
                >
                  <div className="flex items-center flex-1">
                    <div className="p-2 bg-gray-100 rounded-lg mr-3">
                      <PenTool className="w-5 h-5 text-gray-900" />
                    </div>
                    <div className="text-left">
                      <h3 className="text-base font-bold text-gray-900">Become an Author</h3>
                      <p className="text-xs text-gray-600">Share your voice</p>
                    </div>
                  </div>
                  <div className="sm:hidden ml-2">
                    {isAuthorSectionOpen ? (
                      <ChevronUp className="w-5 h-5 text-gray-600" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-600" />
                    )}
                  </div>
                </button>
                
                <AnimatePresence>
                  {(isAuthorSectionOpen || !isMobile) && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="pt-4 mt-4 border-t border-gray-100">
                        <p className="text-sm text-gray-600 mb-4">
                          Join our community of writers and share your stories with readers around the world.
                        </p>
                        {isAuthenticated ? (
                          <Link
                            to="/dashboard?tab=author"
                            className="block w-full text-center px-4 py-2.5 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 transition-colors text-sm"
                            onClick={() => setIsAuthorSectionOpen(false)}
                          >
                            Apply Now
                          </Link>
                        ) : (
                          <Link
                            to="/login?redirect=/dashboard?tab=author"
                            className="block w-full text-center px-4 py-2.5 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 transition-colors text-sm"
                            onClick={() => setIsAuthorSectionOpen(false)}
                          >
                            Sign In to Apply
                          </Link>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {/* Trending Posts */}
            {trendingPosts.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="surface-card p-6"
              >
                <div className="flex items-center mb-6">
                  <TrendingUp className="w-5 h-5 text-gray-900 mr-2" />
                  <h3 className="text-lg font-bold text-gray-900">Trending</h3>
                </div>
                <div className="space-y-4">
                  {trendingPosts.map((post, index) => {
                    const postSlug = post.slug || post._id || post.id || '';
                    const author = post.author || {};
                    const authorName = author.username || 'Anonymous';
                    const postDate = post.publishedAt || post.createdAt || new Date();
                    
                    return (
                      <Link
                        key={post._id || post.id || index}
                        to={`/posts/${postSlug}`}
                        className="block group"
                      >
                        <div className="flex items-start space-x-3">
                          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600 group-hover:bg-gray-900 group-hover:text-white transition-colors">
                            {index + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-semibold text-gray-900 group-hover:text-gray-700 transition-colors line-clamp-2 mb-1">
                              {post.title}
                            </h4>
                            <div className="flex items-center space-x-2 text-xs text-gray-500">
                              <span>{authorName}</span>
                              <span>•</span>
                              <span>{format(new Date(postDate), 'MMM d')}</span>
                            </div>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* Categories */}
            {categories.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="surface-card p-6"
              >
                <h3 className="text-lg font-bold text-gray-900 mb-6">Topics</h3>
                <div className="space-y-2">
                  {categories.map((category) => {
                    const categoryId = category._id || category.id;
                    const categorySlug = category.slug || categoryId;
                    const categoryName = category.name || 'Unnamed Category';
                    
                    return (
                      <Link
                        key={categoryId}
                        to={`/categories/${categorySlug}`}
                        className="flex items-center justify-between p-3 rounded-lg hover:bg-surface-subtle transition-colors group"
                      >
                        <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                          {categoryName}
                        </span>
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                          {category.postCount ?? 0}
                        </span>
                      </Link>
                    );
                  })}
                </div>
                <Link
                  to="/categories"
                  className="block mt-4 text-center text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                >
                  View all topics →
                </Link>
              </motion.div>
            )}

            {/* Popular Tags */}
            {popularTags.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="surface-card p-6"
              >
                <h3 className="text-lg font-bold text-gray-900 mb-4">Popular Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {popularTags.map((tag) => {
                    const tagName = typeof tag === 'string' ? tag : tag?.name;
                    if (!tagName) return null;
                    return (
                      <Link
                        key={tagName}
                        to={`/search?tags=${encodeURIComponent(tagName)}`}
                        className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full text-xs font-medium hover:bg-gray-200 transition-colors"
                      >
                        #{tagName}
                      </Link>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
};

export default Home;
