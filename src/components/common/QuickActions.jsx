import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MoreVertical, Share2, Bookmark, Copy, Download, Edit, Trash2,
  ExternalLink, QrCode, Maximize
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import QRCodeGenerator from './QRCodeGenerator';
import { exportPost } from '../../utils/exportPost';
import toast from 'react-hot-toast';

const QuickActions = ({ post, onEdit, onDelete, onShare, onBookmark, onFullscreen }) => {
  const { user, isAuthenticated, isAdmin } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const menuRef = React.useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleCopyLink = async () => {
    // Use preview URL for sharing to ensure proper meta tags for social media previews
    const url = `${window.location.origin}/preview/posts/${post.slug || post._id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied to clipboard');
      setIsOpen(false);
    } catch (error) {
      toast.error('Failed to copy link');
    }
  };

  const handleExport = (format) => {
    exportPost(post, format);
    toast.success(`Exported as ${format.toUpperCase()}`);
    setIsOpen(false);
  };

  const isAuthor = user?._id === post?.author?._id;
  const canEdit = isAuthor || isAdmin();

  const actions = [
    onFullscreen && {
      icon: Maximize,
      label: 'Fullscreen',
      onClick: () => {
        onFullscreen();
        setIsOpen(false);
      },
    },
    onShare && {
      icon: Share2,
      label: 'Share',
      onClick: () => {
        onShare();
        setIsOpen(false);
      },
    },
    onBookmark && isAuthenticated && {
      icon: Bookmark,
      label: 'Bookmark',
      onClick: () => {
        onBookmark();
        setIsOpen(false);
      },
    },
    {
      icon: Copy,
      label: 'Copy Link',
      onClick: handleCopyLink,
    },
    {
      icon: QrCode,
      label: 'QR Code',
      onClick: () => {
        setShowQR(true);
        setIsOpen(false);
      },
    },
    {
      icon: Download,
      label: 'Export',
      submenu: [
        { label: 'Markdown', onClick: () => handleExport('markdown') },
        { label: 'JSON', onClick: () => handleExport('json') },
        { label: 'PDF', onClick: () => handleExport('pdf') },
      ],
    },
    {
      icon: ExternalLink,
      label: 'Open in New Tab',
      onClick: () => {
        window.open(`/posts/${post.slug || post._id}`, '_blank');
        setIsOpen(false);
      },
    },
    canEdit && onEdit && {
      icon: Edit,
      label: 'Edit',
      onClick: () => {
        onEdit();
        setIsOpen(false);
      },
    },
    canEdit && onDelete && {
      icon: Trash2,
      label: 'Delete',
      onClick: () => {
        if (window.confirm('Are you sure you want to delete this post?')) {
          onDelete();
        }
        setIsOpen(false);
      },
      danger: true,
    },
  ].filter(Boolean);

  return (
    <>
      <div className="relative" ref={menuRef}>
        <motion.button
          onClick={() => setIsOpen(!isOpen)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="p-2 hover:bg-surface-subtle rounded-lg transition-colors"
          aria-label="More options"
        >
          <MoreVertical className="w-5 h-5" />
        </motion.button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              className="absolute right-0 top-full mt-2 w-48 bg-[var(--surface-bg)] rounded-xl shadow-lg border border-[var(--border-subtle)] z-50 overflow-hidden"
            >
              {actions.map((action, index) => {
                if (action.submenu) {
                  return (
                    <div key={index} className="group">
                      <div className="px-4 py-2 text-sm text-secondary">
                        {action.label}
                      </div>
                      {action.submenu.map((sub, subIndex) => (
                        <button
                          key={subIndex}
                          onClick={sub.onClick}
                          className="w-full text-left px-6 py-2 text-sm text-secondary hover:bg-surface-subtle transition-colors"
                        >
                          {sub.label}
                        </button>
                      ))}
                    </div>
                  );
                }

                const Icon = action.icon;
                return (
                  <button
                    key={index}
                    onClick={action.onClick}
                    className={`w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors ${
                      action.danger
                        ? 'text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20'
                        : 'text-secondary hover:bg-surface-subtle'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{action.label}</span>
                  </button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* QR Code Modal */}
      {showQR && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[var(--surface-bg)] rounded-xl p-6 max-w-md w-full"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-primary">QR Code</h3>
              <button
                onClick={() => setShowQR(false)}
                className="p-1 hover:bg-[var(--surface-subtle)] rounded"
              >
                ×
              </button>
            </div>
            <QRCodeGenerator
              url={`${window.location.origin}/preview/posts/${post.slug || post._id}`}
              title={post.title}
            />
          </motion.div>
        </div>
      )}
    </>
  );
};

export default QuickActions;

