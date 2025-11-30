import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { notificationsAPI } from '../services/api';
import { getAuthToken } from '../utils/tokenStorage';

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [filterType, setFilterType] = useState(null);
  const [settings, setSettings] = useState(null);
  const socketRef = useRef(null);
  const audioContextRef = useRef(null);

  const playNotificationSound = () => {
    try {
      // Reuse AudioContext if available, create new one if needed
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      
      const audioContext = audioContextRef.current;
      
      // Resume context if suspended (required by some browsers)
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }
      
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
      // Silently fail - sound is optional
      console.error('Failed to play notification sound:', error);
    }
  };

  const fetchNotifications = async (page = 1, append = false) => {
    if (!isAuthenticated) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    try {
      const params = { 
        limit: 20, 
        page,
        ...(filterType && { type: filterType })
      };
      const response = await notificationsAPI.getAll(params);
      const newNotifications = response.data.notifications || [];
      
      if (append) {
        setNotifications(prev => [...prev, ...newNotifications]);
      } else {
        setNotifications(newNotifications);
      }
      
      setUnreadCount(response.data.unreadCount || 0);
      setHasMore(response.data.pagination?.hasNext || false);
      setCurrentPage(page);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      if (!append) {
        setNotifications([]);
      }
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  };

  const fetchSettings = async () => {
    if (!isAuthenticated) return;
    
    try {
      const response = await notificationsAPI.getSettings();
      setSettings(response.data.settings);
    } catch (error) {
      console.error('Failed to fetch notification settings:', error);
    }
  };

  // Initialize Socket.io connection
  useEffect(() => {
    if (!isAuthenticated || !user) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    const token = getAuthToken();
    if (!token) return;

    const backendUrl = import.meta.env.VITE_API_BASE_URL 
      ? import.meta.env.VITE_API_BASE_URL.replace('/v1', '').replace(/\/$/, '')
      : window.location.origin;

    // Connect to Socket.io server
    const socket = io(backendUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Socket.io connected for notifications');
    });

    socket.on('disconnect', () => {
      console.log('Socket.io disconnected');
    });

    socket.on('connect_error', (error) => {
      // Only log if it's not a normal connection attempt
      if (error.message && !error.message.includes('xhr poll error')) {
        console.error('Socket.io connection error:', error);
      }
    });

    socket.on('new_notification', (data) => {
      const newNotification = data.notification;
      const shouldPlaySound = data.sound !== false;
      const shouldShowBrowser = data.browser !== false;
      
      setNotifications(prev => [newNotification, ...prev].slice(0, 100));
      setUnreadCount(prev => prev + 1);

      if (shouldShowBrowser && 'Notification' in window && Notification.permission === 'granted') {
        try {
          new Notification(newNotification.title, {
            body: newNotification.message,
            icon: '/nexus-logo-icon.svg',
            tag: newNotification._id,
          });
        } catch (error) {
          console.error('Failed to show browser notification:', error);
        }
      }

      if (shouldPlaySound && (settings?.soundEnabled !== false)) {
        playNotificationSound();
      }
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [isAuthenticated, user?._id]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchSettings();
    }
  }, [isAuthenticated, user?._id]);

  useEffect(() => {
    fetchNotifications(1, false);
  }, [isAuthenticated, user?._id, filterType]);

  const markAsRead = async (notificationId) => {
    try {
      await notificationsAPI.markAsRead(notificationId);
      setNotifications(prev =>
        prev.map(n => 
          n._id === notificationId 
            ? { ...n, read: true, readAt: new Date() }
            : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      setNotifications(prev =>
        prev.map(n => 
          n._id === notificationId 
            ? { ...n, read: true, readAt: new Date() }
            : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  };

  const markAsViewed = async (notificationId) => {
    try {
      await notificationsAPI.markAsViewed(notificationId);
      setNotifications(prev =>
        prev.map(n => 
          n._id === notificationId 
            ? { ...n, viewedAt: new Date() }
            : n
        )
      );
    } catch (error) {
      console.error('Failed to mark notification as viewed:', error);
    }
  };

  const loadMore = () => {
    if (!loading && hasMore) {
      setLoading(true);
      fetchNotifications(currentPage + 1, true);
    }
  };

  const updateSettings = async (newSettings) => {
    try {
      await notificationsAPI.updateSettings(newSettings);
      await fetchSettings();
    } catch (error) {
      console.error('Failed to update notification settings:', error);
      throw error;
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationsAPI.markAllAsRead();
      setNotifications(prev =>
        prev.map(n => ({ ...n, read: true, readAt: new Date() }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all as read:', error);
      setNotifications(prev =>
        prev.map(n => ({ ...n, read: true, readAt: new Date() }))
      );
      setUnreadCount(0);
    }
  };

  const deleteNotification = async (notificationId) => {
    const wasUnread = notifications.find(n => n._id === notificationId)?.read === false;
    
    try {
      await notificationsAPI.delete(notificationId);
      setNotifications(prev => prev.filter(n => n._id !== notificationId));
      if (wasUnread) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Failed to delete notification:', error);
      setNotifications(prev => prev.filter(n => n._id !== notificationId));
      if (wasUnread) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    }
  };

  const clearAll = async () => {
    try {
      await notificationsAPI.deleteAll();
      setNotifications([]);
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to clear all notifications:', error);
      setNotifications([]);
      setUnreadCount(0);
    }
  };

  const refreshNotifications = () => {
    fetchNotifications();
  };

  const value = {
    notifications,
    unreadCount,
    loading,
    hasMore,
    filterType,
    setFilterType,
    settings,
    markAsRead,
    markAsViewed,
    markAllAsRead,
    deleteNotification,
    clearAll,
    refreshNotifications: () => fetchNotifications(1, false),
    loadMore,
    updateSettings,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
