import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Minus, Maximize, Type, Plus, Minus as MinusIcon, AlignLeft, AlignJustify } from 'lucide-react';
import DOMPurify from 'dompurify';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const FullscreenReader = ({ post, isOpen, onClose }) => {
  const [fontSize, setFontSize] = useState(18);
  const [lineHeight, setLineHeight] = useState(1.6);
  const [maxWidth, setMaxWidth] = useState(680);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape' && !document.fullscreenElement) {
      onClose();
    }
  };

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen]);

  if (!isOpen || !post) return null;

  const isHTML = /<[a-z][\s\S]*>/i.test(post.content);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-[var(--page-bg)]"
      >
        {/* Header Controls */}
        <div className="absolute top-0 left-0 right-0 z-10 bg-[var(--surface-bg)]/95 backdrop-blur-sm border-b border-[var(--border-subtle)] px-3 py-3 sm:px-4 sm:py-4">
          <div className="max-w-4xl mx-auto flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <h2 className="text-base sm:text-lg font-semibold text-primary truncate">
                {post.title}
              </h2>
            </div>
            
            <div className="flex flex-wrap items-center gap-2 justify-end">
              {/* Font Size */}
              <div className="flex items-center gap-2 bg-[var(--surface-subtle)] rounded-lg px-2 py-1">
                <button
                  onClick={() => setFontSize(p => Math.max(12, p - 2))}
                  className="p-1 hover:bg-[var(--surface-bg)] rounded"
                  aria-label="Decrease font size"
                >
                  <MinusIcon className="w-4 h-4" />
                </button>
                <span className="text-sm text-secondary w-12 text-center">{fontSize}px</span>
                <button
                  onClick={() => setFontSize(p => Math.min(24, p + 2))}
                  className="p-1 hover:bg-[var(--surface-bg)] rounded"
                  aria-label="Increase font size"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Line Height */}
              <div className="flex items-center gap-2 bg-[var(--surface-subtle)] rounded-lg px-2 py-1">
                <button
                  onClick={() => setLineHeight(p => Math.max(1.2, p - 0.1))}
                  className="p-1 hover:bg-[var(--surface-bg)] rounded"
                  aria-label="Decrease line height"
                >
                  <MinusIcon className="w-4 h-4" />
                </button>
                <span className="text-sm text-secondary w-12 text-center">{lineHeight.toFixed(1)}</span>
                <button
                  onClick={() => setLineHeight(p => Math.min(2.5, p + 0.1))}
                  className="p-1 hover:bg-[var(--surface-bg)] rounded"
                  aria-label="Increase line height"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Max Width */}
              <div className="flex items-center gap-2 bg-[var(--surface-subtle)] rounded-lg px-2 py-1">
                <button
                  onClick={() => setMaxWidth(p => Math.max(400, p - 40))}
                  className="p-1 hover:bg-[var(--surface-bg)] rounded"
                  aria-label="Decrease width"
                >
                  <AlignLeft className="w-4 h-4" />
                </button>
                <span className="text-sm text-secondary w-16 text-center">{maxWidth}px</span>
                <button
                  onClick={() => setMaxWidth(p => Math.min(1200, p + 40))}
                  className="p-1 hover:bg-[var(--surface-bg)] rounded"
                  aria-label="Increase width"
                >
                  <AlignJustify className="w-4 h-4" />
                </button>
              </div>

              {/* Fullscreen Toggle */}
              <button
                onClick={toggleFullscreen}
                className="p-2 hover:bg-[var(--surface-subtle)] rounded-lg transition-colors"
                aria-label="Toggle fullscreen"
              >
                {isFullscreen ? (
                  <Minus className="w-5 h-5" />
                ) : (
                  <Maximize className="w-5 h-5" />
                )}
              </button>

              {/* Close */}
              <button
                onClick={onClose}
                className="p-2 hover:bg-[var(--surface-subtle)] rounded-lg transition-colors"
                aria-label="Close reader"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="pt-40 sm:pt-24 pb-8 h-full overflow-y-auto px-3 sm:px-4">
          <div
            className="mx-auto prose prose-lg dark:prose-invert"
            style={{
              fontSize: `${fontSize}px`,
              lineHeight: lineHeight,
              maxWidth: `${maxWidth}px`,
            }}
          >
            {isHTML ? (
              <div
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(post.content, {
                    ALLOWED_TAGS: [
                      'p', 'br', 'strong', 'em', 'u', 's',
                      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
                      'ul', 'ol', 'li', 'blockquote', 'code', 'pre',
                      'a', 'img', 'video', 'div', 'span',
                      'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
                    ],
                    ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'style'],
                  }),
                }}
              />
            ) : (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {post.content}
              </ReactMarkdown>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default FullscreenReader;

