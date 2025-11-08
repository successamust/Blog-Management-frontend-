import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { postsAPI, categoriesAPI, searchAPI } from '../services/api';
import AnimatedHero from '../components/common/AnimatedHero';
import AnimatedCard from '../components/common/AnimatedCard';
import InteractivePostCard from '../components/posts/InteractivePostCard';

const Home = () => {
  const [featuredPosts, setFeaturedPosts] = useState([]);
  const [recentPosts, setRecentPosts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [popularTags, setPopularTags] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHomeData = async () => {
      try {
        setLoading(true);
        const [postsRes, categoriesRes, tagsRes] = await Promise.all([
          postsAPI.getAll({ page: 1, limit: 6 }),
          categoriesAPI.getAll(),
          searchAPI.getPopularTags()
        ]);

        setFeaturedPosts(postsRes.data.posts.slice(0, 2));
        setRecentPosts(postsRes.data.posts.slice(2));
        setCategories(categoriesRes.data.categories.slice(0, 6));
        setPopularTags(tagsRes.data.tags.slice(0, 10));
      } catch (error) {
        console.error('Error fetching home data:', error);
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
                <InteractivePostCard key={post._id} post={post} featured delay={index * 0.1} />
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
                    <InteractivePostCard key={post._id} post={post} delay={index * 0.1} />
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
            {/* Categories */}
            <motion.section
              className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200/50 p-6 sm:p-8"
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
            >
              <div className="flex items-center mb-6">
                <div className="w-1 h-10 bg-gradient-to-b from-indigo-500 via-purple-500 to-pink-500 rounded-full mr-4"></div>
                <h3 className="text-xl sm:text-2xl font-display text-slate-900">Popular Categories</h3>
              </div>
              {categories.length > 0 ? (
                <div className="space-y-2">
                  {categories.map((category, index) => (
                    <motion.div
                      key={category._id}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Link
                        to={`/categories/${category.slug}`}
                        className="flex items-center justify-between p-4 rounded-xl hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 transition-all duration-300 group border border-transparent hover:border-indigo-200"
                      >
                        <span className="text-slate-700 font-medium group-hover:text-indigo-600 transition-colors">
                          {category.name}
                        </span>
                        <span className="text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 px-3 py-1 rounded-full group-hover:scale-110 transition-transform shadow-sm">
                          {category.postCount || 0}
                        </span>
                      </Link>
                    </motion.div>
                  ))}
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
              transition={{ delay: 0.5 }}
            >
              <div className="flex items-center mb-6">
                <div className="w-1 h-10 bg-gradient-to-b from-purple-500 via-pink-500 to-indigo-500 rounded-full mr-4"></div>
                <h3 className="text-xl sm:text-2xl font-display text-slate-900">Popular Tags</h3>
              </div>
              {popularTags.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {popularTags.map((tag, index) => (
                    <motion.div
                      key={tag.name}
                      initial={{ opacity: 0, scale: 0.8 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: index * 0.05 }}
                      whileHover={{ scale: 1.1, y: -2 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Link
                        to={`/search?tags=${tag.name}`}
                        className="px-4 py-2 bg-gradient-to-r from-slate-100 to-slate-200 text-slate-700 rounded-full text-sm font-medium hover:from-indigo-100 hover:to-purple-100 hover:text-indigo-700 transition-all duration-300 shadow-sm hover:shadow-md"
                      >
                        #{tag.name}
                      </Link>
                    </motion.div>
                  ))}
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
              transition={{ delay: 0.6 }}
            >
              <h3 className="text-xl sm:text-2xl font-display mb-6">Quick Stats</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2">
                  <span className="text-indigo-100 font-medium">Total Posts</span>
                  <span className="text-2xl sm:text-3xl font-bold">{featuredPosts.length + recentPosts.length}</span>
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