import handler from '../social-preview.js';
import { isOgCrawler } from '../lib/isOgCrawler.js';
import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Function to read the actual built index.html to get correct production asset paths
// Read on each request to handle Vercel's file system correctly
const varyUserAgent = (res) => {
  res.setHeader('Vary', 'User-Agent');
};

const headerValue = (req, name) => {
  const v = req.headers?.[name] ?? req.headers?.[name.toLowerCase()];
  if (v == null) return '';
  return (Array.isArray(v) ? v[0] : v).toString();
};

/** Slug from query, Vercel/path headers, or URL (rewrites differ by runtime). */
const extractPostSlug = (req) => {
  let slug = null;
  if (req.query?.slug) {
    slug = Array.isArray(req.query.slug) ? req.query.slug[0] : req.query.slug;
  }
  if (!slug) {
    for (const pathLike of [
      headerValue(req, 'x-matched-path'),
      headerValue(req, 'x-invoke-path'),
      headerValue(req, 'x-original-url'),
      headerValue(req, 'x-url'),
    ]) {
      if (!pathLike) continue;
      const clean = pathLike.split('?')[0].split('#')[0];
      const m = clean.match(/\/(?:api\/)?posts\/([^/]+)/);
      if (m?.[1]) {
        slug = decodeURIComponent(m[1]);
        break;
      }
    }
  }
  const urlPath = req.url || '';
  if (!slug && urlPath) {
    const cleanPath = urlPath.split('?')[0].split('#')[0];
    const patterns = [
      /\/api\/posts\/([^/]+)/,
      /\/posts\/([^/]+)/,
      /^\/([^/]+)$/,
      /^([^/]+)$/,
    ];
    for (const pattern of patterns) {
      const match = cleanPath.match(pattern);
      if (match?.[1]) {
        slug = decodeURIComponent(match[1]);
        break;
      }
    }
  }
  if (!slug && urlPath) {
    const pathParts = urlPath.split('/').filter(Boolean);
    const postsIndex = pathParts.indexOf('posts');
    if (postsIndex >= 0 && pathParts[postsIndex + 1]) {
      slug = decodeURIComponent(pathParts[postsIndex + 1].split('?')[0]);
    }
  }
  return slug || null;
};

const getIndexHtml = () => {
  const possiblePaths = [
    join(process.cwd(), '.vercel/output/static/index.html'),  // Vercel production
    join(process.cwd(), 'dist/index.html'),                  // Local/Vercel build
    join(__dirname, '../../dist/index.html'),                // Alternative
    join(process.cwd(), 'index.html'),                        // Root fallback
  ];

  for (const indexPath of possiblePaths) {
    try {
      const html = readFileSync(indexPath, 'utf-8');
      console.log('[posts/slug] Successfully loaded index.html from:', indexPath);
      return html;
    } catch (error) {
      // Try next path
      continue;
    }
  }
  
  // Fallback HTML if dist/index.html is not found (shouldn't happen in production)
  console.warn('[posts/slug] Could not read dist/index.html from any path, using fallback');
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/nexus-logo-icon.svg" />
    <link rel="apple-touch-icon" href="/nexus-logo-icon.svg" />
    <link rel="manifest" href="/manifest.json" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Nexus - Connect. Create. Discover.</title>
    <meta name="title" content="Nexus - Connect. Create. Discover." />
    <meta name="description" content="The central hub for diverse voices, where every perspective is shared and every idea is explored. Join our community of readers and writers." />
    <meta name="keywords" content="blog, articles, news, insights, stories, content, newsletter" />
    <meta name="author" content="Nexus" />
    <meta name="robots" content="index, follow" />
    <meta name="language" content="English" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="https://www.nexusblog.xyz/" />
    <meta property="og:title" content="Nexus - Connect. Create. Discover." />
    <meta property="og:description" content="The central hub for diverse voices, where every perspective is shared and every idea is explored. Join our community of readers and writers." />
    <meta property="og:image" content="https://www.nexusblog.xyz/email-assets/nexus-og-image.png?v=v2" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:type" content="image/png" />
    <meta property="og:image:alt" content="Nexus - Connect. Create. Discover." />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:url" content="https://www.nexusblog.xyz/" />
    <meta name="twitter:title" content="Nexus - Connect. Create. Discover." />
    <meta name="twitter:description" content="The central hub for diverse voices, where every perspective is shared and every idea is explored. Join our community of readers and writers." />
    <meta name="twitter:image" content="https://www.nexusblog.xyz/email-assets/nexus-og-image.png?v=v2" />
    <meta name="twitter:image:alt" content="Nexus - Connect. Create. Discover." />
    <meta name="theme-color" content="#1a8917" />
    <link rel="preconnect" href="https://blog-management-sx5c.onrender.com" />
    <link rel="dns-prefetch" href="https://blog-management-sx5c.onrender.com" />
    <link rel="sitemap" type="application/xml" href="/api/sitemap.xml" />
    <script id="MathJax-script" async src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"></script>
    <script>
      window.MathJax = {
        tex: {
          inlineMath: [['$', '$'], ['\\\\(', '\\\\)']],
          displayMath: [['$$', '$$'], ['\\\\[', '\\\\]']]
        }
      };
      (function() {
        const savedTheme = localStorage.getItem('theme');
        const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        const theme = savedTheme === 'dark' || savedTheme === 'light' 
          ? savedTheme 
          : (prefersDark ? 'dark' : 'light');
        const root = document.documentElement;
        if (theme === 'dark') {
          root.setAttribute('data-theme', 'dark');
          root.classList.add('dark');
        } else {
          root.setAttribute('data-theme', 'light');
          root.classList.remove('dark');
        }
      })();
    </script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>`;
}

export default async (req, res) => {
  try {
    const userAgent = req.headers['user-agent'] || '';
    const urlPath = req.url || '';
    
    // IMPORTANT: Don't handle asset requests - let them pass through to static files
    // Assets should be served directly, not through this API function
    if (urlPath.includes('/assets/') || urlPath.includes('/email-assets/') || 
        urlPath.endsWith('.js') || urlPath.endsWith('.css') || urlPath.endsWith('.png') || 
        urlPath.endsWith('.jpg') || urlPath.endsWith('.svg') || urlPath.endsWith('.woff') ||
        urlPath.endsWith('.woff2') || urlPath.endsWith('.ttf') || urlPath.endsWith('.eot') ||
        urlPath.endsWith('.map')) {
      // This shouldn't happen if routing is correct, but just in case, return 404
      // Source maps (.map) should also return 404 to prevent unnecessary requests
      res.status(404).send('Not found');
      return;
    }
    
    const slug = extractPostSlug(req);
    
    // Always log for debugging
    console.log('[posts/slug] Request details:', {
      url: urlPath,
      query: req.query,
      method: req.method,
      headers: {
        'user-agent': userAgent ? userAgent.substring(0, 100) : 'none',
      },
      extractedSlug: slug || 'NOT_FOUND',
      isOgCrawler: isOgCrawler(userAgent),
    });
    
    // If it's a crawler and we have a slug, serve the social preview
    if (isOgCrawler(userAgent)) {
      if (slug) {
        req.previewSlug = slug;
        try {
          await handler(req, res);
          return;
        } catch (error) {
          console.error('[posts/slug] Error in social preview handler:', error);
          if (!res.headersSent) {
            varyUserAgent(res);
            res.setHeader('Content-Type', 'text/plain; charset=utf-8');
            res.status(500).send('Preview unavailable');
          }
          return;
        }
      }
      console.error('[posts/slug] ERROR: Crawler detected but slug extraction failed:', {
        url: urlPath,
        query: req.query,
        userAgent: userAgent,
      });
      if (!res.headersSent) {
        varyUserAgent(res);
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.status(404).send('Not found');
      }
      return;
    }

    // Browsers: SPA shell (never use this HTML for link previews — crawlers handled above)
    const indexHtml = getIndexHtml();
    varyUserAgent(res);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.status(200).send(indexHtml);
  } catch (error) {
    // Catch any unexpected errors and still serve the React app
    console.error('[posts/slug] Unexpected error:', error);
    try {
      const indexHtml = getIndexHtml();
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache');
      res.status(200).send(indexHtml);
    } catch (sendError) {
      // If we can't send response, log it
      console.error('[posts/slug] Failed to send response:', sendError);
    }
  }
};

