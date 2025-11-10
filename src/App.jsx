import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Toaster } from 'react-hot-toast';
import { CheckCircle2, AlertTriangle, Info, Loader2 } from 'lucide-react';
import { AuthProvider } from './context/AuthContext';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import ReadingProgress from './components/common/ReadingProgress';
import PageTransition from './components/common/PageTransition';

import Home from './pages/Home';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';
import Unsubscribe from './pages/auth/Unsubscribe';
import Posts from './pages/Posts';
import PostDetail from './pages/PostDetail';
import Categories from './pages/Categories';
import CategoryPosts from './pages/CategoryPosts';
import Search from './pages/Search';
import Dashboard from './pages/Dashboard';
import Admin from './pages/Admin';
import NotFound from './pages/NotFound';

import ProtectedRoute from './components/common/ProtectedRoute';

import './styles/globals.css';

function AppContent() {
  const location = useLocation();

  const baseToastClasses = 'flex items-start gap-3 w-full max-w-sm rounded-2xl px-4 py-3 sm:px-5 sm:py-4 shadow-xl shadow-indigo-500/10 border border-white/30 bg-white/95 backdrop-blur-md text-slate-900';
  const iconBadgeClasses = 'flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/20 to-purple-50/30 flex flex-col">
      <ReadingProgress />
      <Header />
      <main className="flex-1">
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<PageTransition><Home /></PageTransition>} />
            <Route path="/login" element={<PageTransition><Login /></PageTransition>} />
            <Route path="/register" element={<PageTransition><Register /></PageTransition>} />
            <Route path="/forgot-password" element={<PageTransition><ForgotPassword /></PageTransition>} />
            <Route path="/reset-password" element={<PageTransition><ResetPassword /></PageTransition>} />
            <Route path="/unsubscribe" element={<PageTransition><Unsubscribe /></PageTransition>} />
            <Route path="/posts" element={<PageTransition><Posts /></PageTransition>} />
            <Route path="/posts/:slug" element={<PageTransition><PostDetail /></PageTransition>} />
            <Route path="/categories" element={<PageTransition><Categories /></PageTransition>} />
            <Route path="/categories/:slug" element={<PageTransition><CategoryPosts /></PageTransition>} />
            <Route path="/search" element={<PageTransition><Search /></PageTransition>} />
            
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <PageTransition><Dashboard /></PageTransition>
                </ProtectedRoute>
              } 
            />
            {/* Admin routes - allow authors to access posts management */}
            <Route 
              path="/admin/*" 
              element={
                <ProtectedRoute requireAuthorOrAdmin>
                  <PageTransition><Admin /></PageTransition>
                </ProtectedRoute>
              } 
            />
            
            <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
          </Routes>
        </AnimatePresence>
      </main>
      <Footer />
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4200,
          style: {
            background: 'transparent',
            boxShadow: 'none',
            padding: 0,
          },
          className: `${baseToastClasses} border-l-4 border-indigo-400`,
          icon: (
            <span className={`${iconBadgeClasses} bg-indigo-100 text-indigo-600`}>
              <Info className="h-4 w-4" />
            </span>
          ),
          success: {
            duration: 3600,
            className: `${baseToastClasses} border-l-4 border-emerald-400`,
            icon: (
              <span className={`${iconBadgeClasses} bg-emerald-100 text-emerald-600`}>
                <CheckCircle2 className="h-4 w-4" />
              </span>
            ),
          },
          error: {
            duration: 4800,
            className: `${baseToastClasses} border-l-4 border-rose-500`,
            icon: (
              <span className={`${iconBadgeClasses} bg-rose-100 text-rose-600`}>
                <AlertTriangle className="h-4 w-4" />
              </span>
            ),
          },
          loading: {
            duration: 6000,
            className: `${baseToastClasses} border-l-4 border-amber-400`,
            icon: (
              <span className={`${iconBadgeClasses} bg-amber-100 text-amber-500`}>
                <Loader2 className="h-4 w-4 animate-spin" />
              </span>
            ),
          },
        }}
      />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

export default App;