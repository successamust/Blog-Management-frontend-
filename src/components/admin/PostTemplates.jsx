import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, Plus, Trash2, Edit, Save, X } from 'lucide-react';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import toast from 'react-hot-toast';

const PostTemplates = ({ onSelectTemplate }) => {
  const [templates, setTemplates] = useLocalStorage('postTemplates', []);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    title: '',
    excerpt: '',
    content: '',
    category: '',
    tags: '',
  });

  const handleSave = () => {
    if (!formData.name.trim()) {
      toast.error('Please enter a template name');
      return;
    }

    if (editingId) {
      setTemplates(prev => prev.map(t => 
        t.id === editingId ? { ...t, ...formData, updatedAt: Date.now() } : t
      ));
      toast.success('Template updated');
    } else {
      const newTemplate = {
        id: Date.now().toString(),
        ...formData,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      setTemplates(prev => [...prev, newTemplate]);
      toast.success('Template created');
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
    });
  };

  const handleDelete = (id) => {
    if (window.confirm('Delete this template?')) {
      setTemplates(prev => prev.filter(t => t.id !== id));
      toast.success('Template deleted');
    }
  };

  const handleEdit = (template) => {
    setFormData({
      name: template.name,
      title: template.title || '',
      excerpt: template.excerpt || '',
      content: template.content || '',
      category: template.category || '',
      tags: template.tags || '',
    });
    setEditingId(template.id);
    setShowCreateModal(true);
  };

  const handleSelect = (template) => {
    if (onSelectTemplate) {
      onSelectTemplate(template);
    }
    setShowCreateModal(false);
    toast.success(`Template "${template.name}" applied`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-primary flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Post Templates
        </h3>
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
            });
            setShowCreateModal(true);
          }}
          className="btn btn-outline text-sm"
        >
          <Plus className="w-4 h-4 mr-1" />
          New Template
        </button>
      </div>

      {templates.length === 0 ? (
        <div className="p-6 bg-surface-subtle rounded-xl text-center">
          <FileText className="w-12 h-12 mx-auto text-muted mb-3 opacity-50" />
          <p className="text-sm text-muted mb-4">No templates yet</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn btn-primary"
          >
            Create Your First Template
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.map((template) => (
            <motion.div
              key={template.id}
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
                    onClick={() => handleDelete(template.id)}
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
      )}

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-primary">
                {editingId ? 'Edit Template' : 'Create Template'}
              </h3>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingId(null);
                }}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-secondary mb-2">
                  Template Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Tech Review Template"
                  className="w-full px-4 py-2 border border-[var(--border-subtle)] rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary mb-2">
                  Default Title
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Post title..."
                  className="w-full px-4 py-2 border border-[var(--border-subtle)] rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary mb-2">
                  Default Excerpt
                </label>
                <textarea
                  value={formData.excerpt}
                  onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                  placeholder="Post excerpt..."
                  rows="2"
                  className="w-full px-4 py-2 border border-[var(--border-subtle)] rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary mb-2">
                  Default Content
                </label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Post content (HTML or Markdown)..."
                  rows="6"
                  className="w-full px-4 py-2 border border-[var(--border-subtle)] rounded-lg font-mono text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">
                    Default Category
                  </label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="Category..."
                    className="w-full px-4 py-2 border border-[var(--border-subtle)] rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">
                    Default Tags
                  </label>
                  <input
                    type="text"
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                    placeholder="tag1, tag2, tag3"
                    className="w-full px-4 py-2 border border-[var(--border-subtle)] rounded-lg"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <button onClick={handleSave} className="btn btn-primary flex-1">
                  <Save className="w-4 h-4 mr-2" />
                  {editingId ? 'Update' : 'Create'} Template
                </button>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingId(null);
                  }}
                  className="btn btn-outline"
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

