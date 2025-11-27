import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search as SearchIcon, X, Filter, Clock, Calendar, User, Tag as TagIcon } from 'lucide-react';
import { searchAPI } from '../services/api';
import toast from 'react-hot-toast';
import ModernPostCard from '../components/posts/ModernPostCard';
import SkeletonLoader from '../components/common/SkeletonLoader';
import HighlightText from '../components/common/HighlightText';
import { format } from 'date-fns';
import Spinner from '../components/common/Spinner';
import Seo, { DEFAULT_OG_IMAGE } from '../components/common/Seo';
import { useDebounce } from '../hooks/useDebounce';
import { useLocalStorage } from '../hooks/useLocalStorage';

const SEARCH_DESCRIPTION_BASE = 'Search Nexus to find stories, authors, tags, and categories that match your interests.';

const Search = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [tag, setTag] = useState(searchParams.get('tags') || '');
  const [results, setResults] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [searchHistory, setSearchHistory] = useLocalStorage('searchHistory', []);
  const [filters, setFilters] = useState({
    author: searchParams.get('author') || '',
    category: searchParams.get('category') || '',
    dateFrom: searchParams.get('dateFrom') || '',
    dateTo: searchParams.get('dateTo') || '',
  });

  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    const searchQuery = searchParams.get('q') || '';
    const searchTag = searchParams.get('tags') || '';
    
    if (searchQuery || searchTag) {
      performSearch();
    }
  }, [searchParams]);

  useEffect(() => {
    if (debouncedQuery.length > 2) {
      fetchSuggestions();
    } else {
      setSuggestions([]);
    }
  }, [debouncedQuery]);

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
      if (filters.author) {
        params.author = filters.author;
      }
      if (filters.category) {
        params.category = filters.category;
      }
      if (filters.dateFrom) {
        params.dateFrom = filters.dateFrom;
      }
      if (filters.dateTo) {
        params.dateTo = filters.dateTo;
      }

      const response = await searchAPI.search(params);
      // Backend returns 'results' not 'posts'
      setResults(response.data.results || response.data.posts || []);
      
      // Save to search history
      if (query.trim()) {
        const historyItem = {
          query: query.trim(),
          timestamp: Date.now(),
          resultCount: response.data.results?.length || 0,
        };
        setSearchHistory((prev) => {
          const filtered = prev.filter((item) => item.query !== historyItem.query);
          return [historyItem, ...filtered].slice(0, 10); // Keep last 10 searches
        });
      }
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
    if (filters.author) {
      newParams.set('author', filters.author);
    }
    if (filters.category) {
      newParams.set('category', filters.category);
    }
    if (filters.dateFrom) {
      newParams.set('dateFrom', filters.dateFrom);
    }
    if (filters.dateTo) {
      newParams.set('dateTo', filters.dateTo);
    }
    setSearchParams(newParams);
    performSearch();
  };
  
  const handleHistoryClick = (historyItem) => {
    setQuery(historyItem.query);
    const newParams = new URLSearchParams();
    newParams.set('q', historyItem.query);
    setSearchParams(newParams);
    setShowHistory(false);
  };
  
  const clearHistory = () => {
    setSearchHistory([]);
    toast.success('Search history cleared');
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
    setFilters({ author: '', category: '', dateFrom: '', dateTo: '' });
    setSearchParams({});
  };

  const queryString = searchParams.toString();
  const searchQuery = searchParams.get('q') || '';
  const searchTag = searchParams.get('tags') || '';
  const activeFilters = [
    searchQuery ? `keyword “${searchQuery}”` : null,
    searchTag ? `tag “${searchTag}”` : null,
    filters.author ? `author “${filters.author}”` : null,
    filters.category ? `category “${filters.category}”` : null,
    filters.dateFrom ? `from ${format(new Date(filters.dateFrom), 'MMM d, yyyy')}` : null,
    filters.dateTo ? `to ${format(new Date(filters.dateTo), 'MMM d, yyyy')}` : null,
  ].filter(Boolean);
  const seoDescription = activeFilters.length
    ? `${SEARCH_DESCRIPTION_BASE} Currently filtered by ${activeFilters.join(' and ')}.`
    : SEARCH_DESCRIPTION_BASE;
  const seoUrl = queryString ? `/search?${queryString}` : '/search';

  return (
    <>
      <Seo
        title="Search Nexus"
        description={seoDescription}
        url={seoUrl}
        image={DEFAULT_OG_IMAGE}
      />
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
                onFocus={() => {
                  if (query.length > 2) setShowSuggestions(true);
                  if (searchHistory.length > 0) setShowHistory(true);
                }}
                onBlur={() => {
                  setTimeout(() => {
                    setShowSuggestions(false);
                    setShowHistory(false);
                  }, 200);
                }}
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
              
              {/* Search History Dropdown */}
              {showHistory && searchHistory.length > 0 && !showSuggestions && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute z-10 w-full mt-2 bg-surface border border-[var(--border-subtle)] rounded-xl shadow-lg max-h-56 overflow-y-auto"
                >
                  <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border-subtle)]">
                    <span className="text-xs font-semibold text-muted uppercase">Recent Searches</span>
                    <button
                      type="button"
                      onClick={clearHistory}
                      className="text-xs text-[var(--accent)] hover:underline"
                    >
                      Clear
                    </button>
                  </div>
                  {searchHistory.map((item, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleHistoryClick(item)}
                      className="w-full text-left px-4 py-2 text-sm text-secondary hover:bg-surface-subtle transition-colors flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-muted" />
                        <span>{item.query}</span>
                      </div>
                      <span className="text-xs text-muted">{item.resultCount} results</span>
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
          
          {/* Filters Toggle */}
          <div className="flex items-center justify-between mt-4">
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 text-sm text-secondary hover:text-[var(--accent)] transition-colors"
            >
              <Filter className="w-4 h-4" />
              <span>{showFilters ? 'Hide' : 'Show'} Advanced Filters</span>
            </button>
          </div>
        </motion.form>

        {/* Advanced Filters Panel */}
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-8 p-6 bg-surface-subtle border border-[var(--border-subtle)] rounded-xl"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-secondary mb-2">
                  <User className="w-4 h-4 inline mr-1" />
                  Author
                </label>
                <input
                  type="text"
                  value={filters.author}
                  onChange={(e) => setFilters({ ...filters, author: e.target.value })}
                  placeholder="Author name"
                  className="w-full px-3 py-2 bg-white border border-[var(--border-subtle)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary mb-2">
                  <TagIcon className="w-4 h-4 inline mr-1" />
                  Category
                </label>
                <input
                  type="text"
                  value={filters.category}
                  onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                  placeholder="Category name"
                  className="w-full px-3 py-2 bg-white border border-[var(--border-subtle)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary mb-2">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  From Date
                </label>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-[var(--border-subtle)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary mb-2">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  To Date
                </label>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-[var(--border-subtle)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                type="button"
                onClick={() => {
                  setFilters({ author: '', category: '', dateFrom: '', dateTo: '' });
                  const newParams = new URLSearchParams(searchParams);
                  newParams.delete('author');
                  newParams.delete('category');
                  newParams.delete('dateFrom');
                  newParams.delete('dateTo');
                  setSearchParams(newParams);
                }}
                className="text-sm text-secondary hover:text-[var(--accent)]"
              >
                Clear Filters
              </button>
            </div>
          </motion.div>
        )}

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
    </>
  );
};

export default Search;

