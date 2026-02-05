import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronDown, ChevronUp, PenLine, UsersRound, LineChart, Boxes, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { postsAPI, categoriesAPI, searchAPI, newsletterAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import ModernPostCard from '../components/posts/ModernPostCard';
import Spinner from '../components/common/Spinner';
import Seo, { DEFAULT_OG_IMAGE } from '../components/common/Seo';
import TagCloud from '../components/common/TagCloud';
import initialHomeData from '../data/initial-home-data.json';
import { normalizeDate, getPostDate, formatAuthorName, formatDate } from '../utils/shared';

const HOME_DESCRIPTION = 'The central hub for diverse voices, where every perspective is shared and every idea is explored.';
const POSTS_PER_PAGE = 10;
const NEWSLETTER_TOPICS = [
  { value: 'weekly-digest', label: 'Weekly digest' },
  { value: 'product-updates', label: 'Product updates' },
  { value: 'community-highlights', label: 'Community highlights' },
];

const Home = () => {
  const { user, isAuthenticated } = useAuth();
  const [posts, setPosts] = useState(initialHomeData?.posts || []);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMorePosts, setHasMorePosts] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [categories, setCategories] = useState((initialHomeData?.categories || []).slice(0, 8));
  const [popularTags, setPopularTags] = useState((initialHomeData?.popularTags || []).slice(0, 12));
  const [loading, setLoading] = useState(!(initialHomeData?.posts?.length > 0));
  const [isAuthorSectionOpen, setIsAuthorSectionOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [subscribing, setSubscribing] = useState(false);
  const [selectedTopics, setSelectedTopics] = useState(['weekly-digest']);
  const [consentChecked, setConsentChecked] = useState(false);
  const [showOptInModal, setShowOptInModal] = useState(false);
  const [pendingSubscription, setPendingSubscription] = useState(null);
  const [error, setError] = useState(null);
  const postsRef = useRef([]);

  // Check if user can apply to become an author
  const canApplyForAuthor = isAuthenticated && user?.role !== 'author' && user?.role !== 'admin';

  const mergePosts = useCallback(
    (incoming = [], { reset = false } = {}) => {
      setPosts((prev) => {
        const base = reset ? [] : prev;
        const map = new Map();
        [...base, ...incoming].forEach((post) => {
          if (!post) return;
          const key = String(post._id || post.id || post.slug || Math.random());
          map.set(key, post);
        });
        const merged = Array.from(map.values()).sort((a, b) => getPostDate(b) - getPostDate(a));
        return merged;
      });
    },
    [getPostDate]
  );

  const buildCategoryCounts = useCallback((categoriesList = [], referencePosts = []) => {
    if (!Array.isArray(categoriesList) || !Array.isArray(referencePosts)) {
      return [];
    }

    return categoriesList
      .filter(Boolean)
      .map((category) => {
        const categoryId = category?._id ?? category?.id ?? category?.categoryId ?? null;
        const categorySlug = category?.slug ?? null;

        const postCount = referencePosts.filter((post) => {
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
            return postCategories.some((cat) => {
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
          postCount,
        };
      });
  }, []);

  useEffect(() => {
    postsRef.current = posts;
  }, [posts]);

  const loadPostsPage = useCallback(
    async (pageToFetch = 1, { reset = false } = {}) => {
      try {
        const response = await postsAPI.getAll({ page: pageToFetch, limit: POSTS_PER_PAGE });

        const postsData =
          response.data?.posts ||
          response.data?.data ||
          (Array.isArray(response.data) ? response.data : []) ||
          [];

        // Filter to ensure only published posts are shown
        // Since we're requesting posts from backend, trust it and only filter out explicitly non-published posts
        const isPublishedPost = (post) => {
          if (!post) return false;

          // If post has publishedAt in the past, it's published - show it (trust publishedAt over status field)
          if (post?.publishedAt) {
            const publishedDate = new Date(post.publishedAt);
            if (!isNaN(publishedDate.getTime()) && publishedDate <= new Date()) {
              return true; // Already published, show it regardless of status field
            }
          }

          // If isPublished is explicitly true, trust it over status field
          if (post?.isPublished === true || post?.published === true) {
            return true; // Explicitly marked as published
          }

          // Only filter out if explicitly marked as draft or non-published
          const status = (post?.status || post?.state || '').toString().toLowerCase().trim();

          // Explicitly non-published statuses - filter these out (only if not overridden by isPublished/publishedAt)
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

          // If only scheduledAt exists and it's in the future, filter out (not yet published)
          if (post?.scheduledAt && !post?.publishedAt) {
            const scheduledDate = new Date(post.scheduledAt);
            if (!isNaN(scheduledDate.getTime()) && scheduledDate > new Date()) {
              return false; // Scheduled for future, not yet published
            }
          }

          // Otherwise, trust the backend response
          // This ensures we don't filter out valid published posts with status variations
          return true;
        };

        const sanitizedPosts = Array.isArray(postsData)
          ? postsData.filter((post) => post && isPublishedPost(post))
          : [];

        mergePosts(sanitizedPosts, { reset });

        const totalFromApi =
          response.data?.pagination?.total ||
          response.data?.total ||
          response.data?.count ||
          null;
        setHasMorePosts(sanitizedPosts.length === POSTS_PER_PAGE);
        setCurrentPage(pageToFetch);
        return sanitizedPosts;
      } catch (error) {
        // Handle 404 specifically - might be backend routing issue
        if (error.response?.status === 404) {
          console.error('Posts endpoint returned 404. This might indicate a backend routing issue.');
          console.error('Request URL:', error.config?.url);
          console.error('Base URL:', error.config?.baseURL);
          // Return empty array instead of throwing - allow page to render
          return [];
        }
        console.error('Error loading posts:', error);
        throw error; // Re-throw other errors to be caught by parent
      }
    },
    [mergePosts]
  );

  const fetchCategoriesAndTags = useCallback(
    async (referencePosts = []) => {
      try {
        const [categoriesRes, tagsRes] = await Promise.all([
          categoriesAPI.getAll().catch(() => ({ data: { categories: [] } })),
          searchAPI.getPopularTags().catch(() => ({ data: { tags: [] } })),
        ]);

        const categoriesData =
          categoriesRes.data?.categories ||
          categoriesRes.data?.data ||
          (Array.isArray(categoriesRes.data) ? categoriesRes.data : []) ||
          [];

        const tagsData =
          tagsRes.data?.tags ||
          tagsRes.data?.data ||
          (Array.isArray(tagsRes.data) ? tagsRes.data : []) ||
          [];

        const sourcePosts = referencePosts.length ? referencePosts : postsRef.current;
        const categoriesWithCounts = buildCategoryCounts(categoriesData, sourcePosts);

        setCategories(Array.isArray(categoriesWithCounts) ? categoriesWithCounts.slice(0, 8) : []);
        setPopularTags(Array.isArray(tagsData) ? tagsData.slice(0, 12) : []);
      } catch (error) {
        // Don't throw - these are optional, just set empty arrays
        setCategories([]);
        setPopularTags([]);
      }
    },
    [buildCategoryCounts]
  );

  // Featured posts: prioritize manually featured posts, fallback to recent if not enough
  const featuredPosts = useMemo(() => {
    if (!posts.length) return [];

    // First, get manually featured posts
    const manuallyFeatured = posts.filter(post => post.isFeatured === true || post.isFeatured === 'true');

    // If we have 2+ featured posts, return them (sorted by publishedAt)
    if (manuallyFeatured.length >= 2) {
      return manuallyFeatured
        .sort((a, b) => {
          const dateA = getPostDate(a);
          const dateB = getPostDate(b);
          return dateB - dateA;
        })
        .slice(0, 2);
    }

    // If we have 1 featured post, add the most recent non-featured post
    if (manuallyFeatured.length === 1) {
      const nonFeatured = posts.filter(post => !(post.isFeatured === true || post.isFeatured === 'true'));
      const mostRecent = nonFeatured
        .sort((a, b) => {
          const dateA = getPostDate(a);
          const dateB = getPostDate(b);
          return dateB - dateA;
        })[0];

      return mostRecent ? [manuallyFeatured[0], mostRecent] : [manuallyFeatured[0]];
    }

    // Fallback: return 2 most recent posts (original behavior)
    return posts
      .sort((a, b) => {
        const dateA = getPostDate(a);
        const dateB = getPostDate(b);
        return dateB - dateA;
      })
      .slice(0, 2);
  }, [posts, getPostDate]);

  const recentPosts = useMemo(() => posts, [posts]);
  const trendingPosts = useMemo(() => {
    if (!posts.length) return [];
    return [...posts]
      .sort((a, b) => {
        const scoreA = (a.viewCount || 0) + (a.likes?.length || 0) * 10;
        const scoreB = (b.viewCount || 0) + (b.likes?.length || 0) * 10;
        return scoreB - scoreA;
      })
      .slice(0, 5);
  }, [posts]);

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
    let isMounted = true;

    const fetchHomeData = async () => {
      try {
        // Only show full-page loader if we don't have pre-fetched data
        if (!postsRef.current?.length) {
          setLoading(true);
        }

        const initialPosts = await loadPostsPage(1, { reset: true });

        if (!isMounted) return;

        await fetchCategoriesAndTags(initialPosts);

        if (!isMounted) return;
      } catch (error) {
        console.error('Error fetching home data:', error);

        if (!isMounted) return;

        setPosts([]);
        setHasMorePosts(false);
        setCategories([]);
        setPopularTags([]);

        // Store error for display
        const errorMessage = error?.response?.data?.message ||
          error?.message ||
          'Failed to load the latest stories.';
        setError(errorMessage);
        toast.error(errorMessage);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchHomeData();

    return () => {
      isMounted = false;
    };
  }, [loadPostsPage, fetchCategoriesAndTags]);

  const loadMorePosts = async () => {
    if (!hasMorePosts || loadingMore) return;
    setLoadingMore(true);
    try {
      await loadPostsPage(currentPage + 1);
    } catch (error) {
      console.error('Failed to load more posts:', error);
      toast.error('Unable to load more posts right now.');
    } finally {
      setLoadingMore(false);
    }
  };

  const toggleTopic = (topicValue) => {
    setSelectedTopics((prev) => {
      if (prev.includes(topicValue)) {
        return prev.filter((topic) => topic !== topicValue);
      }
      return [...prev, topicValue];
    });
  };

  const resetNewsletterForm = () => {
    setNewsletterEmail('');
    setSelectedTopics(['weekly-digest']);
    setConsentChecked(false);
  };

  const closeOptInModal = () => {
    setShowOptInModal(false);
    setPendingSubscription(null);
  };

  const handleNewsletterSubscribe = (e) => {
    e.preventDefault();
    const sanitizedEmail = newsletterEmail.trim();
    if (!sanitizedEmail) {
      toast.error('Please enter your email');
      return;
    }

    if (selectedTopics.length === 0) {
      toast.error('Select at least one topic you care about.');
      return;
    }

    if (!consentChecked) {
      toast.error('Please confirm email consent to continue.');
      return;
    }

    setPendingSubscription({ email: sanitizedEmail });
    setShowOptInModal(true);
  };

  const confirmNewsletterSubscription = async () => {
    if (!pendingSubscription?.email) return;
    setSubscribing(true);
    try {
      await newsletterAPI.subscribe({
        email: pendingSubscription.email,
        topics: selectedTopics,
        consent: {
          marketing: true,
          doubleOptIn: true,
          timestamp: new Date().toISOString(),
        },
      });
      toast.success('Check your inbox to confirm your subscription.');
      resetNewsletterForm();
      closeOptInModal();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to start subscription. Please try again.');
    } finally {
      setSubscribing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-page">
        <div className="text-center">
          <Spinner size="2xl" />
          {/* <p className="mt-4 text-[var(--text-secondary)]">Loading stories...</p> */}
        </div>
      </div>
    );
  }

  // Show error state if there's an error and no posts
  if (error && posts.length === 0) {
    return (
      <>
        <Seo
          title="Nexus — Connect. Create. Discover."
          description={HOME_DESCRIPTION}
          url="/"
          image={DEFAULT_OG_IMAGE}
        />
        <div className="bg-page">
          <section className="border-b border-[var(--border-subtle)]">
            <div className="layout-container section-hero-spacing-y">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="text-center"
              >
                <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-[var(--text-primary)] mb-6 leading-tight tracking-tight">
                  Connect. Create. Discover.
                </h1>
                <p className="text-base sm:text-lg md:text-xl text-[var(--text-secondary)] mb-8 max-w-2xl mx-auto leading-relaxed">
                  The central hub for diverse voices, where every perspective is shared and every idea is explored.
                </p>
              </motion.div>
            </div>
          </section>
          <div className="bg-content">
            <div className="layout-container section-spacing-y">
              <div className="max-w-2xl mx-auto text-center py-16">
                <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-2xl p-8">
                  <h2 className="text-2xl font-bold text-rose-900 dark:text-rose-100 mb-4">
                    Unable to Load Content
                  </h2>
                  <p className="text-rose-700 dark:text-rose-300 mb-6">
                    {error}
                  </p>
                  <div className="space-y-2 text-sm text-rose-600 dark:text-rose-400 mb-6">
                    <p>Possible causes:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>API server is not responding</li>
                      <li>Network connectivity issues</li>
                      <li>CORS configuration problems</li>
                    </ul>
                  </div>
                  <button
                    onClick={() => {
                      setError(null);
                      setLoading(true);
                      const fetchHomeData = async () => {
                        try {
                          const initialPosts = await loadPostsPage(1, { reset: true });
                          await fetchCategoriesAndTags(initialPosts);
                        } catch (err) {
                          console.error('Retry failed:', err);
                          setError(err?.response?.data?.message || err?.message || 'Failed to load content');
                        } finally {
                          setLoading(false);
                        }
                      };
                      fetchHomeData();
                    }}
                    className="btn btn-primary"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Seo
        title="Nexus — Connect. Create. Discover."
        description={HOME_DESCRIPTION}
        url="/"
        image={DEFAULT_OG_IMAGE}
      />
      <div className="bg-page">
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
                Connect. Create. Discover.
              </h1>
              <p className="text-base sm:text-lg md:text-xl text-[var(--text-secondary)] mb-8 max-w-2xl mx-auto leading-relaxed">
                The central hub for diverse voices, where every perspective is shared and every idea is explored.
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
                {recentPosts.length > 0 && hasMorePosts && (
                  <div className="text-center pt-8">
                    <button
                      type="button"
                      onClick={loadMorePosts}
                      className="btn btn-outline inline-flex items-center justify-center gap-2 disabled:opacity-60"
                      disabled={loadingMore}
                    >
                      {loadingMore ? 'Loading...' : 'Load more articles'}
                      {!loadingMore && <ArrowRight className="ml-2 w-4 h-4" />}
                    </button>
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
                    Get the latest articles delivered to your inbox
                  </p>
                  <form onSubmit={handleNewsletterSubscribe} className="space-y-3">
                    <input
                      type="email"
                      value={newsletterEmail}
                      onChange={(e) => setNewsletterEmail(e.target.value)}
                      placeholder="Enter your email"
                      required
                      className="w-full px-4 py-2.5 bg-surface border border-[var(--border-subtle)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent text-sm"
                      disabled={subscribing}
                    />
                    <div>
                      <p className="text-xs text-[var(--text-secondary)] mb-2">
                        Choose the updates you want to receive:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {NEWSLETTER_TOPICS.map((topic) => (
                          <label
                            key={topic.value}
                            className={`text-xs px-3 py-1.5 rounded-full border cursor-pointer transition-colors ${selectedTopics.includes(topic.value)
                              ? 'bg-[var(--accent)]/10 border-[var(--accent)] text-[var(--accent)]'
                              : 'border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                              }`}
                          >
                            <input
                              type="checkbox"
                              className="sr-only"
                              checked={selectedTopics.includes(topic.value)}
                              onChange={() => toggleTopic(topic.value)}
                              disabled={subscribing}
                            />
                            {topic.label}
                          </label>
                        ))}
                      </div>
                    </div>
                    <label className="flex items-start gap-2 text-xs text-[var(--text-secondary)]">
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={consentChecked}
                        onChange={(e) => setConsentChecked(e.target.checked)}
                        disabled={subscribing}
                      />
                      <span>
                        I agree to receive updates and announcements from Nexus and understand I can unsubscribe at any time using the link in the email.
                      </span>

                    </label>
                    <button
                      type="submit"
                      disabled={subscribing}
                      className="btn btn-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {subscribing ? 'Working...' : 'Continue'}
                    </button>
                    <p className="text-[10px] text-[var(--text-muted)]">
                      We send a confirmation email so no one can subscribe you without permission.
                    </p>
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
                              Join our community of writers and share your thoughts with readers around the world.
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
                            to={`/preview/posts/${postSlug}`}
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
                                  <span>{formatAuthorName(author)}</span>
                                  <span>•</span>
                                  <span>{formatDate(postDate, 'MMM d')}</span>
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
      {showOptInModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 px-4 py-8">
          <div className="surface-card max-w-md w-full rounded-2xl border border-[var(--border-subtle)] p-6 relative">
            <button
              className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              onClick={closeOptInModal}
              disabled={subscribing}
              aria-label="Close confirmation modal"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-2">Confirm your subscription</h3>
            <p className="text-sm text-[var(--text-secondary)] mb-4">
              We’ll send a confirmation email to{' '}
              <span className="font-medium">{pendingSubscription?.email}</span>. Please click the link in your inbox to
              finish subscribing.
            </p>
            <div className="space-y-3">
              <button
                onClick={confirmNewsletterSubscription}
                className="btn btn-primary w-full disabled:opacity-60"
                disabled={subscribing}
              >
                {subscribing ? 'Sending confirmation...' : 'Send confirmation email'}
              </button>
              <button
                onClick={closeOptInModal}
                className="btn btn-outline w-full"
                disabled={subscribing}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Home;
