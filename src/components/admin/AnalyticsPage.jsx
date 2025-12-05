import React, { useState, useEffect } from 'react';
import { LineChart } from 'lucide-react';
import AdvancedAnalytics from './AdvancedAnalytics';
import { postsAPI, commentsAPI, pollsAPI, searchAPI, dashboardAPI, categoriesAPI } from '../../services/api';
import SkeletonLoader from '../common/SkeletonLoader';
import toast from 'react-hot-toast';

const AnalyticsPage = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30d');
  const [additionalStats, setAdditionalStats] = useState({
    polls: null,
    search: null,
    bookmarks: null,
    readingHistory: null,
    categoryStats: null,
  });

  // Security: Validate timeRange input
  const validTimeRanges = ['7d', '30d', '90d', '1y', 'all'];
  const validateTimeRange = (range) => {
    if (!range || typeof range !== 'string') return '30d';
    const trimmedRange = range.trim().toLowerCase();
    return validTimeRanges.includes(trimmedRange) ? trimmedRange : '30d';
  };

  useEffect(() => {
    fetchPosts();
    fetchAdditionalStats();
  }, []);

  const fetchAdditionalStats = async () => {
    try {
      // Fetch additional analytics in parallel
      const [pollsRes, tagsRes, dashboardRes, categoryStatsRes, bookmarksRes] = await Promise.allSettled([
        pollsAPI.getAll({ limit: 50 }).catch(() => null),
        searchAPI.getPopularTags().catch(() => null),
        dashboardAPI.getOverview().catch(() => null),
        categoriesAPI.getStats().catch(() => null),
        dashboardAPI.getBookmarks({ limit: 1000 }).catch(() => null), // Fetch bookmarks separately
      ]);

      const pollsData = pollsRes.status === 'fulfilled' && pollsRes.value?.data ? pollsRes.value.data : null;
      const tagsData = tagsRes.status === 'fulfilled' && tagsRes.value?.data ? tagsRes.value.data : null;
      const dashboardData = dashboardRes.status === 'fulfilled' && dashboardRes.value?.data ? dashboardRes.value.data : null;
      const categoryStatsData = categoryStatsRes.status === 'fulfilled' && categoryStatsRes.value?.data ? categoryStatsRes.value.data : null;
      const bookmarksResponseData = bookmarksRes.status === 'fulfilled' && bookmarksRes.value?.data ? bookmarksRes.value.data : null;

      // Process polls
      if (pollsData) {
        const pollsArray = pollsData?.polls || pollsData?.data || (Array.isArray(pollsData) ? pollsData : []) || [];
        const totalPolls = pollsArray.length;
        const totalVotes = pollsArray.reduce((sum, poll) => {
          if (!poll) return sum;
          
          // Method 1: Direct totalVotes field
          if (poll.totalVotes !== undefined && poll.totalVotes !== null) {
            const votes = Number(poll.totalVotes);
            if (Number.isFinite(votes) && votes > 0) return sum + votes;
          }
          
          // Method 2: From statistics object
          if (poll.statistics?.totalVotes !== undefined && poll.statistics?.totalVotes !== null) {
            const votes = Number(poll.statistics.totalVotes);
            if (Number.isFinite(votes) && votes > 0) return sum + votes;
          }
          
          // Method 3: Sum votes from options array (most reliable)
          if (poll.options && Array.isArray(poll.options) && poll.options.length > 0) {
            const votesFromOptions = poll.options.reduce((optionSum, option) => {
              if (!option) return optionSum;
              const voteCount = Number(option.votes) || Number(option.voteCount) || Number(option.count) || 0;
              return optionSum + (Number.isFinite(voteCount) ? voteCount : 0);
            }, 0);
            if (votesFromOptions > 0) return sum + votesFromOptions;
          }
          
          // Method 4: From results object
          if (poll.results && typeof poll.results === 'object' && !Array.isArray(poll.results)) {
            const votesFromResults = Object.values(poll.results).reduce((resultSum, count) => {
              const voteCount = Number(count) || 0;
              return resultSum + (Number.isFinite(voteCount) ? voteCount : 0);
            }, 0);
            if (votesFromResults > 0) return sum + votesFromResults;
          }
          
          // Method 5: From votes array
          if (poll.votes && Array.isArray(poll.votes)) {
            return sum + (poll.votes.length || 0);
          }
          
          return sum;
        }, 0);
        setAdditionalStats(prev => ({ ...prev, polls: { total: totalPolls, totalVotes } }));
      }

      // Process search tags
      if (tagsData) {
        const tagsArray = tagsData?.tags || tagsData?.data || tagsData?.popularTags || (Array.isArray(tagsData) ? tagsData : []) || [];
        setAdditionalStats(prev => ({ ...prev, search: { popularTags: tagsArray } }));
      }

      // Process bookmarks - try multiple sources
      let bookmarksArray = [];
      
      // Method 1: From dedicated bookmarks API response
      if (bookmarksResponseData) {
        const bookmarksFromAPI = bookmarksResponseData?.bookmarks || bookmarksResponseData?.posts || bookmarksResponseData?.data || (Array.isArray(bookmarksResponseData) ? bookmarksResponseData : []);
        // Security: Ensure it's an array and limit size to prevent DoS
        if (Array.isArray(bookmarksFromAPI) && bookmarksFromAPI.length > 0) {
          bookmarksArray = bookmarksFromAPI.slice(0, 1000); // Limit to 1000 items
        }
      }
      
      // Method 2: From dashboard overview (fallback)
      if (bookmarksArray.length === 0 && dashboardData) {
        const bookmarksFromDashboard = dashboardData?.overview?.bookmarks || dashboardData?.bookmarks || null;
        if (bookmarksFromDashboard) {
          const dashboardArray = Array.isArray(bookmarksFromDashboard) ? bookmarksFromDashboard : [];
          // Security: Limit array size
          bookmarksArray = dashboardArray.slice(0, 1000);
        }
      }
      
      // Security: Validate and sanitize bookmark data
      const sanitizedBookmarks = bookmarksArray.filter(b => {
        if (!b || typeof b !== 'object') return false;
        // Ensure bookmark has valid structure
        return true;
      });
      
      // Calculate unique posts bookmarked
      const uniquePostsBookmarked = new Set(sanitizedBookmarks.map(b => {
        if (!b) return null;
        const postId = b.postId || b.post?._id || b.post?.id || b._id || b.id || null;
        // Security: Validate postId format (MongoDB ObjectId)
        if (postId && typeof postId === 'string' && /^[0-9a-fA-F]{24}$/.test(postId)) {
          return postId;
        }
        return null;
      }).filter(Boolean)).size;
      
      // Always set bookmarks stats (even if 0)
      setAdditionalStats(prev => ({ 
        ...prev, 
        bookmarks: { 
          total: sanitizedBookmarks.length,
          uniquePosts: uniquePostsBookmarked,
          bookmarks: sanitizedBookmarks,
        } 
      }));
      
      // Process reading history
      if (dashboardData) {
        const readingHistory = dashboardData?.overview?.history || dashboardData?.history || null;
        
        if (readingHistory) {
          const historyArray = Array.isArray(readingHistory) ? readingHistory : [];
          setAdditionalStats(prev => ({ ...prev, readingHistory: { total: historyArray.length } }));
        }
      }

      // Process category stats
      if (categoryStatsData) {
        setAdditionalStats(prev => ({ ...prev, categoryStats: categoryStatsData }));
      }
    } catch (error) {
      console.error('Error fetching additional stats:', error);
      // Silently fail - these are supplementary stats
    }
  };

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
      const postsNeedingComments = postsData
        .filter((p) => {
          const hasCommentData =
            Array.isArray(p.comments) ||
            typeof p.commentCount === 'number' ||
            typeof p.comments === 'number';
          const isPublished =
            p.isPublished !== false &&
            (p.status === 'published' || !p.status || p.status === 'live');
          return !hasCommentData && isPublished;
        })
        .slice(0, import.meta.env.PROD ? 30 : 100); // Stricter limit in production for scalability
      
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
          onChange={(e) => {
            const newRange = e.target.value;
            // Security: Validate timeRange input
            const validatedRange = validateTimeRange(newRange);
            setTimeRange(validatedRange);
            if (validatedRange !== newRange) {
              toast.error('Invalid time range selected');
            }
          }}
          className="px-3 sm:px-4 py-2 border border-[var(--border-subtle)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent bg-[var(--surface-bg)] text-[var(--text-primary)] text-sm sm:text-base w-full sm:w-auto focus:outline-none"
        >
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
          <option value="1y">Last year</option>
          <option value="all">All Time</option>
        </select>
      </div>

      <AdvancedAnalytics 
        posts={posts} 
        timeRange={timeRange}
        additionalStats={additionalStats}
      />
    </div>
  );
};

export default AnalyticsPage;

