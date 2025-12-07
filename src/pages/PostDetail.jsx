import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { format } from 'date-fns';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Calendar, 
  Eye, 
  Heart, 
  Share2, 
  MessageCircle, 
  Bookmark,
  ThumbsUp,
  ThumbsDown,
  X,
  Tag,
  Maximize,
  BookOpen,
  User,
  Users,
  UserPlus,
  UserMinus
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import DOMPurify from 'dompurify';
import { postsAPI, commentsAPI, interactionsAPI, pollsAPI, collaborationsAPI, followsAPI } from '../services/api';
import { clearCache } from '../utils/apiCache';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import toast from 'react-hot-toast';
import ReadingProgress from '../components/common/ReadingProgress';
import { calculateReadingTime, formatReadingTime } from '../utils/readingTime';
import { Clock } from 'lucide-react';
import Spinner from '../components/common/Spinner';
import Seo, { DEFAULT_OG_IMAGE } from '../components/common/Seo';
import SocialShare from '../components/posts/SocialShare';
import OptimizedImage from '../components/common/OptimizedImage';
import EmptyState from '../components/common/EmptyState';
import FullscreenReader from '../components/posts/FullscreenReader';
import ImageLightbox from '../components/common/ImageLightbox';
import ReadingList from '../components/posts/ReadingList';
import PostRecommendations from '../components/posts/PostRecommendations';
import Poll from '../components/posts/Poll';
import { useReadingHistory } from '../hooks/useReadingHistory';
import CommentThread from '../components/posts/CommentThread';

const DEFAULT_POST_DESCRIPTION = 'The central hub for diverse voices, where every perspective is shared and every idea is explored. Join our community of readers and writers.';
const REPORTED_COMMENTS_KEY = 'nexus_reported_comments';

const stripHtmlTags = (value) => {
  if (!value) return '';
  return value.replace(/<[^>]*>/g, '');
};

const normalizeImageSource = (imagePath) => {
  if (!imagePath) {
    return DEFAULT_OG_IMAGE;
  }

  if (imagePath.startsWith('http://') || imagePath.startsWith('https://') || imagePath.startsWith('//')) {
    return imagePath;
  }

  return imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
};

const wrapTablesWithScroll = (html = '') => {
  if (typeof html !== 'string' || !html.includes('<table')) return html;
  return html
    .replace(/<table/gi, '<div class="table-scroll"><table')
    .replace(/<\/table>/gi, '</table></div>');
};

const PostDetail = () => {
  const { slug } = useParams();
  const { user, isAuthenticated, isAdmin } = useAuth();
  const { addNotification } = useNotifications();
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const optimisticLikesRef = useRef(new Map()); // Track optimistic like updates
  const [relatedPosts, setRelatedPosts] = useState([]);
  const [collaborators, setCollaborators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [interactionLoading, setInteractionLoading] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [showFullscreenReader, setShowFullscreenReader] = useState(false);
  const [lightboxImages, setLightboxImages] = useState([]);
  const [lightboxIndex, setLightboxIndex] = useState(-1);
  const [poll, setPoll] = useState(null);
  const [loadingPoll, setLoadingPoll] = useState(false);
  const [canChangeVote, setCanChangeVote] = useState(false);
  const [timeRemainingMinutes, setTimeRemainingMinutes] = useState(0);
  const [changesRemaining, setChangesRemaining] = useState(0);
  const [isFollowingAuthor, setIsFollowingAuthor] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [reportedComments, setReportedComments] = useState(() => {
    if (typeof window === 'undefined') {
      return {};
    }
    try {
      const stored = JSON.parse(window.localStorage.getItem(REPORTED_COMMENTS_KEY) || '{}');
      return stored && typeof stored === 'object' ? stored : {};
    } catch {
      return {};
    }
  });
  const { addToHistory, updateReadingProgress } = useReadingHistory();
  const postId = post?._id;
  const fetchedSlugRef = useRef(null);

  const postAuthorId = useMemo(() => {
    if (!post) return null;
    const authorRef = post.author || post.createdBy || null;
    if (!authorRef) return null;
    if (typeof authorRef === 'string') return authorRef;
    return authorRef._id || authorRef.id || null;
  }, [post]);

  const postKey = useMemo(() => {
    if (!post) return null;
    const identifier = post._id || post.id || post.slug;
    return identifier ? String(identifier) : null;
  }, [post]);

  const reportedIdsForPost = useMemo(() => {
    if (!postKey) return new Set();
    return new Set(reportedComments[postKey] || []);
  }, [reportedComments, postKey]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(REPORTED_COMMENTS_KEY, JSON.stringify(reportedComments));
    } catch (error) {
      console.warn('Failed to persist reported comments cache', error);
    }
  }, [reportedComments]);

  const markCommentReported = useCallback(
    (commentId) => {
      if (!postKey || !commentId) return;
      setReportedComments((prev) => {
        const next = { ...prev };
        const existing = new Set(next[postKey] || []);
        existing.add(commentId);
        next[postKey] = Array.from(existing);
        return next;
      });
    },
    [postKey]
  );

  const seoDescription = useMemo(() => {
    if (!post) return DEFAULT_POST_DESCRIPTION;
    return (
      post.excerpt ||
      post.summary ||
      post.metaDescription ||
      stripHtmlTags(post.content).slice(0, 160) ||
      DEFAULT_POST_DESCRIPTION
    );
  }, [post]);

  const seoImage = useMemo(() => {
    if (!post) return DEFAULT_OG_IMAGE;
    const imagePath = normalizeImageSource(post.featuredImage);
    if (!imagePath) return DEFAULT_OG_IMAGE;
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      return imagePath;
    }
    const origin = (typeof window !== 'undefined' && window.location?.origin) || 'https://www.nexusblog.xyz';
    return imagePath.startsWith('/') ? `${origin}${imagePath}` : `${origin}/${imagePath}`;
  }, [post]);

  const seoUrl = useMemo(() => {
    if (!post) return undefined;
    const origin = (typeof window !== 'undefined' && window.location?.origin) || 'https://www.nexusblog.xyz';
    const identifier = post.slug || post._id;
    return `${origin}/preview/posts/${identifier}`;
  }, [post]);

  const shareUrl = useMemo(() => {
    const origin =
      (typeof window !== 'undefined' && window.location.origin) ||
      'https://thenexusblog.vercel.app';
    if (!post) {
      return origin;
    }
    const identifier = post.slug || post._id || post.id;
    // Use preview URL for sharing to ensure proper meta tags for social media previews
    return `${origin}/preview/posts/${identifier}`;
  }, [post]);

  useEffect(() => {
    if (post && isAuthenticated) {
      const postId = String(post._id || post.id);
      const userFromStorage = JSON.parse(localStorage.getItem('user') || '{}');
      const savedPosts = JSON.parse(localStorage.getItem('savedPosts') || '[]');
      const userBookmarked = user?.bookmarkedPosts?.map(id => String(id)) || [];
      const storageBookmarked = userFromStorage?.bookmarkedPosts?.map(id => String(id)) || [];
      const savedPostsNormalized = savedPosts.map(id => String(id));

      const bookmarked =
        userBookmarked.includes(postId) ||
        storageBookmarked.includes(postId) ||
        savedPostsNormalized.includes(postId);

      setIsBookmarked(bookmarked);
    } else if (post && !isAuthenticated) {
      setIsBookmarked(false);
    }
  }, [post, user, isAuthenticated]);

  const ensureCommentTree = useCallback((incoming = []) => {
    if (!Array.isArray(incoming)) return [];
    const alreadyNested = incoming.some(
      (comment) => Array.isArray(comment.replies) && comment.replies.length > 0
    );
    if (alreadyNested) {
      return incoming;
    }

    const map = new Map();
    incoming.forEach((comment) => {
      const normalizedId =
        typeof comment._id === 'object' && comment._id !== null && 'toString' in comment._id
          ? comment._id.toString()
          : comment._id || comment.id;
      const normalizedParent =
        typeof comment.parentComment === 'object' && comment.parentComment !== null && 'toString' in comment.parentComment
          ? comment.parentComment.toString()
          : comment.parentComment ?? null;

      map.set(normalizedId, {
        ...comment,
        _id: normalizedId,
        parentComment: normalizedParent,
        likes: comment.likes || [],
        replies: [],
      });
    });

    const roots = [];
    map.forEach((comment) => {
      if (comment.parentComment && map.has(comment.parentComment)) {
        const parent = map.get(comment.parentComment);
        parent.replies = [comment, ...(parent.replies || [])];
      } else {
        roots.unshift(comment);
      }
    });

    return roots;
  }, []);

  const fetchPostData = useCallback(async () => {
    // Prevent duplicate fetches for the same slug
    if (fetchedSlugRef.current === slug) {
      return;
    }
    
    // Mark that we're fetching this slug
    fetchedSlugRef.current = slug;
    
    try {
      setLoading(true);
      const postRes = await postsAPI.getBySlug(slug);
      // Handle different API response structures
      const post = postRes.data?.post || postRes.data?.data || postRes.data;
      
      if (!post || (!post._id && !post.id)) {
        toast.error('Post not found');
        setLoading(false);
        fetchedSlugRef.current = null;
        return;
      }
      
      if (isAuthenticated && user?._id) {
        const savedPosts = JSON.parse(localStorage.getItem('savedPosts') || '[]');
        if (savedPosts.includes(post._id)) {
          if (!user.bookmarkedPosts || !user.bookmarkedPosts.includes(post._id)) {
            const updatedUser = { ...user };
            if (!updatedUser.bookmarkedPosts) {
              updatedUser.bookmarkedPosts = [];
            }
            if (!updatedUser.bookmarkedPosts.includes(post._id)) {
              updatedUser.bookmarkedPosts.push(post._id);
            }
            localStorage.setItem('user', JSON.stringify(updatedUser));
          }
        }
      }
      
      setPost(post);
      
      const postId = String(post._id || post.id);
      const userFromStorage = JSON.parse(localStorage.getItem('user') || '{}');
      const savedPosts = JSON.parse(localStorage.getItem('savedPosts') || '[]');
      const userBookmarked = user?.bookmarkedPosts?.map(id => String(id)) || [];
      const storageBookmarked = userFromStorage?.bookmarkedPosts?.map(id => String(id)) || [];
      const savedPostsNormalized = savedPosts.map(id => String(id));
      
      const bookmarked = 
        userBookmarked.includes(postId) ||
        storageBookmarked.includes(postId) ||
        savedPostsNormalized.includes(postId);
      
      setIsBookmarked(bookmarked);
      
      const [commentsRes, relatedRes] = await Promise.all([
        commentsAPI.getByPost(post._id).catch(() => ({ data: { comments: [] } })),
        postsAPI.getRelated(post._id).catch(() => ({ data: { relatedPosts: [] } }))
      ]);

      // Handle different response structures for comments and related posts
      const comments = commentsRes.data?.comments || commentsRes.data?.data?.comments || commentsRes.data?.data || [];
      const relatedPosts = relatedRes.data?.relatedPosts || relatedRes.data?.data?.relatedPosts || relatedRes.data?.data || [];
      
      setComments(ensureCommentTree(Array.isArray(comments) ? comments : []));
      setRelatedPosts(Array.isArray(relatedPosts) ? relatedPosts : []);
      
      // Fetch collaborators (optional - may fail for public posts)
      try {
        const collaboratorsRes = await collaborationsAPI.getCollaborators(post._id);
        if (collaboratorsRes.data?.collaborators) {
          setCollaborators(collaboratorsRes.data.collaborators);
        }
      } catch (error) {
        // Silently fail if collaborators endpoint doesn't exist, returns 404, or 401 (expected for public posts)
        if (error.response?.status !== 404 && error.response?.status !== 401) {
          console.debug('Failed to fetch collaborators:', error);
        }
      }
      
      // Add to history after post is loaded
      addToHistory(post);
      
      // Fetch follow status if user is authenticated and post has an author (non-blocking)
      const currentUserId = user?._id || user?.id;
      const authorId = post?.author?._id || post?.author;
      if (isAuthenticated && currentUserId && authorId && String(currentUserId) !== String(authorId)) {
        followsAPI.getStatus(post.author._id)
          .then(followStatus => {
            setIsFollowingAuthor(followStatus.data?.isFollowing || false);
          })
          .catch(error => {
            // Silently fail if follow status can't be fetched (404 or other errors)
            // This is expected if follow system isn't fully set up or user doesn't exist
            if (error.response?.status !== 404) {
              console.error('Error fetching follow status:', error);
            }
          });
      }
      
    } catch (error) {
      console.error('Error fetching post:', error);
      // Don't show error toast if it's a 401 - the API interceptor handles it
      if (error.response?.status !== 401) {
        const errorMessage = error.response?.data?.message || error.message || 'Failed to load post';
        toast.error(errorMessage);
      }
      fetchedSlugRef.current = null;
      setPost(null);
    } finally {
      setLoading(false);
    }
  }, [slug, isAuthenticated, user?._id, ensureCommentTree, addToHistory]);

  // Reset fetched slug ref when slug changes
  useEffect(() => {
    fetchedSlugRef.current = null;
  }, [slug]);

  useEffect(() => {
    if (slug) {
      fetchPostData();
    }
  }, [slug, fetchPostData]);

  const refreshComments = useCallback(async () => {
    if (!postId) return;
    try {
      // Clear cache to ensure we get fresh data
      clearCache(`/comments/${postId}/comments`);
      clearCache('/comments');
      const commentsRes = await commentsAPI.getByPost(postId);
      const freshComments = ensureCommentTree(commentsRes.data?.comments || []);
      
      // Preserve optimistic like updates that happened recently (within last 3 seconds)
      const now = Date.now();
      const optimisticThreshold = 3000; // 3 seconds
      
      setComments(prevComments => {
        // If we have recent optimistic updates, merge them with fresh data
        const hasRecentOptimistic = Array.from(optimisticLikesRef.current.values()).some(
          timestamp => (now - timestamp) < optimisticThreshold
        );
        
        if (!hasRecentOptimistic) {
          // No recent optimistic updates, use fresh data as-is
          return freshComments;
        }
        
        // Merge optimistic updates with fresh data
        const mergeOptimisticLikes = (commentList) => {
          return commentList.map((comment) => {
            const commentId = String(comment._id || comment.id);
            const optimisticTimestamp = optimisticLikesRef.current.get(commentId);
            
            // If this comment has a recent optimistic update, preserve it from prevComments
            if (optimisticTimestamp && (now - optimisticTimestamp) < optimisticThreshold) {
              const prevComment = prevComments.find(
                c => String(c._id || c.id) === commentId
              ) || prevComments
                .flatMap(c => c.replies || [])
                .find(c => String(c._id || c.id) === commentId);
              
              if (prevComment) {
                return {
                  ...comment,
                  likes: prevComment.likes // Preserve optimistic likes
                };
              }
            }
            
            // Check replies recursively
            if (comment.replies && comment.replies.length > 0) {
              return {
                ...comment,
                replies: mergeOptimisticLikes(comment.replies)
              };
            }
            
            return comment;
          });
        };
        
        return mergeOptimisticLikes(freshComments);
      });
    } catch (error) {
      console.error('Failed to refresh comments:', error);
    }
  }, [postId, ensureCommentTree]);

  const refreshPost = useCallback(async () => {
    if (!slug) return;
    try {
      // Clear cache for this post to ensure we get fresh data
      clearCache(`/posts/${slug}`);
      // Also clear the general posts cache
      clearCache('/posts');
      
      // Temporarily reset the fetched slug ref to allow refetch
      const previousSlug = fetchedSlugRef.current;
      fetchedSlugRef.current = null;
      
      const postRes = await postsAPI.getBySlug(slug);
      const updatedPost = postRes.data?.post || postRes.data?.data || postRes.data;
      
      if (updatedPost && (updatedPost._id || updatedPost.id)) {
        setPost(updatedPost);
      }
      
      // Restore the fetched slug ref
      fetchedSlugRef.current = previousSlug;
    } catch (error) {
      console.error('Failed to refresh post:', error);
    }
  }, [slug]);

  const handleReportComment = useCallback(
    async (comment, reason) => {
      if (!post || !comment?._id) {
        return false;
      }

      if (!reason || !reason.trim()) {
        toast.error('Please include a short reason so moderators can follow up.');
        return false;
      }

      if (reportedIdsForPost.has(comment._id)) {
        toast.success('Thanks! This comment is already in the review queue.');
        return true;
      }

      try {
        const response = await fetch('/api/report-comment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            commentId: comment._id,
            commentAuthor: comment.author?.username || comment.author?.email || 'unknown',
            commentExcerpt: comment.content?.slice(0, 280) || '',
            postId: post._id || post.id,
            postSlug: post.slug,
            postTitle: post.title,
            reason: reason.trim(),
            reporterId: user?._id || null,
            reporterName: user?.username || user?.email || 'anonymous',
          }),
        });

        if (!response.ok) {
          const errorPayload = await response.json().catch(() => ({}));
          throw new Error(errorPayload?.message || 'Failed to submit report');
        }

        markCommentReported(comment._id);
        toast.success('Thanks for flagging this comment. Our moderators will review it shortly.');
        return true;
      } catch (error) {
        console.error('Failed to report comment:', error);
        toast.error('Could not submit the report. Please try again in a moment.');
        return false;
      }
    },
    [post, user, reportedIdsForPost, markCommentReported]
  );

  useEffect(() => {
    const fetchPoll = async () => {
      if (!post?._id) return;
      try {
        setLoadingPoll(true);
        const response = await pollsAPI.getByPost(post._id);
        if (response.data?.poll) {
          setPoll({
            id: response.data.poll.id || response.data.poll._id,
            question: response.data.poll.question,
            description: response.data.poll.description,
            options: response.data.poll.options || [],
            results: response.data.results || {},
            userVote: response.data.userVote || null,
            isActive: response.data.poll.isActive !== false
          });
          setCanChangeVote(response.data.canChangeVote || false);
          setTimeRemainingMinutes(response.data.timeRemainingMinutes || 0);
          setChangesRemaining(response.data.changesRemaining || 0);
        } else {
          setPoll(null);
        }
      } catch (error) {
        // 404 is expected when post doesn't have a poll - handle silently
        if (error.response?.status === 404) {
          setPoll(null);
        } else {
          console.error('Failed to fetch poll:', error);
          setPoll(null);
        }
      } finally {
        setLoadingPoll(false);
      }
    };
    fetchPoll();
  }, [post?._id]);

  const handlePollVote = async (pollId, optionId) => {
    if (!isAuthenticated) {
      toast.error('Please login to vote');
      throw new Error('Not authenticated');
    }

    try {
      const voteResponse = await pollsAPI.vote(pollId, optionId);
      const resultsResponse = await pollsAPI.getResults(pollId);
      if (resultsResponse.data) {
        setPoll(prev => ({
          ...prev,
          results: resultsResponse.data.results || {},
          userVote: resultsResponse.data.userVote
        }));
        setCanChangeVote(resultsResponse.data.canChangeVote || false);
        setTimeRemainingMinutes(resultsResponse.data.timeRemainingMinutes || 0);
        setChangesRemaining(resultsResponse.data.changesRemaining || 0);
      }
      
      // Show appropriate message
      if (voteResponse.data?.canChangeAgain) {
        toast.success(`Vote ${poll.userVote ? 'updated' : 'recorded'}! You can change it ${voteResponse.data.changesRemaining} more time${voteResponse.data.changesRemaining !== 1 ? 's' : ''}.`);
      } else {
        toast.success('Vote recorded!');
      }
    } catch (error) {
      if (error.response?.status === 400) {
        toast.error(error.response.data?.message || 'You have already voted');
      } else if (error.response?.status === 404) {
        toast.error('Poll not found');
      } else {
        toast.error('Failed to vote. Please try again.');
      }
      throw error; // Re-throw for component to handle rollback
    }
  };

  const handleLike = async () => {
    if (!isAuthenticated) {
      toast.error('Please login to like posts');
      return;
    }

    if (!user?._id) {
      toast.error('User information not available');
      return;
    }

    // Normalize user ID
    const userId = String(user._id);
    
    // Optimistic update - update UI immediately
      setPost(prevPost => {
        if (!prevPost) return prevPost;
      
      // Normalize all like IDs to strings for comparison
      const normalizedLikes = (prevPost.likes || []).map(id => {
        if (typeof id === 'object' && id !== null && 'toString' in id) {
          return id.toString();
        }
        return String(id);
      });
      
      const isLiked = normalizedLikes.includes(userId);
      
      // Toggle like state
          const newLikes = isLiked 
        ? normalizedLikes.filter(id => id !== userId)
        : [...normalizedLikes, userId];
      
      // Remove from dislikes if present
      const normalizedDislikes = (prevPost.dislikes || []).map(id => {
        if (typeof id === 'object' && id !== null && 'toString' in id) {
          return id.toString();
        }
        return String(id);
      });
      
      const newDislikes = normalizedDislikes.filter(id => id !== userId);
        
        return {
          ...prevPost,
          likes: newLikes,
          dislikes: newDislikes
        };
      });

    try {
      setInteractionLoading(true);
      await postsAPI.like(post._id);
      
      // Refetch to sync with server (in case of any discrepancies)
      await refreshPost();
      
      toast.success('Post liked!');
    } catch (error) {
      console.error('Like error:', error);
      // Rollback on error by refetching
      await refreshPost();
      toast.error('Failed to like post');
    } finally {
      setInteractionLoading(false);
    }
  };

  const handleDislike = async () => {
    if (!isAuthenticated) {
      toast.error('Please login to dislike posts');
      return;
    }

    if (!user?._id) {
      toast.error('User information not available');
      return;
    }

    // Normalize user ID
    const userId = String(user._id);
    
    // Optimistic update - update UI immediately
      setPost(prevPost => {
        if (!prevPost) return prevPost;
      
      // Normalize all dislike IDs to strings for comparison
      const normalizedDislikes = (prevPost.dislikes || []).map(id => {
        if (typeof id === 'object' && id !== null && 'toString' in id) {
          return id.toString();
        }
        return String(id);
      });
      
      const isDisliked = normalizedDislikes.includes(userId);
      
      // Toggle dislike state
          const newDislikes = isDisliked 
        ? normalizedDislikes.filter(id => id !== userId)
        : [...normalizedDislikes, userId];
      
      // Remove from likes if present
      const normalizedLikes = (prevPost.likes || []).map(id => {
        if (typeof id === 'object' && id !== null && 'toString' in id) {
          return id.toString();
        }
        return String(id);
      });
      
      const newLikes = normalizedLikes.filter(id => id !== userId);
        
        return {
          ...prevPost,
          dislikes: newDislikes,
          likes: newLikes
        };
      });

    try {
      setInteractionLoading(true);
      await postsAPI.dislike(post._id);
      
      // Refetch to sync with server (in case of any discrepancies)
      await refreshPost();
      
      toast.success('Post disliked!');
    } catch (error) {
      console.error('Dislike error:', error);
      // Rollback on error by refetching
      await refreshPost();
      toast.error('Failed to dislike post');
    } finally {
      setInteractionLoading(false);
    }
  };

  const handleFollowAuthor = async () => {
    if (!isAuthenticated) {
      toast.error('Please login to follow authors');
      return;
    }

    if (!postAuthorId || !post?.author) return;

    // Prevent users from following themselves
    const currentUserId = user?._id || user?.id;
    const authorId = postAuthorId;
    if (currentUserId && authorId && String(currentUserId) === String(authorId)) {
      toast.error('You cannot follow yourself');
      return;
    }

    try {
      setFollowLoading(true);
      if (isFollowingAuthor) {
        await followsAPI.unfollow(postAuthorId);
        setIsFollowingAuthor(false);
        toast.success('Unfollowed successfully');
      } else {
        await followsAPI.follow(postAuthorId);
        setIsFollowingAuthor(true);
        toast.success('Following successfully');
      }
    } catch (error) {
      console.error('Error following/unfollowing:', error);
      toast.error(error.response?.data?.message || 'Failed to update follow status');
    } finally {
      setFollowLoading(false);
    }
  };

  const handleShare = async () => {
    try {
      setShowShareModal(true);
    } catch (error) {
      toast.error('Failed to open share dialog');
    }
  };

  const handleShareTrack = async (platform) => {
    try {
      postsAPI.share(post._id, { platform }).catch(() => {});
      
      setPost(prevPost => {
        if (!prevPost) return prevPost;
        return {
          ...prevPost,
          shares: (prevPost.shares || 0) + 1
        };
      });
    } catch (error) {
      // Silent fail for tracking
      console.error('Share tracking failed:', error);
    }
  };


  const handleSave = async () => {
    if (!isAuthenticated) {
      toast.error('Please login to save posts');
      return;
    }

    try {
      setInteractionLoading(true);
      const wasBookmarked = isBookmarked;
      const postId = post._id || post.id;
      
      try {
        const response = await postsAPI.bookmark(postId);
        const { bookmarked } = response.data;
        
        // Update local state immediately
        setIsBookmarked(bookmarked);
        
        // Update user's bookmarkedPosts array in context
        if (user) {
          const updatedUser = { ...user };
          if (bookmarked) {
            if (!updatedUser.bookmarkedPosts) {
              updatedUser.bookmarkedPosts = [];
            }
            // Normalize IDs to strings for comparison
            const normalizedIds = updatedUser.bookmarkedPosts.map(id => String(id));
            if (!normalizedIds.includes(String(postId))) {
              updatedUser.bookmarkedPosts.push(postId);
            }
          } else {
            updatedUser.bookmarkedPosts = updatedUser.bookmarkedPosts?.filter(
              id => String(id) !== String(postId)
            ) || [];
          }
          
          // Update localStorage
          localStorage.setItem('user', JSON.stringify(updatedUser));
        }
        
        toast.success(wasBookmarked ? 'Post removed from saved!' : 'Post saved!');
      } catch (apiError) {
        // If 404, the endpoint doesn't exist yet - use localStorage as fallback
        if (apiError.response?.status === 404) {
          const savedPosts = JSON.parse(localStorage.getItem('savedPosts') || '[]');
          const newBookmarkedState = !wasBookmarked;
          
          // Update local state immediately
          setIsBookmarked(newBookmarkedState);
          
          // Normalize IDs to strings for comparison
          const normalizedSavedPosts = savedPosts.map(id => String(id));
          const normalizedPostId = String(postId);
          
          if (wasBookmarked) {
            const updated = savedPosts.filter(id => String(id) !== normalizedPostId);
            localStorage.setItem('savedPosts', JSON.stringify(updated));
            toast.success('Post removed from saved!');
          } else {
            if (!normalizedSavedPosts.includes(normalizedPostId)) {
              savedPosts.push(postId);
              localStorage.setItem('savedPosts', JSON.stringify(savedPosts));
            }
            toast.success('Post saved! (Saved locally until backend is updated)');
          }
          
          // Update user's bookmarkedPosts array in localStorage for UI consistency
          if (user) {
            const updatedUser = { ...user };
            if (!updatedUser.bookmarkedPosts) {
              updatedUser.bookmarkedPosts = [];
            }
            const normalizedUserBookmarks = updatedUser.bookmarkedPosts.map(id => String(id));
            if (wasBookmarked) {
              updatedUser.bookmarkedPosts = updatedUser.bookmarkedPosts.filter(
                id => String(id) !== normalizedPostId
              );
            } else {
              if (!normalizedUserBookmarks.includes(normalizedPostId)) {
                updatedUser.bookmarkedPosts.push(postId);
              }
            }
            localStorage.setItem('user', JSON.stringify(updatedUser));
          }
        } else {
          throw apiError; // Re-throw if it's not a 404
        }
      }
    } catch (error) {
      console.error('Error saving post:', error);
      toast.error(error.response?.data?.message || 'Failed to save post');
    } finally {
      setInteractionLoading(false);
    }
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      toast.error('Please login to comment');
      return;
    }

    if (!commentText.trim()) {
      toast.error('Comment cannot be empty');
      return;
    }

    if (!postId) {
      toast.error('Post not found');
      return;
    }

    try {
      setSubmittingComment(true);
      await commentsAPI.create(postId, { content: commentText.trim() });
      setCommentText('');
      await refreshComments();
      toast.success('Comment added!');
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error(error.response?.data?.message || 'Failed to add comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleCommentLike = async (commentId) => {
    if (!isAuthenticated) {
      toast.error('Please login to like comments');
      return;
    }

    if (!user?._id) {
      toast.error('User information not available');
      return;
    }

    const userId = String(user._id);
    const normalizedCommentId = String(commentId);

    // Helper to normalize comment ID
    const normalizeCommentId = (id) => {
      if (!id) return null;
      if (typeof id === 'object' && id !== null && 'toString' in id) {
        return id.toString();
      }
      return String(id);
    };

    // Optimistically update the comment state
    const updateCommentLikes = (commentList) => {
      return commentList.map((comment) => {
        const commentIdNormalized = normalizeCommentId(comment._id || comment.id);
        
        // Check if this is the comment being liked
        if (commentIdNormalized === normalizedCommentId) {
          const currentLikes = Array.isArray(comment.likes) 
            ? comment.likes.map(id => {
                if (typeof id === 'object' && id !== null && 'toString' in id) {
                  return id.toString();
                }
                return String(id);
              })
            : [];
          const isLiked = currentLikes.includes(userId);
          
          const newLikes = isLiked
            ? currentLikes.filter(id => id !== userId)
            : [...currentLikes, userId];
          
          return {
            ...comment,
            likes: newLikes
          };
        }
        
        // Check replies recursively
        if (comment.replies && comment.replies.length > 0) {
          return {
            ...comment,
            replies: updateCommentLikes(comment.replies)
          };
        }
        
        return comment;
      });
    };

    // Track this optimistic update
    optimisticLikesRef.current.set(normalizedCommentId, Date.now());

    // Optimistic update - update UI immediately using functional form to ensure we have latest state
    setComments(prevComments => {
      try {
        return updateCommentLikes(prevComments);
      } catch (error) {
        console.error('Error updating comment likes:', error);
        return prevComments;
      }
    });

    try {
      await commentsAPI.like(commentId);
      
      // Clear the optimistic tracking after successful API call (after a delay to ensure server processed it)
      setTimeout(() => {
        optimisticLikesRef.current.delete(normalizedCommentId);
      }, 2000);
      
      // Don't refresh on success - the optimistic update is already correct
      // The optimistic update shows the correct state immediately
      // Only refresh on error to rollback if something went wrong
    } catch (error) {
      // Clear optimistic tracking on error
      optimisticLikesRef.current.delete(normalizedCommentId);
      // Rollback optimistic update on error by refreshing from server
      await refreshComments();
      toast.error(error.response?.data?.message || 'Failed to like comment');
    }
  };

  const handleUpdateComment = async (commentId, newContent) => {
    if (!isAuthenticated) {
      toast.error('Please login to edit comments');
      throw new Error('Not authenticated');
    }

    if (!postId) {
      toast.error('Post not found');
      throw new Error('Post missing');
    }

    await commentsAPI.update(commentId, { content: newContent.trim() });
    await refreshComments();
  };

  const handleDeleteComment = async (commentId) => {
    if (!isAuthenticated) {
      toast.error('Please login to delete comments');
      throw new Error('Not authenticated');
    }

    if (!postId) {
      toast.error('Post not found');
      throw new Error('Post missing');
    }

    await commentsAPI.delete(commentId);
    await refreshComments();
  };

  const handleReplyToComment = async (parentCommentId, replyContent) => {
    if (!isAuthenticated) {
      toast.error('Please login to reply');
      throw new Error('Not authenticated');
    }

    if (!postId) {
      toast.error('Post not found');
      throw new Error('Post missing');
    }

    await commentsAPI.create(postId, {
      content: replyContent.trim(),
      parentComment: parentCommentId
    });
    await refreshComments();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-page">
        <Spinner size="2xl" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-page">
        <EmptyState
          title="Post Not Found"
          description="The post you're looking for doesn't exist or has been removed."
          action={
            <Link to="/posts" className="btn btn-primary">
              Browse All Posts
            </Link>
          }
        />
      </div>
    );
  }

  // Normalize IDs for comparison
  const normalizedUserId = user?._id ? String(user._id) : null;
  const normalizedLikes = (post.likes || []).map(id => {
    if (typeof id === 'object' && id !== null && 'toString' in id) {
      return id.toString();
    }
    return String(id);
  });
  const normalizedDislikes = (post.dislikes || []).map(id => {
    if (typeof id === 'object' && id !== null && 'toString' in id) {
      return id.toString();
    }
    return String(id);
  });
  
  const hasLiked = normalizedUserId ? normalizedLikes.includes(normalizedUserId) : false;
  const hasDisliked = normalizedUserId ? normalizedDislikes.includes(normalizedUserId) : false;
  const hasBookmarked = isBookmarked;

  return (
    <>
      <Seo
        title={post?.title}
        description={seoDescription}
        url={seoUrl}
        image={seoImage}
        type={post ? "article" : "website"}
        imageAlt={post?.title}
        post={post}
        breadcrumbs={post ? [
          { name: 'Home', url: '/' },
          { name: 'Posts', url: '/posts' },
          { name: post.title, url: seoUrl },
        ] : undefined}
        canonicalUrl={post ? `${(typeof window !== 'undefined' && window.location?.origin) || 'https://www.nexusblog.xyz'}/posts/${post.slug || post._id}` : undefined}
      />
      <ReadingProgress />
      <div className="bg-page">
      <div className="layout-container-wide py-6 sm:py-8">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-8">
        {/* Main Content */}
        <div className="lg:col-span-3">
          <motion.article
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="card-elevated card-elevated-hover overflow-hidden"
          >
            {/* Featured Image */}
            {post.featuredImage && (
              <OptimizedImage
                src={post.featuredImage}
                alt={post.title}
                className="w-full h-48 sm:h-64 md:h-96 object-cover"
                loading="eager"
              />
            )}

            <div className="p-6">
              {/* Post Header */}
              <div className="mb-4 sm:mb-6">
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-primary mb-3 sm:mb-4">
                  {post.title}
                </h1>
                
                <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted mb-3 sm:mb-4">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center">
                      <User className="w-4 h-4 mr-2" />
                      <Link 
                        to={`/authors/${post.author?.username}`}
                        className="font-medium hover:text-[var(--accent)] transition-colors"
                      >
                        {post.author?.username}
                      </Link>
                    </div>
                    {isAuthenticated && user && postAuthorId && String(user._id || user.id) !== String(postAuthorId) && (
                      <button
                        onClick={handleFollowAuthor}
                        disabled={followLoading}
                        className={`ml-2 px-2 sm:px-3 py-1 text-xs sm:text-sm rounded transition-colors flex items-center gap-1 min-w-[2rem] sm:min-w-auto ${
                          isFollowingAuthor
                            ? 'bg-[var(--surface-subtle)] text-secondary hover:bg-[var(--surface-subtle)]'
                            : 'bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]'
                        }`}
                        title={isFollowingAuthor ? 'Unfollow' : 'Follow'}
                        aria-label={isFollowingAuthor ? 'Unfollow' : 'Follow'}
                      >
                        {followLoading ? (
                          <Spinner size="xs" />
                        ) : isFollowingAuthor ? (
                          <>
                            <UserMinus className="w-3 h-3 sm:w-4 sm:h-4" />
                            <span className="hidden sm:inline">Following</span>
                          </>
                        ) : (
                          <>
                            <UserPlus className="w-3 h-3 sm:w-4 sm:h-4" />
                            <span className="hidden sm:inline">Follow</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-2" />
                    <span>{format(new Date(post.publishedAt), 'MMMM d, yyyy')}</span>
                  </div>
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 mr-2" />
                    <span>{formatReadingTime(calculateReadingTime(post.content))}</span>
                  </div>
                  <div className="flex items-center">
                    <Eye className="w-4 h-4 mr-2" />
                    <span>{post.viewCount} views</span>
                  </div>
                </div>
              </div>

              {/* Post Content */}
              <div 
                className="article-content prose prose-lg max-w-[680px] mx-auto mb-8"
                onClick={(e) => {
                  // Handle image clicks for lightbox
                  if (e.target.tagName === 'IMG' && e.target.src) {
                    const images = Array.from(document.querySelectorAll('.prose img'))
                      .map(img => ({ src: img.src, alt: img.alt || '' }));
                    const index = images.findIndex(img => img.src === e.target.src);
                    if (index >= 0) {
                      setLightboxImages(images);
                      setLightboxIndex(index);
                    }
                  }
                }}
              >
                {(() => {
                  // Check if content is HTML (contains HTML tags)
                  const isHTML = /<[a-z][\s\S]*>/i.test(post.content);
                  
                  if (isHTML) {
                    // Render HTML content (from rich text editor)
                    const sanitizedHTML = DOMPurify.sanitize(wrapTablesWithScroll(post.content), {
                      ALLOWED_TAGS: [
                        'p', 'br', 'strong', 'em', 'u', 's',
                        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
                        'ul', 'ol', 'li', 'blockquote', 'code', 'pre',
                        'a', 'img', 'video', 'div', 'span', 'hr',
                        'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'colgroup', 'col'
                      ],
                      ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'style', 'target', 'rel', 'colspan', 'rowspan', 'width', 'data-borderless'],
                      ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp|data):|[^a-z]|[a-z+.-]+(?:[^a-z+.-:]|$))/i
                    });
                    return <div dangerouslySetInnerHTML={{ __html: sanitizedHTML }} />;
                  } else {
                    // Render Markdown content (legacy posts)
                    return (
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          table: ({ node, ...props }) => (
                            <div className="table-scroll">
                              <table {...props} />
                            </div>
                          ),
                        }}
                      >
                        {post.content}
                      </ReactMarkdown>
                    );
                  }
                })()}
              </div>

              {/* Collaborators */}
              {collaborators && collaborators.length > 0 && (
                <div className="mb-8 rounded-xl border border-[var(--border-subtle)] bg-surface-subtle p-5">
                  <div className="mb-3 flex items-center gap-2">
                    <div className="rounded-lg bg-blue-500/12 p-2 text-blue-600 dark:text-blue-400">
                      <Users className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted">Collaborators</span>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {collaborators.map((collaborator) => (
                      <div
                        key={collaborator.id || collaborator.user?._id || collaborator.user}
                        className="inline-flex items-center gap-2 rounded-full bg-[var(--surface-bg)] px-3 py-1.5 text-sm font-medium text-[var(--text-secondary)]"
                      >
                        {collaborator.user?.profilePicture ? (
                          <img
                            src={collaborator.user.profilePicture}
                            alt={collaborator.email || collaborator.user?.username || 'Collaborator'}
                            className="w-6 h-6 rounded-full object-cover"
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs font-semibold">
                            {(collaborator.email || collaborator.user?.username || 'C').charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span>{collaborator.user?.username || collaborator.email || 'Collaborator'}</span>
                        {collaborator.role && (
                          <span className="text-xs text-muted capitalize">({collaborator.role})</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tags */}
              {post.tags && post.tags.length > 0 && (
                <div className="mb-8 rounded-xl border border-[var(--border-subtle)] bg-surface-subtle p-5">
                  <div className="mb-3 flex items-center gap-2">
                    <div className="rounded-lg bg-[var(--accent)]/12 p-2 text-[var(--accent)]">
                      <Tag className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted">Tags</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {post.tags.map((tag) => (
                      <Link
                        key={tag}
                        to={`/search?tags=${tag}`}
                        className="inline-flex items-center gap-1 rounded-full bg-[var(--surface-bg)] px-3 py-1 text-sm font-medium text-[var(--text-secondary)] transition-all hover:bg-[var(--accent)] hover:text-white hover:shadow-[0_8px_20px_rgba(26,137,23,0.2)]"
                      >
                        <span>#</span>
                        <span>{tag}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Interaction Buttons */}
              <div className="flex flex-wrap items-center gap-3 border-t border-[var(--border-subtle)] pt-4 sm:pt-6">
                <motion.button
                  onClick={handleLike}
                  disabled={interactionLoading}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`flex items-center space-x-2 px-3 sm:px-4 py-2 rounded-xl transition-all text-sm sm:text-base ${
                    hasLiked
                      ? 'bg-[var(--accent)] text-white shadow-[0_12px_30px_rgba(26,137,23,0.22)] hover:text-white'
                      : 'glass-card text-[var(--text-secondary)] hover:bg-[var(--surface-bg)]/80'
                  }`}
                >
                  <ThumbsUp className="w-4 h-4" />
                  <span>{post.likes?.length || 0}</span>
                </motion.button>

                <motion.button
                  onClick={handleDislike}
                  disabled={interactionLoading}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`flex items-center space-x-2 px-3 sm:px-4 py-2 rounded-xl transition-all text-sm sm:text-base ${
                    hasDisliked
                      ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-lg shadow-rose-500/25'
                      : 'glass-card text-[var(--text-secondary)] hover:bg-[var(--surface-bg)]/80'
                  }`}
                >
                  <ThumbsDown className="w-4 h-4" />
                  <span>{post.dislikes?.length || 0}</span>
                </motion.button>

                <motion.button
                  onClick={handleShare}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center space-x-2 px-3 sm:px-4 py-2 glass-card text-secondary rounded-xl hover:bg-[var(--surface-bg)]/80 transition-all text-sm sm:text-base"
                >
                  <Share2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Share</span>
                </motion.button>

                <motion.button
                  onClick={handleSave}
                  disabled={interactionLoading}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`flex items-center space-x-2 px-3 sm:px-4 py-2 rounded-xl transition-all text-sm sm:text-base ${
                    hasBookmarked
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/25'
                      : 'glass-card text-secondary hover:bg-[var(--surface-bg)]/80'
                  }`}
                >
                  <Bookmark className={`w-4 h-4 ${hasBookmarked ? 'fill-current' : ''}`} />
                  <span className="hidden sm:inline">{hasBookmarked ? 'Saved' : 'Save'}</span>
                </motion.button>

                <motion.button
                  onClick={() => setShowFullscreenReader(true)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center space-x-2 px-3 sm:px-4 py-2 glass-card text-secondary rounded-xl hover:bg-[var(--surface-bg)]/80 transition-all text-sm sm:text-base"
                  title="Fullscreen reading mode"
                >
                  <Maximize className="w-4 h-4" />
                  <span className="hidden sm:inline">Fullscreen</span>
                </motion.button>

              </div>
            </div>
          </motion.article>

          {/* Poll */}
          {post && poll && !loadingPoll && (
            <div className="mt-4 sm:mt-6 -mx-4 sm:mx-0 px-4 sm:px-0">
              <Poll 
                poll={poll}
                postId={post._id}
                onVote={handlePollVote}
                userVote={poll.userVote}
                results={poll.results}
                canChangeVote={canChangeVote}
                timeRemainingMinutes={timeRemainingMinutes}
                changesRemaining={changesRemaining}
              />
            </div>
          )}

          {/* Reading List */}
          {post && isAuthenticated && (
            <div className="mt-6 p-4 bg-surface-subtle rounded-xl">
              <ReadingList post={post} />
            </div>
          )}

          {/* Comments Section */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-8 card-elevated card-elevated-hover p-6"
          >
            <h2 className="text-2xl font-bold text-primary mb-6 flex items-center">
              <MessageCircle className="w-6 h-6 mr-2" />
              Comments ({comments.length})
            </h2>

            {/* Add Comment */}
            {isAuthenticated ? (
              <form onSubmit={handleCommentSubmit} className="mb-8">
                <div className="mb-4">
                  <textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Share your thoughts..."
                    rows="4"
                    className="w-full px-4 py-3 glass-card rounded-xl focus:ring-2 focus:ring-[var(--accent)]/50 focus:border-[var(--accent)]/35 focus:bg-[var(--surface-bg)]/90 resize-none transition-all"
                  />
                </div>
                <motion.button
                  type="submit"
                  disabled={submittingComment || !commentText.trim()}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_12px_30px_rgba(26,137,23,0.18)]"
                >
                  {submittingComment ? 'Posting...' : 'Post Comment'}
                </motion.button>
              </form>
            ) : (
              <div className="mb-8 p-4 glass-card rounded-xl text-center">
                <p className="text-muted mb-2">
                  Please log in to leave a comment
                </p>
                <Link
                  to="/login"
                    className="text-[var(--accent)] hover:text-[var(--accent-hover)] font-medium transition-colors"
                >
                  Sign In
                </Link>
              </div>
            )}

            {/* Comments List */}
            <div className="space-y-6">
              {comments.length > 0 ? (
                comments.map((comment) => (
                  <CommentThread
                    key={comment._id}
                    comment={comment}
                    onEdit={handleUpdateComment}
                    onDelete={handleDeleteComment}
                    onLike={handleCommentLike}
                    onReply={handleReplyToComment}
                    onReport={handleReportComment}
                    reportedCommentIds={reportedIdsForPost}
                    postAuthorId={postAuthorId}
                    postCollaborators={collaborators}
                  />
                ))
              ) : (
                <p className="text-center text-[var(--text-muted)]">
                  No comments yet. Be the first to share your thoughts!
                </p>
              )}
            </div>
          </motion.section>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          {/* Post Stats */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="card-elevated card-elevated-hover p-6"
          >
            <h3 className="text-lg font-bold text-[var(--text-primary)] mb-4">Post Stats</h3>
            <div className="space-y-3">
              <div className="flex justify-between py-2">
                <span className="text-[var(--text-secondary)]">Views</span>
                <span className="font-semibold text-[var(--text-primary)]">{post.viewCount}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-[var(--text-secondary)]">Likes</span>
                <span className="font-semibold text-[var(--text-primary)]">{post.likes?.length || 0}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-[var(--text-secondary)]">Dislikes</span>
                <span className="font-semibold text-[var(--text-primary)]">{post.dislikes?.length || 0}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-[var(--text-secondary)]">Shares</span>
                <span className="font-semibold text-[var(--text-primary)]">{post.shares || 0}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-[var(--text-secondary)]">Comments</span>
                <span className="font-semibold text-[var(--text-primary)]">{comments.length}</span>
              </div>
            </div>
          </motion.div>

        </div>
      </div>
      {post && (
        <div className="mt-12 pb-6">
          <PostRecommendations currentPost={post} limit={3} />
        </div>
      )}
      </div>
    </div>

    {/* Share Modal */}
    {showShareModal && (
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/50 backdrop-blur-sm"
        onClick={() => setShowShareModal(false)}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          onClick={(e) => e.stopPropagation()}
          className="surface-card max-w-sm sm:max-w-md w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6 relative shadow-xl rounded-xl"
        >
          <button
            onClick={() => setShowShareModal(false)}
            className="absolute top-3 right-3 sm:top-4 sm:right-4 text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors z-10"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="mb-4 sm:mb-6 pr-8">
            <h2 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] mb-1 sm:mb-2">Share Post</h2>
            <p className="text-sm sm:text-base text-[var(--text-secondary)]">Share this post with others</p>
          </div>

          <SocialShare 
            post={post} 
            shareUrl={shareUrl} 
            onShare={handleShareTrack}
          />
        </motion.div>
      </div>
    )}

    {/* Fullscreen Reader */}
    {post && (
      <FullscreenReader
        post={post}
        isOpen={showFullscreenReader}
        onClose={() => setShowFullscreenReader(false)}
      />
    )}

    {/* Image Lightbox */}
    {lightboxIndex >= 0 && lightboxImages.length > 0 && (
      <ImageLightbox
        images={lightboxImages}
        currentIndex={lightboxIndex}
        onClose={() => setLightboxIndex(-1)}
        onNext={() => setLightboxIndex((lightboxIndex + 1) % lightboxImages.length)}
        onPrevious={() => setLightboxIndex((lightboxIndex - 1 + lightboxImages.length) % lightboxImages.length)}
      />
    )}
    </>
  );
};

export default PostDetail;