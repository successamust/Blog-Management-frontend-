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

  return false;
}
