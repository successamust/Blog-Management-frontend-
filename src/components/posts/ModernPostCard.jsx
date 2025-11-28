import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Calendar, Clock, Eye, Heart, User, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { calculateReadingTime, formatReadingTime } from '../../utils/readingTime';
import OptimizedImage from '../common/OptimizedImage';

const ModernPostCard = memo(({ post, featured = false, delay = 0 }) => {
  if (!post || !post.title) {
    return null;
  }

  const postSlugValue = post.slug || post._id || post.id || '';
  const postHref = postSlugValue ? `/posts/${postSlugValue}` : '#';
  const postTitle = post.title || 'Untitled Post';
  const toPlainText = (value = '') => {
    if (typeof value !== 'string') return '';
    return value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  };
  const isLikelyId = (value) => {
    if (typeof value !== 'string') return false;
    const trimmed = value.trim();
    return /^[0-9a-fA-F]{24}$/.test(trimmed);
  };
  const getDisplayLabel = (value) => {
    if (!value) return null;
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed || isLikelyId(trimmed)) {
        return null;
      }
      return trimmed;
    }
    return null;
  };
  const buildExcerpt = () => {
    const sources = [
      toPlainText(post.excerpt),
      toPlainText(post.summary),
      toPlainText(post.metaDescription),
      toPlainText(post.description),
      toPlainText(post.content),
    ].filter(Boolean);

    return sources.length > 0 ? sources[0] : '';
  };
  const truncate = (text, maxLength) => {
    if (!text) return '';
    return text.length > maxLength ? `${text.slice(0, maxLength).trim()}…` : text;
  };
  const postExcerpt = truncate(buildExcerpt(), featured ? 220 : 160);
  const postDate = post.publishedAt || post.createdAt || new Date();
  const postContent = post.content || '';
  const explicitReadingTime =
    post.readingTime ||
    post.readTime ||
    post.estimatedReadingTime ||
    post.read_time ||
    post.meta?.readingTime;
  const readingTimeMinutes = explicitReadingTime
    ? Math.max(1, Math.round(Number(explicitReadingTime)))
    : calculateReadingTime(postContent || buildExcerpt());
  const readingTime = formatReadingTime(readingTimeMinutes);
  const author = post.author || {};
  const formatDisplayName = (value) => {
    if (!value || typeof value !== 'string') return 'Anonymous';
    return value
      .split(' ')
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ');
  };
  const authorName = formatDisplayName(author.username || 'Anonymous');
  const authorAvatar = author.profilePicture || '';
  const categoryLabel = getDisplayLabel(
    typeof post.category === 'string'
      ? post.category
      : post.category?.name
  );
  const sanitizedTags = Array.isArray(post.tags)
    ? post.tags
        .map((tag) => (typeof tag === 'string' ? tag : tag?.name))
        .map((tag) => getDisplayLabel(tag))
        .filter(Boolean)
    : [];

  const toSafeDate = (value) => {
    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? new Date() : value;
    }
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? new Date() : date;
  };

  const postDateObject = toSafeDate(postDate);

  if (featured) {
    const fallbackInitial =
      (!post.featuredImage || post.featuredImage === '') && typeof postTitle === 'string'
        ? postTitle.charAt(0).toUpperCase()
        : null;

    return (
      <motion.article
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.45, delay }}
        className="group h-full"
      >
        <Link to={postHref} className="block h-full" aria-label={`Read ${postTitle}`}>
          <div className="flex h-full flex-col overflow-hidden rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface-bg)] transition-all duration-300 hover:border-[var(--border-subtle)] hover:shadow-lg" style={{ boxShadow: '0 2px 8px var(--shadow-default)' }}>
            <div className="relative w-full">
              <div className="aspect-[16/10] w-full bg-[var(--surface-subtle)]">
                {post.featuredImage ? (
                  <motion.div
                    className="absolute inset-0 h-full w-full"
                    whileHover={{ scale: 1.03 }}
                    transition={{ duration: 0.6 }}
                  >
                    <OptimizedImage
                      src={post.featuredImage}
                      alt={postTitle}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  </motion.div>
                ) : (
                  <div className="flex h-full items-center justify-center text-6xl font-semibold text-[var(--text-muted)]">
                    {fallbackInitial || postTitle.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent p-6">
                <span className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.25em] text-white/80">
                  <Clock className="h-3 w-3" />
                  {readingTime}
                </span>
              </div>
            </div>

            <div className="flex flex-1 flex-col p-6">
              {categoryLabel && (
                <div className="mb-4">
                  <span className="inline-flex items-center rounded-full border border-[var(--border-subtle)] px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-[var(--text-muted)]">
                    {categoryLabel}
                  </span>
                </div>
              )}
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold leading-tight tracking-tight text-[var(--text-primary)] transition-colors group-hover:text-[var(--text-secondary)]">
                {postTitle}
              </h2>
              {postExcerpt && (
                <p className="mt-5 text-base md:text-lg leading-relaxed text-[var(--text-secondary)] line-clamp-4">
                  {postExcerpt}
                </p>
              )}

              <div className="mt-auto flex flex-col gap-6 border-t border-[var(--border-subtle)] pt-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  {authorAvatar ? (
                    <img
                      src={authorAvatar}
                      alt={authorName}
                      className="h-12 w-12 rounded-full object-cover"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        if (e.target.nextSibling) {
                          e.target.nextSibling.style.display = 'flex';
                        }
                      }}
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--text-primary)] text-sm font-semibold text-white">
                      {authorName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-semibold text-[var(--text-primary)] normal-case">{authorName}</p>
                    <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-muted)] whitespace-nowrap">
                      {format(postDateObject, 'MMM d, yyyy')}
                    </p>
                  </div>
                </div>

                <div className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
                  Read more
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            </div>
          </div>
        </Link>
      </motion.article>
    );
  }

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay }}
      className="group"
    >
      <Link to={postHref} className="block" aria-label={`Read ${postTitle}`}>
        <div className="flex flex-col sm:flex-row gap-6 pb-8 border-b border-[var(--border-subtle)] hover:border-[var(--border-subtle)] transition-colors">
          {/* Image */}
          {post.featuredImage && (
            <div className="flex-shrink-0 sm:w-48 sm:h-32 w-full h-48 overflow-hidden rounded-xl">
              <motion.div
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.3 }}
                className="w-full h-full"
              >
                <OptimizedImage
                  src={post.featuredImage}
                  alt={postTitle}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </motion.div>
            </div>
          )}

          {/* Content */}
          <div className="flex-1 min-w-0">
            {categoryLabel && (
              <div className="mb-2">
                <span className="inline-flex items-center rounded-full border border-[var(--border-subtle)] px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-[var(--text-muted)]">
                  {categoryLabel}
                </span>
              </div>
            )}

            {/* Author & Date */}
            <div className="flex items-center space-x-3 mb-3">
              {authorAvatar ? (
                <img
                  src={authorAvatar}
                  alt={authorName}
                  className="w-8 h-8 rounded-full object-cover"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    if (e.target.nextSibling) {
                      e.target.nextSibling.style.display = 'flex';
                    }
                  }}
                />
              ) : null}
              <div className={`w-8 h-8 rounded-full bg-[var(--text-primary)] text-white flex items-center justify-center text-xs font-semibold ${authorAvatar ? 'hidden' : 'flex'}`}>
                {authorName.charAt(0).toUpperCase()}
              </div>
              <div className="flex items-center flex-wrap gap-x-2 gap-y-1 text-[0.7rem] uppercase tracking-[0.14em] text-[var(--text-muted)]">
                <span className="text-sm font-semibold tracking-normal text-[var(--text-primary)] normal-case">{authorName}</span>
                <span>•</span>
                <span className="whitespace-nowrap">{format(postDateObject, 'MMM d, yyyy')}</span>
                <span>•</span>
                <span className="flex items-center">
                  <Clock className="w-3 h-3 mr-1" />
                  {readingTime}
                </span>
              </div>
            </div>

            {/* Title */}
            <h3 className="text-xl md:text-2xl font-bold text-[var(--text-primary)] mb-2 group-hover:text-[var(--text-secondary)] transition-colors leading-tight line-clamp-2">
              {postTitle}
            </h3>

            {/* Excerpt */}
            {postExcerpt && (
              <p className="text-[var(--text-secondary)] mb-4 leading-relaxed line-clamp-3">
                {postExcerpt}
              </p>
            )}

            {/* Tags & Meta */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center space-x-4 text-sm text-[var(--text-muted)]">
                  {sanitizedTags.length > 0 && (
                    <div className="flex items-center space-x-2">
                      {sanitizedTags.slice(0, 2).map((tag) => (
                        <span key={tag} className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              {(typeof post.viewCount === 'number' || Array.isArray(post.likes)) && (
                <div className="flex items-center space-x-4 text-sm text-[var(--text-muted)]">
                  {typeof post.viewCount === 'number' && (
                    <span className="flex items-center">
                      <Eye className="w-4 h-4 mr-1" />
                      {post.viewCount}
                    </span>
                  )}
                  {Array.isArray(post.likes) && (
                    <span className="flex items-center">
                      <Heart className="w-4 h-4 mr-1" />
                      {post.likes.length}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </Link>

      <motion.div
        className="flex items-center text-[var(--text-secondary)] font-semibold opacity-0 group-hover:opacity-100 transition-opacity"
        whileHover={{ x: 5 }}
      >
        Read more
        <ArrowRight className="ml-2 w-4 h-4" />
      </motion.div>
    </motion.article>
  );
});

ModernPostCard.displayName = 'ModernPostCard';

export default ModernPostCard;

