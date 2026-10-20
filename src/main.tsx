import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

const win = window as unknown as Record<string, boolean>;
if (!win.__CRONOSFIDA_MOUNTED__) {
  win.__CRONOSFIDA_MOUNTED__ = true;
  createRoot(document.getElementById('root')!).render(<App />);
}

