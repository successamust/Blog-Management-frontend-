import React, { useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { postsAPI, categoriesAPI } from '../../services/api';

/**
 * SmartLink Component
 * Triggers a data pre-fetch when the user hovers over a link with intent (>150ms).
 * This warms up the API cache so the page transition is instant.
 */
const SmartLink = ({ to, children, prefetchType = 'auto', ...props }) => {
    const navigate = useNavigate();
    const prefetchTimerRef = useRef(null);
    const isPrefetchedRef = useRef(false);

    const prefetchData = useCallback(async () => {
        if (isPrefetchedRef.current) return;

        // Determine what to prefetch based on the URL
        try {
            // 1. Data Prefetching
            if (to.includes('/preview/posts/') || to.includes('/posts/')) {
                const slug = to.split('/').pop();
                if (slug) {
                    console.debug(`[SmartLink] Predictive data+code pre-fetch for post: ${slug}`);
                    postsAPI.getBySlug(slug);
                    // Predictive code pre-fetch
                    import('../../pages/PostDetail');
                }
            } else if (to === '/posts') {
                console.debug(`[SmartLink] Predictive data+code pre-fetch for archive`);
                postsAPI.getAll({ page: 1, limit: 12 });
                import('../../pages/Posts');
            } else if (to === '/categories') {
                console.debug(`[SmartLink] Predictive data+code pre-fetch for categories`);
                categoriesAPI.getAll();
                import('../../pages/Categories');
            } else if (to === '/') {
                import('../../pages/Home');
            } else if (to === '/dashboard') {
                import('../../pages/Dashboard');
            } else if (to === '/admin') {
                import('../../pages/Admin');
            }

            isPrefetchedRef.current = true;
        } catch (e) {
            console.debug('[SmartLink] Prefetch failed or ignored:', e.message);
        }
    }, [to]);

    const handleMouseEnter = () => {
        // Start timer for "hover intent"
        prefetchTimerRef.current = setTimeout(() => {
            prefetchData();
        }, 150);
    };

    const handleMouseLeave = () => {
        if (prefetchTimerRef.current) {
            clearTimeout(prefetchTimerRef.current);
            prefetchTimerRef.current = null;
        }
    };

    const handleTouchStart = () => {
        // On touch devices, prefetch immediately on touch
        prefetchData();
    };

    return (
        <Link
            to={to}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onTouchStart={handleTouchStart}
            {...props}
        >
            {children}
        </Link>
    );
};

export default SmartLink;
