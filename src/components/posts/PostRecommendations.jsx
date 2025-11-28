import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, TrendingUp } from 'lucide-react';
import { postsAPI } from '../../services/api';
import ModernPostCard from './ModernPostCard';
import Spinner from '../common/Spinner';
import { useReadingHistory } from '../../hooks/useReadingHistory';

const PostRecommendations = ({ currentPost, limit = 6 }) => {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const { history } = useReadingHistory();

  useEffect(() => {
    fetchRecommendations();
  }, [currentPost]);

  const fetchRecommendations = async () => {
    try {
      setLoading(true);
      
      // Strategy 1: Get related posts by category
      let relatedPosts = [];
      if (currentPost?.category) {
        const categoryId = typeof currentPost.category === 'string' 
          ? currentPost.category 
          : currentPost.category._id;
        const response = await postsAPI.getAll({
          category: categoryId,
          limit: limit * 2,
          status: 'published',
        });
        relatedPosts = response.data?.posts || [];
      }

      // Strategy 2: Get posts with similar tags
      let tagPosts = [];
      if (currentPost?.tags && currentPost.tags.length > 0) {
        const tag = currentPost.tags[0];
        const response = await postsAPI.getAll({
          tags: tag,
          limit: limit * 2,
          status: 'published',
        });
        tagPosts = response.data?.posts || [];
      }

      // Strategy 3: Get trending/popular posts
      const trendingResponse = await postsAPI.getAll({
        limit: limit,
        status: 'published',
        sort: '-viewCount',
      });
      const trendingPosts = trendingResponse.data?.posts || [];

      // Combine and deduplicate
      const allPosts = [...relatedPosts, ...tagPosts, ...trendingPosts];
      const seen = new Set();
      const unique = allPosts.filter(post => {
        if (post._id === currentPost?._id) return false;
        if (seen.has(post._id)) return false;
        seen.add(post._id);
        return true;
      });

      // Sort by relevance (category match > tag match > trending)
      const scored = unique.map(post => {
        let score = 0;
        if (currentPost?.category) {
          const postCategory = typeof post.category === 'string' ? post.category : post.category?._id;
          const currentCategory = typeof currentPost.category === 'string' ? currentPost.category : currentPost.category?._id;
          if (postCategory === currentCategory) score += 10;
        }
        if (currentPost?.tags && post.tags) {
          const commonTags = currentPost.tags.filter(t => 
            post.tags.some(pt => (typeof pt === 'string' ? pt : pt.name) === (typeof t === 'string' ? t : t.name))
          );
          score += commonTags.length * 5;
        }
        score += (post.viewCount || 0) / 1000; // Boost popular posts
        return { post, score };
      });

      scored.sort((a, b) => b.score - a.score);
      setRecommendations(scored.slice(0, limit).map(item => item.post));
    } catch (error) {
      console.error('Error fetching recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Spinner size="lg" />
      </div>
    );
  }

  if (recommendations.length === 0) {
    return null;
  }

  return (
    <section className="mt-14 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[var(--accent)]/15 text-[var(--accent)] flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-[var(--text-muted)]">
              Keep Reading
            </p>
            <h2 className="text-2xl font-bold text-[var(--text-primary)]">
              You Might Also Like
            </h2>
          </div>
        </div>
        <div className="text-sm text-[var(--text-muted)] flex items-center gap-2">
          <TrendingUp className="w-4 h-4" />
          Curated for you
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
        {recommendations.slice(0, limit).map((post, index) => (
          <motion.div
            key={post._id || post.id}
            className="h-full"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.06 }}
          >
            <ModernPostCard post={post} />
          </motion.div>
        ))}
      </div>
    </section>
  );
};

export default PostRecommendations;

