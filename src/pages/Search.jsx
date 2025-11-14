import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search as SearchIcon, X } from 'lucide-react';
import { searchAPI } from '../services/api';
import toast from 'react-hot-toast';
import ModernPostCard from '../components/posts/ModernPostCard';
import SkeletonLoader from '../components/common/SkeletonLoader';
import { format } from 'date-fns';
import Spinner from '../components/common/Spinner';

const Search = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [tag, setTag] = useState(searchParams.get('tags') || '');
  const [results, setResults] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    const searchQuery = searchParams.get('q') || '';
    const searchTag = searchParams.get('tags') || '';
    
    if (searchQuery || searchTag) {
      performSearch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    if (query.length > 2) {
      fetchSuggestions();
    } else {
      setSuggestions([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const fetchSuggestions = async () => {
    try {
      const response = await searchAPI.getSuggestions(query);
      const suggestionsData = response.data.suggestions || {};
      // Flatten suggestions from different types
      const flattened = [
        ...(suggestionsData.posts || []).map(p => p.title),
        ...(suggestionsData.categories || []).map(c => c.name),
        ...(suggestionsData.tags || []).map(t => t.name)
      ];
      setSuggestions(flattened);
      setShowSuggestions(true);
    } catch (error) {
      setSuggestions([]);
    }
  };

  const performSearch = async () => {
    try {
      setLoading(true);
      const params = {};
      
      if (searchParams.get('q')) {
        params.q = searchParams.get('q');
      }
      if (searchParams.get('tags')) {
        params.tags = searchParams.get('tags');
      }

      const response = await searchAPI.search(params);
      // Backend returns 'results' not 'posts'
      setResults(response.data.results || response.data.posts || []);
    } catch (error) {
      console.error('Error searching:', error);
      toast.error('Failed to perform search');
    } finally {
      setLoading(false);
      setShowSuggestions(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newParams = new URLSearchParams();
    if (query.trim()) {
      newParams.set('q', query.trim());
    }
    if (tag.trim()) {
      newParams.set('tags', tag.trim());
    }
    setSearchParams(newParams);
    performSearch();
  };

  const handleSuggestionClick = (suggestion) => {
    setQuery(suggestion);
    const newParams = new URLSearchParams();
    newParams.set('q', suggestion);
    setSearchParams(newParams);
    setShowSuggestions(false);
  };

  const clearSearch = () => {
    setQuery('');
    setTag('');
    setResults([]);
    setSearchParams({});
  };

  return (
    <div className="bg-page min-h-screen">
      <div className="bg-content">
        <div className="layout-container section-spacing-y">
        {/* Search Header */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="mb-12"
        >
          <h1 className="text-4xl sm:text-5xl font-bold text-primary mb-4 tracking-tight">
            Search
          </h1>
          <p className="text-sm sm:text-base text-muted">
            Find stories, authors, categories, and tags across the publication.
          </p>
        </motion.div>

        {/* Search Form */}
        <motion.form
          onSubmit={handleSubmit}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="mb-10"
        >
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted w-5 h-5" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => query.length > 2 && setShowSuggestions(true)}
                placeholder="Search articles..."
                className="w-full pl-10 pr-4 py-3 bg-surface-subtle border border-[var(--border-subtle)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition-colors"
              />

              {/* Suggestions Dropdown */}
              {showSuggestions && suggestions.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute z-10 w-full mt-2 bg-surface border border-[var(--border-subtle)] rounded-xl shadow-lg max-h-56 overflow-y-auto"
                >
                  {suggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="w-full text-left px-4 py-2 text-sm text-secondary hover:bg-surface-subtle transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </motion.div>
              )}
            </div>

            <div className="flex-1">
              <input
                type="text"
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                placeholder="Filter by tag (optional)"
                className="w-full px-4 py-3 bg-surface-subtle border border-[var(--border-subtle)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition-colors"
              />
            </div>

            <div className="flex gap-2">
              <motion.button
                type="submit"
                disabled={loading}
                whileHover={{ scale: loading ? 1 : 1.04 }}
                whileTap={{ scale: loading ? 1 : 0.96 }}
                className="btn btn-primary disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? 'Searching…' : 'Search'}
              </motion.button>
              {(query || tag) && (
                <motion.button
                  type="button"
                  onClick={clearSearch}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  className="btn btn-outline"
                  aria-label="Clear search"
                >
                  <X className="w-5 h-5" />
                </motion.button>
              )}
            </div>
          </div>
        </motion.form>

        {/* Search Results */}
        {loading ? (
          <SkeletonLoader variant="post-card" count={4} />
        ) : results.length > 0 ? (
          <div className="space-y-10">
            <p className="text-sm text-muted">
              Found {results.length} {results.length === 1 ? 'result' : 'results'}
              {query ? ` for “${query}”` : ''}
              {tag ? ` · Tag: ${tag}` : ''}
            </p>
            {results.map((post, index) => (
              <ModernPostCard key={post._id || post.id || index} post={post} delay={index * 0.05} />
            ))}
          </div>
        ) : (query || tag) ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16 border border-dashed border-[var(--border-subtle)] rounded-2xl bg-surface-subtle"
          >
            <SearchIcon className="w-12 h-12 mx-auto text-muted mb-4" />
            <p className="text-secondary text-lg">No results found.</p>
            <p className="text-sm text-muted mt-2">Try adjusting your keywords or filters.</p>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16 border border-dashed border-[var(--border-subtle)] rounded-2xl bg-surface-subtle"
          >
            <SearchIcon className="w-12 h-12 mx-auto text-muted mb-4" />
            <p className="text-secondary text-lg">Start typing to explore articles.</p>
            <p className="text-sm text-muted mt-2">Search by topic, author, tag, or keyword.</p>
          </motion.div>
        )}
        </div>
      </div>
    </div>
  );
};

export default Search;

