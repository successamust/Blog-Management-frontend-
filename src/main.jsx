import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './styles/index.css'

// Suppress browser extension errors (MetaMask, uBlock Origin, Web3 wallets, etc.)
if (typeof window !== 'undefined') {
  // Suppress MetaMask and Web3 wallet errors
  const originalError = console.error;
  console.error = (...args) => {
    const errorMessage = args[0]?.toString() || '';
    const fullMessage = args.map(arg => String(arg)).join(' ');
    
    // Suppress MetaMask ethereum provider errors
    if (errorMessage.includes('MetaMask') || 
        (errorMessage.includes('ethereum') && (errorMessage.includes('provider') || errorMessage.includes('redefine') || errorMessage.includes('getter')))) {
      return; // Silently ignore
    }
    // Suppress evmAsk and Web3 wallet injection errors
    if (errorMessage.includes('evmAsk') || 
        errorMessage.includes('Cannot redefine property: ethereum') ||
        errorMessage.includes('Cannot set property ethereum') ||
        fullMessage.includes('evmAsk') ||
        (errorMessage.includes('ethereum') && (errorMessage.includes('redefine') || errorMessage.includes('getter')))) {
      return; // Silently ignore
    }
    // Suppress uBlock Origin errors
    if (errorMessage.includes('uBOL') || errorMessage.includes('uBlock')) {
      return; // Silently ignore
    }
    // Suppress Solana wallet errors
    if (errorMessage.includes('solana') || errorMessage.includes('Solana') || errorMessage.includes('MutationObserver')) {
      return; // Silently ignore
    }
    // Call original console.error for other errors
    originalError.apply(console, args);
  };

  // Suppress unhandled promise rejections from browser extensions
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason?.toString() || '';
    if (reason.includes('MetaMask') || 
        reason.includes('ethereum') || 
        reason.includes('uBOL') ||
        reason.includes('evmAsk') ||
        reason.includes('solana') ||
        reason.includes('Solana') ||
        reason.includes('Cannot redefine property') ||
        reason.includes('Cannot set property ethereum')) {
      event.preventDefault(); // Suppress the error
      return;
    }
  });

  // Suppress errors from browser extensions in error event
  window.addEventListener('error', (event) => {
    const errorMessage = event.message || event.error?.message || '';
    const errorSource = event.filename || '';
    
    if (errorMessage.includes('MetaMask') || 
        errorMessage.includes('ethereum') || 
        errorMessage.includes('uBOL') ||
        errorMessage.includes('evmAsk') ||
        errorMessage.includes('solana') ||
        errorMessage.includes('Solana') ||
        errorMessage.includes('MutationObserver') ||
        errorMessage.includes('Cannot redefine property: ethereum') ||
        errorMessage.includes('Cannot set property ethereum') ||
        errorSource.includes('evmAsk') ||
        errorSource.includes('solana') ||
        errorSource.includes('inpage.js')) {
      event.preventDefault(); // Suppress the error
      return;
    }
  }, true);
}

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

