import React, { useState, useEffect } from 'react';
import { Type, Plus, Minus } from 'lucide-react';
import { useLocalStorage } from '../../hooks/useLocalStorage';

const FontControls = ({ targetSelector = '.prose', className = '' }) => {
  const [fontSize, setFontSize] = useLocalStorage('readingFontSize', 16);
  const [lineHeight, setLineHeight] = useLocalStorage('readingLineHeight', 1.6);

  useEffect(() => {
    const elements = document.querySelectorAll(targetSelector);
    elements.forEach(el => {
      el.style.fontSize = `${fontSize}px`;
      el.style.lineHeight = lineHeight;
    });
  }, [fontSize, lineHeight, targetSelector]);

  return (
    <div className={`flex items-center gap-2 bg-surface-subtle rounded-lg p-2 ${className}`}>
      <Type className="w-4 h-4 text-muted" />
      <div className="flex items-center gap-1">
        <button
          onClick={() => setFontSize(p => Math.max(12, p - 1))}
          className="p-1 hover:bg-surface rounded"
          aria-label="Decrease font size"
        >
          <Minus className="w-4 h-4" />
        </button>
        <span className="text-sm text-secondary w-12 text-center">{fontSize}px</span>
        <button
          onClick={() => setFontSize(p => Math.min(24, p + 1))}
          className="p-1 hover:bg-surface rounded"
          aria-label="Increase font size"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
      <div className="w-px h-6 bg-[var(--border-subtle)] mx-1" />
      <div className="flex items-center gap-1">
        <button
          onClick={() => setLineHeight(p => Math.max(1.2, p - 0.1))}
          className="p-1 hover:bg-surface rounded"
          aria-label="Decrease line height"
        >
          <Minus className="w-4 h-4" />
        </button>
        <span className="text-sm text-secondary w-12 text-center">{lineHeight.toFixed(1)}</span>
        <button
          onClick={() => setLineHeight(p => Math.min(2.5, p + 0.1))}
          className="p-1 hover:bg-surface rounded"
          aria-label="Increase line height"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default FontControls;

