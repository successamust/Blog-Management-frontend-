import React from 'react';

/**
 * Component to add JSON-LD structured data for SEO
 */
const StructuredData = ({ data }) => {
  if (!data) return null;

  // Security: JSON.stringify automatically escapes special characters, but we'll add extra validation
  // Ensure data is a plain object/array to prevent prototype pollution
  const sanitizedData = typeof data === 'object' && data !== null && !(data instanceof Date) && !(data instanceof RegExp)
    ? JSON.parse(JSON.stringify(data)) // Deep clone to remove any non-serializable properties
    : data;

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(sanitizedData) }}
    />
  );
};

/**
 * Generate Article structured data
 */
export const generateArticleSchema = (post) => {
  if (!post) return null;

  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.excerpt || post.summary || '',
    image: post.featuredImage || '',
    datePublished: post.createdAt,
    dateModified: post.updatedAt || post.createdAt,
    author: {
      '@type': 'Person',
      name: post.author?.username || post.author?.name || 'Unknown',
      url: post.author?.profileUrl || '',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Nexus',
      logo: {
        '@type': 'ImageObject',
        url: `${window.location.origin}/nexus-logo.svg`,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${window.location.origin}/posts/${post.slug || post._id}`,
    },
    articleSection: post.category?.name || '',
    keywords: post.tags?.join(', ') || '',
  };
};

/**
 * Generate Organization structured data
 */
export const generateOrganizationSchema = (siteName = 'Nexus', siteUrl = '') => {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: siteName,
    url: siteUrl || window.location.origin,
    logo: `${window.location.origin}/nexus-logo.svg`,
    sameAs: [
      // Add social media URLs here
    ],
  };
};

/**
 * Generate BreadcrumbList structured data
 */
export const generateBreadcrumbSchema = (items) => {
  if (!items || items.length === 0) return null;

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
};

/**
 * Generate WebSite structured data with search action
 */
export const generateWebsiteSchema = (siteUrl = '') => {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Nexus',
    url: siteUrl || window.location.origin,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${siteUrl || window.location.origin}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
};

export default StructuredData;

