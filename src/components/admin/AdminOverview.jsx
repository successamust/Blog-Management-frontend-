import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import {
  Users,
  FileText,
  Folder,
  Mail,
  TrendingUp,
  Eye,
  Heart,
  MessageCircle,
  Calendar,
} from 'lucide-react';
import { adminAPI, postsAPI, categoriesAPI, newsletterAPI, dashboardAPI } from '../../services/api';
import toast from 'react-hot-toast';
import AnimatedCard from '../common/AnimatedCard';

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4'];

const AdminOverview = () => {
  const [stats, setStats] = useState({
    users: null,
    posts: null,
    categories: null,
    newsletter: null,
    engagement: null,
  });
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState([]);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    fetchAllStats();
  }, []);

  const fetchAllStats = async () => {
    try {
      setLoading(true);
      const [
        userStatsRes,
        postsRes,
        categoriesRes,
        newsletterStatsRes,
        dashboardRes,
      ] = await Promise.allSettled([
        adminAPI.getUserStats(),
        postsAPI.getAll({ limit: 1000 }),
        categoriesAPI.getAll(),
        adminAPI.getNewsletterStats(),
        dashboardAPI.getOverview(),
      ]);

      if (userStatsRes.status === 'fulfilled') {
        setStats((prev) => ({ ...prev, users: userStatsRes.value.data }));
      }

      if (postsRes.status === 'fulfilled') {
        const postsData = postsRes.value.data.posts || [];
        setPosts(postsData);
        const published = postsData.filter((p) => p.status === 'published').length;
        const drafts = postsData.filter((p) => p.status === 'draft').length;
        const totalViews = postsData.reduce((sum, p) => sum + (p.viewCount || 0), 0);
        const totalLikes = postsData.reduce((sum, p) => sum + (p.likes?.length || 0), 0);
        setStats((prev) => ({
          ...prev,
          posts: {
            total: postsData.length,
            published,
            drafts,
            totalViews,
            totalLikes,
          },
        }));
      }

      if (categoriesRes.status === 'fulfilled') {
        const categoriesData = categoriesRes.value.data.categories || [];
        setCategories(categoriesData);
        setStats((prev) => ({
          ...prev,
          categories: {
            total: categoriesData.length,
            categories: categoriesData,
          },
        }));
      }

      if (newsletterStatsRes.status === 'fulfilled') {
        setStats((prev) => ({ ...prev, newsletter: newsletterStatsRes.value.data }));
      }

      if (dashboardRes.status === 'fulfilled') {
        setStats((prev) => ({
          ...prev,
          engagement: dashboardRes.value.data.overview?.stats || null,
        }));
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
      toast.error('Failed to load statistics');
    } finally {
      setLoading(false);
    }
  };

  const getPostsByCategoryData = () => {
    if (!categories.length || !posts.length) return [];
    return categories.map((cat) => ({
      name: cat.name,
      posts: posts.filter((p) => p.category?._id === cat._id || p.category === cat._id).length,
    }));
  };

  const getPostsByMonthData = () => {
    if (!posts.length) return [];
    const monthMap = {};
    posts.forEach((post) => {
      const date = new Date(post.publishedAt || post.createdAt);
      const month = date.toLocaleString('default', { month: 'short' });
      monthMap[month] = (monthMap[month] || 0) + 1;
    });
    return Object.entries(monthMap)
      .map(([month, count]) => ({ month, posts: count }))
      .slice(-6); // Last 6 months
  };

  const getTopPostsData = () => {
    if (!posts.length) return [];
    return posts
      .sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0))
      .slice(0, 5)
      .map((post) => ({
        name: post.title.length > 20 ? post.title.substring(0, 20) + '...' : post.title,
        views: post.viewCount || 0,
        likes: post.likes?.length || 0,
      }));
  };

  const getUserRoleData = () => {
    if (!stats.users) return [];
    return [
      { name: 'Admins', value: stats.users.totalAdmins || 0 },
      { name: 'Users', value: stats.users.totalRegularUsers || 0 },
    ];
  };

  const getPostStatusData = () => {
    if (!stats.posts) return [];
    return [
      { name: 'Published', value: stats.posts.published || 0 },
      { name: 'Drafts', value: stats.posts.drafts || 0 },
    ];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Admin Overview</h2>
        <p className="text-gray-600">Comprehensive statistics and analytics dashboard</p>
      </motion.div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <AnimatedCard delay={0.1}>
          <StatCard
            title="Total Users"
            value={stats.users?.totalUsers || 0}
            icon={<Users className="w-6 h-6" />}
            color="blue"
            subtitle={`${stats.users?.totalAdmins || 0} admins`}
          />
        </AnimatedCard>
        <AnimatedCard delay={0.2}>
          <StatCard
            title="Total Posts"
            value={stats.posts?.total || 0}
            icon={<FileText className="w-6 h-6" />}
            color="purple"
            subtitle={`${stats.posts?.published || 0} published`}
          />
        </AnimatedCard>
        <AnimatedCard delay={0.3}>
          <StatCard
            title="Categories"
            value={stats.categories?.total || 0}
            icon={<Folder className="w-6 h-6" />}
            color="green"
            subtitle="Active categories"
          />
        </AnimatedCard>
        <AnimatedCard delay={0.4}>
          <StatCard
            title="Subscribers"
            value={stats.newsletter?.totalSubscribers || 0}
            icon={<Mail className="w-6 h-6" />}
            color="orange"
            subtitle="Newsletter subscribers"
          />
        </AnimatedCard>
      </div>

      {/* Engagement Metrics */}
      {stats.engagement && (
        <AnimatedCard delay={0.5}>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Engagement Metrics</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <Eye className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900">
                  {stats.engagement.engagement?.totalViews || stats.posts?.totalViews || 0}
                </p>
                <p className="text-sm text-gray-600">Total Views</p>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <Heart className="w-8 h-8 text-red-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900">
                  {stats.engagement.engagement?.totalLikes || stats.posts?.totalLikes || 0}
                </p>
                <p className="text-sm text-gray-600">Total Likes</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <MessageCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900">
                  {stats.engagement.comments?.total || 0}
                </p>
                <p className="text-sm text-gray-600">Total Comments</p>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <TrendingUp className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900">
                  {stats.posts?.published || 0}
                </p>
                <p className="text-sm text-gray-600">Published Posts</p>
              </div>
            </div>
          </div>
        </AnimatedCard>
      )}

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Role Distribution */}
        {stats.users && (
          <AnimatedCard delay={0.6}>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-6">User Role Distribution</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={getUserRoleData()}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {getUserRoleData().map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </AnimatedCard>
        )}

        {/* Post Status Distribution */}
        {stats.posts && (
          <AnimatedCard delay={0.7}>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-6">Post Status Distribution</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={getPostStatusData()}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {getPostStatusData().map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index + 2 % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </AnimatedCard>
        )}
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Posts by Category */}
        {getPostsByCategoryData().length > 0 && (
          <AnimatedCard delay={0.8}>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-6">Posts by Category</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={getPostsByCategoryData()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="posts" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </AnimatedCard>
        )}

        {/* Posts Over Time */}
        {getPostsByMonthData().length > 0 && (
          <AnimatedCard delay={0.9}>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-6">Posts Over Time</h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={getPostsByMonthData()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="posts" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.6} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </AnimatedCard>
        )}
      </div>

      {/* Top Posts */}
      {getTopPostsData().length > 0 && (
        <AnimatedCard delay={1.0}>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Top 5 Posts by Views</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={getTopPostsData()} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={150} />
                <Tooltip />
                <Legend />
                <Bar dataKey="views" fill="#10b981" name="Views" />
                <Bar dataKey="likes" fill="#ef4444" name="Likes" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </AnimatedCard>
      )}
    </div>
  );
};

const StatCard = ({ title, value, icon, color, subtitle }) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    purple: 'bg-purple-50 text-purple-600',
    green: 'bg-green-50 text-green-600',
    orange: 'bg-orange-50 text-orange-600',
  };

  return (
    <motion.div
      className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
      whileHover={{ scale: 1.02, y: -4 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>{icon}</div>
      </div>
    </motion.div>
  );
};

export default AdminOverview;

