import React, { useState, useEffect } from 'react';
import { LineChart } from 'lucide-react';
import AdvancedAnalytics from './AdvancedAnalytics';
import { postsAPI, commentsAPI } from '../../services/api';
import SkeletonLoader from '../common/SkeletonLoader';
import toast from 'react-hot-toast';

const AnalyticsPage = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30d');

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const normalizePosts = (response) => {
        if (!response?.data) return [];
        return (
          response.data.posts ||
          response.data.data ||
          (Array.isArray(response.data) ? response.data : []) ||
          []
        );
      };

      // Limit the number of posts fetched for analytics to reduce load under heavy traffic
      const response = await postsAPI.getAll({ limit: 250, status: 'all', includeDrafts: true });
      let postsData = normalizePosts(response);
      
      // Enhance posts with comment counts if missing
      // Only fetch for published posts to avoid too many API calls
      // Note: We fetch up to 100 posts' comments to balance accuracy vs API rate limits
      // Posts themselves are fetched up to 1000, but comment data requires separate API calls
      const postsNeedingComments = postsData.filter(p => {
      const postsNeedingComments = postsData.filter(p => {
        const hasCommentData = Array.isArray(p.comments) || 
                              typeof p.commentCount === 'number' || 
                              typeof p.comments === 'number';
        const isPublished = p.isPublished !== false && 
                           (p.status === 'published' || !p.status || p.status === 'live');
        return !hasCommentData && isPublished;
      }).slice(0, import.meta.env.PROD ? 30 : 100); // Stricter limit in production for scalability
      
      // Fetch comment counts in parallel (with delay to avoid rate limiting)
      if (postsNeedingComments.length > 0) {
        // Show a subtle loading indicator if we're fetching many comments
        if (postsNeedingComments.length > 10) {
          toast.loading(`Fetching comment data for ${postsNeedingComments.length} posts...`, { id: 'fetching-comments' });
        }
        
        const enhancedPosts = await Promise.all(
          postsNeedingComments.map(async (post, index) => {
            // Add small delay to avoid rate limiting (50ms for faster fetching)
            if (index > 0) await new Promise(resolve => setTimeout(resolve, 50));
            try {
              const postId = post._id || post.id;
              const commentsRes = await commentsAPI.getByPost(postId).catch(() => null);
              if (commentsRes?.data?.comments) {
                const countAllComments = (comments) => {
                  return comments.reduce((total, comment) => {
                    return total + 1 + (comment.replies ? countAllComments(comment.replies) : 0);
                  }, 0);
                };
                return {
                  ...post,
                  commentCount: countAllComments(commentsRes.data.comments),
                };
              }
            } catch (error) {
              console.warn(`Failed to fetch comments for post ${post._id}:`, error);
            }
            return post;
          })
        );
        
        // Update posts with enhanced data
        const postsMap = new Map(postsData.map(p => [p._id || p.id, p]));
        enhancedPosts.forEach(enhanced => {
          const id = enhanced._id || enhanced.id;
          if (postsMap.has(id)) {
            postsMap.set(id, enhanced);
          }
        });
        postsData = Array.from(postsMap.values());
        
        // Dismiss loading toast if shown
        if (postsNeedingComments.length > 10) {
          toast.dismiss('fetching-comments');
        }
      }
      
      setPosts(postsData);
    } catch (error) {
      console.error('Error fetching posts for analytics:', error);
      toast.error('Failed to load posts for analytics');
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <SkeletonLoader variant="post-card" count={3} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex-1 min-w-0">
          <h2 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
            <LineChart className="w-5 h-5 sm:w-6 sm:h-6" />
            Advanced Analytics
          </h2>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">
            Detailed insights into your posts performance and engagement
          </p>
        </div>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          className="px-3 sm:px-4 py-2 border border-[var(--border-subtle)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent bg-[var(--surface-bg)] text-[var(--text-primary)] text-sm sm:text-base w-full sm:w-auto focus:outline-none"
        >
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
          <option value="1y">Last year</option>
          <option value="alltime">All Time</option>
        </select>
      </div>

      <AdvancedAnalytics posts={posts} timeRange={timeRange} />
    </div>
  );
};

export default AnalyticsPage;

