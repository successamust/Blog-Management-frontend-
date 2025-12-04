import React from 'react';
import { Link } from 'react-router-dom';
import BrandWordmark from '../common/BrandWordmark';

const Footer = () => {
  return (
    <footer className="border-t border-[var(--border-subtle)] bg-surface">
      <div className="w-full px-4 sm:px-6 py-8 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="space-y-1">
          <Link to="/" className="inline-flex text-primary hover:text-secondary transition-colors">
            <BrandWordmark variant="footer" />
          </Link>
          <p className="text-sm text-muted">Connect. Create. Discover.</p>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted">
          <a href="mailto:hello@nexus.blog" className="hover:text-primary transition-colors">
            hello@nexus.blog
          </a>
          <span className="hidden md:inline" aria-hidden="true">•</span>
          <span>© {new Date().getFullYear()} Nexus</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
