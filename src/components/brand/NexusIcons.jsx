import React from 'react';

const baseCls = 'inline-block align-middle';

const makeIcon = (path, viewBox = '0 0 24 24') =>
  function Icon({ className = 'w-5 h-5', strokeWidth = 1.8 }) {
    return (
      <svg
        viewBox={viewBox}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`${baseCls} ${className}`}
        aria-hidden="true"
      >
        {path(strokeWidth)}
      </svg>
    );
  };

export const NexusUsersIcon = makeIcon((sw) => (
  <>
    <circle cx="8" cy="9" r="3" stroke="currentColor" strokeWidth={sw} />
    <circle cx="16.5" cy="8.5" r="2.5" stroke="currentColor" strokeWidth={sw} opacity="0.8" />
    <path d="M3.5 18.2c.8-2.8 2.8-4.2 4.6-4.2h.1c2.1 0 4.1 1.5 4.9 4.2" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" />
    <path d="M13.8 17.8c.5-1.8 1.8-2.9 3.2-2.9 1.3 0 2.5.9 3.1 2.6" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" opacity="0.8" />
  </>
));

export const NexusPostsIcon = makeIcon((sw) => (
  <>
    <rect x="4" y="4" width="16" height="16" rx="3" stroke="currentColor" strokeWidth={sw} />
    <path d="M8 9h8M8 12h8M8 15h5" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" />
    <path d="M16.7 15.7l1.8 1.8" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" />
  </>
));

export const NexusCategoriesIcon = makeIcon((sw) => (
  <>
    <rect x="4" y="5" width="7" height="6" rx="1.5" stroke="currentColor" strokeWidth={sw} />
    <rect x="13" y="5" width="7" height="6" rx="1.5" stroke="currentColor" strokeWidth={sw} />
    <rect x="4" y="13" width="7" height="6" rx="1.5" stroke="currentColor" strokeWidth={sw} />
    <rect x="13" y="13" width="7" height="6" rx="1.5" stroke="currentColor" strokeWidth={sw} />
  </>
));

export const NexusSubscribersIcon = makeIcon((sw) => (
  <>
    <rect x="3.5" y="6" width="17" height="12" rx="2.5" stroke="currentColor" strokeWidth={sw} />
    <path d="M5.8 8.2L12 12.8l6.2-4.6" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="19" cy="5" r="2.2" fill="currentColor" opacity="0.2" />
  </>
));

export const NexusTrendingIcon = makeIcon((sw) => (
  <>
    <path d="M4 16.5l5.2-5.2 3.5 3.5 6-6" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
    <path d="M14.7 5.8H18.7V9.8" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
  </>
));

export const NexusArrowRightIcon = makeIcon((sw) => (
  <>
    <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
  </>
));

