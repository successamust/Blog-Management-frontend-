import React, { useEffect, useRef } from 'react';

/**
 * Component to render LaTeX/MathJax equations
 * Requires MathJax to be loaded
 */
const MathRenderer = ({ content, inline = false }) => {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!window.MathJax || !containerRef.current) return;

    const mathElements = containerRef.current.querySelectorAll('.math');
    if (mathElements.length === 0) return;

    window.MathJax.typesetPromise(mathElements).catch((err) => {
      console.error('MathJax rendering error:', err);
    });
  }, [content]);

  if (inline) {
    return <span ref={containerRef} className="math" dangerouslySetInnerHTML={{ __html: content }} />;
  }

  return <div ref={containerRef} className="math" dangerouslySetInnerHTML={{ __html: content }} />;
};

export default MathRenderer;

