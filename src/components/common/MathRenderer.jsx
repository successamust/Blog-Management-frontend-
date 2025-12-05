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

  // Sanitize content if DOMPurify is available (for user-generated math content)
  const sanitizedContent = typeof window !== 'undefined' && window.DOMPurify
    ? window.DOMPurify.sanitize(content, {
        ALLOWED_TAGS: ['span', 'div', 'math', 'mi', 'mo', 'mn', 'mfrac', 'msup', 'msub', 'mover', 'munder'],
        ALLOWED_ATTR: ['class', 'id', 'data-*'],
      })
    : content;

  if (inline) {
    return <span ref={containerRef} className="math" dangerouslySetInnerHTML={{ __html: sanitizedContent }} />;
  }

  return <div ref={containerRef} className="math" dangerouslySetInnerHTML={{ __html: sanitizedContent }} />;
};

export default MathRenderer;

