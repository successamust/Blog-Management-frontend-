import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FileText,
  MessageCircle,
  Heart,
  Eye,
  Share2,
  TrendingUp,
  Calendar,
  Plus,
  Lock,
  History,
  User,
  BookOpen,
  Edit,
  Folder,
  Upload,
  Image as ImageIcon,
  ArrowUpRight,
  ArrowDownRight,
  UserCheck,
  Bookmark
} from 'lucide-react';
import { format } from 'date-fns';
import { dashboardAPI, postsAPI, categoriesAPI, imagesAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import ProfileSettings from '../components/dashboard/ProfileSettings';
import AuthorApplication from '../components/dashboard/AuthorApplication';
import AnimatedCounter from '../components/common/AnimatedCounter';
import Sparkline from '../components/common/Sparkline';
import RichTextEditor from '../components/admin/RichTextEditor';
import toast from 'react-hot-toast';

const Dashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tabData, setTabData] = useState({
    posts: [],
    comments: [],
    likes: [],
    history: [],
    bookmarks: [],
  });
  const [tabLoading, setTabLoading] = useState(false);
  const { user, isAdmin } = useAuth();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    if (activeTab !== 'overview' && activeTab !== 'settings') {
      fetchTabData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const fetchTabData = async () => {
    try {
      setTabLoading(true);
      let response;
      
      switch (activeTab) {
        case 'posts':
          response = await dashboardAPI.getPosts({ limit: 20 });
          setTabData(prev => ({ ...prev, posts: response.data.posts || [] }));
          break;
        case 'comments':
          response = await dashboardAPI.getComments({ limit: 20 });
          setTabData(prev => ({ ...prev, comments: response.data.comments || [] }));
          break;
        case 'likes':
          response = await dashboardAPI.getLikes({ limit: 20 });
          setTabData(prev => ({ ...prev, likes: response.data.posts || [] }));
          break;
        case 'history':
          response = await dashboardAPI.getHistory({ limit: 20 });
          setTabData(prev => ({ ...prev, history: response.data.posts || [] }));
          break;
        case 'bookmarks':
          try {
            response = await dashboardAPI.getBookmarks({ limit: 20 });
            const bookmarkedPosts = response.data.posts || [];
            
            // If API returns empty but we have saved posts in localStorage, use fallback
            if (bookmarkedPosts.length === 0) {
              const savedPostsIds = JSON.parse(localStorage.getItem('savedPosts') || '[]');
              const userBookmarkedPosts = user?.bookmarkedPosts || [];
              const allSavedIds = [...new Set([...savedPostsIds, ...userBookmarkedPosts])];
              
              if (allSavedIds.length > 0) {
                // Fetch all posts and filter by saved IDs
                try {
                  const allPostsResponse = await postsAPI.getAll({ limit: 1000 });
                  const allPosts = allPostsResponse.data.posts || [];
                  const savedPosts = allPosts.filter(post => allSavedIds.includes(post._id));
                  setTabData(prev => ({ ...prev, bookmarks: savedPosts }));
                } catch (postsError) {
                  console.error('Error fetching posts for bookmarks:', postsError);
                  setTabData(prev => ({ ...prev, bookmarks: [] }));
                }
              } else {
                setTabData(prev => ({ ...prev, bookmarks: [] }));
              }
            } else {
              setTabData(prev => ({ ...prev, bookmarks: bookmarkedPosts }));
            }
          } catch (bookmarkError) {
            // If API fails (404 or other error), fallback to localStorage
            if (bookmarkError.response?.status === 404 || bookmarkError.response?.status >= 500) {
              const savedPostsIds = JSON.parse(localStorage.getItem('savedPosts') || '[]');
              const userBookmarkedPosts = user?.bookmarkedPosts || [];
              
              // Combine both sources of saved post IDs
              const allSavedIds = [...new Set([...savedPostsIds, ...userBookmarkedPosts])];
              
              if (allSavedIds.length > 0) {
                // Fetch all posts and filter by saved IDs
                try {
                  const allPostsResponse = await postsAPI.getAll({ limit: 1000 });
                  const allPosts = allPostsResponse.data.posts || [];
                  const savedPosts = allPosts.filter(post => allSavedIds.includes(post._id));
                  setTabData(prev => ({ ...prev, bookmarks: savedPosts }));
                } catch (postsError) {
                  console.error('Error fetching posts for bookmarks:', postsError);
                  setTabData(prev => ({ ...prev, bookmarks: [] }));
                }
              } else {
                setTabData(prev => ({ ...prev, bookmarks: [] }));
              }
            } else {
              throw bookmarkError; // Re-throw if it's not a 404/500
            }
          }
          break;
        default:
          break;
      }
    } catch (error) {
      console.error('Error fetching tab data:', error);
    } finally {
      setTabLoading(false);
    }
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await dashboardAPI.getOverview();
      
      const getActionIcon = (title) => {
        const iconMap = {
          'Browse Posts': <BookOpen className="w-5 h-5" />,
          'Liked Posts': <Heart className="w-5 h-5" />,
          'Bookmarked Posts': <Bookmark className="w-5 h-5" />,
          'My Comments': <MessageCircle className="w-5 h-5" />,
          'Create Post': <Plus className="w-5 h-5" />,
          'Manage Categories': <Folder className="w-5 h-5" />,
          'Upload Image': <Upload className="w-5 h-5" />,
        };
        return iconMap[title] || <FileText className="w-5 h-5" />;
      };

      const transformedQuickActions = (response.data.quickActions || []).map(action => {
        const pathMapping = {
          '/v1/posts': action.title === 'Create Post' ? '/admin/posts/create' : '/posts',
          '/v1/dashboard/likes': '/dashboard?tab=likes',
          '/v1/dashboard/bookmarks': '/dashboard?tab=bookmarks',
          '/v1/dashboard/comments': '/dashboard?tab=comments',
          '/v1/categories': action.title === 'Manage Categories' ? '/admin/categories' : '/categories',
          '/v1/images/upload': '/admin/posts/create',
        };
        
        if (action.title === 'Create Post' || action.title?.includes('Create')) {
          // For authors, use dashboard create post tab instead of admin route
          if (user?.role === 'author' && !isAdmin()) {
            return {
              ...action,
              path: '/dashboard?tab=create-post',
              icon: getActionIcon(action.title),
              onClick: () => setActiveTab('create-post'),
            };
          }
          return {
            ...action,
            path: '/admin/posts/create',
            icon: getActionIcon(action.title),
          };
        }
        
        return {
          ...action,
          path: pathMapping[action.path] || action.path.replace('/v1', '') || '/',
          icon: getActionIcon(action.title),
        };
      });
      
      setDashboardData({
        ...response.data,
        quickActions: transformedQuickActions,
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      console.error('Error response:', error.response);
      console.error('Error status:', error.response?.status);
      console.error('Error data:', error.response?.data);
      
      let errorMessage = 'Failed to load dashboard data';
      if (error.response?.status === 500) {
        errorMessage = 'Server error (500): The dashboard endpoint is experiencing issues. You can still access Profile Settings and other tabs.';
      } else if (error.response?.status === 404) {
        errorMessage = 'Dashboard endpoint not found. The backend may not have this endpoint implemented yet.';
      } else if (error.response?.status === 401) {
        errorMessage = 'Unauthorized. Please log in again.';
      } else if (error.response?.status === 403) {
        errorMessage = 'Access forbidden. You may not have permission to view the dashboard.';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
      
      setDashboardData({
        overview: {
          stats: {
            posts: { total: 0, published: 0 },
            comments: { total: 0, approved: 0 },
            engagement: { totalLikes: 0, totalViews: 0 }
          }
        },
        recentActivity: {
          posts: [],
          comments: [],
          likedPosts: [],
          bookmarkedPosts: []
        },
        quickActions: []
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!dashboardData && !error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Error Loading Dashboard</h1>
          <button
            onClick={fetchDashboardData}
            className="text-blue-600 hover:text-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const { overview, recentActivity, quickActions } = dashboardData || {
    overview: {
      stats: {
        posts: { total: 0, published: 0 },
        comments: { total: 0, approved: 0 },
        engagement: { totalLikes: 0, totalViews: 0 }
      }
    },
    recentActivity: {
      posts: [],
      comments: [],
      likedPosts: [],
      bookmarkedPosts: []
    },
    quickActions: []
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <TrendingUp className="w-4 h-4" /> },
    ...(user?.role === 'author' || user?.role === 'admin' ? [{ id: 'create-post', label: 'Create Post', icon: <Plus className="w-4 h-4" /> }] : []),
    { id: 'posts', label: 'My Posts', icon: <FileText className="w-4 h-4" /> },
    { id: 'comments', label: 'My Comments', icon: <MessageCircle className="w-4 h-4" /> },
    { id: 'likes', label: 'Liked Posts', icon: <Heart className="w-4 h-4" /> },
    { id: 'bookmarks', label: 'Saved Posts', icon: <Bookmark className="w-4 h-4" /> },
    { id: 'history', label: 'History', icon: <History className="w-4 h-4" /> },
    ...(user?.role !== 'author' && user?.role !== 'admin' ? [{ id: 'author', label: 'Become Author', icon: <UserCheck className="w-4 h-4" /> }] : []),
    { id: 'settings', label: 'Profile Settings', icon: <User className="w-4 h-4" /> },
  ];

  return (
    <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-2">
          Welcome back, <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">{user?.username || 'User'}</span>!
        </h1>
        <p className="text-sm sm:text-base text-slate-600">
          Here's what's happening with your content and engagement.
        </p>
      </motion.div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center mb-2">
                <span className="text-yellow-800 font-medium text-sm">
                  ⚠️ Dashboard Error
                </span>
              </div>
              <p className="text-yellow-700 text-sm">
                {error}
              </p>
              <p className="text-yellow-600 text-xs mt-2">
                You can still access other tabs like Profile Settings. Check the browser console (F12) for more details.
              </p>
            </div>
            <button
              onClick={fetchDashboardData}
              className="sm:ml-4 px-4 py-2 bg-yellow-200 text-yellow-800 rounded-lg hover:bg-yellow-300 text-sm font-medium transition-colors whitespace-nowrap"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Tabs - Premium Design */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.5 }}
        className="mb-8"
      >
        <div className="glass-card rounded-2xl p-2 overflow-x-auto">
          <nav className="flex space-x-2 min-w-max">
            {tabs.map((tab) => (
              <motion.button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`flex items-center space-x-2 py-2.5 px-4 rounded-xl font-medium text-sm transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/25'
                    : 'text-slate-600 hover:text-indigo-600 hover:bg-white/50'
                }`}
              >
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
              </motion.button>
            ))}
          </nav>
        </div>
      </motion.div>

      {activeTab === 'overview' && (
        <>
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800 text-sm">
                <strong>Note:</strong> The overview data couldn't be loaded due to a server error. 
                You can still use other tabs like Profile Settings, My Posts, etc.
              </p>
            </div>
          )}
          {/* Quick Stats - Premium Analytics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              icon={<FileText className="w-5 h-5" />}
              title="Total Posts"
              value={overview.stats.posts.total}
              change={`${overview.stats.posts.published} published`}
              color="indigo"
              trend={5}
            />
            <StatCard
              icon={<MessageCircle className="w-5 h-5" />}
              title="Comments"
              value={overview.stats.comments.total}
              change={`${overview.stats.comments.approved} approved`}
              color="emerald"
              trend={12}
            />
            <StatCard
              icon={<Heart className="w-5 h-5" />}
              title="Total Likes"
              value={overview.stats.engagement.totalLikes}
              change="Across all posts"
              color="rose"
              trend={8}
            />
            <StatCard
              icon={<Eye className="w-5 h-5" />}
              title="Total Views"
              value={overview.stats.engagement.totalViews}
              change="All time"
              color="purple"
              trend={15}
            />
          </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-4 lg:space-y-6">
          {/* Recent Posts */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="card-elevated card-elevated-hover p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900">Recent Posts</h2>
              {(isAdmin() || user?.role === 'author') && (
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <button
                    onClick={() => setActiveTab('create-post')}
                    className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:shadow-lg hover:shadow-indigo-500/25 transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    <span>New Post</span>
                  </button>
                </motion.div>
              )}
            </div>
            <div className="space-y-4">
              {recentActivity.posts && recentActivity.posts.length > 0 ? (
                recentActivity.posts.map((post) => (
                  <PostItem key={post._id} post={post} />
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No posts yet</p>
                  {(isAdmin() || user?.role === 'author') && (
                    <button
                      onClick={() => setActiveTab('create-post')}
                      className="text-blue-600 hover:text-blue-700 mt-2 inline-block"
                    >
                      Create your first post
                    </button>
                  )}
                </div>
              )}
            </div>
          </motion.div>

          {/* Recent Comments */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="card-elevated card-elevated-hover p-6"
          >
            <h2 className="text-xl font-bold text-slate-900 mb-6">Recent Comments</h2>
            <div className="space-y-4">
              {recentActivity.comments && recentActivity.comments.length > 0 ? (
                recentActivity.comments.map((comment) => (
                  <CommentItem key={comment._id} comment={comment} />
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <MessageCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No comments yet</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4 lg:space-y-6">
          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="card-elevated card-elevated-hover p-6"
          >
            <h2 className="text-xl font-bold text-slate-900 mb-4">Quick Actions</h2>
            <div className="space-y-2">
              {quickActions.map((action, index) => {
                const handleClick = (e) => {
                  if (action.path.includes('?tab=')) {
                    e.preventDefault();
                    const tab = action.path.split('tab=')[1];
                    setActiveTab(tab);
                  } else if (action.onClick) {
                    e.preventDefault();
                    action.onClick();
                  }
                };
                
                return (
                  <motion.div
                    key={index}
                    whileHover={{ x: 4 }}
                    transition={{ type: 'spring', stiffness: 300 }}
                  >
                    {action.onClick ? (
                      <button
                        onClick={handleClick}
                        className="w-full text-left p-3 rounded-lg hover:bg-white/50 transition-colors group"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="text-indigo-600 group-hover:text-indigo-700">
                            {action.icon}
                          </div>
                          <span className="font-medium text-slate-700 group-hover:text-indigo-600">
                            {action.title}
                          </span>
                        </div>
                      </button>
                    ) : (
                      <Link
                        to={action.path}
                        onClick={handleClick}
                        className="flex items-center space-x-3 p-3 rounded-xl hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 transition-all group glass-card-hover"
                      >
                        <div className="flex-shrink-0 text-slate-600 group-hover:text-indigo-600 transition-colors">
                          {action.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-slate-900 group-hover:text-indigo-600">
                            {action.title}
                          </div>
                          <div className="text-sm text-slate-500 truncate">{action.description}</div>
                        </div>
                      </Link>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </motion.div>

          {/* Liked Posts */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="card-elevated card-elevated-hover p-6"
          >
            <h2 className="text-xl font-bold text-slate-900 mb-4">Liked Posts</h2>
            <div className="space-y-3">
              {recentActivity.likedPosts && recentActivity.likedPosts.length > 0 ? (
                recentActivity.likedPosts.map((post) => (
                  <Link
                    key={post._id}
                    to={`/posts/${post.slug}`}
                    className="block p-3 rounded-lg hover:bg-gray-50 transition-colors group"
                  >
                    <h3 className="font-medium text-gray-900 group-hover:text-blue-600 line-clamp-2">
                      {post.title}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      by {post.author?.username}
                    </p>
                  </Link>
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">
                  No liked posts yet
                </p>
              )}
            </div>
          </motion.div>

          {/* Bookmarked Posts */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="card-elevated card-elevated-hover p-6"
          >
            <h2 className="text-xl font-bold text-slate-900 mb-4">Saved Posts</h2>
            <div className="space-y-3">
              {recentActivity.bookmarkedPosts && recentActivity.bookmarkedPosts.length > 0 ? (
                recentActivity.bookmarkedPosts.map((post) => (
                  <Link
                    key={post._id}
                    to={`/posts/${post.slug}`}
                    className="block p-3 rounded-lg hover:bg-gray-50 transition-colors group"
                  >
                    <h3 className="font-medium text-gray-900 group-hover:text-blue-600 line-clamp-2">
                      {post.title}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      by {post.author?.username}
                    </p>
                  </Link>
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">
                  No saved posts yet
                </p>
              )}
            </div>
          </motion.div>
        </div>
      </div>
        </>
      )}

      {activeTab === 'posts' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-elevated p-6"
        >
          <h2 className="text-2xl font-bold text-slate-900 mb-6">My Posts</h2>
          {tabLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : tabData.posts.length > 0 ? (
            <div className="space-y-4">
              {tabData.posts.map((post) => (
                <PostItem key={post._id} post={post} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No posts yet</p>
            </div>
          )}
        </motion.div>
      )}

      {activeTab === 'comments' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-elevated p-6"
        >
          <h2 className="text-2xl font-bold text-slate-900 mb-6">My Comments</h2>
          {tabLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : tabData.comments.length > 0 ? (
            <div className="space-y-4">
              {tabData.comments.map((comment) => (
                <CommentItem key={comment._id} comment={comment} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <MessageCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No comments yet</p>
            </div>
          )}
        </motion.div>
      )}

      {activeTab === 'likes' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-elevated p-6"
        >
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Liked Posts</h2>
          {tabLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : tabData.likes.length > 0 ? (
            <div className="space-y-4">
              {tabData.likes.map((post) => (
                <PostItem key={post._id} post={post} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <Heart className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No liked posts yet</p>
            </div>
          )}
        </motion.div>
      )}

      {activeTab === 'bookmarks' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-elevated p-6"
        >
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Saved Posts</h2>
          {tabLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : tabData.bookmarks.length > 0 ? (
            <div className="space-y-4">
              {tabData.bookmarks.map((post) => (
                <PostItem key={post._id} post={post} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <Bookmark className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No saved posts yet</p>
            </div>
          )}
        </motion.div>
      )}

      {activeTab === 'history' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-elevated p-6"
        >
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Activity History</h2>
          {tabLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : tabData.history.length > 0 ? (
            <div className="space-y-4">
              {tabData.history.map((post) => (
                <PostItem key={post._id} post={post} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <History className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No history yet</p>
            </div>
          )}
        </motion.div>
      )}

      {activeTab === 'create-post' && (
        <CreatePostTab />
      )}

      {activeTab === 'author' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <AuthorApplication />
        </motion.div>
      )}

      {activeTab === 'settings' && (
        <ProfileSettings />
      )}
    </div>
  );
};

const StatCard = ({ icon, title, value, change, color, trend }) => {
  const colorConfig = {
    indigo: {
      bg: 'from-indigo-500/10 to-indigo-600/5',
      icon: 'bg-indigo-500/10 text-indigo-600',
      gradient: 'from-indigo-500 to-indigo-600',
      sparkline: '#6366f1',
    },
    emerald: {
      bg: 'from-emerald-500/10 to-emerald-600/5',
      icon: 'bg-emerald-500/10 text-emerald-600',
      gradient: 'from-emerald-500 to-emerald-600',
      sparkline: '#10b981',
    },
    rose: {
      bg: 'from-rose-500/10 to-rose-600/5',
      icon: 'bg-rose-500/10 text-rose-600',
      gradient: 'from-rose-500 to-rose-600',
      sparkline: '#f43f5e',
    },
    purple: {
      bg: 'from-purple-500/10 to-purple-600/5',
      icon: 'bg-purple-500/10 text-purple-600',
      gradient: 'from-purple-500 to-purple-600',
      sparkline: '#a855f7',
    },
  };

  const config = colorConfig[color] || colorConfig.indigo;
  const isPositive = trend >= 0;

  const sparklineData = Array.from({ length: 20 }, () => 
    Math.random() * 100 + (isPositive ? 50 : 30)
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.3 }}
      className="card-elevated card-elevated-hover p-6 relative overflow-hidden group"
    >
      {/* Gradient background */}
      <div className={`absolute inset-0 bg-gradient-to-br ${config.bg} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
      
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-medium text-slate-600">{title}</p>
          <div className={`p-2.5 rounded-xl ${config.icon} transition-transform group-hover:scale-110`}>
            {icon}
          </div>
        </div>
        
        <div className="mb-3">
          <p className="text-3xl font-bold text-slate-900 mb-1">
            <AnimatedCounter value={value} />
          </p>
          <div className="flex items-center gap-2">
            <p className="text-xs text-slate-500">{change}</p>
            {trend !== undefined && (
              <div className={`flex items-center gap-1 text-xs font-medium ${
                isPositive ? 'text-emerald-600' : 'text-rose-600'
              }`}>
                {isPositive ? (
                  <ArrowUpRight className="w-3 h-3" />
                ) : (
                  <ArrowDownRight className="w-3 h-3" />
                )}
                <span>{Math.abs(trend)}%</span>
              </div>
            )}
          </div>
        </div>

        {/* Sparkline */}
        <div className="mt-4 -mx-6 -mb-6">
          <Sparkline data={sparklineData} color={config.sparkline} height={50} />
        </div>
      </div>
    </motion.div>
  );
};

const PostItem = ({ post }) => {
  const { user, isAdmin } = useAuth();
  const isAuthor = user?.role === 'author' || isAdmin();
  const isPostOwner = post.author?._id === user?._id || post.author === user?._id || isAdmin();
  
  return (
    <motion.div
      whileHover={{ x: 4 }}
      transition={{ type: 'spring', stiffness: 300 }}
      className="flex items-center justify-between p-4 rounded-xl glass-card-hover group"
    >
      <Link
        to={`/posts/${post.slug}`}
        className="flex-1 min-w-0"
      >
        <div>
          <h3 className="font-semibold text-slate-900 group-hover:text-indigo-600 truncate mb-2">
            {post.title}
          </h3>
          <div className="flex items-center space-x-4 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {format(new Date(post.publishedAt || post.createdAt), 'MMM d, yyyy')}
            </span>
            <span className="flex items-center gap-1">
              <Eye className="w-3 h-3" />
              {post.viewCount || 0}
            </span>
            <span className="flex items-center gap-1">
              <Heart className="w-3 h-3" />
              {post.likes?.length || 0}
            </span>
            {post.isPublished === false && (
              <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded text-xs">
                Draft
              </span>
            )}
          </div>
        </div>
      </Link>
      {isAuthor && isPostOwner && (
        <div className="ml-4 flex-shrink-0 flex items-center gap-2">
          <Link
            to={`/admin/posts/edit/${post._id}`}
            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
            title="Edit Post"
          >
            <Edit className="w-4 h-4" />
          </Link>
          <div className="text-slate-400 group-hover:text-indigo-600 transition-colors">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>
      )}
      {!isPostOwner && (
        <div className="ml-4 flex-shrink-0">
          <TrendingUp className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
        </div>
      )}
    </motion.div>
  );
};

const CommentItem = ({ comment }) => (
  <motion.div
    whileHover={{ x: 4 }}
    transition={{ type: 'spring', stiffness: 300 }}
    className="p-4 rounded-xl glass-card-hover"
  >
    <p className="text-slate-700 mb-3 line-clamp-2 text-sm leading-relaxed">{comment.content}</p>
    <div className="flex items-center justify-between text-xs text-slate-500">
      <Link
        to={`/posts/${comment.post?.slug}`}
        className="font-medium hover:text-indigo-600 transition-colors truncate max-w-[60%]"
      >
        {comment.post?.title}
      </Link>
      <div className="flex items-center space-x-3">
        <span className="flex items-center gap-1">
          <Heart className="w-3 h-3" />
          {comment.likes?.length || 0}
        </span>
        <span>{format(new Date(comment.createdAt), 'MMM d')}</span>
      </div>
    </div>
  </motion.div>
);

// Create Post Component for Authors
const CreatePostTab = () => {
  const [formData, setFormData] = useState({
    title: '',
    excerpt: '',
    content: '',
    category: '',
    tags: '',
    featuredImage: '',
    status: 'published',
  });
  const [categories, setCategories] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    fetchCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await categoriesAPI.getAll();
      setCategories(response.data.categories || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    setUploadingImage(true);
    try {
      const uploadFormData = new FormData();
      uploadFormData.append('image', file);
      const response = await imagesAPI.upload(uploadFormData);
      const imageUrl = response.data.image?.url || response.data.url || response.data.imageUrl;
      if (!imageUrl) {
        toast.error('Failed to get image URL from response');
        return;
      }
      setFormData(prev => ({
        ...prev,
        featuredImage: imageUrl,
      }));
      toast.success('Image uploaded successfully');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleDeleteImage = async () => {
    if (!formData.featuredImage) return;

    try {
      await imagesAPI.delete(formData.featuredImage);
      setFormData(prev => ({
        ...prev,
        featuredImage: '',
      }));
      toast.success('Image deleted successfully');
    } catch (error) {
      setFormData(prev => ({
        ...prev,
        featuredImage: '',
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const postData = {
        title: formData.title,
        excerpt: formData.excerpt,
        content: formData.content,
        category: formData.category || undefined,
        tags: formData.tags ? formData.tags.split(',').map((tag) => tag.trim()).filter(Boolean) : [],
        featuredImage: formData.featuredImage || undefined,
        isPublished: formData.status === 'published',
      };
      
      const response = await postsAPI.create(postData);
      const newPost = response.data.post || response.data;
      
      if (!newPost || !newPost._id) {
        console.error('Post creation response:', response);
        toast.error('Post created but response format unexpected. Please refresh the page.');
        return;
      }
      
      toast.success('Post created successfully');
      
      // Reset form
      setFormData({
        title: '',
        excerpt: '',
        content: '',
        category: '',
        tags: '',
        featuredImage: '',
        status: 'published',
      });
    } catch (error) {
      console.error('Error creating post:', error);
      toast.error(error.response?.data?.message || 'Failed to create post');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card-elevated p-6"
    >
      <h2 className="text-2xl font-bold text-slate-900 mb-6">Create New Post</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Excerpt</label>
          <textarea
            name="excerpt"
            value={formData.excerpt}
            onChange={handleChange}
            rows="3"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Content</label>
          <RichTextEditor
            value={formData.content}
            onChange={(value) => setFormData(prev => ({ ...prev, content: value }))}
            placeholder="Write your post content here..."
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select a category</option>
              {categories.map((cat) => (
                <option key={cat._id} value={cat._id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tags (comma-separated)</label>
            <input
              type="text"
              name="tags"
              value={formData.tags}
              onChange={handleChange}
              placeholder="tag1, tag2, tag3"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Featured Image</label>
          {formData.featuredImage ? (
            <div className="space-y-2">
              <img
                src={formData.featuredImage}
                alt="Featured"
                className="w-full h-48 object-cover rounded-lg border border-gray-300"
                onError={() => toast.error('Failed to load image')}
              />
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 truncate">{formData.featuredImage}</span>
                <button
                  type="button"
                  onClick={handleDeleteImage}
                  className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                >
                  Remove
                </button>
              </div>
            </div>
          ) : (
            <div>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={uploadingImage}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {uploadingImage && (
                <p className="text-sm text-gray-500 mt-2">Uploading image...</p>
              )}
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
          <select
            name="status"
            value={formData.status}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </select>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => {
              setFormData({
                title: '',
                excerpt: '',
                content: '',
                category: '',
                tags: '',
                featuredImage: '',
                status: 'published',
              });
            }}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            Reset
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:shadow-lg hover:shadow-indigo-500/25 transition-all disabled:opacity-50"
          >
            {submitting ? 'Creating...' : 'Create Post'}
          </button>
        </div>
      </form>
    </motion.div>
  );
};

export default Dashboard;