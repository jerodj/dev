import React, { useEffect, useState } from 'react';
import { usePOSStore } from '../../store/posStore';
import { 
  LogOut, 
  LayoutDashboard, 
  Menu, 
  Users, 
  ShoppingCart, 
  ChefHat,
  Clock,
  Settings,
  User,
  DollarSign
} from 'lucide-react';
import { format } from 'date-fns';
import { posApi } from '../../lib/api'; // Import the POSApi instance

interface POSLayoutProps {
  children: React.ReactNode;
  activeView: string;
  onViewChange: (view: string) => void;
  onStartShift: () => void;
  onEndShift: () => void;
}

export function POSLayout({ children, activeView, onViewChange, onStartShift, onEndShift }: POSLayoutProps) {
  const { currentUser, currentShift, logout } = usePOSStore();
  const [businessName, setBusinessName] = useState<string>('Modern POS'); // Fallback business name
  const [isLoadingSettings, setIsLoadingSettings] = useState<boolean>(true);

  // Fetch business settings on component mount
  useEffect(() => {
    const fetchBusinessSettings = async () => {
      try {
        const settings = await posApi.getBusinessSettings();
        if (settings.business_name) {
          setBusinessName(settings.business_name);
        }
      } catch (error) {
        console.error('Failed to fetch business settings:', error);
        // Keep fallback business name if fetch fails
      } finally {
        setIsLoadingSettings(false);
      }
    };

    fetchBusinessSettings();
  }, []);

  // Helper function to format numeric values
  const formatCurrency = (value: any): string => {
    if (value == null || value === undefined) return '0';
    const numValue = parseFloat(value);
    return isNaN(numValue) ? '0' : numValue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };

  // Determine if shift is truly active (no end_time or ending_cash)
  const isShiftActive = currentShift && !currentShift.end_time && currentShift.ending_cash === undefined;



  const navigationItems = [
    { id: 'menu', label: 'Menu', icon: Menu, color: 'from-green-500 to-green-600' },
    { id: 'tables', label: 'Tables', icon: Users, color: 'from-purple-500 to-purple-600' },
    { id: 'orders', label: 'Orders', icon: ShoppingCart, color: 'from-orange-500 to-orange-600' },
    { id: 'kitchen', label: 'Kitchen', icon: ChefHat, color: 'from-red-500 to-red-600' },
    ...(currentUser?.role === 'admin' || currentUser?.role === 'manager' ? [
      { id: 'admin', label: 'Admin', icon: Settings, color: 'from-indigo-500 to-indigo-600' },
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, color: 'from-blue-500 to-blue-600' }
    ] : []),
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Top Header */}
      <header className="bg-white shadow-lg border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo and Title */}
            <div className="flex items-center space-x-4">
              <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-3 rounded-xl shadow-lg">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse animation-delay-200"></div>
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse animation-delay-400"></div>
                </div>
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                  {isLoadingSettings ? 'Loading...' : businessName}
                </h1>
                <p className="text-sm text-gray-500 flex items-center">
                  <Clock className="w-4 h-4 mr-1" />
                  {format(new Date(), 'EEEE, MMMM d, yyyy • HH:mm')}
                </p>
              </div>
            </div>

            {/* User Info and Actions */}
            <div className="flex items-center space-x-6">
              {/* Shift Status */}
              {isShiftActive ? (
                <>
                  <div className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-green-100 to-emerald-100 rounded-xl border border-green-200">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-green-800">
                        Shift Active
                      </span>
                      <span className="text-xs text-green-600">
                        {currentShift?.total_orders || 0} Orders • USh{formatCurrency(currentShift?.total_sales || 0)}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={onEndShift}
                    disabled={!isShiftActive}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-white font-semibold transition-all shadow-lg transform hover:scale-105 ${
                      !isShiftActive
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700'
                    }`}
                  >
                    <Clock className="w-4 h-4" />
                    <span className="text-sm">End Shift</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={onStartShift}
                  disabled={isShiftActive}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-white font-semibold transition-all shadow-lg transform hover:scale-105 ${
                    isShiftActive
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700'
                  }`}
                >
                  <Clock className="w-4 h-4" />
                  <span className="text-sm">Start Shift</span>
                </button>
              )}

              {/* User Profile */}
              <div className="flex items-center space-x-3 px-4 py-2 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200">
                <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-white" />
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">
                    {currentUser?.full_name}
                  </p>
                  <p className="text-xs text-gray-500 capitalize">
                    {currentUser?.role} • ID: {currentUser?.staff_id}
                  </p>
                </div>
              </div>

              {/* Settings and Logout */}
              <div className="flex space-x-2">
                <button
                  onClick={logout}
                  className="p-3 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                  title="Logout"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Bar */}
      <nav className="bg-white border-b border-gray-200 shadow-sm">
        <div className="px-6 py-3">
          <div className="flex space-x-2">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => onViewChange(item.id)}
                  className={`flex items-center space-x-3 px-6 py-3 rounded-xl font-semibold transition-all transform hover:scale-105 ${
                    isActive
                      ? `bg-gradient-to-r ${item.color} text-white shadow-lg`
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  );
}