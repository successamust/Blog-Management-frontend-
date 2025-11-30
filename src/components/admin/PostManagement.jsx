import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useParams, useNavigate } from 'react-router-dom';
import { FileText, Plus, Edit, Trash2, Eye, Search, Upload, X, BarChart3, History } from 'lucide-react';
import { postsAPI, categoriesAPI, adminAPI, imagesAPI, dashboardAPI, collaborationsAPI, pollsAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import RichTextEditor from './RichTextEditor';
import SkeletonLoader from '../common/SkeletonLoader';
import Spinner from '../common/Spinner';
import BulkOperations from './BulkOperations';
import PostScheduler from './PostScheduler';
import PostCollaboration from './PostCollaboration';
import PostTemplates from './PostTemplates';
import PostVersioning from './PostVersioning';

const PostManagement = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedPosts, setSelectedPosts] = useState([]);
  const [categories, setCategories] = useState([]);
  const { user, isAdmin } = useAuth();
  const { addNotification } = useNotifications();

  useEffect(() => {
    fetchPosts();
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await categoriesAPI.getAll();
      const categoriesData = response.data?.categories || 
                            response.data?.data || 
                            response.data || 
                            [];
      setCategories(Array.isArray(categoriesData) ? categoriesData : []);
    } catch (error) {
      console.error('Error fetching categories:', error);
      setCategories([]);
    }
  };

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const normalizePosts = (response) => {
        if (!response?.data) return [];
        return (
          response.data.posts ||
          response.data.data ||
          (Array.isArray(response.data) ? response.data : []) ||
          []
        );
      };

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

      const requestParams = { limit: 1000, status: 'all', includeDrafts: true };
      const primaryRes = await postsAPI.getAll(requestParams).catch((err) => {
        console.error('Primary posts fetch failed:', err);
        return null;
      });
      const primaryPosts = normalizePosts(primaryRes);

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

      const needsAdditionalStatuses = () => {
        if (!primaryPosts.length) return true;
        return !primaryPosts.some(isUnpublished);
      };

      let aggregatedPosts = primaryPosts;

      if (needsAdditionalStatuses()) {
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
                console.warn(`Failed to fetch posts with params ${JSON.stringify(params)}:`, err);
                return [];
              })
          )
        );

        aggregatedPosts = dedupeById([
          ...primaryPosts,
          ...extraResponses.flat(),
        ]);
      } else {
        aggregatedPosts = dedupeById(primaryPosts);
      }

      if (!aggregatedPosts.some(isUnpublished)) {
        const dashboardRes = await dashboardAPI.getPosts({ limit: 1000, status: 'all', includeDrafts: true }).catch((err) => {
          console.warn('Dashboard posts fallback failed:', err);
          return null;
        });
        const dashboardPosts = normalizePosts(dashboardRes);
        if (dashboardPosts.length) {
          aggregatedPosts = dedupeById([...aggregatedPosts, ...dashboardPosts]);
        }
      }

      const allPosts = aggregatedPosts;
      
      if (user?.role === 'author' && !isAdmin()) {
        const userPosts = allPosts.filter(post => {
          const postAuthorId = post.author?._id || post.author || post.authorId;
          const userId = user._id || user.id;
          return String(postAuthorId) === String(userId);
        });
        setPosts(userPosts);
      } else {
        setPosts(allPosts);
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
      toast.error('Failed to load posts');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDelete = async (postIds) => {
    try {
      await postsAPI.bulkDelete(postIds);
      toast.success(`Successfully deleted ${postIds.length} post(s)`);
      setSelectedPosts([]);
      fetchPosts();
    } catch (error) {
      toast.error('Failed to delete posts');
      console.error('Bulk delete error:', error);
    }
  };

  const handleBulkUpdate = async (postIds, updates) => {
    try {
      await postsAPI.bulkUpdate(postIds, updates);
      toast.success(`Successfully updated ${postIds.length} post(s)`);
      setSelectedPosts([]);
      fetchPosts();
    } catch (error) {
      toast.error('Failed to update posts');
      console.error('Bulk update error:', error);
    }
  };

  const handleDelete = async (postId) => {
    if (!window.confirm('Are you sure you want to delete this post?')) {
      return;
    }

    try {
      await postsAPI.delete(postId);
      toast.success('Post deleted successfully');
      fetchPosts();
    } catch (error) {
      toast.error('Failed to delete post');
    }
  };

  const filteredPosts = posts.filter((post) => {
    const matchesSearch =
      post.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.excerpt?.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Determine post status - check multiple fields
    let status = '';
    if (post.status) {
      status = post.status.toString().trim().toLowerCase();
    } else if (post.state) {
      status = post.state.toString().trim().toLowerCase();
    } else {
      // Fallback: check isPublished, publishedAt, or published field
      if (post.isPublished === true || post.published === true) {
        status = 'published';
      } else if (post.publishedAt && new Date(post.publishedAt) <= new Date()) {
        // If there's a publishedAt date in the past, consider it published
        status = 'published';
      } else if (post.isPublished === false || post.published === false) {
        status = 'draft';
      } else {
        // Default to published if no explicit draft status
        status = 'published';
      }
    }
    
    const matchesStatus = statusFilter === 'all' ? true : status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <SkeletonLoader variant="list" count={6} />
    );
  }

  return (
    <div className="space-y-6">
      <Routes>
        <Route
          index
          element={
            <PostList
              posts={filteredPosts}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              onDelete={handleDelete}
              selectedPosts={selectedPosts}
              setSelectedPosts={setSelectedPosts}
              onBulkDelete={handleBulkDelete}
              onBulkUpdate={handleBulkUpdate}
              categories={categories}
            />
          }
        />
        <Route path="create" element={<CreatePost onSuccess={fetchPosts} />} />
        <Route path="edit/:id" element={<EditPost onSuccess={fetchPosts} />} />
      </Routes>
    </div>
  );
};

const PostList = ({ posts, searchQuery, setSearchQuery, statusFilter, setStatusFilter, onDelete, selectedPosts, setSelectedPosts, onBulkDelete, onBulkUpdate, categories = [] }) => {
  const { user, isAdmin } = useAuth();
  const isAuthor = user?.role === 'author' || isAdmin();

  const getStatusMeta = (post) => {
    // Determine post status - check multiple fields
    let rawStatus = '';
    if (post.status) {
      rawStatus = post.status.toString().trim().toLowerCase();
    } else if (post.state) {
      rawStatus = post.state.toString().trim().toLowerCase();
    } else {
      // Fallback: check isPublished, publishedAt, or published field
      if (post.isPublished === true || post.published === true) {
        rawStatus = 'published';
      } else if (post.publishedAt && new Date(post.publishedAt) <= new Date()) {
        // If there's a publishedAt date in the past, consider it published
        rawStatus = 'published';
      } else if (post.isPublished === false || post.published === false) {
        rawStatus = 'draft';
      } else {
        // Default to published if no explicit draft status
        rawStatus = 'published';
      }
    }
    
    const baseStatus = rawStatus || 'published';
    const normalizedStatus = baseStatus.replace(/\s+/g, '-');

    const badgeClassMap = {
      published: 'bg-green-100 text-green-800',
      draft: 'bg-yellow-100 text-yellow-800',
      scheduled: 'bg-blue-100 text-blue-800',
      pending: 'bg-amber-100 text-amber-800',
      archived: 'bg-[var(--surface-subtle)] text-[var(--text-primary)]',
    };

    const label = baseStatus
      .split(/[\s-]+/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    return {
      label,
      className: badgeClassMap[normalizedStatus] || 'bg-[var(--surface-subtle)] text-[var(--text-primary)]',
    };
  };
  
  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-[var(--text-primary)]">
          {isAuthor && !isAdmin() ? 'My Posts' : 'Posts Management'}
        </h2>
        {isAuthor && (
          <Link
            to="/admin/posts/create"
            className="btn btn-primary !w-auto shadow-[0_12px_28px_rgba(26,137,23,0.2)]"
          >
            <Plus className="w-4 h-4" />
            <span>Create Post</span>
          </Link>
        )}
      </div>

      {/* Search */}
      <div className="bg-[var(--surface-bg)] rounded-xl shadow-sm border border-[var(--border-subtle)] p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--text-muted)] w-5 h-5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search posts..."
              className="w-full pl-10 pr-4 py-2 border border-[var(--border-subtle)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent bg-[var(--surface-bg)] text-[var(--text-primary)]"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-[var(--border-subtle)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent md:w-60 bg-[var(--surface-bg)] text-[var(--text-primary)]"
          >
            <option value="all">All statuses</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
            <option value="scheduled">Scheduled</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>

      {/* Posts List */}
      {posts.length > 0 ? (
        <>
          <div className="hidden md:block bg-[var(--surface-bg)] rounded-xl shadow-sm border border-[var(--border-subtle)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-[var(--surface-subtle)]">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider w-12">
                      <input
                        type="checkbox"
                        checked={selectedPosts.length === posts.length && posts.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedPosts(posts.map(p => p._id || p.id));
                          } else {
                            setSelectedPosts([]);
                          }
                        }}
                        className="rounded border-[var(--border-subtle)] text-[var(--accent)] focus:ring-[var(--accent)]"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                      Title
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                      Author
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                      Published
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-[var(--surface-bg)] divide-y divide-[var(--border-subtle)]">
                  {posts.map((post) => {
                    const { label, className } = getStatusMeta(post);
                    return (
                      <tr key={post._id} className="hover:bg-[var(--surface-subtle)]">
                        <td className="px-6 py-4">
                          <input
                            type="checkbox"
                            checked={selectedPosts.includes(post._id || post.id)}
                            onChange={(e) => {
                              const postId = post._id || post.id;
                              if (e.target.checked) {
                                setSelectedPosts([...selectedPosts, postId]);
                              } else {
                                setSelectedPosts(selectedPosts.filter(id => id !== postId));
                              }
                            }}
                            className="rounded border-[var(--border-subtle)] text-[var(--accent)] focus:ring-[var(--accent)]"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-[var(--text-primary)] line-clamp-1">{post.title}</div>
                          <div className="text-sm text-[var(--text-secondary)] line-clamp-1">{post.excerpt}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-[var(--text-primary)]">{post.author?.username || '—'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-[var(--text-secondary)]">
                            {(() => {
                              const dateSource = post.publishedAt || post.updatedAt || post.createdAt;
                              if (!dateSource) return '—';
                              const parsed = new Date(dateSource);
                              return Number.isNaN(parsed.getTime()) ? '—' : format(parsed, 'MMM d, yyyy');
                            })()}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${className}`}>
                            {label}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                          <Link
                            to={`/posts/${post.slug}`}
                            className="text-secondary hover:text-[var(--accent)] transition-colors"
                            title="View Post"
                          >
                            <Eye className="w-4 h-4 inline" />
                          </Link>
                          <Link
                            to={`/admin/posts/edit/${post._id}`}
                            className="text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors"
                            title="Edit Post"
                          >
                            <Edit className="w-4 h-4 inline" />
                          </Link>
                          {isAdmin() && (
                            <button
                              onClick={() => onDelete(post._id)}
                              className="text-red-600 hover:text-red-900 transition-colors"
                              title="Delete Post"
                            >
                              <Trash2 className="w-4 h-4 inline" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="md:hidden space-y-4">
            {posts.map((post) => {
              const { label, className } = getStatusMeta(post);
              return (
                <div
                  key={post._id}
                  className="bg-[var(--surface-bg)] rounded-xl shadow-sm border border-[var(--border-subtle)] p-4 space-y-3"
                >
                  <div className="flex flex-col gap-2">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-base font-semibold text-[var(--text-primary)]">{post.title}</p>
                        {post.excerpt && (
                          <p className="text-sm text-[var(--text-secondary)] line-clamp-2">{post.excerpt}</p>
                        )}
                      </div>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${className}`}>
                        {label}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-3 text-sm text-[var(--text-secondary)]">
                      <span className="inline-flex items-center gap-2">
                        <span className="font-medium text-[var(--text-primary)]">Author:</span>
                        {post.author?.username || '—'}
                      </span>
                      <span className="inline-flex items-center gap-2">
                        <span className="font-medium text-[var(--text-primary)]">Updated:</span>
                        {(() => {
                          const dateSource = post.publishedAt || post.updatedAt || post.createdAt;
                          if (!dateSource) return '—';
                          const parsed = new Date(dateSource);
                          return Number.isNaN(parsed.getTime()) ? '—' : format(parsed, 'MMM d, yyyy');
                        })()}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Link
                      to={`/posts/${post.slug}`}
                      className="btn btn-outline flex-1 justify-center"
                    >
                      <Eye className="w-4 h-4" />
                      View
                    </Link>
                    <Link
                      to={`/admin/posts/edit/${post._id}`}
                      className="btn btn-primary flex-1 justify-center"
                    >
                      <Edit className="w-4 h-4" />
                      Edit
                    </Link>
                    {isAdmin() && (
                      <button
                        onClick={() => onDelete(post._id)}
                        className="btn-icon-square border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                        aria-label="Delete post"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <div className="bg-[var(--surface-bg)] rounded-xl shadow-sm border border-[var(--border-subtle)]">
          <div className="text-center py-12 text-[var(--text-secondary)]">
            <FileText className="w-12 h-12 mx-auto mb-4 text-[var(--text-muted)]" />
            <p>No posts found</p>
          </div>
        </div>
      )}

      {/* Bulk Operations */}
      {selectedPosts.length > 0 && (
        <BulkOperations
          selectedPosts={selectedPosts}
          onBulkDelete={onBulkDelete}
          onBulkUpdate={onBulkUpdate}
          categories={categories}
        />
      )}
    </>
  );
};

const CreatePost = ({ onSuccess }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: '',
    excerpt: '',
    content: '',
    category: '',
    tags: '',
    featuredImage: '',
    status: 'published',
  });
  const [scheduledAt, setScheduledAt] = useState(null);
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
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
      const categoriesData = response.data?.categories || 
                            response.data?.data || 
                            response.data || 
                            [];
      setCategories(Array.isArray(categoriesData) ? categoriesData : []);
    } catch (error) {
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
        onSuccess(); // Refresh the list anyway
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
        toast.success('Post created successfully! Redirecting...');
      }
      
      if (postData.isPublished && postId) {
        try {
          await adminAPI.notifyNewPost(postId);
        } catch (error) {
          console.error('Failed to notify subscribers:', error);
        }
      }
      
      // Refresh the posts list in the background (non-blocking)
      onSuccess();
      
      // Navigate to edit page immediately (React Router handles this smoothly, no full page reload)
      navigate(`/admin/posts/edit/${postId}`, { replace: false });
    } catch (error) {
      console.error('Error creating post:', error);
      toast.error(error.response?.data?.message || 'Failed to create post');
    } finally {
      setSubmitting(false);
    }
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

  return (
    <div className="bg-[var(--surface-bg)] rounded-xl shadow-sm border border-[var(--border-subtle)] p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <h2 className="text-2xl font-bold text-[var(--text-primary)]">Create New Post</h2>
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
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Title</label>
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
                <span className="text-sm text-[var(--text-secondary)]">Loading categories...</span>
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
          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                type="url"
                name="featuredImage"
                value={formData.featuredImage}
                onChange={handleChange}
                placeholder="Image URL or upload an image"
                className="flex-1 px-4 py-2 border border-[var(--border-subtle)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent bg-[var(--surface-bg)] text-[var(--text-primary)]"
              />
              <label className="px-4 py-2 bg-[var(--surface-subtle)] border border-[var(--border-subtle)] rounded-lg hover:bg-[var(--surface-bg)] cursor-pointer transition-colors flex items-center">
                <Upload className="w-4 h-4 mr-2" />
                {uploadingImage ? 'Uploading...' : 'Upload'}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  disabled={uploadingImage}
                />
              </label>
              {formData.featuredImage && (
                <button
                  type="button"
                  onClick={handleDeleteImage}
                  className="px-4 py-2 rounded-lg border border-rose-400/40 text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 transition-colors flex items-center"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            {formData.featuredImage && (
              <div className="relative">
                <img
                  src={formData.featuredImage}
                  alt="Featured"
                  className="w-full h-48 object-cover rounded-lg border border-[var(--border-subtle)]"
                  onError={(e) => {
                    console.error('Image failed to load:', formData.featuredImage);
                    e.target.style.display = 'none';
                    toast.error('Failed to load image. Please check the URL.');
                  }}
                />
                <div className="mt-2 text-xs text-[var(--text-secondary)] break-all">
                  {formData.featuredImage}
                </div>
              </div>
            )}
          </div>
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
                  id="pollIsActiveCreate"
                  checked={pollFormData.isActive}
                  onChange={(e) => setPollFormData({ ...pollFormData, isActive: e.target.checked })}
                  className="h-4 w-4 text-[var(--accent)] focus:ring-[var(--accent)] border-[var(--border-subtle)] rounded"
                />
                <label htmlFor="pollIsActiveCreate" className="ml-2 block text-sm text-[var(--text-secondary)]">
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

        <div className="flex justify-end space-x-4">
          <Link
            to="/admin/posts"
            className="btn btn-outline"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_12px_26px_rgba(26,137,23,0.2)]"
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
    </div>
  );
};

const EditPost = ({ onSuccess }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const [formData, setFormData] = useState({
    title: '',
    excerpt: '',
    content: '',
    category: '',
    tags: '',
    featuredImage: '',
    status: 'published',
  });
  const [scheduledAt, setScheduledAt] = useState(null);
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [poll, setPoll] = useState(null);
  const [loadingPoll, setLoadingPoll] = useState(false);
  const [showPollForm, setShowPollForm] = useState(false);
  const [pollFormData, setPollFormData] = useState({
    question: '',
    description: '',
    options: [{ text: '' }, { text: '' }],
    isActive: true,
    expiresAt: '',
  });
  const [showTemplates, setShowTemplates] = useState(false);
  const [showVersioning, setShowVersioning] = useState(false);

  useEffect(() => {
    fetchPostData();
    fetchCategories();
    fetchPoll();
  }, [id]);

  const fetchPostData = async () => {
    try {
      setLoading(true);
      let post;
      const normalizePosts = (response) => {
        if (!response?.data) return [];
        return (
          response.data.posts ||
          response.data.data ||
          (Array.isArray(response.data) ? response.data : []) ||
          []
        );
      };

      try {
        const response = await postsAPI.getAll({ limit: 1000, includeDrafts: true, status: 'all' });
        const posts = normalizePosts(response);
        post = posts.find((p) => {
          const postId = p?._id || p?.id;
          return postId && (String(postId) === String(id));
        });
      } catch (error) {
        console.error('Error in first fetch attempt:', error);
        try {
          const response = await postsAPI.getAll({ limit: 1000, includeDrafts: true, status: 'all' });
          const posts = normalizePosts(response);
          post = posts.find((p) => {
            const postId = p?._id || p?.id;
            return postId && (String(postId) === String(id));
          });
        } catch (secondError) {
          console.error('Error in second fetch attempt:', secondError);
          throw secondError;
        }
      }
      
      if (!post) {
        toast.error('Post not found');
        navigate('/admin/posts');
        return;
      }

      if (user?.role === 'author' && !isAdmin()) {
        const postAuthorId = post.author?._id || post.author || post.authorId;
        const userId = user._id || user.id;
        const isPostOwner = postAuthorId && userId && String(postAuthorId) === String(userId);
        
        // Check if user is a collaborator
        let isCollaborator = false;
        if (!isPostOwner) {
          try {
            const collaboratorsResponse = await collaborationsAPI.getCollaborators(id);
            const collaborators = collaboratorsResponse.data?.collaborators || [];
            isCollaborator = collaborators.some(collab => {
              const collabUserId = collab.user?._id || collab.user || collab.userId;
              return collabUserId && userId && String(collabUserId) === String(userId);
            });
          } catch (error) {
            // If fetching collaborators fails, we'll just check ownership
            console.error('Error fetching collaborators:', error);
          }
        }
        
        if (!isPostOwner && !isCollaborator) {
          toast.error('You can only edit your own posts or posts you collaborate on');
          navigate('/admin/posts');
          return;
        }
      }

      setFormData({
        title: post.title || '',
        excerpt: post.excerpt || '',
        content: post.content || '',
        category: post.category?._id || post.category || '',
        tags: Array.isArray(post.tags) ? post.tags.join(', ') : (post.tags || ''),
        featuredImage: post.featuredImage || '',
        status: post.isPublished ? 'published' : 'draft',
      });
      if (post.scheduledAt) {
        setScheduledAt(new Date(post.scheduledAt));
      }
    } catch (error) {
      console.error('Error fetching post:', error);
      toast.error('Failed to load post');
      navigate('/admin/posts');
    } finally {
      setLoading(false);
    }
  };

  const fetchPoll = async () => {
    if (!id) return;
    try {
      setLoadingPoll(true);
      const response = await pollsAPI.getByPost(id);
      if (response.data?.poll) {
        setPoll(response.data.poll);
        setPollFormData({
          question: response.data.poll.question || '',
          description: response.data.poll.description || '',
          options: response.data.poll.options || [{ text: '' }, { text: '' }],
          isActive: response.data.poll.isActive !== false,
          expiresAt: response.data.poll.expiresAt 
            ? new Date(response.data.poll.expiresAt).toISOString().slice(0, 16)
            : '',
        });
        setShowPollForm(false);
      } else {
        setPoll(null);
        setShowPollForm(false);
      }
    } catch (error) {
      // 404 is expected when post doesn't have a poll - handle silently
      if (error.response?.status === 404) {
        setPoll(null);
      } else {
        console.error('Error fetching poll:', error);
        setPoll(null);
      }
    } finally {
      setLoadingPoll(false);
    }
  };

  const handlePollOptionChange = (index, value) => {
    const newOptions = [...pollFormData.options];
    newOptions[index] = { text: value };
    setPollFormData({
      ...pollFormData,
      options: newOptions,
    });
  };

  const addPollOption = () => {
    setPollFormData({
      ...pollFormData,
      options: [...pollFormData.options, { text: '' }],
    });
  };

  const removePollOption = (index) => {
    if (pollFormData.options.length <= 2) {
      toast.error('A poll must have at least 2 options');
      return;
    }
    const newOptions = pollFormData.options.filter((_, i) => i !== index);
    setPollFormData({
      ...pollFormData,
      options: newOptions,
    });
  };

  const handlePollSubmit = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (!pollFormData.question.trim()) {
      toast.error('Please enter a poll question');
      return;
    }

    const validOptions = pollFormData.options.filter(opt => opt.text.trim());
    if (validOptions.length < 2) {
      toast.error('A poll must have at least 2 options');
      return;
    }

    // Check for duplicate options
    const optionTexts = validOptions.map(opt => opt.text.trim().toLowerCase());
    const uniqueOptions = new Set(optionTexts);
    if (uniqueOptions.size !== optionTexts.length) {
      toast.error('Poll options must be unique');
      return;
    }

    setSubmitting(true);

    try {
      const pollData = {
        postId: id,
        question: pollFormData.question.trim(),
        description: pollFormData.description.trim() || undefined,
        options: validOptions.map(opt => ({ text: opt.text.trim() })),
        isActive: pollFormData.isActive,
        expiresAt: pollFormData.expiresAt ? new Date(pollFormData.expiresAt).toISOString() : null,
      };

      let response;
      if (poll) {
        response = await pollsAPI.update(poll.id || poll._id, pollData);
        toast.success('Poll updated successfully');
      } else {
        response = await pollsAPI.create(pollData);
        
        if (!response || !response.data) {
          throw new Error('Invalid response from server');
        }
        
        toast.success('Poll created successfully');
        
        // If poll was created, update local state immediately
        if (response.data?.poll) {
          setPoll({
            id: response.data.poll._id || response.data.poll.id,
            question: response.data.poll.question,
            description: response.data.poll.description,
            options: response.data.poll.options || [],
            isActive: response.data.poll.isActive !== false
          });
        }
      }

      // Refresh the poll data from server to ensure we have latest
      await fetchPoll();
      setShowPollForm(false);
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to save poll';
      
      if (error.response) {
        toast.error(`Error ${error.response.status}: ${errorMessage}`);
      } else if (error.request) {
        toast.error('No response from server. Please check your connection.');
      } else {
        toast.error(`Error: ${errorMessage}`);
      }
      
      // If it's a permission error, show more details
      if (error.response?.status === 403) {
        toast.error('You do not have permission to create polls for this post. Only the post author, collaborators, or admins can create polls.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const fetchCategories = async () => {
    try {
      setCategoriesLoading(true);
      const response = await categoriesAPI.getAll();
      const categoriesData = response.data?.categories || 
                            response.data?.data || 
                            response.data || 
                            [];
      setCategories(Array.isArray(categoriesData) ? categoriesData : []);
    } catch (error) {
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
      const isPublished = formData.status === 'published';
      
      const postData = {
        title: formData.title,
        excerpt: formData.excerpt,
        content: formData.content,
        tags: formData.tags ? formData.tags.split(',').map((tag) => tag.trim()).filter(Boolean) : [],
        status: formData.status,
        isPublished: scheduledAt ? false : isPublished,
        scheduledAt: scheduledAt ? scheduledAt.toISOString() : null,
      };
      
      if (formData.category) {
        postData.category = formData.category;
      }
      if (formData.featuredImage) {
        postData.featuredImage = formData.featuredImage;
      }
      
      const response = await postsAPI.update(id, postData);
      
      toast.success('Post updated successfully');
      onSuccess();
      navigate('/admin/posts');
    } catch (error) {
      console.error('Error updating post:', error);
      toast.error(error.response?.data?.message || error.response?.data?.error || 'Failed to update post');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SkeletonLoader variant="post-card" count={1} />
    );
  }

  if (!formData.title && !loading) {
    // If formData is empty and not loading, there might be an issue
    return (
      <div className="bg-[var(--surface-bg)] rounded-xl shadow-sm border border-[var(--border-subtle)] p-4 sm:p-6">
        <div className="text-center py-8">
          <p className="text-[var(--text-secondary)] mb-4">Unable to load post data. Please try again.</p>
          <Link
            to="/admin/posts"
            className="btn btn-primary"
          >
            Back to Posts
          </Link>
        </div>
      </div>
    );
  }

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

  const handleVersionRestore = (content) => {
    setFormData(prev => ({
      ...prev,
      content: content,
    }));
    setShowVersioning(false);
  };

  return (
    <div className="bg-[var(--surface-bg)] rounded-xl shadow-sm border border-[var(--border-subtle)] p-4 sm:p-6 overflow-x-hidden">
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)]">Edit Post</h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowTemplates(true)}
            className="btn btn-outline !w-auto text-sm"
          >
            <FileText className="w-4 h-4 mr-1" />
            Templates
          </button>
          <button
            type="button"
            onClick={() => setShowVersioning(true)}
            className="btn btn-outline !w-auto text-sm"
          >
            <History className="w-4 h-4 mr-1" />
            Versions
          </button>
        </div>
      </div>
      <form 
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit(e);
        }} 
        className="space-y-4 sm:space-y-6"
      >
        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Title</label>
          <input
            type="text"
            name="title"
            value={formData.title || ''}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 border border-[var(--border-subtle)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent bg-[var(--surface-bg)] text-[var(--text-primary)]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Excerpt</label>
          <textarea
            name="excerpt"
            value={formData.excerpt || ''}
            onChange={handleChange}
            rows="3"
            className="w-full px-4 py-2 border border-[var(--border-subtle)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent bg-[var(--surface-bg)] text-[var(--text-primary)]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Content</label>
          {typeof window !== 'undefined' && (
            <RichTextEditor
              value={formData.content || ''}
              onChange={(value) => {
                setFormData(prev => ({ ...prev, content: value }));
                // Auto-save version when content changes significantly (every 30 seconds of editing)
                if (id && value && value.length > 50) {
                  const lastSaveKey = `lastVersionSave_${id}`;
                  const lastSave = localStorage.getItem(lastSaveKey);
                  const now = Date.now();
                  // Auto-save every 30 seconds if content has changed
                  if (!lastSave || (now - parseInt(lastSave)) > 30000) {
                    // Save version in background (don't show toast for auto-saves)
                    const versions = JSON.parse(localStorage.getItem(`postVersions_${id}`) || '[]');
                    const newVersion = {
                      id: now.toString(),
                      content: value,
                      label: 'Auto-saved',
                      timestamp: now,
                      author: user?.name || user?.username || user?.email || 'Current User',
                    };
                    const updated = [newVersion, ...versions.filter(v => v.label !== 'Auto-saved' || (now - v.timestamp) > 300000)].slice(0, 20);
                    localStorage.setItem(`postVersions_${id}`, JSON.stringify(updated));
                    localStorage.setItem(lastSaveKey, now.toString());
                  }
                }
              }}
              placeholder="Write your post content here..."
            />
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Category</label>
            {categoriesLoading ? (
              <div className="w-full px-4 py-2 border border-[var(--border-subtle)] rounded-lg bg-[var(--surface-subtle)] flex items-center gap-2">
                <Spinner size="xs" />
                <span className="text-sm text-[var(--text-secondary)]">Loading categories...</span>
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

        {id && (
          <div>
            <PostCollaboration
              postId={id}
              currentAuthor={user}
              onCollaboratorsChange={(collaborators) => {
              }}
            />
          </div>
        )}

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
          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="url"
                name="featuredImage"
                value={formData.featuredImage}
                onChange={handleChange}
                placeholder="Image URL or upload an image"
                className="flex-1 px-4 py-2 border border-[var(--border-subtle)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent bg-[var(--surface-bg)] text-sm sm:text-base text-[var(--text-primary)]"
              />
              <label className="px-4 py-2 bg-[var(--surface-subtle)] border border-[var(--border-subtle)] rounded-lg hover:bg-[var(--surface-bg)] cursor-pointer transition-colors flex items-center justify-center text-sm sm:text-base whitespace-nowrap">
                <Upload className="w-4 h-4 mr-2" />
                {uploadingImage ? 'Uploading...' : 'Upload'}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  disabled={uploadingImage}
                />
              </label>
              {formData.featuredImage && (
                <button
                  type="button"
                  onClick={handleDeleteImage}
                  className="px-4 py-2 rounded-lg border border-rose-400/40 text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 transition-colors flex items-center justify-center text-sm sm:text-base whitespace-nowrap"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            {formData.featuredImage && (
              <div className="relative">
                <img
                  src={formData.featuredImage}
                  alt="Featured"
                  className="w-full h-48 object-cover rounded-lg border border-[var(--border-subtle)]"
                  onError={(e) => {
                    console.error('Image failed to load:', formData.featuredImage);
                    e.target.style.display = 'none';
                    toast.error('Failed to load image. Please check the URL.');
                  }}
                />
                <div className="mt-2 text-xs text-[var(--text-secondary)] break-all">
                  {formData.featuredImage}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Poll Section */}
        <div className="border-t border-[var(--border-subtle)] pt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-[var(--accent)]" />
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">Poll</h3>
            </div>
            {poll && !showPollForm && (
              <button
                type="button"
                onClick={() => setShowPollForm(true)}
                className="text-sm text-[var(--accent)] hover:underline"
              >
                Edit Poll
              </button>
            )}
            {!poll && !showPollForm && (
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
                  if (poll) {
                    setPollFormData({
                      question: poll.question || '',
                      description: poll.description || '',
                      options: poll.options || [{ text: '' }, { text: '' }],
                      isActive: poll.isActive !== false,
                    });
                  } else {
                    setPollFormData({
                      question: '',
                      description: '',
                      options: [{ text: '' }, { text: '' }],
                      isActive: true,
                    });
                  }
                }}
                className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                Cancel
              </button>
            )}
          </div>

          {loadingPoll ? (
            <div className="flex items-center justify-center py-8">
              <Spinner size="sm" />
            </div>
          ) : showPollForm ? (
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                handlePollSubmit(e);
                return false;
              }} 
              onClick={(e) => e.stopPropagation()}
              className="space-y-4 bg-[var(--surface-subtle)] p-4 rounded-lg"
            >
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  Poll Question <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={pollFormData.question}
                  onChange={(e) => setPollFormData({ ...pollFormData, question: e.target.value })}
                  required
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
                    onClick={addPollOption}
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
                        onChange={(e) => handlePollOptionChange(index, e.target.value)}
                        placeholder={`Option ${index + 1}`}
                        className="flex-1 px-4 py-2 border border-[var(--border-subtle)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent bg-[var(--surface-bg)] text-[var(--text-primary)]"
                      />
                      {pollFormData.options.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removePollOption(index)}
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
                  id="pollIsActive"
                  checked={pollFormData.isActive}
                  onChange={(e) => setPollFormData({ ...pollFormData, isActive: e.target.checked })}
                  className="h-4 w-4 text-[var(--accent)] focus:ring-[var(--accent)] border-[var(--border-subtle)] rounded"
                />
                <label htmlFor="pollIsActive" className="ml-2 block text-sm text-[var(--text-secondary)]">
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

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handlePollSubmit(e);
                  }}
                  disabled={submitting}
                  className="btn btn-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Saving...' : (poll ? 'Update Poll' : 'Create Poll')}
                </button>
                <Link
                  to="/admin/polls"
                  className="btn btn-outline text-sm"
                >
                  Manage Polls
                </Link>
              </div>
            </form>
          ) : poll ? (
            <div className="bg-[var(--surface-subtle)] p-4 rounded-lg">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-semibold text-[var(--text-primary)] mb-1">{poll.question}</h4>
                  {poll.description && (
                    <p className="text-sm text-[var(--text-secondary)] mb-3">{poll.description}</p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {poll.options?.map((option, index) => (
                      <span
                        key={option.id || index}
                        className="px-3 py-1 bg-[var(--surface-bg)] rounded-lg text-sm text-[var(--text-secondary)]"
                      >
                        {option.text}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {poll.isActive === false && (
                      <span className="inline-block px-2 py-1 bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 rounded text-xs font-medium">
                        Inactive
                      </span>
                    )}
                    {poll.expiresAt && (
                      <span className="inline-block px-2 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 rounded text-xs font-medium">
                        Expires: {new Date(poll.expiresAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-[var(--surface-subtle)] p-4 rounded-lg text-center text-[var(--text-secondary)]">
              <p className="text-sm">No poll attached to this post</p>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row justify-end gap-3 sm:gap-4">
          <Link
            to="/admin/posts"
            className="btn btn-outline w-full sm:w-auto"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_12px_26px_rgba(26,137,23,0.2)] w-full sm:w-auto"
          >
            {submitting ? 'Updating...' : 'Update Post'}
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

      {/* Post Versioning Modal */}
      {showVersioning && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowVersioning(false);
            }
          }}
        >
          <div className="bg-[var(--surface-bg)] rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto relative">
            <button
              onClick={() => setShowVersioning(false)}
              className="absolute top-4 right-4 z-10 p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] rounded-lg transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="p-6">
              <PostVersioning 
                postId={id} 
                currentContent={formData.content}
                onRestore={handleVersionRestore}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PostManagement;

