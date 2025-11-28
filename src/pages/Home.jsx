import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Sparkles, ChevronDown, ChevronUp, PenLine, UsersRound, LineChart, Boxes } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { postsAPI, categoriesAPI, searchAPI, newsletterAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import ModernPostCard from '../components/posts/ModernPostCard';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import Spinner from '../components/common/Spinner';
import Seo, { DEFAULT_OG_IMAGE } from '../components/common/Seo';
import TagCloud from '../components/common/TagCloud';

const HOME_DESCRIPTION = 'Discover useful articles, insights, and writing from our community of creators.';

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
    <>
      <Seo
        title="Nexus — Stories Worth Sharing"
        description={HOME_DESCRIPTION}
        url="/"
        image={DEFAULT_OG_IMAGE}
      />
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
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-[var(--text-primary)] mb-6 leading-tight tracking-tight">
              Write. Share. Inspire.
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-[var(--text-secondary)] mb-8 max-w-2xl mx-auto leading-relaxed">
              Discover useful articles, insights, and writing from our community of creators.
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
      <div className="bg-content">
        <div className="layout-container section-spacing-y">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          {/* Main Content Area */}
          <div className="lg:col-span-8">
            {/* Featured Posts */}
            {featuredPosts.length > 0 && (
              <section className="mb-16">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl md:text-3xl font-bold text-[var(--text-primary)]">Featured</h2>
                  <Link
                    to="/posts"
                    className="text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
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
                <h2 className="text-2xl md:text-3xl font-bold text-[var(--text-primary)]">Latest</h2>
                <Link
                  to="/posts"
                  className="text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
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
                  <div className="text-center py-12 text-[var(--text-muted)]">
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
                <UsersRound className="w-5 h-5 text-[var(--text-primary)] mr-2" />
                <h3 className="text-lg font-bold text-[var(--text-primary)]">Subscribe to our newsletter</h3>
              </div>
              <p className="text-sm text-[var(--text-secondary)] mb-4">
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
                className="surface-card p-6 hover:border-[var(--border-subtle)] transition-colors"
              >
                <button
                  onClick={() => setIsAuthorSectionOpen(!isAuthorSectionOpen)}
                  className="w-full flex items-center justify-between focus:outline-none"
                >
                  <div className="flex items-center flex-1">
                    <div className="p-2 bg-[var(--surface-subtle)] rounded-lg mr-3">
                      <PenLine className="w-5 h-5 text-[var(--text-primary)]" />
                    </div>
                    <div className="text-left">
                      <h3 className="text-base font-bold text-[var(--text-primary)]">Become an Author</h3>
                      <p className="text-xs text-[var(--text-secondary)]">Share your voice</p>
                    </div>
                  </div>
                  <div className="sm:hidden ml-2">
                    {isAuthorSectionOpen ? (
                      <ChevronUp className="w-5 h-5 text-[var(--text-secondary)]" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-[var(--text-secondary)]" />
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
                      <div className="pt-4 mt-4 border-t border-[var(--border-subtle)]">
                        <p className="text-sm text-[var(--text-secondary)] mb-4">
                          Join our community of writers and share your stories with readers around the world.
                        </p>
                        {isAuthenticated ? (
                          <Link
                            to="/dashboard?tab=author"
                            className="block w-full text-center px-4 py-2.5 bg-[var(--text-primary)] text-white font-medium rounded-lg hover:opacity-90 transition-colors text-sm"
                            onClick={() => setIsAuthorSectionOpen(false)}
                          >
                            Apply Now
                          </Link>
                        ) : (
                          <Link
                            to="/login?redirect=/dashboard?tab=author"
                            className="block w-full text-center px-4 py-2.5 bg-[var(--text-primary)] text-white font-medium rounded-lg hover:opacity-90 transition-colors text-sm"
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
                  <LineChart className="w-5 h-5 text-[var(--text-primary)] mr-2" />
                  <h3 className="text-lg font-bold text-[var(--text-primary)]">Trending</h3>
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
                          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--accent-soft)] flex items-center justify-center text-xs font-bold text-[var(--text-secondary)] group-hover:bg-[var(--text-primary)] group-hover:text-white transition-colors">
                            {index + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-semibold text-[var(--text-primary)] group-hover:text-[var(--text-secondary)] transition-colors line-clamp-2 mb-1">
                              {post.title}
                            </h4>
                            <div className="flex items-center space-x-2 text-xs text-[var(--text-muted)]">
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
                <div className="flex items-center mb-6">
                  <Boxes className="w-5 h-5 text-[var(--text-primary)] mr-2" />
                  <h3 className="text-lg font-bold text-[var(--text-primary)]">Topics</h3>
                </div>
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
                        <span className="text-sm font-medium text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]">
                          {categoryName}
                        </span>
                        <span className="text-xs text-[var(--text-muted)] bg-[var(--accent-soft)] px-2 py-1 rounded-full">
                          {category.postCount ?? 0}
                        </span>
                      </Link>
                    );
                  })}
                </div>
                <Link
                  to="/categories"
                  className="block mt-4 text-center text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
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
                <h3 className="text-lg font-bold text-[var(--text-primary)] mb-4">Popular Tags</h3>
                <TagCloud tags={popularTags} maxTags={20} />
              </motion.div>
            )}
          </aside>
        </div>
        </div>
      </div>
      </div>
    </>
  );
};

export default Home;
