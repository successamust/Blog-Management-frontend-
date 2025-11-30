import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { authAPI } from '../services/api';
import toast from 'react-hot-toast';
import { getAuthToken, setAuthToken, clearAuthToken } from '../utils/tokenStorage.js';


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
    case 'UPDATE_USER':
      return {
        ...state,
        user: { ...state.user, ...action.payload },
      };
    default:
      return state;
  }
};

const initialState = {
  user: null,
  token: null,
  isAuthenticated: false,
  loading: true,
  error: null,
};

const defaultContextValue = {
  ...initialState,
  login: async () => ({ success: false, error: 'Not initialized' }),
  register: async () => ({ success: false, error: 'Not initialized' }),
  logout: () => {},
  clearError: () => {},
  updateUser: () => {},
  isAdmin: () => false,
  isAuthor: () => false,
  isAuthorOrAdmin: () => false,
  changePassword: async () => ({ success: false, error: 'Not initialized' }),
};

const AuthContext = createContext(defaultContextValue);

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    const verifyUser = async () => {
      const token = getAuthToken();
      const user = localStorage.getItem('user');
      const lastAuthCheck = localStorage.getItem('lastAuthCheck');
      const now = Date.now();
      
      // Throttle auth checks to once per 5 minutes to avoid rate limiting
      // COMMENTED OUT FOR TESTING
      /*
      if (lastAuthCheck && (now - parseInt(lastAuthCheck)) < 300000) {
        const storedUser = JSON.parse(user);
        dispatch({
          type: 'LOGIN_SUCCESS',
          payload: { user: storedUser, token },
        });
        return;
      }
      */
      
      if (token && user) {
        try {
          // COMMENTED OUT FOR TESTING
          /*
          const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
          const makeRequestWithRetry = async (retries = 2) => {
            for (let i = 0; i <= retries; i++) {
              try {
                return await authAPI.getMe();
              } catch (err) {
                if (err.response?.status === 429 && i < retries) {
                  const waitTime = (i + 1) * 1000;
                  await delay(waitTime);
                  continue;
                }
                throw err;
              }
            }
          };

          const response = await makeRequestWithRetry();
          */
          const response = await authAPI.getMe();
          const freshUser = response.data.user;
          localStorage.setItem('lastAuthCheck', now.toString());
          
          const storedUser = JSON.parse(user);
          if (storedUser?.bookmarkedPosts && !freshUser.bookmarkedPosts) {
            freshUser.bookmarkedPosts = storedUser.bookmarkedPosts;
          }
          
          if (storedUser?.createdAt && !freshUser.createdAt) {
            freshUser.createdAt = storedUser.createdAt;
          }
          
          if (storedUser?.profilePicture && !freshUser.profilePicture && !freshUser.avatar) {
            freshUser.profilePicture = storedUser.profilePicture;
          }
          if (storedUser?.avatar && !freshUser.profilePicture && !freshUser.avatar) {
            freshUser.profilePicture = storedUser.avatar;
          }
          
          const savedPosts = JSON.parse(localStorage.getItem('savedPosts') || '[]');
          if (savedPosts.length > 0) {
            if (!freshUser.bookmarkedPosts) {
              freshUser.bookmarkedPosts = [];
            }
            freshUser.bookmarkedPosts = [...new Set([...freshUser.bookmarkedPosts, ...savedPosts])];
          }
          
          localStorage.setItem('user', JSON.stringify(freshUser));
          dispatch({
            type: 'LOGIN_SUCCESS',
            payload: { token, user: freshUser },
          });
        } catch (error) {
          // If rate limited, use cached user data instead of logging out
          if (error.response?.status === 429) {
            const storedUser = JSON.parse(user);
            dispatch({
              type: 'LOGIN_SUCCESS',
              payload: { token, user: storedUser },
            });
          } else {
          clearAuthToken();
            localStorage.removeItem('user');
            localStorage.removeItem('lastAuthCheck');
            dispatch({ type: 'LOGOUT' });
          }
        }
      } else {
        dispatch({ type: 'LOGOUT' });
      }
    };
    
    verifyUser();
  }, []);

  const login = async (credentials) => {
    dispatch({ type: 'LOGIN_START' });
    
    // COMMENTED OUT FOR TESTING
    /*
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    const makeRequestWithRetry = async (retries = 2) => {
      for (let i = 0; i <= retries; i++) {
        try {
          return await authAPI.login(credentials);
        } catch (err) {
          if (err.response?.status === 429 && i < retries) {
            const waitTime = (i + 1) * 1000;
            await delay(waitTime);
            continue;
          }
          throw err;
        }
      }
    };
    */

    try {
      const response = await authAPI.login(credentials);
      const { token, user } = response.data;
      
      setAuthToken(token);
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('lastAuthCheck', Date.now().toString());
      
      dispatch({ type: 'LOGIN_SUCCESS', payload: { token, user } });
      toast.success('Welcome back!');
      return { success: true };
    } catch (error) {
      let message = error.response?.data?.message || 'Login failed';
      // if (error.response?.status === 429) { // COMMENTED OUT FOR TESTING
      //   message = 'Too many login attempts. Please wait a moment and try again.';
      // }
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
      
      setAuthToken(token);
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
    clearAuthToken();
    localStorage.removeItem('user');
    dispatch({ type: 'LOGOUT' });
    toast.success('Logged out successfully');
  };

  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  const updateUser = (userData) => {
    const updatedUser = { ...state.user, ...userData };
    localStorage.setItem('user', JSON.stringify(updatedUser));
    dispatch({ type: 'UPDATE_USER', payload: userData });
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
        updateUser,
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
  if (!context || typeof context.login !== 'function') {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};