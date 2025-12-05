import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { History, Filter, Download, Eye, Lock, User, Shield, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import Spinner from './Spinner';

const AuditLog = ({ userId = null }) => {
  const { isAdmin } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    action: '',
    dateFrom: '',
    dateTo: '',
  });

  useEffect(() => {
    fetchAuditLogs();
  }, [userId, filters]);

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      const { authAPI } = await import('../../services/api');
      const response = userId 
        ? await authAPI.getAuditLogs({ userId, ...filters })
        : await authAPI.getMyAuditLogs(filters);
      setLogs(response.data?.logs || response.data || []);
    } catch (error) {
      // Handle 404 gracefully - endpoint might not be implemented yet
      if (error.response?.status === 404) {
        setLogs([]);
        if (import.meta.env.DEV) {
          console.info('[AuditLog] Endpoint not available yet. Backend may not have implemented audit logging.');
        }
      } else {
        console.error('Error fetching audit logs:', error);
        toast.error('Failed to load audit logs');
      }
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (action) => {
    const iconMap = {
      login: Eye,
      logout: Lock,
      'password_change': Shield,
      'role_change': User,
      '2fa_enabled': Shield,
      '2fa_disabled': Shield,
      'account_locked': AlertTriangle,
    };
    return iconMap[action] || History;
  };

  const getActionColor = (action) => {
    const colorMap = {
      login: 'text-blue-600',
      logout: 'text-gray-600',
      'password_change': 'text-green-600',
      'role_change': 'text-purple-600',
      '2fa_enabled': 'text-green-600',
      '2fa_disabled': 'text-orange-600',
      'account_locked': 'text-red-600',
    };
    return colorMap[action] || 'text-gray-600';
  };

  const formatDate = (dateValue) => {
    if (!dateValue) return 'N/A';
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return 'Invalid Date';
    return format(date, 'MMM d, yyyy HH:mm');
  };

  const formatDateForCSV = (dateValue) => {
    if (!dateValue) return 'N/A';
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return 'Invalid Date';
    return format(date, 'yyyy-MM-dd HH:mm:ss');
  };

  const exportLogs = () => {
    const csv = [
      ['Date', 'Action', 'IP Address', 'User Agent', 'Status'].join(','),
      ...logs.map(log => [
        formatDateForCSV(log.createdAt || log.timestamp),
        log.action,
        log.ipAddress || '',
        log.userAgent || '',
        log.status || 'success',
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-log-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">Security Audit Log</h3>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            {isAdmin() && userId 
              ? `View security activity for user ${userId}`
              : 'View your account security activity'}
          </p>
        </div>
        {isAdmin() && (
          <button
            onClick={exportLogs}
            className="btn btn-outline flex items-center gap-2"
            disabled={logs.length === 0}
            title="Export audit logs (Admin only)"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        )}
      </div>

      <div className="bg-[var(--surface-subtle)] rounded-lg p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
          <Filter className="w-4 h-4" />
          <span>Filters</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <select
            value={filters.action}
            onChange={(e) => setFilters({ ...filters, action: e.target.value })}
            className="px-3 py-2 border border-[var(--border-subtle)] rounded-lg bg-[var(--surface-bg)] text-[var(--text-primary)] text-sm"
          >
            <option value="">All Actions</option>
            <option value="login">Login</option>
            <option value="logout">Logout</option>
            <option value="password_change">Password Change</option>
            <option value="role_change">Role Change</option>
            <option value="2fa_enabled">2FA Enabled</option>
            <option value="2fa_disabled">2FA Disabled</option>
            <option value="account_locked">Account Locked</option>
          </select>
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
            className="px-3 py-2 border border-[var(--border-subtle)] rounded-lg bg-[var(--surface-bg)] text-[var(--text-primary)] text-sm"
            placeholder="From Date"
          />
          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
            className="px-3 py-2 border border-[var(--border-subtle)] rounded-lg bg-[var(--surface-bg)] text-[var(--text-primary)] text-sm"
            placeholder="To Date"
          />
        </div>
      </div>

      <div className="space-y-2">
        {logs.length === 0 ? (
          <div className="text-center py-12 text-[var(--text-muted)]">
            <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No audit logs found</p>
          </div>
        ) : (
          logs.map((log, index) => {
            const Icon = getActionIcon(log.action);
            const colorClass = getActionColor(log.action);

            return (
              <motion.div
                key={log.id || index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-[var(--surface-bg)] border border-[var(--border-subtle)] rounded-lg p-4 flex items-start gap-4"
              >
                <div className={`p-2 rounded-lg bg-[var(--surface-subtle)] ${colorClass}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-[var(--text-primary)] capitalize">
                      {log.action?.replace(/_/g, ' ')}
                    </span>
                    <span className="text-xs text-[var(--text-muted)]">
                      {formatDate(log.createdAt || log.timestamp)}
                    </span>
                  </div>
                  <div className="text-sm text-[var(--text-secondary)] space-y-1">
                    {log.ipAddress && (
                      <p>IP: {log.ipAddress}</p>
                    )}
                    {log.userAgent && (
                      <p className="truncate">Device: {log.userAgent}</p>
                    )}
                    {log.location && (
                      <p>Location: {
                        typeof log.location === 'string' 
                          ? log.location 
                          : log.location.city || log.location.country || 'Unknown'
                      }</p>
                    )}
                  </div>
                </div>
                <div className={`px-2 py-1 rounded text-xs font-medium ${
                  log.status === 'success' 
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300'
                    : 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300'
                }`}>
                  {log.status || 'success'}
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default AuditLog;

