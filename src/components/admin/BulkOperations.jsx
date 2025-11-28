import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Trash2, Edit, Tag, Folder, Archive, CheckSquare, Square } from 'lucide-react';
import toast from 'react-hot-toast';

const BulkOperations = ({ selectedPosts, onBulkDelete, onBulkUpdate, categories = [] }) => {
  const [showMenu, setShowMenu] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('published');

  const handleBulkDelete = () => {
    if (window.confirm(`Are you sure you want to delete ${selectedPosts.length} post(s)?`)) {
      onBulkDelete(selectedPosts);
      setShowMenu(false);
    }
  };

  const handleBulkCategory = () => {
    if (!selectedCategory) {
      toast.error('Please select a category');
      return;
    }
    onBulkUpdate(selectedPosts, { category: selectedCategory });
    setShowCategoryModal(false);
    setShowMenu(false);
    toast.success(`Updated ${selectedPosts.length} post(s)`);
  };

  const handleBulkStatus = () => {
    const updates = { isPublished: selectedStatus === 'published' };
    if (selectedStatus === 'scheduled') {
      // For scheduled, we'd need a date picker - for now just set as draft
      updates.isPublished = false;
    }
    onBulkUpdate(selectedPosts, updates);
    setShowStatusModal(false);
    setShowMenu(false);
    toast.success(`Updated ${selectedPosts.length} post(s)`);
  };

  if (selectedPosts.length === 0) return null;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-40"
      >
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-primary">
              {selectedPosts.length} post{selectedPosts.length !== 1 ? 's' : ''} selected
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="btn btn-primary text-sm"
              >
                Bulk Actions
              </button>
            </div>
          </div>

          {showMenu && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-2"
            >
              <button
                onClick={() => setShowCategoryModal(true)}
                className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-left"
              >
                <Folder className="w-4 h-4" />
                Change Category
              </button>
              <button
                onClick={() => setShowStatusModal(true)}
                className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-left"
              >
                <Archive className="w-4 h-4" />
                Change Status
              </button>
              <button
                onClick={handleBulkDelete}
                className="w-full flex items-center gap-2 px-4 py-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-left"
              >
                <Trash2 className="w-4 h-4" />
                Delete Selected
              </button>
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full"
          >
            <h3 className="text-xl font-bold text-primary mb-4">Change Category</h3>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg mb-4"
            >
              <option value="">Select Category</option>
              {categories.map(cat => (
                <option key={cat._id} value={cat._id}>{cat.name}</option>
              ))}
            </select>
            <div className="flex gap-2">
              <button onClick={handleBulkCategory} className="btn btn-primary flex-1">
                Update
              </button>
              <button onClick={() => setShowCategoryModal(false)} className="btn btn-outline">
                Cancel
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Status Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full"
          >
            <h3 className="text-xl font-bold text-primary mb-4">Change Status</h3>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg mb-4"
            >
              <option value="published">Published</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </select>
            <div className="flex gap-2">
              <button onClick={handleBulkStatus} className="btn btn-primary flex-1">
                Update
              </button>
              <button onClick={() => setShowStatusModal(false)} className="btn btn-outline">
                Cancel
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
};

export default BulkOperations;

