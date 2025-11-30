import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './styles/index.css'

// Diagnostic: Verify JavaScript is executing
console.error('[MAIN] JavaScript is executing');
console.error('[MAIN] React version:', React.version);
console.error('[MAIN] Root element exists:', !!document.getElementById('root'));

// Diagnostic: Check environment
console.error('[MAIN] Environment:', {
  mode: import.meta.env.MODE,
  prod: import.meta.env.PROD,
  dev: import.meta.env.DEV,
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'NOT SET',
});

try {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    console.error('[MAIN] ERROR: Root element not found!');
    throw new Error('Root element not found');
  }

  console.error('[MAIN] Creating React root...');
  const root = ReactDOM.createRoot(rootElement);
  
  console.error('[MAIN] Rendering App component...');
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
  
  console.error('[MAIN] App rendered successfully');
} catch (error) {
  console.error('[MAIN] FATAL ERROR during app initialization:', error);
  console.error('[MAIN] Error stack:', error.stack);
  
  // Show error on page
  document.body.innerHTML = `
    <div style="padding: 20px; font-family: monospace; background: #fee; border: 2px solid #f00;">
      <h1>Fatal Error</h1>
      <p><strong>Error:</strong> ${error.message}</p>
      <pre>${error.stack}</pre>
      <p>Check browser console for more details.</p>
    </div>
  `;
}

