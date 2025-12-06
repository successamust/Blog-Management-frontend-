import React, { useState } from 'react';
import { motion } from 'framer-motion';
// Using MessageSquare instead of Reddit (Reddit icon not available in lucide-react)
import {
  Share2,
  Copy,
  CheckCircle,
  X,
  Twitter,
  Facebook,
  Linkedin,
  MessageSquare,
  Mail,
  Link as LinkIcon,
} from 'lucide-react';
import toast from 'react-hot-toast';

const SocialShare = ({ post, shareUrl, onShare }) => {
  const [linkCopied, setLinkCopied] = useState(false);

  const shareText = `${post.title} - ${post.excerpt || 'Check out this story on Nexus'}`;
  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedText = encodeURIComponent(shareText);

  const socialPlatforms = [
    {
      name: 'Twitter',
      icon: Twitter,
      color: 'bg-blue-400 hover:bg-blue-500',
      url: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`,
    },
    {
      name: 'Facebook',
      icon: Facebook,
      color: 'bg-blue-600 hover:bg-blue-700',
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    },
    {
      name: 'LinkedIn',
      icon: Linkedin,
      color: 'bg-blue-700 hover:bg-blue-800',
      url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    },
    {
      name: 'Reddit',
      icon: MessageSquare,
      color: 'bg-orange-500 hover:bg-orange-600',
      url: `https://reddit.com/submit?url=${encodedUrl}&title=${encodedText}`,
    },
    {
      name: 'Email',
      icon: Mail,
      color: 'bg-[var(--text-secondary)] hover:bg-[var(--text-primary)]',
      url: `mailto:?subject=${encodedText}&body=${encodedUrl}`,
    },
  ];

  const handleSocialShare = (platform) => {
    if (onShare) {
      onShare(platform.name);
    }
    window.open(platform.url, '_blank', 'width=600,height=400');
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setLinkCopied(true);
      toast.success('Link copied to clipboard!');
      setTimeout(() => setLinkCopied(false), 2000);
      if (onShare) {
        onShare('copy');
      }
    } catch (error) {
      toast.error('Failed to copy link');
    }
  };

  const handleNativeShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: post.title,
          text: post.excerpt || 'Check out this story on Nexus',
          url: shareUrl,
        });
        if (onShare) {
          onShare('native');
        }
        return true;
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        toast.error('Failed to share');
      }
    }
    return false;
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Share Preview Card */}
      <div className="border border-[var(--border-subtle)] rounded-xl overflow-hidden bg-[var(--surface-bg)]">
        {post.featuredImage && (
          <div className="w-full h-32 sm:h-48 overflow-hidden">
            <img
              src={post.featuredImage}
              alt={post.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        <div className="p-3 sm:p-4">
          <h3 className="font-semibold text-sm sm:text-base text-primary mb-1 sm:mb-2 line-clamp-2">{post.title}</h3>
          <p className="text-xs sm:text-sm text-secondary line-clamp-2 mb-2 sm:mb-3">
            {post.excerpt || post.summary || 'Check out this story on Nexus'}
          </p>
          <div className="flex items-center gap-2 text-xs text-muted">
            <LinkIcon className="w-3 h-3" />
            <span className="truncate">{shareUrl}</span>
          </div>
        </div>
      </div>

      {/* Social Media Buttons */}
      <div>
        <h4 className="text-xs sm:text-sm font-medium text-secondary mb-2 sm:mb-3">Share on</h4>
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {socialPlatforms.map((platform) => {
            const Icon = platform.icon;
            return (
              <motion.button
                key={platform.name}
                onClick={() => handleSocialShare(platform)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`flex flex-col items-center gap-1 sm:gap-2 p-2 sm:p-4 rounded-xl text-white ${platform.color} transition-colors`}
                aria-label={`Share on ${platform.name}`}
              >
                <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="text-[10px] sm:text-xs font-medium">{platform.name}</span>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Link Copy Section */}
      <div>
        <label className="block text-xs sm:text-sm font-medium text-secondary mb-1 sm:mb-2">
          Or copy link
        </label>
        <div className="flex items-center gap-2">
          <input
            type="text"
            readOnly
            value={shareUrl}
            className="flex-1 px-2 sm:px-4 py-1.5 sm:py-2 bg-surface-subtle border border-[var(--border-subtle)] rounded-lg text-xs sm:text-sm text-secondary focus:ring-2 focus:ring-[var(--accent)]"
            onClick={(e) => e.target.select()}
          />
          <motion.button
            onClick={copyToClipboard}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`p-1.5 sm:p-2 rounded-lg transition-colors ${
              linkCopied
                ? 'bg-emerald-500 text-white'
                : 'bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]'
            }`}
            aria-label="Copy link"
          >
            {linkCopied ? (
              <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />
            ) : (
              <Copy className="w-4 h-4 sm:w-5 sm:h-5" />
            )}
          </motion.button>
        </div>
        {linkCopied && (
          <p className="mt-1.5 sm:mt-2 text-xs sm:text-sm text-emerald-600 flex items-center gap-1">
            <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4" />
            Link copied to clipboard!
          </p>
        )}
      </div>

      {/* Native Share (Mobile) */}
      {navigator.share && (
        <motion.button
          onClick={handleNativeShare}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full btn btn-primary flex items-center justify-center gap-2 text-sm sm:text-base py-2 sm:py-2.5"
        >
          <Share2 className="w-4 h-4 sm:w-5 sm:h-5" />
          Share via Device
        </motion.button>
      )}
    </div>
  );
};

export default SocialShare;

