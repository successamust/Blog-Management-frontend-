import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Tag } from 'lucide-react';

const TagCloud = ({ tags, maxTags = 50, minFontSize = 12, maxFontSize = 24 }) => {
  const processedTags = useMemo(() => {
    if (!tags || tags.length === 0) return [];

    // Count tag occurrences
    const tagCounts = {};
    tags.forEach(tag => {
      const tagName = typeof tag === 'string' ? tag : tag.name || tag;
      tagCounts[tagName] = (tagCounts[tagName] || 0) + 1;
    });

    // Convert to array and sort by count
    const tagArray = Object.entries(tagCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, maxTags);

    // Calculate min and max counts for font size scaling
    const counts = tagArray.map(t => t.count);
    const minCount = Math.min(...counts);
    const maxCount = Math.max(...counts);
    const range = maxCount - minCount || 1;

    // Assign font sizes
    return tagArray.map(tag => ({
      ...tag,
      fontSize: minFontSize + ((tag.count - minCount) / range) * (maxFontSize - minFontSize),
    }));
  }, [tags, maxTags, minFontSize, maxFontSize]);

  if (processedTags.length === 0) {
    return (
      <div className="text-center py-8">
        <Tag className="w-12 h-12 mx-auto text-muted opacity-50 mb-3" />
        <p className="text-sm text-muted">No tags available</p>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2 justify-center">
      {processedTags.map((tag, index) => (
        <motion.div
          key={tag.name}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.02 }}
        >
          <Link
            to={`/tags/${encodeURIComponent(tag.name)}`}
            className="inline-block px-3 py-1.5 bg-[var(--accent)]/10 hover:bg-[var(--accent)]/20 text-[var(--accent)] rounded-full transition-colors"
            style={{ fontSize: `${tag.fontSize}px` }}
          >
            #{tag.name}
            {tag.count > 1 && (
              <span className="ml-1 text-xs opacity-75">({tag.count})</span>
            )}
          </Link>
        </motion.div>
      ))}
    </div>
  );
};

export default TagCloud;

