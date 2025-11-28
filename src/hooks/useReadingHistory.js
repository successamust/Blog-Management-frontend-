import { useState, useEffect, useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';

/**
 * Hook to manage reading history
 */
export const useReadingHistory = () => {
  const [history, setHistory] = useLocalStorage('readingHistory', []);

  const addToHistory = useCallback((post) => {
    if (!post || !post._id) return;

    setHistory(prev => {
      const filtered = prev.filter(item => item.postId !== post._id);
      const newItem = {
        postId: post._id,
        slug: post.slug,
        title: post.title,
        excerpt: post.excerpt,
        featuredImage: post.featuredImage,
        author: post.author,
        category: post.category,
        timestamp: Date.now(),
        lastRead: Date.now(),
        readCount: (prev.find(item => item.postId === post._id)?.readCount || 0) + 1,
      };
      
      // Keep only last 100 items
      return [newItem, ...filtered].slice(0, 100);
    });
  }, [setHistory]);

  const updateReadingProgress = useCallback((postId, progress) => {
    setHistory(prev => prev.map(item => 
      item.postId === postId 
        ? { ...item, readingProgress: progress, lastRead: Date.now() }
        : item
    ));
  }, [setHistory]);

  const removeFromHistory = useCallback((postId) => {
    setHistory(prev => prev.filter(item => item.postId !== postId));
  }, [setHistory]);

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, [setHistory]);

  const getHistoryItem = useCallback((postId) => {
    return history.find(item => item.postId === postId);
  }, [history]);

  return {
    history,
    addToHistory,
    updateReadingProgress,
    removeFromHistory,
    clearHistory,
    getHistoryItem,
  };
};

export default useReadingHistory;

