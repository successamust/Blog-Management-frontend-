import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Folder, ArrowRight } from 'lucide-react';
import { categoriesAPI, postsAPI } from '../services/api';
import toast from 'react-hot-toast';

const Categories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      
      // Fetch categories and posts in parallel
      const [categoriesRes, postsRes] = await Promise.all([
        categoriesAPI.getAll(),
        postsAPI.getAll({ limit: 1000 }).catch(() => ({ data: { posts: [] } })), // Fallback if posts API fails
      ]);
      
      console.log('Categories API response:', categoriesRes);
      console.log('Posts API response:', postsRes);
      
      // Handle different possible response structures
      const categoriesData = categoriesRes.data?.categories || 
                            categoriesRes.data?.data || 
                            categoriesRes.data || 
                            [];
      
      // Get all posts
      const allPosts = postsRes.data?.posts || 
                      postsRes.data?.data || 
                      (Array.isArray(postsRes.data) ? postsRes.data : []) || 
                      [];
      
      console.log('Categories data:', categoriesData);
      console.log('All posts:', allPosts);
      
      // Calculate post count for each category
      const categoriesWithCounts = categoriesData.map(category => {
        const categoryId = category._id || category.id;
        const categorySlug = category.slug;
        
        // Count posts that belong to this category
        const postCount = allPosts.filter(post => {
          const postCategoryId = post.category?._id || post.category?.id || post.category;
          const postCategorySlug = post.category?.slug;
          
          // Match by ID or slug
          return postCategoryId === categoryId || 
                 postCategorySlug === categorySlug ||
                 String(postCategoryId) === String(categoryId);
        }).length;
        
        return {
          ...category,
          postCount,
        };
      });
      
      console.log('Categories with post counts:', categoriesWithCounts);
      setCategories(Array.isArray(categoriesWithCounts) ? categoriesWithCounts : []);
    } catch (error) {
      console.error('Error fetching categories:', error);
      console.error('Error response:', error.response);
      toast.error('Failed to load categories. Please try again.');
      setCategories([]);
    } finally {
      setLoading(false);
    }
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
          <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Categories</span>
        </h1>
        <p className="text-slate-600">
          Browse posts by category
        </p>
      </motion.div>

      {/* Categories Grid */}
      {categories.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((category, index) => (
            <motion.div
              key={category._id || category.id || index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <CategoryCard category={category} />
            </motion.div>
          ))}
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-16"
        >
          <Folder className="w-16 h-16 mx-auto text-slate-300 mb-4" />
          <p className="text-slate-500 text-lg mb-2">No categories found</p>
          <p className="text-slate-400 text-sm">Categories will appear here once they are created.</p>
        </motion.div>
      )}
    </div>
  );
};

const CategoryCard = ({ category }) => {
  // Handle different possible field names for post count
  const postCount = category.postCount || 
                   category.posts?.length || 
                   category.count || 
                   0;
  
  // Handle slug - use slug if available, otherwise use ID
  const categorySlug = category.slug || 
                      category._id || 
                      category.id || 
                      '';

  if (!category.name) {
    return null; // Don't render if category doesn't have a name
  }

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ type: 'spring', stiffness: 300 }}
    >
      <Link
        to={`/categories/${categorySlug}`}
        className="block group card-elevated card-elevated-hover p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="p-3 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-xl">
            <Folder className="w-6 h-6 text-indigo-600" />
          </div>
          <motion.div
            whileHover={{ x: 4 }}
            transition={{ type: 'spring', stiffness: 400 }}
          >
            <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-indigo-600 transition-colors" />
          </motion.div>
        </div>
        
        <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-indigo-600 transition-colors">
          {category.name}
        </h3>
        
        {category.description && (
          <p className="text-slate-600 mb-4 line-clamp-2 text-sm leading-relaxed">
            {category.description}
          </p>
        )}
        
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500">
            {postCount} {postCount === 1 ? 'post' : 'posts'}
          </span>
          <span className="px-3 py-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-semibold rounded-full">
            Explore
          </span>
        </div>
      </Link>
    </motion.div>
  );
};

export default Categories;

