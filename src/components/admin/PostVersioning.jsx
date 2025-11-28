import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { History, RotateCcw, Eye, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import toast from 'react-hot-toast';

const PostVersioning = ({ postId, currentContent, onRestore }) => {
  const [versions, setVersions] = useLocalStorage(`postVersions_${postId}`, []);
  const [selectedVersion, setSelectedVersion] = useState(null);

  useEffect(() => {
    // Auto-save version when content changes significantly
    if (currentContent && versions.length === 0) {
      saveVersion(currentContent, 'Initial version');
    }
  }, []);

  const saveVersion = (content, label = 'Auto-saved') => {
    const newVersion = {
      id: Date.now().toString(),
      content,
      label,
      timestamp: Date.now(),
      author: 'Current User', // You can get this from auth context
    };

    setVersions(prev => {
      // Keep only last 20 versions
      const updated = [newVersion, ...prev].slice(0, 20);
      return updated;
    });

    toast.success('Version saved');
  };

  const restoreVersion = (version) => {
    if (window.confirm('Restore this version? Current changes will be lost.')) {
      if (onRestore) {
        onRestore(version.content);
      }
      toast.success('Version restored');
    }
  };

  const deleteVersion = (versionId) => {
    setVersions(prev => prev.filter(v => v.id !== versionId));
    toast.success('Version deleted');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-primary flex items-center gap-2">
          <History className="w-5 h-5" />
          Version History
        </h3>
        <button
          onClick={() => saveVersion(currentContent, 'Manual save')}
          className="btn btn-outline text-sm"
        >
          Save Current Version
        </button>
      </div>

      {versions.length === 0 ? (
        <div className="p-6 bg-surface-subtle rounded-xl text-center">
          <History className="w-12 h-12 mx-auto text-muted mb-3 opacity-50" />
          <p className="text-sm text-muted">No versions saved yet</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {versions.map((version, index) => (
            <motion.div
              key={version.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`p-4 bg-surface-subtle rounded-lg border-2 transition-colors ${
                selectedVersion?.id === version.id
                  ? 'border-[var(--accent)]'
                  : 'border-transparent hover:border-[var(--border-subtle)]'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-primary">{version.label}</span>
                    {index === 0 && (
                      <span className="text-xs px-2 py-0.5 bg-[var(--accent)]/10 text-[var(--accent)] rounded">
                        Latest
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted">
                    <Calendar className="w-3 h-3" />
                    <span>{format(new Date(version.timestamp), 'PPp')}</span>
                    <span>•</span>
                    <span>{version.author}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-3">
                <button
                  onClick={() => setSelectedVersion(version)}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm bg-surface hover:bg-surface-subtle rounded-lg transition-colors"
                >
                  <Eye className="w-4 h-4" />
                  Preview
                </button>
                <button
                  onClick={() => restoreVersion(version)}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm bg-[var(--accent)]/10 text-[var(--accent)] hover:bg-[var(--accent)]/20 rounded-lg transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  Restore
                </button>
                {index > 0 && (
                  <button
                    onClick={() => deleteVersion(version.id)}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  >
                    Delete
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Version Preview Modal */}
      {selectedVersion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[var(--surface-bg)] dark:bg-[var(--surface-bg)] rounded-xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-primary">
                {selectedVersion.label}
              </h3>
              <button
                onClick={() => setSelectedVersion(null)}
                className="p-1 hover:bg-[var(--surface-subtle)] rounded"
              >
                ×
              </button>
            </div>
            <div className="prose max-w-none">
              <div dangerouslySetInnerHTML={{ __html: selectedVersion.content }} />
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default PostVersioning;

