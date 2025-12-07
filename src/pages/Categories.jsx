import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Folder, ArrowRight } from 'lucide-react';
import { categoriesAPI, postsAPI } from '../services/api';
import toast from 'react-hot-toast';
import Spinner from '../components/common/Spinner';
import Seo, { DEFAULT_OG_IMAGE } from '../components/common/Seo';

const CATEGORIES_DESCRIPTION = 'Browse the Nexus archive by topic and discover curated collections of stories.';

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
        postsAPI.getAll({ limit: 1000 }).catch(() => ({ data: { posts: [] } })),
      ]);
      
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
      <div className="min-h-screen flex items-center justify-center bg-page">
        <Spinner size="2xl" />
      </div>
    );
  }

  return (
    <>
      <Seo
        title="Categories"
        description={CATEGORIES_DESCRIPTION}
        url="/categories"
        image={DEFAULT_OG_IMAGE}
      />
      <div className="bg-page">
      <div className="bg-content">
        <div className="layout-container-wide py-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <div className="inline-flex items-center gap-3">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[var(--accent)]/10 text-[var(--accent)]">
            <Folder className="w-5 h-5" />
          </span>
          <h1 className="text-3xl sm:text-4xl font-bold text-primary mb-0">
            Categories
          </h1>
        </div>
        <p className="text-muted">
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
          className="text-center py-16 border border-dashed border-[var(--border-subtle)] rounded-2xl bg-surface-subtle"
        >
          <Folder className="w-16 h-16 mx-auto text-muted mb-4" />
          <p className="text-secondary text-lg mb-2">No categories found</p>
          <p className="text-muted text-sm">Categories will appear here once they are created.</p>
        </motion.div>
      )}
        </div>
      </div>
      </div>
    </>
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
        className="block group surface-card p-6 hover:border-[var(--border-subtle)] transition-colors"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="p-3 rounded-xl bg-[var(--accent)]/[0.1] text-[var(--accent)]">
            <Folder className="w-6 h-6" />
          </div>
          <motion.div
            whileHover={{ x: 4 }}
            transition={{ type: 'spring', stiffness: 400 }}
          >
            <ArrowRight className="w-5 h-5 text-muted group-hover:text-[var(--accent)] transition-colors" />
          </motion.div>
        </div>
        
        <h3 className="text-xl font-bold text-primary mb-2 group-hover:text-[var(--accent)] transition-colors">
          {category.name}
        </h3>
        
        {category.description && (
          <p className="text-secondary mb-4 line-clamp-2 text-sm leading-relaxed">
            {category.description}
          </p>
        )}
        
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted">
            {postCount} {postCount === 1 ? 'post' : 'posts'}
          </span>
          <span className="px-3 py-1 bg-[var(--accent)] text-white text-xs font-semibold rounded-full group-hover:bg-[var(--accent-hover)] transition-colors">
            Explore
          </span>
        </div>
      </Link>
    </motion.div>
  );
};

export default Categories;

