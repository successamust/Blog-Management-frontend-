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
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
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

  // Don't show "Category Not Found" if we're still loading or if we have posts
  // Only show it if we explicitly failed to load and have no data
  if (!loading && !displayCategory && !hasPosts) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Folder className="w-16 h-16 mx-auto text-slate-300 mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Category Not Found</h1>
          <p className="text-slate-500 mb-4">The category "{slug}" could not be found.</p>
          <Link 
            to="/categories" 
            className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:shadow-lg hover:shadow-indigo-500/25 transition-all"
          >
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
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900">{displayCategory?.name}</h1>
        </div>
        {displayCategory?.description && (
          <p className="text-slate-600 mb-4 leading-relaxed">{displayCategory.description}</p>
        )}
        <p className="text-sm text-slate-500">
          {pagination.totalPosts} {pagination.totalPosts === 1 ? 'post' : 'posts'} in this category
        </p>
      </motion.div>

      {/* Posts Grid */}
      {posts.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {posts.map((post, index) => (
              <PostCard key={post._id || post.id || index} post={post} />
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

const PostCard = ({ post }) => {
  if (!post || !post.title) {
    return null; // Don't render if post is invalid
  }

  const postSlug = post.slug || post._id || post.id || '';
  const postDate = post.publishedAt || post.createdAt || new Date();
  
  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ type: 'spring', stiffness: 300 }}
    >
      <Link
        to={`/posts/${postSlug}`}
        className="block group card-elevated card-elevated-hover overflow-hidden"
      >
        {post.featuredImage && (
          <img
            src={post.featuredImage}
            alt={post.title}
            className="w-full h-48 object-cover"
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
        )}
        <div className="p-6">
          <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-indigo-600 transition-colors line-clamp-2">
            {post.title}
          </h3>
          {post.excerpt && (
            <div className="relative mb-4 bg-gradient-to-br from-purple-50 to-pink-50 border-l-4 border-purple-400 rounded-r-md p-3 shadow-sm group-hover:shadow-md transition-all">
              <p className="text-slate-700 text-sm leading-relaxed line-clamp-3 font-medium">
                {post.excerpt}
              </p>
            </div>
          )}
          
          <div className="flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center space-x-4">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {format(new Date(postDate), 'MMM d, yyyy')}
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
};

export default CategoryPosts;

