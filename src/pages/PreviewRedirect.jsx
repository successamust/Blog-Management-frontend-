import { useEffect } from 'react';
import { useParams } from 'react-router-dom';

/**
 * Preview Redirect Component
 * 
 * Handles /preview/posts/:slug routes and redirects to the actual post page.
 * 
 * In production (Vercel), this route is typically handled by the serverless function
 * at /api/social-preview first, but this serves as a client-side fallback.
 * 
 * In development (localhost), this is the primary handler since serverless functions
 * don't run in Vite dev server.
 * 
 * Uses window.location for instant redirect to avoid React Router delay.
 */
const PreviewRedirect = () => {
  const { slug } = useParams();

  useEffect(() => {
    if (slug) {
      // Use window.location for instant redirect (avoids React Router delay)
      window.location.href = `/posts/${slug}`;
    } else {
      // If no slug, redirect to home
      window.location.href = '/';
    }
  }, [slug]);

  // Show minimal loading state during redirect
  return (
    <div className="min-h-screen flex items-center justify-center bg-page">
      <div className="text-center">
        <p className="text-[var(--text-secondary)]">Redirecting...</p>
      </div>
    </div>
  );
};

export default PreviewRedirect;

