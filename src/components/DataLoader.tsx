import React from 'react';
import { useDataLoader } from '../hooks/useDataLoader';
import { LoadingSpinner } from './LoadingSpinner';
import { AlertTriangle, RefreshCw, Zap } from 'lucide-react';
import { invalidateInventoryCaches } from '../lib/cache';

interface DataLoaderProps {
  modules: string[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
  errorFallback?: React.ReactNode;
  dependencies?: any[];
}

export function DataLoader({ 
  modules, 
  children, 
  fallback, 
  errorFallback,
  dependencies = []
}: DataLoaderProps) {
  const { isLoading, error, isDataReady, retry } = useDataLoader({
    modules,
    autoLoad: true,
    dependencies
  });

  // Enhanced retry function that clears caches for inventory-related modules
  const handleRetry = () => {
    if (modules.some(m => ['menuItems', 'categories'].includes(m))) {
      console.log('Clearing inventory caches before retry...');
      invalidateInventoryCaches();
    }
    retry();
  };
  // Show optimized loading for real-time views
  const isRealTimeView = modules.some(m => ['orders', 'tables'].includes(m));

  if (error) {
    return (
      errorFallback || (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-red-800 mb-2">Failed to Load Data</h3>
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={retry}
              onClick={handleRetry}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center mx-auto"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </button>
          </div>
        </div>
      )
    );
  }

  if (isLoading || !isDataReady) {
    return (
      fallback || (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            {isRealTimeView ? (
              <div className="relative">
                <div className="animate-pulse bg-gradient-to-r from-purple-500 to-pink-500 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <Zap className="w-8 h-8 text-white" />
                </div>
                <p className="text-lg font-semibold text-gray-700">Loading real-time data...</p>
                <p className="text-gray-500 text-sm">Optimized for speed</p>
              </div>
            ) : (
              <LoadingSpinner size="lg" text="Loading data..." />
            )}
          </div>
        </div>
      )
    );
  }

  return <>{children}</>;
}

interface ViewDataLoaderProps {
  viewName: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function ViewDataLoader({ viewName, children, fallback }: ViewDataLoaderProps) {
  const viewDataMap = {
    menu: ['menuItems', 'categories'],
    tables: ['tables', 'orders'],
    orders: ['orders'],
    kitchen: ['orders'],
    dashboard: ['menuItems', 'categories', 'tables', 'orders']
  };

  const modules = viewDataMap[viewName] || [];

  return (
    <DataLoader modules={modules} fallback={fallback}>
      {children}
    </DataLoader>
  );
}