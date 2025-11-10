import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { authAPI } from '../services/api';
import toast from 'react-hot-toast';

const AuthContext = createContext();

const authReducer = (state, action) => {
  switch (action.type) {
    case 'LOGIN_START':
      return { ...state, loading: true };
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        loading: false,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
      };
    case 'LOGIN_FAILURE':
      return { ...state, loading: false, error: action.payload };
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        loading: false,
      };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    default:
      return state;
  }
};

const initialState = {
  user: null,
  token: null,
  isAuthenticated: false,
  loading: false,
  error: null,
};

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    const verifyUser = async () => {
      const token = localStorage.getItem('token');
      const user = localStorage.getItem('user');
      
      if (token && user) {
        try {
          const response = await authAPI.getMe();
          const freshUser = response.data.user;
          
          // Preserve bookmarkedPosts from localStorage if backend doesn't return it
          const storedUser = JSON.parse(user);
          if (storedUser?.bookmarkedPosts && !freshUser.bookmarkedPosts) {
            freshUser.bookmarkedPosts = storedUser.bookmarkedPosts;
          }
          
          // Preserve createdAt from localStorage if backend doesn't return it
          if (storedUser?.createdAt && !freshUser.createdAt) {
            freshUser.createdAt = storedUser.createdAt;
          }
          
          // Preserve profilePicture from localStorage if backend doesn't return it
          if (storedUser?.profilePicture && !freshUser.profilePicture && !freshUser.avatar) {
            freshUser.profilePicture = storedUser.profilePicture;
          }
          if (storedUser?.avatar && !freshUser.profilePicture && !freshUser.avatar) {
            freshUser.profilePicture = storedUser.avatar;
          }
          
          // Also check savedPosts array and merge
          const savedPosts = JSON.parse(localStorage.getItem('savedPosts') || '[]');
          if (savedPosts.length > 0) {
            if (!freshUser.bookmarkedPosts) {
              freshUser.bookmarkedPosts = [];
            }
            // Merge savedPosts with bookmarkedPosts, removing duplicates
            freshUser.bookmarkedPosts = [...new Set([...freshUser.bookmarkedPosts, ...savedPosts])];
          }
          
          localStorage.setItem('user', JSON.stringify(freshUser));
          dispatch({
            type: 'LOGIN_SUCCESS',
            payload: { token, user: freshUser },
          });
        } catch (error) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          dispatch({ type: 'LOGOUT' });
        }
      }
    };
    
    verifyUser();
  }, []);

  const login = async (credentials) => {
    dispatch({ type: 'LOGIN_START' });
    try {
      const response = await authAPI.login(credentials);
      const { token, user } = response.data;
      
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      
      dispatch({ type: 'LOGIN_SUCCESS', payload: { token, user } });
      toast.success('Welcome back!');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Login failed';
      dispatch({ type: 'LOGIN_FAILURE', payload: message });
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const register = async (userData) => {
    dispatch({ type: 'LOGIN_START' });
    try {
      const response = await authAPI.register(userData);
      const { token, user } = response.data;
      
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      
      dispatch({ type: 'LOGIN_SUCCESS', payload: { token, user } });
      toast.success('Account created successfully!');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Registration failed';
      dispatch({ type: 'LOGIN_FAILURE', payload: message });
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    dispatch({ type: 'LOGOUT' });
    toast.success('Logged out successfully');
  };

  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  const isAdmin = () => {
    return state.user?.role === 'admin';
  };

  const isAuthor = () => {
    return state.user?.role === 'author' || state.user?.role === 'admin';
  };

  const isAuthorOrAdmin = () => {
    return state.user?.role === 'author' || state.user?.role === 'admin';
  };

  const changePassword = async (data) => {
    try {
      await authAPI.changePassword(data);
      toast.success('Password changed successfully');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to change password';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        register,
        logout,
        clearError,
        isAdmin,
        isAuthor,
        isAuthorOrAdmin,
        changePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};