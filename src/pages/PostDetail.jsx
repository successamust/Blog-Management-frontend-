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
  Check
} from 'lucide-react';
import { format } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import { postsAPI, commentsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import ReadingProgress from '../components/common/ReadingProgress';

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

  useEffect(() => {
    fetchPostData();
  }, [slug]);

  const fetchPostData = async () => {
    try {
      setLoading(true);
      const postRes = await postsAPI.getBySlug(slug);
      const post = postRes.data;
      
      setPost(post);
      
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
      await fetchPostData(); // Refresh post data
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
      await fetchPostData(); // Refresh post data
      toast.success('Post disliked!');
    } catch (error) {
      toast.error('Failed to dislike post');
    } finally {
      setInteractionLoading(false);
    }
  };

  const handleShare = async () => {
    try {
      await postsAPI.share(post._id);
      if (navigator.share) {
        await navigator.share({
          title: post.title,
          text: post.excerpt,
          url: window.location.href,
        });
      } else {
        navigator.clipboard.writeText(window.location.href);
        toast.success('Link copied to clipboard!');
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        toast.error('Failed to share post');
      }
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
      await commentsAPI.create(post._id, { content: commentText });
      setCommentText('');
      await fetchPostData(); // Refresh comments
      toast.success('Comment added!');
    } catch (error) {
      toast.error('Failed to add comment');
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
      await fetchPostData(); // Refresh comments
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!post) {
    return (
        <div className="min-h-screen flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center card-elevated p-8"
        >
          <h1 className="text-2xl font-bold text-slate-900 mb-4">Post Not Found</h1>
          <Link to="/posts" className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:shadow-lg hover:shadow-indigo-500/25 transition-all">
            Back to Posts
          </Link>
        </motion.div>
      </div>
    );
  }

  const hasLiked = post.likes?.includes(user?._id);
  const hasDisliked = post.dislikes?.includes(user?._id);

  return (
    <>
      <ReadingProgress />
      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
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

            <div className="p-4 sm:p-6 md:p-8">
              {/* Post Header */}
              <div className="mb-4 sm:mb-6">
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 mb-3 sm:mb-4">
                  {post.title}
                </h1>
                
                <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-slate-600 mb-3 sm:mb-4">
                  <div className="flex items-center">
                    <User className="w-4 h-4 mr-2" />
                    <span className="font-medium">{post.author?.username}</span>
                  </div>
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-2" />
                    <span>{format(new Date(post.publishedAt), 'MMMM d, yyyy')}</span>
                  </div>
                  <div className="flex items-center">
                    <Eye className="w-4 h-4 mr-2" />
                    <span>{post.viewCount} views</span>
                  </div>
                </div>

                {/* Tags */}
                {post.tags && post.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {post.tags.map((tag) => (
                      <Link
                        key={tag}
                        to={`/search?tags=${tag}`}
                        className="px-3 py-1 bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-700 rounded-full text-sm hover:from-indigo-200 hover:to-purple-200 transition-all"
                      >
                        #{tag}
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* Post Content */}
              <div className="prose prose-lg max-w-none mb-8">
                <ReactMarkdown>{post.content}</ReactMarkdown>
              </div>

              {/* Interaction Buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-0 border-t border-gray-200 pt-4 sm:pt-6">
                <div className="flex items-center space-x-2 sm:space-x-4">
                  <motion.button
                    onClick={handleLike}
                    disabled={interactionLoading}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={`flex items-center space-x-1 sm:space-x-2 px-3 sm:px-4 py-2 rounded-xl transition-all text-sm sm:text-base ${
                      hasLiked
                        ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/25'
                        : 'glass-card text-slate-700 hover:bg-white/80'
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
                        : 'glass-card text-slate-700 hover:bg-white/80'
                    }`}
                  >
                    <ThumbsDown className="w-4 h-4" />
                    <span>{post.dislikes?.length || 0}</span>
                  </motion.button>

                  <motion.button
                    onClick={handleShare}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex items-center space-x-1 sm:space-x-2 px-3 sm:px-4 py-2 glass-card text-slate-700 rounded-xl hover:bg-white/80 transition-all text-sm sm:text-base"
                  >
                    <Share2 className="w-4 h-4" />
                    <span className="hidden sm:inline">Share</span>
                  </motion.button>
                </div>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center justify-center sm:justify-start space-x-1 sm:space-x-2 px-3 sm:px-4 py-2 glass-card text-slate-700 rounded-xl hover:bg-white/80 transition-all text-sm sm:text-base"
                >
                  <Bookmark className="w-4 h-4" />
                  <span className="hidden sm:inline">Save</span>
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
            <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center">
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
                    className="w-full px-4 py-3 glass-card rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-300/50 focus:bg-white/90 resize-none transition-all"
                  />
                </div>
                <motion.button
                  type="submit"
                  disabled={submittingComment || !commentText.trim()}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:shadow-lg hover:shadow-indigo-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
                >
                  {submittingComment ? 'Posting...' : 'Post Comment'}
                </motion.button>
              </form>
            ) : (
              <div className="mb-8 p-4 glass-card rounded-xl text-center">
                <p className="text-slate-600 mb-2">
                  Please log in to leave a comment
                </p>
                <Link
                  to="/login"
                  className="text-indigo-600 hover:text-indigo-700 font-medium transition-colors"
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
                  className="border-b border-slate-200/50 pb-6 last:border-b-0"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                        {comment.author?.username?.charAt(0).toUpperCase() || <User className="w-4 h-4" />}
                      </div>
                      <div>
                        <span className="font-medium text-slate-900">
                          {comment.author?.username}
                        </span>
                        <span className="text-sm text-slate-500 ml-2">
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
                            className="text-slate-600 hover:text-slate-700 transition-colors"
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
                                className="text-indigo-600 hover:text-indigo-700 transition-colors"
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
                            className="flex items-center space-x-1 text-slate-500 hover:text-indigo-600 transition-colors"
                          >
                            <Heart className="w-4 h-4" />
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
                      className="w-full px-4 py-2 glass-card rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-300/50 focus:bg-white/90 resize-none transition-all"
                    />
                  ) : (
                    <p className="text-slate-700 leading-relaxed">{comment.content}</p>
                  )}
                </motion.div>
              ))}

              {comments.length === 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-8 text-slate-500"
                >
                  <MessageCircle className="w-12 h-12 mx-auto mb-4 text-slate-300" />
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
              <h3 className="text-lg font-bold text-slate-900 mb-4">Related Posts</h3>
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
                      <h4 className="text-sm font-medium text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-2">
                        {relatedPost.title}
                      </h4>
                      <p className="text-xs text-slate-500 mt-1">
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
            <h3 className="text-lg font-bold text-slate-900 mb-4">Post Stats</h3>
            <div className="space-y-3">
              <div className="flex justify-between py-2">
                <span className="text-slate-600">Views</span>
                <span className="font-semibold text-slate-900">{post.viewCount}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-slate-600">Likes</span>
                <span className="font-semibold text-slate-900">{post.likes?.length || 0}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-slate-600">Dislikes</span>
                <span className="font-semibold text-slate-900">{post.dislikes?.length || 0}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-slate-600">Shares</span>
                <span className="font-semibold text-slate-900">{post.shares || 0}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-slate-600">Comments</span>
                <span className="font-semibold text-slate-900">{comments.length}</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
    </>
  );
};

export default PostDetail;