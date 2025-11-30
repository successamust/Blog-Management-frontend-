/**
 * Favicon handler - redirects to SVG favicon
 * Browsers automatically request /favicon.ico, so we provide a redirect
 */
export default async (req, res) => {
  // Redirect to the SVG favicon
  res.redirect(301, '/nexus-logo-icon.svg');
};

