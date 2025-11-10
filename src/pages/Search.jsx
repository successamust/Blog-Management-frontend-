import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search as SearchIcon, Calendar, Eye, Heart, X } from 'lucide-react';
import { format } from 'date-fns';
import { searchAPI, postsAPI } from '../services/api';
import toast from 'react-hot-toast';

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
    <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Search Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-2">
          <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Search</span>
        </h1>
        <p className="text-slate-600">Find posts, categories, and tags</p>
      </motion.div>

      {/* Search Form */}
      <motion.form
        onSubmit={handleSubmit}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-8 relative"
      >
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => query.length > 2 && setShowSuggestions(true)}
              placeholder="Search posts..."
              className="w-full pl-10 pr-4 py-3 glass-card rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-300/50 focus:bg-white/90 transition-all"
            />
            
            {/* Suggestions Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute z-10 w-full mt-1 glass-card rounded-xl shadow-xl max-h-60 overflow-y-auto"
              >
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="w-full text-left px-4 py-2 hover:bg-white/50 transition-colors text-slate-700"
                  >
                    {suggestion}
                  </button>
                ))}
              </motion.div>
            )}
          </div>
          
          <div className="flex-1 relative">
            <input
              type="text"
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              placeholder="Filter by tag..."
              className="w-full px-4 py-3 glass-card rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-300/50 focus:bg-white/90 transition-all"
            />
          </div>
          
          <div className="flex gap-2">
            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:shadow-lg hover:shadow-indigo-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
            >
              {loading ? 'Searching...' : 'Search'}
            </motion.button>
            {(query || tag) && (
              <motion.button
                type="button"
                onClick={clearSearch}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-4 py-3 glass-card rounded-xl hover:bg-white/80 transition-all"
              >
                <X className="w-5 h-5 text-slate-600" />
              </motion.button>
            )}
          </div>
        </div>
      </motion.form>

      {/* Search Results */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : results.length > 0 ? (
        <>
          <div className="mb-4">
            <p className="text-gray-600">
              Found {results.length} {results.length === 1 ? 'result' : 'results'}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {results.map((post) => (
              <PostCard key={post._id} post={post} />
            ))}
          </div>
        </>
      ) : (query || tag) ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-16 card-elevated"
        >
          <SearchIcon className="w-16 h-16 mx-auto text-slate-300 mb-4" />
          <p className="text-slate-500 text-lg">No results found</p>
          <p className="text-slate-400 text-sm mt-2">Try different keywords or tags</p>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-16 card-elevated"
        >
          <SearchIcon className="w-16 h-16 mx-auto text-slate-300 mb-4" />
          <p className="text-slate-500 text-lg">Enter a search query to get started</p>
        </motion.div>
      )}
    </div>
  );
};

const PostCard = ({ post }) => (
  <motion.div
    whileHover={{ y: -4 }}
    transition={{ type: 'spring', stiffness: 300 }}
  >
    <Link
      to={`/posts/${post.slug}`}
      className="block group card-elevated card-elevated-hover overflow-hidden"
    >
      {post.featuredImage && (
        <img
          src={post.featuredImage}
          alt={post.title}
          className="w-full h-48 object-cover"
        />
      )}
      <div className="p-6">
        <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-indigo-600 transition-colors line-clamp-2">
          {post.title}
        </h3>
        <div className="relative mb-4 bg-gradient-to-br from-blue-50 to-indigo-50 border-l-4 border-indigo-400 rounded-r-md p-3 shadow-sm group-hover:shadow-md transition-all">
          <p className="text-slate-700 text-sm leading-relaxed line-clamp-3 font-medium">
            {post.excerpt}
          </p>
        </div>
        
        <div className="flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center space-x-4">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {format(new Date(post.publishedAt), 'MMM d, yyyy')}
            </span>
            <span className="flex items-center gap-1">
              <Eye className="w-3 h-3" />
              {post.viewCount || 0}
            </span>
          </div>
          <span className="flex items-center gap-1">
            <Heart className="w-3 h-3" />
            {post.likes?.length || 0}
          </span>
        </div>
      </div>
    </Link>
  </motion.div>
);

export default Search;

