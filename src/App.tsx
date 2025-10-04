import React from 'react';
import { POSPage } from './pages/pos/POSPage';
import { Toaster } from 'react-hot-toast';
import { usePrinterStore } from './store/printerStore';
import { useERPStore } from './store/erpStore';
import { FullPageLoader } from './components/LoadingSpinner';

function App() {
  const [isAppInitializing, setIsAppInitializing] = React.useState(true);
  const [initProgress, setInitProgress] = React.useState(0);

  // Initialize printer store
  React.useEffect(() => {
    const initializeApp = async () => {
      try {
        setInitProgress(25);
        // Initialize stores with minimal data
        usePrinterStore.getState();
        setInitProgress(50);
        useERPStore.getState();
        setInitProgress(75);
        
        // Very minimal delay to ensure stores are ready
        await new Promise(resolve => setTimeout(resolve, 25));
        setInitProgress(100);
      } catch (error) {
        console.error('App initialization error:', error);
      } finally {
        setIsAppInitializing(false);
      }
    };

    initializeApp();
  }, []);

  if (isAppInitializing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-200 border-t-purple-600 mx-auto mb-4"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-6 h-6 bg-purple-600 rounded-full animate-pulse"></div>
            </div>
          </div>
          <p className="text-white text-xl font-bold mb-2">Starting POS System...</p>
          <div className="w-48 bg-gray-700 rounded-full h-2 mx-auto mb-2">
            <div 
              className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${initProgress}%` }}
            ></div>
          </div>
          <p className="text-gray-400 text-sm">{initProgress}% Complete</p>
        </div>
      </div>
    );
  }
  
  return (
    <>
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 3000, // Reduced toast duration
          style: {
            background: '#363636',
            color: '#fff',
            borderRadius: '12px',
            padding: '16px',
            fontSize: '14px',
            fontWeight: '500'
          },
          success: {
            iconTheme: {
              primary: '#10B981',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#EF4444',
              secondary: '#fff',
            },
          },
          loading: {
            iconTheme: {
              primary: '#8B5CF6',
              secondary: '#fff',
            },
          },
        }}
      />
      <POSPage />
    </>
  );
}

export default App;