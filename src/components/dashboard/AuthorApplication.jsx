import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, CheckCircle, XCircle, Clock, Send, AlertCircle } from 'lucide-react';
import { authorsAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const AuthorApplication = () => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    message: '',
    bio: '',
    expertise: '',
    website: '',
  });
  const [applicationStatus, setApplicationStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user?.authorApplication) {
      setApplicationStatus(user.authorApplication);
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.message.trim()) {
      toast.error('Please provide a reason for wanting to become an author');
      return;
    }

    try {
      setSubmitting(true);
      const response = await authorsAPI.apply(formData);
      setApplicationStatus(response.data.application);
      toast.success(response.data.message || 'Application submitted successfully!');
      setFormData({
        message: '',
        bio: '',
        expertise: '',
        website: '',
      });
    } catch (error) {
      if (error.response?.status === 404) {
        toast.error('Author application endpoint not found. Please ensure the backend is updated.');
      } else {
        toast.error(error.response?.data?.message || 'Failed to submit application');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusIcon = () => {
    if (!applicationStatus) return null;
    
    switch (applicationStatus.status) {
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

  const getStatusText = () => {
    if (!applicationStatus) return null;
    
    switch (applicationStatus.status) {
      case 'pending':
        return 'Your application is pending review';
      case 'approved':
        return 'Your application has been approved! You are now an author.';
      case 'rejected':
        return 'Your application has been rejected';
      default:
        return null;
    }
  };

  const getStatusColor = () => {
    if (!applicationStatus) return '';
    
    switch (applicationStatus.status) {
      case 'pending':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'approved':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'rejected':
        return 'bg-red-50 border-red-200 text-red-800';
      default:
        return '';
    }
  };

  if (user?.role === 'author' || user?.role === 'admin') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
      >
        <div className="flex items-center space-x-3 text-green-600">
          <CheckCircle className="w-6 h-6" />
          <h3 className="text-lg font-semibold">You are already an author!</h3>
        </div>
        <p className="mt-2 text-gray-600">
          You have author privileges and can create and manage posts.
        </p>
      </motion.div>
    );
  }

  if (applicationStatus) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
      >
        <div className={`border rounded-lg p-4 ${getStatusColor()}`}>
          <div className="flex items-center space-x-3 mb-3">
            {getStatusIcon()}
            <h3 className="text-lg font-semibold">{getStatusText()}</h3>
          </div>
          
          {applicationStatus.submittedAt && (
            <p className="text-sm mb-2">
              Submitted: {format(new Date(applicationStatus.submittedAt), 'PPpp')}
            </p>
          )}
          
          {applicationStatus.message && (
            <div className="mt-3">
              <p className="text-sm font-medium mb-1">Your Application:</p>
              <p className="text-sm whitespace-pre-wrap">{applicationStatus.message}</p>
            </div>
          )}
          
          {applicationStatus.reviewedAt && (
            <p className="text-sm mt-3">
              Reviewed: {format(new Date(applicationStatus.reviewedAt), 'PPpp')}
            </p>
          )}
          
          {applicationStatus.adminNotes && (
            <div className="mt-3 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium mb-1">Admin Notes:</p>
              <p className="text-sm whitespace-pre-wrap">{applicationStatus.adminNotes}</p>
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
    >
      <div className="flex items-center space-x-3 mb-6">
        <FileText className="w-6 h-6 text-indigo-600" />
        <h3 className="text-xl font-bold text-gray-900">Apply to Become an Author</h3>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-blue-900 mb-1">Author Benefits</p>
            <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
              <li>Create and publish blog posts</li>
              <li>Manage your own content</li>
              <li>Build your author profile</li>
              <li>Share your expertise with the community</li>
            </ul>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
            Why do you want to become an author? <span className="text-red-500">*</span>
          </label>
          <textarea
            id="message"
            name="message"
            rows={5}
            value={formData.message}
            onChange={handleChange}
            placeholder="Tell us about your motivation, experience, and what you'd like to write about..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
            required
          />
          <p className="mt-1 text-xs text-gray-500">This is required and will be reviewed by our team</p>
        </div>

        <div>
          <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-2">
            Bio (Optional)
          </label>
          <textarea
            id="bio"
            name="bio"
            rows={3}
            value={formData.bio}
            onChange={handleChange}
            placeholder="Tell us about yourself..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
          />
        </div>

        <div>
          <label htmlFor="expertise" className="block text-sm font-medium text-gray-700 mb-2">
            Areas of Expertise (Optional)
          </label>
          <input
            type="text"
            id="expertise"
            name="expertise"
            value={formData.expertise}
            onChange={handleChange}
            placeholder="e.g., Web Development, Design, Marketing"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          <p className="mt-1 text-xs text-gray-500">Comma-separated list of your expertise areas</p>
        </div>

        <div>
          <label htmlFor="website" className="block text-sm font-medium text-gray-700 mb-2">
            Website/Portfolio (Optional)
          </label>
          <input
            type="url"
            id="website"
            name="website"
            value={formData.website}
            onChange={handleChange}
            placeholder="https://yourwebsite.com"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 px-6 rounded-lg font-medium hover:from-indigo-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
        >
          {submitting ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              <span>Submitting...</span>
            </>
          ) : (
            <>
              <Send className="w-5 h-5" />
              <span>Submit Application</span>
            </>
          )}
        </button>
      </form>
    </motion.div>
  );
};

export default AuthorApplication;

