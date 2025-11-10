import React from 'react';
import { Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { Users, FileText, Mail, LayoutDashboard, Folder, UserCheck } from 'lucide-react';
import UserManagement from '../components/admin/UserManagement';
import PostManagement from '../components/admin/PostManagement';
import NewsletterManagement from '../components/admin/NewsletterManagement';
import CategoryManagement from '../components/admin/CategoryManagement';
import AuthorManagement from '../components/admin/AuthorManagement';
import AdminOverview from '../components/admin/AdminOverview';
import CollapsibleSidebar from '../components/common/CollapsibleSidebar';
import { useAuth } from '../context/AuthContext';

const Admin = () => {
  const location = useLocation();
  const { user, isAdmin } = useAuth();
  const isAuthorOnly = user?.role === 'author' && !isAdmin();

  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-2">
          <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            {isAuthorOnly ? 'Author' : 'Admin'}
          </span> Dashboard
        </h1>
        <p className="text-sm sm:text-base text-slate-600">
          {isAuthorOnly ? 'Manage your posts' : 'Manage users, posts, categories, and newsletters'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-8">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <CollapsibleSidebar defaultCollapsed={false}>
            <nav className="overflow-x-auto">
              <div className="flex lg:flex-col gap-2 min-w-max lg:min-w-0">
              {!isAuthorOnly && (
                <Link
                  to="/admin"
                  className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all whitespace-nowrap ${
                    isActive('/admin') && location.pathname === '/admin'
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/25'
                      : 'text-slate-600 hover:bg-white/50 hover:text-indigo-600'
                  }`}
                >
                  <LayoutDashboard className="w-5 h-5" />
                  <span>Overview</span>
                </Link>
              )}
              {!isAuthorOnly && (
                <Link
                  to="/admin/users"
                  className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all whitespace-nowrap ${
                    isActive('/admin/users')
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/25'
                      : 'text-slate-600 hover:bg-white/50 hover:text-indigo-600'
                  }`}
                >
                  <Users className="w-5 h-5" />
                  <span>Users</span>
                </Link>
              )}
              <Link
                to="/admin/posts"
                className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all whitespace-nowrap ${
                  isActive('/admin/posts')
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/25'
                    : 'text-slate-600 hover:bg-white/50 hover:text-indigo-600'
                }`}
              >
                <FileText className="w-5 h-5" />
                <span>Posts</span>
              </Link>
              {!isAuthorOnly && (
                <Link
                  to="/admin/categories"
                  className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all whitespace-nowrap ${
                    isActive('/admin/categories')
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/25'
                      : 'text-slate-600 hover:bg-white/50 hover:text-indigo-600'
                  }`}
                >
                  <Folder className="w-5 h-5" />
                  <span>Categories</span>
                </Link>
              )}
              {!isAuthorOnly && (
                <Link
                  to="/admin/newsletter"
                  className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all whitespace-nowrap ${
                    isActive('/admin/newsletter')
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/25'
                      : 'text-slate-600 hover:bg-white/50 hover:text-indigo-600'
                  }`}
                >
                  <Mail className="w-5 h-5" />
                  <span>Newsletter</span>
                </Link>
              )}
              {!isAuthorOnly && (
                <Link
                  to="/admin/authors"
                  className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all whitespace-nowrap ${
                    isActive('/admin/authors')
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/25'
                      : 'text-slate-600 hover:bg-white/50 hover:text-indigo-600'
                  }`}
                >
                  <UserCheck className="w-5 h-5" />
                  <span>Authors</span>
                </Link>
              )}
              </div>
            </nav>
          </CollapsibleSidebar>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
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
  );
};


export default Admin;

