import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
const { pathname, search, hash } = window.location;

// Keep legacy validation links working when they miss the deployed base path.
if (basePath && basePath !== '/' && pathname.startsWith('/validar/')) {
  window.location.replace(`${basePath}${pathname}${search}${hash}`);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
