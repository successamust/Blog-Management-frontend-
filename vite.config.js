import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { removeConsolePlugin } from './vite-plugin-remove-console.js'

export default defineConfig({
  plugins: [
    react(),
    // Remove console.log in production (keeps console.error and console.warn)
    ...(process.env.NODE_ENV === 'production' ? [removeConsolePlugin()] : []),
  ],
  server: {
    port: 3000,
    proxy: {
      '/v1': {
        target: 'https://blog-management-sx5c.onrender.com',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'esbuild',
    target: 'es2015',
    cssCodeSplit: true,
    // Optimize chunk size
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Split node_modules into smaller chunks
          if (id.includes('node_modules')) {
            // React core
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'react-vendor';
            }
            // UI libraries
            if (id.includes('framer-motion') || id.includes('lucide-react')) {
              return 'ui-vendor';
            }
            // Editor libraries
            if (id.includes('quill') || id.includes('react-quill') || id.includes('tiptap')) {
              return 'editor-vendor';
            }
            // Chart libraries
            if (id.includes('recharts')) {
              return 'chart-vendor';
            }
            // Other large vendors
            if (id.includes('axios') || id.includes('socket.io')) {
              return 'network-vendor';
            }
            // Everything else
            return 'vendor';
          }
        },
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          // Preserve email-assets folder structure for email templates
          if (assetInfo.name && assetInfo.name.includes('email-assets')) {
            return `email-assets/[name][extname]`;
          }
          const info = assetInfo.name.split('.');
          const ext = info[info.length - 1];
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
            return `assets/images/[name]-[hash][extname]`;
          }
          if (/woff2?|eot|ttf|otf/i.test(ext)) {
            return `assets/fonts/[name]-[hash][extname]`;
          }
          return `assets/[name]-[hash][extname]`;
        },
      },
    },
  },
  preview: {
    port: 4173,
    strictPort: true,
  },
})