import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronDown, Sparkles } from 'lucide-react';

const AnimatedHero = () => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 40 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.9,
        ease: [0.22, 1, 0.36, 1],
      },
    },
  };

  const fadeInVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 1.2,
        ease: 'easeOut',
      },
    },
  };

  return (
    <section className="relative min-h-[92vh] sm:min-h-[95vh] flex items-center justify-center overflow-hidden bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/40 py-16 sm:py-20">
      {/* Premium Atmospheric Background with Abstract Shapes */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Soft gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/40 to-transparent"></div>
        
        {/* Animated abstract shapes - more subtle and premium */}
        <motion.div
          className="absolute top-10 left-[10%] w-96 h-96 bg-gradient-to-br from-indigo-200/20 via-purple-200/15 to-pink-200/20 rounded-full mix-blend-multiply filter blur-3xl"
          animate={{
            x: [0, 80, 0],
            y: [0, 60, 0],
            scale: [1, 1.15, 1],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        <motion.div
          className="absolute top-32 right-[15%] w-[500px] h-[500px] bg-gradient-to-br from-purple-200/20 via-blue-200/15 to-indigo-200/20 rounded-full mix-blend-multiply filter blur-3xl"
          animate={{
            x: [0, -90, 0],
            y: [0, -70, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 30,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        <motion.div
          className="absolute bottom-24 left-1/3 w-[450px] h-[450px] bg-gradient-to-br from-pink-200/15 via-purple-200/20 to-indigo-200/15 rounded-full mix-blend-multiply filter blur-3xl"
          animate={{
            x: [0, 60, 0],
            y: [0, -90, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 35,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />

        {/* Subtle grid pattern overlay */}
        <div className="absolute inset-0 opacity-[0.02] bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:4rem_4rem]"></div>
      </div>

      {/* Content */}
      <motion.div
        className="relative z-10 text-center px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Premium Tagline */}
        <motion.div
          className="mb-6 sm:mb-8"
          variants={itemVariants}
        >
          <motion.p
            className="text-xs sm:text-sm font-medium text-indigo-600/80 uppercase tracking-[0.2em] mb-6 sm:mb-8 font-sans"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
          >
            <motion.span
              className="inline-block mr-2"
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
            >
              <Sparkles className="w-3 h-3 inline" />
            </motion.span>
            The Future of Content
          </motion.p>
        </motion.div>

        {/* Bold, Elegant Headline with Premium Typography */}
        <motion.div
          className="mb-8 sm:mb-12"
          variants={itemVariants}
        >
          <motion.h1
            className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl font-display leading-[0.95] tracking-tight mb-4"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 1, ease: [0.22, 1, 0.36, 1] }}
          >
            <motion.span
              className="inline-block bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent"
              animate={{
                backgroundPosition: ['0%', '100%', '0%'],
              }}
              transition={{
                duration: 8,
                repeat: Infinity,
                ease: 'linear',
              }}
              style={{
                backgroundSize: '200% auto',
              }}
            >
              The Nexus
            </motion.span>
            <motion.span
              className="inline-block ml-2 sm:ml-3 bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 bg-clip-text text-transparent"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7, duration: 0.8 }}
            >
              Blog
            </motion.span>
          </motion.h1>
        </motion.div>

        {/* Refined Subheadline with Fade-in Animation */}
        <motion.p
          className="text-xl sm:text-2xl md:text-3xl lg:text-4xl text-slate-600 mb-12 sm:mb-16 max-w-4xl mx-auto leading-relaxed font-light font-sans"
          variants={fadeInVariants}
          initial="hidden"
          animate="visible"
        >
          Where{' '}
          <motion.span
            className="font-medium text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600"
            animate={{
              backgroundPosition: ['0%', '100%', '0%'],
            }}
            transition={{
              duration: 5,
              repeat: Infinity,
              ease: 'linear',
            }}
            style={{
              backgroundSize: '200% auto',
            }}
          >
            exceptional stories
          </motion.span>
          {' '}meet{' '}
          <motion.span
            className="font-medium text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600"
            animate={{
              backgroundPosition: ['0%', '100%', '0%'],
            }}
            transition={{
              duration: 5,
              repeat: Infinity,
              ease: 'linear',
              delay: 0.5,
            }}
            style={{
              backgroundSize: '200% auto',
            }}
          >
            curious minds
          </motion.span>
        </motion.p>

        {/* Premium Buttons with Microinteractions */}
        <motion.div
          className="flex flex-col sm:flex-row gap-5 sm:gap-6 justify-center items-center mb-16 sm:mb-20"
          variants={itemVariants}
        >
          {/* Solid Gradient Button */}
          <motion.div
            whileHover={{ scale: 1.03, y: -2 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
          >
            <Link
              to="/posts"
              className="group relative inline-flex items-center px-10 py-4 sm:px-12 sm:py-5 border border-transparent text-base sm:text-lg font-semibold rounded-2xl text-white bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 shadow-xl hover:shadow-2xl transition-all duration-500 overflow-hidden"
            >
              {/* Animated gradient overlay on hover */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-indigo-700 via-purple-700 to-pink-700 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                initial={false}
              />
              <span className="relative z-10 flex items-center">
                Explore Posts
                <motion.div
                  className="ml-3"
                  animate={{ x: [0, 6, 0] }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <ArrowRight className="w-5 h-5" />
                </motion.div>
              </span>
            </Link>
          </motion.div>

          {/* Outlined Button with Premium Style */}
          <motion.div
            whileHover={{ scale: 1.03, y: -2 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
          >
            <Link
              to="/categories"
              className="group relative inline-flex items-center px-10 py-4 sm:px-12 sm:py-5 border-2 border-slate-300 text-base sm:text-lg font-semibold rounded-2xl text-slate-700 bg-white/80 backdrop-blur-sm hover:bg-white hover:border-indigo-400 shadow-lg hover:shadow-xl transition-all duration-500"
            >
              <span className="relative z-10">Browse Categories</span>
              <motion.div
                className="absolute inset-0 rounded-2xl bg-gradient-to-r from-indigo-50 to-purple-50 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                initial={false}
              />
            </Link>
          </motion.div>
        </motion.div>

        {/* Testimonial/Tagline Section */}
        <motion.div
          className="max-w-3xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, duration: 0.8 }}
        >
          <motion.div
            className="relative px-8 py-6 sm:px-12 sm:py-8 bg-white/60 backdrop-blur-md rounded-2xl border border-slate-200/50 shadow-lg"
            whileHover={{ scale: 1.01 }}
            transition={{ duration: 0.3 }}
          >
            <motion.p
              className="text-lg sm:text-xl text-slate-700 italic leading-relaxed font-light mb-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2, duration: 0.8 }}
            >
              "A platform that elevates storytelling to an art form, connecting writers and readers in a space designed for inspiration and discovery."
            </motion.p>
            <motion.div
              className="flex items-center justify-center gap-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.4, duration: 0.8 }}
            >
              <div className="w-1 h-8 bg-gradient-to-b from-indigo-500 to-purple-500 rounded-full"></div>
              <p className="text-sm sm:text-base text-slate-600 font-medium">
                — The Nexus Blog Community
              </p>
            </motion.div>
          </motion.div>
        </motion.div>
      </motion.div>
      
      {/* Elegant Scroll Indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-10"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.6, duration: 0.8 }}
      >
        <motion.button
          onClick={() => {
            window.scrollTo({ top: window.innerHeight, behavior: 'smooth' });
          }}
          className="flex flex-col items-center text-slate-400 hover:text-slate-600 transition-colors group"
          aria-label="Scroll down"
        >
          <span className="text-xs font-medium mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 tracking-wider">
            Explore
          </span>
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          >
            <ChevronDown className="w-6 h-6" />
          </motion.div>
        </motion.button>
      </motion.div>
    </section>
  );
};

export default AnimatedHero;

