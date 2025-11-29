import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, Plus, Trash2, Edit, Save, X, Sparkles } from 'lucide-react';
import { templatesAPI, categoriesAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import Spinner from '../common/Spinner';
import SkeletonLoader from '../common/SkeletonLoader';

const PostTemplates = ({ onSelectTemplate }) => {
  const { user, isAdmin } = useAuth();
  const [templates, setTemplates] = useState([]);
  const [defaultTemplates, setDefaultTemplates] = useState([]);
  const [customTemplates, setCustomTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    title: '',
    excerpt: '',
    content: '',
    category: '',
    tags: '',
    isDefault: false,
  });

  useEffect(() => {
    fetchTemplates();
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setCategoriesLoading(true);
      const response = await categoriesAPI.getAll();
      
      // Handle different possible response structures
      const categoriesData = response.data?.categories || 
                            response.data?.data || 
                            response.data || 
                            [];
      
      setCategories(Array.isArray(categoriesData) ? categoriesData : []);
    } catch (error) {
      console.error('Error fetching categories:', error);
      setCategories([]);
    } finally {
      setCategoriesLoading(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await templatesAPI.getAll();
      const templatesData = response.data?.templates || [];
      const defaults = response.data?.defaults || [];
      const custom = response.data?.custom || [];

      setTemplates(templatesData);
      setDefaultTemplates(defaults);
      setCustomTemplates(custom);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast.error('Failed to load templates');
      setTemplates([]);
      setDefaultTemplates([]);
      setCustomTemplates([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('Please enter a template name');
      return;
    }

    setSubmitting(true);
    try {
      if (editingId) {
        const template = templates.find(t => t._id === editingId || t.id === editingId);
        if (template?.isDefault && !isAdmin()) {
          toast.error('Only admins can edit default templates');
          setSubmitting(false);
          return;
        }

        const templateId = template?._id || template?.id;
        await templatesAPI.update(templateId, formData);
        toast.success(template?.isDefault 
          ? 'Default template updated (applies to all users)'
          : 'Template updated successfully'
        );
      } else {
        await templatesAPI.create(formData);
        toast.success('Template created successfully');
      }

      setShowCreateModal(false);
      setEditingId(null);
      setFormData({
        name: '',
        title: '',
        excerpt: '',
        content: '',
        category: '',
        tags: '',
        isDefault: false,
      });
      await fetchTemplates();
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error(error.response?.data?.message || 'Failed to save template');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    const template = templates.find(t => (t._id || t.id) === id);
    
    if (template?.isDefault && !isAdmin()) {
      toast.error('Only admins can delete default templates');
      return;
    }

    const confirmMessage = template?.isDefault
      ? 'Delete this default template? This will remove it for all users.'
      : 'Delete this template?';

    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      const templateId = template?._id || template?.id;
      await templatesAPI.delete(templateId);
      toast.success(template?.isDefault
        ? 'Default template deleted (removed for all users)'
        : 'Template deleted successfully'
      );
      await fetchTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error(error.response?.data?.message || 'Failed to delete template');
    }
  };

  const handleEdit = (template) => {
    setFormData({
      name: template.name || '',
      title: template.title || '',
      excerpt: template.excerpt || '',
      content: template.content || '',
      category: template.category || '',
      tags: template.tags || '',
      isDefault: template.isDefault || false,
    });
    setEditingId(template._id || template.id);
    setShowCreateModal(true);
  };

  const handleSelect = async (template) => {
    try {
      // Record template usage
      const templateId = template._id || template.id;
      await templatesAPI.use(templateId).catch(() => {
        // Silently fail if usage tracking fails
      });

      if (onSelectTemplate) {
        onSelectTemplate(template);
      }
      setShowCreateModal(false);
      toast.success(`Template "${template.name}" applied`);
    } catch (error) {
      console.error('Error using template:', error);
      // Still apply template even if usage tracking fails
      if (onSelectTemplate) {
        onSelectTemplate(template);
      }
      setShowCreateModal(false);
      toast.success(`Template "${template.name}" applied`);
    }
  };

  const handleInitializeDefaults = async () => {
    if (!isAdmin()) {
      toast.error('Only admins can initialize default templates');
      return;
    }

    try {
      await templatesAPI.initializeDefaults();
      toast.success('Default templates initialized successfully');
      await fetchTemplates();
    } catch (error) {
      console.error('Error initializing defaults:', error);
      toast.error(error.response?.data?.message || 'Failed to initialize default templates');
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <SkeletonLoader variant="post-card" count={3} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-primary flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Post Templates
          </h3>
          <p className="text-xs text-muted mt-1">
            Create reusable templates to quickly start new posts with pre-filled content
          </p>
        </div>
        <button
                  onClick={() => {
            setEditingId(null);
            setFormData({
              name: '',
              title: '',
              excerpt: '',
              content: '',
              category: '',
              tags: '',
              isDefault: false,
            });
            setShowCreateModal(true);
          }}
          className="btn btn-outline text-sm w-full sm:w-auto"
        >
          <Plus className="w-4 h-4 mr-1" />
          New Template
        </button>
      </div>

      {/* Help Section */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 sm:p-4 mb-4">
        <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2 text-xs sm:text-sm">How to Use Templates:</h4>
        <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1 list-disc list-inside mb-3">
          <li>Click "Use Template" to apply a template to your post form</li>
          <li>Create custom templates with "New Template" button</li>
        </ul>
        {isAdmin() && defaultTemplates.length === 0 && (
          <button
            onClick={handleInitializeDefaults}
            className="text-xs text-blue-700 dark:text-blue-300 hover:underline flex items-center gap-1"
          >
            <Sparkles className="w-3 h-3" />
            Initialize Default Templates
          </button>
        )}
      </div>

      {templates.length === 0 ? (
        <div className="p-6 bg-surface-subtle rounded-xl text-center">
          <FileText className="w-12 h-12 mx-auto text-muted mb-3 opacity-50" />
          <p className="text-sm text-muted mb-2">No templates yet</p>
          <p className="text-xs text-muted mb-4">
            {isAdmin() && defaultTemplates.length === 0
              ? 'Initialize default templates or create your own custom templates'
              : 'Create templates to speed up your post creation workflow'}
          </p>
          {isAdmin() && defaultTemplates.length === 0 ? (
            <button
              onClick={handleInitializeDefaults}
              className="btn btn-primary mb-2"
            >
              Initialize Default Templates
            </button>
          ) : null}
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn btn-primary"
          >
            Create Your First Template
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Default Templates Section */}
          {defaultTemplates.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-[var(--accent)]" />
                <h4 className="text-sm font-semibold text-[var(--text-primary)]">Default Templates</h4>
                <span className="text-xs text-[var(--text-muted)] bg-[var(--surface-subtle)] px-2 py-1 rounded-full">
                  {defaultTemplates.length} templates
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {defaultTemplates.map((template) => (
                  <motion.div
                    key={template._id || template.id}
                    className="p-4 bg-gradient-to-br from-[var(--accent-soft)]/20 to-[var(--surface-subtle)] rounded-xl border border-[var(--accent)]/20"
                  >
                    <div className="flex items-start justify-between mb-2 gap-2">
                      <div className="flex-1 flex flex-wrap items-center gap-2 min-w-0">
                        <h4 className="font-semibold text-primary break-words">{template.name}</h4>
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className="text-xs px-2 py-0.5 bg-[var(--accent)]/10 text-[var(--accent)] rounded-full whitespace-nowrap">
                            Default
                          </span>
                          {isAdmin() && (
                            <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-full whitespace-nowrap">
                              Admin Only
                            </span>
                          )}
                        </div>
                      </div>
                      {isAdmin() && (
                        <button
                          onClick={() => handleEdit(template)}
                          className="p-1.5 hover:bg-surface rounded flex-shrink-0"
                          title="Edit template (Admin only)"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    {template.title && (
                      <p className="text-sm text-secondary mb-2 line-clamp-1">{template.title}</p>
                    )}
                    <button
                      onClick={() => handleSelect(template)}
                      className="btn btn-primary w-full text-sm mt-2"
                    >
                      Use Template
                    </button>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Custom Templates Section */}
          {customTemplates.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <FileText className="w-4 h-4 text-[var(--text-secondary)]" />
                <h4 className="text-sm font-semibold text-[var(--text-primary)]">Your Templates</h4>
                <span className="text-xs text-[var(--text-muted)] bg-[var(--surface-subtle)] px-2 py-1 rounded-full">
                  {customTemplates.length} templates
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {customTemplates.map((template) => (
                  <motion.div
                    key={template._id || template.id}
                    className="p-4 bg-surface-subtle rounded-xl border border-[var(--border-subtle)]"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-primary">{template.name}</h4>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleEdit(template)}
                          className="p-1 hover:bg-surface rounded"
                          title="Edit template"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(template._id || template.id)}
                          className="p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded text-red-600"
                          title="Delete template"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    {template.title && (
                      <p className="text-sm text-secondary mb-2 line-clamp-1">{template.title}</p>
                    )}
                    <button
                      onClick={() => handleSelect(template)}
                      className="btn btn-primary w-full text-sm mt-2"
                    >
                      Use Template
                    </button>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" style={{ overflow: 'hidden' }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[var(--surface-bg)] rounded-xl p-4 sm:p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto overflow-x-hidden"
            style={{ position: 'relative', zIndex: 50 }}
          >
            <div className="flex items-center justify-between mb-4 gap-2">
              <h3 className="text-lg sm:text-xl font-bold text-primary flex-1">
                {editingId ? 'Edit Template' : 'Create Template'}
              </h3>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingId(null);
                  setFormData({
                    name: '',
                    title: '',
                    excerpt: '',
                    content: '',
                    category: '',
                    tags: '',
                    isDefault: false,
                  });
                }}
                className="p-1.5 hover:bg-[var(--surface-subtle)] rounded flex-shrink-0"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 sm:space-y-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-secondary mb-1.5 sm:mb-2">
                  Template Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Tech Review Template"
                  className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-[var(--border-subtle)] rounded-lg bg-[var(--surface-bg)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-secondary mb-1.5 sm:mb-2">
                  Default Title
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Post title..."
                  className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-[var(--border-subtle)] rounded-lg bg-[var(--surface-bg)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-secondary mb-1.5 sm:mb-2">
                  Default Excerpt
                </label>
                <textarea
                  value={formData.excerpt}
                  onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                  placeholder="Post excerpt..."
                  rows="2"
                  className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-[var(--border-subtle)] rounded-lg bg-[var(--surface-bg)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-secondary mb-1.5 sm:mb-2">
                  Default Content
                </label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Post content (HTML or Markdown)..."
                  rows="6"
                  className="w-full px-3 sm:px-4 py-2 text-xs sm:text-sm border border-[var(--border-subtle)] rounded-lg font-mono bg-[var(--surface-bg)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="relative" style={{ zIndex: 1 }}>
                  <label className="block text-xs sm:text-sm font-medium text-secondary mb-1.5 sm:mb-2">
                    Default Category
                  </label>
                  {categoriesLoading ? (
                    <div className="w-full px-3 sm:px-4 py-2 border border-[var(--border-subtle)] rounded-lg bg-[var(--surface-subtle)] flex items-center gap-2">
                      <Spinner size="xs" />
                      <span className="text-xs sm:text-sm text-[var(--text-secondary)]">Loading categories...</span>
                    </div>
                  ) : (
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-[var(--border-subtle)] rounded-lg bg-[var(--surface-bg)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
                      style={{ 
                        height: '2.5rem',
                        minHeight: '2.5rem',
                        maxHeight: '2.5rem',
                        overflow: 'hidden'
                      }}
                    >
                      <option value="" style={{ backgroundColor: 'var(--surface-bg)', color: 'var(--text-primary)' }}>Select a category (optional)</option>
                      {categories.length > 0 ? (
                        categories.map((cat) => (
                          <option key={cat._id || cat.id} value={cat.name} style={{ backgroundColor: 'var(--surface-bg)', color: 'var(--text-primary)' }}>
                            {cat.name}
                          </option>
                        ))
                      ) : (
                        <option value="" disabled style={{ backgroundColor: 'var(--surface-bg)', color: 'var(--text-primary)' }}>No categories available</option>
                      )}
                    </select>
                  )}
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-secondary mb-1.5 sm:mb-2">
                    Default Tags
                  </label>
                  <input
                    type="text"
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                    placeholder="tag1, tag2, tag3"
                    className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-[var(--border-subtle)] rounded-lg bg-[var(--surface-bg)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                  />
                </div>
              </div>

              {/* Admin-only: Make this a default template */}
              {isAdmin() && (
                <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <input
                    type="checkbox"
                    id="isDefault"
                    checked={formData.isDefault}
                    onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                    className="w-4 h-4 text-[var(--accent)] border-gray-300 dark:border-gray-600 rounded focus:ring-[var(--accent)] bg-[var(--surface-bg)]"
                    disabled={editingId && !templates.find(t => (t._id || t.id) === editingId)?.isDefault}
                  />
                  <label htmlFor="isDefault" className="text-xs sm:text-sm text-blue-900 dark:text-blue-100 cursor-pointer">
                    <strong>Make this a default template</strong> (available to all users)
                    {editingId && !templates.find(t => (t._id || t.id) === editingId)?.isDefault && (
                      <span className="block text-xs text-blue-700 dark:text-blue-300 mt-1">
                        Note: You cannot convert a custom template to default. Create a new template instead.
                      </span>
                    )}
                  </label>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2">
                <button 
                  onClick={handleSave} 
                  className="btn btn-primary flex-1 text-sm sm:text-base"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <Spinner size="sm" tone="light" className="mr-2" />
                      {editingId ? 'Updating...' : 'Creating...'}
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      {editingId ? 'Update' : 'Create'} Template
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingId(null);
                    setFormData({
                      name: '',
                      title: '',
                      excerpt: '',
                      content: '',
                      category: '',
                      tags: '',
                    });
                  }}
                  className="btn btn-outline text-sm sm:text-base"
                  disabled={submitting}
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default PostTemplates;
