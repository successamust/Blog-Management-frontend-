import React from 'react';
import { motion } from 'framer-motion';

/**
 * Signature Nexus landing art — geometric “portal” + editorial lattice.
 * Pure SVG, no stock imagery; animates subtly for a flagship feel.
 */
const NexusHeroVisual = ({ className = '', mode = 'card' }) => {
  if (mode === 'background') {
    return (
      <div
        className={`pointer-events-none absolute inset-0 z-[1] overflow-hidden text-[var(--accent)] ${className}`}
        aria-hidden
      >
        {/* Theme-aware glows (fixed hex greens disappear on dark page-bg) */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_45%,color-mix(in_oklab,var(--accent)_28%,transparent)_0%,transparent_62%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_18%,color-mix(in_oklab,var(--accent)_22%,transparent)_0%,transparent_45%)] opacity-90 dark:opacity-100" />
        <motion.div
          className="absolute left-1/2 top-1/2 h-[240%] w-[240%] -translate-x-1/2 -translate-y-1/2 dark:mix-blend-screen"
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.05, ease: [0.22, 1, 0.36, 1] }}
        >
          <svg
            viewBox="0 0 440 360"
            className="h-full w-full"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="nx-bg-arc-a" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.95" />
                <stop offset="55%" stopColor="var(--accent)" stopOpacity="0.55" />
                <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.22" />
              </linearGradient>
              <linearGradient id="nx-bg-arc-b" x1="100%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.45" />
                <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.12" />
              </linearGradient>
              <radialGradient id="nx-bg-glow" cx="50%" cy="35%" r="70%">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.28" />
                <stop offset="100%" stopColor="transparent" />
              </radialGradient>
            </defs>

            <rect width="440" height="360" fill="url(#nx-bg-glow)" />

            <g opacity="0.17" stroke="currentColor" className="text-[var(--text-primary)]">
              <line x1="32" y1="48" x2="408" y2="48" strokeWidth="0.5" />
              <line x1="32" y1="120" x2="408" y2="120" strokeWidth="0.5" />
              <line x1="32" y1="192" x2="408" y2="192" strokeWidth="0.5" />
              <line x1="32" y1="264" x2="408" y2="264" strokeWidth="0.5" />
              <line x1="88" y1="24" x2="88" y2="336" strokeWidth="0.5" />
              <line x1="220" y1="24" x2="220" y2="336" strokeWidth="0.5" />
              <line x1="352" y1="24" x2="352" y2="336" strokeWidth="0.5" />
            </g>

            <motion.g
              style={{ transformOrigin: '220px 168px' }}
              animate={{ rotate: 360 }}
              transition={{ duration: 130, repeat: Infinity, ease: 'linear' }}
            >
              <circle
                cx="220"
                cy="168"
                r="124"
                stroke="url(#nx-bg-arc-a)"
                strokeWidth="2.2"
                strokeDasharray="10 14"
                fill="none"
              />
            </motion.g>

            <circle cx="220" cy="168" r="96" stroke="url(#nx-bg-arc-b)" strokeWidth="1.15" opacity="0.88" />
            <circle cx="220" cy="168" r="68" stroke="var(--accent)" strokeOpacity="0.45" strokeWidth="1.2" />

            <motion.path
              d="M118 248 L118 112 L188 112 L252 198 L252 112 L322 112 L322 248 L252 248 L188 162 L188 248 Z"
              stroke="url(#nx-bg-arc-a)"
              strokeWidth="2"
              strokeLinejoin="round"
              fill="none"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 0.82 }}
              transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
            />
          </svg>
        </motion.div>
      </div>
    );
  }

  return (
    <div
      className={`relative select-none ${className}`}
      aria-hidden
    >
      <motion.div
        className="relative aspect-[5/4] w-full max-w-xl mx-auto rounded-[1.75rem] border border-[var(--border-subtle)] bg-[color-mix(in_oklab,var(--surface-bg)_88%,transparent)] shadow-[0_24px_56px_var(--shadow-elevated)] overflow-hidden"
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="absolute inset-0 nexus-hero-visual-shimmer pointer-events-none" />
        <svg
          viewBox="0 0 440 360"
          className="relative z-[1] w-full h-full"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="nx-arc-a" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#15803d" stopOpacity="0.95" />
              <stop offset="55%" stopColor="#0f766e" stopOpacity="0.65" />
              <stop offset="100%" stopColor="#0c4a6e" stopOpacity="0.35" />
            </linearGradient>
            <linearGradient id="nx-arc-b" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ca8a04" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#15803d" stopOpacity="0.15" />
            </linearGradient>
            <radialGradient id="nx-glow" cx="50%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#15803d" stopOpacity="0.22" />
              <stop offset="100%" stopColor="transparent" />
            </radialGradient>
            <filter id="nx-soft" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="6" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <rect width="440" height="360" fill="url(#nx-glow)" />

          {/* Editorial grid */}
          <g opacity="0.14" stroke="currentColor" className="text-[var(--text-primary)]">
            <line x1="32" y1="48" x2="408" y2="48" strokeWidth="0.5" />
            <line x1="32" y1="120" x2="408" y2="120" strokeWidth="0.5" />
            <line x1="32" y1="192" x2="408" y2="192" strokeWidth="0.5" />
            <line x1="32" y1="264" x2="408" y2="264" strokeWidth="0.5" />
            <line x1="88" y1="24" x2="88" y2="336" strokeWidth="0.5" />
            <line x1="220" y1="24" x2="220" y2="336" strokeWidth="0.5" />
            <line x1="352" y1="24" x2="352" y2="336" strokeWidth="0.5" />
          </g>

          {/* Concentric portal rings */}
          <g filter="url(#nx-soft)">
            <motion.g
              style={{ transformOrigin: '220px 168px' }}
              animate={{ rotate: 360 }}
              transition={{ duration: 140, repeat: Infinity, ease: 'linear' }}
            >
              <circle
                cx="220"
                cy="168"
                r="118"
                stroke="url(#nx-arc-a)"
                strokeWidth="1.25"
                strokeDasharray="8 14"
                fill="none"
              />
            </motion.g>
            <circle cx="220" cy="168" r="92" stroke="url(#nx-arc-b)" strokeWidth="0.9" opacity="0.85" />
            <circle cx="220" cy="168" r="64" stroke="#15803d" strokeOpacity="0.35" strokeWidth="1" />
          </g>

          {/* Nexus “N” monoline — abstract, not a literal logo */}
          <motion.path
            d="M118 248 L118 112 L188 112 L252 198 L252 112 L322 112 L322 248 L252 248 L188 162 L188 248 Z"
            stroke="url(#nx-arc-a)"
            strokeWidth="2.4"
            strokeLinejoin="round"
            fill="none"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1] }}
          />

          {/* Nodes */}
          <circle cx="118" cy="112" r="5" fill="#15803d" />
          <circle cx="322" cy="112" r="5" fill="#0d9488" />
          <circle cx="220" cy="248" r="5" fill="#ca8a04" />

          <motion.path
            d="M118 112 C 160 80, 280 80, 322 112 M 322 112 C 300 200, 140 200, 220 248 M 118 112 C 150 180, 190 220, 220 248"
            stroke="#15803d"
            strokeOpacity="0.22"
            strokeWidth="1.2"
            fill="none"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 2.2, delay: 0.4, ease: 'easeOut' }}
          />
        </svg>

        <div className="absolute bottom-0 left-0 right-0 z-[2] p-6 sm:p-8 bg-gradient-to-t from-[color-mix(in_oklab,var(--content-bg)_96%,transparent)] via-transparent to-transparent">
          <p className="font-display text-[10px] sm:text-xs uppercase tracking-[0.28em] text-[var(--text-muted)] mb-2">
            Signal &amp; craft
          </p>
          <p className="font-display text-lg sm:text-xl text-[var(--text-primary)] leading-snug max-w-sm">
            Built for readers who value substance and writers who publish with intent.
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default NexusHeroVisual;
