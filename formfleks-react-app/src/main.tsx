// @ts-nocheck
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@/index.css';
import 'devextreme/dist/css/dx.light.css';
import '@/components/dev-extreme/dx-overrides.css';
import '@/lib/zod-tr'; // Initialize global Zod localization

// DevExtreme Localization
import trMessages from 'devextreme/localization/messages/tr.json';
import { locale, loadMessages } from 'devextreme/localization';
loadMessages(trMessages);
locale(navigator.language || 'tr'); // Fallback to TR, but navigator prefers TR in Turkey. Force TR if needed, or stick to 'tr'
locale('tr');
import App from './app/App.tsx'
import { ErrorBoundary } from './app/ErrorBoundary.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
