import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, UserCheck, PenTool, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { postsAPI, categoriesAPI, searchAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import AnimatedHero from '../components/common/AnimatedHero';
import AnimatedCard from '../components/common/AnimatedCard';
import InteractivePostCard from '../components/posts/InteractivePostCard';

const Home = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [featuredPosts, setFeaturedPosts] = useState([]);
  const [recentPosts, setRecentPosts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [popularTags, setPopularTags] = useState([]);
  const [totalPosts, setTotalPosts] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isAuthorSectionOpen, setIsAuthorSectionOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  // Check if user can apply to become an author
  const canApplyForAuthor = isAuthenticated && user?.role !== 'author' && user?.role !== 'admin';

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
      // On desktop, always keep it open
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

        // Handle different possible response structures for posts
        const postsData = postsRes.data?.posts || 
                         postsRes.data?.data || 
                         (Array.isArray(postsRes.data) ? postsRes.data : []) || 
                         [];

        // Normalize date helper
        const normalizeDate = (value) => {
          if (!value) return null;
          try {
            const date = new Date(value);
            return Number.isNaN(date.getTime()) ? null : date;
          } catch {
            return null;
          }
        };

        // Get the most relevant date for sorting (prefer publishedAt, then createdAt)
        const getPostDate = (post) => {
          if (!post) return new Date(0);
          // Prioritize publishedAt, then createdAt, then updatedAt
          const date = normalizeDate(post.publishedAt) || 
                      normalizeDate(post.createdAt) || 
                      normalizeDate(post.updatedAt);
          return date || new Date(0);
        };

        // Filter and sort posts by date (newest first)
        const sortedPosts = Array.isArray(postsData)
          ? [...postsData]
              .filter(post => post && (post.publishedAt || post.createdAt)) // Only include posts with dates
              .sort((a, b) => {
                const dateA = getPostDate(a);
                const dateB = getPostDate(b);
                // Sort descending (newest first)
                return dateB.getTime() - dateA.getTime();
              })
          : [];

        console.log('Total posts fetched:', postsData.length);
        console.log('Sorted posts count:', sortedPosts.length);
        if (sortedPosts.length > 0) {
          console.log('Latest post date:', getPostDate(sortedPosts[0]));
          console.log('First 3 posts:', sortedPosts.slice(0, 3).map(p => ({
            title: p.title,
            date: getPostDate(p),
            publishedAt: p.publishedAt,
            createdAt: p.createdAt
          })));
        }
        
        // Handle different possible response structures for categories
        const categoriesData = categoriesRes.data?.categories || 
                               categoriesRes.data?.data || 
                               (Array.isArray(categoriesRes.data) ? categoriesRes.data : []) || 
                               [];
        
        // Handle different possible response structures for tags
        const tagsData = tagsRes.data?.tags || 
                        tagsRes.data?.data || 
                        (Array.isArray(tagsRes.data) ? tagsRes.data : []) || 
                        [];

        // Calculate post counts for categories if not present
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
        setRecentPosts(sortedPosts.slice(0, 8));
        setCategories(Array.isArray(categoriesWithCounts) ? categoriesWithCounts.slice(0, 6) : []);
        setPopularTags(Array.isArray(tagsData) ? tagsData.slice(0, 10) : []);
        setTotalPosts(sortedPosts.length);
      } catch (error) {
        console.error('Error fetching home data:', error);
        // Set empty arrays on error to prevent crashes
        setFeaturedPosts([]);
        setRecentPosts([]);
        setCategories([]);
        setPopularTags([]);
      } finally {
        setLoading(false);
      }
    };

    fetchHomeData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Animated Hero Section */}
      <AnimatedHero />

      <div className="px-4 sm:px-6 lg:px-8 py-16 sm:py-20 bg-gradient-to-b from-white via-slate-50/30 to-white">
        {/* Featured Posts */}
        {featuredPosts.length > 0 ? (
          <section className="mb-20 sm:mb-28">
            <motion.div
              className="text-center mb-12 sm:mb-16"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <motion.p
                className="text-xs sm:text-sm font-medium text-indigo-600/70 uppercase tracking-[0.2em] mb-4 font-sans"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
              >
                Curated Selection
              </motion.p>
              <motion.h2
                className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-display text-slate-900 mb-6 sm:mb-8"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3, duration: 0.8 }}
              >
                <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                  Featured Posts
                </span>
              </motion.h2>
              <motion.p
                className="text-lg sm:text-xl text-slate-600 mb-12 sm:mb-16 max-w-3xl mx-auto leading-relaxed font-light"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4, duration: 0.8 }}
              >
                Discover our most popular and engaging content, handpicked for exceptional storytelling
              </motion.p>
            </motion.div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
              {featuredPosts.map((post, index) => (
                <InteractivePostCard key={post._id || post.id || index} post={post} featured delay={index * 0.1} />
              ))}
            </div>
          </section>
        ) : (
          <motion.section
            className="mb-16 text-center py-12"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <p className="text-gray-500 text-lg">No featured posts yet. Check back soon!</p>
          </motion.section>
        )}

        {/* Recent Posts & Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
          {/* Recent Posts */}
          <div className="lg:col-span-2">
            <section className="mb-12">
              <motion.div
                className="mb-8 sm:mb-10"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
              >
                <motion.p
                  className="text-xs sm:text-sm font-medium text-indigo-600/70 uppercase tracking-[0.2em] mb-3 font-sans"
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.1 }}
                >
                  Fresh Content
                </motion.p>
                <motion.h2
                  className="text-3xl sm:text-4xl lg:text-5xl font-display text-slate-900 mb-4 sm:mb-6"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2, duration: 0.8 }}
                >
                  Latest Articles
                </motion.h2>
                <motion.p
                  className="text-base sm:text-lg text-slate-600 mb-8 sm:mb-10 leading-relaxed font-light"
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3 }}
                >
                  Stay updated with our newest content and fresh perspectives
                </motion.p>
              </motion.div>
              {recentPosts.length > 0 ? (
                <div className="space-y-6">
                  {recentPosts.map((post, index) => (
                    <InteractivePostCard key={post._id || post.id || index} post={post} delay={index * 0.1} />
                  ))}
                </div>
              ) : (
                <motion.div
                  className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  <p className="text-gray-500">No recent posts available. Check back soon!</p>
                </motion.div>
              )}
            </section>

            {recentPosts.length > 0 && (
              <motion.div
                className="mt-8 text-center"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.5 }}
              >
                <motion.div
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                >
                  <Link
                    to="/posts"
                    className="group relative inline-flex items-center px-8 py-4 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white font-semibold rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-500 overflow-hidden"
                  >
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-indigo-700 via-purple-700 to-pink-700 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                      initial={false}
                    />
                    <span className="relative z-10 flex items-center">
                      View All Posts
                      <motion.div
                        className="ml-3"
                        animate={{ x: [0, 6, 0] }}
                        transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                      >
                        <ArrowRight className="w-5 h-5" />
                      </motion.div>
                    </span>
                  </Link>
                </motion.div>
              </motion.div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6 lg:space-y-8">
            {/* Become Author CTA - Only show to non-authors - Moved to top for visibility */}
            {canApplyForAuthor && (
              <motion.div
                className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 rounded-2xl shadow-lg border-2 border-indigo-200 relative overflow-hidden"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4 }}
              >
                {/* Decorative background elements */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-200/30 to-purple-200/30 rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-pink-200/30 to-indigo-200/30 rounded-full blur-2xl"></div>
                
                <div className="relative z-10">
                  {/* Header - Always visible, clickable on mobile */}
                  <button
                    onClick={() => setIsAuthorSectionOpen(!isAuthorSectionOpen)}
                    className="w-full flex items-center justify-between p-4 sm:p-6 sm:pb-4 focus:outline-none"
                  >
                    <div className="flex items-center flex-1">
                      <div className="p-2 sm:p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg mr-3 sm:mr-4">
                        <PenTool className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                      </div>
                      <div className="text-left">
                        <h3 className="text-lg sm:text-xl md:text-2xl font-display text-slate-900">Become an Author</h3>
                        <p className="text-xs sm:text-sm text-slate-600">Share your voice</p>
                      </div>
                    </div>
                    {/* Chevron - Only visible on mobile */}
                    <div className="sm:hidden ml-2">
                      {isAuthorSectionOpen ? (
                        <ChevronUp className="w-5 h-5 text-slate-600" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-slate-600" />
                      )}
                    </div>
                  </button>
                  
                  {/* Content - Hidden on mobile when collapsed, always visible on desktop */}
                  <AnimatePresence>
                    {(isAuthorSectionOpen || !isMobile) && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 sm:px-6 pb-4 sm:pb-6 sm:pb-8">
                          <p className="text-slate-700 mb-4 sm:mb-6 leading-relaxed text-sm sm:text-base">
                            Join our community of writers and share your stories, insights, and expertise with readers around the world.
                          </p>
                          
                          <motion.div
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="mb-4"
                          >
                            {isAuthenticated ? (
                              <Link
                                to="/dashboard?tab=author"
                                className="block w-full text-center px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 group text-sm sm:text-base"
                                onClick={() => setIsAuthorSectionOpen(false)}
                              >
                                <span className="flex items-center justify-center">
                                  Apply Now
                                  <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </span>
                              </Link>
                            ) : (
                              <Link
                                to="/login?redirect=/dashboard?tab=author"
                                className="block w-full text-center px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 group text-sm sm:text-base"
                                onClick={() => setIsAuthorSectionOpen(false)}
                              >
                                <span className="flex items-center justify-center">
                                  Sign In to Apply
                                  <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </span>
                              </Link>
                            )}
                          </motion.div>
                          
                          <div className="flex items-center justify-center gap-3 sm:gap-4 text-xs text-slate-600">
                            <div className="flex items-center gap-1">
                              <Sparkles className="w-3 h-3 text-indigo-500" />
                              <span>Creative Freedom</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <UserCheck className="w-3 h-3 text-purple-500" />
                              <span>Build Audience</span>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}

            {/* Categories */}
            <motion.section
              className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200/50 p-6 sm:p-8"
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.5 }}
            >
              <div className="flex items-center mb-6">
                <div className="w-1 h-10 bg-gradient-to-b from-indigo-500 via-purple-500 to-pink-500 rounded-full mr-4"></div>
                <h3 className="text-xl sm:text-2xl font-display text-slate-900">Popular Categories</h3>
              </div>
              {categories.length > 0 ? (
                <div className="space-y-2">
                  {categories.map((category, index) => {
                    const categoryId = category._id || category.id;
                    const categorySlug = category.slug || categoryId;
                    const categoryName = category.name || 'Unnamed Category';
                    
                    return (
                      <motion.div
                        key={categoryId || index}
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <Link
                          to={`/categories/${categorySlug}`}
                          className="flex items-center justify-between p-4 rounded-xl hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 transition-all duration-300 group border border-transparent hover:border-indigo-200"
                        >
                          <span className="text-slate-700 font-medium group-hover:text-indigo-600 transition-colors">
                            {categoryName}
                          </span>
                          <span className="text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 px-3 py-1 rounded-full group-hover:scale-110 transition-transform shadow-sm">
                            {category.postCount ?? 0}
                          </span>
                        </Link>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-gray-500 text-sm text-center py-4">No categories available</p>
              )}
            </motion.section>

            {/* Popular Tags */}
            <motion.section
              className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200/50 p-6 sm:p-8"
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.6 }}
            >
              <div className="flex items-center mb-6">
                <div className="w-1 h-10 bg-gradient-to-b from-purple-500 via-pink-500 to-indigo-500 rounded-full mr-4"></div>
                <h3 className="text-xl sm:text-2xl font-display text-slate-900">Popular Tags</h3>
              </div>
              {popularTags.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {popularTags.map((tag, index) => {
                    const tagName = typeof tag === 'string' ? tag : tag?.name;
                    if (!tagName) {
                      return null;
                    }
                    return (
                    <motion.div
                      key={tagName}
                      initial={{ opacity: 0, scale: 0.8 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: index * 0.05 }}
                      whileHover={{ scale: 1.1, y: -2 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Link
                        to={`/search?tags=${encodeURIComponent(tagName)}`}
                        className="px-4 py-2 bg-gradient-to-r from-slate-100 to-slate-200 text-slate-700 rounded-full text-sm font-medium hover:from-indigo-100 hover:to-purple-100 hover:text-indigo-700 transition-all duration-300 shadow-sm hover:shadow-md"
                      >
                        #{tagName}
                      </Link>
                    </motion.div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-gray-500 text-sm text-center py-4">No popular tags yet</p>
              )}
            </motion.section>

            {/* Quick Stats Card */}
            <motion.div
              className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 rounded-2xl shadow-xl p-6 sm:p-8 text-white"
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.7 }}
            >
              <h3 className="text-xl sm:text-2xl font-display mb-6">Quick Stats</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2">
                  <span className="text-indigo-100 font-medium">Total Posts</span>
                  <span className="text-2xl sm:text-3xl font-bold">{totalPosts}</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-indigo-100 font-medium">Categories</span>
                  <span className="text-2xl sm:text-3xl font-bold">{categories.length}</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-indigo-100 font-medium">Tags</span>
                  <span className="text-2xl sm:text-3xl font-bold">{popularTags.length}</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};


export default Home;