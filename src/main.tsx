import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';
import { Toaster } from 'sonner';

const updateSW = registerSW({
  onNeedRefresh() {},
  onOfflineReady() {},
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Toaster position="top-center" richColors theme="system" />
    <App />
  </StrictMode>,
);
