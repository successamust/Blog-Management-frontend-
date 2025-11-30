import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Toaster } from 'react-hot-toast';
import { CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { NotificationProvider } from './context/NotificationContext';
import { QueryProvider } from './providers/QueryProvider';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import ReadingProgress from './components/common/ReadingProgress';
import PageTransition from './components/common/PageTransition';
import Spinner from './components/common/Spinner';
import ErrorBoundary from './components/common/ErrorBoundary';
import KeyboardShortcuts from './components/common/KeyboardShortcuts';
import { SkipToContent } from './components/common/Accessibility';
import { useServiceWorker } from './hooks/useServiceWorker';
import BackToTop from './components/common/BackToTop';
import OfflineIndicator from './components/common/OfflineIndicator';

// Lazy load pages for code splitting
const Home = lazy(() => import('./pages/Home'));
const Login = lazy(() => import('./pages/auth/Login'));
const Register = lazy(() => import('./pages/auth/Register'));
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/auth/ResetPassword'));
const Unsubscribe = lazy(() => import('./pages/auth/Unsubscribe'));
const AcceptCollaboration = lazy(() => import('./pages/auth/AcceptCollaboration'));
const Posts = lazy(() => import('./pages/Posts'));
const PostDetail = lazy(() => import('./pages/PostDetail'));
const Categories = lazy(() => import('./pages/Categories'));
const CategoryPosts = lazy(() => import('./pages/CategoryPosts'));
const Search = lazy(() => import('./pages/Search'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Admin = lazy(() => import('./pages/Admin'));
const AuthorProfile = lazy(() => import('./pages/AuthorProfile'));
const TagPage = lazy(() => import('./pages/TagPage'));
const NewsletterArchive = lazy(() => import('./pages/NewsletterArchive'));
const NotFound = lazy(() => import('./pages/NotFound'));

import ProtectedRoute from './components/common/ProtectedRoute';

// Loading fallback component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-page">
    <Spinner size="2xl" />
  </div>
);

import './styles/globals.css';

function AppContent() {
  const location = useLocation();
  
  // Diagnostic: Verify AppContent is rendering
  React.useEffect(() => {
    console.error('[App] AppContent component mounted');
    console.error('[App] Current pathname:', location.pathname);
  }, []);

  useServiceWorker();

  // Track page loads
  React.useEffect(() => {
    const startTime = performance.now();
    const pageName = location.pathname;
    
    const handleLoad = () => {
      const loadTime = performance.now() - startTime;
      import('./utils/performanceMonitor.js').then(({ default: perfMonitor }) => {
        perfMonitor.trackPageLoad(pageName, loadTime);
      });
    };
    
    // Track when page is fully loaded
    if (document.readyState === 'complete') {
      handleLoad();
    } else {
      window.addEventListener('load', handleLoad);
      return () => window.removeEventListener('load', handleLoad);
    }
  }, [location.pathname]);

  const baseToastClasses = 'flex items-start gap-3 w-full max-w-sm rounded-2xl px-4 py-3 sm:px-5 sm:py-4 shadow-xl shadow-[rgba(26,137,23,0.12)] border border-white/30 bg-white/95 backdrop-blur-md text-slate-900';
  const iconBadgeClasses = 'flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold';

  return (
    <ErrorBoundary>
      <SkipToContent />
      <div className="min-h-screen bg-page flex flex-col">
        <ReadingProgress />
        <Header />
        <main id="main-content" className="flex-1" tabIndex={-1}>
          <ErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <AnimatePresence mode="wait">
                <Routes location={location} key={location.pathname}>
                  <Route path="/" element={<PageTransition><Home /></PageTransition>} />
                  <Route path="/login" element={<PageTransition><Login /></PageTransition>} />
                  <Route path="/register" element={<PageTransition><Register /></PageTransition>} />
                  <Route path="/forgot-password" element={<PageTransition><ForgotPassword /></PageTransition>} />
                  <Route path="/reset-password" element={<PageTransition><ResetPassword /></PageTransition>} />
                  <Route path="/unsubscribe" element={<PageTransition><Unsubscribe /></PageTransition>} />
                  <Route path="/collaboration/accept/:invitationId" element={<PageTransition><AcceptCollaboration /></PageTransition>} />
                  <Route path="/posts" element={<PageTransition><Posts /></PageTransition>} />
                  <Route path="/posts/:slug" element={<PageTransition><PostDetail /></PageTransition>} />
                  <Route path="/categories" element={<PageTransition><Categories /></PageTransition>} />
                  <Route path="/categories/:slug" element={<PageTransition><CategoryPosts /></PageTransition>} />
                  <Route path="/authors/:username" element={<PageTransition><AuthorProfile /></PageTransition>} />
                  <Route path="/tags/:tag" element={<PageTransition><TagPage /></PageTransition>} />
                  <Route path="/newsletter/archive" element={<PageTransition><NewsletterArchive /></PageTransition>} />
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
                        <Admin />
                      </ProtectedRoute>
                    } 
                  />
                  
                  <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
                </Routes>
              </AnimatePresence>
            </Suspense>
          </ErrorBoundary>
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
          className: `${baseToastClasses} border-l-4 border-[var(--accent)]/70`,
          icon: (
            <span className={`${iconBadgeClasses} bg-[var(--accent)]/20 text-[var(--accent)]`}>
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
                <Spinner size="sm" tone="warning" />
              </span>
            ),
          },
        }}
      />
      <KeyboardShortcuts />
      <BackToTop />
      <OfflineIndicator />
      </div>
    </ErrorBoundary>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <QueryProvider>
          <AuthProvider>
            <NotificationProvider>
              <Router
                future={{
                  v7_startTransition: true,
                  v7_relativeSplatPath: true,
                }}
              >
                <AppContent />
              </Router>
            </NotificationProvider>
          </AuthProvider>
        </QueryProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;