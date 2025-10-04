import React, { useEffect, useState } from 'react';
import { usePOSStore } from '../../store/posStore';
import { invalidateInventoryCaches } from '../../lib/cache';
import { LoginPage } from './LoginPage';
import { POSLayout } from './POSLayout';
import { DashboardView } from './views/DashboardView';
import { MenuView } from './views/MenuView';
import { TablesView } from './views/TablesView';
import { OrdersView } from './views/OrdersView';
import { KitchenView } from './views/KitchenView';
import { AdminView } from './components/admin/AdminView';
import { PaymentModal } from './components/PaymentModal';
import { ShiftModal } from './components/ShiftModal';
import { OrderPanel } from './components/OrderPanel';
import toast from 'react-hot-toast';
import { Order } from '../../types/pos'; // Import Order type for type safety

export function POSPage() {
  const {
    currentUser,
    currentShift,
    cart,
    isInitializing,
    fetchDataLazy,
    forceRefreshMenuItems,
    invalidateStockCache,
    selectedTable, // Add selectedTable to destructured properties
    dataLoaded,
  } = usePOSStore();

  const [activeView, setActiveView] = useState<'dashboard' | 'menu' | 'tables' | 'orders' | 'kitchen' | 'admin'>('menu');
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentOrder, setPaymentOrder] = useState<Order | null>(null);
  const [lastActivity, setLastActivity] = useState(Date.now());
  const [pagePolling, setPagePolling] = useState<NodeJS.Timeout | null>(null);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingStage, setLoadingStage] = useState('Initializing...');

  // Debug selectedTable
  useEffect(() => {
    console.log(
      JSON.stringify(
        {
          timestamp: new Date().toISOString(),
          level: 'info',
          message: 'POSPage selectedTable state',
          selectedTable: selectedTable ? { id: selectedTable.id, number: selectedTable.number } : null,
        },
        null,
        2
      )
    );
    if (selectedTable === undefined) {
      console.error(
        JSON.stringify(
          {
            timestamp: new Date().toISOString(),
            level: 'error',
            message: 'selectedTable is undefined in POSPage',
          },
          null,
          2
        )
      );
    }
  }, [selectedTable]);

  // Cleanup polling on unmount
  useEffect(() => {
    // Listen for inventory updates globally
    const handleInventoryUpdate = () => {
      console.log('Global inventory update detected in POSPage');
      invalidateStockCache();
      
      // Refresh menu items if we're on menu view
      if (activeView === 'menu') {
        forceRefreshMenuItems();
      }
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'inventory_updated') {
        handleInventoryUpdate();
      }
    };

    window.addEventListener('inventoryUpdated', handleInventoryUpdate);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      const { stopPolling } = usePOSStore.getState();
      stopPolling();
      window.removeEventListener('inventoryUpdated', handleInventoryUpdate);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Track loading progress
  useEffect(() => {
    if (currentUser && isInitializing) {
      const stages = [
        { stage: 'Loading business settings...', progress: 20 },
        { stage: 'Loading menu items...', progress: 50 },
        { stage: 'Loading user data...', progress: 70 },
        { stage: 'Setting up workspace...', progress: 90 },
        { stage: 'Ready!', progress: 100 }
      ];
      
      stages.forEach((stageInfo, index) => {
        setTimeout(() => {
          setLoadingStage(stageInfo.stage);
          setLoadingProgress(stageInfo.progress);
        }, index * 200);
      });
    }
  }, [currentUser, isInitializing]);

  // Reset loading progress when initialization completes
  useEffect(() => {
    if (!isInitializing) {
      setLoadingProgress(0);
      setLoadingStage('Initializing...');
    }
  }, [isInitializing]);

  useEffect(() => {
    if (currentUser) {
      console.log(
        JSON.stringify(
          {
            timestamp: new Date().toISOString(),
            level: 'info',
            message: 'User logged in, preparing data...',
            userId: currentUser.id,
          },
          null,
          2
        )
      );
      setActiveView('menu');
    }
  }, [currentUser]);

  // View-specific polling optimization
  useEffect(() => {
    // Clear existing polling
    if (pagePolling) {
      clearInterval(pagePolling);
    }

    // Set up view-specific polling intervals (reduced frequency)
    let interval: NodeJS.Timeout | null = null;
    
    if (currentUser && !isInitializing) {
      switch (activeView) {
        case 'kitchen':
        case 'orders':
          // Fast polling for kitchen and orders (every 2 seconds)
          interval = setInterval(() => {
            fetchDataLazy(['orders']);
          }, 2000);
          break;
        case 'tables':
          // Medium polling for tables (every 5 seconds)
          interval = setInterval(() => {
            fetchDataLazy(['tables', 'orders']);
          }, 5000);
          break;
        case 'dashboard':
          // Slower polling for dashboard (every 20 seconds)
          interval = setInterval(() => {
            fetchDataLazy(['orders', 'tables']);
          }, 20000);
          break;
        case 'menu':
          // Slowest polling for menu (every 45 seconds for inventory updates)
          interval = setInterval(() => {
            fetchDataLazy(['menuItems']);
          }, 45000);
          break;
      }
    }

    setPagePolling(interval);

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [activeView, currentUser, isInitializing, fetchDataLazy]);

  // Lazy load data based on active view
  useEffect(() => {
    const loadViewData = async () => {
      switch (activeView) {
        case 'menu':
          if (!dataLoaded.menuItems || !dataLoaded.categories) {
            await fetchDataLazy(['menuItems', 'categories']);
          }
          break;
        case 'tables':
          if (!dataLoaded.tables || !dataLoaded.orders) {
            await fetchDataLazy(['tables', 'orders']);
          }
          break;
        case 'orders':
        case 'kitchen':
          if (!dataLoaded.orders) {
            await fetchDataLazy(['orders']);
          }
          break;
        case 'dashboard':
          // Dashboard needs specific data only
          await fetchDataLazy(['orders', 'tables']);
          break;
      }
    };

    if (currentUser && !isInitializing) {
      loadViewData();
    }
  }, [activeView, currentUser, isInitializing, dataLoaded, fetchDataLazy]);

  // Session timeout - 10 minutes of inactivity
  useEffect(() => {
    const handleActivity = () => {
      setLastActivity(Date.now());
    };

    const checkInactivity = () => {
      const now = Date.now();
      const inactiveTime = now - lastActivity;
      const tenMinutes = 10 * 60 * 1000; // 10 minutes in milliseconds

      if (inactiveTime > tenMinutes) {
        toast.error('Session expired due to inactivity');
        usePOSStore.getState().logout();
      }
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    events.forEach((event) => {
      document.addEventListener(event, handleActivity, true);
    });

    const interval = setInterval(checkInactivity, 60000);

    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, handleActivity, true);
      });
      clearInterval(interval);
    };
  }, [lastActivity]);

  const handlePayment = (order: Order) => {
    setPaymentOrder(order);
    setShowPaymentModal(true);
  };

  const handleCreateOrder = () => {
    if (!currentShift && !['admin', 'manager'].includes(currentUser?.role || '')) {
      toast.error('Please start your shift before creating orders');
      setShowShiftModal(true);
      return false;
    }
    return true;
  };

  if (!currentUser) {
    return <LoginPage />;
  }

 if (isInitializing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-20 w-20 border-4 border-purple-200 border-t-purple-600 mx-auto mb-6"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 bg-purple-600 rounded-full animate-pulse"></div>
            </div>
          </div>
          <p className="text-white text-2xl font-bold mb-2">{loadingStage}</p>
          <div className="w-64 bg-gray-700 rounded-full h-2 mx-auto mb-4">
            <div 
              className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${loadingProgress}%` }}
            ></div>
          </div>
          <p className="text-gray-400">{loadingProgress}% Complete</p>
          <div className="mt-4 flex justify-center space-x-1">
            <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce animation-delay-200"></div>
            <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce animation-delay-400"></div>
          </div>
        </div>
      </div>
    );
  }

  const renderView = () => {
    switch (activeView) {
      case 'dashboard':
        return <DashboardView />;
      case 'menu':
        return <MenuView />;
      case 'tables':
        return <TablesView onCreateOrder={handleCreateOrder} onPayment={handlePayment} />;
      case 'orders':
        return <OrdersView onPayment={handlePayment} />;
      case 'kitchen':
        return <KitchenView />;
      case 'admin':
        return <AdminView />;
      default:
        return <MenuView />;
    }
  };

  return (
    <POSLayout
      activeView={activeView}
      onViewChange={setActiveView}
      onStartShift={() => setShowShiftModal(true)}
      onEndShift={() => setShowShiftModal(true)}
    >
      <div className="flex h-full">
        {/* Main Content */}
        <div className="flex-1 overflow-hidden">{renderView()}</div>

        {/* Order Panel - Show only on menu and tables views */}
        {(activeView === 'menu' || (activeView === 'tables' && selectedTable && cart.length > 0)) && (
          <div className="w-80 border-l border-gray-200 bg-white">
            <OrderPanel 
              onCreateOrder={handleCreateOrder} 
              onPayment={handlePayment}
              isDataLoaded={dataLoaded.menuItems && dataLoaded.categories}
            />
          </div>
        )}
      </div>

      {/* Modals */}
      {showShiftModal && <ShiftModal onClose={() => setShowShiftModal(false)} />}

      {showPaymentModal && paymentOrder && (
        <PaymentModal
          order={paymentOrder}
          onClose={() => {
            setShowPaymentModal(false);
            setPaymentOrder(null);
          }}
        />
      )}
    </POSLayout>
  );
}