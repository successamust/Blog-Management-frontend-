import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Eye, Heart, MessageCircle, Bookmark, Share2, FileText, 
  Calendar, Filter, Clock 
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { useAuth } from '../../context/AuthContext';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { useReadingHistory } from '../../hooks/useReadingHistory';
import { Link } from 'react-router-dom';

const UserActivityFeed = ({ userId, limit = 50 }) => {
  const { user: currentUser } = useAuth();
  const { history } = useReadingHistory();
  const [activities, setActivities] = useLocalStorage('userActivities', []);
  const [filter, setFilter] = useState('all');
  const [filteredActivities, setFilteredActivities] = useState([]);

  useEffect(() => {
    // Combine reading history with other activities
    const readingActivities = history.map(item => ({
      type: 'read',
      postId: item.postId,
      slug: item.slug,
      title: item.title,
      timestamp: item.lastRead || item.timestamp,
      icon: Eye,
      color: 'text-blue-500',
    }));

    const allActivities = [...activities, ...readingActivities]
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit);

    setFilteredActivities(allActivities);
  }, [activities, history, limit]);

  useEffect(() => {
    if (filter === 'all') {
      setFilteredActivities(activities);
    } else {
      setFilteredActivities(activities.filter(a => a.type === filter));
    }
  }, [filter, activities]);

  const getActivityIcon = (type) => {
    switch (type) {
      case 'read': return Eye;
      case 'like': return Heart;
      case 'comment': return MessageCircle;
      case 'bookmark': return Bookmark;
      case 'share': return Share2;
      default: return FileText;
    }
  };

  const getActivityLabel = (activity) => {
    switch (activity.type) {
      case 'read': return 'Read';
      case 'like': return 'Liked';
      case 'comment': return 'Commented on';
      case 'bookmark': return 'Bookmarked';
      case 'share': return 'Shared';
      default: return 'Viewed';
    }
  };

  const filters = [
    { value: 'all', label: 'All Activity' },
    { value: 'read', label: 'Reading' },
    { value: 'like', label: 'Likes' },
    { value: 'comment', label: 'Comments' },
    { value: 'bookmark', label: 'Bookmarks' },
    { value: 'share', label: 'Shares' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-primary flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Activity Feed
        </h3>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted" />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="text-sm border border-[var(--border-subtle)] rounded-lg px-3 py-1"
          >
            {filters.map(f => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
        </div>
      </div>

      {filteredActivities.length === 0 ? (
        <div className="p-8 text-center bg-surface-subtle rounded-xl">
          <Clock className="w-12 h-12 mx-auto text-muted mb-3 opacity-50" />
          <p className="text-sm text-muted">No activity yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredActivities.map((activity, index) => {
            const Icon = getActivityIcon(activity.type);
            return (
              <motion.div
                key={`${activity.type}-${activity.postId}-${index}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-start gap-3 p-3 bg-surface-subtle rounded-lg hover:bg-surface transition-colors"
              >
                <div className={`p-2 rounded-lg bg-${activity.color || 'blue'}-100 dark:bg-${activity.color || 'blue'}-900/20`}>
                  <Icon className={`w-4 h-4 ${activity.color || 'text-blue-500'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-primary">
                      {getActivityLabel(activity)}
                    </span>
                    <span className="text-xs text-muted">
                      {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                    </span>
                  </div>
                  {activity.title && (
                    <Link
                      to={`/posts/${activity.slug || activity.postId}`}
                      className="text-sm text-secondary hover:text-[var(--accent)] line-clamp-2"
                    >
                      {activity.title}
                    </Link>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default UserActivityFeed;

