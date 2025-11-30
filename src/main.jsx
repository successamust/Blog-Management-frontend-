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
  
  // Show error on page (safely using textContent to avoid XSS)
  const errorDiv = document.createElement('div');
  errorDiv.style.cssText = 'padding: 20px; font-family: monospace; background: #fee; border: 2px solid #f00;';
  
  const h1 = document.createElement('h1');
  h1.textContent = 'Fatal Error';
  errorDiv.appendChild(h1);
  
  const errorP = document.createElement('p');
  const strong = document.createElement('strong');
  strong.textContent = 'Error: ';
  errorP.appendChild(strong);
  errorP.appendChild(document.createTextNode(String(error.message)));
  errorDiv.appendChild(errorP);
  
  const detailsP = document.createElement('p');
  detailsP.textContent = 'Check browser console for more details.';
  errorDiv.appendChild(detailsP);
  
  document.body.appendChild(errorDiv);
}

