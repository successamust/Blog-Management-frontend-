/**
 * Sitemap XML API Route
 * Generates sitemap for SEO
 */
export default async function handler(req, res) {
  try {
    const baseUrl = process.env.VITE_SITE_URL || 'https://thenexusblog.vercel.app';
    const apiUrl = process.env.VITE_API_BASE_URL || 'https://blog-management-sx5c.onrender.com/v1';

    // Fetch all published posts
    const postsResponse = await fetch(`${apiUrl}/posts?status=published&limit=1000`);
    const postsData = await postsResponse.json();
    const posts = postsData.posts || [];

    // Fetch all categories
    const categoriesResponse = await fetch(`${apiUrl}/categories`);
    const categoriesData = await categoriesResponse.json();
    const categories = categoriesData.categories || [];

    // Generate sitemap entries
    const sitemapEntries = [
      // Homepage
      `<url>
    <loc>${baseUrl}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>`,
      // Posts page
      `<url>
    <loc>${baseUrl}/posts</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>`,
      // Categories page
      `<url>
    <loc>${baseUrl}/categories</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`,
      // Individual posts
      ...posts.map(post => {
        const postUrl = `${baseUrl}/posts/${post.slug || post._id}`;
        const lastmod = post.updatedAt 
          ? new Date(post.updatedAt).toISOString().split('T')[0]
          : new Date(post.createdAt).toISOString().split('T')[0];
        return `<url>
    <loc>${postUrl}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`;
      }),
      // Category pages
      ...categories.map(category => {
        const categoryUrl = `${baseUrl}/categories/${category.slug || category._id}`;
        return `<url>
    <loc>${categoryUrl}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`;
      }),
    ];

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${sitemapEntries.join('\n')}
</urlset>`;

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    res.status(200).send(sitemap);
  } catch (error) {
    console.error('Error generating sitemap:', error);
    res.status(500).json({ error: 'Failed to generate sitemap' });
  }
}

