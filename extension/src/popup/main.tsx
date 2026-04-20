import { createRoot } from 'react-dom/client';
import { App } from './App.js';

const root = document.getElementById('root');
if (!root) throw new Error('missing #root element in popup.html');
createRoot(root).render(<App />);
