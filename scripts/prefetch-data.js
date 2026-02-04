import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ENV_PATH = path.join(__dirname, '../.env');
const HOME_OUTPUT = path.join(__dirname, '../src/data/initial-home-data.json');
const POSTS_OUTPUT = path.join(__dirname, '../src/data/initial-posts-data.json');
const CATEGORIES_OUTPUT = path.join(__dirname, '../src/data/initial-categories-data.json');
const FEATURED_OUTPUT = path.join(__dirname, '../src/data/featured-posts-content.json');

// Simple .env parser since we don't have dotenv
const getEnvVar = (key) => {
    try {
        if (!fs.existsSync(ENV_PATH)) return null;
        const envContent = fs.readFileSync(ENV_PATH, 'utf8');
        const match = envContent.match(new RegExp(`${key}=(.*)`));
        return match ? match[1].trim() : null;
    } catch (e) {
        return null;
    }
};

// Priority: 1. Process Env (explicit) 2. .env file 3. Hardcoded fallback (Production)
const PROD_URL = 'https://blog-management-sx5c.onrender.com/v1';
let BASE_URL = process.env.VITE_API_BASE_URL || getEnvVar('VITE_API_BASE_URL') || PROD_URL;

async function getBlurPlaceholder(imageUrl) {
    if (!imageUrl) return null;
    try {
        const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        const buffer = Buffer.from(response.data, 'binary');

        // Generate a tiny blurred version
        const blurredBuffer = await sharp(buffer)
            .resize(20, 20, { fit: 'inside' })
            .blur(2)
            .toBuffer();

        return `data:image/jpeg;base64,${blurredBuffer.toString('base64')}`;
    } catch (e) {
        console.error(`[Predictive] Failed to get placeholder for ${imageUrl}: ${e.message}`);
        return null;
    }
}

async function fetchWithRetry(url, params = {}, retries = 6, backoff = 15000) {
    for (let i = 0; i < retries; i++) {
        try {
            console.log(`[Prefetch] Attempt ${i + 1}: Fetching ${url}...`);
            return await axios.get(url, { params, timeout: 30000 });
        } catch (error) {
            if (i === retries - 1) throw error;
            console.log(`[Prefetch] Backend might be sleeping. Waiting ${backoff / 1000}s before retry...`);
            await new Promise(resolve => setTimeout(resolve, backoff));
        }
    }
}

async function prefetch() {
    console.log(`[Prefetch] Starting comprehensive prefetch from: ${BASE_URL}`);

    try {
        await runPrefetch(BASE_URL);
        console.log(`[Prefetch] Success! All datasets pre-fetched.`);
    } catch (error) {
        if (BASE_URL !== PROD_URL) {
            console.warn(`[Prefetch] Failed to fetch from ${BASE_URL}. Falling back to Production: ${PROD_URL}`);
            BASE_URL = PROD_URL;
            try {
                await runPrefetch(PROD_URL);
                console.log(`[Prefetch] Success after fallback to Production!`);
                return;
            } catch (fallbackError) {
                console.error(`[Prefetch] Fallback also failed: ${fallbackError.message}`);
            }
        }

        console.error(`[Prefetch] Final Failure: ${error.message}`);

        const fallback = { posts: [], categories: [], popularTags: [], prefetchedAt: null, error: error.message };
        const dir = path.dirname(HOME_OUTPUT);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

        fs.writeFileSync(HOME_OUTPUT, JSON.stringify(fallback, null, 2));
        fs.writeFileSync(POSTS_OUTPUT, JSON.stringify(fallback, null, 2));
        fs.writeFileSync(CATEGORIES_OUTPUT, JSON.stringify(fallback, null, 2));
        fs.writeFileSync(FEATURED_OUTPUT, JSON.stringify({}, null, 2));
    }
}

async function runPrefetch(baseUrlToUse) {
    // 1. Fetch Global/Common Data
    console.log('[Prefetch] Fetching Global Data...');
    const [categoriesRes, tagsRes] = await Promise.all([
        fetchWithRetry(`${baseUrlToUse}/categories`),
        fetchWithRetry(`${baseUrlToUse}/search/tags/popular`)
    ]);

    const commonData = {
        categories: categoriesRes.data?.categories || categoriesRes.data?.data || (Array.isArray(categoriesRes.data) ? categoriesRes.data : []),
        popularTags: tagsRes.data?.tags || tagsRes.data?.data || (Array.isArray(tagsRes.data) ? tagsRes.data : []),
        prefetchedAt: new Date().toISOString()
    };

    // 2. Fetch Home & Posts Archive (Page 1)
    console.log('[Prefetch] Fetching Home & Archive Data...');
    const [homePostsRes, archivePostsRes] = await Promise.all([
        fetchWithRetry(`${baseUrlToUse}/posts`, { page: 1, limit: 10 }),
        fetchWithRetry(`${baseUrlToUse}/posts`, { page: 1, limit: 12 })
    ]);

    const rawHomePosts = homePostsRes.data?.posts || homePostsRes.data?.data || (Array.isArray(homePostsRes.data) ? homePostsRes.data : []);
    const rawArchivePosts = archivePostsRes.data?.posts || archivePostsRes.data?.data || (Array.isArray(archivePostsRes.data) ? archivePostsRes.data : []);

    // Enrich Home Posts with Blur Data
    console.log('[Prefetch] Generating Blur Placeholders for Home Posts...');
    const homePostsWithBlur = await Promise.all(rawHomePosts.map(async (post) => ({
        ...post,
        blurDataURL: post.featuredImage ? await getBlurPlaceholder(post.featuredImage) : null
    })));

    // Enrich Archive Posts with Blur Data (reuse if already in home)
    console.log('[Prefetch] Generating Blur Placeholders for Archive Posts...');
    const archivePostsWithBlur = await Promise.all(rawArchivePosts.map(async (post) => {
        const existing = homePostsWithBlur.find(p => (p._id || p.id) === (post._id || post.id));
        if (existing) return { ...post, blurDataURL: existing.blurDataURL };
        return {
            ...post,
            blurDataURL: post.featuredImage ? await getBlurPlaceholder(post.featuredImage) : null
        };
    }));

    const homeData = {
        ...commonData,
        posts: homePostsWithBlur,
    };

    const archiveData = {
        ...commonData,
        posts: archivePostsWithBlur,
        pagination: archivePostsRes.data?.pagination || { currentPage: 1, totalPages: 1, totalPosts: 12 }
    };

    // 3. Fetch Full Content for Featured Posts
    console.log('[Prefetch] Fetching Full Content for Featured Posts...');
    const featuredPosts = (homeData.posts || []).filter(p => p.isFeatured).slice(0, 3);
    const featuredContent = {};

    if (featuredPosts.length > 0) {
        const detailResponses = await Promise.all(
            featuredPosts.map(p => fetchWithRetry(`${baseUrlToUse}/posts/${p.slug}`))
        );

        for (const res of detailResponses) {
            const post = res.data?.post || res.data?.data || res.data;
            if (post?.slug) {
                // Also blur images in the featured content itself if they exist
                featuredContent[post.slug] = {
                    ...post,
                    blurDataURL: post.featuredImage ? await getBlurPlaceholder(post.featuredImage) : null
                };
            }
        }
    }

    // 4. Save everything
    const dir = path.dirname(HOME_OUTPUT);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    fs.writeFileSync(HOME_OUTPUT, JSON.stringify(homeData, null, 2));
    fs.writeFileSync(POSTS_OUTPUT, JSON.stringify(archiveData, null, 2));
    fs.writeFileSync(CATEGORIES_OUTPUT, JSON.stringify(commonData, null, 2));
    fs.writeFileSync(FEATURED_OUTPUT, JSON.stringify(featuredContent, null, 2));
}

prefetch();
