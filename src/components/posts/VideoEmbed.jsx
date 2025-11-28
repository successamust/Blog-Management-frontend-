import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Play, ExternalLink } from 'lucide-react';

const VideoEmbed = ({ url, title, thumbnail, provider = 'auto' }) => {
  const [isPlaying, setIsPlaying] = useState(false);

  const getVideoId = (url, providerType) => {
    if (providerType === 'youtube' || url.includes('youtube.com') || url.includes('youtu.be')) {
      const match = url.match(/(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/);
      return match ? match[1] : null;
    }
    if (providerType === 'vimeo' || url.includes('vimeo.com')) {
      const match = url.match(/vimeo\.com\/(?:.*\/)?(\d+)/);
      return match ? match[1] : null;
    }
    return null;
  };

  const detectProvider = (url) => {
    if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
    if (url.includes('vimeo.com')) return 'vimeo';
    return 'unknown';
  };

  const videoProvider = provider === 'auto' ? detectProvider(url) : provider;
  const videoId = getVideoId(url, videoProvider);

  const getEmbedUrl = () => {
    if (videoProvider === 'youtube' && videoId) {
      return `https://www.youtube.com/embed/${videoId}?autoplay=1`;
    }
    if (videoProvider === 'vimeo' && videoId) {
      return `https://player.vimeo.com/video/${videoId}?autoplay=1`;
    }
    return null;
  };

  const getThumbnailUrl = () => {
    if (videoProvider === 'youtube' && videoId) {
      return thumbnail || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
    }
    return thumbnail;
  };

  if (!videoId) {
    return (
      <div className="border border-[var(--border-subtle)] rounded-xl p-4 bg-surface-subtle">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-[var(--accent)] hover:underline"
        >
          <ExternalLink className="w-4 h-4" />
          <span>Watch video: {title || url}</span>
        </a>
      </div>
    );
  }

  if (isPlaying) {
    const embedUrl = getEmbedUrl();
    return (
      <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black">
        <iframe
          src={embedUrl}
          title={title || 'Video'}
          className="absolute inset-0 w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <motion.div
      className="relative w-full aspect-video rounded-xl overflow-hidden bg-black cursor-pointer group"
      onClick={() => setIsPlaying(true)}
      whileHover={{ scale: 1.01 }}
    >
      {getThumbnailUrl() && (
        <img
          src={getThumbnailUrl()}
          alt={title || 'Video thumbnail'}
          className="w-full h-full object-cover"
        />
      )}
      <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 transition-colors flex items-center justify-center">
        <motion.div
          className="w-20 h-20 bg-[var(--surface-bg)]/90 rounded-full flex items-center justify-center"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <Play className="w-10 h-10 text-black ml-1" fill="black" />
        </motion.div>
      </div>
      {title && (
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
          <p className="text-white font-medium">{title}</p>
        </div>
      )}
    </motion.div>
  );
};

export default VideoEmbed;

