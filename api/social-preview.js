const DEFAULT_SITE_URL =
  process.env.SITE_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.VITE_SITE_URL ||
  'https://thenexusblog.vercel.app';

const DEFAULT_API_BASE =
  process.env.API_BASE_URL ||
  process.env.VITE_API_BASE_URL ||
  'https://blog-management-sx5c.onrender.com/v1';

const FALLBACK_DESCRIPTION =
  'Discover engaging articles, insights, and stories on Nexus. Join our community of readers and writers.';
const FALLBACK_IMAGE = `${DEFAULT_SITE_URL}/email-assets/nexus-og-image.png`;
const CACHE_TTL = Number(process.env.PREVIEW_CACHE_TTL || 600);

const escapeHtml = (value = '') =>
  value
    .toString()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const stripHtml = (value = '') => value.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

const toAbsoluteUrl = (value) => {
  if (!value) return FALLBACK_IMAGE;
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith('//')) return `https:${value}`;
  const normalizedPath = value.startsWith('/') ? value : `/${value}`;
  return `${DEFAULT_SITE_URL}${normalizedPath}`;
};

const fetchPostBySlug = async (slug) => {
  const base = DEFAULT_API_BASE.replace(/\/$/, '');
  const url = `${base}/posts/${encodeURIComponent(slug)}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Post fetch failed with status ${response.status}`);
  }

  const payload = await response.json();
  return payload?.post || payload?.data || payload;
};

module.exports = async (req, res) => {
  const slugParam = req.query?.slug;
  const slugValue = Array.isArray(slugParam) ? slugParam[0] : slugParam;

  if (!slugValue) {
    res.status(400).send('Missing slug');
    return;
  }

  try {
    const post = await fetchPostBySlug(slugValue);
    if (!post) {
      res.status(404).send('Post not found');
      return;
    }

    const postPath = `/posts/${post.slug || slugValue}`;
    const canonicalUrl = `${DEFAULT_SITE_URL}${postPath}`;
    const title = escapeHtml(post.title ? `${post.title} | Nexus` : 'Nexus - Stories Worth Sharing');
    const description = escapeHtml(
      post.excerpt ||
        post.summary ||
        post.metaDescription ||
        stripHtml(post.content).slice(0, 180) ||
        FALLBACK_DESCRIPTION
    );
    const imageUrl = toAbsoluteUrl(post.featuredImage);

    const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${title}</title>
    <meta name="description" content="${description}" />
    <meta property="og:type" content="${post.tags?.length ? 'article' : 'website'}" />
    <meta property="og:site_name" content="Nexus" />
    <meta property="og:url" content="${canonicalUrl}" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:image" content="${imageUrl}" />
    <meta property="og:image:secure_url" content="${imageUrl}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="${title}" />

    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:url" content="${canonicalUrl}" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${imageUrl}" />
    <meta name="twitter:image:alt" content="${title}" />

    <meta http-equiv="refresh" content="0; url=${canonicalUrl}" />
    <link rel="canonical" href="${canonicalUrl}" />
    <style>
      body {
        font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        background:#0f172a;
        color:#f8fafc;
        height:100vh;
        margin:0;
        display:flex;
        align-items:center;
        justify-content:center;
        text-align:center;
        padding:1rem;
      }
      a { color:#c7d2fe; }
    </style>
  </head>
  <body>
    <div>
      <p>Redirecting you to the full article&hellip;</p>
      <p><a href="${canonicalUrl}">Continue to ${escapeHtml(post.title || 'the article')}</a></p>
    </div>
  </body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', `public, s-maxage=${CACHE_TTL}, stale-while-revalidate=86400`);
    res.status(200).send(html);
  } catch (error) {
    console.error('[social-preview] Failed to generate preview', error);
    res.status(500).send('Failed to generate preview page');
  }
};

