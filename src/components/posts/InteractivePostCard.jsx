import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Calendar, Eye, Heart, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { useInView } from 'framer-motion';
import { useRef } from 'react';

const InteractivePostCard = ({ post, featured = false, delay = 0 }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  const cardVariants = {
    hidden: { opacity: 0, y: 50, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.5,
        ease: [0.22, 1, 0.36, 1],
      },
    },
  };

  const hoverVariants = {
    rest: { scale: 1, y: 0 },
    hover: {
      scale: 1.02,
      y: -8,
      transition: {
        duration: 0.3,
        ease: 'easeOut',
      },
    },
  };

  const imageVariants = {
    rest: { scale: 1 },
    hover: {
      scale: 1.1,
      transition: {
        duration: 0.5,
        ease: 'easeOut',
      },
    },
  };

  if (featured) {
    return (
      <motion.div
        ref={ref}
        variants={cardVariants}
        initial="hidden"
        animate={isInView ? 'visible' : 'hidden'}
        whileHover="hover"
        className="group"
      >
        <Link
          to={`/posts/${post.slug}`}
          className="block card-elevated card-elevated-hover overflow-hidden"
        >
          <div className="relative h-64 overflow-hidden">
            {post.featuredImage ? (
              <motion.img
                src={post.featuredImage}
                alt={post.title}
                className="w-full h-full object-cover"
                variants={imageVariants}
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-blue-400 to-purple-500" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
            <div className="absolute bottom-4 left-4 right-4">
              <motion.h3
                className="text-2xl font-bold text-white mb-2 group-hover:text-blue-200 transition-colors"
                initial={{ opacity: 0, y: 20 }}
                whileHover={{ opacity: 1, y: 0 }}
              >
                {post.title}
              </motion.h3>
            </div>
          </div>
          <div className="p-6">
            <p className="text-slate-600 mb-4 line-clamp-2">{post.excerpt}</p>
            <div className="flex items-center justify-between text-sm text-slate-500">
              <div className="flex items-center space-x-4">
                <span className="flex items-center">
                  <Calendar className="w-4 h-4 mr-1" />
                  {format(new Date(post.publishedAt), 'MMM d, yyyy')}
                </span>
                <span className="flex items-center">
                  <Eye className="w-4 h-4 mr-1" />
                  {post.viewCount || 0}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="flex items-center">
                  <Heart className="w-4 h-4 mr-1" />
                  {post.likes?.length || 0}
                </span>
              </div>
            </div>
            <motion.div
              className="mt-4 flex items-center text-indigo-600 font-medium"
              initial={{ opacity: 0, x: -20 }}
              whileHover={{ opacity: 1, x: 0 }}
            >
              Read more
              <ArrowRight className="ml-2 w-4 h-4" />
            </motion.div>
          </div>
        </Link>
      </motion.div>
    );
  }

  return (
    <motion.div
      ref={ref}
      variants={cardVariants}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      whileHover="hover"
      className="group"
    >
      <Link
        to={`/posts/${post.slug}`}
        className="block card-elevated card-elevated-hover p-6 overflow-hidden relative"
      >
        {/* Gradient overlay on hover */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-50/0 to-purple-50/0 group-hover:from-blue-50/50 group-hover:to-purple-50/50 transition-all duration-300 pointer-events-none"></div>
        
        <div className="relative z-10">
          {post.featuredImage && (
            <div className="mb-4 rounded-lg overflow-hidden">
              <motion.img
                src={post.featuredImage}
                alt={post.title}
                className="w-full h-40 object-cover"
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.3 }}
              />
            </div>
          )}
          
          <motion.h3
            className="text-xl font-bold text-slate-900 mb-3 group-hover:text-indigo-600 transition-colors"
            whileHover={{ x: 5 }}
          >
            {post.title}
          </motion.h3>
          <p className="text-slate-600 mb-4 line-clamp-2 leading-relaxed">{post.excerpt || 'No excerpt available'}</p>
          
          <div className="flex items-center justify-between text-sm text-slate-500 mb-4">
            <span className="flex items-center">
              <Calendar className="w-4 h-4 mr-1" />
              {format(new Date(post.publishedAt || post.createdAt), 'MMM d, yyyy')}
            </span>
            <div className="flex items-center space-x-4">
              <span className="flex items-center">
                <Eye className="w-4 h-4 mr-1" />
                {post.viewCount || 0}
              </span>
              <span className="flex items-center">
                <Heart className="w-4 h-4 mr-1" />
                {post.likes?.length || 0}
              </span>
            </div>
          </div>
          
          <motion.div
            className="flex items-center text-indigo-600 font-semibold opacity-0 group-hover:opacity-100 transition-opacity"
            whileHover={{ x: 5 }}
          >
            Read more
            <ArrowRight className="ml-2 w-4 h-4" />
          </motion.div>
        </div>
      </Link>
    </motion.div>
  );
};

export default InteractivePostCard;

