import handler from '../social-preview.js';
import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CRAWLER_USER_AGENTS = [
  'facebookexternalhit',
  'Facebot',
  'Twitterbot',
  'LinkedInBot',
  'WhatsApp',
  'Slackbot',
  'Applebot',
  'Googlebot',
  'Bingbot',
  'YandexBot',
  'Pinterest',
  'redditbot',
  'SkypeUriPreview',
  'TelegramBot',
  'Discordbot',
  'Slurp',
  'DuckDuckBot',
  'Baiduspider',
  'ia_archiver',
  'Slack',
  'Discord',
  'Skype',
  'MetaInspector',
  'facebookcatalog',
];

const isCrawler = (userAgent) => {
  if (!userAgent) return false;
  const ua = userAgent.toLowerCase();
  return CRAWLER_USER_AGENTS.some(crawler => ua.includes(crawler.toLowerCase()));
};

// Function to read the actual built index.html to get correct production asset paths
// Read on each request to handle Vercel's file system correctly
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
    
    // Extract slug - in Vercel, [slug].js makes the slug available in different ways
    // Try multiple methods to extract it
    let slug = null;
    
    // Method 1: Check req.query.slug (standard Vercel dynamic route)
    if (req.query?.slug) {
      slug = Array.isArray(req.query.slug) ? req.query.slug[0] : req.query.slug;
    }
    
    // Method 2: Extract from URL path
    if (!slug && urlPath) {
      // Remove query string and hash
      const cleanPath = urlPath.split('?')[0].split('#')[0];
      
      // Try to match /api/posts/slug or /posts/slug or just slug
      const patterns = [
        /\/api\/posts\/([^/]+)/,
        /\/posts\/([^/]+)/,
        /^\/([^/]+)$/,
        /^([^/]+)$/
      ];
      
      for (const pattern of patterns) {
        const match = cleanPath.match(pattern);
        if (match && match[1]) {
          slug = decodeURIComponent(match[1]);
          break;
        }
      }
    }
    
    // Method 3: Check if slug is in the pathname (some Vercel setups)
    if (!slug && urlPath) {
      // Sometimes Vercel provides the path differently
      const pathParts = urlPath.split('/').filter(Boolean);
      const postsIndex = pathParts.indexOf('posts');
      if (postsIndex >= 0 && pathParts[postsIndex + 1]) {
        slug = decodeURIComponent(pathParts[postsIndex + 1].split('?')[0]);
      }
    }
    
    // Always log for debugging
    console.log('[posts/slug] Request details:', {
      url: urlPath,
      query: req.query,
      method: req.method,
      headers: {
        'user-agent': userAgent ? userAgent.substring(0, 100) : 'none',
      },
      extractedSlug: slug || 'NOT_FOUND',
      isCrawler: isCrawler(userAgent),
    });
    
    // If it's a crawler and we have a slug, serve the social preview
    if (isCrawler(userAgent)) {
      if (slug) {
        // Pass slug to social preview handler
        req.query = { slug: slug };
        try {
          return await handler(req, res);
        } catch (error) {
          console.error('[posts/slug] Error in social preview handler:', error);
          // Fall through to serve regular HTML if preview fails
        }
      } else {
        // Crawler but no slug found - this is a problem
        console.error('[posts/slug] ERROR: Crawler detected but slug extraction failed:', {
          url: urlPath,
          query: req.query,
          userAgent: userAgent,
        });
        // Fall through to serve regular HTML
      }
    }
    
    // For regular users (browsers) or if crawler handling failed, serve the React app
    const indexHtml = getIndexHtml();
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

