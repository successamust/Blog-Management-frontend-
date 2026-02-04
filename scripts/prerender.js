import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DIST_PATH = path.join(__dirname, '../dist/index.html');
const DATA_PATH = path.join(__dirname, '../src/data/initial-home-data.json');

async function prerender() {
    console.log('[Prerender] Starting SEO injection...');

    if (!fs.existsSync(DIST_PATH)) {
        console.error('[Prerender] Error: dist/index.html not found. Run build first.');
        return;
    }

    try {
        const html = fs.readFileSync(DIST_PATH, 'utf8');
        const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));

        const posts = data.posts || [];
        if (posts.length === 0) {
            console.log('[Prerender] No posts found, skipping injection.');
            return;
        }

        // 1. Generate SEO Content
        const seoContent = posts.map(post => `
            <article>
                <h2>${post.title}</h2>
                <p>${post.excerpt || post.summary || ''}</p>
                <a href="/preview/posts/${post.slug || post._id}">Read more</a>
            </article>
        `).join('\n');

        const injection = `
    <!-- Prerendered Content for SEO -->
    <div id="prerender-content" style="display:none" aria-hidden="true">
        ${seoContent}
    </div>
        `;

        // 2. Inject into the root div or before scripts
        let updatedHtml = html.replace('<div id="root"></div>', `<div id="root"></div>${injection}`);

        // 3. Update Meta Description and Title if we have a top post
        const topPost = posts[0];
        if (topPost) {
            const newDesc = (topPost.excerpt || topPost.summary || '').slice(0, 160);
            if (newDesc) {
                // More robust meta description replacement
                updatedHtml = updatedHtml.replace(
                    /<meta name=\"description\" content=\"[^\"]*\">/,
                    `<meta name="description" content="${newDesc}">`
                );
                // Also update OG description
                updatedHtml = updatedHtml.replace(
                    /<meta property=\"og:description\" content=\"[^\"]*\">/,
                    `<meta property="og:description" content="${newDesc}">`
                );
            }
        }

        fs.writeFileSync(DIST_PATH, updatedHtml);
        console.log(`[Prerender] Success! Injected ${posts.length} posts for SEO.`);

    } catch (error) {
        console.error('[Prerender] Failed:', error.message);
    }
}

prerender();
