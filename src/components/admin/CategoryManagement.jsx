import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useParams, useNavigate } from 'react-router-dom';
import { Folder, Plus, Edit, Trash2, Search, Eye } from 'lucide-react';
import { categoriesAPI } from '../../services/api';
import toast from 'react-hot-toast';
import SkeletonLoader from '../common/SkeletonLoader';
import Spinner from '../common/Spinner';

const CategoryManagement = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await categoriesAPI.getAll();
      const categoriesData =
        response.data?.categories ||
        response.data?.data ||
        (Array.isArray(response.data) ? response.data : []) ||
        [];
      setCategories(Array.isArray(categoriesData) ? categoriesData : []);
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this category?')) {
      return;
    }

    try {
      await categoriesAPI.delete(id);
      toast.success('Category deleted successfully');
      fetchCategories();
    } catch (error) {
      toast.error('Failed to delete category');
    }
  };

  const filteredCategories = categories.filter((category) =>
    category.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    category.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <SkeletonLoader variant="category" count={6} />
    );
  }

  return (
    <div className="space-y-6">
      <Routes>
        <Route index element={<CategoryList categories={filteredCategories} searchQuery={searchQuery} setSearchQuery={setSearchQuery} onDelete={handleDelete} />} />
        <Route path="create" element={<CreateCategory onSuccess={fetchCategories} />} />
        <Route path="edit/:id" element={<EditCategory onSuccess={fetchCategories} />} />
      </Routes>
    </div>
  );
};

const CategoryList = ({ categories, searchQuery, setSearchQuery, onDelete }) => {
  const hasCategories = categories.length > 0;

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-[var(--text-primary)]">Categories Management</h2>
        <Link
          to="/admin/categories/create"
          className="btn btn-primary !w-auto shadow-[0_12px_28px_rgba(26,137,23,0.2)]"
        >
          <Plus className="w-4 h-4" />
          <span>Create Category</span>
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
            placeholder="Search categories..."
            className="w-full pl-10 pr-4 py-2 border border-[var(--border-subtle)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent bg-[var(--surface-bg)] text-[var(--text-primary)] placeholder-[var(--text-muted)]"
          />
        </div>
      </div>

      {/* Categories List */}
      {hasCategories ? (
        <>
          <div className="hidden md:block bg-[var(--surface-bg)] rounded-xl shadow-sm border border-[var(--border-subtle)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-[var(--border-subtle)]">
                <thead className="bg-[var(--surface-subtle)]">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                      Slug
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-[var(--surface-bg)] divide-y divide-[var(--border-subtle)]">
                  {categories.map((category) => (
                    <tr key={category._id} className="hover:bg-[var(--surface-subtle)]">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-[var(--text-primary)]">{category.name}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-[var(--text-secondary)] line-clamp-2">
                          {category.description || 'No description'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-[var(--text-secondary)]">{category.slug || '—'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <Link
                          to={`/categories/${category.slug}`}
                          className="text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors"
                        >
                          <Eye className="w-4 h-4 inline" />
                        </Link>
                        <Link
                          to={`/admin/categories/edit/${category._id}`}
                          className="text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors"
                        >
                          <Edit className="w-4 h-4 inline" />
                        </Link>
                        <button
                          onClick={() => onDelete(category._id)}
                          className="text-red-600 hover:text-red-900 transition-colors"
                        >
                          <Trash2 className="w-4 h-4 inline" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="md:hidden space-y-4">
            {categories.map((category) => (
              <div
                key={category._id}
                className="bg-[var(--surface-bg)] rounded-xl shadow-sm border border-[var(--border-subtle)] p-4 space-y-3"
              >
                <div className="flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-base font-semibold text-[var(--text-primary)]">{category.name}</p>
                      {category.description && (
                        <p className="text-sm text-[var(--text-secondary)] line-clamp-3">{category.description}</p>
                      )}
                    </div>
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-[var(--surface-subtle)] text-[var(--text-secondary)]">
                      {category.slug || '—'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Link
                    to={`/categories/${category.slug}`}
                    className="btn btn-outline flex-1 justify-center"
                  >
                    <Eye className="w-4 h-4" />
                    View
                  </Link>
                  <Link
                    to={`/admin/categories/edit/${category._id}`}
                    className="btn btn-primary flex-1 justify-center"
                  >
                    <Edit className="w-4 h-4" />
                    Edit
                  </Link>
                  <button
                    onClick={() => onDelete(category._id)}
                    className="btn-icon-square border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                    aria-label="Delete category"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="bg-[var(--surface-bg)] rounded-xl shadow-sm border border-[var(--border-subtle)]">
          <div className="text-center py-12 text-[var(--text-secondary)]">
            <Folder className="w-12 h-12 mx-auto mb-4 text-[var(--text-muted)]" />
            <p>No categories found</p>
          </div>
        </div>
      )}
    </>
  );
};

const CreateCategory = ({ onSuccess }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await categoriesAPI.create(formData);
      toast.success('Category created successfully');
      onSuccess();
      navigate('/admin/categories');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create category');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-[var(--surface-bg)] rounded-xl shadow-sm border border-[var(--border-subtle)] p-6">
      <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-6">Create New Category</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Name</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 border border-[var(--border-subtle)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent bg-[var(--surface-bg)] text-[var(--text-primary)]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-secondary mb-2">Description</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows="4"
            className="w-full px-4 py-2 border border-[var(--border-subtle)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent bg-[var(--surface-bg)] text-[var(--text-primary)]"
          />
        </div>

        <div className="flex justify-end space-x-4">
          <Link
            to="/admin/categories"
            className="btn btn-outline"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_12px_26px_rgba(26,137,23,0.2)]"
          >
            {submitting ? 'Creating...' : 'Create Category'}
          </button>
        </div>
      </form>
    </div>
  );
};

const EditCategory = ({ onSuccess }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchCategory();
  }, [id]);

  const fetchCategory = async () => {
    try {
      setLoading(true);
      const response = await categoriesAPI.getAll();
      const categoriesData =
        response.data?.categories ||
        response.data?.data ||
        (Array.isArray(response.data) ? response.data : []) ||
        [];
      const category = categoriesData.find((c) => c._id === id);
      
      if (!category) {
        toast.error('Category not found');
        navigate('/admin/categories');
        return;
      }

      setFormData({
        name: category.name || '',
        description: category.description || '',
      });
    } catch (error) {
      console.error('Error fetching category:', error);
      toast.error('Failed to load category');
      navigate('/admin/categories');
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await categoriesAPI.update(id, formData);
      toast.success('Category updated successfully');
      onSuccess();
      navigate('/admin/categories');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update category');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SkeletonLoader variant="category" count={1} />
    );
  }

  return (
    <div className="surface-card p-6">
      <h2 className="text-2xl font-bold text-primary mb-6">Edit Category</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-secondary mb-2">Name</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 border border-[var(--border-subtle)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent bg-[var(--surface-bg)] text-[var(--text-primary)]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-secondary mb-2">Description</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows="4"
            className="w-full px-4 py-2 border border-[var(--border-subtle)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent bg-[var(--surface-bg)] text-[var(--text-primary)]"
          />
        </div>

        <div className="flex justify-end space-x-4">
          <Link
            to="/admin/categories"
            className="btn btn-outline"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_12px_26px_rgba(26,137,23,0.2)]"
          >
            {submitting ? 'Updating...' : 'Update Category'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CategoryManagement;

