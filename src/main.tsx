import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import {installStaticHostBridge} from './utils/staticHostBridge';

installStaticHostBridge();

createRoot(document.getElementById('root')!).render(<App />);

