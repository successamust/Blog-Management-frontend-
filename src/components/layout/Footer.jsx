import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, Heart, Mail } from 'lucide-react';
import { newsletterAPI } from '../../services/api';
import toast from 'react-hot-toast';

const Footer = () => {
  const [email, setEmail] = useState('');
  const [subscribing, setSubscribing] = useState(false);

  const handleSubscribe = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error('Please enter your email');
      return;
    }

    setSubscribing(true);
    try {
      await newsletterAPI.subscribe(email);
      toast.success('Successfully subscribed to newsletter!');
      setEmail('');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to subscribe');
    } finally {
      setSubscribing(false);
    }
  };

  return (
    <footer className="glass-dark border-t border-white/10">
      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          {/* Brand */}
          <div className="col-span-1 sm:col-span-2 lg:col-span-2">
            <Link to="/" className="flex items-center space-x-2 mb-4">
              <img 
                src="/nexus-logo-icon.svg" 
                alt="The Nexus Blog Logo" 
                className="w-8 h-8"
              />
              <span className="text-xl font-bold">The NexusBlog</span>
            </Link>
            <p className="text-slate-300 mb-2 max-w-md text-sm">
              Connecting Ideas Across Worlds
            </p>
            <p className="text-slate-300 mb-4 max-w-md text-sm">
              A modern blogging platform where writers share their stories, 
              knowledge, and experiences with the world.
            </p>
            <div className="flex items-center space-x-2 text-slate-300">
              <Heart className="w-4 h-4" />
              <span>Made with love for the community</span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="text-slate-300 hover:text-white transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/posts" className="text-slate-300 hover:text-white transition-colors">
                  All Posts
                </Link>
              </li>
              <li>
                <Link to="/categories" className="text-slate-300 hover:text-white transition-colors">
                  Categories
                </Link>
              </li>
              <li>
                <Link to="/search" className="text-slate-300 hover:text-white transition-colors">
                  Search
                </Link>
              </li>
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Newsletter</h3>
            <p className="text-slate-300 text-sm mb-4">
              Subscribe to get the latest posts and updates
            </p>
            <form onSubmit={handleSubscribe} className="space-y-2">
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  className="flex-1 px-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl sm:rounded-l-xl sm:rounded-r-none text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-300/50 focus:bg-white/20 text-sm sm:text-base transition-all"
                />
                <motion.button
                  type="submit"
                  disabled={subscribing}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:shadow-lg hover:shadow-indigo-500/25 rounded-xl sm:rounded-l-none sm:rounded-r-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {subscribing ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <Mail className="w-4 h-4" />
                  )}
                </motion.button>
              </div>
            </form>
          </div>
        </div>

        <div className="border-t border-white/10 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-slate-300 text-sm">
            © 2025 The NexusBlog. All rights reserved.
          </p>
          <div className="flex items-center space-x-4 mt-4 md:mt-0">
            <button className="text-slate-300 hover:text-white transition-colors">
              Privacy Policy
            </button>
            <button className="text-slate-300 hover:text-white transition-colors">
              Terms of Service
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;