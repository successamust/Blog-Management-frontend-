import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ENV_PATH = path.join(__dirname, '../.env');
const OUTPUT_PATH = path.join(__dirname, '../src/data/initial-home-data.json');

// Simple .env parser since we don't have dotenv
const getEnvVar = (key) => {
    try {
        const envContent = fs.readFileSync(ENV_PATH, 'utf8');
        const match = envContent.match(new RegExp(`${key}=(.*)`));
        return match ? match[1].trim() : null;
    } catch (e) {
        return null;
    }
};

// Priority: Process Env > .env file > Hardcoded fallback (Production)
const BASE_URL = process.env.VITE_API_BASE_URL || getEnvVar('VITE_API_BASE_URL') || 'https://blog-management-sx5c.onrender.com/v1';

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
    console.log(`[Prefetch] Starting data fetch from: ${BASE_URL}`);

    try {
        const [postsRes, categoriesRes, tagsRes] = await Promise.all([
            fetchWithRetry(`${BASE_URL}/posts`, { page: 1, limit: 10 }),
            fetchWithRetry(`${BASE_URL}/categories`),
            fetchWithRetry(`${BASE_URL}/search/tags/popular`)
        ]);

        const data = {
            posts: postsRes.data?.posts || postsRes.data?.data || (Array.isArray(postsRes.data) ? postsRes.data : []),
            categories: categoriesRes.data?.categories || categoriesRes.data?.data || (Array.isArray(categoriesRes.data) ? categoriesRes.data : []),
            popularTags: tagsRes.data?.tags || tagsRes.data?.data || (Array.isArray(tagsRes.data) ? tagsRes.data : []),
            prefetchedAt: new Date().toISOString()
        };

        // Ensure directory exists
        const dir = path.dirname(OUTPUT_PATH);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        fs.writeFileSync(OUTPUT_PATH, JSON.stringify(data, null, 2));
        console.log(`[Prefetch] Success! Data saved to ${path.relative(process.cwd(), OUTPUT_PATH)}`);
    } catch (error) {
        console.error(`[Prefetch] Failed: ${error.message}`);

        // If it fails, write an empty structure so the build doesn't break
        // but include the error so the frontend can debug if needed
        const emptyData = {
            posts: [],
            categories: [],
            popularTags: [],
            prefetchedAt: null,
            error: error.message
        };

        const dir = path.dirname(OUTPUT_PATH);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(OUTPUT_PATH, JSON.stringify(emptyData, null, 2));

        // In production build, we might want to fail the build if prefetch is critical, 
        // but for now, we'll allow it to continue with empty data.
    }
}

prefetch();
