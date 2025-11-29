import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useParams, useNavigate } from 'react-router-dom';
import { BarChart3, Plus, Edit, Trash2, Search, Eye, X, BarChart } from 'lucide-react';
import { pollsAPI, postsAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import SkeletonLoader from '../common/SkeletonLoader';
import Spinner from '../common/Spinner';
import PollAnalytics from './PollAnalytics';

const PollManagement = () => {
                        const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchPolls();
  }, []);

  const fetchPolls = async () => {
    try {
      setLoading(true);
      const response = await pollsAPI.getAll({ limit: 1000 });
      const pollsData = response.data?.polls || [];
      
      // Map polls with post information
      const pollsList = pollsData.map(poll => ({
        ...poll,
        id: poll._id || poll.id,
        postId: poll.post?._id || poll.post || poll.postId,
        postTitle: poll.post?.title || 'Unknown Post',
        postSlug: poll.post?.slug
      }));
      
      setPolls(pollsList);
    } catch (error) {
      console.error('Error fetching polls:', error);
      toast.error('Failed to load polls');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (pollId, postId) => {
    if (!window.confirm('Are you sure you want to delete this poll? This action cannot be undone.')) {
      return;
    }

    try {
      await pollsAPI.delete(pollId);
      toast.success('Poll deleted successfully');
      fetchPolls();
    } catch (error) {
      console.error('Error deleting poll:', error);
      toast.error(error.response?.data?.message || 'Failed to delete poll');
    }
  };

  const filteredPolls = polls.filter((poll) =>
    poll.question?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    poll.postTitle?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <SkeletonLoader variant="post-card" count={6} />
    );
  }

  return (
    <div className="space-y-6">
      <Routes>
        <Route index element={<PollList polls={filteredPolls} searchQuery={searchQuery} setSearchQuery={setSearchQuery} onDelete={handleDelete} />} />
        <Route path="create" element={<CreatePoll onSuccess={fetchPolls} />} />
        <Route path="edit/:id" element={<EditPoll onSuccess={fetchPolls} />} />
      </Routes>
    </div>
  );
};

const PollList = ({ polls, searchQuery, setSearchQuery, onDelete }) => {
  const { user, isAdmin } = useAuth();
  const [showAnalytics, setShowAnalytics] = useState(null);
  const hasPolls = polls.length > 0;

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-[var(--text-primary)]">Polls Management</h2>
        <Link
          to="/admin/polls/create"
          className="btn btn-primary !w-auto shadow-[0_12px_28px_rgba(26,137,23,0.2)]"
        >
          <Plus className="w-4 h-4" />
          <span>Create Poll</span>
        </Link>
      </div>

      {/* Search */}
      <div className="bg-[var(--surface-bg)] rounded-xl shadow-sm border border-[var(--border-subtle)] p-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--text-muted)] w-5 h-5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search polls by question or post title..."
            className="w-full pl-10 pr-4 py-2 border border-[var(--border-subtle)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent bg-[var(--surface-bg)] text-[var(--text-primary)] placeholder-[var(--text-muted)]"
          />
        </div>
      </div>

      {!hasPolls ? (
        <div className="bg-[var(--surface-bg)] rounded-xl shadow-sm border border-[var(--border-subtle)] p-12 text-center">
          <BarChart3 className="w-16 h-16 text-[var(--text-muted)] mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-2">No Polls Found</h3>
          <p className="text-[var(--text-secondary)] mb-6">
            {searchQuery ? 'No polls match your search.' : 'Get started by creating your first poll.'}
          </p>
          {!searchQuery && (
            <Link
              to="/admin/polls/create"
              className="btn btn-primary inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create Poll
            </Link>
          )}
        </div>
      ) : (
        <div className="grid gap-4">
          {polls.map((poll) => (
            <div
              key={poll.id || poll._id}
              className="bg-[var(--surface-bg)] rounded-xl shadow-sm border border-[var(--border-subtle)] p-6 hover:border-[var(--accent)]/30 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <BarChart3 className="w-5 h-5 text-[var(--accent)] flex-shrink-0" />
                    <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                      {poll.question}
                    </h3>
                    {poll.isActive === false && (
                      <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 rounded text-xs font-medium">
                        Inactive
                      </span>
                    )}
                  </div>
                  
                  {poll.description && (
                    <p className="text-sm text-[var(--text-secondary)] mb-3 ml-8">
                      {poll.description}
                    </p>
                  )}

                  {poll.postTitle && (
                    <div className="ml-8 mb-3">
                      <Link
                        to={`/posts/${poll.postSlug || poll.postId}`}
                        className="text-sm text-[var(--accent)] hover:underline inline-flex items-center gap-1"
                      >
                        <Eye className="w-4 h-4" />
                        Post: {poll.postTitle}
                      </Link>
                    </div>
                  )}

                  <div className="ml-8 flex items-center gap-3 flex-wrap">
                    {poll.expiresAt && (
                      <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 rounded text-xs font-medium">
                        Expires: {new Date(poll.expiresAt).toLocaleDateString()}
                      </span>
                    )}
                    <div className="flex flex-wrap gap-2 mb-2">
                      {poll.options?.map((option, index) => (
                        <span
                          key={option.id || index}
                          className="px-3 py-1 bg-[var(--surface-subtle)] rounded-lg text-sm text-[var(--text-secondary)]"
                        >
                          {option.text}
                        </span>
                      ))}
                    </div>
                    <div className="text-xs text-[var(--text-muted)]">
                      {poll.options?.length || 0} options
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  {(isAdmin() || user?.role === 'author') && (
                    <button
                      onClick={() => setShowAnalytics(poll.id || poll._id)}
                      className="p-2 text-blue-500 hover:bg-blue-500/10 rounded-lg transition-colors"
                      title="View Analytics"
                    >
                      <BarChart className="w-4 h-4" />
                    </button>
                  )}
                  <Link
                    to={`/admin/polls/edit/${poll.id || poll._id}`}
                    className="p-2 text-[var(--accent)] hover:bg-[var(--accent)]/10 rounded-lg transition-colors"
                    title="Edit Poll"
                  >
                    <Edit className="w-4 h-4" />
                  </Link>
                  <button
                    onClick={() => onDelete(poll.id || poll._id, poll.postId)}
                    className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                    title="Delete Poll"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAnalytics && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowAnalytics(null);
            }
          }}
        >
          <div className="bg-[var(--surface-bg)] rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto relative">
            <button
              onClick={() => setShowAnalytics(null)}
              className="absolute top-4 right-4 z-10 p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] rounded-lg transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
            <PollAnalytics 
              pollId={showAnalytics} 
              onClose={() => setShowAnalytics(null)} 
            />
          </div>
        </div>
      )}
    </>
  );
};

const CreatePoll = ({ onSuccess }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    postId: '',
    question: '',
    description: '',
    options: [{ text: '' }, { text: '' }],
    isActive: true,
    expiresAt: '',
  });
  const [posts, setPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      setLoadingPosts(true);
      const response = await postsAPI.getAll({ limit: 1000 });
      const postsData = response.data?.posts || response.data?.data || response.data || [];
      setPosts(Array.isArray(postsData) ? postsData : []);
    } catch (error) {
      console.error('Error fetching posts:', error);
      toast.error('Failed to load posts');
    } finally {
      setLoadingPosts(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleOptionChange = (index, value) => {
    const newOptions = [...formData.options];
    newOptions[index] = { text: value };
    setFormData({
      ...formData,
      options: newOptions,
    });
  };

  const addOption = () => {
    setFormData({
      ...formData,
      options: [...formData.options, { text: '' }],
    });
  };

  const removeOption = (index) => {
    if (formData.options.length <= 2) {
      toast.error('A poll must have at least 2 options');
      return;
    }
    const newOptions = formData.options.filter((_, i) => i !== index);
    setFormData({
      ...formData,
      options: newOptions,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.postId) {
      toast.error('Please select a post');
      return;
    }

    if (!formData.question.trim()) {
      toast.error('Please enter a poll question');
      return;
    }

    const validOptions = formData.options.filter(opt => opt.text.trim());
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
        postId: formData.postId,
        question: formData.question.trim(),
        description: formData.description.trim() || undefined,
        options: validOptions.map(opt => ({ text: opt.text.trim() })),
        isActive: formData.isActive,
        expiresAt: formData.expiresAt ? new Date(formData.expiresAt).toISOString() : null,
      };

      await pollsAPI.create(pollData);
      toast.success('Poll created successfully');
      onSuccess();
      navigate('/admin/polls');
    } catch (error) {
      console.error('Error creating poll:', error);
      toast.error(error.response?.data?.message || 'Failed to create poll');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-[var(--surface-bg)] rounded-xl shadow-sm border border-[var(--border-subtle)] p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-[var(--text-primary)]">Create Poll</h2>
        <Link
          to="/admin/polls"
          className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          <X className="w-5 h-5" />
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
            Select Post <span className="text-red-500">*</span>
          </label>
          {loadingPosts ? (
            <div className="w-full px-4 py-2 border border-[var(--border-subtle)] rounded-lg bg-[var(--surface-subtle)] flex items-center gap-2">
              <Spinner size="xs" />
              <span className="text-sm text-[var(--text-secondary)]">Loading posts...</span>
            </div>
          ) : (
            <select
              name="postId"
              value={formData.postId}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-[var(--border-subtle)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent bg-[var(--surface-bg)] text-[var(--text-primary)]"
            >
              <option value="">-- Select a post --</option>
              {posts.map((post) => (
                <option key={post._id || post.id} value={post._id || post.id}>
                  {post.title}
                </option>
              ))}
            </select>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
            Poll Question <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="question"
            value={formData.question}
            onChange={handleChange}
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
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows="3"
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
              onClick={addOption}
              className="text-sm text-[var(--accent)] hover:underline"
            >
              + Add Option
            </button>
          </div>
          <div className="space-y-2">
            {formData.options.map((option, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  type="text"
                  value={option.text}
                  onChange={(e) => handleOptionChange(index, e.target.value)}
                  placeholder={`Option ${index + 1}`}
                  className="flex-1 px-4 py-2 border border-[var(--border-subtle)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent bg-[var(--surface-bg)] text-[var(--text-primary)]"
                />
                {formData.options.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removeOption(index)}
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
            id="isActive"
            checked={formData.isActive}
            onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
            className="h-4 w-4 text-[var(--accent)] focus:ring-[var(--accent)] border-[var(--border-subtle)] rounded"
          />
          <label htmlFor="isActive" className="ml-2 block text-sm text-[var(--text-secondary)]">
            Active (poll will be visible to users)
          </label>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? <Spinner size="sm" tone="light" /> : 'Create Poll'}
          </button>
          <Link
            to="/admin/polls"
            className="btn btn-secondary"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
};

const EditPoll = ({ onSuccess }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    postId: '',
    question: '',
    description: '',
    options: [],
    isActive: true,
    expiresAt: '',
  });
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchPosts();
    fetchPoll();
  }, [id]);

  const fetchPosts = async () => {
    try {
      setLoadingPosts(true);
      const response = await postsAPI.getAll({ limit: 1000 });
      const postsData = response.data?.posts || response.data?.data || response.data || [];
      setPosts(Array.isArray(postsData) ? postsData : []);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoadingPosts(false);
    }
  };

  const fetchPoll = async () => {
    try {
      setLoading(true);
      const response = await pollsAPI.getById(id);
      if (response.data?.poll) {
        const poll = response.data.poll;
        setFormData({
          postId: poll.post?._id || poll.post || '',
          question: poll.question || '',
          description: poll.description || '',
          options: poll.options || [],
          isActive: poll.isActive !== false,
          expiresAt: poll.expiresAt 
            ? new Date(poll.expiresAt).toISOString().slice(0, 16)
            : '',
        });
      }
    } catch (error) {
      console.error('Error fetching poll:', error);
      toast.error('Failed to load poll');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleOptionChange = (index, value) => {
    const newOptions = [...formData.options];
    newOptions[index] = { ...newOptions[index], text: value };
    setFormData({
      ...formData,
      options: newOptions,
    });
  };

  const addOption = () => {
    setFormData({
      ...formData,
      options: [...formData.options, { text: '' }],
    });
  };

  const removeOption = (index) => {
    if (formData.options.length <= 2) {
      toast.error('A poll must have at least 2 options');
      return;
    }
    const newOptions = formData.options.filter((_, i) => i !== index);
    setFormData({
      ...formData,
      options: newOptions,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.postId) {
      toast.error('Please select a post');
      return;
    }

    if (!formData.question.trim()) {
      toast.error('Please enter a poll question');
      return;
    }

    const validOptions = formData.options.filter(opt => opt.text && opt.text.trim());
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
        question: formData.question.trim(),
        description: formData.description.trim() || undefined,
        options: validOptions.map(opt => ({ text: opt.text.trim() })),
        isActive: formData.isActive,
        expiresAt: formData.expiresAt ? new Date(formData.expiresAt).toISOString() : null,
      };

      await pollsAPI.update(id, pollData);
      toast.success('Poll updated successfully');
      onSuccess();
      navigate('/admin/polls');
    } catch (error) {
      console.error('Error updating poll:', error);
      toast.error(error.response?.data?.message || 'Failed to update poll');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <SkeletonLoader variant="post-card" count={1} />;
  }

  return (
    <div className="bg-[var(--surface-bg)] rounded-xl shadow-sm border border-[var(--border-subtle)] p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-[var(--text-primary)]">Edit Poll</h2>
        <Link
          to="/admin/polls"
          className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          <X className="w-5 h-5" />
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
            Select Post <span className="text-red-500">*</span>
          </label>
          {loadingPosts ? (
            <div className="w-full px-4 py-2 border border-[var(--border-subtle)] rounded-lg bg-[var(--surface-subtle)] flex items-center gap-2">
              <Spinner size="xs" />
              <span className="text-sm text-[var(--text-secondary)]">Loading posts...</span>
            </div>
          ) : (
            <select
              name="postId"
              value={formData.postId}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-[var(--border-subtle)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent bg-[var(--surface-bg)] text-[var(--text-primary)]"
            >
              <option value="">-- Select a post --</option>
              {posts.map((post) => (
                <option key={post._id || post.id} value={post._id || post.id}>
                  {post.title}
                </option>
              ))}
            </select>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
            Poll Question <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="question"
            value={formData.question}
            onChange={handleChange}
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
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows="3"
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
              onClick={addOption}
              className="text-sm text-[var(--accent)] hover:underline"
            >
              + Add Option
            </button>
          </div>
          <div className="space-y-2">
            {formData.options.map((option, index) => (
              <div key={option.id || index} className="flex items-center gap-2">
                <input
                  type="text"
                  value={option.text || ''}
                  onChange={(e) => handleOptionChange(index, e.target.value)}
                  placeholder={`Option ${index + 1}`}
                  className="flex-1 px-4 py-2 border border-[var(--border-subtle)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent bg-[var(--surface-bg)] text-[var(--text-primary)]"
                />
                {formData.options.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removeOption(index)}
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
            id="isActive"
            checked={formData.isActive}
            onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
            className="h-4 w-4 text-[var(--accent)] focus:ring-[var(--accent)] border-[var(--border-subtle)] rounded"
          />
          <label htmlFor="isActive" className="ml-2 block text-sm text-[var(--text-secondary)]">
            Active (poll will be visible to users)
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
            Expiration Date (Optional)
          </label>
          <input
            type="datetime-local"
            value={formData.expiresAt}
            onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
            min={new Date().toISOString().slice(0, 16)}
            className="w-full px-4 py-2 border border-[var(--border-subtle)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent bg-[var(--surface-bg)] text-[var(--text-primary)]"
          />
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Poll will automatically deactivate after this date. Leave empty for no expiration.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? <Spinner size="sm" tone="light" /> : 'Update Poll'}
          </button>
          <Link
            to="/admin/polls"
            className="btn btn-secondary"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
};

export default PollManagement;

