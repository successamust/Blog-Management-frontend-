import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Folder, ArrowRight } from 'lucide-react';
import { categoriesAPI, postsAPI } from '../services/api';
import toast from 'react-hot-toast';
import Spinner from '../components/common/Spinner';
import Seo, { DEFAULT_OG_IMAGE } from '../components/common/Seo';
import { getApiErrorMessage } from '../utils/apiError.js';

import initialCategoriesData from '../data/initial-categories-data.json';

const CATEGORIES_DESCRIPTION = 'Browse the Nexus archive by topic and discover curated collections of stories.';

import SmartLink from '../components/common/SmartLink';

const Categories = () => {
  const [categories, setCategories] = useState(initialCategoriesData?.categories || []);
  const [loading, setLoading] = useState(!(initialCategoriesData?.categories?.length > 0));

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
      toast.error(getApiErrorMessage(error, 'Failed to load categories. Please try again.'));
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
        <section className="page-hero-strip">
          <div className="pointer-events-none absolute inset-0 hero-mesh" aria-hidden />
          <div className="layout-container-wide py-12 md:py-14 relative z-[1]">
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6"
            >
              <div>
                <p className="font-sans text-[11px] uppercase tracking-[0.28em] text-[var(--text-muted)] mb-3">
                  Explore
                </p>
                <div className="inline-flex items-center gap-4">
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--accent)]/12 text-[var(--accent)] ring-1 ring-[var(--accent)]/20">
                    <Folder className="w-6 h-6" />
                  </span>
                  <h1 className="font-display text-3xl sm:text-4xl text-primary leading-tight">
                    Categories
                  </h1>
                </div>
                <p className="text-secondary mt-3 max-w-xl text-sm sm:text-base">
                  Browse posts by topic—each collection is curated by the community.
                </p>
              </div>
            </motion.div>
          </div>
        </section>
        <div className="bg-content">
          <div className="layout-container-wide py-10 md:py-12">

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
      <SmartLink
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

        <h3 className="font-display text-xl text-primary mb-2 group-hover:text-[var(--accent)] transition-colors">
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
      </SmartLink>
    </motion.div>
  );
};

export default Categories;
