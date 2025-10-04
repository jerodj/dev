import { useState, useEffect, useCallback } from 'react';
import { usePOSStore } from '../store/posStore';
import { performanceMonitor } from '../pages/pos/utils/performance';
import { invalidateInventoryCaches } from '../lib/cache';

interface UseDataLoaderOptions {
  modules: string[];
  autoLoad?: boolean;
  dependencies?: any[];
  subscribeToInventoryUpdates?: boolean;
}

export function useDataLoader({ modules, autoLoad = true, dependencies = [], subscribeToInventoryUpdates = false }: UseDataLoaderOptions) {
  const { dataLoaded, fetchDataLazy, subscribeToInventoryUpdates: subscribe, lastInventoryUpdate } = usePOSStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Subscribe to inventory updates if requested
  useEffect(() => {
    if (!subscribeToInventoryUpdates) return;
    
    const handleInventoryUpdate = () => {
      console.log('[useDataLoader] Inventory update received, refreshing modules:', modules);
      // If we're loading menu-related modules, force refresh
      if (modules.some(m => ['menuItems', 'categories'].includes(m))) {
        loadData(true);
      }
    };

    // Subscribe to inventory updates through the store
    const unsubscribe = subscribe(handleInventoryUpdate);
    
    return unsubscribe;
  }, [modules, subscribeToInventoryUpdates, subscribe]);
  
  const loadData = useCallback(async (forceRefresh = false) => {
    const modulesToLoad = modules.filter(module => !dataLoaded[module]);
    
    if (modulesToLoad.length === 0 && !forceRefresh) {
      return; // All modules already loaded
    }

    const loadModules = forceRefresh ? modules : modulesToLoad;
    performanceMonitor.start(`load-${loadModules.join('-')}`);
    setIsLoading(true);
    setError(null);
    
    try {
      // Invalidate caches if force refresh and dealing with inventory-related modules
      if (forceRefresh && modules.some(m => ['menuItems', 'categories'].includes(m))) {
        invalidateInventoryCaches();
      }
      
      await fetchDataLazy(loadModules);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load data';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
      performanceMonitor.end(`load-${loadModules.join('-')}`);
    }
  }, [modules, dataLoaded, fetchDataLazy, lastInventoryUpdate]);

  useEffect(() => {
    if (autoLoad) {
      loadData();
    }
  }, [autoLoad, loadData, lastInventoryUpdate, ...dependencies]);

  const isDataReady = modules.every(module => dataLoaded[module]);

  return {
    isLoading,
    error,
    isDataReady,
    loadData,
    retry: () => loadData(true)
  };
}

export function useViewDataLoader(viewName: string, subscribeToInventoryUpdates = false) {
  const viewDataMap = {
    menu: ['menuItems', 'categories'],
    tables: ['tables', 'orders'],
    orders: ['orders'],
    kitchen: ['orders'],
    dashboard: ['menuItems', 'categories', 'tables', 'orders'],
    admin: [] // Admin loads data on demand
  };

  return useDataLoader({
    modules: viewDataMap[viewName] || [],
    autoLoad: true,
    subscribeToInventoryUpdates
  });
}