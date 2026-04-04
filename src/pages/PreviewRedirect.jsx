import { Navigate, useParams } from 'react-router-dom';

/**
 * Legacy /preview/posts/:slug — Vercel 301s to /posts/:slug in production.
 * In local dev, redirect in-app (no full reload) so bookmarks still work.
 */
const PreviewRedirect = () => {
  const { slug } = useParams();
  if (slug) {
    return <Navigate to={`/posts/${slug}`} replace />;
  }
  return <Navigate to="/" replace />;
};

export default PreviewRedirect;
