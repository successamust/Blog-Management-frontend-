import React, { useState, useEffect } from 'react';
import { Users, Shield, UserMinus, Search, UserCheck, PenLine } from 'lucide-react';
import { adminAPI, authorsAPI } from '../../services/api';
import toast from 'react-hot-toast';
import SkeletonLoader from '../common/SkeletonLoader';
import Spinner from '../common/Spinner';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('all');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [usersRes, statsRes] = await Promise.all([
        adminAPI.getUsers({ limit: 1000 }).catch(() => ({ data: { users: [] } })),
        adminAPI.getUserStats().catch(() => ({ data: {} })),
      ]);
      const usersData =
        usersRes.data?.users ||
        usersRes.data?.data ||
        (Array.isArray(usersRes.data) ? usersRes.data : []) ||
        [];
      const usersList = Array.isArray(usersData) ? usersData : [];
      setUsers(usersList);

      // Calculate stats from users list if API doesn't return proper stats
      const statsData = statsRes.data?.stats || statsRes.data || {};
      
      // Calculate from users list
      const totalUsers = usersList.length;
      const totalAdmins = usersList.filter(u => u.role === 'admin' || u.role === 'administrator').length;
      const totalAuthors = usersList.filter(u => u.role === 'author' || u.role === 'writer').length;
      const totalRegularUsers = usersList.filter(u => {
        const role = (u.role || 'user').toLowerCase();
        return role !== 'admin' && role !== 'administrator' && role !== 'author' && role !== 'writer';
      }).length;

      // Use API stats if available, otherwise use calculated stats
      setStats({
        totalUsers: statsData.totalUsers || totalUsers,
        totalAdmins: statsData.totalAdmins || totalAdmins,
        totalAuthors: statsData.totalAuthors || totalAuthors,
        totalRegularUsers: statsData.totalRegularUsers || totalRegularUsers,
      });
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handlePromote = async (userId) => {
    try {
      await adminAPI.promoteUser(userId);
      toast.success('User promoted to admin');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to promote user');
    }
  };

  const handleDemote = async (userId) => {
    try {
      await adminAPI.demoteUser(userId);
      toast.success('User demoted to regular user');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to demote user');
    }
  };

  const handleDemoteToAuthor = async (userId) => {
    try {
      await adminAPI.demoteToAuthor(userId);
      toast.success('Admin demoted to author');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to demote admin to author');
    }
  };

  const handlePromoteToAuthor = async (userId) => {
    try {
      await authorsAPI.promoteToAuthor(userId);
      toast.success('User promoted to author');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to promote user to author');
    }
  };

  const handleDemoteFromAuthor = async (userId) => {
    try {
      await authorsAPI.demoteFromAuthor(userId);
      toast.success('User demoted from author');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to demote user from author');
    }
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    return matchesSearch && matchesRole;
  });

  if (loading) {
    return (
      <SkeletonLoader variant="list" count={6} />
    );
  }

  const hasUsers = filteredUsers.length > 0;

  return (
    <div className="space-y-6">
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-[var(--surface-bg)] rounded-xl shadow-sm border border-[var(--border-subtle)] p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[var(--text-secondary)]">Total Users</p>
                <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">{stats.totalUsers || 0}</p>
              </div>
              <Users className="w-8 h-8 text-[var(--accent)]" />
            </div>
          </div>
          <div className="bg-[var(--surface-bg)] rounded-xl shadow-sm border border-[var(--border-subtle)] p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[var(--text-secondary)]">Admins</p>
                <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">{stats.totalAdmins || 0}</p>
              </div>
              <Shield className="w-8 h-8 text-purple-400" />
            </div>
          </div>
          <div className="bg-[var(--surface-bg)] rounded-xl shadow-sm border border-[var(--border-subtle)] p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[var(--text-secondary)]">Authors</p>
                <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">{stats.totalAuthors || 0}</p>
              </div>
              <PenLine className="w-8 h-8 text-emerald-400" />
            </div>
          </div>
          <div className="bg-[var(--surface-bg)] rounded-xl shadow-sm border border-[var(--border-subtle)] p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[var(--text-secondary)]">Regular Users</p>
                <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">{stats.totalRegularUsers || 0}</p>
              </div>
              <UserMinus className="w-8 h-8 text-blue-400" />
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-[var(--surface-bg)] rounded-xl shadow-sm border border-[var(--border-subtle)] p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--text-muted)] w-5 h-5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search users..."
              className="w-full pl-10 pr-4 py-2 border border-[var(--border-subtle)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent bg-[var(--surface-bg)] text-[var(--text-primary)] placeholder-[var(--text-muted)]"
            />
          </div>
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="px-4 py-2 border border-[var(--border-subtle)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent bg-[var(--surface-bg)] text-[var(--text-primary)]"
          >
            <option value="all">All Roles</option>
            <option value="admin">Admins</option>
            <option value="author">Authors</option>
            <option value="user">Users</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      {hasUsers ? (
        <>
          <div className="hidden md:block bg-[var(--surface-bg)] rounded-xl shadow-sm border border-[var(--border-subtle)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-[var(--border-subtle)]">
                <thead className="bg-[var(--surface-subtle)]">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-[var(--surface-bg)] divide-y divide-[var(--border-subtle)]">
                  {filteredUsers.map((user) => (
                    <tr key={user._id} className="hover:bg-[var(--surface-subtle)]">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-[var(--text-primary)]">{user.username}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-[var(--text-secondary)]">{user.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            user.role === 'admin'
                              ? 'bg-amber-500/15 text-amber-300'
                              : user.role === 'author'
                              ? 'bg-[var(--accent)]/15 text-[var(--accent)]'
                              : 'bg-[var(--surface-subtle)] text-[var(--text-primary)]'
                          }`}
                        >
                          {user.role || 'user'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-3">
                          {user.role === 'admin' ? (
                            <>
                              <button
                                onClick={() => handleDemote(user._id)}
                                className="btn btn-danger !w-auto"
                              >
                                Demote
                              </button>
                              <button
                                onClick={() => handleDemoteToAuthor(user._id)}
                                className="btn btn-danger !w-auto"
                              >
                                Demote to Author
                              </button>
                            </>
                          ) : user.role === 'author' ? (
                            <>
                              <button
                                onClick={() => handlePromote(user._id)}
                                className="btn btn-primary !w-auto"
                              >
                                Promote to Admin
                              </button>
                              <button
                                onClick={() => handleDemoteFromAuthor(user._id)}
                                className="btn btn-danger !w-auto"
                              >
                                Demote from Author
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => handlePromote(user._id)}
                                className="btn btn-primary !w-auto"
                              >
                                Promote to Admin
                              </button>
                              <button
                                onClick={() => handlePromoteToAuthor(user._id)}
                                className="btn btn-outline !w-auto flex items-center gap-2"
                              >
                                <UserCheck className="w-4 h-4" />
                                <span>Promote to Author</span>
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="md:hidden space-y-4">
            {filteredUsers.map((user) => (
              <div
                key={user._id}
                className="bg-[var(--surface-bg)] rounded-xl shadow-sm border border-[var(--border-subtle)] p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold text-[var(--text-primary)]">{user.username}</p>
                    <p className="text-sm text-[var(--text-secondary)] break-words">{user.email}</p>
                  </div>
                  <span
                    className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      user.role === 'admin'
                        ? 'bg-amber-500/15 text-amber-300'
                        : user.role === 'author'
                        ? 'bg-[var(--accent)]/15 text-[var(--accent)]'
                        : 'bg-[var(--surface-subtle)] text-[var(--text-primary)]'
                    }`}
                  >
                    {user.role || 'user'}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {user.role === 'admin' ? (
                    <>
                      <button
                        onClick={() => handleDemote(user._id)}
                        className="btn btn-danger flex-1 min-w-[140px] justify-center"
                      >
                        Demote
                      </button>
                      <button
                        onClick={() => handleDemoteToAuthor(user._id)}
                        className="btn btn-danger flex-1 min-w-[160px] justify-center"
                      >
                        Demote to Author
                      </button>
                    </>
                  ) : user.role === 'author' ? (
                    <>
                      <button
                        onClick={() => handlePromote(user._id)}
                        className="btn btn-primary flex-1 min-w-[160px] justify-center"
                      >
                        Promote to Admin
                      </button>
                      <button
                        onClick={() => handleDemoteFromAuthor(user._id)}
                        className="btn btn-danger flex-1 min-w-[160px] justify-center"
                      >
                        Demote from Author
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => handlePromote(user._id)}
                        className="btn btn-primary flex-1 min-w-[160px] justify-center"
                      >
                        Promote to Admin
                      </button>
                      <button
                        onClick={() => handlePromoteToAuthor(user._id)}
                        className="btn btn-outline flex-1 min-w-[160px] justify-center gap-2"
                      >
                        <UserCheck className="w-4 h-4" />
                        Author
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="bg-[var(--surface-bg)] rounded-xl shadow-sm border border-[var(--border-subtle)]">
          <div className="text-center py-12 text-[var(--text-secondary)]">
            <Users className="w-12 h-12 mx-auto mb-4 text-[var(--text-muted)]" />
            <p>No users found</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;

