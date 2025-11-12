/**
 * Calculate reading time for a post based on content length
 * Average reading speed: 200-250 words per minute
 * @param {string} content - HTML or text content
 * @returns {number} Reading time in minutes
 */
export const calculateReadingTime = (content) => {
  if (!content) return 1;
  
  // Remove HTML tags if present
  const text = content.replace(/<[^>]*>/g, '');
  
  // Count words (split by whitespace)
  const wordCount = text.trim().split(/\s+/).filter(word => word.length > 0).length;
  
  // Average reading speed: 225 words per minute
  const wordsPerMinute = 225;
  const readingTime = Math.ceil(wordCount / wordsPerMinute);
  
  // Minimum 1 minute
  return Math.max(1, readingTime);
};

/**
 * Format reading time for display
 * @param {number} minutes - Reading time in minutes
 * @returns {string} Formatted reading time (e.g., "5 min read")
 */
export const formatReadingTime = (minutes) => {
  if (minutes === 1) return '1 min read';
  return `${minutes} min read`;
};

