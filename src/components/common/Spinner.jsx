import React from 'react';

const sizeClasses = {
  xs: 'h-4 w-4 border-2',
  sm: 'h-5 w-5 border-2',
  md: 'h-10 w-10 border-[3px]',
  lg: 'h-12 w-12 border-[3px]',
  xl: 'h-16 w-16 border-4',
  '2xl': 'h-24 w-24 border-4',
  '3xl': 'h-32 w-32 border-4',
};

const toneClasses = {
  accent: {
    track: 'border-[var(--border-subtle)]/80',
    indicator: 'border-t-[var(--accent)]',
  },
  light: {
    track: 'border-white/30',
    indicator: 'border-t-white',
  },
  neutral: {
    track: 'border-slate-200',
    indicator: 'border-t-slate-400',
  },
  warning: {
    track: 'border-amber-200',
    indicator: 'border-t-amber-500',
  },
};

const Spinner = ({ size = 'md', tone = 'accent', className = '', label = 'Loading…' }) => {
  const sizeClass = sizeClasses[size] || sizeClasses.md;
  const toneConfig = toneClasses[tone] || toneClasses.accent;
  const classes = [
    'inline-block animate-spin rounded-full',
    toneConfig.track,
    toneConfig.indicator,
    sizeClass,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span
      role="status"
      aria-label={label}
      className={classes}
    />
  );
};

export default Spinner;

