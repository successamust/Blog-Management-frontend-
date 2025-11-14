import React from 'react';
import PropTypes from 'prop-types';

const VARIANTS = {
  default: {
    container: 'font-semibold text-base leading-none',
    gap: 'gap-[0.25em]',
    left: 'tracking-[0.18em]',
    accent: 'tracking-[0.22em] text-[var(--accent)]',
    right: 'tracking-[0.18em]',
  },
  navigation: {
    container: 'font-bold text-lg leading-none',
    gap: 'gap-[0.3em]',
    left: 'tracking-[0.22em]',
    accent: 'tracking-[0.28em] text-[var(--accent)]',
    right: 'tracking-[0.22em]',
  },
  hero: {
    container: 'font-display font-bold text-5xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl leading-[0.9]',
    gap: 'gap-[0.45em] sm:gap-[0.55em]',
    left: 'tracking-[0.28em] text-slate-900',
    accent: 'tracking-[0.3em] text-transparent bg-clip-text bg-gradient-to-r from-[var(--accent)] via-[#189112] to-[var(--accent-hover)] drop-shadow-[0_12px_32px_rgba(26,137,23,0.25)]',
    right: 'tracking-[0.28em] text-slate-900',
  },
  footer: {
    container: 'font-semibold text-sm leading-none tracking-[0.24em]',
    gap: 'gap-[0.22em]',
    left: 'tracking-[0.2em]',
    accent: 'tracking-[0.24em] text-[var(--accent)]',
    right: 'tracking-[0.2em]',
  },
};

const BrandWordmark = ({ variant = 'default', className = '' }) => {
  const config = VARIANTS[variant] || VARIANTS.default;

  return (
    <span className={`inline-flex items-baseline ${className}`}>
      <span
        aria-hidden="true"
        className={`inline-flex items-baseline uppercase ${config.container} ${config.gap}`}
      >
        <span className={`inline-block ${config.left}`}>NE</span>
        <span className={`inline-block ${config.accent}`}>X</span>
        <span className={`inline-block ${config.right}`}>US</span>
      </span>
      <span className="sr-only">Nexus</span>
    </span>
  );
};

BrandWordmark.propTypes = {
  variant: PropTypes.oneOf(['default', 'navigation', 'hero', 'footer']),
  className: PropTypes.string,
};

export default BrandWordmark;

