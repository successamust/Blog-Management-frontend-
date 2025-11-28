import { useEffect } from 'react';

/**
 * Hook to register service worker for offline support
 */
export const useServiceWorker = () => {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      // Always unregister in development first - do this immediately
      if (!import.meta.env.PROD) {
        // Unregister all service workers immediately
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          if (registrations.length > 0) {
            registrations.forEach((registration) => {
              registration.unregister().catch(() => {
                // Ignore errors during unregistration
              });
            });
          }
        });
        
        // Also try to unregister the controller if it exists
        if (navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
        }
        
        return; // Don't register in development
      }

      // Only register in production
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            console.log('Service Worker registered:', registration.scope);
            
            // Check for updates
            registration.addEventListener('updatefound', () => {
              const newWorker = registration.installing;
              if (newWorker) {
                newWorker.addEventListener('statechange', () => {
                  if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    console.log('New service worker available');
                  }
                });
              }
            });
          })
          .catch((error) => {
            console.error('Service Worker registration failed:', error);
          });
      });

      // Handle service worker updates
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });
    }
  }, []);
};

export default useServiceWorker;

