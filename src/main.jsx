import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './styles/index.css'

try {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    console.error('Fatal: Root element not found');
    throw new Error('Root element not found');
  }

  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
} catch (error) {
  console.error('Fatal error during app initialization:', error);
  
  // Show error on page
  document.body.innerHTML = `
    <div style="padding: 20px; font-family: monospace; background: #fee; border: 2px solid #f00;">
      <h1>Fatal Error</h1>
      <p><strong>Error:</strong> ${error.message}</p>
      <p>Check browser console for more details.</p>
    </div>
  `;
}

