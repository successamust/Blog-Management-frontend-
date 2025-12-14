const DEFAULT_SITE_URL =
  process.env.SITE_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.VITE_SITE_URL ||
  'https://www.nexusblog.xyz';

const DEFAULT_API_BASE =
  process.env.API_BASE_URL ||
  process.env.VITE_API_BASE_URL ||
  'https://blog-management-sx5c.onrender.com/v1';

const FALLBACK_DESCRIPTION =
  'The central hub for diverse voices, where every perspective is shared and every idea is explored. Join our community of readers and writers.';
const FALLBACK_IMAGE = `${DEFAULT_SITE_URL}/email-assets/nexus-og-image.png?v=v2`;
const CACHE_TTL = Number(process.env.PREVIEW_CACHE_TTL || 600);

const escapeHtml = (value = '') => {
  if (!value) return '';
  return value
    .toString()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/\n/g, ' ')
    .replace(/\r/g, ' ')
    .trim();
};

const stripHtml = (value = '') => value.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

const toAbsoluteUrl = (value) => {
  if (!value || value.trim() === '') return FALLBACK_IMAGE;

  // Already absolute URL
  if (/^https?:\/\//i.test(value)) return value;

  // Protocol-relative URL
  if (value.startsWith('//')) return `https:${value}`;

  // Check if it's an API-hosted image (full URL from API)
  if (value.includes(DEFAULT_API_BASE) || value.includes('blog-management-sx5c.onrender.com')) {
    return value;
  }

  // Handle API-relative paths (/v1/uploads/...)
  if (value.startsWith('/v1/')) {
    return `${DEFAULT_API_BASE.replace(/\/$/, '')}${value}`;
  }

  // Relative path - make it absolute with site URL
  const normalizedPath = value.startsWith('/') ? value : `/${value}`;
  return `${DEFAULT_SITE_URL}${normalizedPath}`;
};

const fetchPostBySlug = async (slug) => {
  const base = DEFAULT_API_BASE.replace(/\/$/, '');
  const url = `${base}/posts/${encodeURIComponent(slug)}`;

  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
    },
  });

  console.log('[social-preview] Fetch response status:', response.status, response.statusText);

  if (!response.ok) {
    const body = await response.text();
    console.error('[social-preview] API error response:', { status: response.status, body });
    throw new Error(`Post fetch failed (${response.status}) -> ${body}`);
  }

  const payload = await response.json();
  console.log('[social-preview] Raw API response:', {
    url,
    payloadKeys: Object.keys(payload),
    hasPost: !!payload?.post,
    hasData: !!payload?.data,
    payloadType: typeof payload,
    isArray: Array.isArray(payload),
    fullPayload: JSON.stringify(payload).slice(0, 500) + '...'
  });

  const post = payload?.post || payload?.data || payload;
  console.log('[social-preview] Extracted post:', {
    postType: typeof post,
    isNull: post === null,
    isUndefined: post === undefined,
    postKeys: post && typeof post === 'object' ? Object.keys(post) : [],
    title: post?.title,
    hasContent: !!post?.content,
    contentType: typeof post?.content,
    fullPost: post ? JSON.stringify(post).slice(0, 300) + '...' : 'null/undefined'
  });

  return post;
};

const isCrawler = (userAgent, headers = {}) => {
  if (!userAgent) return false;
  const ua = userAgent.toLowerCase();

  // Check for common crawler user agents (more comprehensive)
  const crawlers = [
    'facebookexternalhit', 'facebot', 'twitterbot', 'linkedinbot',
    'whatsapp', 'slackbot', 'applebot', 'googlebot', 'bingbot',
    'yandexbot', 'pinterest', 'redditbot', 'skypeuripreview',
    'telegrambot', 'discordbot', 'slurp', 'duckduckbot', 'baiduspider',
    'ia_archiver', 'slack', 'discord', 'skype', 'metainspector', 'facebookcatalog',
    'opengraph', 'linkpreview', 'bot', 'crawler', 'spider', 'fetch',
    'preview', 'social', 'embed', 'share'
  ];

  // Check user agent for crawler keywords
  if (crawlers.some(crawler => ua.includes(crawler.toLowerCase()))) {
    return true;
  }

  // Check for specific social media patterns
  const socialPatterns = [
    /facebook/i, /twitter/i, /linkedin/i, /whatsapp/i, /telegram/i,
    /discord/i, /slack/i, /pinterest/i, /instagram/i, /tiktok/i,
    /snapchat/i, /reddit/i, /tumblr/i, /weibo/i, /vk/i
  ];

  if (socialPatterns.some(pattern => pattern.test(ua))) {
    return true;
  }

  // Check for common crawler headers
  const crawlerHeaders = [
    headers['x-purpose'] === 'preview',
    headers['x-requested-with'] === 'XMLHttpRequest' && ua.includes('bot'),
    headers['accept'] && headers['accept'].includes('text/html') && (ua.includes('bot') || ua.includes('crawler')),
    headers['user-agent'] && (headers['user-agent'].includes('bot') || headers['user-agent'].includes('crawler')),
    headers['referer'] && (headers['referer'].includes('facebook.com') || headers['referer'].includes('twitter.com') || headers['referer'].includes('linkedin.com'))
  ];

  return crawlerHeaders.some(Boolean);
};

const handler = async (req, res) => {
  try {
    const slugParam = req.query?.slug;
    const slugValue = Array.isArray(slugParam) ? slugParam[0] : slugParam;
    const userAgent = req.headers['user-agent'] || '';
    const headers = req.headers || {};

    console.log('[social-preview] Request details:', {
      slug: slugValue,
      userAgent: userAgent.substring(0, 200), // Truncate for readability
      isCrawler: isCrawler(userAgent, headers),
      headers: {
        'x-purpose': headers['x-purpose'],
        'x-requested-with': headers['x-requested-with'],
        'accept': headers['accept']?.substring(0, 100),
        'referer': headers['referer']?.substring(0, 100)
      }
    });

    if (!slugValue) {
      console.log('[social-preview] Missing slug parameter');
      res.status(400).send('Missing slug');
      return;
    }

    // URL decode the slug in case it contains encoded characters
    const decodedSlug = decodeURIComponent(slugValue);
    console.log('[social-preview] Slug processing:', {
      original: slugValue,
      decoded: decodedSlug,
      changed: slugValue !== decodedSlug
    });

    // Set timeout for post fetching (10 seconds)
    const fetchTimeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Post fetch timeout')), 10000)
    );

    let post;
    try {
      post = await Promise.race([fetchPostBySlug(decodedSlug), fetchTimeout]);
    } catch (fetchError) {
      console.error('[social-preview] Error fetching post:', fetchError);
      // If fetch fails or times out, redirect to post page for browsers
      if (!isCrawler(userAgent, headers)) {
        const postPath = `/posts/${decodedSlug}`;
        const canonicalUrl = `${DEFAULT_SITE_URL}${postPath}`;
        res.redirect(302, canonicalUrl);
        return;
      }
      // For crawlers, return 500 with error message
      res.status(500).send('Failed to fetch post data');
      return;
    }

    if (!post || typeof post !== 'object') {
      console.error('[social-preview] Invalid post data:', { post, type: typeof post });
      res.status(404).send('Post not found');
      return;
    }

    // Additional validation - check if post has basic required properties
    if (!post._id && !post.id && !post.slug) {
      console.error('[social-preview] Post missing required identifiers:', {
        hasId: !!post._id || !!post.id,
        hasSlug: !!post.slug,
        postKeys: Object.keys(post)
      });
      res.status(404).send('Post data incomplete');
      return;
    }

    const postPath = `/posts/${post.slug || decodedSlug}`;
    const canonicalUrl = `${DEFAULT_SITE_URL}${postPath}`;

    // For regular browsers (not crawlers), redirect immediately to the actual post
    if (!isCrawler(userAgent, headers)) {
      res.redirect(302, canonicalUrl);
      return;
    }
    
    // For crawlers, generate the preview HTML with meta tags
    console.log('[social-preview] Starting HTML generation for crawler');
    const rawTitle = post.title;
    const rawExcerpt = post.excerpt;
    const rawSummary = post.summary;
    const rawMetaDescription = post.metaDescription;
    const rawContent = post.content;
    const contentPreview = rawContent ? stripHtml(rawContent).slice(0, 180) : null;

    console.log('[social-preview] Content extraction:', {
      rawTitle,
      rawExcerpt,
      rawSummary,
      rawMetaDescription,
      contentLength: rawContent?.length,
      contentPreview
    });

    const title = escapeHtml(rawTitle ? `${rawTitle} | Nexus` : 'Nexus - Connect. Create. Discover.');
    const description = escapeHtml(
      rawExcerpt ||
        rawSummary ||
        rawMetaDescription ||
        contentPreview ||
        FALLBACK_DESCRIPTION
    );

    console.log('[social-preview] Final values:', {
      title,
      description,
      usingFallback: description === FALLBACK_DESCRIPTION
    });
    
    // Try multiple possible image field names (most common first)
    const imageSource = post.featuredImage ||
                       post.featured_image ||
                       post.coverImage ||
                       post.cover_image ||
                       post.image ||
                       post.thumbnail ||
                       post.banner ||
                       post.bannerImage ||
                       post.banner_image ||
                       post.heroImage ||
                       post.hero_image ||
                       post.headerImage ||
                       post.header_image ||
                       post.mainImage ||
                       post.main_image ||
                       (post.images && post.images[0]) ||
                       (post.media && post.media[0] && post.media[0].url);
    const imageUrl = toAbsoluteUrl(imageSource);
    const validatedImageUrl = imageUrl && imageUrl.startsWith('http') ? imageUrl : FALLBACK_IMAGE;

    console.log('[social-preview] Processing post:', {
      requestedSlug: slugValue,
      decodedSlug: decodedSlug,
      actualSlug: post.slug,
      title: post.title,
      hasContent: !!post.content,
      imageSource,
      validatedImageUrl,
      usingFallbackImage: validatedImageUrl === FALLBACK_IMAGE
    });

    const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${title}</title>
    <meta name="description" content="${description}" />
    <meta name="robots" content="index, follow" />
    <meta name="author" content="${post.author?.username || post.author?.name || 'Nexus'}" />

    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="${post.tags?.length ? 'article' : 'website'}" />
    <meta property="og:site_name" content="Nexus" />
    <meta property="og:url" content="${canonicalUrl}" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:image" content="${validatedImageUrl}" />
    <meta property="og:image:secure_url" content="${validatedImageUrl}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:type" content="image/png" />
    <meta property="og:image:alt" content="${title}" />
    ${post.publishedAt ? `<meta property="article:published_time" content="${new Date(post.publishedAt).toISOString()}" />` : ''}
    ${post.updatedAt ? `<meta property="article:modified_time" content="${new Date(post.updatedAt).toISOString()}" />` : ''}
    ${post.author?.username ? `<meta property="article:author" content="${post.author.username}" />` : ''}
    ${post.tags?.length ? post.tags.map(tag => `<meta property="article:tag" content="${tag}" />`).join('\n    ') : ''}

    <!-- Twitter -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:site" content="@nexusblog" />
    <meta name="twitter:url" content="${canonicalUrl}" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${validatedImageUrl}" />
    <meta name="twitter:image:alt" content="${title}" />

    <!-- Additional meta tags -->
    <meta name="theme-color" content="#1a8917" />
    <link rel="canonical" href="${canonicalUrl}" />

    <!-- Refresh for browsers that somehow reach this page -->
    <meta http-equiv="refresh" content="0; url=${canonicalUrl}" />
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
    console.error('[social-preview] Failed to generate preview', {
      slug: slugValue,
      message: error.message,
      stack: error.stack,
    });
    
    // If response hasn't been sent yet, try to redirect or send error
    if (!res.headersSent) {
      const userAgent = req.headers['user-agent'] || '';
      const headers = req.headers || {};
      // For browsers, redirect to the post page even on error
      if (!isCrawler(userAgent, headers)) {
        try {
          const postPath = `/posts/${decodedSlug}`;
          const canonicalUrl = `${DEFAULT_SITE_URL}${postPath}`;
          res.redirect(302, canonicalUrl);
          return;
        } catch (redirectError) {
          console.error('[social-preview] Failed to redirect:', redirectError);
        }
      }
      // For crawlers or if redirect failed, send error
      res.status(500).send('Failed to generate preview page');
    }
  }
};

export default handler;

