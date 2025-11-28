import React from 'react';
import { Share2 } from 'lucide-react';

const ShareCount = ({ count, className = '' }) => {
  if (count === undefined || count === null) return null;

  return (
    <div className={`flex items-center gap-1 text-sm text-muted ${className}`}>
      <Share2 className="w-4 h-4" />
      <span>{count.toLocaleString()}</span>
    </div>
  );
};

export default ShareCount;

