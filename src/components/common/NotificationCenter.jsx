import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, 
  X, 
  CheckCircle, 
  AlertCircle, 
  Info, 
  XCircle, 
  Settings, 
  Filter,
  Volume2,
  VolumeX,
  MessageCircle,
  Heart,
  Users,
  UserPlus,
  AtSign,
  FileText
} from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';
import Spinner from './Spinner';

const NotificationCenter = () => {
  const { 
    notifications, 
    unreadCount, 
    loading, 
    hasMore,
    filterType,
    setFilterType,
    settings,
    markAsRead, 
    markAsViewed,
    markAllAsRead, 
    deleteNotification, 
    clearAll,
    loadMore,
    updateSettings
  } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [hoveredNotification, setHoveredNotification] = useState(null);
  const notificationRef = useRef(null);
  const navigate = useNavigate();

  // Request notification permission
  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        // Show welcome notification
        try {
          new Notification('Nexus Notifications Enabled', {
            body: 'You\'ll now receive updates about new posts and interactions.',
            icon: '/nexus-logo-icon.svg',
            tag: 'welcome',
          });
        } catch (error) {
          console.error('Failed to show welcome notification:', error);
        }
      }
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'comment':
      case 'reply':
        return <MessageCircle className="w-5 h-5 text-blue-500" />;
      case 'like':
      case 'comment_like':
        return <Heart className="w-5 h-5 text-rose-500" />;
      case 'collaboration':
        return <Users className="w-5 h-5 text-purple-500" />;
      case 'post_published':
        return <FileText className="w-5 h-5 text-emerald-500" />;
      case 'follow':
        return <UserPlus className="w-5 h-5 text-indigo-500" />;
      case 'mention':
        return <AtSign className="w-5 h-5 text-amber-500" />;
      default:
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  // Group notifications by type and related post/comment
  const groupNotifications = (notifications) => {
    const groups = new Map();
    
    notifications.forEach(notification => {
      const key = `${notification.type}_${notification.relatedPost?._id || notification.relatedPost || 'none'}_${notification.relatedComment?._id || notification.relatedComment || 'none'}`;
      
      if (!groups.has(key)) {
        groups.set(key, {
          key,
          type: notification.type,
          relatedPost: notification.relatedPost,
          relatedComment: notification.relatedComment,
          notifications: [],
          unreadCount: 0,
          latestTime: notification.createdAt || notification.timestamp
        });
      }
      
      const group = groups.get(key);
      group.notifications.push(notification);
      if (!notification.read) {
        group.unreadCount++;
      }
      const notifTime = new Date(notification.createdAt || notification.timestamp);
      const groupTime = new Date(group.latestTime);
      if (notifTime > groupTime) {
        group.latestTime = notification.createdAt || notification.timestamp;
      }
    });
    
    return Array.from(groups.values()).sort((a, b) => 
      new Date(b.latestTime) - new Date(a.latestTime)
    );
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative" ref={notificationRef}>
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          requestNotificationPermission();
        }}
        className="relative p-2 rounded-lg hover:bg-surface-subtle transition-colors"
        aria-label="Notifications"
        aria-expanded={isOpen}
      >
        <Bell className="w-5 h-5 text-secondary" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-xs rounded-full flex items-center justify-center font-semibold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="absolute right-0 mt-2 w-[calc(100vw-2rem)] sm:w-80 md:w-96 bg-[var(--surface-bg)] rounded-xl shadow-2xl border border-[var(--border-subtle)] z-[100] max-h-[500px] flex flex-col"
            style={{
              maxWidth: 'calc(100vw - 2rem)'
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-3 sm:p-4 border-b border-[var(--border-subtle)]">
              <h3 className="font-semibold text-primary text-sm sm:text-base">Notifications</h3>
              <div className="flex items-center gap-1 sm:gap-2">
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="p-1.5 sm:p-1 hover:bg-[var(--surface-subtle)] rounded"
                  aria-label="Settings"
                  title="Notification Settings"
                >
                  <Settings className="w-4 h-4" />
                </button>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs text-[var(--accent)] hover:underline px-1 sm:px-0"
                  >
                    <span className="hidden sm:inline">Mark all read</span>
                    <span className="sm:hidden">Read all</span>
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 sm:p-1 hover:bg-[var(--surface-subtle)] rounded"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Filter and Settings */}
            <div className="px-3 sm:px-4 py-2 border-b border-[var(--border-subtle)] space-y-2">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted flex-shrink-0" />
                <select
                  value={filterType || ''}
                  onChange={(e) => setFilterType(e.target.value || null)}
                  className="flex-1 text-xs sm:text-sm bg-[var(--surface-subtle)] border border-[var(--border-subtle)] rounded px-2 sm:px-3 py-2 sm:py-1.5 focus:outline-none focus:ring-1 focus:ring-[var(--accent)] min-h-[2.5rem] sm:min-h-0 appearance-none"
                  style={{
                    WebkitAppearance: 'none',
                    MozAppearance: 'none',
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23666' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 0.5rem center',
                    backgroundSize: '12px',
                    paddingRight: '2rem'
                  }}
                >
                  <option value="">All Types</option>
                  <option value="comment">Comments</option>
                  <option value="reply">Replies</option>
                  <option value="like">Likes</option>
                  <option value="comment_like">Comment Likes</option>
                  <option value="collaboration">Collaborations</option>
                  <option value="post_published">New Posts</option>
                  <option value="follow">Follows</option>
                  <option value="mention">Mentions</option>
                </select>
              </div>
              
              {showSettings && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="pt-2 space-y-2"
                >
                  {settings ? (
                    <>
                      <div className="flex items-center justify-between text-xs sm:text-sm">
                        <span className="text-secondary">Sound Notifications</span>
                        <button
                          onClick={() => updateSettings({ soundEnabled: !settings.soundEnabled })}
                          className="p-1.5 sm:p-1 rounded hover:bg-[var(--surface-subtle)] touch-manipulation"
                          aria-label={settings.soundEnabled ? 'Disable sound' : 'Enable sound'}
                        >
                          {settings.soundEnabled ? (
                            <Volume2 className="w-4 h-4 sm:w-4 sm:h-4 text-emerald-500" />
                          ) : (
                            <VolumeX className="w-4 h-4 sm:w-4 sm:h-4 text-muted" />
                          )}
                        </button>
                      </div>
                      <div className="flex items-center justify-between text-xs sm:text-sm">
                        <span className="text-secondary">Browser Notifications</span>
                        <button
                          onClick={() => updateSettings({ browserNotificationsEnabled: !settings.browserNotificationsEnabled })}
                          className="p-1.5 sm:p-1 rounded hover:bg-[var(--surface-subtle)] touch-manipulation"
                          aria-label={settings.browserNotificationsEnabled ? 'Disable browser notifications' : 'Enable browser notifications'}
                        >
                          {settings.browserNotificationsEnabled ? (
                            <CheckCircle className="w-4 h-4 sm:w-4 sm:h-4 text-emerald-500" />
                          ) : (
                            <XCircle className="w-4 h-4 sm:w-4 sm:h-4 text-muted" />
                          )}
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="text-xs text-muted text-center py-2">
                      <Spinner size="sm" />
                    </div>
                  )}
                </motion.div>
              )}
            </div>

            {/* Notifications List */}
            <div className="overflow-y-auto flex-1">
              {loading ? (
                <div className="p-6 sm:p-8 text-center">
                  <Spinner size="md" />
                  <p className="text-xs sm:text-sm text-muted mt-3">Loading notifications...</p>
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-6 sm:p-8 text-center">
                  <Bell className="w-10 h-10 sm:w-12 sm:h-12 mx-auto text-muted mb-3 opacity-50" />
                  <p className="text-xs sm:text-sm text-muted">No notifications yet</p>
                </div>
              ) : (
                <div className="divide-y divide-[var(--border-subtle)]">
                  {groupNotifications(notifications).map((group) => {
                    const mainNotification = group.notifications[0];
                    const isGrouped = group.notifications.length > 1;
                    const groupCount = group.notifications.length;
                    
                    return (
                      <div
                        key={group.key}
                        className="relative"
                        onMouseEnter={() => setHoveredNotification(group.key)}
                        onMouseLeave={() => setHoveredNotification(null)}
                        onTouchStart={() => {
                          // Toggle on touch for mobile
                          setHoveredNotification(prev => prev === group.key ? null : group.key);
                        }}
                      >
                        <motion.div
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className={`p-3 sm:p-4 hover:bg-[var(--surface-subtle)] transition-colors cursor-pointer ${
                            group.unreadCount > 0 ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
                          }`}
                          onClick={() => {
                            group.notifications.forEach(notif => {
                              if (!notif.read) {
                                markAsRead(notif._id || notif.id);
                                markAsViewed(notif._id || notif.id);
                              }
                            });
                            if (mainNotification.type === 'collaboration') {
                              navigate('/dashboard?tab=collaborations');
                              setIsOpen(false);
                            } else if (mainNotification.type === 'follow') {
                              const username = mainNotification.sender?.username;
                              if (username) {
                                navigate(`/authors/${username}`);
                                setIsOpen(false);
                              }
                            } else if (mainNotification.relatedPost?.slug) {
                              navigate(`/posts/${mainNotification.relatedPost.slug}`);
                              setIsOpen(false);
                            }
                          }}
                        >
                          <div className="flex items-start gap-2 sm:gap-3">
                            <div className="flex-shrink-0 mt-0.5">
                              {getNotificationIcon(mainNotification.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-xs sm:text-sm font-medium text-primary break-words">
                                  {isGrouped 
                                    ? `${groupCount} ${mainNotification.type === 'comment' ? 'new comments' : mainNotification.type === 'like' ? 'new likes' : mainNotification.type === 'reply' ? 'new replies' : 'notifications'}`
                                    : mainNotification.title
                                  }
                                </p>
                                {isGrouped && group.unreadCount > 0 && (
                                  <span className="px-1.5 py-0.5 bg-rose-500 text-white text-xs rounded-full flex-shrink-0">
                                    {group.unreadCount}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-secondary mt-1 break-words line-clamp-2">
                                {isGrouped 
                                  ? `on "${(mainNotification.relatedPost?.title || 'post').substring(0, 50)}${(mainNotification.relatedPost?.title || 'post').length > 50 ? '...' : ''}"`
                                  : mainNotification.message
                                }
                              </p>
                              {isGrouped && (
                                <p className="text-xs text-muted mt-1 break-words line-clamp-1">
                                  {group.notifications.slice(0, 2).map((n, idx) => n.sender?.username).filter(Boolean).join(', ')}
                                  {groupCount > 2 && ` +${groupCount - 2} more`}
                                </p>
                              )}
                              {!isGrouped && mainNotification.sender && (
                                <p className="text-xs text-muted mt-0.5">
                                  by {mainNotification.sender.username}
                                </p>
                              )}
                              <p className="text-xs text-muted mt-1">
                                {new Date(mainNotification.createdAt || mainNotification.timestamp).toLocaleString()}
                              </p>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                group.notifications.forEach(notif => {
                                  deleteNotification(notif._id || notif.id);
                                });
                              }}
                              className="flex-shrink-0 p-1.5 sm:p-1 hover:bg-[var(--surface-subtle)] rounded touch-manipulation"
                              aria-label="Delete notification"
                            >
                              <X className="w-4 h-4 sm:w-4 sm:h-4 text-muted" />
                            </button>
                          </div>
                        </motion.div>
                        
                        {/* Hover Preview - Touch-friendly on mobile */}
                        {hoveredNotification === group.key && isGrouped && (
                          <motion.div
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="absolute left-0 right-0 sm:left-auto sm:right-auto top-full mt-1 bg-[var(--surface-bg)] border border-[var(--border-subtle)] rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto w-full sm:w-80 mx-0 sm:mx-0"
                            onClick={(e) => e.stopPropagation()}
                            style={{ maxWidth: 'calc(100vw - 4rem)' }}
                          >
                            {group.notifications.slice(0, 5).map((notif) => (
                              <div
                                key={notif._id || notif.id}
                                className="p-2.5 sm:p-3 border-b border-[var(--border-subtle)] last:border-b-0 hover:bg-[var(--surface-subtle)]"
                              >
                                <p className="text-xs sm:text-xs font-medium text-primary break-words">{notif.title}</p>
                                <p className="text-xs text-secondary mt-0.5 break-words line-clamp-2">{notif.message}</p>
                                {notif.sender && (
                                  <p className="text-xs text-muted mt-1">by {notif.sender.username}</p>
                                )}
                              </div>
                            ))}
                            {groupCount > 5 && (
                              <div className="p-2 text-center text-xs text-muted">
                                +{groupCount - 5} more
                              </div>
                            )}
                          </motion.div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="p-3 sm:p-4 border-t border-[var(--border-subtle)] space-y-2">
                {hasMore && (
                  <button
                    onClick={loadMore}
                    disabled={loading}
                    className="w-full text-xs sm:text-sm text-[var(--accent)] hover:text-[var(--accent-hover)] text-center py-2.5 sm:py-2 disabled:opacity-50 touch-manipulation"
                  >
                    {loading ? <Spinner size="sm" /> : 'Load More'}
                  </button>
                )}
                <button
                  onClick={clearAll}
                  className="w-full text-xs sm:text-sm text-rose-600 hover:text-rose-700 text-center py-2.5 sm:py-2 touch-manipulation"
                >
                  Clear all notifications
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationCenter;

