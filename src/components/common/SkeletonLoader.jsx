import React from 'react';

const SkeletonLoader = ({ variant = 'post', count = 1, className = '' }) => {
  const variants = {
    post: (
      <div className="surface-card p-6 space-y-4">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 bg-[var(--border-subtle)] rounded-lg animate-pulse flex-shrink-0" />
          <div className="flex-1 space-y-3">
            <div className="h-5 bg-[var(--border-subtle)] rounded animate-pulse w-3/4" />
            <div className="h-4 bg-[var(--border-subtle)] rounded animate-pulse w-full" />
            <div className="h-4 bg-[var(--border-subtle)] rounded animate-pulse w-5/6" />
            <div className="flex items-center gap-4 mt-4">
              <div className="h-3 bg-[var(--border-subtle)] rounded animate-pulse w-20" />
              <div className="h-3 bg-[var(--border-subtle)] rounded animate-pulse w-16" />
              <div className="h-3 bg-[var(--border-subtle)] rounded animate-pulse w-24" />
            </div>
          </div>
        </div>
      </div>
    ),
    'post-card': (
      <div className="surface-card p-6 space-y-4">
        <div className="h-48 bg-[var(--border-subtle)] rounded-xl animate-pulse" />
        <div className="space-y-3">
          <div className="h-6 bg-[var(--border-subtle)] rounded animate-pulse w-3/4" />
          <div className="h-4 bg-[var(--border-subtle)] rounded animate-pulse w-full" />
          <div className="h-4 bg-[var(--border-subtle)] rounded animate-pulse w-5/6" />
          <div className="flex items-center gap-4 mt-4">
            <div className="h-3 bg-[var(--border-subtle)] rounded animate-pulse w-20" />
            <div className="h-3 bg-[var(--border-subtle)] rounded animate-pulse w-16" />
          </div>
        </div>
      </div>
    ),
    comment: (
      <div className="surface-card p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-[var(--border-subtle)] rounded-full animate-pulse flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-[var(--border-subtle)] rounded animate-pulse w-1/3" />
            <div className="h-4 bg-[var(--border-subtle)] rounded animate-pulse w-full" />
            <div className="h-4 bg-[var(--border-subtle)] rounded animate-pulse w-2/3" />
          </div>
        </div>
      </div>
    ),
    list: (
      <div className="surface-card p-4 space-y-3">
        <div className="h-5 bg-[var(--border-subtle)] rounded animate-pulse w-3/4" />
        <div className="h-4 bg-[var(--border-subtle)] rounded animate-pulse w-full" />
        <div className="h-4 bg-[var(--border-subtle)] rounded animate-pulse w-5/6" />
      </div>
    ),
    category: (
      <div className="surface-card p-6 space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-[var(--border-subtle)] rounded-lg animate-pulse flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-5 bg-[var(--border-subtle)] rounded animate-pulse w-1/2" />
            <div className="h-4 bg-[var(--border-subtle)] rounded animate-pulse w-3/4" />
          </div>
        </div>
      </div>
    ),
    stat: (
      <div className="surface-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-4 bg-[var(--border-subtle)] rounded animate-pulse w-24" />
          <div className="w-10 h-10 bg-[var(--border-subtle)] rounded-xl animate-pulse" />
        </div>
        <div className="h-8 bg-[var(--border-subtle)] rounded animate-pulse w-16" />
        <div className="h-3 bg-[var(--border-subtle)] rounded animate-pulse w-32" />
      </div>
    ),
  };

  const skeleton = variants[variant] || variants.post;

  if (count === 1) {
    return <div className={className || ''}>{skeleton}</div>;
  }

  // If className is provided and contains grid classes, use it as the container
  if (className && (className.includes('grid') || className.includes('flex'))) {
    return (
      <div className={className}>
        {Array.from({ length: count }).map((_, index) => (
          <div key={index}>{skeleton}</div>
        ))}
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className || ''}`}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index}>{skeleton}</div>
      ))}
    </div>
  );
};

export default SkeletonLoader;

