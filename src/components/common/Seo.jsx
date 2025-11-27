import { useEffect } from 'react';

const SITE_NAME = 'Nexus';
const DEFAULT_BASE_URL = 'https://thenexusblog.vercel.app';
const DEFAULT_DESCRIPTION = 'Discover engaging articles, insights, and stories on Nexus. Join our community of readers and writers.';
const DEFAULT_IMAGE = '/email-assets/nexus-og-image.png';

const resolveBaseUrl = () => {
  const envUrl = import.meta.env?.VITE_SITE_URL;
  if (envUrl) {
    return envUrl.replace(/\/$/, '');
  }

  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }

  return DEFAULT_BASE_URL;
};

const ensureAbsoluteUrl = (value, baseUrl) => {
  if (!value) {
    return undefined;
  }

  if (value.startsWith('//')) {
    return `https:${value}`;
  }

  try {
    return new URL(value, baseUrl).toString();
  } catch {
    return value;
  }
};

const upsertMetaTag = (attributeName, attributeValue, content) => {
  if (typeof document === 'undefined' || !attributeName || !attributeValue || !content) {
    return;
  }

  const selector = `meta[${attributeName}="${attributeValue}"]`;
  let tag = document.head.querySelector(selector);

  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute(attributeName, attributeValue);
    document.head.appendChild(tag);
  }

  tag.setAttribute('content', content);
};

const upsertLinkTag = (rel, href) => {
  if (typeof document === 'undefined' || !rel || !href) {
    return;
  }

  const selector = `link[rel="${rel}"]`;
  let tag = document.head.querySelector(selector);

  if (!tag) {
    tag = document.createElement('link');
    tag.setAttribute('rel', rel);
    document.head.appendChild(tag);
  }

  tag.setAttribute('href', href);
};

const getDefaultedText = (value, fallback = DEFAULT_DESCRIPTION) => {
  if (!value) {
    return fallback;
  }

  const trimmed = value.toString().trim();
  return trimmed.length > 0 ? trimmed : fallback;
};

const Seo = ({
  title,
  description,
  url,
  image,
  type = 'website',
  imageAlt,
}) => {
  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    const baseUrl = resolveBaseUrl();
    const pathFallback =
      typeof window !== 'undefined'
        ? `${window.location.pathname}${window.location.search || ''}`
        : '/';

    const canonicalUrl = ensureAbsoluteUrl(url || pathFallback, baseUrl) || baseUrl;
    const documentTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} - Stories Worth Sharing`;
    const ogTitle = title || `${SITE_NAME} - Stories Worth Sharing`;
    const metaDescription = getDefaultedText(description);
    const imageUrl = ensureAbsoluteUrl(image || DEFAULT_IMAGE, baseUrl);
    const imageAltText = imageAlt || ogTitle;

    document.title = documentTitle;
    upsertMetaTag('name', 'title', documentTitle);
    upsertMetaTag('name', 'description', metaDescription);
    upsertLinkTag('canonical', canonicalUrl);

    upsertMetaTag('property', 'og:type', type);
    upsertMetaTag('property', 'og:site_name', SITE_NAME);
    upsertMetaTag('property', 'og:url', canonicalUrl);
    upsertMetaTag('property', 'og:title', ogTitle);
    upsertMetaTag('property', 'og:description', metaDescription);
    upsertMetaTag('property', 'og:image', imageUrl);
    upsertMetaTag('property', 'og:image:secure_url', imageUrl);
    upsertMetaTag('property', 'og:image:width', '1200');
    upsertMetaTag('property', 'og:image:height', '630');
    upsertMetaTag('property', 'og:image:type', 'image/png');
    upsertMetaTag('property', 'og:image:alt', imageAltText);

    upsertMetaTag('name', 'twitter:card', 'summary_large_image');
    upsertMetaTag('name', 'twitter:url', canonicalUrl);
    upsertMetaTag('name', 'twitter:title', ogTitle);
    upsertMetaTag('name', 'twitter:description', metaDescription);
    upsertMetaTag('name', 'twitter:image', imageUrl);
    upsertMetaTag('name', 'twitter:image:alt', imageAltText);
  }, [title, description, url, image, type, imageAlt]);

  return null;
};

export default Seo;
export const DEFAULT_OG_IMAGE = DEFAULT_IMAGE;

