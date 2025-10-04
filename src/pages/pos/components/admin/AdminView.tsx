
import React, { useState, Component, useEffect } from 'react';
import { usePOSStore } from '../../../../store/posStore';
import { useERPStore } from '../../../../store/erpStore';
import { LazyLoader } from '../../../../components/LazyLoader';
import { Building, Users, Menu, Printer, Table as TableIcon, BarChart2, DollarSign, ShoppingCart, Package, Truck, Calculator } from 'lucide-react';
import { PrinterSettings } from '../PrinterSettings';
import type { POSStore } from '../../../../types/pos';

// Lazy load admin components
const BusinessSettings = React.lazy(() => import('./BusinessSettings'));
const UserManagement = React.lazy(() => import('./UserManagement'));
const TableManagement = React.lazy(() => import('./TableManagement'));
const Reports = React.lazy(() => import('./Reports'));
const MenuManagement = React.lazy(() => import('./MenuManagement'));
const ERPDashboard = React.lazy(() => import('./ERPDashboard'));
const ExpenseManagement = React.lazy(() => import('./ExpenseManagement'));
const PurchaseManagement = React.lazy(() => import('./PurchaseManagement'));
const SupplierManagement = React.lazy(() => import('./SupplierManagement'));
const AuditTrail = React.lazy(() => import('./AuditTrail'));
const AccountingView = React.lazy(() => import('./AccountingView'));

interface Tab {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

// Error Boundary Component
class AdminViewErrorBoundary extends Component<{}, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-full flex items-center justify-center bg-gradient-to-br from-red-50 to-red-100">
          <div className="text-center p-6 bg-white rounded-2xl shadow-xl border border-red-200">
            <h2 className="text-xl font-bold text-red-800 mb-2">Something went wrong</h2>
            <p className="text-red-600">Please try refreshing the page or contact support.</p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export function AdminView() {
  const { currentUser } = usePOSStore() as POSStore;
  const { fetchERPDataLazy } = useERPStore();
  const [activeTab, setActiveTab] = useState<string>(()=>{
    return localStorage.getItem('adminActiveTab') || 'erp-dashboard';
  }); 
  
  useEffect(()=>{
    localStorage.setItem('adminActiveTab', activeTab);
    
    // Load relevant ERP data based on active tab
    const erpTabs = ['expenses', 'purchases', 'suppliers', 'inventory-adjustments',];
    if (erpTabs.includes(activeTab)) {
      const moduleMap = {
       // 'expenses': ['expenses', 'expenseCategories'],
       // 'purchases': ['purchaseOrders', 'suppliers'],
        //'suppliers': ['suppliers'],
        //'audit-trail': ['auditTrail']
      };
      
      const modules = moduleMap[activeTab] || [];
      if (modules.length > 0) {
        fetchERPDataLazy(modules);
      }
    }
    
    // Set up inventory update listener for menu management
    if (activeTab === 'menu') {
      const handleInventoryUpdate = () => {
        // Trigger menu management refresh without page reload
        window.dispatchEvent(new CustomEvent('menuManagementRefresh'));
      };

      window.addEventListener('inventoryUpdated', handleInventoryUpdate);
      
      return () => {
        window.removeEventListener('inventoryUpdated', handleInventoryUpdate);
      };
    }
  }, [activeTab]);
  
//   return(
//     <ERPLayout {activeTab} setActiveTab={setActiveTab}>
//        {activeTab === 'erp-dashboard' && <InventoryReport />}
//       {activeTab === 'stock' && <StockManagement />}
//       {activeTab === 'menu' && <MenuManagement />}
//     </ERPLayout>
//   );
// }//load the last active tab

  const tabs: Tab[] = [
  //  { id: 'erp-dashboard', label: 'ERP Dashboard', icon: BarChart2 },


    ...(currentUser?.role === 'admin' || currentUser?.role === 'manager' ? [
      //{ id: 'inventory-adjustments', label: 'Inventory Adjustments', icon: Package },
      //{ id: 'audit-trail', label: 'Audit Trail', icon: BarChart2 }
    ] : []),
    { id: 'business', label: 'Business Settings', icon: Building },
    { id: 'users', label: 'User Management', icon: Users },
    { id: 'menu', label: 'Menu Management', icon: Menu },
    { id: 'tables', label: 'Table Management', icon: TableIcon },
    { id: 'reports', label: 'Reports', icon: BarChart2 },
    { id: 'accounting', label: 'Accounting', icon: Calculator },
    { id: 'printer', label: 'Printer Settings', icon: Printer },
   // { id: 'expenses', label: 'Expenses', icon: DollarSign },
    //{ id: 'purchases', label: 'Purchases', icon: ShoppingCart },
    //{ id: 'suppliers', label: 'Suppliers', icon: Truck },
  ];

  return (
    <AdminViewErrorBoundary>
      <div className="h-full bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="p-4 bg-white border-b border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Admin Dashboard
              </h1>
              <p className="text-gray-600 text-sm mt-1">Manage your restaurant settings and data</p>
            </div>
            <div className="flex items-center space-x-2">
              <div className="bg-gradient-to-r from-purple-100 to-pink-100 px-3 py-2 rounded-lg border border-purple-200">
                <span className="text-purple-800 font-semibold text-sm">
                  Welcome, {currentUser?.full_name ?? 'User'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 py-3 bg-white border-b border-gray-200">
          <div className="flex space-x-2 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-semibold transition-all transform hover:scale-105 text-sm whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4">
          <React.Suspense fallback={
            <div className="flex items-center justify-center h-96">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
                <p className="text-gray-500">Loading...</p>
              </div>
            </div>
          }>
            {activeTab === 'business' && (
              <LazyLoader>
                <BusinessSettings />
              </LazyLoader>
            )}
            {activeTab === 'expenses' && (
              <LazyLoader>
                <ExpenseManagement />
              </LazyLoader>
            )}
            {activeTab === 'users' && (
              <LazyLoader>
                <UserManagement />
              </LazyLoader>
            )}
            {activeTab === 'menu' && (
              <LazyLoader>
                <MenuManagement />
              </LazyLoader>
            )}
            {activeTab === 'tables' && (
              <LazyLoader>
                <TableManagement />
              </LazyLoader>
            )}
            {activeTab === 'reports' && (
              <LazyLoader>
                <Reports />
              </LazyLoader>
            )}
            {activeTab === 'accounting' && (
              <LazyLoader>
                <AccountingView />
              </LazyLoader>
            )}
          {activeTab === 'printer' && (
              <div className="max-w-3xl mx-auto">
                <LazyLoader>
                  <PrinterSettings />
                </LazyLoader>
              </div>
            )}
            {activeTab === 'purchases' && (
              <LazyLoader>
                <PurchaseManagement />
              </LazyLoader>
            )}
            {activeTab === 'suppliers' && (
              <LazyLoader>
                <SupplierManagement />
              </LazyLoader>
            )}
          </React.Suspense>
        </div>
      </div>
    </AdminViewErrorBoundary>
  );
}
