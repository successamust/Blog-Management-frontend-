import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
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
  Bookmark,
  PenLine,
  MessageSquare,
  HeartHandshake,
  LineChart,
  Users,
  BarChart,
  BarChart3,
  X
} from 'lucide-react';
import { format } from 'date-fns';
import { dashboardAPI, postsAPI, categoriesAPI, imagesAPI, pollsAPI, adminAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import ProfileSettings from '../components/dashboard/ProfileSettings';
import AuthorApplication from '../components/dashboard/AuthorApplication';
import CollaborationsDashboard from '../components/dashboard/CollaborationsDashboard';
import AnimatedCounter from '../components/common/AnimatedCounter';
import Sparkline from '../components/common/Sparkline';
import RichTextEditor from '../components/admin/RichTextEditor';
import PostTemplates from '../components/admin/PostTemplates';
import PostScheduler from '../components/admin/PostScheduler';
import SkeletonLoader from '../components/common/SkeletonLoader';
import toast from 'react-hot-toast';
import Spinner from '../components/common/Spinner';
import Seo, { DEFAULT_OG_IMAGE } from '../components/common/Seo';
import PollAnalytics from '../components/admin/PollAnalytics';

const DASHBOARD_DESCRIPTION = 'Manage your Nexus profile, author tools, analytics, and saved posts from one workspace.';
const DASHBOARD_TAB_LABELS = {
  overview: 'Overview',
  posts: 'Posts',
  comments: 'Comments',
  likes: 'Likes',
  history: 'Reading History',
  bookmarks: 'Bookmarks',
  collaborations: 'Collaborations',
  settings: 'Settings',
};

const Dashboard = () => {
  const [searchParams, setSearchParams] = useSearchParams();
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
  const [showPollAnalytics, setShowPollAnalytics] = useState(null);
  const { user, isAdmin } = useAuth();
  const { addNotification } = useNotifications();

  const tabLabel = DASHBOARD_TAB_LABELS[activeTab] || 'Overview';
  const queryString = searchParams.toString();
  const seoTitle = tabLabel === 'Overview' ? 'Dashboard' : `Dashboard — ${tabLabel}`;
  const seoDescription = `${tabLabel === 'Overview' ? 'At-a-glance insights.' : `${tabLabel} tools.`} ${DASHBOARD_DESCRIPTION}`;
  const seoUrl = queryString ? `/dashboard?${queryString}` : '/dashboard';
  const seoNode = (
    <Seo
      title={seoTitle}
      description={seoDescription}
      url={seoUrl}
      image={DEFAULT_OG_IMAGE}
    />
  );

  // Read tab from URL query parameter on mount
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    if (activeTab !== 'overview' && activeTab !== 'settings' && activeTab !== 'collaborations') {
      fetchTabData();
    }
  }, [activeTab]);

  // Fetch posts count if overview data doesn't include it
  useEffect(() => {
    const fetchPostsCount = async () => {
      // Only fetch if we don't have total posts and we're on overview tab
      if (activeTab === 'overview' && dashboardData && (!dashboardData.overview?.stats?.posts?.total || dashboardData.overview?.stats?.posts?.total === 0)) {
        try {
          const response = await dashboardAPI.getPosts({ limit: 1000 });
          const allPosts = response.data.posts || [];
          
          // Filter to user's own posts if author
          let userPosts = allPosts;
          if (user?.role === 'author' && !isAdmin()) {
            const userId = user?._id || user?.id;
            userPosts = allPosts.filter(post => {
              const postAuthorId = post.author?._id || post.author || post.authorId;
              return postAuthorId && userId && String(postAuthorId) === String(userId);
            });
          }
          
          // Update dashboard data with calculated counts
          if (userPosts.length > 0) {
            setDashboardData(prev => ({
              ...prev,
              overview: {
                ...prev.overview,
                stats: {
                  ...prev.overview?.stats,
                  posts: {
                    total: userPosts.length,
                    published: userPosts.filter(p => p.isPublished !== false).length,
                  }
                }
              }
            }));
          }
        } catch (error) {
          // Silently fail - we already have fallback logic
          console.error('Error fetching posts count:', error);
        }
      }
    };
    
    // Add a small delay on mobile to ensure proper rendering
    const timer = setTimeout(() => {
      fetchPostsCount();
    }, typeof window !== 'undefined' && window.innerWidth < 768 ? 100 : 0);
    
    return () => clearTimeout(timer);
  }, [activeTab, dashboardData, user, isAdmin]);

  const fetchTabData = async () => {
    try {
      setTabLoading(true);
      let response;
      
      switch (activeTab) {
        case 'posts': {
          response = await dashboardAPI.getPosts({ limit: 1000 });
          const allPosts = response.data.posts || [];
          const userId = user?._id || user?.id;
          
          // Filter posts where user is author OR collaborator
          const userPosts = allPosts.filter(post => {
            const postAuthorId = post.author?._id || post.author || post.authorId;
            const isAuthor = postAuthorId && userId && String(postAuthorId) === String(userId);
            
            // Check if user is a collaborator (handle both populated and unpopulated formats)
            const isCollaborator = post.collaborators?.some(collab => {
              const collabUserId = collab.user?._id || collab.user || collab.userId || collab.user;
              return collabUserId && userId && String(collabUserId) === String(userId);
            });
            
            return isAuthor || isCollaborator;
          });
          
          // If no posts found but user might be a collaborator, try fetching posts with collaborator info
          if (userPosts.length === 0) {
            try {
              const postsResponse = await postsAPI.getAll({ limit: 1000, includeDrafts: true });
              const allPostsWithCollabs = postsResponse.data.posts || [];
              
              const postsWithUserAsCollaborator = allPostsWithCollabs.filter(post => {
                const postAuthorId = post.author?._id || post.author || post.authorId;
                const isAuthor = postAuthorId && userId && String(postAuthorId) === String(userId);
                
                const isCollaborator = post.collaborators?.some(collab => {
                  const collabUserId = collab.user?._id || collab.user || collab.userId || collab.user;
                  return collabUserId && userId && String(collabUserId) === String(userId);
                });
                
                return isAuthor || isCollaborator;
              });
              
              if (postsWithUserAsCollaborator.length > 0) {
                setTabData(prev => ({ ...prev, posts: postsWithUserAsCollaborator }));
                return;
              }
            } catch (error) {
              // Silently fail, use empty array
            }
          }
          
          setTabData(prev => ({ ...prev, posts: userPosts }));
          break;
        }
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
      <>
        {seoNode}
        <div className="min-h-screen flex items-center justify-center">
          <Spinner size="3xl" />
        </div>
      </>
    );
  }

  if (!dashboardData && !error) {
    return (
      <>
        {seoNode}
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
          <h1 className="text-2xl font-bold text-primary mb-4">Error Loading Dashboard</h1>
            <button
              onClick={fetchDashboardData}
              className="text-[var(--accent)] hover:text-[var(--accent-hover)]"
            >
              Try Again
            </button>
          </div>
        </div>
      </>
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

  // Safely access nested properties with fallbacks
  let postsTotal = overview?.stats?.posts?.total ?? 0;
  let postsPublished = overview?.stats?.posts?.published ?? 0;
  const commentsTotal = overview?.stats?.comments?.total ?? 0;
  const commentsApproved = overview?.stats?.comments?.approved ?? 0;
  const totalLikes = overview?.stats?.engagement?.totalLikes ?? 0;
  const totalViews = overview?.stats?.engagement?.totalViews ?? 0;
  const recentPosts = recentActivity?.posts ?? [];
  const recentComments = recentActivity?.comments ?? [];
  const likedPosts = recentActivity?.likedPosts ?? [];
  const bookmarkedPosts = recentActivity?.bookmarkedPosts ?? [];

  // Fallback: Calculate total posts from recent posts if backend doesn't return it
  // This is especially important for authors who should see their own post count
  if (postsTotal === 0 && recentPosts.length > 0) {
    // Filter to user's own posts if author
    if (user?.role === 'author' && !isAdmin()) {
      const userId = user?._id || user?.id;
      const userPosts = recentPosts.filter(post => {
        const postAuthorId = post.author?._id || post.author || post.authorId;
        return postAuthorId && userId && String(postAuthorId) === String(userId);
      });
      postsTotal = userPosts.length;
      postsPublished = userPosts.filter(p => p.isPublished !== false).length;
    } else {
      postsTotal = recentPosts.length;
      postsPublished = recentPosts.filter(p => p.isPublished !== false).length;
    }
  }

  // If still 0, try to get from tabData.posts (if already loaded)
  if (postsTotal === 0 && tabData.posts.length > 0) {
    if (user?.role === 'author' && !isAdmin()) {
      const userId = user?._id || user?.id;
      const userPosts = tabData.posts.filter(post => {
        const postAuthorId = post.author?._id || post.author || post.authorId;
        return postAuthorId && userId && String(postAuthorId) === String(userId);
      });
      postsTotal = userPosts.length;
      postsPublished = userPosts.filter(p => p.isPublished !== false).length;
    } else {
      postsTotal = tabData.posts.length;
      postsPublished = tabData.posts.filter(p => p.isPublished !== false).length;
    }
  }

  const tabs = [
    { id: 'overview', label: 'Overview', mobileLabel: 'Overview', icon: <TrendingUp className="w-4 h-4" /> },
    ...(user?.role === 'author' || user?.role === 'admin' ? [{ id: 'create-post', label: 'Create Post', mobileLabel: 'Create', icon: <Plus className="w-4 h-4" /> }] : []),
    { id: 'posts', label: 'My Posts', mobileLabel: 'Posts', icon: <FileText className="w-4 h-4" /> },
    { id: 'comments', label: 'My Comments', mobileLabel: 'Comments', icon: <MessageCircle className="w-4 h-4" /> },
    { id: 'likes', label: 'Liked Posts', mobileLabel: 'Liked', icon: <Heart className="w-4 h-4" /> },
    { id: 'bookmarks', label: 'Saved Posts', mobileLabel: 'Saved', icon: <Bookmark className="w-4 h-4" /> },
    { id: 'history', label: 'History', mobileLabel: 'History', icon: <History className="w-4 h-4" /> },
    // Show collaborations tab for all authenticated users (component handles visibility based on invitations)
    { id: 'collaborations', label: 'Collaborations', mobileLabel: 'Collab', icon: <Users className="w-4 h-4" /> },
    ...(user?.role !== 'author' && user?.role !== 'admin' ? [{ id: 'author', label: 'Become Author', mobileLabel: 'Author', icon: <UserCheck className="w-4 h-4" /> }] : []),
    { id: 'settings', label: 'Profile Settings', mobileLabel: 'Settings', icon: <User className="w-4 h-4" /> },
  ];

  return (
    <>
      {seoNode}
      <div className="bg-page min-h-screen">
    <div className="layout-container-wide py-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <h1 className="text-3xl sm:text-4xl font-bold text-primary mb-2">
          Welcome back, <span className="bg-gradient-to-r from-[var(--accent)] via-[#189112] to-[var(--accent-hover)] bg-clip-text text-transparent">{user?.username || 'User'}</span>!
        </h1>
        <p className="text-sm sm:text-base text-muted">
          Here&rsquo;s what&rsquo;s happening with your content and engagement.
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
        <div className="surface-card rounded-2xl p-2 overflow-x-auto">
          <nav className="flex space-x-2 min-w-max">
            {tabs.map((tab) => (
              <motion.button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setSearchParams({ tab: tab.id });
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`flex items-center space-x-1 sm:space-x-2 py-2 sm:py-2.5 px-2 sm:px-4 rounded-xl font-medium text-xs sm:text-sm transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-[var(--accent)] text-white shadow-[0_16px_35px_rgba(26,137,23,0.25)] hover:text-white'
                    : 'text-secondary hover:text-[var(--accent)] hover:bg-surface-subtle'
                }`}
              >
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.mobileLabel || tab.label}</span>
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
                <strong>Note:</strong> The overview data couldn&rsquo;t be loaded due to a server error. 
                You can still use other tabs like Profile Settings, My Posts, etc.
              </p>
            </div>
          )}
          {/* Quick Stats - Premium Analytics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              icon={<PenLine className="w-5 h-5" />}
              title="Total Posts"
              value={postsTotal}
              change={`${postsPublished} published`}
              color="accent"
              trend={5}
            />
            <StatCard
              icon={<MessageSquare className="w-5 h-5" />}
              title="Comments"
              value={commentsTotal}
              change={`${commentsApproved} approved`}
              color="emerald"
              trend={12}
            />
            <StatCard
              icon={<HeartHandshake className="w-5 h-5" />}
              title="Total Likes"
              value={totalLikes}
              change="Across all posts"
              color="rose"
              trend={8}
            />
            <StatCard
              icon={<LineChart className="w-5 h-5" />}
              title="Total Views"
              value={totalViews}
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
            className="surface-card p-6 transition-colors hover:border-[var(--border-subtle)]"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-primary">Recent Posts</h2>
              {(isAdmin() || user?.role === 'author') && (
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <button
                    onClick={() => setActiveTab('create-post')}
                    className="btn btn-primary !w-auto shadow-[0_12px_28px_rgba(26,137,23,0.2)]"
                  >
                    <Plus className="w-4 h-4" />
                    <span>New Post</span>
                  </button>
                </motion.div>
              )}
            </div>
            <div className="space-y-4">
              {recentPosts && recentPosts.length > 0 ? (
                recentPosts.map((post) => (
                  <PostItem key={post._id} post={post} onShowPollAnalytics={setShowPollAnalytics} />
                ))
              ) : (
                <div className="text-center py-8 text-muted">
                  <FileText className="w-12 h-12 mx-auto mb-4 text-muted" />
                  <p>No posts yet</p>
                  {(isAdmin() || user?.role === 'author') && (
                    <button
                      onClick={() => setActiveTab('create-post')}
                      className="btn btn-link mt-2 inline-flex items-center gap-2"
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
            className="surface-card p-6 transition-colors hover:border-[var(--border-subtle)]"
          >
            <h2 className="text-xl font-bold text-primary mb-6">Recent Comments</h2>
            <div className="space-y-4">
              {recentComments && recentComments.length > 0 ? (
                recentComments.map((comment) => (
                  <CommentItem key={comment._id} comment={comment} />
                ))
              ) : (
                <div className="text-center py-8 text-muted">
                  <MessageCircle className="w-12 h-12 mx-auto mb-4 text-muted" />
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
            className="surface-card p-6 transition-colors hover:border-[var(--border-subtle)]"
          >
            <h2 className="text-xl font-bold text-primary mb-4">Quick Actions</h2>
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
                        className="w-full text-left p-3 rounded-lg surface-card transition-colors hover:border-[var(--border-subtle)] group"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="text-[var(--accent)] group-hover:text-[var(--accent-hover)]">
                            {action.icon}
                          </div>
                          <span className="font-medium text-secondary group-hover:text-[var(--accent)]">
                            {action.title}
                          </span>
                        </div>
                      </button>
                    ) : (
                      <Link
                        to={action.path}
                        onClick={handleClick}
                        className="flex items-center space-x-3 p-3 rounded-xl surface-card transition-colors hover:border-[var(--border-subtle)] group"
                      >
                        <div className="flex-shrink-0 text-secondary group-hover:text-[var(--accent)] transition-colors">
                          {action.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-primary group-hover:text-[var(--accent)]">
                            {action.title}
                          </div>
                          <div className="text-sm text-muted truncate">{action.description}</div>
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
            className="surface-card p-6 transition-colors hover:border-[var(--border-subtle)]"
          >
            <h2 className="text-xl font-bold text-primary mb-4">Liked Posts</h2>
            <div className="space-y-3">
              {likedPosts && likedPosts.length > 0 ? (
                likedPosts.map((post) => (
                  <Link
                    key={post._id}
                    to={`/posts/${post.slug}`}
                    className="block p-3 rounded-lg surface-card transition-colors hover:border-[var(--border-subtle)] group"
                  >
                    <h3 className="font-medium text-primary group-hover:text-[var(--accent)] line-clamp-2">
                      {post.title}
                    </h3>
                    <p className="text-sm text-muted mt-1">
                      by {post.author?.username}
                    </p>
                  </Link>
                ))
              ) : (
                <p className="text-muted text-center py-4">
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
            className="surface-card p-6 transition-colors hover:border-[var(--border-subtle)]"
          >
            <h2 className="text-xl font-bold text-primary mb-4">Saved Posts</h2>
            <div className="space-y-3">
              {bookmarkedPosts && bookmarkedPosts.length > 0 ? (
                bookmarkedPosts.map((post) => (
                  <Link
                    key={post._id}
                    to={`/posts/${post.slug}`}
                    className="block p-3 rounded-lg surface-card transition-colors hover:border-[var(--border-subtle)] group"
                  >
                    <h3 className="font-medium text-primary group-hover:text-[var(--accent)] line-clamp-2">
                      {post.title}
                    </h3>
                    <p className="text-sm text-muted mt-1">
                      by {post.author?.username}
                    </p>
                  </Link>
                ))
              ) : (
                <p className="text-muted text-center py-4">
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
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="surface-card p-6"
          >
          <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
            <div>
              <h2 className="text-2xl font-bold text-primary">My Posts</h2>
              <p className="text-sm text-muted mt-1">Posts you own or collaborate on</p>
            </div>
            {(isAdmin() || user?.role === 'author') && (
              <div className="flex items-center gap-3">
                <Link
                  to="/admin/posts"
                  className="btn btn-primary !w-auto shadow-[0_12px_28px_rgba(26,137,23,0.2)]"
                >
                  <FileText className="w-4 h-4" />
                  <span>Manage Posts</span>
                </Link>
                <button
                  onClick={() => setActiveTab('create-post')}
                  className="btn btn-primary !w-auto"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Post</span>
                </button>
              </div>
            )}
          </div>
          {tabLoading ? (
            <SkeletonLoader variant="post" count={3} />
          ) : tabData.posts.length > 0 ? (
            <div className="space-y-4">
              {tabData.posts.map((post) => (
                <PostItem key={post._id} post={post} onShowPollAnalytics={setShowPollAnalytics} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted">
              <FileText className="w-12 h-12 mx-auto mb-4 text-muted" />
              <p>No posts yet</p>
              {(isAdmin() || user?.role === 'author') && (
                <div className="mt-4 flex items-center justify-center gap-3">
                  <button
                    onClick={() => setActiveTab('create-post')}
                    className="btn btn-primary !w-auto"
                  >
                    Create your first post
                  </button>
                  <Link
                    to="/admin/posts"
                    className="btn btn-outline !w-auto text-secondary"
                  >
                    Manage Posts
                  </Link>
                </div>
              )}
            </div>
          )}
          </motion.div>
        </div>
      )}

      {activeTab === 'comments' && (
        <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="surface-card p-6"
        >
          <h2 className="text-2xl font-bold text-primary mb-6">My Comments</h2>
          {tabLoading ? (
            <SkeletonLoader variant="comment" count={3} />
          ) : tabData.comments.length > 0 ? (
            <div className="space-y-4">
              {tabData.comments.map((comment) => (
                <CommentItem key={comment._id} comment={comment} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted">
              <MessageCircle className="w-12 h-12 mx-auto mb-4 text-muted" />
              <p>No comments yet</p>
            </div>
          )}
        </motion.div>
        </div>
      )}

      {activeTab === 'likes' && (
        <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="surface-card p-6"
        >
          <h2 className="text-2xl font-bold text-primary mb-6">Liked Posts</h2>
          {tabLoading ? (
            <SkeletonLoader variant="post" count={3} />
          ) : tabData.likes.length > 0 ? (
            <div className="space-y-4">
              {tabData.likes.map((post) => (
                <PostItem key={post._id} post={post} onShowPollAnalytics={setShowPollAnalytics} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted">
              <Heart className="w-12 h-12 mx-auto mb-4 text-muted" />
              <p>No liked posts yet</p>
            </div>
          )}
        </motion.div>
        </div>
      )}

      {activeTab === 'bookmarks' && (
        <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="surface-card p-6"
        >
          <h2 className="text-2xl font-bold text-primary mb-6">Saved Posts</h2>
          {tabLoading ? (
            <SkeletonLoader variant="post" count={3} />
          ) : tabData.bookmarks.length > 0 ? (
            <div className="space-y-4">
              {tabData.bookmarks.map((post) => (
                <PostItem key={post._id} post={post} onShowPollAnalytics={setShowPollAnalytics} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted">
              <Bookmark className="w-12 h-12 mx-auto mb-4 text-muted" />
              <p>No saved posts yet</p>
            </div>
          )}
        </motion.div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="max-w-6xl mx-auto">
      <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        className="surface-card p-6"
        >
          <h2 className="text-2xl font-bold text-primary mb-6">Activity History</h2>
          {tabLoading ? (
            <SkeletonLoader variant="post" count={3} />
          ) : tabData.history.length > 0 ? (
            <div className="space-y-4">
              {tabData.history.map((post) => (
                <PostItem key={post._id} post={post} onShowPollAnalytics={setShowPollAnalytics} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted">
              <History className="w-12 h-12 mx-auto mb-4 text-muted" />
              <p>No history yet</p>
            </div>
          )}
        </motion.div>
        </div>
      )}

      {activeTab === 'create-post' && (
        <div className="max-w-6xl mx-auto">
          <CreatePostTab />
        </div>
      )}

      {activeTab === 'author' && (
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <AuthorApplication />
          </motion.div>
        </div>
      )}

      {activeTab === 'collaborations' && (
        <CollaborationsDashboard />
      )}

      {activeTab === 'settings' && (
        <div className="max-w-6xl mx-auto">
          <ProfileSettings />
        </div>
      )}

      {/* Poll Analytics Modal */}
      {showPollAnalytics && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowPollAnalytics(null);
            }
          }}
        >
          <div className="bg-[var(--surface-bg)] rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto relative">
            <button
              onClick={() => setShowPollAnalytics(null)}
              className="absolute top-4 right-4 z-10 p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] rounded-lg transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
            <PollAnalytics 
              pollId={showPollAnalytics} 
              onClose={() => setShowPollAnalytics(null)} 
            />
          </div>
        </div>
      )}
    </div>
      </div>
    </>
  );
};

const StatCard = ({ icon, title, value, change, color, trend }) => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const colorConfig = {
    accent: {
      bg: 'from-[#c8f0ce]/35 to-[#dff7e3]/25',
      icon: 'bg-[#c8f0ce]/60 text-[var(--accent)]',
      gradient: 'from-[#1a8917] to-[#189112]',
      sparkline: '#1a8917',
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

  const config = colorConfig[color] || colorConfig.accent;
  const isPositive = trend >= 0;

  const sparklineData = Array.from({ length: 20 }, () => 
    Math.random() * 100 + (isPositive ? 50 : 30)
  );

  // Ensure value is a number and has a fallback
  const displayValue = typeof value === 'number' ? value : Number(value) || 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.3 }}
      className="surface-card p-4 sm:p-6 relative overflow-hidden group transition-colors hover:border-[var(--border-subtle)]"
    >
      {/* Gradient background */}
      <div className={`absolute inset-0 bg-gradient-to-br ${config.bg} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
      
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <p className="text-xs sm:text-sm font-medium text-muted">{title}</p>
          <div className={`p-2 sm:p-2.5 rounded-xl ${config.icon} transition-transform group-hover:scale-110`}>
            {icon}
          </div>
        </div>
        
        <div className="mb-3">
          <p className="text-2xl sm:text-3xl font-bold text-primary mb-1">
            <AnimatedCounter value={displayValue} />
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-xs text-muted">{change}</p>
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

        {/* Sparkline - responsive height for mobile */}
        <div className="mt-4 -mx-4 sm:-mx-6 -mb-4 sm:-mb-6">
          <Sparkline data={sparklineData} color={config.sparkline} height={isMobile ? 40 : 50} />
        </div>
      </div>
    </motion.div>
  );
};

const PostItem = ({ post, onShowPollAnalytics }) => {
  const { user, isAdmin } = useAuth();
  const { addNotification } = useNotifications();
  const [hasPoll, setHasPoll] = useState(false);
  const [pollId, setPollId] = useState(null);
  const [loadingPoll, setLoadingPoll] = useState(false);
  const isAuthor = user?.role === 'author' || isAdmin();
  
  // Better author ID comparison - handle both object and string formats
  const postAuthorId = post.author?._id || post.author || post.authorId;
  const userId = user?._id || user?.id;
  const isPostOwner = postAuthorId && userId && (
    String(postAuthorId) === String(userId) || isAdmin()
  );
  
  // Check if user is a collaborator
  const isCollaborator = post.collaborators?.some(collab => {
    const collabUserId = collab.user?._id || collab.user || collab.userId;
    return collabUserId && userId && String(collabUserId) === String(userId);
  });
  
  const canEdit = isPostOwner || isCollaborator;

  // Check if post has a poll
  useEffect(() => {
    const checkPoll = async () => {
      if (!post?._id) return;
      try {
        setLoadingPoll(true);
        const response = await pollsAPI.getByPost(post._id);
        if (response.data?.poll) {
          setHasPoll(true);
          setPollId(response.data.poll.id || response.data.poll._id);
        }
      } catch (error) {
        // 404 is expected when post doesn't have a poll
        if (error.response?.status !== 404) {
          // Silently handle other errors
        }
      } finally {
        setLoadingPoll(false);
      }
    };
    
    if (canEdit) {
      checkPoll();
    }
  }, [post?._id, canEdit]);
  
  return (
    <motion.div
      whileHover={{ x: 4 }}
      transition={{ type: 'spring', stiffness: 300 }}
      className="flex items-center justify-between p-4 rounded-xl surface-card transition-colors hover:border-[var(--border-subtle)] group"
    >
      <Link
        to={`/posts/${post.slug}`}
        className="flex-1 min-w-0"
      >
        <div>
          <h3 className="font-semibold text-primary group-hover:text-[var(--accent)] truncate mb-2">
            {post.title}
          </h3>
          <div className="flex items-center space-x-4 text-xs text-muted flex-wrap gap-2">
            {isCollaborator && !isPostOwner && (
              <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 rounded text-xs font-medium">
                Collaborator
              </span>
            )}
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
      {canEdit && (
        <div className="ml-4 flex-shrink-0 flex items-center gap-2">
          {hasPoll && pollId && onShowPollAnalytics && (
            <button
              onClick={() => onShowPollAnalytics(pollId)}
              className="btn-icon-square text-blue-500 hover:bg-blue-500/10 transition-colors"
              title="View Poll Analytics"
            >
              <BarChart className="w-4 h-4" />
            </button>
          )}
          <Link
            to={`/admin/posts/edit/${post._id}`}
            className="btn-icon-square text-[var(--accent)] hover:bg-[var(--accent)]/10 transition-colors"
            title={isPostOwner ? "Edit Post" : "Edit as Collaborator"}
          >
            <Edit className="w-4 h-4" />
          </Link>
          <div className="text-muted group-hover:text-[var(--accent)] transition-colors">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>
      )}
      {!canEdit && (
        <div className="ml-4 flex-shrink-0">
          <TrendingUp className="w-4 h-4 text-muted group-hover:text-[var(--accent)] transition-colors" />
        </div>
      )}
    </motion.div>
  );
};

const CommentItem = ({ comment }) => (
  <motion.div
    whileHover={{ x: 4 }}
    transition={{ type: 'spring', stiffness: 300 }}
    className="p-4 rounded-xl surface-card transition-colors hover:border-[var(--border-subtle)]"
  >
    <p className="text-secondary mb-3 line-clamp-2 text-sm leading-relaxed">{comment.content}</p>
    <div className="flex items-center justify-between text-xs text-muted">
      <Link
        to={`/posts/${comment.post?.slug}`}
        className="font-medium text-primary hover:text-[var(--accent)] transition-colors truncate max-w-[60%]"
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
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [scheduledAt, setScheduledAt] = useState(null);
  const [showPollForm, setShowPollForm] = useState(false);
  const [pollFormData, setPollFormData] = useState({
    question: '',
    description: '',
    options: [{ text: '' }, { text: '' }],
    isActive: true,
    expiresAt: '',
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setCategoriesLoading(true);
      const response = await categoriesAPI.getAll();
      
      // Handle different possible response structures
      const categoriesData = response.data?.categories || 
                            response.data?.data || 
                            response.data || 
                            [];
      
      setCategories(Array.isArray(categoriesData) ? categoriesData : []);
    } catch (error) {
      console.error('Error fetching categories:', error);
      console.error('Error response:', error.response);
      toast.error('Failed to load categories. Please try again.');
      setCategories([]);
    } finally {
      setCategoriesLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleTemplateSelect = (template) => {
    // Match category name to category ID
    let categoryId = '';
    if (template.category && categories.length > 0) {
      const matchedCategory = categories.find(
        cat => cat.name?.toLowerCase() === template.category?.toLowerCase()
      );
      if (matchedCategory) {
        categoryId = matchedCategory._id || matchedCategory.id;
      }
    }
    
    setFormData(prev => ({
      ...prev,
      title: template.title || prev.title,
      excerpt: template.excerpt || prev.excerpt,
      content: template.content || prev.content,
      category: categoryId || prev.category,
      tags: template.tags || prev.tags,
    }));
    setShowTemplates(false);
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
        status: formData.status,
        isPublished: scheduledAt ? false : formData.status === 'published',
        scheduledAt: scheduledAt ? scheduledAt.toISOString() : undefined,
      };
      
      const response = await postsAPI.create(postData);
      const newPost = response.data.post || response.data;
      
      if (!newPost || !newPost._id) {
        console.error('Post creation response:', response);
        toast.error('Post created but response format unexpected. Please refresh the page.');
        return;
      }
      
      const postId = newPost._id || newPost.id;
      
      // Create poll if poll form is filled out
      if (showPollForm && pollFormData.question.trim()) {
        try {
          const validOptions = pollFormData.options.filter(opt => opt.text.trim());
          if (validOptions.length >= 2) {
            // Check for duplicate options
            const optionTexts = validOptions.map(opt => opt.text.trim().toLowerCase());
            const uniqueOptions = new Set(optionTexts);
            if (uniqueOptions.size === optionTexts.length) {
              const pollData = {
                postId: postId,
                question: pollFormData.question.trim(),
                description: pollFormData.description.trim() || undefined,
                options: validOptions.map(opt => ({ text: opt.text.trim() })),
                isActive: pollFormData.isActive,
                expiresAt: pollFormData.expiresAt ? new Date(pollFormData.expiresAt).toISOString() : null,
              };
              await pollsAPI.create(pollData);
              toast.success('Post and poll created successfully!');
            } else {
              toast.error('Poll options must be unique. Post created but poll was not created.');
            }
          } else {
            toast.error('Poll requires at least 2 options. Post created but poll was not created.');
          }
        } catch (pollError) {
          console.error('Error creating poll:', pollError);
          toast.error('Post created successfully, but failed to create poll. You can add it later when editing.');
        }
      } else {
        toast.success('Post created successfully');
      }
      
      if (postData.isPublished && postId) {
        try {
          await adminAPI.notifyNewPost(postId);
        } catch (error) {
          console.error('Failed to notify subscribers:', error);
        }
      }
      
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
      setScheduledAt(null);
      setShowPollForm(false);
      setPollFormData({
        question: '',
        description: '',
        options: [{ text: '' }, { text: '' }],
        isActive: true,
        expiresAt: '',
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
      className="surface-card p-6"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <h2 className="text-2xl font-bold text-primary">Create New Post</h2>
        <button
          type="button"
          onClick={() => setShowTemplates(true)}
          className="btn btn-outline !w-auto flex items-center gap-2"
        >
          <FileText className="w-4 h-4" />
          <span>Use Template</span>
        </button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Title</label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 border border-[var(--border-subtle)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent bg-[var(--surface-bg)] text-[var(--text-primary)]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Excerpt</label>
          <textarea
            name="excerpt"
            value={formData.excerpt}
            onChange={handleChange}
            rows="3"
            className="w-full px-4 py-2 border border-[var(--border-subtle)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent bg-[var(--surface-bg)] text-[var(--text-primary)]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Content</label>
          <RichTextEditor
            value={formData.content}
            onChange={(value) => setFormData(prev => ({ ...prev, content: value }))}
            placeholder="Write your post content here..."
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Category</label>
            {categoriesLoading ? (
              <div className="w-full px-4 py-2 border border-[var(--border-subtle)] rounded-lg bg-[var(--surface-subtle)] flex items-center gap-2">
                <Spinner size="xs" />
                <span className="text-sm text-muted">Loading categories...</span>
              </div>
            ) : (
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-[var(--border-subtle)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent bg-[var(--surface-bg)] text-[var(--text-primary)]"
              >
                <option value="">Select a category</option>
                {categories.length > 0 ? (
                  categories.map((cat) => (
                    <option key={cat._id || cat.id} value={cat._id || cat.id}>
                      {cat.name}
                    </option>
                  ))
                ) : (
                  <option value="" disabled>No categories available</option>
                )}
              </select>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Status</label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              disabled={!!scheduledAt}
              className="w-full px-4 py-2 border border-[var(--border-subtle)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent bg-[var(--surface-bg)] text-[var(--text-primary)] disabled:bg-[var(--surface-subtle)] disabled:cursor-not-allowed"
            >
              <option value="published">Published</option>
              <option value="draft">Draft</option>
            </select>
            {scheduledAt && (
              <p className="mt-1 text-xs text-[var(--text-secondary)]">Status will be set to draft when scheduled</p>
            )}
          </div>
        </div>

        <div>
          <PostScheduler
            onSchedule={setScheduledAt}
            initialDate={scheduledAt ? new Date(scheduledAt).toISOString().split('T')[0] : null}
            initialTime={scheduledAt ? new Date(scheduledAt).toTimeString().slice(0, 5) : null}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Tags (comma-separated)</label>
          <input
            type="text"
            name="tags"
            value={formData.tags}
            onChange={handleChange}
            placeholder="tag1, tag2, tag3"
            className="w-full px-4 py-2 border border-[var(--border-subtle)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent bg-[var(--surface-bg)] text-[var(--text-primary)]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Featured Image</label>
          {formData.featuredImage ? (
            <div className="space-y-2">
              <img
                src={formData.featuredImage}
                alt="Featured"
                className="w-full h-48 object-cover rounded-lg border border-[var(--border-subtle)]"
                onError={() => toast.error('Failed to load image')}
              />
              <div className="flex items-center gap-2">
                <span className="text-sm text-[var(--text-secondary)] truncate">{formData.featuredImage}</span>
                <button
                  type="button"
                  onClick={handleDeleteImage}
                className="px-3 py-1 text-sm rounded-lg border border-rose-400/40 text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 transition-colors"
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
                className="w-full px-4 py-2 border border-[var(--border-subtle)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent bg-[var(--surface-bg)] text-[var(--text-primary)]"
              />
              {uploadingImage && (
                <p className="text-sm text-[var(--text-muted)] mt-2">Uploading image...</p>
              )}
            </div>
          )}
        </div>

        {/* Poll Section */}
        <div className="border-t border-[var(--border-subtle)] pt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-[var(--accent)]" />
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">Poll (Optional)</h3>
            </div>
            {!showPollForm && (
              <button
                type="button"
                onClick={() => setShowPollForm(true)}
                className="text-sm text-[var(--accent)] hover:underline"
              >
                Add Poll
              </button>
            )}
            {showPollForm && (
              <button
                type="button"
                onClick={() => {
                  setShowPollForm(false);
                  setPollFormData({
                    question: '',
                    description: '',
                    options: [{ text: '' }, { text: '' }],
                    isActive: true,
                    expiresAt: '',
                  });
                }}
                className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                Cancel
              </button>
            )}
          </div>

          {showPollForm && (
            <div className="space-y-4 bg-[var(--surface-subtle)] p-4 rounded-lg">
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  Poll Question <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={pollFormData.question}
                  onChange={(e) => setPollFormData({ ...pollFormData, question: e.target.value })}
                  placeholder="What would you like to ask?"
                  className="w-full px-4 py-2 border border-[var(--border-subtle)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent bg-[var(--surface-bg)] text-[var(--text-primary)]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={pollFormData.description}
                  onChange={(e) => setPollFormData({ ...pollFormData, description: e.target.value })}
                  rows="2"
                  placeholder="Additional context about the poll..."
                  className="w-full px-4 py-2 border border-[var(--border-subtle)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent bg-[var(--surface-bg)] text-[var(--text-primary)]"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-[var(--text-primary)]">
                    Poll Options <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setPollFormData({
                        ...pollFormData,
                        options: [...pollFormData.options, { text: '' }],
                      });
                    }}
                    className="text-sm text-[var(--accent)] hover:underline"
                  >
                    + Add Option
                  </button>
                </div>
                <div className="space-y-2">
                  {pollFormData.options.map((option, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={option.text}
                        onChange={(e) => {
                          const newOptions = [...pollFormData.options];
                          newOptions[index] = { text: e.target.value };
                          setPollFormData({ ...pollFormData, options: newOptions });
                        }}
                        placeholder={`Option ${index + 1}`}
                        className="flex-1 px-4 py-2 border border-[var(--border-subtle)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent bg-[var(--surface-bg)] text-[var(--text-primary)]"
                      />
                      {pollFormData.options.length > 2 && (
                        <button
                          type="button"
                          onClick={() => {
                            if (pollFormData.options.length <= 2) {
                              toast.error('A poll must have at least 2 options');
                              return;
                            }
                            const newOptions = pollFormData.options.filter((_, i) => i !== index);
                            setPollFormData({ ...pollFormData, options: newOptions });
                          }}
                          className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-[var(--text-muted)] mt-2">
                  Minimum 2 options required
                </p>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="pollIsActiveDashboard"
                  checked={pollFormData.isActive}
                  onChange={(e) => setPollFormData({ ...pollFormData, isActive: e.target.checked })}
                  className="h-4 w-4 text-[var(--accent)] focus:ring-[var(--accent)] border-[var(--border-subtle)] rounded"
                />
                <label htmlFor="pollIsActiveDashboard" className="ml-2 block text-sm text-[var(--text-secondary)]">
                  Active (poll will be visible to users)
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Expiration Date (Optional)
                </label>
                <input
                  type="datetime-local"
                  value={pollFormData.expiresAt}
                  onChange={(e) => setPollFormData({ ...pollFormData, expiresAt: e.target.value })}
                  min={new Date().toISOString().slice(0, 16)}
                  className="w-full px-4 py-2 border border-[var(--border-subtle)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent bg-[var(--surface-bg)] text-[var(--text-primary)]"
                />
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  Poll will automatically deactivate after this date. Leave empty for no expiration.
                </p>
              </div>
            </div>
          )}
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
            className="px-6 py-2 border border-[var(--border-subtle)] rounded-lg text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)]"
          >
            Reset
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="btn btn-primary disabled:opacity-50 shadow-[0_14px_30px_rgba(26,137,23,0.2)]"
          >
            {submitting ? 'Creating...' : 'Create Post'}
          </button>
        </div>
      </form>

      {/* Post Templates Modal */}
      {showTemplates && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowTemplates(false);
            }
          }}
        >
          <div className="bg-[var(--surface-bg)] rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto relative">
            <button
              type="button"
              onClick={() => setShowTemplates(false)}
              className="absolute top-4 right-4 z-10 p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] rounded-lg transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="p-6">
              <PostTemplates onSelectTemplate={handleTemplateSelect} />
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default Dashboard;