import React, { useState, useEffect, useRef } from 'react';
import { User, Mail, Edit2, Save, X, Upload, Camera, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { authAPI, imagesAPI } from '../../services/api';
import toast from 'react-hot-toast';
import ChangePassword from './ChangePassword';

const ProfileSettings = () => {
  const { user, isAuthenticated } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    bio: '',
    profilePicture: '',
  });
  const [originalData, setOriginalData] = useState({
    username: '',
    email: '',
    bio: '',
    profilePicture: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [uploadingPicture, setUploadingPicture] = useState(false);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username || '',
        email: user.email || '',
        bio: user.bio || '',
        profilePicture: user.profilePicture || user.avatar || '',
      });
      setOriginalData({
        username: user.username || '',
        email: user.email || '',
        bio: user.bio || '',
        profilePicture: user.profilePicture || user.avatar || '',
      });
      setLoading(false);
    } else {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          if (parsedUser && (parsedUser._id || parsedUser.id)) {
            setFormData({
              username: parsedUser.username || '',
              email: parsedUser.email || '',
              bio: parsedUser.bio || '',
              profilePicture: parsedUser.profilePicture || parsedUser.avatar || '',
            });
            setOriginalData({
              username: parsedUser.username || '',
              email: parsedUser.email || '',
              bio: parsedUser.bio || '',
              profilePicture: parsedUser.profilePicture || parsedUser.avatar || '',
            });
          }
        } catch (error) {
          console.error('Error parsing stored user:', error);
        }
      }
      setLoading(false);
    }
  }, [user]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setFormData(originalData);
    setIsEditing(false);
  };

  const handlePictureUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    setUploadingPicture(true);
    try {
      const uploadFormData = new FormData();
      uploadFormData.append('image', file);
      const response = await imagesAPI.upload(uploadFormData);
      const imageUrl = response.data.image?.url || response.data.url || response.data.imageUrl;
      
      if (!imageUrl) {
        toast.error('Failed to get image URL from response');
        return;
      }

      setFormData(prev => ({
        ...prev,
        profilePicture: imageUrl,
      }));
      toast.success('Profile picture uploaded successfully');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to upload profile picture');
    } finally {
      setUploadingPicture(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemovePicture = async () => {
    if (!formData.profilePicture) return;

    try {
      // Try to delete the old image from server
      if (formData.profilePicture && !formData.profilePicture.startsWith('data:')) {
        try {
          await imagesAPI.delete(formData.profilePicture);
        } catch (error) {
          console.warn('Could not delete old image:', error);
        }
      }

      setFormData(prev => ({
        ...prev,
        profilePicture: '',
      }));
      toast.success('Profile picture removed');
    } catch (error) {
      console.error('Error removing picture:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const userId = user?._id || user?.id;
    if (!userId) {
      toast.error('User ID not found. Please log in again.');
      return;
    }
    
    setSubmitting(true);

    try {
      const response = await authAPI.updateProfile(userId, formData);
      const updatedUser = response.data.user;
      
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      setOriginalData({
        username: updatedUser.username || '',
        email: updatedUser.email || '',
        bio: updatedUser.bio || '',
        profilePicture: updatedUser.profilePicture || updatedUser.avatar || '',
      });
      
      // Reload page to refresh auth context
      window.location.reload();
      
      toast.success('Profile updated successfully');
      setIsEditing(false);
    } catch (error) {
      console.error('Profile update error:', error);
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !isAuthenticated) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const hasChanges = 
    formData.username !== originalData.username ||
    formData.email !== originalData.email ||
    formData.bio !== originalData.bio ||
    formData.profilePicture !== originalData.profilePicture;

  return (
    <div className="space-y-6">
      {/* Profile Information */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Profile Information</h2>
          {!isEditing ? (
            <button
              onClick={handleEdit}
              className="flex items-center space-x-2 px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm sm:text-base w-full sm:w-auto"
            >
              <Edit2 className="w-4 h-4" />
              <span>Edit Profile</span>
            </button>
          ) : (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
              <button
                onClick={handleCancel}
                className="flex items-center justify-center space-x-2 px-3 sm:px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm sm:text-base"
              >
                <X className="w-4 h-4" />
                <span>Cancel</span>
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || !hasChanges}
                className="flex items-center justify-center space-x-2 px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm sm:text-base"
              >
                <Save className="w-4 h-4" />
                <span>{submitting ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Profile Picture */}
          <div className="flex items-center space-x-6">
            <div className="relative">
              {formData.profilePicture ? (
                <div className="relative group">
                  <img
                    src={formData.profilePicture}
                    alt="Profile"
                    className="w-20 h-20 rounded-full object-cover border-4 border-indigo-100 shadow-lg"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                  <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center border-4 border-indigo-100 shadow-lg hidden">
                    <User className="w-10 h-10 text-white" />
                  </div>
                  {isEditing && (
                    <button
                      type="button"
                      onClick={handleRemovePicture}
                      className="absolute -top-2 -right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 shadow-lg"
                      title="Remove picture"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ) : (
                <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center border-4 border-indigo-100 shadow-lg">
                  <User className="w-10 h-10 text-white" />
                </div>
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-700 mb-2">Profile Picture</p>
              {isEditing ? (
                <div className="space-y-2">
                  <label className="inline-flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 cursor-pointer transition-colors text-sm font-medium">
                    <Camera className="w-4 h-4" />
                    <span>{uploadingPicture ? 'Uploading...' : formData.profilePicture ? 'Change Picture' : 'Upload Picture'}</span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handlePictureUpload}
                      disabled={uploadingPicture}
                      className="hidden"
                    />
                  </label>
                  {formData.profilePicture && (
                    <button
                      type="button"
                      onClick={handleRemovePicture}
                      className="ml-2 inline-flex items-center space-x-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm font-medium"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Remove</span>
                    </button>
                  )}
                  <p className="text-xs text-gray-500">JPG, PNG or GIF. Max size 5MB</p>
                </div>
              ) : (
                <p className="text-sm text-gray-500">
                  {formData.profilePicture ? 'Click Edit to change your profile picture' : 'No profile picture set'}
                </p>
              )}
            </div>
          </div>

          {/* Username */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Username
            </label>
            {isEditing ? (
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  required
                  className="appearance-none relative block w-full pl-10 pr-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Enter username"
                />
              </div>
            ) : (
              <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
                {formData.username || 'Not set'}
              </div>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            {isEditing ? (
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="appearance-none relative block w-full pl-10 pr-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Enter email address"
                />
              </div>
            ) : (
              <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
                {formData.email || 'Not set'}
              </div>
            )}
          </div>

          {/* Bio */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bio
            </label>
            {isEditing ? (
              <textarea
                name="bio"
                value={formData.bio}
                onChange={handleChange}
                rows="4"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="Tell us about yourself..."
              />
            ) : (
              <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 min-h-[100px]">
                {formData.bio || 'No bio added yet'}
              </div>
            )}
          </div>

          {/* Account Info */}
          <div className="pt-6 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Information</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">User ID</span>
                <span className="text-sm font-mono text-gray-900">{user?._id || user?.id || 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Role</span>
                <span className={`text-sm font-semibold px-2 py-1 rounded-full ${
                  user.role === 'admin' 
                    ? 'bg-purple-100 text-purple-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {user.role || 'user'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Member Since</span>
                <span className="text-sm text-gray-900">
                  {(() => {
                    // Try to get createdAt from user object
                    let createdAt = user?.createdAt;
                    
                    // Fallback: try to get from localStorage
                    if (!createdAt) {
                      try {
                        const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
                        createdAt = storedUser?.createdAt;
                      } catch (e) {
                        // Ignore
                      }
                    }
                    
                    // Format the date if available
                    if (createdAt) {
                      return new Date(createdAt).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      });
                    }
                    
                    return 'N/A';
                  })()}
                </span>
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* Change Password Section */}
      <ChangePassword />
    </div>
  );
};

export default ProfileSettings;

