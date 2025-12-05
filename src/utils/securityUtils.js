/**
 * Security Utilities
 * Handles CSRF tokens, request signing, and security headers
 */

const CSRF_TOKEN_KEY = 'nexus_csrf_token';
const CSRF_TOKEN_EXPIRY = 30 * 60 * 1000; // 30 minutes
const REQUEST_SIGNATURE_KEY = 'nexus_request_signature';

let csrfToken = null;
let csrfTokenExpiry = null;

/**
 * Get or fetch CSRF token
 */
export const getCsrfToken = async () => {
  // Check if we have a valid token in memory
  if (csrfToken && csrfTokenExpiry && Date.now() < csrfTokenExpiry) {
    return csrfToken;
  }

  // Check localStorage
  if (typeof localStorage !== 'undefined') {
    const stored = localStorage.getItem(CSRF_TOKEN_KEY);
    const storedExpiry = localStorage.getItem(`${CSRF_TOKEN_KEY}_expiry`);
    
    if (stored && storedExpiry && Date.now() < parseInt(storedExpiry)) {
      csrfToken = stored;
      csrfTokenExpiry = parseInt(storedExpiry);
      return csrfToken;
    }
  }

  // Need to fetch new token
  return null;
};

/**
 * Set CSRF token
 */
export const setCsrfToken = (token) => {
  csrfToken = token;
  csrfTokenExpiry = Date.now() + CSRF_TOKEN_EXPIRY;
  
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(CSRF_TOKEN_KEY, token);
    localStorage.setItem(`${CSRF_TOKEN_KEY}_expiry`, csrfTokenExpiry.toString());
  }
};

/**
 * Clear CSRF token
 */
export const clearCsrfToken = () => {
  csrfToken = null;
  csrfTokenExpiry = null;
  
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(CSRF_TOKEN_KEY);
    localStorage.removeItem(`${CSRF_TOKEN_KEY}_expiry`);
  }
};

/**
 * Fetch CSRF token from backend
 */
export const fetchCsrfToken = async (apiInstance) => {
  try {
    const response = await apiInstance.get('/auth/csrf-token', {
      skipAuthRefresh: true, // Don't trigger refresh on this request
    });
    
    const token = response.data?.csrfToken || response.data?.token;
    if (token) {
      setCsrfToken(token);
      return token;
    }
    return null;
  } catch (error) {
    console.warn('[Security] Failed to fetch CSRF token:', error);
    return null;
  }
};

/**
 * Generate request signature for API request signing
 */
export const generateRequestSignature = (method, url, body, timestamp) => {
  // Create a signature based on method, URL, body, and timestamp
  const payload = `${method.toUpperCase()}|${url}|${JSON.stringify(body || {})}|${timestamp}`;
  
  // In a real implementation, you'd use a secret key from backend
  // For now, we'll use a simple hash (backend should verify this)
  let hash = 0;
  for (let i = 0; i < payload.length; i++) {
    const char = payload.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  return Math.abs(hash).toString(36);
};

/**
 * Get security headers for requests
 */
export const getSecurityHeaders = async (apiInstance) => {
  const headers = {};
  
  // Add CSRF token for state-changing requests
  const csrf = await getCsrfToken();
  if (csrf) {
    headers['X-CSRF-Token'] = csrf;
  }
  
  // Add request timestamp
  const timestamp = Date.now().toString();
  headers['X-Request-Timestamp'] = timestamp;
  
  // Add request ID for tracking
  headers['X-Request-ID'] = `${timestamp}-${Math.random().toString(36).substr(2, 9)}`;
  
  // Add device/browser fingerprint (simplified)
  if (typeof navigator !== 'undefined') {
    headers['X-User-Agent'] = navigator.userAgent;
    headers['X-Platform'] = navigator.platform || 'unknown';
  }
  
  return headers;
};

/**
 * Sanitize input to prevent XSS
 */
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') {
    return input;
  }
  
  // Remove potentially dangerous characters
  return input
    .replace(/[<>]/g, '') // Remove < and >
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
};

/**
 * Validate and sanitize HTML content
 */
export const sanitizeHtml = (html) => {
  if (typeof window === 'undefined' || !window.DOMPurify) {
    // Fallback: basic sanitization
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
  }
  
  // Use DOMPurify if available
  return window.DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'a', 'img', 'blockquote', 'code', 'pre'],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class'],
  });
};

/**
 * Validate file upload
 */
export const validateFileUpload = (file, options = {}) => {
  const {
    maxSize = 5 * 1024 * 1024, // 5MB default
    allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
  } = options;
  
  const errors = [];
  
  // Check file size
  if (file.size > maxSize) {
    errors.push(`File size must be less than ${maxSize / 1024 / 1024}MB`);
  }
  
  // Check file type
  if (!allowedTypes.includes(file.type)) {
    errors.push(`File type ${file.type} is not allowed`);
  }
  
  // Check file extension
  const extension = '.' + file.name.split('.').pop().toLowerCase();
  if (!allowedExtensions.includes(extension)) {
    errors.push(`File extension ${extension} is not allowed`);
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
};

/**
 * Check if password meets security requirements
 */
export const validatePassword = (password, requirements = {}) => {
  const {
    minLength = 8,
    requireUppercase = true,
    requireLowercase = true,
    requireNumbers = true,
    requireSpecialChars = true,
  } = requirements;
  
  const errors = [];
  const checks = {
    length: password.length >= minLength,
    uppercase: !requireUppercase || /[A-Z]/.test(password),
    lowercase: !requireLowercase || /[a-z]/.test(password),
    numbers: !requireNumbers || /[0-9]/.test(password),
    specialChars: !requireSpecialChars || /[!@#$%^&*(),.?":{}|<>]/.test(password),
  };
  
  if (!checks.length) {
    errors.push(`Password must be at least ${minLength} characters long`);
  }
  if (!checks.uppercase) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!checks.lowercase) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!checks.numbers) {
    errors.push('Password must contain at least one number');
  }
  if (!checks.specialChars) {
    errors.push('Password must contain at least one special character');
  }
  
  return {
    valid: errors.length === 0,
    errors,
    strength: calculatePasswordStrength(password),
  };
};

/**
 * Calculate password strength (0-100)
 */
export const calculatePasswordStrength = (password) => {
  let strength = 0;
  
  // Length
  if (password.length >= 8) strength += 20;
  if (password.length >= 12) strength += 10;
  if (password.length >= 16) strength += 10;
  
  // Character variety
  if (/[a-z]/.test(password)) strength += 10;
  if (/[A-Z]/.test(password)) strength += 10;
  if (/[0-9]/.test(password)) strength += 10;
  if (/[^a-zA-Z0-9]/.test(password)) strength += 10;
  
  // Complexity
  const uniqueChars = new Set(password).size;
  if (uniqueChars >= password.length * 0.7) strength += 10;
  
  return Math.min(100, strength);
};

/**
 * Get password strength label
 */
export const getPasswordStrengthLabel = (strength) => {
  if (strength < 30) return { label: 'Weak', color: 'red' };
  if (strength < 60) return { label: 'Fair', color: 'orange' };
  if (strength < 80) return { label: 'Good', color: 'yellow' };
  return { label: 'Strong', color: 'green' };
};

