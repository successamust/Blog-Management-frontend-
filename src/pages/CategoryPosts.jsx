import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Folder } from 'lucide-react';
import { categoriesAPI, postsAPI } from '../services/api';
import toast from 'react-hot-toast';
import ModernPostCard from '../components/posts/ModernPostCard';
import Spinner from '../components/common/Spinner';

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
      
      // Try to fetch category and posts separately to handle partial failures
      let categoryData = null;
      let postsData = [];
      let paginationData = {
        currentPage: currentPage,
        totalPages: 1,
        totalPosts: 0,
        limit: 12,
      };

      // Fetch category - try by slug first, then by ID if slug looks like an ID
      try {
        const categoryRes = await categoriesAPI.getBySlug(slug);
        console.log('Category API response (by slug):', categoryRes);
        
        categoryData = categoryRes.data?.category || 
                      categoryRes.data?.data || 
                      categoryRes.data || 
                      null;
      } catch (categoryError) {
        console.error('Error fetching category by slug:', categoryError);
        // If slug fetch fails and slug looks like an ID (24 hex chars), try fetching all categories and find by ID
        if (slug && slug.length === 24 && /^[0-9a-fA-F]+$/.test(slug)) {
          try {
            console.log('Slug looks like an ID, trying to fetch all categories and find by ID');
            const allCategoriesRes = await categoriesAPI.getAll();
            const allCategories = allCategoriesRes.data?.categories || 
                                allCategoriesRes.data?.data || 
                                allCategoriesRes.data || 
                                [];
            categoryData = allCategories.find(cat => 
              (cat._id === slug) || (cat.id === slug) || (cat.slug === slug)
            );
            if (categoryData) {
              console.log('Found category by ID:', categoryData);
            }
          } catch (allCategoriesError) {
            console.error('Error fetching all categories:', allCategoriesError);
          }
        }
        // If still no category, will try to get it from posts or use slug as fallback
        if (!categoryData) {
          console.warn('Category fetch failed, will try to get from posts or use slug');
        }
      }

      // Fetch posts - try with slug, if it fails and slug looks like ID, try alternative approach
      try {
        let postsRes;
        try {
          postsRes = await categoriesAPI.getPosts(slug, { page: currentPage, limit: 12 });
        } catch (postsError) {
          // If slug-based fetch fails and slug looks like an ID, try fetching all posts and filtering
          if (slug && slug.length === 24 && /^[0-9a-fA-F]+$/.test(slug)) {
            console.log('Posts fetch by slug failed, trying to fetch all posts and filter by category ID');
            try {
              const allPostsRes = await postsAPI.getAll({ limit: 1000 });
              const allPosts = allPostsRes.data?.posts || 
                             allPostsRes.data?.data || 
                             allPostsRes.data || 
                             [];
              // Filter posts by category ID
              const filteredPosts = allPosts.filter(post => {
                const postCategoryId = post.category?._id || post.category?.id || post.category;
                return postCategoryId === slug || post.category?.slug === slug;
              });
              
              // Create a mock response structure
              postsRes = {
                data: {
                  posts: filteredPosts,
                  totalPosts: filteredPosts.length,
                  currentPage: currentPage,
                  totalPages: 1,
                  limit: 12,
                }
              };
              console.log('Filtered posts by category ID:', filteredPosts);
            } catch (allPostsError) {
              throw postsError; // Re-throw original error
            }
          } else {
            throw postsError; // Re-throw if not an ID
          }
        }
        
        console.log('Posts API response:', postsRes);

        // Handle different possible response structures for posts
        postsData = postsRes.data?.posts || 
                   postsRes.data?.data || 
                   (Array.isArray(postsRes.data) ? postsRes.data : []) || 
                   [];
        
        // If we don't have category data but have posts, try to extract category from first post
        if (!categoryData && postsData.length > 0 && postsData[0].category) {
          categoryData = postsData[0].category;
          console.log('Extracted category from post:', categoryData);
        }
        
        // If still no category, create a minimal one from slug
        if (!categoryData) {
          categoryData = {
            name: slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, ' '),
            slug: slug,
            description: null,
          };
          console.log('Created fallback category from slug:', categoryData);
        }
        
        paginationData = {
          currentPage: postsRes.data?.currentPage || 
                      postsRes.data?.page || 
                      currentPage,
          totalPages: postsRes.data?.totalPages || 
                     postsRes.data?.pages || 
                     1,
          totalPosts: postsRes.data?.totalPosts || 
                     postsRes.data?.total || 
                     postsData.length || 
                     0,
          limit: postsRes.data?.limit || 12,
        };
      } catch (postsError) {
        console.error('Error fetching posts:', postsError);
        // If posts fetch fails but we have category, still show category
        if (!categoryData) {
          // If both fail, create minimal category
          categoryData = {
            name: slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, ' '),
            slug: slug,
            description: null,
          };
        }
        toast.error('Failed to load posts. Please try again.');
      }

      setCategory(categoryData);
      setPosts(Array.isArray(postsData) ? postsData : []);
      setPagination(paginationData);
    } catch (error) {
      console.error('Error fetching category data:', error);
      console.error('Error response:', error.response);
      
      // Create a fallback category so the page doesn't show blank
      const fallbackCategory = {
        name: slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, ' '),
        slug: slug,
        description: null,
      };
      
      setCategory(fallbackCategory);
      setPosts([]);
      toast.error('Failed to load category data. Please try again.');
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

  const hasPosts = posts.length > 0;
  const displayCategory = category || (hasPosts
    ? {
        name: slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, ' '),
        slug,
        description: null,
      }
    : null);

  if (!loading && !displayCategory && !hasPosts) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-page">
        <div className="text-center px-6">
          <Folder className="w-12 h-12 mx-auto text-muted mb-4" />
          <h1 className="text-2xl font-semibold text-primary mb-2">Category not found</h1>
          <p className="text-muted">We couldn’t locate “{slug}”. Try exploring other categories.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-page min-h-screen">
      <div className="bg-content">
        <div className="layout-container section-spacing-y">
        {/* Category Header */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="mb-12"
        >
          <div className="flex items-center gap-3 mb-4">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent)] text-white">
              <Folder className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-4xl sm:text-5xl font-bold text-primary tracking-tight">
                {displayCategory?.name}
              </h1>
            </div>
          </div>
          {displayCategory?.description && (
            <p className="text-sm sm:text-base text-secondary leading-relaxed max-w-3xl">
              {displayCategory.description}
            </p>
          )}
          <p className="text-xs sm:text-sm text-muted mt-4 uppercase tracking-[0.2em]">
            {pagination.totalPosts} {pagination.totalPosts === 1 ? 'article' : 'articles'} in this category
          </p>
        </motion.div>

        {/* Posts List */}
        {hasPosts ? (
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
            <Folder className="w-12 h-12 mx-auto text-muted mb-4" />
            <p className="text-secondary text-lg">No posts in this category yet.</p>
            <p className="text-sm text-muted mt-2">Check back soon for new articles.</p>
          </motion.div>
        )}

        {/* Pagination */}
        {hasPosts && pagination.totalPages > 1 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mt-12 flex items-center justify-center gap-2"
          >
            <motion.button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              whileHover={{ scale: currentPage === 1 ? 1 : 1.04 }}
              whileTap={{ scale: currentPage === 1 ? 1 : 0.96 }}
              className="flex items-center px-4 py-2 border border-[var(--border-subtle)] rounded-full text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-subtle)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
                  const isActive = page === currentPage;
                  return (
                    <motion.button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      whileHover={{ scale: isActive ? 1 : 1.08 }}
                      whileTap={{ scale: isActive ? 1 : 0.94 }}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-[var(--text-primary)] text-white'
                          : 'border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-subtle)]'
                      }`}
                    >
                      {page}
                    </motion.button>
                  );
                }

                if (page === currentPage - 2 || page === currentPage + 2) {
                  return (
                    <span key={page} className="px-2 text-gray-400">
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
              className="flex items-center px-4 py-2 border border-[var(--border-subtle)] rounded-full text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-subtle)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next
              <ArrowRight className="w-4 h-4 ml-2" />
            </motion.button>
          </motion.div>
        )}
        </div>
      </div>
    </div>
  );
};

export default CategoryPosts;

