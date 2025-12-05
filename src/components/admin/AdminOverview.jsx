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
  Sector,
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
  Tag,
  BookOpen,
  Mail,
} from 'lucide-react';
import { adminAPI, postsAPI, categoriesAPI, newsletterAPI, dashboardAPI, pollsAPI, searchAPI, followsAPI } from '../../services/api';
import toast from 'react-hot-toast';
import AnimatedCard from '../common/AnimatedCard';
import SkeletonLoader from '../common/SkeletonLoader';
import Spinner from '../common/Spinner';

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4'];
const ACTIVE_STROKE = 'var(--accent, #8b5cf6)';

const renderActiveSector = (props) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 4}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        stroke={ACTIVE_STROKE}
        strokeWidth={3}
        opacity={0.9}
      />
    </g>
  );
};

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
    categoryStats: null,
    polls: null,
    search: null,
    follows: null,
    bookmarks: null,
    readingHistory: null,
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
              { isPublished: false, includeDrafts: true },
            ];

            const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
            const extraResponses = [];
            
            for (let i = 0; i < extraQueries.length; i++) {
              if (i > 0) {
                await delay(300);
              }
              try {
                const res = await postsAPI.getAll({ limit: 1000, ...extraQueries[i] });
                extraResponses.push(normalizePosts(res));
              } catch (err) {
                if (err.response?.status === 429) {
                  await delay(1000);
                  try {
                    // Security: Validate and sanitize limit parameter
                    const sanitizedLimit = Math.min(Math.max(parseInt(1000) || 1000, 1), 1000);
                    const res = await postsAPI.getAll({ limit: sanitizedLimit, ...extraQueries[i] });
                    extraResponses.push(normalizePosts(res));
                  } catch (retryErr) {
                    console.warn(`AdminOverview: failed to fetch posts with params ${JSON.stringify(extraQueries[i])} after retry:`, retryErr);
                    extraResponses.push([]);
                  }
                } else {
                  console.warn(`AdminOverview: failed to fetch posts with params ${JSON.stringify(extraQueries[i])}:`, err);
                  extraResponses.push([]);
                }
              }
            }

            aggregatedPosts = dedupeById([
              ...primaryPosts,
              ...extraResponses.flat(),
            ]);
          }

          if (!aggregatedPosts.some(isUnpublished)) {
            await new Promise(resolve => setTimeout(resolve, 300));
            try {
              const dashboardRes = await dashboardAPI.getPosts({ limit: 1000, status: 'all', includeDrafts: true });
              const dashboardPosts = normalizePosts(dashboardRes);
              if (dashboardPosts.length) {
                aggregatedPosts = dedupeById([...aggregatedPosts, ...dashboardPosts]);
              }
            } catch (err) {
              if (err.response?.status === 429) {
                await new Promise(resolve => setTimeout(resolve, 1000));
                try {
                  const dashboardRes = await dashboardAPI.getPosts({ limit: 1000, status: 'all', includeDrafts: true });
                  const dashboardPosts = normalizePosts(dashboardRes);
                  if (dashboardPosts.length) {
                    aggregatedPosts = dedupeById([...aggregatedPosts, ...dashboardPosts]);
                  }
                } catch (retryErr) {
                  console.warn('AdminOverview: dashboard posts fallback failed after retry:', retryErr);
                }
              } else {
                console.warn('AdminOverview: dashboard posts fallback failed:', err);
              }
            }
          }

          return dedupeById(aggregatedPosts);
        } catch (error) {
          console.error('AdminOverview: error fetching comprehensive posts:', error);
          return [];
        }
      };

      const postsPromise = fetchComprehensivePosts();

      const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
      
      // COMMENTED OUT FOR TESTING
      /*
      const makeRequestWithRetry = async (requestFn, retries = 2) => {
        for (let i = 0; i <= retries; i++) {
          try {
            return await requestFn();
          } catch (err) {
            if (err.response?.status === 429 && i < retries) {
              const waitTime = (i + 1) * 1000;
              await delay(waitTime);
              continue;
            }
            return { error: err };
          }
        }
        return { error: new Error('Max retries exceeded') };
      };
      */

      const makeRequestWithRetry = async (requestFn) => {
        try {
          return await requestFn();
        } catch (err) {
          return { error: err };
        }
      };

      const userStatsRes = await Promise.resolve(makeRequestWithRetry(() => adminAPI.getUserStats()));
      const usersRes = await Promise.resolve(makeRequestWithRetry(() => adminAPI.getUsers({ limit: 1000 })));
      const categoriesRes = await Promise.resolve(makeRequestWithRetry(() => categoriesAPI.getAll()));
      const categoryStatsRes = await Promise.resolve(makeRequestWithRetry(() => categoriesAPI.getStats()));
      const newsletterStatsRes = await Promise.resolve(makeRequestWithRetry(() => adminAPI.getNewsletterStats()));
      const dashboardRes = await Promise.resolve(makeRequestWithRetry(() => dashboardAPI.getOverview()));
      const pollsRes = await Promise.resolve(makeRequestWithRetry(() => pollsAPI.getAll({ limit: 100 })));
      const popularTagsRes = await Promise.resolve(makeRequestWithRetry(() => searchAPI.getPopularTags()));
      // Security: Validate and sanitize limit parameter
      const sanitizedBookmarksLimit = Math.min(Math.max(parseInt(1000) || 1000, 1), 1000); // Between 1 and 1000
      const bookmarksRes = await Promise.resolve(makeRequestWithRetry(() => dashboardAPI.getBookmarks({ limit: sanitizedBookmarksLimit }).catch(() => ({ error: new Error('Bookmarks fetch failed') }))));

      const getData = (res) => {
        if (res?.error) return null;
        return res?.value?.data ?? res?.value ?? res?.data ?? res ?? null;
      };

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

      if (userStatsRes && !userStatsRes.error) {
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

      if (usersRes && !usersRes.error) {
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
      
      // Process posts data
      
      setPosts(normalizedPostsData);

      // Always set posts stats, even if empty
      const normalizeStatus = (post) => {
        if (!post) return 'draft';
        
        // First check explicit status field - this is the source of truth
        const status = (post?.status || post?.state || '').toString().trim().toLowerCase();
        if (status && status !== 'undefined' && status !== 'null' && status !== '') {
          // Normalize common status variations
          if (status === 'draft' || status === 'unpublished') return 'draft';
          if (status === 'published' || status === 'publish' || status === 'live' || status === 'active' || status === 'public') return 'published';
          if (status === 'scheduled' || status === 'pending') return 'scheduled';
          if (status === 'archived' || status === 'archive') return 'archived';
          return status;
        }
        
        // Fallback to boolean flags - but only if status field is not set
        if (post?.isDraft === true) return 'draft';
        if (post?.isPublished === false || post?.published === false) return 'draft';
        if (post?.published === true || post?.isPublished === true) return 'published';
        if (post?.scheduled === true) return 'scheduled';
        if (post?.archived === true) return 'archived';
        
        // Only check publishedAt/scheduledAt as last resort if status and boolean flags are not set
        // But don't use publishedAt if status is explicitly draft
        if (post?.scheduledAt) {
          const scheduledDate = new Date(post.scheduledAt);
          if (!Number.isNaN(scheduledDate.getTime()) && scheduledDate > new Date()) {
            return 'scheduled';
          }
        }
        if (post?.publishedAt && !post?.scheduledAt) {
          // Only consider published if isPublished is true or not explicitly false
          if (post?.isPublished !== false) {
            return 'published';
          }
        }
        
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

      // Sum all published variations
      const published = 
        (counts.published || 0) + 
        (counts.live || 0) + 
        (counts.active || 0) + 
        (counts.publish || 0) +
        (counts.public || 0);
      const drafts = (counts.draft || 0) + (counts.drafts || 0) + (counts.unpublished || 0);
      const scheduled = (counts.scheduled || 0) + (counts.pending || 0);
      const archived = (counts.archived || 0) + (counts.archive || 0);
      
      // Calculate total as sum of all status counts to ensure accuracy
      const totalFromCounts = Object.values(counts).reduce((sum, count) => sum + (Number(count) || 0), 0);
      const totalFromArray = normalizedPostsData.length;
      // Use the larger value to ensure we don't miss any posts
      const totalPosts = Math.max(totalFromCounts, totalFromArray);
      
      const totalViews = (Array.isArray(normalizedPostsData) ? normalizedPostsData : []).reduce((sum, p) => {
        if (!p) return sum;
        const views = Number(p?.viewCount) || Number(p?.views) || 0;
        return sum + (Number.isFinite(views) ? views : 0);
      }, 0);
      const totalLikes = (Array.isArray(normalizedPostsData) ? normalizedPostsData : []).reduce((sum, p) => {
        if (!p) return sum;
        if (Array.isArray(p?.likes)) return sum + (p.likes.length || 0);
        const likes = Number(p?.likeCount) || Number(p?.likes) || 0;
        return sum + (Number.isFinite(likes) ? likes : 0);
      }, 0);
      const totalComments = (Array.isArray(normalizedPostsData) ? normalizedPostsData : []).reduce((sum, p) => {
        if (!p) return sum;
        // Count all comments including replies (consistent with Analytics)
        if (Array.isArray(p?.comments) && p.comments.length > 0) {
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
        const comments = Number(p?.commentCount) || Number(p?.comments) || 0;
        return sum + (Number.isFinite(comments) ? comments : 0);
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

      if (categoriesRes && !categoriesRes.error) {
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

      if (newsletterStatsRes && !newsletterStatsRes.error) {
        const newsletterData = getData(newsletterStatsRes);
        setStats((prev) => ({ ...prev, newsletter: newsletterData || null }));
      }

      // Process category statistics
      if (categoryStatsRes && !categoryStatsRes.error) {
        const categoryStatsData = getData(categoryStatsRes);
        setStats((prev) => ({
          ...prev,
          categoryStats: categoryStatsData || null,
        }));
      }

      // Process polls data
      if (pollsRes && !pollsRes.error) {
        const pollsData = getData(pollsRes);
        const pollsArray = pollsData?.polls || pollsData?.data || (Array.isArray(pollsData) ? pollsData : []) || [];
        const normalizedPolls = Array.isArray(pollsArray) ? pollsArray.filter(Boolean) : [];
        
        // Calculate poll statistics
        const totalPolls = normalizedPolls.length;
        const activePolls = normalizedPolls.filter(p => {
          if (!p) return false;
          if (p.isActive === false) return false;
          if (p.endDate) {
            const endDate = new Date(p.endDate);
            if (!Number.isNaN(endDate.getTime()) && endDate <= new Date()) return false;
          }
          return true;
        }).length;
        const totalVotes = normalizedPolls.reduce((sum, poll) => {
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
              // Try multiple vote count field names
              const voteCount = Number(option.votes) || Number(option.voteCount) || Number(option.count) || 0;
              return optionSum + (Number.isFinite(voteCount) ? voteCount : 0);
            }, 0);
            if (votesFromOptions > 0) return sum + votesFromOptions;
          }
          
          // Method 4: From results object (if votes are stored as { optionId: count })
          if (poll.results && typeof poll.results === 'object' && !Array.isArray(poll.results)) {
            const votesFromResults = Object.values(poll.results).reduce((resultSum, count) => {
              const voteCount = Number(count) || 0;
              return resultSum + (Number.isFinite(voteCount) ? voteCount : 0);
            }, 0);
            if (votesFromResults > 0) return sum + votesFromResults;
          }
          
          // Method 5: From votes array (array of vote objects)
          if (poll.votes && Array.isArray(poll.votes)) {
            return sum + (poll.votes.length || 0);
          }
          
          return sum;
        }, 0);
        
        setStats((prev) => ({
          ...prev,
          polls: {
            total: totalPolls,
            active: activePolls,
            totalVotes,
            polls: normalizedPolls,
          },
        }));
      }

      // Process search/popular tags data
      if (popularTagsRes && !popularTagsRes.error) {
        const tagsData = getData(popularTagsRes);
        const tagsArray = tagsData?.tags || tagsData?.data || tagsData?.popularTags || (Array.isArray(tagsData) ? tagsData : []) || [];
        const normalizedTags = Array.isArray(tagsArray) ? tagsArray.filter(Boolean) : [];
        
        setStats((prev) => ({
          ...prev,
          search: {
            popularTags: normalizedTags,
            totalTags: normalizedTags.length,
          },
        }));
      }

      // Process bookmarks - try multiple sources
      let bookmarksArray = [];
      
      // Method 1: From dedicated bookmarks API response
      if (bookmarksRes && !bookmarksRes.error) {
        const bookmarksData = getData(bookmarksRes);
        const bookmarksFromAPI = bookmarksData?.bookmarks || bookmarksData?.posts || bookmarksData?.data || (Array.isArray(bookmarksData) ? bookmarksData : []);
        // Security: Ensure it's an array and limit size to prevent DoS
        if (Array.isArray(bookmarksFromAPI) && bookmarksFromAPI.length > 0) {
          bookmarksArray = bookmarksFromAPI.filter(b => b != null).slice(0, 1000); // Limit to 1000 items
        }
      }
      
      // Method 2: From dashboard overview (fallback)
      if (bookmarksArray.length === 0 && dashboardRes && !dashboardRes.error) {
        const dashboardData = getData(dashboardRes);
        const bookmarksFromDashboard = dashboardData?.overview?.bookmarks || dashboardData?.bookmarks || null;
        if (bookmarksFromDashboard) {
          const dashboardArray = Array.isArray(bookmarksFromDashboard) ? bookmarksFromDashboard.filter(b => b != null) : [];
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
      const uniqueBookmarkedPosts = new Set(sanitizedBookmarks.map(b => {
        if (!b) return null;
        const postId = b.postId || b.post?._id || b.post?.id || b._id || b.id || null;
        // Security: Validate postId format (MongoDB ObjectId)
        if (postId && typeof postId === 'string' && /^[0-9a-fA-F]{24}$/.test(postId)) {
          return postId;
        }
        return null;
      }).filter(Boolean)).size;
      
      // Always set bookmarks stats (even if 0)
      setStats((prev) => ({
        ...prev,
        bookmarks: {
          totalBookmarks: sanitizedBookmarks.length,
          uniquePostsBookmarked: Number.isFinite(uniqueBookmarkedPosts) ? uniqueBookmarkedPosts : 0,
          bookmarks: sanitizedBookmarks,
        },
      }));
      
      // Process reading history from dashboard
      if (dashboardRes && !dashboardRes.error) {
        const dashboardData = getData(dashboardRes);
        const readingHistory = dashboardData?.overview?.history || dashboardData?.history || null;
        
        if (readingHistory) {
          const historyArray = Array.isArray(readingHistory) ? readingHistory.filter(h => h != null) : [];
          const uniquePostsRead = new Set(historyArray.map(h => {
            if (!h) return null;
            return h.postId || h.post?._id || h.post?.id || null;
          }).filter(Boolean)).size;
          
          setStats((prev) => ({
            ...prev,
            readingHistory: {
              totalReads: historyArray.length,
              uniquePostsRead: Number.isFinite(uniquePostsRead) ? uniquePostsRead : 0,
              history: historyArray,
            },
          }));
        }
      }

      // Process follow statistics (aggregate from users)
      if (usersRes && !usersRes.error) {
        const usersPayload = getData(usersRes);
        const extractedUsers = usersPayload?.users || usersPayload?.data || (Array.isArray(usersPayload) ? usersPayload : []) || [];
        const usersList = Array.isArray(extractedUsers) ? extractedUsers.filter(Boolean) : [];
        
        if (usersList.length > 0) {
          // Fetch follow stats for authors (limit to avoid too many requests)
          const authors = usersList.filter(u => u.role === 'author' || u.isVerifiedAuthor).slice(0, 20);
          
          if (authors.length > 0) {
            const followStatsPromises = authors.map(async (author) => {
              try {
                const authorId = author._id || author.id;
                if (!authorId) return null;
                const followStats = await followsAPI.getStats(authorId).catch(() => null);
                if (followStats?.data) {
                  return {
                    authorId,
                    authorName: author.username || author.email,
                    ...followStats.data,
                  };
                }
                return null;
              } catch (error) {
                return null;
              }
            });
            
            const followStatsResults = await Promise.all(followStatsPromises);
            const validFollowStats = followStatsResults.filter(Boolean);
            
            const totalFollowers = validFollowStats.reduce((sum, stat) => {
              if (!stat) return sum;
              const followers = Number(stat.followers) || 0;
              return sum + (Number.isFinite(followers) ? followers : 0);
            }, 0);
            const totalFollowing = validFollowStats.reduce((sum, stat) => {
              if (!stat) return sum;
              const following = Number(stat.following) || 0;
              return sum + (Number.isFinite(following) ? following : 0);
            }, 0);
            const topAuthors = [...validFollowStats]
              .filter(stat => stat != null)
              .sort((a, b) => {
                const aFollowers = Number(a?.followers) || 0;
                const bFollowers = Number(b?.followers) || 0;
                return (Number.isFinite(bFollowers) ? bFollowers : 0) - (Number.isFinite(aFollowers) ? aFollowers : 0);
              })
              .slice(0, 5);
            
            setStats((prev) => ({
              ...prev,
              follows: {
                totalFollowers,
                totalFollowing,
                topAuthors,
                authorStats: validFollowStats,
              },
            }));
          }
        }
      }

      if (dashboardRes && !dashboardRes.error) {
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
            
            const totalViews = (Array.isArray(dashboardPosts) ? dashboardPosts : []).reduce((sum, p) => {
              if (!p) return sum;
              const views = Number(p?.viewCount) || Number(p?.views) || 0;
              return sum + (Number.isFinite(views) ? views : 0);
            }, 0);
            const totalLikes = (Array.isArray(dashboardPosts) ? dashboardPosts : []).reduce((sum, p) => {
              if (!p) return sum;
              if (Array.isArray(p?.likes)) return sum + (p.likes.length || 0);
              const likes = Number(p?.likeCount) || Number(p?.likes) || 0;
              return sum + (Number.isFinite(likes) ? likes : 0);
            }, 0);
            const totalComments = (Array.isArray(dashboardPosts) ? dashboardPosts : []).reduce((sum, p) => {
              if (!p) return sum;
              // Count all comments including replies (consistent with Analytics)
              if (Array.isArray(p?.comments) && p.comments.length > 0) {
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
              const comments = Number(p?.commentCount) || Number(p?.comments) || 0;
              return sum + (Number.isFinite(comments) ? comments : 0);
            }, 0);

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
    if (!Array.isArray(categories) || !categories.length || !Array.isArray(posts) || !posts.length) return [];
    return categories
      .filter(cat => cat != null)
      .map((cat) => {
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
              if (!pcat) return false;
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
          posts: Number.isFinite(postCount) ? postCount : 0,
        };
      })
      .filter(item => item.posts > 0);
  };

  const getPostsByMonthData = () => {
    if (!Array.isArray(posts) || !posts.length) return [];
    const monthMap = new Map();

    posts.forEach((post) => {
      if (!post) return;
      const dateValue = post?.publishedAt || post?.createdAt || post?.updatedAt;
      if (!dateValue) return;
      
      const date = new Date(dateValue);
      if (!date || Number.isNaN(date.getTime()) || !Number.isFinite(date.getTime())) return;

      const year = date.getFullYear();
      const month = date.getMonth();
      if (!Number.isFinite(year) || !Number.isFinite(month)) return;

      const key = `${year}-${month}`;
      const label = `${date.toLocaleString('default', { month: 'short' })} ${year}`;
      const currentCount = monthMap.get(key)?.posts || 0;
      monthMap.set(key, { month: label, posts: currentCount + 1, date });
    });

    const sorted = Array.from(monthMap.values())
      .filter(item => item && item.date && Number.isFinite(item.date.getTime()))
      .sort((a, b) => {
        if (!a.date || !b.date) return 0;
        return a.date.getTime() - b.date.getTime();
      })
      .slice(-6)
      .map(({ month, posts }) => ({ month, posts: Number.isFinite(posts) ? posts : 0 }))
      .filter(item => item.posts > 0);

    return sorted;
  };

  const getTopPostsData = () => {
    if (!Array.isArray(posts) || !posts.length) return [];
    return [...posts]
      .filter((post) => post && post?.title && typeof post.title === 'string')
      .sort((a, b) => {
        const aViews = Number(a?.viewCount) || 0;
        const bViews = Number(b?.viewCount) || 0;
        return (Number.isFinite(bViews) ? bViews : 0) - (Number.isFinite(aViews) ? aViews : 0);
      })
      .slice(0, 5)
      .map((post) => {
        const title = post?.title || 'Untitled';
        const views = Number(post?.viewCount) || 0;
        const likes = Array.isArray(post?.likes) ? post.likes.length : (Number(post?.likeCount) || 0);
        return {
          name: title.length > 20 ? title.substring(0, 20) + '...' : title,
          views: Number.isFinite(views) ? views : 0,
          likes: Number.isFinite(likes) ? likes : 0,
        };
      })
      .filter(item => item.views > 0 || item.likes > 0);
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
      if (!post) return 'draft';
      
      // First check explicit status field - this is the source of truth
      const status = (post?.status || post?.state || '').toString().trim().toLowerCase();
      if (status && status !== 'undefined' && status !== 'null' && status !== '') {
        // Normalize common status variations
        if (status === 'draft' || status === 'unpublished') return 'draft';
        if (status === 'published' || status === 'publish' || status === 'live' || status === 'active' || status === 'public') return 'published';
        if (status === 'scheduled' || status === 'pending') return 'scheduled';
        if (status === 'archived' || status === 'archive') return 'archived';
        return normalizeKey(status);
      }
      
      // Fallback to boolean flags - but only if status field is not set
      if (post?.isDraft === true) return 'draft';
      if (post?.isPublished === false || post?.published === false) return 'draft';
      if (post?.published === true || post?.isPublished === true) return 'published';
      if (post?.scheduled === true) return 'scheduled';
      if (post?.archived === true) return 'archived';
      
      // Only check publishedAt/scheduledAt as last resort if status and boolean flags are not set
      // But don't use publishedAt if status is explicitly draft or isPublished is false
      if (post?.scheduledAt) {
        const scheduledDate = new Date(post.scheduledAt);
        if (!Number.isNaN(scheduledDate.getTime()) && scheduledDate > new Date()) {
          return 'scheduled';
        }
      }
      if (post?.publishedAt && !post?.scheduledAt) {
        // Only consider published if isPublished is true or not explicitly false
        if (post?.isPublished !== false) {
          return 'published';
        }
      }
      
      return 'draft';
    };

    const mergedCounts = new Map();

    (Array.isArray(posts) ? posts : []).forEach((post) => {
      if (!post) return;
      const status = normalizeStatus(post);
      if (!status || status === 'undefined' || status === 'null') return;
      const currentCount = mergedCounts.get(status) || 0;
      mergedCounts.set(status, currentCount + 1);
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
      .filter(([key, value]) => key && typeof key === 'string' && Number.isFinite(Number(value)) && Number(value) > 0)
      .map(([key, value]) => ({
        name: toTitleCase(key),
        value: Number(value) || 0,
      }))
      .filter((item) => item.value > 0);

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
  const derivePublishedPosts = () => {
    // Method 1: From statusData (chart data) - most reliable
    const publishedEntry = statusData.find((item) => {
      const name = item?.name?.toLowerCase() || '';
      return name === 'published' || name === 'publish' || name.includes('published');
    });
    const fromStatusData = Number(publishedEntry?.value) || 0;

    // Method 2: From stats.posts.published (direct count)
    const fromStatsDirect = Number(stats.posts?.published) || 0;

    // Method 3: From statusCounts object
    const statusCounts = stats.posts?.statusCounts || {};
    const statusSynonyms = ['published', 'publish', 'live', 'active', 'public'];
    const fromStatusCounts = Object.entries(statusCounts).reduce((sum, [key, value]) => {
      const k = key?.toString().toLowerCase() || '';
      if (statusSynonyms.some((syn) => k === syn || k.includes('publish'))) {
        return sum + (Number(value) || 0);
      }
      return sum;
    }, 0);

    // Method 4: Count from posts array directly
    const fromPostsArray = (Array.isArray(posts) ? posts : []).reduce((count, post) => {
      if (!post) return count;
      const status = (post?.status || post?.state || '').toString().toLowerCase().trim();
      
      // First priority: explicit status field
      if (status && status !== 'undefined' && status !== 'null' && status !== '') {
        // If status is explicitly draft, don't count as published
        if (status === 'draft' || status === 'unpublished') return count;
        // If status is published, count it
        if (statusSynonyms.includes(status) || status.includes('publish')) return count + 1;
      }
      
      // Second priority: boolean flags (only if status is not set)
      if (!status || status === 'undefined' || status === 'null' || status === '') {
        // If explicitly draft, don't count
        if (post?.isDraft === true || post?.isPublished === false || post?.published === false) return count;
        // If explicitly published, count it
        if (post?.published === true || post?.isPublished === true) return count + 1;
      }
      
      // Last resort: publishedAt (but only if status is not explicitly draft and isPublished is not false)
      if (post?.publishedAt && !post?.scheduledAt) {
        // Don't use publishedAt if status is draft or isPublished is false
        if (status === 'draft' || post?.isPublished === false || post?.published === false) return count;
        const publishedDate = new Date(post.publishedAt);
        if (!Number.isNaN(publishedDate.getTime()) && post?.isPublished !== false) return count + 1;
      }
      
      return count;
    }, 0);

    // Method 5: From engagement/overview stats
    const fromEngagement =
      Number(stats.engagement?.publishedPosts) ||
      Number(stats.engagement?.stats?.publishedPosts) ||
      Number(stats.engagement?.overview?.publishedPosts) ||
      0;

    // Method 6: Fallback calculation (total - non-published)
    const drafts = Number(stats.posts?.drafts) || 0;
    const scheduled = Number(stats.posts?.scheduled) || 0;
    const archived = Number(stats.posts?.archived) || 0;
    const totalPostsFallback =
      Number(stats.posts?.total) ||
      posts.length ||
      0;
    const fromTotals = Math.max(totalPostsFallback - drafts - scheduled - archived, 0);

    // Return the maximum of all methods to ensure accuracy
    const calculated = Math.max(
      fromStatusData,
      fromStatsDirect,
      fromStatusCounts,
      fromPostsArray,
      fromEngagement,
      fromTotals
    );

    return calculated;
  };

  const publishedPostsCount = derivePublishedPosts();

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

    // Note: Discrepancies are handled silently

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
        <h2 className="text-3xl font-bold text-[var(--text-primary)] mb-2">Admin Overview</h2>
        <p className="text-[var(--text-secondary)]">Comprehensive statistics and analytics dashboard</p>
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
          <div className="bg-[var(--surface-bg)] rounded-xl shadow-sm border border-[var(--border-subtle)] p-6">
            <h3 className="text-xl font-bold text-[var(--text-primary)] mb-6">Engagement Metrics</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-[var(--surface-subtle)] border border-[var(--border-subtle)] rounded-lg">
                <LineChartIcon className="w-8 h-8 text-[var(--accent)] mx-auto mb-2" />
                <p className="text-2xl font-bold text-[var(--text-primary)]">{totalViews}</p>
                <p className="text-sm text-[var(--text-secondary)]">Total Views</p>
              </div>
              <div className="text-center p-4 bg-[var(--surface-subtle)] border border-[var(--border-subtle)] rounded-lg">
                <HeartHandshake className="w-8 h-8 text-rose-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-[var(--text-primary)]">{totalLikes}</p>
                <p className="text-sm text-[var(--text-secondary)]">Total Likes</p>
              </div>
              <div className="text-center p-4 bg-[var(--surface-subtle)] border border-[var(--border-subtle)] rounded-lg">
                <MessageSquare className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-[var(--text-primary)]">{totalComments}</p>
                <p className="text-sm text-[var(--text-secondary)]">Total Comments</p>
              </div>
              <div className="text-center p-4 bg-[var(--surface-subtle)] border border-[var(--border-subtle)] rounded-lg">
                <TrendingUp className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-[var(--text-primary)]">{publishedPostsCount}</p>
                <p className="text-sm text-[var(--text-secondary)]">Published Posts</p>
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
            <div className="bg-[var(--surface-bg)] rounded-xl shadow-sm border border-[var(--border-subtle)] p-6">
              <h3 className="text-xl font-bold text-[var(--text-primary)] mb-6">Roles Distribution</h3>
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
                    activeShape={renderActiveSector}
                  >
                    {roleData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'var(--surface-bg)', 
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '12px',
                      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                    }}
                    labelStyle={{ color: 'var(--text-primary)', fontWeight: 600 }}
                    itemStyle={{ color: 'var(--text-primary)' }}
                  />
                  <Legend 
                    wrapperStyle={{ color: 'var(--text-primary)' }}
                    iconType="circle"
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </AnimatedCard>
        )}

        {/* Post Status Distribution */}
        {statusData.length > 0 && (
          <AnimatedCard delay={0.7}>
            <div className="bg-[var(--surface-bg)] rounded-xl shadow-sm border border-[var(--border-subtle)] p-6">
              <h3 className="text-xl font-bold text-[var(--text-primary)] mb-6">Post Status Distribution</h3>
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
                    activeShape={renderActiveSector}
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'var(--surface-bg)', 
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '12px',
                      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                    }}
                    labelStyle={{ color: 'var(--text-primary)', fontWeight: 600 }}
                    itemStyle={{ color: 'var(--text-primary)' }}
                  />
                  <Legend 
                    wrapperStyle={{ color: 'var(--text-primary)' }}
                    iconType="circle"
                  />
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
            <div className="bg-gradient-to-br from-[var(--surface-bg)] to-[var(--surface-subtle)] rounded-2xl shadow-lg border border-[var(--border-subtle)] p-6 relative overflow-hidden">
              {/* Decorative background */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-full blur-3xl -mr-16 -mt-16" />
              
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-[var(--text-primary)] mb-1">Posts by Category</h3>
                    <p className="text-sm text-[var(--text-muted)]">Distribution across categories</p>
                  </div>
                  <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/20 border border-blue-500/30">
                    <Boxes className="w-6 h-6 text-blue-500" />
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={postsByCategoryData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="categoryGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.9} />
                        <stop offset="100%" stopColor="#1d4ed8" stopOpacity={0.7} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" opacity={0.3} />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
                      axisLine={{ stroke: 'var(--border-subtle)' }}
                      tickLine={{ stroke: 'var(--border-subtle)' }}
                    />
                    <YAxis 
                      tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
                      axisLine={{ stroke: 'var(--border-subtle)' }}
                      tickLine={{ stroke: 'var(--border-subtle)' }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'var(--surface-bg)', 
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '12px',
                        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                      }}
                      labelStyle={{ color: 'var(--text-primary)', fontWeight: 600 }}
                      itemStyle={{ color: 'var(--text-primary)' }}
                      cursor={{ fill: 'rgba(59, 130, 246, 0.1)', stroke: '#3b82f6', strokeWidth: 1 }}
                    />
                    <Bar 
                      dataKey="posts" 
                      fill="url(#categoryGradient)"
                      radius={[8, 8, 0, 0]}
                      stroke="#2563eb"
                      strokeWidth={1}
                      activeBar={{ fill: '#60a5fa', stroke: '#2563eb', strokeWidth: 2 }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </AnimatedCard>
        )}

        {/* Posts Over Time */}
        {postsByMonthData.length > 0 && (
          <AnimatedCard delay={0.9}>
            <div className="bg-gradient-to-br from-[var(--surface-bg)] to-[var(--surface-subtle)] rounded-2xl shadow-lg border border-[var(--border-subtle)] p-6 relative overflow-hidden">
              {/* Decorative background */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-full blur-3xl -mr-16 -mt-16" />
              
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-[var(--text-primary)] mb-1">Posts Over Time</h3>
                    <p className="text-sm text-[var(--text-muted)]">Last 6 months trend</p>
                  </div>
                  <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30">
                    <TrendingUp className="w-6 h-6 text-purple-500" />
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={320}>
                  <AreaChart data={postsByMonthData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="timeGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.8} />
                        <stop offset="50%" stopColor="#a855f7" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="#ec4899" stopOpacity={0.1} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" opacity={0.3} />
                    <XAxis 
                      dataKey="month" 
                      tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
                      axisLine={{ stroke: 'var(--border-subtle)' }}
                      tickLine={{ stroke: 'var(--border-subtle)' }}
                    />
                    <YAxis 
                      tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
                      axisLine={{ stroke: 'var(--border-subtle)' }}
                      tickLine={{ stroke: 'var(--border-subtle)' }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'var(--surface-bg)', 
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '12px',
                        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                      }}
                      labelStyle={{ color: 'var(--text-primary)', fontWeight: 600 }}
                      itemStyle={{ color: 'var(--text-primary)' }}
                      cursor={{ stroke: '#8b5cf6', strokeWidth: 2, strokeDasharray: '5 5' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="posts" 
                      stroke="url(#timeGradient)"
                      strokeWidth={3}
                      fill="url(#timeGradient)"
                      dot={{ fill: '#a855f7', strokeWidth: 2, r: 5 }}
                      activeDot={{ r: 8, stroke: '#8b5cf6', strokeWidth: 3, fill: '#a855f7' }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </AnimatedCard>
        )}
      </div>

      {/* Top Posts */}
      {topPostsData.length > 0 && (
        <AnimatedCard delay={1.0}>
          <div className="bg-gradient-to-br from-[var(--surface-bg)] to-[var(--surface-subtle)] rounded-2xl shadow-lg border border-[var(--border-subtle)] p-6 relative overflow-hidden">
            {/* Decorative background */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 rounded-full blur-3xl -mr-16 -mt-16" />
            
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-[var(--text-primary)] mb-1">Top 5 Posts by Views</h3>
                  <p className="text-sm text-[var(--text-muted)]">Most viewed content</p>
                </div>
                <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30">
                  <Eye className="w-6 h-6 text-emerald-500" />
                </div>
              </div>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={topPostsData} layout="vertical" margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="viewsGradient" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="#059669" stopOpacity={0.7} />
                    </linearGradient>
                    <linearGradient id="likesGradient" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#ef4444" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="#dc2626" stopOpacity={0.7} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" opacity={0.3} horizontal={true} />
                  <XAxis 
                    type="number" 
                    tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
                    axisLine={{ stroke: 'var(--border-subtle)' }}
                    tickLine={{ stroke: 'var(--border-subtle)' }}
                  />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    width={180}
                    tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                    axisLine={{ stroke: 'var(--border-subtle)' }}
                    tickLine={{ stroke: 'var(--border-subtle)' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'var(--surface-bg)', 
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '12px',
                      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                    }}
                    labelStyle={{ color: 'var(--text-primary)', fontWeight: 600 }}
                    itemStyle={{ color: 'var(--text-primary)' }}
                    cursor={{ fill: 'rgba(16, 185, 129, 0.1)', stroke: '#10b981', strokeWidth: 1 }}
                  />
                  <Legend 
                    wrapperStyle={{ paddingTop: '20px', color: 'var(--text-primary)' }}
                    iconType="circle"
                  />
                  <Bar 
                    dataKey="views" 
                    fill="url(#viewsGradient)" 
                    name="Views"
                    radius={[0, 8, 8, 0]}
                    stroke="#059669"
                    strokeWidth={1}
                    activeBar={{ fill: '#34d399', stroke: '#059669', strokeWidth: 2 }}
                  />
                  <Bar 
                    dataKey="likes" 
                    fill="url(#likesGradient)" 
                    name="Likes"
                    radius={[0, 8, 8, 0]}
                    stroke="#dc2626"
                    strokeWidth={1}
                    activeBar={{ fill: '#f87171', stroke: '#dc2626', strokeWidth: 2 }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </AnimatedCard>
      )}

      {/* Additional Analytics Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Polls Statistics */}
        {stats.polls && stats.polls.total > 0 && (
          <AnimatedCard delay={1.0}>
            <div className="bg-gradient-to-br from-[var(--surface-bg)] to-[var(--surface-subtle)] rounded-2xl shadow-lg border border-[var(--border-subtle)] p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">Polls Analytics</h3>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.polls.total}</p>
                  <p className="text-sm text-[var(--text-muted)]">Total Polls</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.polls.active}</p>
                  <p className="text-sm text-[var(--text-muted)]">Active</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.polls.totalVotes}</p>
                  <p className="text-sm text-[var(--text-muted)]">Total Votes</p>
                </div>
              </div>
            </div>
          </AnimatedCard>
        )}

        {/* Category Statistics */}
        {stats.categoryStats && (
          <AnimatedCard delay={1.1}>
            <div className="bg-gradient-to-br from-[var(--surface-bg)] to-[var(--surface-subtle)] rounded-2xl shadow-lg border border-[var(--border-subtle)] p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                  <Boxes className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">Category Statistics</h3>
              </div>
              {stats.categoryStats.totalCategories !== undefined && (
                <div className="text-center">
                  <p className="text-3xl font-bold text-[var(--text-primary)]">{stats.categoryStats.totalCategories}</p>
                  <p className="text-sm text-[var(--text-muted)]">Total Categories</p>
                </div>
              )}
              {stats.categoryStats.mostUsedCategory && (
                <div className="mt-4 pt-4 border-t border-[var(--border-subtle)]">
                  <p className="text-sm text-[var(--text-muted)] mb-1">Most Used</p>
                  <p className="text-lg font-semibold text-[var(--text-primary)]">{stats.categoryStats.mostUsedCategory}</p>
                </div>
              )}
            </div>
          </AnimatedCard>
        )}

        {/* Search Analytics */}
        {stats.search && stats.search.popularTags && stats.search.popularTags.length > 0 && (
          <AnimatedCard delay={1.2}>
            <div className="bg-gradient-to-br from-[var(--surface-bg)] to-[var(--surface-subtle)] rounded-2xl shadow-lg border border-[var(--border-subtle)] p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                  <Tag className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">Popular Tags</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {stats.search.popularTags.slice(0, 10).map((tag, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-[var(--accent)]/10 text-[var(--accent)] rounded-full text-sm font-medium"
                  >
                    {typeof tag === 'string' ? tag : tag.name || tag.tag || 'Unknown'}
                  </span>
                ))}
              </div>
              {stats.search.totalTags > 10 && (
                <p className="text-sm text-[var(--text-muted)] mt-3">
                  +{stats.search.totalTags - 10} more tags
                </p>
              )}
            </div>
          </AnimatedCard>
        )}

        {/* Follow Statistics */}
        {stats.follows && (
          <AnimatedCard delay={1.3}>
            <div className="bg-gradient-to-br from-[var(--surface-bg)] to-[var(--surface-subtle)] rounded-2xl shadow-lg border border-[var(--border-subtle)] p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-pink-100 dark:bg-pink-900/20 rounded-lg">
                  <UsersRound className="w-5 h-5 text-pink-600 dark:text-pink-400" />
                </div>
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">Follow Statistics</h3>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.follows.totalFollowers}</p>
                  <p className="text-sm text-[var(--text-muted)]">Total Followers</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.follows.totalFollowing}</p>
                  <p className="text-sm text-[var(--text-muted)]">Total Following</p>
                </div>
              </div>
              {stats.follows.topAuthors && stats.follows.topAuthors.length > 0 && (
                <div className="mt-4 pt-4 border-t border-[var(--border-subtle)]">
                  <p className="text-sm font-semibold text-[var(--text-primary)] mb-2">Top Authors</p>
                  <div className="space-y-2">
                    {stats.follows.topAuthors.slice(0, 3).map((author, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <span className="text-sm text-[var(--text-secondary)]">{author.authorName}</span>
                        <span className="text-sm font-medium text-[var(--text-primary)]">{author.followers || 0} followers</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </AnimatedCard>
        )}

        {/* Reading History */}
        {stats.readingHistory && stats.readingHistory.totalReads > 0 && (
          <AnimatedCard delay={1.4}>
            <div className="bg-gradient-to-br from-[var(--surface-bg)] to-[var(--surface-subtle)] rounded-2xl shadow-lg border border-[var(--border-subtle)] p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-indigo-100 dark:bg-indigo-900/20 rounded-lg">
                  <BookOpen className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">Reading History</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.readingHistory.totalReads}</p>
                  <p className="text-sm text-[var(--text-muted)]">Total Reads</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.readingHistory.uniquePostsRead}</p>
                  <p className="text-sm text-[var(--text-muted)]">Unique Posts</p>
                </div>
              </div>
            </div>
          </AnimatedCard>
        )}

        {/* Bookmarks Statistics */}
        {stats.bookmarks && (
          <AnimatedCard delay={1.5}>
            <div className="bg-gradient-to-br from-[var(--surface-bg)] to-[var(--surface-subtle)] rounded-2xl shadow-lg border border-[var(--border-subtle)] p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-amber-100 dark:bg-amber-900/20 rounded-lg">
                  <BookOpen className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">Bookmarks</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.bookmarks.totalBookmarks || 0}</p>
                  <p className="text-sm text-[var(--text-muted)]">Total Bookmarks</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.bookmarks.uniquePostsBookmarked || 0}</p>
                  <p className="text-sm text-[var(--text-muted)]">Unique Posts</p>
                </div>
              </div>
            </div>
          </AnimatedCard>
        )}

        {/* Newsletter Detailed Analytics */}
        {stats.newsletter && (stats.newsletter.openRate !== undefined || stats.newsletter.clickRate !== undefined) && (
          <AnimatedCard delay={1.6}>
            <div className="bg-gradient-to-br from-[var(--surface-bg)] to-[var(--surface-subtle)] rounded-2xl shadow-lg border border-[var(--border-subtle)] p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-teal-100 dark:bg-teal-900/20 rounded-lg">
                  <Mail className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                </div>
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">Newsletter Performance</h3>
              </div>
              {stats.newsletter.openRate !== undefined && (
                <div className="mb-4">
                  <p className="text-3xl font-bold text-[var(--text-primary)]">{stats.newsletter.openRate}%</p>
                  <p className="text-sm text-[var(--text-muted)]">Open Rate</p>
                </div>
              )}
              {stats.newsletter.clickRate !== undefined && (
                <div className="mt-4 pt-4 border-t border-[var(--border-subtle)]">
                  <p className="text-xl font-bold text-[var(--text-primary)]">{stats.newsletter.clickRate}%</p>
                  <p className="text-sm text-[var(--text-muted)]">Click Rate</p>
                </div>
              )}
            </div>
          </AnimatedCard>
        )}
      </div>
    </div>
  );
};

const StatCard = ({ title, value, icon, color, subtitle }) => {
  const colorClasses = {
    blue: 'bg-[var(--accent)]/12 text-[var(--accent)]',
    purple: 'bg-purple-400/15 text-purple-300',
    green: 'bg-emerald-400/15 text-emerald-300',
    orange: 'bg-amber-400/15 text-amber-300',
  };

  return (
    <motion.div
      className="bg-[var(--surface-bg)] rounded-xl shadow-sm border border-[var(--border-subtle)] p-6"
      whileHover={{ scale: 1.02, y: -4 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-[var(--text-secondary)]">{title}</p>
          <p className="text-3xl font-bold text-[var(--text-primary)] mt-2">{value}</p>
          {subtitle && <p className="text-xs text-[var(--text-muted)] mt-1">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>{icon}</div>
      </div>
    </motion.div>
  );
};

export default AdminOverview;

