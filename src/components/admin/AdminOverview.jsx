import React, { useState, useEffect, useCallback } from 'react';
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
  PenLine,
  Boxes,
  UsersRound,
  TrendingUp,
  LineChart as LineChartIcon,
  HeartHandshake,
  MessageSquare,
  MessageCircle,
  Eye,
  Heart,
  Calendar,
} from 'lucide-react';
import { adminAPI, postsAPI, categoriesAPI, newsletterAPI, dashboardAPI } from '../../services/api';
import toast from 'react-hot-toast';
import AnimatedCard from '../common/AnimatedCard';
import SkeletonLoader from '../common/SkeletonLoader';
import Spinner from '../common/Spinner';

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4'];

const formatRoleLabel = (value) => {
  if (!value && value !== 0) return 'Unknown';
  const cleaned = value
    .toString()
    .replace(/[_-]+/g, ' ')
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
  return cleaned || 'Unknown';
};

const AdminOverview = () => {
  const [stats, setStats] = useState({
    users: null,
    posts: null,
    categories: null,
    newsletter: null,
    engagement: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [posts, setPosts] = useState([]);
  const [categories, setCategories] = useState([]);

  // Helper function to normalize posts from various response structures
  const normalizePosts = useCallback((response) => {
    // Handle null/undefined response
    if (!response) return [];
    
    // Try different response structures
    // Case 1: response.data.posts
    if (response?.data?.posts && Array.isArray(response.data.posts)) {
      return response.data.posts;
    }
    
    // Case 2: response.data.data
    if (response?.data?.data && Array.isArray(response.data.data)) {
      return response.data.data;
    }
    
    // Case 3: response.data is an array
    if (Array.isArray(response.data)) {
      return response.data;
    }
    
    // Case 4: response.posts
    if (response?.posts && Array.isArray(response.posts)) {
      return response.posts;
    }
    
    // Case 5: response is an array
    if (Array.isArray(response)) {
      return response;
    }
    
    // Case 6: response.overview.posts (dashboard API structure)
    if (response?.overview?.posts && Array.isArray(response.overview.posts)) {
      return response.overview.posts;
    }
    
    // Case 7: response.overview.data.posts
    if (response?.overview?.data?.posts && Array.isArray(response.overview.data.posts)) {
      return response.overview.data.posts;
    }
    
    // Case 8: response.overview.data is an array
    if (response?.overview?.data && Array.isArray(response.overview.data)) {
      return response.overview.data;
    }
    
    // Case 9: response.data exists but is not an array - try to extract
    if (response?.data) {
      // Try to find any array property
      for (const key in response.data) {
        if (Array.isArray(response.data[key])) {
          return response.data[key];
        }
      }
    }
    
    // Case 10: response.overview exists - try to find any array property
    if (response?.overview) {
      for (const key in response.overview) {
        if (Array.isArray(response.overview[key])) {
          return response.overview[key];
        }
      }
    }
    
    return [];
  }, []);

  const fetchAllStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const fetchComprehensivePosts = async () => {

        const dedupeById = (list) => {
          const map = new Map();
          const fallback = [];
          list.forEach((post) => {
            if (!post) return;
            const key = post._id || post.id || post.slug;
            if (!key) {
              fallback.push(post);
              return;
            }
            if (!map.has(key)) {
              map.set(key, post);
            }
          });
          return [...map.values(), ...fallback];
        };

        const isUnpublished = (post) => {
          if (!post) return false;
          const status = (post.status || post.state || '').toString().toLowerCase();
          if (status) {
            if (['draft', 'scheduled', 'archived', 'unpublished', 'pending'].includes(status)) return true;
            if (['published', 'live', 'active'].includes(status)) return false;
          }
          if (post.isDraft === true) return true;
          if (post.isPublished === false) return true;
          if (post.published === false) return true;
          if (post.isPublished === true || post.published === true) return false;
          return false;
        };

        try {
          const baseParams = { limit: 1000, status: 'all', includeDrafts: true };
          const primaryRes = await postsAPI.getAll(baseParams).catch((err) => {
            console.error('Primary posts fetch failed in AdminOverview:', err);
            return null;
          });
          
          const primaryPosts = normalizePosts(primaryRes);
          
          let aggregatedPosts = primaryPosts;

          if (!primaryPosts.length || !primaryPosts.some(isUnpublished)) {
            const extraQueries = [
              { status: 'draft', includeDrafts: true },
              { status: 'scheduled', includeDrafts: true },
              { status: 'archived', includeDrafts: true },
              { status: 'unpublished', includeDrafts: true },
              { isPublished: false, includeDrafts: true },
              { isPublished: 'false', includeDrafts: true },
              { published: false, includeDrafts: true },
              { published: 'false', includeDrafts: true },
            ];

            const extraResponses = await Promise.all(
              extraQueries.map((params) =>
                postsAPI
                  .getAll({ limit: 1000, ...params })
                  .then((res) => normalizePosts(res))
                  .catch((err) => {
                    console.warn(`AdminOverview: failed to fetch posts with params ${JSON.stringify(params)}:`, err);
                    return [];
                  })
              )
            );

            aggregatedPosts = dedupeById([
              ...primaryPosts,
              ...extraResponses.flat(),
            ]);
          }

          if (!aggregatedPosts.some(isUnpublished)) {
            const dashboardRes = await dashboardAPI
              .getPosts({ limit: 1000, status: 'all', includeDrafts: true })
              .catch((err) => {
                console.warn('AdminOverview: dashboard posts fallback failed:', err);
                return null;
              });
            const dashboardPosts = normalizePosts(dashboardRes);
            if (dashboardPosts.length) {
              aggregatedPosts = dedupeById([...aggregatedPosts, ...dashboardPosts]);
            }
          }

          return dedupeById(aggregatedPosts);
        } catch (error) {
          console.error('AdminOverview: error fetching comprehensive posts:', error);
          return [];
        }
      };

      const postsPromise = fetchComprehensivePosts();

      const [
        userStatsRes,
        usersRes,
        categoriesRes,
        newsletterStatsRes,
        dashboardRes,
      ] = await Promise.allSettled([
        adminAPI.getUserStats(),
        adminAPI.getUsers({ limit: 1000 }),
        categoriesAPI.getAll(),
        adminAPI.getNewsletterStats(),
        dashboardAPI.getOverview(),
      ]);

      const getData = (res) => res?.value?.data ?? res?.value ?? null;

      const toNumber = (value) => {
        if (typeof value === 'number' && Number.isFinite(value)) return value;
        if (typeof value === 'string' && value.trim() !== '') {
          const num = Number(value);
          return Number.isNaN(num) ? 0 : num;
        }
        return 0;
      };

      let userData = null;
      let normalizedUsers = null;

      if (userStatsRes.status === 'fulfilled') {
        userData = getData(userStatsRes) || {};

        const totalUsers =
          userData.totalUsers ??
          userData.usersTotal ??
          userData?.overview?.totalUsers ??
          userData?.stats?.totalUsers ??
          userData?.count ??
          0;

        const roleArrays = [
          userData.roleDistribution,
          userData.roles,
          userData.roleStats,
          userData.stats?.roleDistribution,
          userData.stats?.roles,
          userData.stats?.roleStats,
          userData.overview?.roleDistribution,
        ].filter(Boolean);

        const findRoleCount = (roleKey) => {
          const synonyms = {
            admin: ['admin', 'admins', 'administrator', 'administrators'],
            author: ['author', 'authors', 'writer', 'writers'],
            user: ['user', 'users', 'reader', 'readers', 'regular', 'regular users', 'regularusers'],
          }[roleKey];

          for (const source of roleArrays) {
            if (Array.isArray(source)) {
              const match = source.find((item) => {
                const key = (item?.role || item?.name || item?.label || item?.type || '').toString().toLowerCase();
                return synonyms?.some((syn) => key === syn);
              });
              if (match) {
                const value =
                  match.count ??
                  match.value ??
                  match.total ??
                  match.quantity ??
                  match.users ??
                  match.number ??
                  match.amount;
                const numberValue = toNumber(value);
                if (numberValue) return numberValue;
              }
            } else if (typeof source === 'object') {
              for (const [key, value] of Object.entries(source)) {
                const normalizedKey = key.toString().toLowerCase();
                if (synonyms?.some((syn) => normalizedKey === syn)) {
                  const numberValue = toNumber(value);
                  if (numberValue) return numberValue;
                }
              }
            }
          }
          return 0;
        };

        const totalAdminsRaw =
          userData.totalAdmins ??
          userData.admins ??
          userData?.roles?.admins ??
          userData?.roles?.admin ??
          userData?.roleCounts?.admins ??
          userData?.roleCounts?.admin ??
          userData?.stats?.totalAdmins ??
          0;

        const totalAuthorsRaw =
          userData.totalAuthors ??
          userData.authors ??
          userData?.roles?.authors ??
          userData?.roles?.author ??
          userData?.roleCounts?.authors ??
          userData?.roleCounts?.author ??
          userData?.stats?.totalAuthors ??
          0;

        const totalUsersRaw =
          userData.totalRegularUsers ??
          userData.regularUsers ??
          userData?.roles?.users ??
          userData?.roles?.user ??
          userData?.roleCounts?.users ??
          userData?.roleCounts?.user ??
          userData?.stats?.totalRegularUsers ??
          0;

        const totalAdmins = toNumber(totalAdminsRaw) || findRoleCount('admin');
        const totalAuthors = toNumber(totalAuthorsRaw) || findRoleCount('author');
        const totalRegularUsers =
          toNumber(totalUsersRaw) ||
          findRoleCount('user') ||
          Math.max(toNumber(totalUsers) - totalAdmins - totalAuthors, 0);

        normalizedUsers = {
          totalUsers: toNumber(totalUsers),
          totalAdmins,
          totalAuthors,
          totalRegularUsers,
          raw: userData,
        };
      }

      if (usersRes.status === 'fulfilled') {
        const usersPayload = getData(usersRes) || {};
        const extractedUsers =
          usersPayload?.users ||
          usersPayload?.data ||
          (Array.isArray(usersPayload) ? usersPayload : []) ||
          [];
        const usersList = Array.isArray(extractedUsers) ? extractedUsers.filter(Boolean) : [];

        if (usersList.length) {
          const normalizeRoleValue = (value) => {
            if (!value) return null;
            if (typeof value === 'string') return value;
            if (typeof value === 'object') {
              return (
                value.role ??
                value.name ??
                value.label ??
                value.type ??
                value.slug ??
                value.title ??
                null
              );
            }
            return null;
          };

          const aliasMap = {
            admins: 'admin',
            authors: 'author',
            editors: 'editor',
            contributors: 'contributor',
            writers: 'writer',
            publishers: 'publisher',
            bloggers: 'blogger',
            creators: 'creator',
            users: 'user',
            'regular user': 'user',
            'regular users': 'user',
            'basic user': 'user',
            'basic users': 'user',
            members: 'member',
            subscribers: 'subscriber',
            readers: 'reader',
            customers: 'customer',
            viewers: 'viewer',
            followers: 'follower',
            guests: 'guest',
            moderators: 'moderator',
          };

          const seedRoleCounts =
            normalizedUsers?.roleCountsDetailed &&
            typeof normalizedUsers.roleCountsDetailed === 'object'
              ? Object.entries(normalizedUsers.roleCountsDetailed).reduce((acc, [key, value]) => {
                  const sanitizedKey = key
                    .toString()
                    .toLowerCase()
                    .replace(/[_-]+/g, ' ')
                    .trim();
                  if (!sanitizedKey) return acc;
                  const canonicalSeed = aliasMap[sanitizedKey] || sanitizedKey;
                  acc[canonicalSeed] = (acc[canonicalSeed] || 0) + (Number(value) || 0);
                  return acc;
                }, {})
              : {};

          const roleCountsDetailed = usersList.reduce((acc, user) => {
            const rolesSet = new Set();

            const addRole = (rawRole) => {
              const roleString = normalizeRoleValue(rawRole);
              if (!roleString) return;
              const sanitized = roleString
                .toString()
                .toLowerCase()
                .replace(/[_-]+/g, ' ')
                .trim();
              if (!sanitized) return;
              const canonical = aliasMap[sanitized] || sanitized;
              rolesSet.add(canonical);
            };

            addRole(user?.role);
            if (Array.isArray(user?.roles)) {
              user.roles.forEach((roleValue) => addRole(roleValue));
            }

            if (rolesSet.size === 0) {
              rolesSet.add('user');
            }

            rolesSet.forEach((roleKey) => {
              acc[roleKey] = (acc[roleKey] || 0) + 1;
            });

            return acc;
          }, seedRoleCounts);

          const countFromRoles = (keys) =>
            keys.reduce((sum, key) => sum + (roleCountsDetailed[key] || 0), 0);

          const listTotalUsers = usersList.length;
          const adminsFromList = countFromRoles([
            'admin',
            'administrator',
            'administrators',
            'super admin',
            'super admins',
            'superadmin',
            'superadmins',
          ]);
          const authorsFromList = countFromRoles([
            'author',
            'writer',
            'editor',
            'contributor',
            'publisher',
            'creator',
            'blogger',
          ]);
          const regularUsersFromList = countFromRoles([
            'user',
            'member',
            'subscriber',
            'reader',
            'customer',
            'viewer',
            'follower',
            'guest',
          ]);

          const fallbackRegular = Math.max(
            listTotalUsers - adminsFromList - authorsFromList,
            0
          );

          const resolveValue = (current, fallback) => {
            const currentNumber = toNumber(current);
            const fallbackNumber = toNumber(fallback);
            if (fallbackNumber > 0 && fallbackNumber > currentNumber) {
              return fallbackNumber;
            }
            return currentNumber > 0 ? currentNumber : fallbackNumber;
          };

          normalizedUsers = normalizedUsers || {
            totalUsers: 0,
            totalAdmins: 0,
            totalAuthors: 0,
            totalRegularUsers: 0,
            raw: userData,
          };

          normalizedUsers.totalUsers = resolveValue(
            normalizedUsers.totalUsers,
            listTotalUsers
          );
          normalizedUsers.totalAdmins = resolveValue(
            normalizedUsers.totalAdmins,
            adminsFromList
          );
          normalizedUsers.totalAuthors = resolveValue(
            normalizedUsers.totalAuthors,
            authorsFromList
          );

          const bestRegular = [regularUsersFromList, fallbackRegular].reduce(
            (best, value) =>
              toNumber(value) > toNumber(best) ? value : best,
            normalizedUsers.totalRegularUsers
          );

          normalizedUsers.totalRegularUsers = toNumber(bestRegular);
          if (!Number.isFinite(normalizedUsers.totalRegularUsers)) {
            normalizedUsers.totalRegularUsers = Math.max(
              normalizedUsers.totalUsers -
                normalizedUsers.totalAdmins -
                normalizedUsers.totalAuthors,
              0
            );
          }

          normalizedUsers.roleCountsDetailed = roleCountsDetailed;
          normalizedUsers.totalUsersFromList = listTotalUsers;
        }
      }

      if (normalizedUsers) {
        if (
          typeof normalizedUsers.totalRegularUsers !== 'number' ||
          Number.isNaN(normalizedUsers.totalRegularUsers)
        ) {
          normalizedUsers.totalRegularUsers = Math.max(
            toNumber(normalizedUsers.totalUsers) -
              toNumber(normalizedUsers.totalAdmins) -
              toNumber(normalizedUsers.totalAuthors),
            0
          );
        }

        setStats((prev) => ({ ...prev, users: normalizedUsers }));
      }

      const postsData = await postsPromise;
      const normalizedPostsData = Array.isArray(postsData) ? postsData : [];
      
      // Log raw posts data for debugging
      console.log('AdminOverview: Raw posts data', {
        postsData,
        normalizedPostsDataLength: normalizedPostsData.length,
        samplePost: normalizedPostsData[0] || null,
      });
      
      setPosts(normalizedPostsData);

      // Always set posts stats, even if empty
      const normalizeStatus = (post) => {
        if (!post) return 'draft';
        const status = (post?.status || post?.state || '').toString().toLowerCase();
        if (status) return status;
        if (post?.isDraft === true) return 'draft';
        if (post?.published || post?.isPublished) return 'published';
        if (post?.scheduled) return 'scheduled';
        return 'draft';
      };

      const counts = normalizedPostsData.reduce(
        (acc, post) => {
          const status = normalizeStatus(post);
          acc[status] = (acc[status] || 0) + 1;
          return acc;
        },
        {}
      );

      const published = counts.published || counts.live || counts.active || 0;
      const drafts = counts.draft || counts.drafts || 0;
      const scheduled = counts.scheduled || counts.pending || 0;
      const archived = counts.archived || counts.archive || 0;
      
      // Calculate total as sum of all status counts to ensure accuracy
      const totalFromCounts = Object.values(counts).reduce((sum, count) => sum + (Number(count) || 0), 0);
      const totalFromArray = normalizedPostsData.length;
      // Use the larger value to ensure we don't miss any posts
      const totalPosts = Math.max(totalFromCounts, totalFromArray);
      
      const totalViews = normalizedPostsData.reduce((sum, p) => sum + (Number(p?.viewCount) || Number(p?.views) || 0), 0);
      const totalLikes = normalizedPostsData.reduce((sum, p) => {
        if (Array.isArray(p?.likes)) return sum + p.likes.length;
        if (Number(p?.likeCount) || Number(p?.likes)) return sum + (Number(p?.likeCount) || Number(p?.likes) || 0);
        return sum;
      }, 0);
      const totalComments = normalizedPostsData.reduce((sum, p) => {
        if (Array.isArray(p?.comments)) return sum + p.comments.length;
        if (Number(p?.commentCount) || Number(p?.comments)) return sum + (Number(p?.commentCount) || Number(p?.comments) || 0);
        return sum;
      }, 0);

      // Always update posts stats - the total should match the sum of all status counts
      setStats((prev) => ({
        ...prev,
        posts: {
          total: totalPosts,
          published,
          drafts,
          scheduled,
          archived,
          totalViews,
          totalLikes,
          totalComments,
          statusCounts: counts,
          raw: normalizedPostsData,
        },
      }));

      if (categoriesRes.status === 'fulfilled') {
        const rawCategories = getData(categoriesRes);
        const categoriesData = rawCategories?.categories || rawCategories?.data || (Array.isArray(rawCategories) ? rawCategories : []) || [];
        const normalizedCategories = Array.isArray(categoriesData) ? categoriesData.filter(Boolean) : [];
        setCategories(normalizedCategories);
        setStats((prev) => ({
          ...prev,
          categories: {
            total: normalizedCategories.length,
            categories: normalizedCategories,
          },
        }));
      }

      if (newsletterStatsRes.status === 'fulfilled') {
        const newsletterData = getData(newsletterStatsRes);
        setStats((prev) => ({ ...prev, newsletter: newsletterData || null }));
      }

      if (dashboardRes.status === 'fulfilled') {
        const dashboardData = getData(dashboardRes);
        const engagementStats = dashboardData?.overview?.stats || dashboardData?.stats || dashboardData || null;
        setStats((prev) => ({
          ...prev,
          engagement: engagementStats,
        }));
        
        // Check for total posts count in dashboard response
        const dashboardTotalPosts = 
          dashboardData?.overview?.stats?.totalPosts ||
          dashboardData?.overview?.totalPosts ||
          dashboardData?.stats?.totalPosts ||
          dashboardData?.totalPosts ||
          null;
        
        // Fallback: Try to get posts from dashboard if we didn't get any posts or if total is 0
        const currentPostsTotal = normalizedPostsData.length;
        const hasValidPosts = currentPostsTotal > 0;
        
        if (!hasValidPosts && dashboardData) {
          const dashboardPosts = normalizePosts(dashboardData);
          if (dashboardPosts.length > 0) {
            console.log('AdminOverview: Using posts from dashboard API fallback', dashboardPosts.length);
            setPosts(dashboardPosts);
            
            // Recalculate stats with dashboard posts
            const normalizeStatus = (post) => {
              if (!post) return 'draft';
              const status = (post?.status || post?.state || '').toString().toLowerCase();
              if (status) return status;
              if (post?.isDraft === true) return 'draft';
              if (post?.published || post?.isPublished) return 'published';
              if (post?.scheduled) return 'scheduled';
              return 'draft';
            };

            const counts = dashboardPosts.reduce(
              (acc, post) => {
                const status = normalizeStatus(post);
                acc[status] = (acc[status] || 0) + 1;
                return acc;
              },
              {}
            );

            const published = counts.published || counts.live || counts.active || 0;
            const drafts = counts.draft || counts.drafts || 0;
            const scheduled = counts.scheduled || counts.pending || 0;
            const archived = counts.archived || counts.archive || 0;
            
            // Calculate total as sum of all status counts to ensure accuracy
            const totalFromCounts = Object.values(counts).reduce((sum, count) => sum + (Number(count) || 0), 0);
            const totalFromArray = dashboardPosts.length;
            // Use dashboard total if available, otherwise use calculated value
            const totalPosts = dashboardTotalPosts 
              ? Math.max(Number(dashboardTotalPosts), totalFromCounts, totalFromArray)
              : Math.max(totalFromCounts, totalFromArray);
            
            const totalViews = dashboardPosts.reduce((sum, p) => sum + (Number(p?.viewCount) || Number(p?.views) || 0), 0);
            const totalLikes = dashboardPosts.reduce((sum, p) => {
              if (Array.isArray(p?.likes)) return sum + p.likes.length;
              if (Number(p?.likeCount) || Number(p?.likes)) return sum + (Number(p?.likeCount) || Number(p?.likes) || 0);
              return sum;
            }, 0);
            const totalComments = dashboardPosts.reduce((sum, p) => {
              if (Array.isArray(p?.comments)) return sum + p.comments.length;
              if (Number(p?.commentCount) || Number(p?.comments)) return sum + (Number(p?.commentCount) || Number(p?.comments) || 0);
              return sum;
            }, 0);

            console.log('AdminOverview: Dashboard fallback posts', {
              totalFromArray,
              totalFromCounts,
              dashboardTotalPosts,
              totalPosts,
              published,
              counts,
            });

            setStats((prev) => ({
              ...prev,
              posts: {
                total: totalPosts,
                published,
                drafts,
                scheduled,
                archived,
                totalViews,
                totalLikes,
                totalComments,
                statusCounts: counts,
                raw: dashboardPosts,
              },
            }));
          } else if (dashboardTotalPosts && Number(dashboardTotalPosts) > 0) {
            // If we have a total posts count from dashboard but no posts array, use the count
            console.log('AdminOverview: Using total posts count from dashboard API', dashboardTotalPosts);
            setStats((prev) => ({
              ...prev,
              posts: {
                ...prev.posts,
                total: Number(dashboardTotalPosts),
              },
            }));
          }
        } else if (hasValidPosts) {
          // If we have posts but total might be wrong, recalculate from counts
          setStats((prev) => {
            if (prev.posts && prev.posts.statusCounts) {
              const totalFromCounts = Object.values(prev.posts.statusCounts).reduce((sum, count) => sum + (Number(count) || 0), 0);
              const totalFromArray = normalizedPostsData.length;
              const recalculatedTotal = Math.max(totalFromCounts, totalFromArray);
              
              // Only update if the total is different and we have a valid count
              if (recalculatedTotal > 0 && prev.posts.total !== recalculatedTotal) {
                console.log('AdminOverview: Recalculating total posts', {
                  oldTotal: prev.posts.total,
                  newTotal: recalculatedTotal,
                  totalFromCounts,
                  totalFromArray,
                  statusCounts: prev.posts.statusCounts,
                });
                
                return {
                  ...prev,
                  posts: {
                    ...prev.posts,
                    total: recalculatedTotal,
                  },
                };
              }
            }
            return prev;
          });
        }
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
      setError(error.response?.data?.message || error.message || 'Failed to load statistics');
      toast.error('Failed to load statistics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllStats();
  }, [fetchAllStats]);

  // Ensure total posts is always correct based on status counts
  useEffect(() => {
    if (stats.posts) {
      const totalFromCounts = stats.posts.statusCounts
        ? Object.values(stats.posts.statusCounts).reduce(
            (sum, count) => sum + (Number(count) || 0),
            0
          )
        : 0;
      const totalFromArray = posts.length;
      
      // Also check if we have published/drafts/scheduled/archived counts
      const published = stats.posts.published || 0;
      const drafts = stats.posts.drafts || 0;
      const scheduled = stats.posts.scheduled || 0;
      const archived = stats.posts.archived || 0;
      const totalFromIndividualCounts = published + drafts + scheduled + archived;
      
      // Use the maximum of all calculations to ensure accuracy
      const recalculatedTotal = Math.max(
        totalFromCounts,
        totalFromArray,
        totalFromIndividualCounts
      );
      
      // Only update if the total is wrong (either 0 when it should be > 0, or different value)
      if (
        (recalculatedTotal > 0 && stats.posts.total !== recalculatedTotal) ||
        (stats.posts.total === 0 && (published > 0 || drafts > 0 || scheduled > 0 || archived > 0))
      ) {
        console.log('AdminOverview: Correcting total posts in useEffect', {
          oldTotal: stats.posts.total,
          newTotal: recalculatedTotal,
          totalFromCounts,
          totalFromArray,
          totalFromIndividualCounts,
          published,
          drafts,
          scheduled,
          archived,
          statusCounts: stats.posts.statusCounts,
        });
        
        setStats((prev) => ({
          ...prev,
          posts: {
            ...prev.posts,
            total: recalculatedTotal,
          },
        }));
      }
    }
  }, [stats.posts, posts.length]);

  const getPostsByCategoryData = () => {
    if (!categories.length || !posts.length) return [];
    return categories.map((cat) => {
      const categoryId = cat?._id || cat?.id || cat?.categoryId;
      const categorySlug = cat?.slug;

      const postCount = posts.filter((p) => {
        if (!p) return false;

        const postCategory = p.category;
        const postCategories = Array.isArray(p.categories) ? p.categories : [];

        const matchesSingle = () => {
          if (!postCategory) return false;
          const postCategoryId = postCategory?._id || postCategory?.id || postCategory;
          const postCategorySlug = postCategory?.slug;
          return (
            (categoryId && String(postCategoryId) === String(categoryId)) ||
            (categorySlug && postCategorySlug && postCategorySlug === categorySlug)
          );
        };

        const matchesMultiple = () => {
          if (!postCategories.length) return false;
          return postCategories.some((pcat) => {
            const catId = pcat?._id || pcat?.id || pcat;
            const catSlug = pcat?.slug;
            return (
              (categoryId && String(catId) === String(categoryId)) ||
              (categorySlug && catSlug && catSlug === categorySlug)
            );
          });
        };

        return matchesSingle() || matchesMultiple();
      }).length;

      return {
        name: cat?.name || 'Unnamed',
        posts: postCount,
      };
    });
  };

  const getPostsByMonthData = () => {
    if (!posts.length) return [];
    const monthMap = new Map();

    posts.forEach((post) => {
      const dateValue = post?.publishedAt || post?.createdAt || post?.updatedAt;
      const date = dateValue ? new Date(dateValue) : null;
      if (!date || Number.isNaN(date.getTime())) return;

      const key = `${date.getFullYear()}-${date.getMonth()}`;
      const label = `${date.toLocaleString('default', { month: 'short' })} ${date.getFullYear()}`;
      const currentCount = monthMap.get(key)?.posts || 0;
      monthMap.set(key, { month: label, posts: currentCount + 1, date });
    });

    const sorted = Array.from(monthMap.values())
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(-6)
      .map(({ month, posts }) => ({ month, posts }));

    return sorted;
  };

  const getTopPostsData = () => {
    if (!posts.length) return [];
    return [...posts]
      .filter((post) => post?.title)
      .sort((a, b) => (b?.viewCount || 0) - (a?.viewCount || 0))
      .slice(0, 5)
      .map((post) => ({
        name: post.title.length > 20 ? post.title.substring(0, 20) + '...' : post.title,
        views: post.viewCount || 0,
        likes: post.likes?.length || 0,
      }));
  };

  const getUserRoleData = () => {
    if (!stats.users) return [];

    if (
      stats.users.roleCountsDetailed &&
      typeof stats.users.roleCountsDetailed === 'object'
    ) {
      const detailedEntries = Object.entries(stats.users.roleCountsDetailed)
        .map(([roleKey, value]) => ({
          name: formatRoleLabel(roleKey),
          value: Number(value) || 0,
        }))
        .filter((item) => item.value > 0)
        .sort((a, b) => b.value - a.value);

      if (detailedEntries.length) {
        return detailedEntries;
      }
    }

    const roleData = [];
    const { totalAdmins, totalAuthors, totalRegularUsers, totalUsers } = stats.users;

    if (typeof totalAdmins === 'number' && totalAdmins > 0) {
      roleData.push({ name: formatRoleLabel('admin'), value: totalAdmins });
    }
    if (typeof totalAuthors === 'number' && totalAuthors > 0) {
      roleData.push({ name: formatRoleLabel('author'), value: totalAuthors });
    }
    if (typeof totalRegularUsers === 'number' && totalRegularUsers > 0) {
      roleData.push({ name: formatRoleLabel('user'), value: totalRegularUsers });
    }

    if (!roleData.length && typeof totalUsers === 'number') {
      roleData.push({ name: formatRoleLabel('user'), value: totalUsers });
    }

    return roleData;
  };

  const getPostStatusData = () => {
    if (!posts.length) return [];

    const toTitleCase = (str) =>
      str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substring(1));

    const normalizeKey = (value) =>
      value?.toString().trim().replace(/[_\s]+/g, ' ').toLowerCase() || '';

    const normalizeStatus = (post) => {
      const status = (post?.status || post?.state || '').toString().trim();
      if (status) return normalizeKey(status);
      if (post?.published || post?.isPublished) return 'published';
      if (post?.scheduled) return 'scheduled';
      return 'draft';
    };

    const mergedCounts = new Map();

    posts.forEach((post) => {
      const status = normalizeStatus(post);
      if (!status) return;
      mergedCounts.set(status, (mergedCounts.get(status) || 0) + 1);
    });

    const statStatusCounts = stats.posts?.statusCounts;
    if (statStatusCounts && typeof statStatusCounts === 'object') {
      Object.entries(statStatusCounts).forEach(([key, value]) => {
        const normalized = normalizeKey(key);
        if (!normalized) return;
        if (!mergedCounts.has(normalized)) {
          const numeric = Number(value) || 0;
          mergedCounts.set(normalized, numeric);
        }
      });
    }

    const entries = Array.from(mergedCounts.entries())
      .map(([key, value]) => ({
        name: toTitleCase(key),
        value,
      }))
      .filter((item) => Number(item.value) > 0);

    if (!entries.length && stats.posts?.statusCounts) {
      return Object.entries(stats.posts.statusCounts)
        .map(([name, value]) => ({
          name: toTitleCase(name.replace(/[_\s]+/g, ' ').toLowerCase()),
          value,
        }))
        .filter((item) => Number(item.value) > 0);
    }

    return entries;
  };

  const roleData = getUserRoleData();
  const statusData = getPostStatusData();
  const postsByCategoryData = getPostsByCategoryData();
  const postsByMonthData = getPostsByMonthData();
  const topPostsData = getTopPostsData();

  const engagementTotals = stats.engagement?.engagement || stats.engagement || {};
  const viewsFromEngagement = Number(
    engagementTotals.totalViews ??
      stats.engagement?.totalViews ??
      0
  );
  const likesFromEngagement = Number(
    engagementTotals.totalLikes ??
      stats.engagement?.totalLikes ??
      0
  );
  const commentsFromEngagement = Number(
    stats.engagement?.comments?.total ??
      stats.engagement?.totalComments ??
      engagementTotals.totalComments ??
      0
  );

  const viewsFromPosts = Number(stats.posts?.totalViews ?? 0);
  const likesFromPosts = Number(stats.posts?.totalLikes ?? 0);
  const commentsFromPosts = Number(stats.posts?.totalComments ?? 0);

  const totalViews = Math.max(viewsFromEngagement, viewsFromPosts);
  const totalLikes = Math.max(likesFromEngagement, likesFromPosts);
  const totalComments = Math.max(commentsFromEngagement, commentsFromPosts);
  const publishedEntry = statusData.find((item) => item?.name?.toLowerCase?.() === 'published');
  const publishedPostsCount =
    stats.posts?.published ??
    stats.posts?.statusCounts?.published ??
    publishedEntry?.value ??
    0;

  // Calculate total posts directly from multiple sources to ensure accuracy
  const calculateTotalPosts = () => {
    // Method 1: From status counts
    const totalFromStatusCounts = stats.posts?.statusCounts
      ? Object.values(stats.posts.statusCounts).reduce(
          (sum, count) => sum + (Number(count) || 0),
          0
        )
      : 0;

    // Method 2: From individual counts
    const published = stats.posts?.published || 0;
    const drafts = stats.posts?.drafts || 0;
    const scheduled = stats.posts?.scheduled || 0;
    const archived = stats.posts?.archived || 0;
    const totalFromIndividualCounts = published + drafts + scheduled + archived;

    // Method 3: From posts array
    const totalFromArray = posts.length;

    // Method 4: From stored total (if valid)
    const totalFromStored = stats.posts?.total || 0;

    // Use the maximum of all methods to ensure accuracy
    const calculatedTotal = Math.max(
      totalFromStatusCounts,
      totalFromIndividualCounts,
      totalFromArray,
      totalFromStored
    );

    // Log if there's a discrepancy
    if (calculatedTotal > 0 && totalFromStored !== calculatedTotal) {
      console.log('AdminOverview: Total posts discrepancy detected', {
        calculatedTotal,
        totalFromStored,
        totalFromStatusCounts,
        totalFromIndividualCounts,
        totalFromArray,
        published,
        drafts,
        scheduled,
        archived,
        statusCounts: stats.posts?.statusCounts,
      });
    }

    return calculatedTotal;
  };

  const totalPosts = calculateTotalPosts();

  if (loading) {
    return (
      <div className="space-y-6">
        <SkeletonLoader variant="stat" count={4} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" />
        <SkeletonLoader variant="list" count={3} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-red-900 mb-2">Error Loading Overview</h3>
          <p className="text-red-800 mb-4">{error}</p>
          <button
            onClick={() => {
              setError(null);
              fetchAllStats();
            }}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
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
            value={totalPosts}
            icon={<PenLine className="w-6 h-6" />}
            color="purple"
            subtitle={`${stats.posts?.published || 0} published`}
          />
        </AnimatedCard>
        <AnimatedCard delay={0.3}>
          <StatCard
            title="Categories"
            value={stats.categories?.total || 0}
            icon={<Boxes className="w-6 h-6" />}
            color="green"
            subtitle="Active categories"
          />
        </AnimatedCard>
        <AnimatedCard delay={0.4}>
          <StatCard
            title="Subscribers"
            value={stats.newsletter?.totalSubscribers || 0}
            icon={<UsersRound className="w-6 h-6" />}
            color="orange"
            subtitle="Newsletter subscribers"
          />
        </AnimatedCard>
      </div>

      {/* Engagement Metrics */}
      {(stats.engagement || posts.length) && (
        <AnimatedCard delay={0.5}>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Engagement Metrics</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-[var(--accent)]/12 rounded-lg">
                <LineChartIcon className="w-8 h-8 text-[var(--accent)] mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900">{totalViews}</p>
                <p className="text-sm text-gray-600">Total Views</p>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <HeartHandshake className="w-8 h-8 text-red-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900">{totalLikes}</p>
                <p className="text-sm text-gray-600">Total Likes</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <MessageSquare className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900">{totalComments}</p>
                <p className="text-sm text-gray-600">Total Comments</p>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <TrendingUp className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900">{publishedPostsCount}</p>
                <p className="text-sm text-gray-600">Published Posts</p>
              </div>
            </div>
          </div>
        </AnimatedCard>
      )}

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Roles Distribution */}
        {roleData.length > 0 && (
          <AnimatedCard delay={0.6}>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-6">Roles Distribution</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={roleData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value, percent }) =>
                      Number(value) > 0
                        ? `${formatRoleLabel(name)}: ${(percent * 100).toFixed(0)}%`
                        : ''
                    }
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {roleData.map((entry, index) => (
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
        {statusData.length > 0 && (
          <AnimatedCard delay={0.7}>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-6">Post Status Distribution</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value, percent }) =>
                      Number(value) > 0 ? `${name}: ${(percent * 100).toFixed(0)}%` : ''
                    }
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
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
        {postsByCategoryData.length > 0 && (
          <AnimatedCard delay={0.8}>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-6">Posts by Category</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={postsByCategoryData}>
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
        {postsByMonthData.length > 0 && (
          <AnimatedCard delay={0.9}>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-6">Posts Over Time</h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={postsByMonthData}>
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
      {topPostsData.length > 0 && (
        <AnimatedCard delay={1.0}>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Top 5 Posts by Views</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topPostsData} layout="vertical">
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
    blue: 'bg-[var(--accent)]/12 text-[var(--accent)]',
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

