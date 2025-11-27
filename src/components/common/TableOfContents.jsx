import React, { useState, useEffect, useRef } from 'react';
import { List, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

/**
 * Table of Contents component that extracts headings from content
 */
const TableOfContents = ({ content, className = '' }) => {
  const [headings, setHeadings] = useState([]);
  const [activeId, setActiveId] = useState('');
  const [isOpen, setIsOpen] = useState(true);
  const contentRef = useRef(null);

  useEffect(() => {
    if (!content) return;

    // Parse HTML content to extract headings
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, 'text/html');
    const headingElements = doc.querySelectorAll('h1, h2, h3, h4, h5, h6');
    
    const extractedHeadings = Array.from(headingElements).map((heading, index) => {
      const id = heading.id || `heading-${index}`;
      if (!heading.id) {
        heading.id = id;
      }
      return {
        id,
        text: heading.textContent || '',
        level: parseInt(heading.tagName.charAt(1)),
      };
    });

    setHeadings(extractedHeadings);
  }, [content]);

  // Track active heading on scroll
  useEffect(() => {
    if (headings.length === 0) return;

    const observerOptions = {
      root: null,
      rootMargin: '-20% 0px -70% 0px',
      threshold: 0,
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveId(entry.target.id);
        }
      });
    }, observerOptions);

    headings.forEach((heading) => {
      const element = document.getElementById(heading.id);
      if (element) {
        observer.observe(element);
      }
    });

    return () => {
      headings.forEach((heading) => {
        const element = document.getElementById(heading.id);
        if (element) {
          observer.unobserve(element);
        }
      });
    };
  }, [headings]);

  const scrollToHeading = (id) => {
    const element = document.getElementById(id);
    if (element) {
      const offset = 100; // Account for fixed header
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      });
      setActiveId(id);
    }
  };

  if (headings.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className={`bg-surface-subtle border border-[var(--border-subtle)] rounded-xl p-4 ${className}`}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full mb-3 font-semibold text-primary hover:text-[var(--accent)] transition-colors"
        aria-expanded={isOpen}
        aria-label="Toggle table of contents"
      >
        <div className="flex items-center gap-2">
          <List className="w-4 h-4" />
          <span>Table of Contents</span>
        </div>
        <ChevronRight
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-90' : ''}`}
        />
      </button>

      {isOpen && (
        <nav className="space-y-1" aria-label="Table of contents">
          {headings.map((heading) => (
            <button
              key={heading.id}
              onClick={() => scrollToHeading(heading.id)}
              className={`block w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                activeId === heading.id
                  ? 'bg-[var(--accent)]/15 text-[var(--accent)] font-medium'
                  : 'text-secondary hover:bg-surface hover:text-[var(--accent)]'
              }`}
              style={{ paddingLeft: `${(heading.level - 1) * 12 + 12}px` }}
            >
              {heading.text}
            </button>
          ))}
        </nav>
      )}
    </motion.div>
  );
};

export default TableOfContents;

