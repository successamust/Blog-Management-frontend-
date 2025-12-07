import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  User,
  Calendar,
  FileText,
  Eye,
  Heart,
  MessageCircle,
  Share2,
  Mail,
  Globe,
  Twitter,
  Linkedin,
  Github,
  ArrowLeft,
  BookOpen,
  TrendingUp,
  UserPlus,
  UserMinus,
  Users,
} from 'lucide-react';
import { format } from 'date-fns';
import { postsAPI, followsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import ModernPostCard from '../components/posts/ModernPostCard';
import Spinner from '../components/common/Spinner';
import Seo, { DEFAULT_OG_IMAGE } from '../components/common/Seo';
import EmptyState from '../components/common/EmptyState';
import toast from 'react-hot-toast';
import OptimizedImage from '../components/common/OptimizedImage';

const AuthorProfile = () => {
  const { username } = useParams();
  const { user: currentUser } = useAuth();
  const [author, setAuthor] = useState(null);
  const [posts, setPosts] = useState([]);
  const [stats, setStats] = useState({
    totalPosts: 0,
    totalViews: 0,
    totalLikes: 0,
    totalComments: 0,
  });
  const [followStats, setFollowStats] = useState({
    followers: 0,
    following: 0,
  });
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchAuthorData();
  }, [username]);

  useEffect(() => {
    if (author) {
      fetchAuthorPosts();
      fetchFollowData();
    }
  }, [author, currentPage]);

  const fetchFollowData = async () => {
    if (!currentUser || !author?._id) return;
    
    // Don't fetch follow data if user is viewing their own profile
    const currentUserId = currentUser._id || currentUser.id;
    const authorId = author._id || author.id;
    if (currentUserId && authorId && String(currentUserId) === String(authorId)) {
      return;
    }
    
    try {
      const [statusResponse, statsResponse] = await Promise.all([
        followsAPI.getStatus(author._id).catch(() => ({ data: { isFollowing: false } })),
        followsAPI.getStats(author._id).catch(() => ({ data: { followers: 0, following: 0 } })),
      ]);
      
      setIsFollowing(statusResponse.data?.isFollowing || false);
      setFollowStats({
        followers: statsResponse.data?.followers || 0,
        following: statsResponse.data?.following || 0,
      });
    } catch (error) {
      // Silently handle - follow system might not be available
      console.error('Error fetching follow data:', error);
    }
  };

  const handleFollow = async () => {
    if (!currentUser) {
      toast.error('Please login to follow users');
      return;
    }

    if (!author?._id) return;

    // Prevent users from following themselves
    const currentUserId = currentUser._id || currentUser.id;
    const authorId = author._id || author.id;
    if (currentUserId && authorId && String(currentUserId) === String(authorId)) {
      toast.error('You cannot follow yourself');
      return;
    }

    try {
      setFollowLoading(true);
      if (isFollowing) {
        await followsAPI.unfollow(author._id);
        setIsFollowing(false);
        setFollowStats(prev => ({ ...prev, followers: Math.max(0, prev.followers - 1) }));
        toast.success('Unfollowed successfully');
      } else {
        await followsAPI.follow(author._id);
        setIsFollowing(true);
        setFollowStats(prev => ({ ...prev, followers: prev.followers + 1 }));
        toast.success('Following successfully');
      }
    } catch (error) {
      console.error('Error following/unfollowing:', error);
      toast.error(error.response?.data?.message || 'Failed to update follow status');
    } finally {
      setFollowLoading(false);
    }
  };

  const fetchAuthorData = async () => {
    try {
      setLoading(true);
      // Fetch author's posts to get author info
      const response = await postsAPI.getAll({ 
        author: username,
        limit: 1,
        status: 'published'
      });
      
      const postsData = response.data?.posts || [];
      if (postsData.length > 0) {
        const authorData = postsData[0].author;
        setAuthor(authorData);
        
        // Calculate stats from all posts
        const allPostsResponse = await postsAPI.getAll({ 
          author: username,
          limit: 1000,
          status: 'published'
        });
        const rawAllPosts = allPostsResponse.data?.posts || [];
        
        // Client-side filter to ensure all published posts are counted
        const isPublishedPost = (post) => {
          if (!post) return false;
          
          const status = (post?.status || post?.state || '').toString().toLowerCase().trim();
          if (status) {
            if (['published', 'publish', 'live', 'active', 'public'].includes(status)) return true;
            if (['draft', 'scheduled', 'archived', 'unpublished', 'pending'].includes(status)) return false;
          }
          
          if (post?.isDraft === true) return false;
          if (post?.isPublished === true || post?.published === true) return true;
          if (post?.isPublished === false || post?.published === false) return false;
          
          if (post?.publishedAt && !post?.scheduledAt) {
            const publishedDate = new Date(post.publishedAt);
            if (!isNaN(publishedDate.getTime()) && publishedDate <= new Date()) {
              return true;
            }
          }
          
          return true;
        };
        
        const allPosts = rawAllPosts.filter(isPublishedPost);
        
        const calculatedStats = {
          totalPosts: allPosts.length,
          totalViews: allPosts.reduce((sum, p) => sum + (p.viewCount || p.views || 0), 0),
          totalLikes: allPosts.reduce((sum, p) => {
            if (Array.isArray(p.likes)) return sum + p.likes.length;
            return sum + (p.likeCount || 0);
          }, 0),
          totalComments: allPosts.reduce((sum, p) => {
            if (Array.isArray(p.comments)) return sum + p.comments.length;
            return sum + (p.commentCount || 0);
          }, 0),
        };
        setStats(calculatedStats);
        setTotalPages(Math.ceil(allPosts.length / 12));
      } else {
        toast.error('Author not found');
      }
    } catch (error) {
      console.error('Error fetching author:', error);
      toast.error('Failed to load author profile');
    } finally {
      setLoading(false);
    }
  };

  const fetchAuthorPosts = async () => {
    try {
      setPostsLoading(true);
      const response = await postsAPI.getAll({
        author: username,
        page: currentPage,
        limit: 12,
        status: 'published',
      });

      const rawPosts = response.data?.posts || [];
      
      // Client-side filter to ensure all published posts are shown
      const isPublishedPost = (post) => {
        if (!post) return false;
        
        const status = (post?.status || post?.state || '').toString().toLowerCase().trim();
        if (status) {
          if (['published', 'publish', 'live', 'active', 'public'].includes(status)) return true;
          if (['draft', 'scheduled', 'archived', 'unpublished', 'pending'].includes(status)) return false;
        }
        
        if (post?.isDraft === true) return false;
        if (post?.isPublished === true || post?.published === true) return true;
        if (post?.isPublished === false || post?.published === false) return false;
        
        if (post?.publishedAt && !post?.scheduledAt) {
          const publishedDate = new Date(post.publishedAt);
          if (!isNaN(publishedDate.getTime()) && publishedDate <= new Date()) {
            return true;
          }
        }
        
        return true;
      };
      
      const filteredPosts = rawPosts.filter(isPublishedPost);
      
      setPosts(filteredPosts);
      setTotalPages(response.data?.totalPages || 1);
    } catch (error) {
      console.error('Error fetching author posts:', error);
      toast.error('Failed to load posts');
    } finally {
      setPostsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-page">
        <Spinner size="2xl" />
      </div>
    );
  }

  if (!author) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-page">
        <EmptyState
          title="Author Not Found"
          description="The author you're looking for doesn't exist."
          action={
            <Link to="/posts" className="btn btn-primary">
              Browse All Posts
            </Link>
          }
        />
      </div>
    );
  }

  const authorName = author.username || 'Unknown Author';
  const authorBio = author.bio || author.authorProfile?.bio || '';
  const authorWebsite = author.website || author.authorProfile?.website || '';
  const socialLinks = author.socialLinks || author.authorProfile?.socialLinks || {};

  return (
    <>
      <Seo
        title={`${authorName} - Author Profile`}
        description={authorBio || `Read articles by ${authorName} on Nexus`}
        url={`/authors/${username}`}
      />
      <div className="bg-page">
        <div className="layout-container-wide py-6 sm:py-8">
          {/* Back Button */}
          <Link
            to="/posts"
            className="inline-flex items-center gap-2 text-secondary hover:text-[var(--accent)] mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Posts</span>
          </Link>

          {/* Author Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[var(--surface-bg)] rounded-2xl shadow-lg p-6 sm:p-8 mb-8"
          >
            <div className="flex flex-col sm:flex-row gap-6">
              {/* Author Avatar */}
              <div className="flex-shrink-0">
                {author.profilePicture ? (
                  <OptimizedImage
                    src={author.profilePicture}
                    alt={authorName}
                    className="w-24 h-24 sm:w-32 sm:h-32 rounded-full object-cover"
                    width={128}
                    height={128}
                  />
                ) : (
                  <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-[var(--accent)]/20 flex items-center justify-center text-3xl sm:text-4xl font-bold text-[var(--accent)]">
                    {authorName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              {/* Author Info */}
              <div className="flex-1">
                <h1 className="text-3xl sm:text-4xl font-bold text-primary mb-2">{authorName}</h1>
                {authorBio && (
                  <p className="text-secondary mb-4 max-w-2xl">{authorBio}</p>
                )}

                {/* Follow Button */}
                {currentUser && String(currentUser._id || currentUser.id) !== String(author._id || author.id) && (
                  <div className="mb-4">
                    <button
                      onClick={handleFollow}
                      disabled={followLoading}
                      className={`btn ${isFollowing ? 'btn-outline' : 'btn-primary'} flex items-center gap-2 w-full sm:w-auto justify-center sm:justify-start`}
                    >
                      {followLoading ? (
                        <Spinner size="sm" />
                      ) : isFollowing ? (
                        <>
                          <UserMinus className="w-4 h-4" />
                          <span>Unfollow</span>
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-4 h-4" />
                          <span>Follow</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 sm:gap-4 mb-4">
                  <div className="text-center sm:text-left">
                    <div className="text-2xl font-bold text-primary">{stats.totalPosts}</div>
                    <div className="text-sm text-muted">Posts</div>
                  </div>
                  <div className="text-center sm:text-left">
                    <div className="text-2xl font-bold text-primary">{stats.totalViews.toLocaleString()}</div>
                    <div className="text-sm text-muted">Views</div>
                  </div>
                  <div className="text-center sm:text-left">
                    <div className="text-2xl font-bold text-primary">{stats.totalLikes.toLocaleString()}</div>
                    <div className="text-sm text-muted">Likes</div>
                  </div>
                  <div className="text-center sm:text-left">
                    <div className="text-2xl font-bold text-primary">{stats.totalComments.toLocaleString()}</div>
                    <div className="text-sm text-muted">Comments</div>
                  </div>
                  <div className="text-center sm:text-left">
                    <div className="text-2xl font-bold text-primary flex items-center gap-1 justify-center sm:justify-start">
                      <Users className="w-5 h-5" />
                      {followStats.followers.toLocaleString()}
                    </div>
                    <div className="text-sm text-muted">Followers</div>
                  </div>
                  <div className="text-center sm:text-left">
                    <div className="text-2xl font-bold text-primary">{followStats.following.toLocaleString()}</div>
                    <div className="text-sm text-muted">Following</div>
                  </div>
                </div>

                {/* Social Links */}
                <div className="flex flex-wrap items-center gap-3">
                  {authorWebsite && (
                    <a
                      href={authorWebsite}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-secondary hover:text-[var(--accent)] transition-colors"
                    >
                      <Globe className="w-4 h-4" />
                      <span className="text-sm">Website</span>
                    </a>
                  )}
                  {socialLinks.twitter && (
                    <a
                      href={socialLinks.twitter}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-secondary hover:text-blue-400 transition-colors"
                    >
                      <Twitter className="w-4 h-4" />
                    </a>
                  )}
                  {socialLinks.linkedin && (
                    <a
                      href={socialLinks.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-secondary hover:text-blue-600 transition-colors"
                    >
                      <Linkedin className="w-4 h-4" />
                    </a>
                  )}
                  {socialLinks.github && (
                    <a
                      href={socialLinks.github}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                    >
                      <Github className="w-4 h-4" />
                    </a>
                  )}
                  {author.email && currentUser?.role === 'admin' && (
                    <a
                      href={`mailto:${author.email}`}
                      className="flex items-center gap-2 text-secondary hover:text-[var(--accent)] transition-colors"
                    >
                      <Mail className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Author Posts */}
          <div>
            <h2 className="text-2xl font-bold text-primary mb-6 flex items-center gap-2">
              <FileText className="w-6 h-6" />
              Posts by {authorName}
            </h2>

            {postsLoading ? (
              <div className="flex justify-center py-12">
                <Spinner size="xl" />
              </div>
            ) : posts.length > 0 ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                  {posts.map((post, index) => (
                    <ModernPostCard key={post._id || post.id} post={post} delay={index * 0.1} />
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex justify-center gap-2">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="btn btn-outline disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <span className="flex items-center px-4 text-secondary">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="btn btn-outline disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            ) : (
              <EmptyState
                icon={FileText}
                title="No Posts Yet"
                description={`${authorName} hasn't published any posts yet.`}
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default AuthorProfile;

