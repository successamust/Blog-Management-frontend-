/**
 * RSS Feed API Route
 * Generates RSS 2.0 feed for blog posts
 */
export default async function handler(req, res) {
  try {
    const baseUrl = process.env.VITE_SITE_URL || 'https://thenexusblog.vercel.app';
    const apiUrl = process.env.VITE_API_BASE_URL || 'https://blog-management-sx5c.onrender.com/v1';

    // Fetch recent posts from API
    const response = await fetch(`${apiUrl}/posts?status=published&limit=20&sort=-createdAt`);
    const data = await response.json();
    const posts = data.posts || [];

    // Generate RSS XML
    const rssItems = posts.map((post) => {
      const postUrl = `${baseUrl}/posts/${post.slug || post._id}`;
      const pubDate = new Date(post.createdAt).toUTCString();
      const description = post.excerpt || post.summary || '';
      const content = post.content || '';
      
      // Strip HTML tags for description (keep first 200 chars)
      const cleanDescription = description
        .replace(/<[^>]*>/g, '')
        .substring(0, 200)
        .trim();

      return `
    <item>
      <title><![CDATA[${post.title || 'Untitled'}]]></title>
      <link>${postUrl}</link>
      <guid isPermaLink="true">${postUrl}</guid>
      <description><![CDATA[${cleanDescription}]]></description>
      <pubDate>${pubDate}</pubDate>
      <author>${post.author?.email || 'noreply@nexus.com'} (${post.author?.username || 'Unknown'})</author>
      ${post.category ? `<category>${post.category.name}</category>` : ''}
      ${post.tags ? post.tags.map(tag => `<category>${tag}</category>`).join('\n      ') : ''}
    </item>`;
    }).join('');

    const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Nexus Blog</title>
    <link>${baseUrl}</link>
    <description>Discover engaging articles, insights, and stories on Nexus. Join our community of readers and writers.</description>
    <language>en-US</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${baseUrl}/api/rss.xml" rel="self" type="application/rss+xml"/>
    <image>
      <url>${baseUrl}/nexus-logo.svg</url>
      <title>Nexus Blog</title>
      <link>${baseUrl}</link>
    </image>
    ${rssItems}
  </channel>
</rss>`;

    res.setHeader('Content-Type', 'application/rss+xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    res.status(200).send(rss);
  } catch (error) {
    console.error('Error generating RSS feed:', error);
    res.status(500).json({ error: 'Failed to generate RSS feed' });
  }
}

