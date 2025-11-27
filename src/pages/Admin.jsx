import React from 'react';
import { Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, FileText, Mail, LayoutDashboard, Folder, UserCheck } from 'lucide-react';
import UserManagement from '../components/admin/UserManagement';
import PostManagement from '../components/admin/PostManagement';
import NewsletterManagement from '../components/admin/NewsletterManagement';
import CategoryManagement from '../components/admin/CategoryManagement';
import AuthorManagement from '../components/admin/AuthorManagement';
import AdminOverview from '../components/admin/AdminOverview';
import { useAuth } from '../context/AuthContext';
import Seo, { DEFAULT_OG_IMAGE } from '../components/common/Seo';

const ADMIN_DESCRIPTION = 'Moderate posts, categories, newsletters, and authors to keep Nexus running smoothly.';

const Admin = () => {
  const location = useLocation();
  const { user, isAdmin } = useAuth();
  const isAuthorOnly = user?.role === 'author' && !isAdmin();

  const normalizePath = (path) => path.replace(/\/+$/, '') || '/';

  const isActive = (path) => {
    const normalizedTarget = normalizePath(path);
    const normalizedCurrent = normalizePath(location.pathname);

    if (normalizedTarget === '/admin') {
      return normalizedCurrent === '/admin';
    }

    return (
      normalizedCurrent === normalizedTarget ||
      normalizedCurrent.startsWith(`${normalizedTarget}/`)
    );
  };

  const tabs = [
    ...(!isAuthorOnly ? [{ id: 'overview', path: '/admin', label: 'Overview', mobileLabel: 'Overview', icon: <LayoutDashboard className="w-4 h-4" /> }] : []),
    ...(!isAuthorOnly ? [{ id: 'users', path: '/admin/users', label: 'Users', mobileLabel: 'Users', icon: <Users className="w-4 h-4" /> }] : []),
    { id: 'posts', path: '/admin/posts', label: 'Posts', mobileLabel: 'Posts', icon: <FileText className="w-4 h-4" /> },
    ...(!isAuthorOnly ? [{ id: 'categories', path: '/admin/categories', label: 'Categories', mobileLabel: 'Categories', icon: <Folder className="w-4 h-4" /> }] : []),
    ...(!isAuthorOnly ? [{ id: 'newsletter', path: '/admin/newsletter', label: 'Newsletter', mobileLabel: 'Newsletter', icon: <Mail className="w-4 h-4" /> }] : []),
    ...(!isAuthorOnly ? [{ id: 'authors', path: '/admin/authors', label: 'Authors', mobileLabel: 'Authors', icon: <UserCheck className="w-4 h-4" /> }] : []),
  ];

  const activeTabMeta = tabs.find((tab) => isActive(tab.path));
  const dashboardLabel = isAuthorOnly ? 'Author' : 'Admin';
  const seoTitleSuffix = activeTabMeta && activeTabMeta.label !== 'Overview' ? ` — ${activeTabMeta.label}` : '';
  const seoTitle = `${dashboardLabel} Dashboard${seoTitleSuffix}`;
  const seoDescription = isAuthorOnly
    ? 'Publish, edit, and organize your Nexus posts from one dashboard.'
    : ADMIN_DESCRIPTION;
  const seoUrl = `${location.pathname}${location.search || ''}`;

  return (
    <>
      <Seo
        title={seoTitle}
        description={seoDescription}
        url={seoUrl}
        image={DEFAULT_OG_IMAGE}
      />
      <div className="bg-page min-h-screen">
    <div className="layout-container-wide py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-primary mb-2">
          <span className="bg-gradient-to-r from-[var(--accent)] via-[#189112] to-[var(--accent-hover)] bg-clip-text text-transparent">
            {isAuthorOnly ? 'Author' : 'Admin'}
          </span> Dashboard
        </h1>
        <p className="text-sm sm:text-base text-muted">
          {isAuthorOnly ? 'Manage your posts' : 'Manage users, posts, categories, and newsletters'}
        </p>
      </div>

      {/* Tabs - Same style as Dashboard */}
      <div className="mb-8">
        <div className="surface-card rounded-2xl p-2 overflow-x-auto">
          <nav className="flex space-x-2 min-w-max">
            {tabs.map((tab) => {
              const isRouteActive = isActive(tab.path);
              return (
                <motion.div
                  key={tab.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                >
                  <Link
                    to={tab.path}
                    className={`flex items-center space-x-1 sm:space-x-2 py-2 sm:py-2.5 px-2 sm:px-4 rounded-xl font-medium text-xs sm:text-sm transition-all whitespace-nowrap ${
                      isRouteActive
                        ? 'bg-[var(--accent)] text-white shadow-[0_16px_35px_rgba(26,137,23,0.25)] hover:text-white'
                        : 'text-secondary hover:text-[var(--accent)] hover:bg-surface-subtle'
                    }`}
                  >
                    {tab.icon}
                    <span className="hidden sm:inline">{tab.label}</span>
                    <span className="sm:hidden">{tab.mobileLabel || tab.label}</span>
                  </Link>
                </motion.div>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div>
        <Routes>
          {!isAuthorOnly && <Route index element={<AdminOverview />} />}
          {isAuthorOnly && <Route index element={<Navigate to="/admin/posts" replace />} />}
          {!isAuthorOnly && <Route path="users" element={<UserManagement />} />}
          <Route path="posts/*" element={<PostManagement />} />
          {!isAuthorOnly && <Route path="categories/*" element={<CategoryManagement />} />}
          {!isAuthorOnly && <Route path="newsletter" element={<NewsletterManagement />} />}
          {!isAuthorOnly && <Route path="authors" element={<AuthorManagement />} />}
          {isAuthorOnly && <Route path="*" element={<Navigate to="/admin/posts" replace />} />}
        </Routes>
      </div>
    </div>
      </div>
    </>
  );
};


export default Admin;

