import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, CheckCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const Poll = ({ poll, postId, onVote, userVote: propUserVote, results: propResults }) => {
  const { isAuthenticated } = useAuth();
  const [hasVoted, setHasVoted] = useState(!!propUserVote);
  const [selectedOption, setSelectedOption] = useState(propUserVote || null);
  const [localResults, setLocalResults] = useState(propResults || poll.results || {});

  // Update when props change
  useEffect(() => {
    if (propUserVote !== undefined) {
      setHasVoted(!!propUserVote);
      setSelectedOption(propUserVote);
    }
  }, [propUserVote]);

  useEffect(() => {
    if (propResults) {
      setLocalResults(propResults);
    }
  }, [propResults]);

  const handleVote = (optionId) => {
    if (!isAuthenticated) {
      toast.error('Please sign in to vote');
      return;
    }

    if (hasVoted) {
      toast.error('You have already voted');
      return;
    }

    // Optimistic update
    setSelectedOption(optionId);
    setHasVoted(true);
    setLocalResults(prev => ({
      ...prev,
      [optionId]: (prev[optionId] || 0) + 1,
    }));

    if (onVote && poll?.id) {
      onVote(poll.id, optionId);
    }
  };

  const totalVotes = Object.values(localResults).reduce((sum, count) => sum + count, 0);

  return (
    <div className="border border-[var(--border-subtle)] rounded-xl p-6 bg-surface-subtle">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="w-5 h-5 text-[var(--accent)]" />
        <h3 className="font-semibold text-primary">{poll.question}</h3>
      {poll.description && (
          <p className="text-sm text-secondary mt-1">{poll.description}</p>
        )}
      </div>

      <div className="space-y-3">
        {poll.options.map((option, index) => {
          const voteCount = localResults[option.id] || 0;
          const percentage = totalVotes > 0 ? (voteCount / totalVotes) * 100 : 0;
          const isSelected = selectedOption === option.id;

          return (
            <motion.button
              key={option.id}
              onClick={() => !hasVoted && handleVote(option.id)}
              disabled={hasVoted}
              whileHover={!hasVoted ? { scale: 1.02 } : {}}
              whileTap={!hasVoted ? { scale: 0.98 } : {}}
              className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                isSelected
                  ? 'border-[var(--accent)] bg-[var(--accent)]/10'
                  : hasVoted
                  ? 'border-[var(--border-subtle)] bg-surface cursor-not-allowed'
                  : 'border-[var(--border-subtle)] bg-surface hover:border-[var(--accent)]/50'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 flex-1">
                  {isSelected && hasVoted && (
                    <CheckCircle className="w-5 h-5 text-[var(--accent)]" />
                  )}
                  <span className="font-medium text-primary">{option.text}</span>
                </div>
                {hasVoted && (
                  <span className="text-sm font-semibold text-secondary">
                    {percentage.toFixed(1)}%
                  </span>
                )}
              </div>
              
              {hasVoted && (
                <div className="w-full bg-[var(--surface-subtle)] rounded-full h-2 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 0.5 }}
                    className="h-full bg-[var(--accent)]"
                  />
                </div>
              )}
              
              {hasVoted && (
                <div className="text-xs text-muted mt-1">
                  {voteCount} {voteCount === 1 ? 'vote' : 'votes'}
                </div>
              )}
            </motion.button>
          );
        })}
      </div>

      {hasVoted && (
        <div className="mt-4 pt-4 border-t border-[var(--border-subtle)] text-sm text-muted text-center">
          Total votes: {totalVotes}
        </div>
      )}
    </div>
  );
};

export default Poll;

