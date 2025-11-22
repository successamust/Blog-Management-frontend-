import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Calendar, 
  Eye, 
  Heart, 
  Share2, 
  MessageCircle, 
  User,
  Bookmark,
  ThumbsUp,
  ThumbsDown,
  Edit,
  Trash2,
  X,
  Check,
  Copy,
  CheckCircle,
  Tag
} from 'lucide-react';
import { format } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import DOMPurify from 'dompurify';
import { postsAPI, commentsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import ReadingProgress from '../components/common/ReadingProgress';
import { calculateReadingTime, formatReadingTime } from '../utils/readingTime';
import { Clock } from 'lucide-react';
import Spinner from '../components/common/Spinner';

const PostDetail = () => {
  const { slug } = useParams();
  const { user, isAuthenticated, isAdmin } = useAuth();
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [relatedPosts, setRelatedPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [interactionLoading, setInteractionLoading] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editCommentText, setEditCommentText] = useState('');
  const [showShareModal, setShowShareModal] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);

  useEffect(() => {
    fetchPostData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  // Update bookmark state when user or post changes
  useEffect(() => {
    if (post && isAuthenticated) {
      // Normalize post ID to string for comparison
      const postId = String(post._id || post.id);
      
      // Check both user.bookmarkedPosts and localStorage
      const userFromStorage = JSON.parse(localStorage.getItem('user') || '{}');
      const savedPosts = JSON.parse(localStorage.getItem('savedPosts') || '[]');
      
      // Normalize all IDs to strings for comparison
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

  // Update meta tags for social sharing when post loads
  useEffect(() => {
    if (!post) return;

    const baseUrl = 'https://thenexusblog.vercel.app';
    const currentUrl = `${baseUrl}/posts/${post.slug || post._id}`;
    
    // Get post image or fallback to default
    const getImageUrl = (imageUrl) => {
      if (!imageUrl) {
        return `${baseUrl}/email-assets/nexus-og-image.png`;
      }
      // If image is already absolute URL, use it
      if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
        return imageUrl;
      }
      // If relative URL, make it absolute
      if (imageUrl.startsWith('/')) {
        return `${baseUrl}${imageUrl}`;
      }
      // Otherwise, assume it's a full URL from backend
      return imageUrl;
    };

    const ogImage = getImageUrl(post.featuredImage);
    
    // Extract plain text from HTML if needed for description
    const getPlainText = (text) => {
      if (!text) return '';
      // Remove HTML tags
      const div = document.createElement('div');
      div.innerHTML = text;
      return div.textContent || div.innerText || '';
    };

    const description = post.excerpt || post.summary || post.metaDescription || 
                        getPlainText(post.content).substring(0, 160) || 
                        'Discover engaging articles, insights, and stories on Nexus. Join our community of readers and writers.';

    // Update document title
    document.title = `${post.title} | Nexus - Stories Worth Sharing`;

    // Helper function to update or create meta tag
    const updateMetaTag = (property, content, isProperty = true) => {
      const selector = isProperty ? `meta[property="${property}"]` : `meta[name="${property}"]`;
      let meta = document.querySelector(selector);
      
      if (!meta) {
        meta = document.createElement('meta');
        if (isProperty) {
          meta.setAttribute('property', property);
        } else {
          meta.setAttribute('name', property);
        }
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    };

    // Update Open Graph tags
    updateMetaTag('og:type', 'article');
    updateMetaTag('og:url', currentUrl);
    updateMetaTag('og:title', post.title);
    updateMetaTag('og:description', description);
    updateMetaTag('og:image', ogImage);
    updateMetaTag('og:image:width', '1200');
    updateMetaTag('og:image:height', '630');
    updateMetaTag('og:image:type', 'image/png');
    updateMetaTag('og:image:alt', post.title);

    // Update Twitter tags
    updateMetaTag('twitter:card', 'summary_large_image', false);
    updateMetaTag('twitter:url', currentUrl, false);
    updateMetaTag('twitter:title', post.title, false);
    updateMetaTag('twitter:description', description, false);
    updateMetaTag('twitter:image', ogImage, false);
    updateMetaTag('twitter:image:alt', post.title, false);

    // Update standard meta tags
    updateMetaTag('description', description, false);
    updateMetaTag('title', `${post.title} | Nexus`, false);

    // Cleanup function to restore defaults when component unmounts
    return () => {
      document.title = 'Nexus - Stories Worth Sharing';
      updateMetaTag('og:type', 'website');
      updateMetaTag('og:url', baseUrl);
      updateMetaTag('og:title', 'Nexus - Stories Worth Sharing');
      updateMetaTag('og:description', 'Discover engaging articles, insights, and stories on Nexus. Join our community of readers and writers.');
      updateMetaTag('og:image', `${baseUrl}/email-assets/nexus-og-image.png`);
      updateMetaTag('twitter:url', baseUrl, false);
      updateMetaTag('twitter:title', 'Nexus - Stories Worth Sharing', false);
      updateMetaTag('twitter:description', 'Discover engaging articles, insights, and stories on Nexus. Join our community of readers and writers.', false);
      updateMetaTag('twitter:image', `${baseUrl}/email-assets/nexus-og-image.png`, false);
      updateMetaTag('description', 'Discover engaging articles, insights, and stories on Nexus. Join our community of readers and writers.', false);
    };
  }, [post]);

  const fetchPostData = async () => {
    try {
      setLoading(true);
      const postRes = await postsAPI.getBySlug(slug);
      const post = postRes.data;
      
      // Check localStorage for saved posts if backend doesn't have bookmarks
      if (isAuthenticated && user?._id) {
        const savedPosts = JSON.parse(localStorage.getItem('savedPosts') || '[]');
        if (savedPosts.includes(post._id)) {
          // If saved in localStorage but not in user.bookmarkedPosts, add it
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
      
      // Set initial bookmark state - check multiple sources
      // Normalize post ID to string for comparison
      const postId = String(post._id || post.id);
      const userFromStorage = JSON.parse(localStorage.getItem('user') || '{}');
      const savedPosts = JSON.parse(localStorage.getItem('savedPosts') || '[]');
      
      // Normalize all IDs to strings for comparison
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

      setComments(commentsRes.data.comments || []);
      setRelatedPosts(relatedRes.data.relatedPosts || []);
    } catch (error) {
      console.error('Error fetching post:', error);
      toast.error('Failed to load post');
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async () => {
    if (!isAuthenticated) {
      toast.error('Please login to like posts');
      return;
    }

    try {
      setInteractionLoading(true);
      await postsAPI.like(post._id);
      
      // Update post state directly without refetching all data
      setPost(prevPost => {
        if (!prevPost) return prevPost;
        const isLiked = prevPost.likes?.includes(user?._id);
        const newLikes = isLiked 
          ? prevPost.likes.filter(id => id !== user?._id)
          : [...(prevPost.likes || []), user?._id];
        
        // Remove from dislikes if it was disliked
        const newDislikes = prevPost.dislikes?.includes(user?._id)
          ? prevPost.dislikes.filter(id => id !== user?._id)
          : prevPost.dislikes || [];
        
        return {
          ...prevPost,
          likes: newLikes,
          dislikes: newDislikes
        };
      });
      
      toast.success('Post liked!');
    } catch (error) {
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

    try {
      setInteractionLoading(true);
      await postsAPI.dislike(post._id);
      
      // Update post state directly without refetching all data
      setPost(prevPost => {
        if (!prevPost) return prevPost;
        const isDisliked = prevPost.dislikes?.includes(user?._id);
        const newDislikes = isDisliked 
          ? prevPost.dislikes.filter(id => id !== user?._id)
          : [...(prevPost.dislikes || []), user?._id];
        
        // Remove from likes if it was liked
        const newLikes = prevPost.likes?.includes(user?._id)
          ? prevPost.likes.filter(id => id !== user?._id)
          : prevPost.likes || [];
        
        return {
          ...prevPost,
          dislikes: newDislikes,
          likes: newLikes
        };
      });
      
      toast.success('Post disliked!');
    } catch (error) {
      toast.error('Failed to dislike post');
    } finally {
      setInteractionLoading(false);
    }
  };

  const handleShare = async () => {
    try {
      // Track share on backend (fire and forget)
      postsAPI.share(post._id).catch(() => {});
      
      // Update shares count optimistically
      setPost(prevPost => {
        if (!prevPost) return prevPost;
        return {
          ...prevPost,
          shares: (prevPost.shares || 0) + 1
        };
      });
      
      // Show share modal
      setShowShareModal(true);
      setLinkCopied(false);
    } catch (error) {
      toast.error('Failed to share post');
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setLinkCopied(true);
      toast.success('Link copied to clipboard!');
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy link');
    }
  };

  const handleNativeShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: post.title,
          text: post.excerpt,
          url: window.location.href,
        });
        setShowShareModal(false);
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        toast.error('Failed to share');
      }
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

    try {
      setSubmittingComment(true);
      const response = await commentsAPI.create(post._id, { content: commentText });
      const newComment = response.data.comment;
      
      // Add the new comment to the comments state directly (optimistic update)
      if (newComment) {
        setComments(prevComments => [newComment, ...prevComments]);
      } else {
        // If backend doesn't return the comment, fetch only comments
        const commentsRes = await commentsAPI.getByPost(post._id);
        setComments(commentsRes.data.comments || []);
      }
      
      setCommentText('');
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

    try {
      await commentsAPI.like(commentId);
      
      // Update comment state directly without refetching all data
      setComments(prevComments => 
        prevComments.map(comment => {
          if (comment._id === commentId) {
            const isLiked = comment.likes?.includes(user?._id);
            const newLikes = isLiked
              ? comment.likes.filter(id => id !== user?._id)
              : [...(comment.likes || []), user?._id];
            
            return {
              ...comment,
              likes: newLikes
            };
          }
          return comment;
        })
      );
    } catch (error) {
      toast.error('Failed to like comment');
    }
  };

  const handleEditComment = (comment) => {
    setEditingCommentId(comment._id);
    setEditCommentText(comment.content);
  };

  const handleCancelEdit = () => {
    setEditingCommentId(null);
    setEditCommentText('');
  };

  const handleUpdateComment = async (commentId) => {
    if (!editCommentText.trim()) {
      toast.error('Comment cannot be empty');
      return;
    }

    try {
      await commentsAPI.update(commentId, { content: editCommentText });
      toast.success('Comment updated successfully');
      setEditingCommentId(null);
      setEditCommentText('');
      await fetchPostData();
    } catch (error) {
      toast.error('Failed to update comment');
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('Are you sure you want to delete this comment?')) {
      return;
    }

    try {
      await commentsAPI.delete(commentId);
      toast.success('Comment deleted successfully');
      await fetchPostData();
    } catch (error) {
      toast.error('Failed to delete comment');
    }
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
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center surface-card p-6"
        >
          <h1 className="text-2xl font-bold text-primary mb-4">Post Not Found</h1>
          <Link
            to="/posts"
            className="btn btn-primary !w-auto"
          >
            Back to Posts
          </Link>
        </motion.div>
      </div>
    );
  }

  const hasLiked = post.likes?.includes(user?._id);
  const hasDisliked = post.dislikes?.includes(user?._id);
  const hasBookmarked = isBookmarked;

  return (
    <>
      <ReadingProgress />
      <div className="bg-page min-h-screen">
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
              <img
                src={post.featuredImage}
                alt={post.title}
                className="w-full h-48 sm:h-64 md:h-96 object-cover"
              />
            )}

            <div className="p-6">
              {/* Post Header */}
              <div className="mb-4 sm:mb-6">
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-primary mb-3 sm:mb-4">
                  {post.title}
                </h1>
                
                <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted mb-3 sm:mb-4">
                  <div className="flex items-center">
                    <User className="w-4 h-4 mr-2" />
                    <span className="font-medium">{post.author?.username}</span>
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
              <div className="prose prose-lg max-w-[680px] mx-auto mb-8">
                {(() => {
                  // Check if content is HTML (contains HTML tags)
                  const isHTML = /<[a-z][\s\S]*>/i.test(post.content);
                  
                  if (isHTML) {
                    // Render HTML content (from rich text editor)
                    const sanitizedHTML = DOMPurify.sanitize(post.content, {
                      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 's', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'blockquote', 'code', 'pre', 'a', 'img', 'video', 'div', 'span'],
                      ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'style', 'target', 'rel'],
                      ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp|data):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i
                    });
                    return <div dangerouslySetInnerHTML={{ __html: sanitizedHTML }} />;
                  } else {
                    // Render Markdown content (legacy posts)
                    return <ReactMarkdown>{post.content}</ReactMarkdown>;
                  }
                })()}
              </div>

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
                        className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-sm font-medium text-secondary transition-all hover:bg-[var(--accent)] hover:text-white hover:shadow-[0_8px_20px_rgba(26,137,23,0.2)]"
                      >
                        <span>#</span>
                        <span>{tag}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Interaction Buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-0 border-t border-[var(--border-subtle)] pt-4 sm:pt-6">
                <div className="flex items-center space-x-2 sm:space-x-4">
                  <motion.button
                    onClick={handleLike}
                    disabled={interactionLoading}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={`flex items-center space-x-1 sm:space-x-2 px-3 sm:px-4 py-2 rounded-xl transition-all text-sm sm:text-base ${
                      hasLiked
                        ? 'bg-[var(--accent)] text-white shadow-[0_12px_30px_rgba(26,137,23,0.22)] hover:text-white'
                        : 'glass-card text-secondary hover:bg-white/80'
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
                    className={`flex items-center space-x-1 sm:space-x-2 px-3 sm:px-4 py-2 rounded-xl transition-all text-sm sm:text-base ${
                      hasDisliked
                        ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-lg shadow-rose-500/25'
                        : 'glass-card text-secondary hover:bg-white/80'
                    }`}
                  >
                    <ThumbsDown className="w-4 h-4" />
                    <span>{post.dislikes?.length || 0}</span>
                  </motion.button>

                  <motion.button
                    onClick={handleShare}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex items-center space-x-1 sm:space-x-2 px-3 sm:px-4 py-2 glass-card text-secondary rounded-xl hover:bg-white/80 transition-all text-sm sm:text-base"
                  >
                    <Share2 className="w-4 h-4" />
                    <span className="hidden sm:inline">Share</span>
                  </motion.button>
                </div>

                <motion.button
                  onClick={handleSave}
                  disabled={interactionLoading}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`flex items-center justify-center sm:justify-start space-x-1 sm:space-x-2 px-3 sm:px-4 py-2 rounded-xl transition-all text-sm sm:text-base ${
                    hasBookmarked
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/25'
                      : 'glass-card text-secondary hover:bg-white/80'
                  }`}
                >
                  <Bookmark className={`w-4 h-4 ${hasBookmarked ? 'fill-current' : ''}`} />
                  <span className="hidden sm:inline">{hasBookmarked ? 'Saved' : 'Save'}</span>
                </motion.button>
              </div>
            </div>
          </motion.article>

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
                    className="w-full px-4 py-3 glass-card rounded-xl focus:ring-2 focus:ring-[var(--accent)]/50 focus:border-[var(--accent)]/35 focus:bg-white/90 resize-none transition-all"
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
              {comments.map((comment) => (
                <motion.div
                  key={comment._id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="border-b border-[var(--border-subtle)] pb-6 last:border-b-0"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-[var(--accent)]/15 text-[var(--accent)] rounded-full flex items-center justify-center text-xs font-semibold">
                        {comment.author?.username?.charAt(0).toUpperCase() || <User className="w-4 h-4" />}
                      </div>
                      <div>
                    <span className="font-medium text-primary">
                          {comment.author?.username}
                        </span>
                    <span className="text-sm text-muted ml-2">
                          {format(new Date(comment.createdAt), 'MMM d, yyyy')}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {editingCommentId === comment._id ? (
                        <>
                          <motion.button
                            onClick={() => handleUpdateComment(comment._id)}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            className="text-emerald-600 hover:text-emerald-700 transition-colors"
                          >
                            <Check className="w-4 h-4" />
                          </motion.button>
                          <motion.button
                            onClick={handleCancelEdit}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            className="text-secondary hover:text-primary transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </motion.button>
                        </>
                      ) : (
                        <>
                          {isAuthenticated && (user?._id === comment.author?._id || isAdmin()) && (
                            <>
                              <motion.button
                                onClick={() => handleEditComment(comment)}
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                className="text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors"
                              >
                                <Edit className="w-4 h-4" />
                              </motion.button>
                              <motion.button
                                onClick={() => handleDeleteComment(comment._id)}
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                className="text-rose-600 hover:text-rose-700 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </motion.button>
                            </>
                          )}
                          <motion.button
                            onClick={() => handleCommentLike(comment._id)}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            className={`flex items-center space-x-1 transition-colors ${
                              comment.likes?.includes(user?._id)
                                ? 'text-rose-500 hover:text-rose-600'
                        : 'text-[var(--text-muted)] hover:text-[var(--accent)]'
                            }`}
                          >
                            <Heart className={`w-4 h-4 ${comment.likes?.includes(user?._id) ? 'fill-current' : ''}`} />
                            <span className="text-sm">{comment.likes?.length || 0}</span>
                          </motion.button>
                        </>
                      )}
                    </div>
                  </div>
                  {editingCommentId === comment._id ? (
                    <textarea
                      value={editCommentText}
                      onChange={(e) => setEditCommentText(e.target.value)}
                      rows="3"
                      className="w-full px-4 py-2 glass-card rounded-xl focus:ring-2 focus:ring-[var(--accent)]/50 focus:border-[var(--accent)]/35 focus:bg-white/90 resize-none transition-all"
                    />
                  ) : (
                    <p className="text-[var(--text-secondary)] leading-relaxed">{comment.content}</p>
                  )}
                </motion.div>
              ))}

              {comments.length === 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-8 text-[var(--text-muted)]"
                >
                  <MessageCircle className="w-12 h-12 mx-auto mb-4 text-[var(--text-muted)]" />
                  <p>No comments yet. Be the first to share your thoughts!</p>
                </motion.div>
              )}
            </div>
          </motion.section>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          {/* Related Posts */}
          {relatedPosts.length > 0 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="card-elevated card-elevated-hover p-6"
            >
              <h3 className="text-lg font-bold text-[var(--text-primary)] mb-4">Related Posts</h3>
              <div className="space-y-4">
                {relatedPosts.map((relatedPost) => (
                  <motion.div
                    key={relatedPost._id}
                    whileHover={{ x: 4 }}
                    transition={{ type: 'spring', stiffness: 300 }}
                  >
                    <Link
                      to={`/posts/${relatedPost.slug}`}
                      className="block group glass-card-hover p-3 rounded-xl"
                    >
                      <h4 className="text-sm font-medium text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors line-clamp-2">
                        {relatedPost.title}
                      </h4>
                      <p className="text-xs text-[var(--text-muted)] mt-1">
                        {format(new Date(relatedPost.publishedAt), 'MMM d, yyyy')}
                      </p>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

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
      </div>
    </div>

    {/* Share Modal */}
    {showShareModal && (
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        onClick={() => setShowShareModal(false)}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          onClick={(e) => e.stopPropagation()}
          className="surface-card max-w-md w-full p-6 relative shadow-xl"
        >
          <button
            onClick={() => setShowShareModal(false)}
            className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="mb-6">
            <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Share Post</h2>
            <p className="text-[var(--text-secondary)]">Share this post with others</p>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              Post Link
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={window.location.href}
                className="flex-1 px-4 py-2 glass-card rounded-xl text-sm text-[var(--text-secondary)] focus:ring-2 focus:ring-[var(--accent)]/50 focus:border-[var(--accent)]/35"
              />
              <motion.button
                onClick={copyToClipboard}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`btn !w-auto transition-all ${
                  linkCopied
                    ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                    : 'btn-primary shadow-[0_14px_32px_rgba(26,137,23,0.24)]'
                }`}
              >
                {linkCopied ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  <Copy className="w-5 h-5" />
                )}
              </motion.button>
            </div>
            {linkCopied && (
              <p className="mt-2 text-sm text-emerald-600 flex items-center gap-1">
                <CheckCircle className="w-4 h-4" />
                Link copied!
              </p>
            )}
          </div>

          {navigator.share && (
            <motion.button
              onClick={handleNativeShare}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="btn btn-primary flex items-center justify-center gap-2 shadow-[0_16px_36px_rgba(26,137,23,0.2)]"
            >
              <Share2 className="w-5 h-5" />
              Share via Device
            </motion.button>
          )}
        </motion.div>
      </div>
    )}
    </>
  );
};

export default PostDetail;