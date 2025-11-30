import handler from '../social-preview.js';
import { readFileSync } from 'fs';
import { join } from 'path';

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

const INDEX_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/nexus-logo-icon.svg" />
    <link rel="apple-touch-icon" href="/nexus-logo-icon.svg" />
    <link rel="manifest" href="/manifest.json" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Nexus - Stories Worth Sharing</title>
    <meta name="title" content="Nexus - Stories Worth Sharing" />
    <meta name="description" content="Discover engaging articles, insights, and stories on Nexus. Join our community of readers and writers." />
    <meta name="keywords" content="blog, articles, news, insights, stories, content, newsletter" />
    <meta name="author" content="Nexus" />
    <meta name="robots" content="index, follow" />
    <meta name="language" content="English" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="https://www.nexusblog.xyz/" />
    <meta property="og:title" content="Nexus - Stories Worth Sharing" />
    <meta property="og:description" content="Discover engaging articles, insights, and stories on Nexus. Join our community of readers and writers." />
    <meta property="og:image" content="https://www.nexusblog.xyz/email-assets/nexus-og-image.png" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:type" content="image/png" />
    <meta property="og:image:alt" content="Nexus - Stories Worth Sharing" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:url" content="https://www.nexusblog.xyz/" />
    <meta name="twitter:title" content="Nexus - Stories Worth Sharing" />
    <meta name="twitter:description" content="Discover engaging articles, insights, and stories on Nexus. Join our community of readers and writers." />
    <meta name="twitter:image" content="https://www.nexusblog.xyz/email-assets/nexus-og-image.png" />
    <meta name="twitter:image:alt" content="Nexus - Stories Worth Sharing" />
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

export default async (req, res) => {
  const userAgent = req.headers['user-agent'] || '';
  const slug = req.query?.slug;
  
  if (isCrawler(userAgent) && slug) {
    req.query = { slug };
    return handler(req, res);
  }
  
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache');
  res.status(200).send(INDEX_HTML);
};

