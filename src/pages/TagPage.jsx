import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Tag, ArrowLeft, TrendingUp } from 'lucide-react';
import { postsAPI } from '../services/api';
import ModernPostCard from '../components/posts/ModernPostCard';
import Spinner from '../components/common/Spinner';
import Seo from '../components/common/Seo';
import EmptyState from '../components/common/EmptyState';
import toast from 'react-hot-toast';

const TagPage = () => {
  const { tag } = useParams();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalPosts, setTotalPosts] = useState(0);

  useEffect(() => {
    fetchTagPosts();
  }, [tag, currentPage]);

  const fetchTagPosts = async () => {
    try {
      setLoading(true);
      const response = await postsAPI.getAll({
        tags: tag,
        page: currentPage,
        limit: 12,
        status: 'published',
      });

      setPosts(response.data?.posts || []);
      setTotalPages(response.data?.totalPages || 1);
      setTotalPosts(response.data?.totalPosts || 0);
    } catch (error) {
      console.error('Error fetching tag posts:', error);
      toast.error('Failed to load posts');
    } finally {
      setLoading(false);
    }
  };

  const decodedTag = decodeURIComponent(tag);

  return (
    <>
      <Seo
        title={`Posts tagged "${decodedTag}"`}
        description={`Browse all posts tagged with ${decodedTag} on Nexus`}
        url={`/tags/${tag}`}
      />
      <div className="bg-page min-h-screen">
        <div className="layout-container-wide py-6 sm:py-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <Link
              to="/posts"
              className="inline-flex items-center gap-2 text-secondary hover:text-[var(--accent)] mb-4 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Posts</span>
            </Link>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-[var(--accent)]/10 rounded-xl">
                <Tag className="w-6 h-6 text-[var(--accent)]" />
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold text-primary">
                  #{decodedTag}
                </h1>
                <p className="text-secondary mt-1">
                  {totalPosts} {totalPosts === 1 ? 'post' : 'posts'} tagged with this topic
                </p>
              </div>
            </div>
          </motion.div>

          {/* Posts */}
          {loading ? (
            <div className="flex justify-center py-12">
              <Spinner size="xl" />
            </div>
          ) : posts.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {posts.map((post, index) => (
                  <ModernPostCard key={post._id || post.id} post={post} delay={index * 0.1} />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="btn btn-outline disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <span className="flex items-center px-4 text-secondary">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="btn btn-outline disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          ) : (
            <EmptyState
              icon={Tag}
              title="No Posts Found"
              description={`No posts are tagged with "${decodedTag}" yet.`}
              action={
                <Link to="/posts" className="btn btn-primary">
                  Browse All Posts
                </Link>
              }
            />
          )}
        </div>
      </div>
    </>
  );
};

export default TagPage;

