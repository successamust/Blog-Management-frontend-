import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, CheckCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const Poll = ({ poll, postId, onVote, userVote: propUserVote, results: propResults, canChangeVote: propCanChangeVote, timeRemainingMinutes: propTimeRemaining, changesRemaining: propChangesRemaining }) => {
  const { isAuthenticated } = useAuth();
  const [hasVoted, setHasVoted] = useState(!!propUserVote);
  const [selectedOption, setSelectedOption] = useState(propUserVote || null);
  const [localResults, setLocalResults] = useState(propResults || poll.results || {});
  const [canChangeVote, setCanChangeVote] = useState(propCanChangeVote || false);
  const [timeRemaining, setTimeRemaining] = useState(propTimeRemaining || 0);
  const [changesRemaining, setChangesRemaining] = useState(propChangesRemaining || 0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previousState, setPreviousState] = useState(null);

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

  useEffect(() => {
    if (propCanChangeVote !== undefined) {
      setCanChangeVote(propCanChangeVote);
    }
  }, [propCanChangeVote]);

  useEffect(() => {
    if (propTimeRemaining !== undefined) {
      setTimeRemaining(propTimeRemaining);
    }
  }, [propTimeRemaining]);

  useEffect(() => {
    if (propChangesRemaining !== undefined) {
      setChangesRemaining(propChangesRemaining);
    }
  }, [propChangesRemaining]);

  // Countdown timer for remaining time (updates every minute since we show minutes)
  useEffect(() => {
    if (hasVoted && timeRemaining > 0 && canChangeVote) {
      const interval = setInterval(() => {
        setTimeRemaining(prev => {
          const newTime = Math.max(0, prev - 1);
          if (newTime <= 0) {
            setCanChangeVote(false);
            return 0;
          }
          return newTime;
        });
      }, 60000); // Update every minute (since we display minutes)

      return () => clearInterval(interval);
    } else if (hasVoted && timeRemaining <= 0) {
      setCanChangeVote(false);
    }
  }, [hasVoted, timeRemaining, canChangeVote]);

  const handleVote = async (optionId) => {
    if (!isAuthenticated) {
      toast.error('Please sign in to vote');
      return;
    }

    // Check if poll is active
    if (poll.isActive === false) {
      toast.error('This poll is no longer active');
      return;
    }

    // Prevent multiple simultaneous submissions
    if (isSubmitting) {
      return;
    }

    // If user has voted but can change, allow it
    if (hasVoted && !canChangeVote) {
      if (timeRemaining <= 0) {
        toast.error('Vote change window has expired. You can only change your vote within 5 minutes of your first vote.');
      } else if (changesRemaining <= 0) {
        toast.error('You have reached the maximum number of vote changes. Your vote is now locked.');
      } else {
        toast.error('You cannot change your vote at this time.');
      }
      return;
    }

    // Save previous state for rollback
    setPreviousState({
      selectedOption,
      hasVoted,
      localResults: { ...localResults },
      changesRemaining
    });

    // If changing vote, update the old option count
    if (hasVoted && selectedOption && selectedOption !== optionId) {
      setLocalResults(prev => ({
        ...prev,
        [selectedOption]: Math.max(0, (prev[selectedOption] || 0) - 1),
        [optionId]: (prev[optionId] || 0) + 1,
      }));
      setChangesRemaining(prev => Math.max(0, prev - 1));
    } else if (!hasVoted) {
      // First vote
      setLocalResults(prev => ({
        ...prev,
        [optionId]: (prev[optionId] || 0) + 1,
      }));
    }

    // Optimistic update
    setSelectedOption(optionId);
    setHasVoted(true);
    setIsSubmitting(true);

    if (onVote && poll?.id) {
      try {
        await onVote(poll.id, optionId);
      } catch (error) {
        // Rollback on error
        if (previousState) {
          setSelectedOption(previousState.selectedOption);
          setHasVoted(previousState.hasVoted);
          setLocalResults(previousState.localResults);
          setChangesRemaining(previousState.changesRemaining);
        }
        throw error; // Re-throw to let parent handle
      } finally {
        setIsSubmitting(false);
        setPreviousState(null);
      }
    } else {
      setIsSubmitting(false);
    }
  };

  const totalVotes = Object.values(localResults).reduce((sum, count) => sum + count, 0);

  const isPollInactive = poll.isActive === false;

  return (
    <div className="border border-[var(--border-subtle)] rounded-xl p-3 sm:p-4 md:p-6 bg-surface-subtle">
      <div className="mb-3 sm:mb-4">
        <div className="flex items-start gap-2 sm:gap-2.5">
          <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--accent)] mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-primary text-sm sm:text-base leading-tight">{poll.question}</h3>
              {isPollInactive && (
                <span className="px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 rounded text-xs font-medium">
                  Inactive
                </span>
              )}
            </div>
            {poll.description && (
              <p className="text-xs sm:text-sm text-secondary mt-1.5 sm:mt-2 leading-relaxed">{poll.description}</p>
            )}
            {isPollInactive && !hasVoted && (
              <p className="text-xs text-muted mt-2 italic">Voting is disabled for this poll</p>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-2 sm:space-y-3">
        {poll.options.map((option, index) => {
          const voteCount = localResults[option.id] || 0;
          const percentage = totalVotes > 0 ? (voteCount / totalVotes) * 100 : 0;
          const isSelected = selectedOption === option.id;

          return (
            <motion.button
              key={option.id}
              onClick={() => (!hasVoted || canChangeVote) && !isSubmitting && poll.isActive !== false && handleVote(option.id)}
              disabled={(hasVoted && !canChangeVote) || isSubmitting || poll.isActive === false}
              whileHover={(!hasVoted || canChangeVote) && !isSubmitting && poll.isActive !== false ? { scale: 1.01 } : {}}
              whileTap={(!hasVoted || canChangeVote) && !isSubmitting && poll.isActive !== false ? { scale: 0.99 } : {}}
              aria-label={`Vote for ${option.text}`}
              aria-disabled={(hasVoted && !canChangeVote) || isSubmitting || poll.isActive === false}
              className={`w-full text-left p-2.5 sm:p-3 md:p-4 rounded-lg border-2 transition-all touch-manipulation ${
                isSelected
                  ? 'border-[var(--accent)] bg-[var(--accent)]/10'
                  : (hasVoted && !canChangeVote) || isSubmitting || poll.isActive === false
                  ? 'border-[var(--border-subtle)] bg-surface cursor-not-allowed opacity-60'
                  : 'border-[var(--border-subtle)] bg-surface active:border-[var(--accent)]/50 sm:hover:border-[var(--accent)]/50'
              }`}
            >
              <div className="flex items-start sm:items-center justify-between gap-2 mb-1.5 sm:mb-2">
                <div className="flex items-start sm:items-center gap-1.5 sm:gap-2 flex-1 min-w-0">
                  {isSelected && hasVoted && (
                    <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--accent)] flex-shrink-0 mt-0.5 sm:mt-0" />
                  )}
                  <span className="font-medium text-primary text-sm sm:text-base leading-snug break-words">{option.text}</span>
                </div>
                {hasVoted && (
                  <span className="text-xs sm:text-sm font-semibold text-secondary flex-shrink-0 ml-2">
                    {percentage.toFixed(1)}%
                  </span>
                )}
              </div>
              
              {hasVoted && (
                <div className="w-full bg-[var(--surface-subtle)] rounded-full h-1.5 sm:h-2 overflow-hidden mb-1 sm:mb-0">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 0.5 }}
                    className="h-full bg-[var(--accent)]"
                  />
                </div>
              )}
              
              {hasVoted && (
                <div className="text-xs text-muted mt-1 sm:mt-1.5">
                  {voteCount} {voteCount === 1 ? 'vote' : 'votes'}
                </div>
              )}
            </motion.button>
          );
        })}
      </div>

      {hasVoted && (
        <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-[var(--border-subtle)] text-xs sm:text-sm text-muted text-center space-y-1 sm:space-y-1.5">
          <div className="font-medium">Total votes: {totalVotes}</div>
          {canChangeVote && (
            <div className="text-xs text-[var(--accent)] px-2 leading-relaxed">
              You can change your vote {changesRemaining} more time{changesRemaining !== 1 ? 's' : ''} 
              {timeRemaining > 0 && (
                <span className="block sm:inline mt-0.5 sm:mt-0">
                  {' '}({timeRemaining} min remaining)
                </span>
              )}
            </div>
          )}
          {!canChangeVote && hasVoted && (
            <div className="text-xs">
              Your vote is locked
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Poll;

