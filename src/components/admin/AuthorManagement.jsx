import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, CheckCircle, XCircle, Clock, Search, UserCheck, AlertCircle } from 'lucide-react';
import { authorsAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const AuthorManagement = () => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [reviewingId, setReviewingId] = useState(null);
  const [endpointError, setEndpointError] = useState(false);
  const [reviewData, setReviewData] = useState({
    action: 'approve',
    adminNotes: '',
  });

  useEffect(() => {
    fetchApplications();
  }, [statusFilter]);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      setEndpointError(false);
      const response = await authorsAPI.getApplications({ status: statusFilter }).catch((e) => {
        throw e;
      });

      const raw = response?.data ?? response;
      const list = raw?.applications || raw?.data || (Array.isArray(raw) ? raw : []) || [];

      const normalized = Array.isArray(list)
        ? list.map((item) => ({
            _id: item?._id || item?.id,
            username: item?.username || item?.user?.username || item?.applicant?.username || 'Unknown User',
            email: item?.email || item?.user?.email || item?.applicant?.email || 'unknown@example.com',
            authorApplication: {
              status: (item?.authorApplication?.status || item?.status || 'pending').toLowerCase(),
              message: item?.authorApplication?.message || item?.message || '',
              submittedAt: item?.authorApplication?.submittedAt || item?.createdAt || item?.submittedAt || null,
              adminNotes: item?.authorApplication?.adminNotes || item?.adminNotes || '',
            },
            authorProfile: item?.authorProfile || item?.profile || null,
          }))
        : [];

      setApplications(normalized);
    } catch (error) {
      console.error('Error fetching applications:', error);
      if (error.response?.status === 404) {
        setEndpointError(true);
        toast.error('Author applications endpoint not found. Backend needs to be updated.', {
          duration: 5000,
        });
      } else {
        toast.error(error.response?.data?.message || 'Failed to load author applications');
      }
      setApplications([]);
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (applicationId) => {
    if (!reviewData.action) {
      toast.error('Please select an action');
      return;
    }

    try {
      // Prepare data for backend - only send non-empty fields
      const submitData = {
        status: reviewData.action === 'approve' ? 'approved' : 'rejected',
        adminNotes: reviewData.adminNotes?.trim() || undefined,
      };

      // Remove undefined fields
      Object.keys(submitData).forEach(key => {
        if (submitData[key] === undefined) {
          delete submitData[key];
        }
      });

      await authorsAPI.reviewApplication(applicationId, submitData);
      toast.success(`Application ${reviewData.action}d successfully`);
      setReviewingId(null);
      setReviewData({ action: 'approve', adminNotes: '' });
      fetchApplications();
    } catch (error) {
      console.error('Review application error:', error);
      if (error.response?.status === 400) {
        // Handle validation errors from backend
        const errorData = error.response.data;
        if (errorData.errors && Array.isArray(errorData.errors)) {
          const errorMessages = errorData.errors.map(err => 
            typeof err === 'string' ? err : err.msg || err.message || 'Validation error'
          ).join(', ');
          toast.error(errorMessages);
        } else {
          toast.error(errorData.message || 'Invalid request. Please check your input.');
        }
      } else {
        toast.error(error.response?.data?.message || 'Failed to review application');
      }
    }
  };

  const filteredApplications = applications.filter((app) => {
    const matchesSearch =
      app.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.authorApplication?.message?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-600" />;
      case 'approved':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'rejected':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading && !endpointError) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (endpointError) {
    return (
      <div className="space-y-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-6 h-6 text-yellow-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-yellow-900 mb-2">
                Author Management Endpoint Not Available
              </h3>
              <p className="text-yellow-800 mb-4">
                The author applications endpoint is not available on the backend server. This feature requires the backend to be updated with the author routes.
              </p>
              <div className="bg-white rounded-lg p-4 mb-4">
                <p className="text-sm font-medium text-gray-700 mb-2">To fix this:</p>
                <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
                  <li>Ensure the backend code includes the author routes in <code className="bg-gray-100 px-1 rounded">v1/routes/authors.js</code></li>
                  <li>Restart the backend server to load the new routes</li>
                  <li>If deployed, redeploy the backend with the latest code</li>
                </ol>
              </div>
              <button
                onClick={() => {
                  setEndpointError(false);
                  fetchApplications();
                }}
                className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
              >
                Retry Connection
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Author Applications</h2>
        <p className="text-gray-600">Review and manage author applications</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {applications.filter(a => a.authorApplication?.status === 'pending').length}
              </p>
            </div>
            <Clock className="w-8 h-8 text-yellow-600" />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Approved</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {applications.filter(a => a.authorApplication?.status === 'approved').length}
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Rejected</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {applications.filter(a => a.authorApplication?.status === 'rejected').length}
              </p>
            </div>
            <XCircle className="w-8 h-8 text-red-600" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search applications..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Applications List */}
      <div className="space-y-4">
        {filteredApplications.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <FileText className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">No applications found</p>
          </div>
        ) : (
          filteredApplications.map((application) => (
            <motion.div
              key={application._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{application.username}</h3>
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(
                        application.authorApplication?.status
                      )}`}
                    >
                      {application.authorApplication?.status || 'N/A'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">{application.email}</p>
                  {application.authorApplication?.submittedAt && (
                    <p className="text-xs text-gray-500 mt-1">
                      Submitted: {format(new Date(application.authorApplication.submittedAt), 'PPpp')}
                    </p>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  {getStatusIcon(application.authorApplication?.status)}
                </div>
              </div>

              {application.authorApplication?.message && (
                <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm font-medium text-gray-700 mb-2">Application Message:</p>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">
                    {application.authorApplication.message}
                  </p>
                </div>
              )}

              {application.authorProfile && (
                <div className="mb-4 p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm font-medium text-gray-700 mb-2">Author Profile:</p>
                  {application.authorProfile.bio && (
                    <p className="text-sm text-gray-600 mb-2">
                      <span className="font-medium">Bio:</span> {application.authorProfile.bio}
                    </p>
                  )}
                  {application.authorProfile.expertise && application.authorProfile.expertise.length > 0 && (
                    <p className="text-sm text-gray-600 mb-2">
                      <span className="font-medium">Expertise:</span>{' '}
                      {Array.isArray(application.authorProfile.expertise)
                        ? application.authorProfile.expertise.join(', ')
                        : application.authorProfile.expertise}
                    </p>
                  )}
                  {application.authorProfile.website && (
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Website:</span>{' '}
                      <a
                        href={application.authorProfile.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {application.authorProfile.website}
                      </a>
                    </p>
                  )}
                </div>
              )}

              {application.authorApplication?.adminNotes && (
                <div className="mb-4 p-4 bg-yellow-50 rounded-lg">
                  <p className="text-sm font-medium text-gray-700 mb-2">Admin Notes:</p>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">
                    {application.authorApplication.adminNotes}
                  </p>
                </div>
              )}

              {application.authorApplication?.status === 'pending' && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  {reviewingId === application._id ? (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Action
                        </label>
                        <select
                          value={reviewData.action}
                          onChange={(e) => setReviewData(prev => ({ ...prev, action: e.target.value }))}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="approve">Approve</option>
                          <option value="reject">Reject</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Admin Notes (Optional)
                        </label>
                        <textarea
                          value={reviewData.adminNotes}
                          onChange={(e) => setReviewData(prev => ({ ...prev, adminNotes: e.target.value }))}
                          rows={3}
                          placeholder="Add notes about this application..."
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                        />
                      </div>
                      <div className="flex space-x-3">
                        <button
                          onClick={() => handleReview(application._id)}
                          className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                            reviewData.action === 'approve'
                              ? 'bg-green-600 text-white hover:bg-green-700'
                              : 'bg-red-600 text-white hover:bg-red-700'
                          }`}
                        >
                          {reviewData.action === 'approve' ? 'Approve' : 'Reject'} Application
                        </button>
                        <button
                          onClick={() => {
                            setReviewingId(null);
                            setReviewData({ action: 'approve', adminNotes: '' });
                          }}
                          className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setReviewingId(application._id)}
                      className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-2 px-4 rounded-lg font-medium hover:from-indigo-700 hover:to-purple-700 transition-all"
                    >
                      Review Application
                    </button>
                  )}
                </div>
              )}
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};

export default AuthorManagement;

