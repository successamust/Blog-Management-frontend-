import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ThumbsUp, Heart, Laugh, PartyPopper, Lightbulb, MessageCircle } from 'lucide-react';

const reactions = [
  { emoji: '👍', icon: ThumbsUp, label: 'Like', color: 'text-blue-500' },
  { emoji: '❤️', icon: Heart, label: 'Love', color: 'text-red-500' },
  { emoji: '😂', icon: Laugh, label: 'Funny', color: 'text-yellow-500' },
  { emoji: '🎉', icon: PartyPopper, label: 'Celebrate', color: 'text-purple-500' },
  { emoji: '💡', icon: Lightbulb, label: 'Insightful', color: 'text-amber-500' },
];

const PostReactions = ({ post, onReaction, reactions: propReactions, userReaction: propUserReaction, loading }) => {
  // Use props if provided (from API), otherwise fallback to localStorage
  const [localReactions, setLocalReactions] = useState(propReactions || post?.reactions || {});
  const [userReaction, setUserReaction] = useState(propUserReaction || null);

  // Update when props change
  React.useEffect(() => {
    if (propReactions) {
      setLocalReactions(propReactions);
    }
  }, [propReactions]);

  React.useEffect(() => {
    if (propUserReaction !== undefined) {
      setUserReaction(propUserReaction);
    }
  }, [propUserReaction]);

  const handleReaction = (reactionType) => {
    if (loading) return;
    
    const newReaction = userReaction === reactionType ? null : reactionType;
    
    // Optimistic update
    setUserReaction(newReaction);
    setLocalReactions(prev => {
      const updated = { ...prev };
      if (userReaction) {
        updated[userReaction] = Math.max(0, (updated[userReaction] || 0) - 1);
      }
      if (newReaction) {
        updated[newReaction] = (updated[newReaction] || 0) + 1;
      }
      return updated;
    });

    if (onReaction && post?._id) {
      onReaction(post._id, newReaction);
    }
  };

  const totalReactions = Object.values(localReactions).reduce((sum, count) => sum + count, 0);

  if (totalReactions === 0 && !userReaction) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted">Add a reaction:</span>
        <div className="flex items-center gap-1">
          {reactions.map((reaction) => (
            <motion.button
              key={reaction.label}
              onClick={() => handleReaction(reaction.label.toLowerCase())}
              disabled={loading}
              whileHover={{ scale: loading ? 1 : 1.1 }}
              whileTap={{ scale: loading ? 1 : 0.9 }}
              className="p-1.5 hover:bg-surface-subtle rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label={reaction.label}
              title={reaction.label}
            >
              <span className="text-xl">{reaction.emoji}</span>
            </motion.button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {reactions.map((reaction) => {
        const count = localReactions[reaction.label.toLowerCase()] || 0;
        const isActive = userReaction === reaction.label.toLowerCase();
        
        if (count === 0 && !isActive) return null;

        return (
          <motion.button
            key={reaction.label}
            onClick={() => handleReaction(reaction.label.toLowerCase())}
            disabled={loading}
            whileHover={{ scale: loading ? 1 : 1.05 }}
            whileTap={{ scale: loading ? 1 : 0.95 }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              isActive
                ? 'bg-[var(--accent)]/15 text-[var(--accent)] border border-[var(--accent)]/30'
                : 'bg-surface-subtle text-secondary hover:bg-surface'
            }`}
            aria-label={`${reaction.label} (${count})`}
          >
            <span className="text-lg">{reaction.emoji}</span>
            {count > 0 && (
              <span className="text-sm font-medium">{count}</span>
            )}
          </motion.button>
        );
      })}
      
      {totalReactions === 0 && (
        <span className="text-sm text-muted">No reactions yet</span>
      )}
    </div>
  );
};

export default PostReactions;

