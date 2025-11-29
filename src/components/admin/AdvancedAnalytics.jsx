import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp, TrendingDown, Eye, Heart, MessageCircle, Share2,
  Calendar, Users, Clock, BarChart3, PieChart, LineChart
} from 'lucide-react';
import { format, subDays, subMonths } from 'date-fns';
import AnimatedCounter from '../common/AnimatedCounter';
import Sparkline from '../common/Sparkline';

const AdvancedAnalytics = ({ posts = [], timeRange = '30d' }) => {
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

  useEffect(() => {
    calculateAnalytics();
  }, [posts, timeRange]);

  const calculateAnalytics = () => {
    const filteredPosts = filterByTimeRange(posts, timeRange);

    const totalViews = filteredPosts.reduce((sum, p) => sum + (p.viewCount || 0), 0);
    const totalLikes = filteredPosts.reduce((sum, p) => {
      if (Array.isArray(p.likes)) return sum + p.likes.length;
      return sum + (p.likeCount || 0);
    }, 0);
    const totalComments = filteredPosts.reduce((sum, p) => {
      // Try multiple ways to get comment count
      if (Array.isArray(p.comments)) {
        // Count all comments including replies
        const countAllComments = (comments) => {
          return comments.reduce((total, comment) => {
            return total + 1 + (comment.replies ? countAllComments(comment.replies) : 0);
          }, 0);
        };
        return sum + countAllComments(p.comments);
      }
      // Try various comment count fields
      if (typeof p.commentCount === 'number') return sum + p.commentCount;
      if (typeof p.comments === 'number') return sum + p.comments;
      if (p.comments && typeof p.comments === 'object' && p.comments.length !== undefined) {
        return sum + p.comments.length;
      }
      return sum;
    }, 0);
    const totalShares = filteredPosts.reduce((sum, p) => sum + (p.shareCount || 0), 0);

    const viewsTrend = generateTrendData(filteredPosts, 'viewCount', timeRange);
    const likesTrend = generateTrendData(filteredPosts, 'likes', timeRange);

    const topPosts = [...filteredPosts]
      .sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0))
      .slice(0, 5);

    const categoryDistribution = calculateCategoryDistribution(filteredPosts);
    const timeDistribution = calculateTimeDistribution(filteredPosts);

    const averageReadingTime = filteredPosts.length > 0
      ? filteredPosts.reduce((sum, p) => sum + (p.readingTime || 5), 0) / filteredPosts.length
      : 0;

    const engagementRate = totalViews > 0
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
  };

  const filterByTimeRange = (posts, range) => {
    if (range === 'alltime') {
      return posts;
    }

    const now = new Date();
    let cutoffDate;

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
        return posts;
    }

    return posts.filter(post => {
      const postDate = new Date(post.publishedAt || post.createdAt);
      return postDate >= cutoffDate;
    });
  };

  const generateTrendData = (posts, metric, range) => {
    if (range === 'alltime' || range === '1y') {
      // For alltime or 1y, use monthly data
      const months = range === 'alltime' ? 12 : 12;
      const data = Array(months).fill(0);
      
      posts.forEach(post => {
        const postDate = new Date(post.publishedAt || post.createdAt);
        const monthsAgo = Math.floor((Date.now() - postDate.getTime()) / (1000 * 60 * 60 * 24 * 30));
        
        if (monthsAgo >= 0 && monthsAgo < months) {
          let value = 0;
          if (metric === 'viewCount') {
            value = post.viewCount || 0;
          } else if (metric === 'likes') {
            value = Array.isArray(post.likes) ? post.likes.length : (post.likeCount || 0);
          }
          data[months - 1 - monthsAgo] += value;
        }
      });
      
      return data;
    }
    
    const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
    const data = Array(days).fill(0);

    posts.forEach(post => {
      const postDate = new Date(post.publishedAt || post.createdAt);
      const daysAgo = Math.floor((Date.now() - postDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysAgo >= 0 && daysAgo < days) {
        let value = 0;
        if (metric === 'viewCount') {
          value = post.viewCount || 0;
        } else if (metric === 'likes') {
          value = Array.isArray(post.likes) ? post.likes.length : (post.likeCount || 0);
        }
        data[days - 1 - daysAgo] += value;
      }
    });

    return data;
  };

  const calculateCategoryDistribution = (posts) => {
    const distribution = {};
    posts.forEach(post => {
      const category = post.category?.name || 'Uncategorized';
      distribution[category] = (distribution[category] || 0) + 1;
    });
    return distribution;
  };

  const calculateTimeDistribution = (posts) => {
    const distribution = {
      morning: 0,
      afternoon: 0,
      evening: 0,
      night: 0,
    };

    posts.forEach(post => {
      const date = new Date(post.publishedAt || post.createdAt);
      const hour = date.getHours();
      
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
                  <AnimatedCounter value={stat.value} />
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
                      width: `${(count / posts.length) * 100}%`,
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
    </div>
  );
};

export default AdvancedAnalytics;

