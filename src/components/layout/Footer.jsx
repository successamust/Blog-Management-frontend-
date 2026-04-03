import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="relative mt-auto border-t border-[var(--border-subtle)] bg-[var(--surface-bg)] overflow-hidden">
      <div
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--accent)]/40 to-transparent pointer-events-none"
        aria-hidden
      />
      <div className="w-full px-4 sm:px-6 lg:px-8 py-10 md:py-12 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8">
        <div className="space-y-3 max-w-md">
          <div className="flex justify-center sm:justify-start">
            <Link to="/" className="inline-flex items-center hover:opacity-85 transition-opacity">
              <img
                src="/nexus-logo-footer.svg"
                alt="Nexus"
                className="logo-theme-aware h-9 sm:h-11 md:h-12 w-auto max-w-full object-center"
              />
            </Link>
          </div>
          <p className="font-display text-lg text-[var(--text-primary)] leading-snug">
            Stories worth returning to.
          </p>
          <p className="text-xs sm:text-sm text-muted">Connect. Create. Discover.</p>
        </div>
        <div className="flex flex-col items-start gap-4 sm:items-end lg:items-end">
          <nav className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm" aria-label="Footer">
            <Link to="/contact" className="text-secondary hover:text-[var(--accent)] transition-colors font-medium">
              Contact
            </Link>
            <Link to="/privacy" className="text-secondary hover:text-[var(--accent)] transition-colors font-medium">
              Privacy
            </Link>
            <Link to="/terms" className="text-secondary hover:text-[var(--accent)] transition-colors font-medium">
              Terms
            </Link>
            <a
              href="mailto:hello@nexus.blog"
              className="hover:text-[var(--accent)] transition-colors font-medium"
            >
              hello@nexus.blog
            </a>
          </nav>
          <span className="text-sm text-muted">© {new Date().getFullYear()} Nexus</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
