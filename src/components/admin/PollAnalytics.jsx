import React, { useState, useEffect } from 'react';
import { BarChart3, Download, TrendingUp, Users, Clock, RefreshCw } from 'lucide-react';
import { pollsAPI } from '../../services/api';
import toast from 'react-hot-toast';
import Spinner from '../common/Spinner';

const PollAnalytics = ({ pollId, onClose }) => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetchAnalytics();
  }, [pollId]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await pollsAPI.getAnalytics(pollId);
      setAnalytics(response.data);
    } catch (error) {
      if (error.response?.status === 404) {
        toast.error('Poll not found');
        // Close modal after a short delay if poll doesn't exist
        setTimeout(() => {
          if (onClose) onClose();
        }, 2000);
      } else if (error.response?.status === 403) {
        toast.error('You do not have permission to view analytics for this poll');
        setTimeout(() => {
          if (onClose) onClose();
        }, 2000);
      } else if (error.response?.status === 401) {
        toast.error('Please login to view analytics');
      } else {
        toast.error('Failed to load poll analytics');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format) => {
    try {
      setExporting(true);
      const response = await pollsAPI.exportResults(pollId, format);
      
      if (format === 'csv') {
        // Handle CSV blob
        const blob = new Blob([response.data], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `poll-${pollId}-results.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } else {
        // Handle JSON
        const dataStr = JSON.stringify(response.data, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `poll-${pollId}-results.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }
      
      toast.success(`Poll results exported as ${format.toUpperCase()}`);
    } catch (error) {
      console.error('Error exporting results:', error);
      if (error.response?.status === 403) {
        toast.error('You do not have permission to export results for this poll');
      } else if (error.response?.status === 401) {
        toast.error('Please login to export poll results');
      } else {
        toast.error('Failed to export poll results');
      }
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Spinner size="sm" />
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="bg-[var(--surface-bg)] rounded-xl shadow-sm border border-[var(--border-subtle)] p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">Poll Analytics</h3>
          {onClose && (
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] rounded-lg transition-colors"
            >
              Close
            </button>
          )}
        </div>
        <div className="text-center py-8 text-[var(--text-secondary)]">
          <p className="mb-2">No analytics data available</p>
          <p className="text-sm text-[var(--text-muted)]">
            This poll may not exist or you may not have permission to view it.
          </p>
        </div>
      </div>
    );
  }

  const { poll, statistics, distribution, recentVotes } = analytics;

  return (
    <div className="bg-[var(--surface-bg)] rounded-xl shadow-sm border border-[var(--border-subtle)] p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-6 h-6 text-[var(--accent)]" />
          <div>
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">Poll Analytics</h3>
            <p className="text-sm text-[var(--text-secondary)]">{poll.question}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchAnalytics}
            className="p-2 hover:bg-[var(--surface-subtle)] rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4 text-[var(--text-secondary)]" />
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => handleExport('csv')}
              disabled={exporting}
              className="px-3 py-1.5 text-sm bg-[var(--accent)] text-white rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              CSV
            </button>
            <button
              onClick={() => handleExport('json')}
              disabled={exporting}
              className="px-3 py-1.5 text-sm bg-[var(--accent)] text-white rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              JSON
            </button>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              Close
            </button>
          )}
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-[var(--surface-subtle)] p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-[var(--accent)]" />
            <span className="text-sm text-[var(--text-secondary)]">Total Votes</span>
          </div>
          <p className="text-2xl font-bold text-[var(--text-primary)]">{statistics.totalVotes}</p>
        </div>
        <div className="bg-[var(--surface-subtle)] p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-[var(--accent)]" />
            <span className="text-sm text-[var(--text-secondary)]">Unique Voters</span>
          </div>
          <p className="text-2xl font-bold text-[var(--text-primary)]">{statistics.uniqueVoters}</p>
        </div>
        <div className="bg-[var(--surface-subtle)] p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <RefreshCw className="w-4 h-4 text-[var(--accent)]" />
            <span className="text-sm text-[var(--text-secondary)]">Vote Changes</span>
          </div>
          <p className="text-2xl font-bold text-[var(--text-primary)]">{statistics.voteChanges}</p>
        </div>
        <div className="bg-[var(--surface-subtle)] p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-[var(--accent)]" />
            <span className="text-sm text-[var(--text-secondary)]">Avg per Voter</span>
          </div>
          <p className="text-2xl font-bold text-[var(--text-primary)]">{statistics.averageVotesPerVoter}</p>
        </div>
      </div>

      {/* Vote Distribution by Option */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Votes by Option</h4>
        <div className="space-y-2">
          {Object.entries(distribution.byOption).map(([optionId, count]) => {
            const total = statistics.totalVotes;
            const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : 0;
            return (
              <div key={optionId} className="bg-[var(--surface-subtle)] p-3 rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-[var(--text-primary)]">{optionId}</span>
                  <span className="text-sm font-semibold text-[var(--text-secondary)]">
                    {count} ({percentage}%)
                  </span>
                </div>
                <div className="w-full bg-[var(--surface-bg)] rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full bg-[var(--accent)] transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Votes */}
      {recentVotes && recentVotes.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Recent Votes</h4>
          <div className="bg-[var(--surface-subtle)] rounded-lg overflow-hidden">
            <div className="max-h-64 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-[var(--surface-bg)] sticky top-0">
                  <tr>
                    <th className="text-left p-3 text-[var(--text-secondary)] font-medium">User</th>
                    <th className="text-left p-3 text-[var(--text-secondary)] font-medium">Option</th>
                    <th className="text-left p-3 text-[var(--text-secondary)] font-medium">Voted At</th>
                    <th className="text-left p-3 text-[var(--text-secondary)] font-medium">Changes</th>
                  </tr>
                </thead>
                <tbody>
                  {recentVotes.map((vote, index) => (
                    <tr key={index} className="border-t border-[var(--border-subtle)]">
                      <td className="p-3 text-[var(--text-primary)]">
                        {vote.user?.username || vote.user?.email || 'Anonymous'}
                      </td>
                      <td className="p-3 text-[var(--text-secondary)]">{vote.optionText}</td>
                      <td className="p-3 text-[var(--text-secondary)]">
                        {new Date(vote.votedAt).toLocaleString()}
                      </td>
                      <td className="p-3 text-[var(--text-secondary)]">{vote.changeCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PollAnalytics;

