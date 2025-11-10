import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useParams, useNavigate } from 'react-router-dom';
import { FileText, Plus, Edit, Trash2, Eye, Search, Upload, X } from 'lucide-react';
import { postsAPI, categoriesAPI, adminAPI, imagesAPI, dashboardAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import RichTextEditor from './RichTextEditor';

const PostManagement = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const { user, isAdmin } = useAuth();

  useEffect(() => {
    fetchPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      
      // If user is author (not admin), filter to only show their own posts
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
    const status = (post.status || post.state || (post.isPublished ? 'published' : 'draft'))
      .toString()
      .trim()
      .toLowerCase();
    const matchesStatus = statusFilter === 'all' ? true : status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
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
            />
          }
        />
        <Route path="create" element={<CreatePost onSuccess={fetchPosts} />} />
        <Route path="edit/:id" element={<EditPost onSuccess={fetchPosts} />} />
      </Routes>
    </div>
  );
};

const PostList = ({ posts, searchQuery, setSearchQuery, statusFilter, setStatusFilter, onDelete }) => {
  const { user, isAdmin } = useAuth();
  const isAuthor = user?.role === 'author' || isAdmin();
  
  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          {isAuthor && !isAdmin() ? 'My Posts' : 'Posts Management'}
        </h2>
        {isAuthor && (
          <Link
            to="/admin/posts/create"
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Create Post</span>
          </Link>
        )}
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search posts..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent md:w-60"
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
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Author
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Published
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {posts.map((post) => (
                <tr key={post._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900 line-clamp-1">{post.title}</div>
                    <div className="text-sm text-gray-500 line-clamp-1">{post.excerpt}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{post.author?.username}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {(() => {
                        const dateSource = post.publishedAt || post.updatedAt || post.createdAt;
                        if (!dateSource) return '—';
                        const parsed = new Date(dateSource);
                        return Number.isNaN(parsed.getTime()) ? '—' : format(parsed, 'MMM d, yyyy');
                      })()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        post.isPublished
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {post.isPublished ? 'published' : 'draft'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <Link
                      to={`/posts/${post.slug}`}
                      className="text-blue-600 hover:text-blue-900 transition-colors"
                      title="View Post"
                    >
                      <Eye className="w-4 h-4 inline" />
                    </Link>
                    <Link
                      to={`/admin/posts/edit/${post._id}`}
                      className="text-green-600 hover:text-green-900 transition-colors"
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
              ))}
            </tbody>
          </table>
        </div>
        {posts.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No posts found</p>
          </div>
        )}
      </div>
    </>
  );
};

const CreatePost = ({ onSuccess }) => {
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
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    fetchCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchCategories = async () => {
    try {
      setCategoriesLoading(true);
      const response = await categoriesAPI.getAll();
      console.log('Categories API response:', response);
      
      // Handle different possible response structures
      const categoriesData = response.data?.categories || 
                            response.data?.data || 
                            response.data || 
                            [];
      
      console.log('Categories data:', categoriesData);
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
      // Backend returns { message, image: { url, publicId, ... } }
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
        isPublished: formData.status === 'published', // Convert status to isPublished boolean
      };
      
      const response = await postsAPI.create(postData);
      // Backend returns the post directly, not wrapped in { post: ... }
      const newPost = response.data.post || response.data;
      
      if (!newPost || !newPost._id) {
        console.error('Post creation response:', response);
        toast.error('Post created but response format unexpected. Please refresh the page.');
        onSuccess(); // Refresh the list anyway
        return;
      }
      
      toast.success('Post created successfully');
      
      if (postData.isPublished && newPost._id) {
        try {
          await adminAPI.notifyNewPost(newPost._id);
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
      
      // Refresh the posts list
      onSuccess();
    } catch (error) {
      console.error('Error creating post:', error);
      toast.error(error.response?.data?.message || 'Failed to create post');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Create New Post</h2>
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
            {categoriesLoading ? (
              <div className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span className="text-sm text-gray-500">Loading categories...</span>
              </div>
            ) : (
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Featured Image</label>
          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                type="url"
                name="featuredImage"
                value={formData.featuredImage}
                onChange={handleChange}
                placeholder="Image URL or upload an image"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <label className="px-4 py-2 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 cursor-pointer transition-colors flex items-center">
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
                  className="px-4 py-2 bg-red-100 text-red-700 border border-red-300 rounded-lg hover:bg-red-200 transition-colors flex items-center"
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
                  className="w-full h-48 object-cover rounded-lg border border-gray-300"
                  onError={(e) => {
                    console.error('Image failed to load:', formData.featuredImage);
                    e.target.style.display = 'none';
                    toast.error('Failed to load image. Please check the URL.');
                  }}
                />
                <div className="mt-2 text-xs text-gray-500 break-all">
                  {formData.featuredImage}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end space-x-4">
          <Link
            to="/admin/posts"
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? 'Creating...' : 'Create Post'}
          </button>
        </div>
      </form>
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
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    fetchPostData();
    fetchCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchPostData = async () => {
    try {
      setLoading(true);
      // Try to get post by ID first, fallback to getting all posts
      let post;
      try {
        // Try to get post directly by ID if endpoint exists
        const response = await postsAPI.getAll({ limit: 1000 });
        post = response.data.posts.find(p => p._id === id || p.id === id);
      } catch (error) {
        // If that fails, try getting all posts
        const response = await postsAPI.getAll({ limit: 1000 });
        post = response.data.posts.find(p => p._id === id || p.id === id);
      }
      
      if (!post) {
        toast.error('Post not found');
        navigate('/admin/posts');
        return;
      }

      // Check if author can edit this post
      if (user?.role === 'author' && !isAdmin()) {
        const postAuthorId = post.author?._id || post.author || post.authorId;
        const userId = user._id || user.id;
        if (String(postAuthorId) !== String(userId)) {
          toast.error('You can only edit your own posts');
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
        status: post.isPublished ? 'published' : 'draft', // Map isPublished to status for form
      });
    } catch (error) {
      console.error('Error fetching post:', error);
      toast.error('Failed to load post');
      navigate('/admin/posts');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      setCategoriesLoading(true);
      const response = await categoriesAPI.getAll();
      console.log('Categories API response:', response);
      
      // Handle different possible response structures
      const categoriesData = response.data?.categories || 
                            response.data?.data || 
                            response.data || 
                            [];
      
      console.log('Categories data:', categoriesData);
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
      // Backend returns { message, image: { url, publicId, ... } }
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
      
      // Build postData object, only including defined values
      const postData = {
        title: formData.title,
        excerpt: formData.excerpt,
        content: formData.content,
        tags: formData.tags ? formData.tags.split(',').map((tag) => tag.trim()).filter(Boolean) : [],
        isPublished: isPublished, // Convert status to isPublished boolean - ALWAYS send this
      };
      
      // Only add optional fields if they have values
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
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Edit Post</h2>
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
            {categoriesLoading ? (
              <div className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span className="text-sm text-gray-500">Loading categories...</span>
              </div>
            ) : (
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Featured Image</label>
          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                type="url"
                name="featuredImage"
                value={formData.featuredImage}
                onChange={handleChange}
                placeholder="Image URL or upload an image"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <label className="px-4 py-2 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 cursor-pointer transition-colors flex items-center">
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
                  className="px-4 py-2 bg-red-100 text-red-700 border border-red-300 rounded-lg hover:bg-red-200 transition-colors flex items-center"
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
                  className="w-full h-48 object-cover rounded-lg border border-gray-300"
                  onError={(e) => {
                    console.error('Image failed to load:', formData.featuredImage);
                    e.target.style.display = 'none';
                    toast.error('Failed to load image. Please check the URL.');
                  }}
                />
                <div className="mt-2 text-xs text-gray-500 break-all">
                  {formData.featuredImage}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end space-x-4">
          <Link
            to="/admin/posts"
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? 'Updating...' : 'Update Post'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PostManagement;

