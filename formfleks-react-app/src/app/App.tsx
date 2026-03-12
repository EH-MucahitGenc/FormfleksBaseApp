import { RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { router } from '../router/index';

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false, // In Enterprise apps, don't spam endpoints on tab switch
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <>
        <RouterProvider router={router} />
        <Toaster 
          position="top-right" 
          toastOptions={{
            className: 'text-sm font-medium text-brand-dark',
            success: { iconTheme: { primary: '#4caf50', secondary: '#fff' } },
            error: { iconTheme: { primary: '#f44336', secondary: '#fff' } }
          }} 
        />
      </>
    </QueryClientProvider>
  );
}

export default App;
