/**
 * Detect crawlers/bots that need server-rendered Open Graph HTML.
 * Keep this conservative: normal browsers must NOT match (avoids extra work and wrong redirects).
 */
export function isOgCrawler(userAgent = '') {
  const ua = (userAgent || '').toLowerCase();
  if (!ua) return false;

  const knownBots = [
    'facebookexternalhit',
    'facebot',
    // Meta (2025+): link previews and external fetches often use these instead of facebookexternalhit
    'meta-externalagent',
    'meta-externalfetcher',
    'meta-webindexer',
    'meta-externalads',
    'twitterbot',
    'linkedinbot',
    'whatsapp',
    'slackbot',
    'applebot',
    'googlebot',
    'bingbot',
    'yandexbot',
    'pinterest',
    'redditbot',
    'skypeuripreview',
    'telegrambot',
    'discordbot',
    'slurp',
    'duckduckbot',
    'baiduspider',
    'ia_archiver',
    'embedly',
    'vkshare',
    'outbrain',
    'opengraph',
    'quora link preview',
    'bytespider',
    'lighthouse',
    'pagespeed',
  ];

  if (knownBots.some((k) => ua.includes(k))) return true;

  // Google rich results / inspection tools sometimes omit "Googlebot" but include this
  if (ua.includes('google-inspectiontool')) return true;

  // Meta catalog / future meta-* link fetchers (UA contains "meta-<name>/1.1")
  if (/meta-[a-z0-9-]+\//i.test(userAgent)) return true;

  if (ua.includes('facebookcatalog')) return true;

  return false;
}
