import { format } from 'date-fns';

/**
 * Normalizes any date value (String, Date, Number) into a Date object or null.
 */
export const normalizeDate = (value) => {
    if (!value) return null;
    try {
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? null : date;
    } catch {
        return null;
    }
};

/**
 * Extracts the most appropriate display date for a post.
 */
export const getPostDate = (post) => {
    if (!post) return new Date(0);
    return (
        normalizeDate(post.publishedAt) ||
        normalizeDate(post.createdAt) ||
        normalizeDate(post.updatedAt) ||
        new Date(0)
    );
};

/**
 * Strips HTML tags from a string.
 */
export const stripHtmlTags = (value) => {
    if (!value) return '';
    return value.replace(/<[^>]*>/g, '');
};

/**
 * Normalizes an image source path/URL.
 */
export const normalizeImageSource = (imagePath, defaultImage = '') => {
    if (!imagePath) {
        return defaultImage;
    }

    if (imagePath.startsWith('http://') || imagePath.startsWith('https://') || imagePath.startsWith('//')) {
        return imagePath;
    }

    return imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
};

/**
 * Wraps tables in a scrollable div for better mobile responsiveness.
 */
export const wrapTablesWithScroll = (html = '') => {
    if (typeof html !== 'string' || !html.includes('<table')) return html;
    return html
        .replace(/<table/gi, '<div class="table-scroll"><table')
        .replace(/<\/table>/gi, '</table></div>');
};

/**
 * Formats a reading time estimate.
 */
export const formatReadingTime = (minutes) => {
    if (!minutes) return '1 min read';
    if (minutes < 1) return '< 1 min read';
    return `${Math.ceil(minutes)} min read`;
};
/**
 * Formats an author's display name consistently.
 * Handles both object (author.username) and string formats.
 */
export const formatAuthorName = (author) => {
    if (!author) return 'Anonymous';

    let name = '';
    if (typeof author === 'string') {
        name = author;
    } else {
        name = author.username || author.name || author.displayName || 'Anonymous';
    }

    if (name === 'Anonymous') return name;

    // Title case formatting
    return name
        .split(' ')
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
        .join(' ');
};

/**
 * Formats a date object or string consistently.
 */
export const formatDate = (date, formatString = 'MMM d, yyyy') => {
    const d = normalizeDate(date);
    if (!d) return '';
    try {
        return format(d, formatString);
    } catch {
        return '';
    }
};
