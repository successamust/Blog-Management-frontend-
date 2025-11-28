import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, ArrowLeft, FileQuestion } from 'lucide-react';
import Seo, { DEFAULT_OG_IMAGE } from '../components/common/Seo';
import EmptyState from '../components/common/EmptyState';

const NOT_FOUND_DESCRIPTION = 'We couldn’t find that page on Nexus. Head back home to keep exploring new stories.';

const NotFound = () => {
  return (
    <>
      <Seo
        title="Page Not Found"
        description={NOT_FOUND_DESCRIPTION}
        url="/404"
        image={DEFAULT_OG_IMAGE}
      />
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#f4f9f3] via-[#eef7ec] to-[#f6faf5]">
        <EmptyState
          icon={FileQuestion}
          title="404 - Page Not Found"
          description="The page you're looking for doesn't exist or has been moved."
          action={
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Link
                  to="/"
                  className="btn btn-primary !w-auto shadow-[0_14px_30px_rgba(26,137,23,0.2)]"
                >
                  <Home className="w-5 h-5 mr-2" />
                  Go Home
                </Link>
              </motion.div>
              <motion.button
                onClick={() => window.history.back()}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="btn btn-outline"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Go Back
              </motion.button>
            </div>
          }
        />
      </div>
    </>
  );
};

export default NotFound;

