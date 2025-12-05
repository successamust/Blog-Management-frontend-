import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp, TrendingDown, Eye, Heart, MessageCircle, Share2,
  Calendar, Users, Clock, BarChart3, PieChart, LineChart, Tag
} from 'lucide-react';
import { format, subDays, subMonths } from 'date-fns';
import AnimatedCounter from '../common/AnimatedCounter';
import Sparkline from '../common/Sparkline';

const AdvancedAnalytics = ({ posts = [], timeRange = '30d', additionalStats = {} }) => {
  const [analytics, setAnalytics] = useState({
    totalViews: 0,
    totalLikes: 0,
    totalComments: 0,
    totalShares: 0,
    averageReadingTime: 0,
    engagementRate: 0,
    viewsTrend: [],
    likesTrend: [],
    topPosts: [],
    categoryDistribution: {},
    timeDistribution: {},
  });

  const calculateAnalytics = useCallback(() => {
    const filteredPosts = filterByTimeRange(Array.isArray(posts) ? posts : [], timeRange);

    const totalViews = filteredPosts.reduce((sum, p) => {
      if (!p) return sum;
      const views = Number(p.viewCount) || 0;
      return sum + (Number.isFinite(views) ? views : 0);
    }, 0);
    const totalLikes = filteredPosts.reduce((sum, p) => {
      if (!p) return sum;
      if (Array.isArray(p.likes)) return sum + (p.likes.length || 0);
      const likes = Number(p.likeCount) || 0;
      return sum + (Number.isFinite(likes) ? likes : 0);
    }, 0);
    const totalComments = filteredPosts.reduce((sum, p) => {
      if (!p) return sum;
      // Try multiple ways to get comment count
      if (Array.isArray(p.comments) && p.comments.length > 0) {
        // Count all comments including replies
        const countAllComments = (comments) => {
          if (!Array.isArray(comments) || comments.length === 0) return 0;
          return comments.reduce((total, comment) => {
            if (!comment) return total;
            const replies = Array.isArray(comment.replies) ? comment.replies : [];
            return total + 1 + countAllComments(replies);
          }, 0);
        };
        return sum + countAllComments(p.comments);
      }
      // Try various comment count fields
      const comments = Number(p.commentCount) || Number(p.comments) || 0;
      return sum + (Number.isFinite(comments) ? comments : 0);
    }, 0);
    const totalShares = filteredPosts.reduce((sum, p) => {
      if (!p) return sum;
      const shares = Number(p.shareCount) || 0;
      return sum + (Number.isFinite(shares) ? shares : 0);
    }, 0);

    const viewsTrend = generateTrendData(filteredPosts, 'viewCount', timeRange);
    const likesTrend = generateTrendData(filteredPosts, 'likes', timeRange);

    const topPosts = [...filteredPosts]
      .filter(p => p && p.title)
      .sort((a, b) => {
        const aViews = Number(a?.viewCount) || 0;
        const bViews = Number(b?.viewCount) || 0;
        return (Number.isFinite(bViews) ? bViews : 0) - (Number.isFinite(aViews) ? aViews : 0);
      })
      .slice(0, 5)
      .filter(p => p && (Number(p?.viewCount) || 0) > 0);

    const categoryDistribution = calculateCategoryDistribution(filteredPosts);
    const timeDistribution = calculateTimeDistribution(filteredPosts);

    // Calculate average reading time - include all posts
    // For posts without readingTime, calculate from content or use default
    const calculateReadingTimeForPost = (post) => {
      if (!post) return 5; // Default fallback
      
      // First try: use existing readingTime field
      if (post.readingTime !== undefined && post.readingTime !== null) {
        const readingTime = Number(post.readingTime);
        if (Number.isFinite(readingTime) && readingTime > 0) return readingTime;
      }
      
      // Second try: calculate from content length (average reading speed: 200 words per minute)
      if (post.content) {
        const content = typeof post.content === 'string' ? post.content : '';
        // Remove HTML tags for accurate word count
        const textContent = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        const wordCount = textContent.split(/\s+/).filter(word => word.length > 0).length;
        if (wordCount > 0) {
          const calculatedTime = Math.ceil(wordCount / 200); // 200 words per minute
          return Math.max(1, calculatedTime); // Minimum 1 minute
        }
      }
      
      // Third try: use excerpt if available
      if (post.excerpt) {
        const excerpt = typeof post.excerpt === 'string' ? post.excerpt : '';
        const textContent = excerpt.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        const wordCount = textContent.split(/\s+/).filter(word => word.length > 0).length;
        if (wordCount > 0) {
          const calculatedTime = Math.ceil(wordCount / 200);
          return Math.max(1, calculatedTime);
        }
      }
      
      // Default fallback
      return 5;
    };
    
    const averageReadingTime = filteredPosts.length > 0
      ? filteredPosts.reduce((sum, p) => {
          return sum + calculateReadingTimeForPost(p);
        }, 0) / filteredPosts.length
      : 0;

    const engagementRate = totalViews > 0 && Number.isFinite(totalViews)
      ? ((totalLikes + totalComments + totalShares) / totalViews) * 100
      : 0;

    setAnalytics({
      totalViews,
      totalLikes,
      totalComments,
      totalShares,
      averageReadingTime,
      engagementRate,
      viewsTrend,
      likesTrend,
      topPosts,
      categoryDistribution,
      timeDistribution,
    });
  }, [posts, timeRange]);

  useEffect(() => {
    calculateAnalytics();
  }, [calculateAnalytics]);

  const filterByTimeRange = (posts, range) => {
    if (!Array.isArray(posts)) return [];
    if (range === 'alltime') {
      return posts.filter(p => p != null);
    }

    const now = new Date();
    if (Number.isNaN(now.getTime())) return [];
    
    let cutoffDate;

    try {
      switch (range) {
        case '7d':
          cutoffDate = subDays(now, 7);
          break;
        case '30d':
          cutoffDate = subDays(now, 30);
          break;
        case '90d':
          cutoffDate = subDays(now, 90);
          break;
        case '1y':
          cutoffDate = subMonths(now, 12);
          break;
        default:
          return posts.filter(p => p != null);
      }
    } catch (error) {
      console.error('Error calculating cutoff date:', error);
      return posts.filter(p => p != null);
    }

    if (!cutoffDate || Number.isNaN(cutoffDate.getTime())) return posts.filter(p => p != null);

    return posts.filter(post => {
      if (!post) return false;
      const dateValue = post.publishedAt || post.createdAt;
      if (!dateValue) return false;
      
      const postDate = new Date(dateValue);
      if (Number.isNaN(postDate.getTime()) || !Number.isFinite(postDate.getTime())) return false;
      
      return postDate >= cutoffDate;
    });
  };

  const generateTrendData = (posts, metric, range) => {
    if (!Array.isArray(posts)) return [];
    
    if (range === 'alltime' || range === '1y') {
      // For alltime or 1y, use monthly data
      const months = range === 'alltime' ? 12 : 12;
      const data = Array(months).fill(0);
      
      posts.forEach(post => {
        if (!post) return;
        const dateValue = post.publishedAt || post.createdAt;
        if (!dateValue) return;
        
        const postDate = new Date(dateValue);
        if (Number.isNaN(postDate.getTime()) || !Number.isFinite(postDate.getTime())) return;
        
        const monthsAgo = Math.floor((Date.now() - postDate.getTime()) / (1000 * 60 * 60 * 24 * 30));
        
        if (monthsAgo >= 0 && monthsAgo < months && Number.isFinite(monthsAgo)) {
          let value = 0;
          if (metric === 'viewCount') {
            value = Number(post.viewCount) || 0;
          } else if (metric === 'likes') {
            value = Array.isArray(post.likes) ? post.likes.length : (Number(post.likeCount) || 0);
          }
          if (Number.isFinite(value) && value > 0) {
            data[months - 1 - monthsAgo] += value;
          }
        }
      });
      
      return data;
    }
    
    const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
    const data = Array(days).fill(0);

    posts.forEach(post => {
      if (!post) return;
      const dateValue = post.publishedAt || post.createdAt;
      if (!dateValue) return;
      
      const postDate = new Date(dateValue);
      if (Number.isNaN(postDate.getTime()) || !Number.isFinite(postDate.getTime())) return;
      
      const daysAgo = Math.floor((Date.now() - postDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysAgo >= 0 && daysAgo < days && Number.isFinite(daysAgo)) {
        let value = 0;
        if (metric === 'viewCount') {
          value = Number(post.viewCount) || 0;
        } else if (metric === 'likes') {
          value = Array.isArray(post.likes) ? post.likes.length : (Number(post.likeCount) || 0);
        }
        if (Number.isFinite(value) && value > 0) {
          data[days - 1 - daysAgo] += value;
        }
      }
    });

    return data;
  };

  const calculateCategoryDistribution = (posts) => {
    if (!Array.isArray(posts)) return {};
    const distribution = {};
    posts.forEach(post => {
      if (!post) return;
      const category = post.category?.name || 'Uncategorized';
      if (typeof category === 'string' && category.trim()) {
        distribution[category] = (distribution[category] || 0) + 1;
      }
    });
    return distribution;
  };

  const calculateTimeDistribution = (posts) => {
    if (!Array.isArray(posts)) {
      return { morning: 0, afternoon: 0, evening: 0, night: 0 };
    }
    
    const distribution = {
      morning: 0,
      afternoon: 0,
      evening: 0,
      night: 0,
    };

    posts.forEach(post => {
      if (!post) return;
      const dateValue = post.publishedAt || post.createdAt;
      if (!dateValue) return;
      
      const date = new Date(dateValue);
      if (Number.isNaN(date.getTime()) || !Number.isFinite(date.getTime())) return;
      
      const hour = date.getHours();
      if (!Number.isFinite(hour)) return;
      
      if (hour >= 6 && hour < 12) distribution.morning++;
      else if (hour >= 12 && hour < 18) distribution.afternoon++;
      else if (hour >= 18 && hour < 22) distribution.evening++;
      else distribution.night++;
    });

    return distribution;
  };

  const stats = [
    {
      label: 'Total Views',
      value: analytics.totalViews,
      icon: Eye,
      color: 'text-blue-500',
      trend: analytics.viewsTrend,
    },
    {
      label: 'Total Likes',
      value: analytics.totalLikes,
      icon: Heart,
      color: 'text-red-500',
      trend: analytics.likesTrend,
    },
    {
      label: 'Total Comments',
      value: analytics.totalComments,
      icon: MessageCircle,
      color: 'text-green-500',
    },
    {
      label: 'Total Shares',
      value: analytics.totalShares,
      icon: Share2,
      color: 'text-purple-500',
    },
    {
      label: 'Engagement Rate',
      value: `${analytics.engagementRate.toFixed(1)}%`,
      icon: TrendingUp,
      color: 'text-amber-500',
    },
    {
      label: 'Avg Reading Time',
      value: `${Math.round(analytics.averageReadingTime)} min`,
      icon: Clock,
      color: 'text-indigo-500',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-[var(--surface-bg)] rounded-xl p-4 sm:p-6 border border-[var(--border-subtle)]"
            >
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <div className={`p-2 sm:p-3 rounded-lg bg-${stat.color.split('-')[1]}-100 dark:bg-${stat.color.split('-')[1]}-900/20`}>
                  <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${stat.color}`} />
                </div>
                {stat.trend && (
                  <div className="hidden sm:block">
                    <Sparkline data={stat.trend} color={stat.color} />
                  </div>
                )}
              </div>
              <p className="text-xs sm:text-sm text-muted mb-1">{stat.label}</p>
              <p className="text-xl sm:text-2xl font-bold text-primary">
                {typeof stat.value === 'number' ? (
                  <AnimatedCounter key={`${stat.label}-${stat.value}-${timeRange}`} value={stat.value} />
                ) : (
                  stat.value
                )}
              </p>
            </motion.div>
          );
        })}
      </div>

      {/* Top Posts */}
      {analytics.topPosts.length > 0 && (
        <div className="bg-[var(--surface-bg)] rounded-xl p-4 sm:p-6 border border-[var(--border-subtle)]">
          <h3 className="text-base sm:text-lg font-semibold text-primary mb-3 sm:mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5" />
            Top Performing Posts
          </h3>
          <div className="space-y-2 sm:space-y-3">
            {analytics.topPosts.map((post, index) => (
              <div key={post._id} className="flex items-center justify-between p-2 sm:p-3 bg-surface-subtle rounded-lg gap-2">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                  <span className="text-base sm:text-lg font-bold text-[var(--accent)] flex-shrink-0">#{index + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-primary line-clamp-1 text-sm sm:text-base">{post.title}</p>
                    <p className="text-xs text-muted">{post.viewCount || 0} views</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Category Distribution */}
      {Object.keys(analytics.categoryDistribution).length > 0 && (
        <div className="bg-[var(--surface-bg)] rounded-xl p-4 sm:p-6 border border-[var(--border-subtle)]">
          <h3 className="text-base sm:text-lg font-semibold text-primary mb-3 sm:mb-4 flex items-center gap-2">
            <PieChart className="w-4 h-4 sm:w-5 sm:h-5" />
            Category Distribution
          </h3>
          <div className="space-y-2">
            {Object.entries(analytics.categoryDistribution).map(([category, count]) => (
              <div key={category}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-secondary">{category}</span>
                  <span className="text-sm font-medium text-primary">{count}</span>
                </div>
                <div className="w-full bg-[var(--surface-subtle)] rounded-full h-2">
                  <div
                    className="bg-[var(--accent)] h-2 rounded-full"
                    style={{
                      width: `${Array.isArray(posts) && posts.length > 0 ? (count / posts.length) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Time-based Distribution */}
      {Object.keys(analytics.timeDistribution).length > 0 && (
        <div className="bg-[var(--surface-bg)] rounded-xl p-4 sm:p-6 border border-[var(--border-subtle)]">
          <h3 className="text-base sm:text-lg font-semibold text-primary mb-3 sm:mb-4 flex items-center gap-2">
            <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
            Publishing Time Distribution
          </h3>
          <div className="space-y-2 sm:space-y-3">
            {[
              { label: 'Morning (6 AM - 12 PM)', key: 'morning', color: 'bg-yellow-500' },
              { label: 'Afternoon (12 PM - 6 PM)', key: 'afternoon', color: 'bg-orange-500' },
              { label: 'Evening (6 PM - 10 PM)', key: 'evening', color: 'bg-blue-500' },
              { label: 'Night (10 PM - 6 AM)', key: 'night', color: 'bg-purple-500' },
            ].map(({ label, key, color }) => {
              const count = analytics.timeDistribution[key] || 0;
              const total = Object.values(analytics.timeDistribution).reduce((sum, val) => sum + val, 0);
              const percentage = total > 0 ? (count / total) * 100 : 0;
              
              return (
                <div key={key}>
                  <div className="flex items-center justify-between mb-1 gap-2">
                    <span className="text-xs sm:text-sm text-secondary break-words flex-1">{label}</span>
                    <span className="text-xs sm:text-sm font-medium text-primary flex-shrink-0">{count} posts</span>
                  </div>
                  <div className="w-full bg-[var(--surface-subtle)] rounded-full h-3">
                    <div
                      className={`${color} h-3 rounded-full transition-all`}
                      style={{
                        width: `${percentage}%`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Additional Stats Section */}
      {(additionalStats.polls || additionalStats.search || additionalStats.bookmarks || additionalStats.readingHistory || additionalStats.categoryStats) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Polls Stats */}
          {additionalStats.polls && additionalStats.polls.total > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-[var(--surface-bg)] rounded-xl p-4 sm:p-6 border border-[var(--border-subtle)]"
            >
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-5 h-5 text-purple-500" />
                <h4 className="text-sm sm:text-base font-semibold text-primary">Polls</h4>
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-primary">{additionalStats.polls.total}</p>
              <p className="text-xs sm:text-sm text-muted mt-1">Total polls • {additionalStats.polls.totalVotes || 0} votes</p>
            </motion.div>
          )}

          {/* Bookmarks Stats */}
          {additionalStats.bookmarks && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-[var(--surface-bg)] rounded-xl p-4 sm:p-6 border border-[var(--border-subtle)]"
            >
              <div className="flex items-center gap-2 mb-3">
                <Share2 className="w-5 h-5 text-amber-500" />
                <h4 className="text-sm sm:text-base font-semibold text-primary">Bookmarks</h4>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-2xl sm:text-3xl font-bold text-primary">{additionalStats.bookmarks.total || 0}</p>
                  <p className="text-xs sm:text-sm text-muted mt-1">Total bookmarks</p>
                </div>
                {additionalStats.bookmarks.uniquePosts !== undefined && (
                  <div>
                    <p className="text-2xl sm:text-3xl font-bold text-primary">{additionalStats.bookmarks.uniquePosts || 0}</p>
                    <p className="text-xs sm:text-sm text-muted mt-1">Unique posts</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Reading History Stats */}
          {additionalStats.readingHistory && additionalStats.readingHistory.total > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-[var(--surface-bg)] rounded-xl p-4 sm:p-6 border border-[var(--border-subtle)]"
            >
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-5 h-5 text-indigo-500" />
                <h4 className="text-sm sm:text-base font-semibold text-primary">Reading History</h4>
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-primary">{additionalStats.readingHistory.total}</p>
              <p className="text-xs sm:text-sm text-muted mt-1">Total reads</p>
            </motion.div>
          )}

          {/* Popular Tags */}
          {additionalStats.search && additionalStats.search.popularTags && additionalStats.search.popularTags.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-[var(--surface-bg)] rounded-xl p-4 sm:p-6 border border-[var(--border-subtle)] sm:col-span-2 lg:col-span-1"
            >
              <div className="flex items-center gap-2 mb-3">
                <Tag className="w-5 h-5 text-green-500" />
                <h4 className="text-sm sm:text-base font-semibold text-primary">Popular Tags</h4>
              </div>
              <div className="flex flex-wrap gap-2">
                {additionalStats.search.popularTags.slice(0, 8).map((tag, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-[var(--accent)]/10 text-[var(--accent)] rounded-full text-xs font-medium"
                  >
                    {typeof tag === 'string' ? tag : tag.name || tag.tag || 'Unknown'}
                  </span>
                ))}
              </div>
            </motion.div>
          )}

          {/* Category Stats */}
          {additionalStats.categoryStats && additionalStats.categoryStats.totalCategories !== undefined && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="bg-[var(--surface-bg)] rounded-xl p-4 sm:p-6 border border-[var(--border-subtle)]"
            >
              <div className="flex items-center gap-2 mb-3">
                <PieChart className="w-5 h-5 text-blue-500" />
                <h4 className="text-sm sm:text-base font-semibold text-primary">Categories</h4>
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-primary">{additionalStats.categoryStats.totalCategories}</p>
              <p className="text-xs sm:text-sm text-muted mt-1">Total categories</p>
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdvancedAnalytics;

