import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

try {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} catch (error) {
  console.error("Root Render Error:", error);
  // Manual fallback if React fails completely
  rootElement.innerHTML = `
    <div style="padding: 2rem; color: #ef4444; background: #0f172a; height: 100vh; display: flex; align-items: center; justify-content: center;">
      <div>
        <h2 style="font-size: 1.5rem; margin-bottom: 1rem;">Startup Error</h2>
        <pre>${error instanceof Error ? error.message : String(error)}</pre>
      </div>
    </div>
  `;
}
