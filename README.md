# Nexus - Frontend

A modern, responsive blog management platform with newsletter functionality built with React and Vite. Features comprehensive security, real-time updates, and a beautiful user interface.

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Security Features](#-security-features)
- [Prerequisites](#-prerequisites)
- [Installation](#-installation)
- [Development](#-development)
- [Project Structure](#-project-structure)
- [API Configuration](#-api-configuration)
- [Production Deployment](#-production-deployment)
- [Available Scripts](#-available-scripts)
- [Contributing](#-contributing)

## ✨ Features

### 🔐 Authentication & Authorization
  - User registration and login
  - Password reset functionality
- Two-Factor Authentication (2FA) with TOTP
- Refresh token system with automatic rotation
  - Role-based access control (Admin, Author, User)
  - Protected routes
- Session management
- Account lockout protection

### 📝 Blog Management
  - Create, edit, and delete posts
- Rich text editor with TipTap (formerly Quill)
  - Markdown support
  - Post categories and tags
  - Post search and filtering
- Post scheduling
- Post templates
- Post versioning
- Post collaboration
- Polls integration
- Reading time calculation
- Fullscreen reader mode

### 👥 User Management
  - User profiles and settings
  - Author applications
- Follow/unfollow authors
  - Admin dashboard
  - User statistics
- Reading history
- Bookmarks
- Reading lists

### 📧 Newsletter System
  - Subscribe/unsubscribe functionality
  - Newsletter management (Admin)
  - Email notifications for new posts
- Newsletter archive
- Double opt-in subscription

### 📊 Analytics & Dashboard
  - User dashboard with statistics
  - Admin overview
  - Post analytics
- Poll analytics
- Advanced analytics with charts
  - Interaction tracking (likes, shares, comments)
- Reading progress tracking
- Performance monitoring

### 🎨 UI/UX
  - Modern, responsive design
  - Smooth animations with Framer Motion
  - Dark/light theme support
  - Mobile-first approach
- PWA support
- Offline functionality
- Keyboard shortcuts
- Accessibility features
- Multi-language support (i18n)
- Font controls
- Reading progress indicator

### 🔒 Security Features
- CSRF token protection
- XSS prevention (DOMPurify)
- Input sanitization
- Password strength validation
- Account lockout handling
- Session timeout management
- Security audit logs
- Rate limiting handling
- Secure token storage

## 🛠 Tech Stack

- **Framework:** React 18.2.0
- **Build Tool:** Vite 6.4.1
- **Routing:** React Router DOM 6.20.0
- **Styling:** Tailwind CSS 3.3.6
- **Animations:** Framer Motion 12.23.24
- **HTTP Client:** Axios 1.6.2
- **Rich Text Editor:** TipTap 3.10.4
- **Charts:** Recharts 3.3.0
- **Icons:** Lucide React 0.294.0
- **Notifications:** React Hot Toast 2.4.0
- **Date Handling:** date-fns 2.29.0
- **Markdown:** react-markdown 8.0.7
- **State Management:** React Query (TanStack Query) 5.90.11
- **Real-time:** Socket.io Client 4.8.1
- **Security:** DOMPurify 3.3.0
- **Code Highlighting:** Prism.js, Highlight.js, Lowlight

## 🔒 Security Features

### Authentication Security
- JWT access tokens (1-hour expiry)
- Refresh tokens (7-day expiry, auto-rotation)
- Two-Factor Authentication (TOTP)
- Password strength validation
- Account lockout after failed attempts
- Session management and timeout

### Request Security
- CSRF token protection
- Automatic token refresh
- Request sanitization
- XSS prevention
- Security headers
- Rate limiting handling

### Data Security
- Secure token storage (cookies, localStorage, sessionStorage)
- Input sanitization
- HTML content sanitization (DOMPurify)
- No sensitive data in logs
- Secure error handling

## 📦 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 18.0.0 or higher
- **npm** 9.0.0 or higher (or yarn/pnpm)
- **Git** (for cloning the repository)

## 📥 Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd "Blog Management with Newsletter (Frontend)"
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   
   For development, the API proxy is configured in `vite.config.js`. No `.env` file is needed for local development.
   
   For production, create a `.env.production` file:
   ```bash
   VITE_API_BASE_URL=https://your-backend-url.com/v1
   ```

## 🚀 Development

1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **Open your browser:**
   Navigate to `http://localhost:3000`

The development server will automatically reload when you make changes to the code.

## 📁 Project Structure

```
src/
├── components/          # Reusable components
│   ├── admin/          # Admin-specific components
│   ├── auth/           # Authentication components
│   ├── common/         # Shared/common components
│   ├── dashboard/      # Dashboard components
│   ├── layout/         # Layout components (Header, Footer)
│   └── posts/          # Post-related components
├── context/            # React Context providers
│   ├── AuthContext.jsx # Authentication context
│   ├── NotificationContext.jsx # Notifications context
│   └── ThemeContext.jsx # Theme context
├── hooks/              # Custom React hooks
├── pages/              # Page components
│   ├── auth/          # Authentication pages
│   ├── Admin.jsx      # Admin dashboard
│   ├── Dashboard.jsx  # User dashboard
│   ├── Home.jsx       # Homepage
│   └── ...
├── providers/          # React providers
│   └── QueryProvider.jsx # React Query provider
├── services/          # API services
│   └── api.js         # Axios configuration and API endpoints
├── styles/            # Global styles
│   ├── globals.css    # Global CSS
│   └── index.css      # Main CSS file
└── utils/             # Utility functions
    ├── securityUtils.js # Security utilities
    ├── refreshToken.js # Token refresh logic
    ├── tokenStorage.js # Token storage
    ├── sessionManager.js # Session management
    └── ...
```

## 🔌 API Configuration

The frontend connects to a backend API. Configure the base URL via environment variables.

### How It Works

The API base URL is configured in `src/services/api.js`:

```javascript
const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/v1';
```

**Development (Local):**
- Uses the proxy in `vite.config.js` which forwards `/v1` requests to your backend
- No environment variable needed for local development

**Production:**
- Requires `VITE_API_BASE_URL` environment variable
- Set to your backend API URL (e.g., `https://your-backend.com/v1`)
- Can be set in `.env.production` file or in your hosting platform's environment variables

### Example API Endpoints

All API endpoints are constructed as: `BASE_URL + endpoint`

- Login: `/auth/login`
- Get Posts: `/posts`
- Get Post by Slug: `/posts/:slug`
- Create Post: `/posts/create`
- Categories: `/categories`

## 🚢 Production Deployment

### Quick Start

1. **Set Environment Variable**

   **Option A: Create `.env.production` file** (for local builds)
   ```bash
   VITE_API_BASE_URL=https://your-backend-url.com/v1
   ```

   **Option B: Set in hosting platform** (recommended for CI/CD)
   - Vercel: Project Settings → Environment Variables
   - Netlify: Site Settings → Environment Variables
   - Add: `VITE_API_BASE_URL` = `https://your-backend-url.com/v1`

2. **Build for Production:**
   ```bash
   npm run build:prod
   ```

3. **Test Locally:**
   ```bash
   npm run preview:prod
   # Visit http://localhost:4173
   ```

4. **Deploy:**

   **Vercel:**
   ```bash
   npm i -g vercel
   vercel login
   vercel --prod
   ```

   **Netlify:**
   ```bash
   npm i -g netlify-cli
   netlify login
   netlify init
   netlify deploy --prod
   ```

   **Static Hosting:**
   Upload the contents of the `dist/` folder to your hosting service.

### Build Information

**Current Build Status:** ✅ Success
- **Build Size:** ~1.1 MB (uncompressed) / ~309 KB (gzipped)
- **Build Time:** ~5.2 seconds
- **Location:** `dist/` directory

**Optimizations Applied:**
- ✅ Code splitting (vendor chunks)
- ✅ Minification (esbuild)
- ✅ Tree shaking
- ✅ CSS code splitting
- ✅ Asset optimization
- ✅ SEO meta tags (Open Graph, Twitter Cards)
- ✅ SPA routing support (`vercel.json`, `public/_redirects`)
- ✅ `robots.txt` for search engines
- ✅ Console log removal (production)

### Post-Deployment Checklist

1. **Update Meta Tags** in `index.html` with your actual domain:
   - `og:url` - Your production URL
   - `twitter:url` - Your production URL
   - `og:image` - Your production logo URL
   - `twitter:image` - Your production logo URL

2. **Verify Deployment:**
   - [ ] Visit your production URL
   - [ ] Test all major features
   - [ ] Verify API connection works
   - [ ] Test on mobile devices
   - [ ] Check browser console for errors
   - [ ] Test authentication flow
   - [ ] Test 2FA (if enabled)
   - [ ] Verify security features

3. **Performance Check:**
   - [ ] Run Lighthouse audit
   - [ ] Check page load times
   - [ ] Verify bundle sizes

### Troubleshooting

**Build Fails:**
- Check Node.js version (should be 18+)
- Clear cache: `rm -rf node_modules dist && npm install && npm run build:prod`

**API Connection Issues:**
- Verify `VITE_API_BASE_URL` is set correctly
- Check backend CORS settings
- Test API endpoint directly

**Routing Issues (404 on refresh):**
- Vercel: `vercel.json` already configured ✅
- Netlify: `public/_redirects` already configured ✅
- Other platforms: Configure to serve `index.html` for all routes

**Authentication Issues:**
- Verify backend is running
- Check token storage in browser DevTools
- Verify CSRF token is being fetched
- Check network tab for API errors

## 📜 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run build:prod` | Build for production (explicit mode) |
| `npm run preview` | Preview production build locally |
| `npm run preview:prod` | Preview production build (explicit mode) |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Run ESLint and fix issues |
| `npm run export:logos` | Export logo assets |

## 🔒 Security Best Practices

- ✅ All sensitive data stored securely
- ✅ No hardcoded secrets
- ✅ Environment variables for configuration
- ✅ CSRF protection enabled
- ✅ XSS prevention (DOMPurify)
- ✅ Input sanitization
- ✅ Secure token storage
- ✅ No sensitive data in logs
- ✅ Production console log removal

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is private and proprietary.

## 📞 Support

For issues or questions:
- Review the backend repository for API documentation
- Check the troubleshooting section above for common issues
- See `SECURITY_ARCHITECTURE.md` for security details

---

**Happy Coding 🫡**
