import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Flame } from 'lucide-react';

const TrendingBadge = ({ variant = 'trending', className = '' }) => {
  const variants = {
    trending: {
      icon: TrendingUp,
      text: 'Trending',
      colors: 'bg-blue-500 text-white',
    },
    hot: {
      icon: Flame,
      text: 'Hot',
      colors: 'bg-orange-500 text-white',
    },
    popular: {
      icon: TrendingUp,
      text: 'Popular',
      colors: 'bg-purple-500 text-white',
    },
  };

  const config = variants[variant] || variants.trending;
  const Icon = config.icon;

  return (
    <motion.span
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${config.colors} ${className}`}
    >
      <Icon className="w-3 h-3" />
      <span>{config.text}</span>
    </motion.span>
  );
};

export default TrendingBadge;

