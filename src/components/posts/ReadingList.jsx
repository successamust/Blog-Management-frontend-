import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Plus, X, Lock, Globe, Users } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import toast from 'react-hot-toast';

const ReadingList = ({ post, onAdd, onRemove }) => {
  const { isAuthenticated } = useAuth();
  const [lists, setLists] = useLocalStorage('readingLists', []);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [isPublic, setIsPublic] = useState(false);

  const createList = () => {
    if (!newListName.trim()) {
      toast.error('Please enter a list name');
      return;
    }

    const newList = {
      id: Date.now().toString(),
      name: newListName.trim(),
      isPublic,
      posts: [],
      createdAt: Date.now(),
    };

    setLists(prev => [...prev, newList]);
    setNewListName('');
    setIsPublic(false);
    setShowCreateModal(false);
    toast.success('Reading list created');
  };

  const addToList = (listId) => {
    setLists(prev => prev.map(list => {
      if (list.id === listId) {
        if (list.posts.some(p => p.id === post._id)) {
          toast.error('Post already in this list');
          return list;
        }
        return {
          ...list,
          posts: [...list.posts, { id: post._id, slug: post.slug, title: post.title, addedAt: Date.now() }],
        };
      }
      return list;
    }));
    toast.success('Added to reading list');
    if (onAdd) onAdd(listId);
  };

  const removeFromList = (listId) => {
    setLists(prev => prev.map(list => {
      if (list.id === listId) {
        return {
          ...list,
          posts: list.posts.filter(p => p.id !== post._id),
        };
      }
      return list;
    }));
    toast.success('Removed from reading list');
    if (onRemove) onRemove(listId);
  };

  if (!isAuthenticated) {
    return (
      <div className="p-4 bg-surface-subtle rounded-xl text-center">
        <p className="text-sm text-muted mb-2">Sign in to create reading lists</p>
      </div>
    );
  }

  const isInList = (listId) => {
    const list = lists.find(l => l.id === listId);
    return list?.posts.some(p => p.id === post._id) || false;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-primary flex items-center gap-2">
          <BookOpen className="w-5 h-5" />
          Reading Lists
        </h3>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn btn-outline text-sm"
        >
          <Plus className="w-4 h-4 mr-1" />
          New List
        </button>
      </div>

      {lists.length === 0 ? (
        <div className="p-6 bg-surface-subtle rounded-xl text-center">
          <BookOpen className="w-12 h-12 mx-auto text-muted mb-3 opacity-50" />
          <p className="text-sm text-muted mb-4">No reading lists yet</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn btn-primary"
          >
            Create Your First List
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {lists.map((list) => {
            const inList = isInList(list.id);
            return (
              <motion.div
                key={list.id}
                className="flex items-center justify-between p-3 bg-surface-subtle rounded-lg"
              >
                <div className="flex items-center gap-2 flex-1">
                  {list.isPublic ? (
                    <Globe className="w-4 h-4 text-muted" />
                  ) : (
                    <Lock className="w-4 h-4 text-muted" />
                  )}
                  <span className="text-sm font-medium text-primary">{list.name}</span>
                  <span className="text-xs text-muted">({list.posts.length} posts)</span>
                </div>
                <button
                  onClick={() => inList ? removeFromList(list.id) : addToList(list.id)}
                  className={`text-sm px-3 py-1 rounded-lg transition-colors ${
                    inList
                      ? 'bg-rose-100 text-rose-600 hover:bg-rose-200'
                      : 'bg-[var(--accent)]/10 text-[var(--accent)] hover:bg-[var(--accent)]/20'
                  }`}
                >
                  {inList ? 'Remove' : 'Add'}
                </button>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Create List Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[var(--surface-bg)] rounded-xl p-6 max-w-md w-full"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-primary">Create Reading List</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 hover:bg-[var(--surface-subtle)] rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-secondary mb-2">
                  List Name
                </label>
                <input
                  type="text"
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  placeholder="e.g., My Favorites, To Read Later"
                  className="w-full px-4 py-2 border border-[var(--border-subtle)] rounded-lg focus:ring-2 focus:ring-[var(--accent)]"
                  autoFocus
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isPublic"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="w-4 h-4"
                />
                <label htmlFor="isPublic" className="text-sm text-secondary flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  Make this list public
                </label>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={createList}
                  className="btn btn-primary flex-1"
                >
                  Create List
                </button>
                <button
                  onClick={() => setShowCreateModal(false)}
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

export default ReadingList;

