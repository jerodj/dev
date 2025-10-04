import React, { useEffect, useState, useCallback } from 'react';
import { usePOSStore } from '../../../store/posStore';
import { posApi } from '../../../lib/api';
import { 
  DollarSign, 
  ShoppingCart, 
  Users, 
  Clock, 
  TrendingUp, 
  TrendingDown,
  AlertCircle,
  CheckCircle,
  Star,
  Coffee,
  RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';
import { Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import toast from 'react-hot-toast';

// Register Chart.js components for Pie chart
ChartJS.register(ArcElement, Tooltip, Legend);

// Utility function to get currency symbol from currency code
const getCurrencySymbol = (currencyCode: string): string => {
  const currencyMap: { [key: string]: string } = {
    'USD': '$',
    'UGX': 'USh',
    'EUR': '€',
    'GBP': '£',
  };
  return currencyMap[currencyCode] || currencyCode;
};

export function DashboardView() {
  const { currentUser, currentShift, tables, dataLoaded, fetchDataLazy, businessSettings } = usePOSStore();
  const [stats, setStats] = useState<{
    todaySales: number;
    todayOrders: number;
    activeOrders: number;
    availableTables: number;
    totalTips: number;
    averageOrderValue: number;
    currency: string;
    orders: any[];
  } | null>(null);
  const [salesTrendData, setSalesTrendData] = useState<{
    labels: string[];
    datasets: any[];
  }>({
    labels: [],
    datasets: [{
      label: 'Sales',
      data: [],
      backgroundColor: [
        'rgba(75, 192, 192, 0.6)', // Teal
        'rgba(255, 99, 132, 0.6)', // Red
        'rgba(54, 162, 235, 0.6)', // Blue
        'rgba(255, 206, 86, 0.6)', // Yellow
      ],
      borderColor: [
        'rgb(75, 192, 192)',
        'rgb(255, 99, 132)',
        'rgb(54, 162, 235)',
        'rgb(255, 206, 86)',
      ],
      borderWidth: 1,
    }],
  });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load all data needed for dashboard
  useEffect(() => {
    if (!dataLoaded.orders || !dataLoaded.tables) {
      fetchDataLazy(['orders', 'tables']);
    }
  }, [dataLoaded.orders, dataLoaded.tables, fetchDataLazy]);

  // Helper function to safely format currency
  const safeFormatCurrency = useCallback((value: any): string => {
    const numValue = parseFloat(value) || 0;
    const currencySymbol = stats ? getCurrencySymbol(stats.currency) : 'USh';
    return `${currencySymbol}${numValue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  }, [stats]);

  // Fetch initial stats, business settings, and sales trend
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [dashboardStats, trend] = await Promise.all([
          posApi.getDashboardStats(),
          posApi.getSalesTrend(4).catch(() => null), // Handle trend error gracefully
        ]);
        setStats(dashboardStats);
        
        if (trend) {
          setSalesTrendData({
            labels: trend.labels,
            datasets: [{
              label: 'Sales',
              data: trend.sales,
              backgroundColor: [
                'rgba(75, 192, 192, 0.6)',
                'rgba(255, 99, 132, 0.6)',
                'rgba(54, 162, 235, 0.6)',
                'rgba(255, 206, 86, 0.6)',
              ],
              borderColor: [
                'rgb(75, 192, 192)',
                'rgb(255, 99, 132)',
                'rgb(54, 162, 235)',
                'rgb(255, 206, 86)',
              ],
              borderWidth: 1,
            }],
          });
        }

        setError(null);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch dashboard data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const dashboardStats = await posApi.getDashboardStats();
      setStats(dashboardStats);
      setError(null);
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch dashboard stats');
    }
  };

  // Manual refresh function
  const handleManualRefresh = async () => {
    setIsLoading(true);
    try {
      const [dashboardStats] = await Promise.all([
        posApi.getDashboardStats(),
      ]);
      setStats(dashboardStats);
      setError(null);
      toast.success('Dashboard refreshed!');
    } catch (err) {
      console.error('Error refreshing dashboard:', err);
      setError(err instanceof Error ? err.message : 'Failed to refresh dashboard');
      toast.error('Failed to refresh dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  // Pie chart options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          font: {
            size: 12,
          },
          color: '#1f2937', // Tailwind gray-800
        },
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const label = context.label || '';
            const value = context.parsed || 0;
            const currency = stats?.currency || 'USD';
            return `${label}: ${getCurrencySymbol(currency)}${value.toFixed(2)}`;
          },
        },
      },
    },
  };

  const StatCard = ({ title, value, icon: Icon, color, trend, trendValue }) => (
    <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-xl bg-gradient-to-r ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        {trend && (
          <div className={`flex items-center space-x-1 text-sm ${
            trend === 'up' ? 'text-green-600' : 'text-red-600'
          }`}>
            {trend === 'up' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            <span>{trendValue}</span>
          </div>
        )}
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-600">{title}</p>
      </div>
    </div>
  );

  // Calculate urgent orders based on preparation time
  const urgentOrders = stats?.orders.filter(order => {
    if (!order.items || !order.created_at) return false;
    const totalPrepTime = order.items.reduce((total: number, item: any) => {
      return total + (item.menu_item?.preparation_time || 0) * (item.quantity || 1);
    }, 0);
    const prepTimeMs = totalPrepTime * 60 * 1000;
    const timeSinceCreation = new Date().getTime() - new Date(order.created_at).getTime();
    return timeSinceCreation > prepTimeMs;
  }) || [];

  const recentOrders = stats?.orders.slice(0, 5) || [];
  const currencySymbol = stats ? getCurrencySymbol(stats.currency) : '$';

  if (isLoading) return <div className="p-6 text-center">Loading...</div>;
  if (error) {
    return (
      <div className="p-6 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <p className="text-lg text-red-600">{error}</p>
        <button
          onClick={fetchDashboardStats}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-gradient-to-br from-slate-50 to-slate-100 min-h-full">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              Welcome to {businessSettings?.business_name || 'Modern POS'}, {currentUser?.full_name || 'User'}! 👋
            </h1>
            <p className="text-purple-100">
              {format(new Date(), 'EEEE, MMMM d, yyyy')} • Ready to serve amazing experiences
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">{format(new Date(), 'HH:mm')}</div>
            <div className="text-purple-200 capitalize">{currentUser?.role || 'Unknown'}</div>
            <button
              onClick={handleManualRefresh}
              disabled={isLoading}
              className="px-4 py-2 bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white rounded-xl font-bold transition-all flex items-center"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        <StatCard
          title="Today's Sales"
          value={safeFormatCurrency(stats?.todaySales || 0)}
          icon={DollarSign}
          color="from-green-500 to-emerald-600"
          trend="up"
          trendValue="12%"
        />
        <StatCard
          title="Orders Today"
          value={stats?.todayOrders || 0}
          icon={ShoppingCart}
          color="from-blue-500 to-blue-600"
          trend="up"
          trendValue="8%"
        />
        <StatCard
          title="Active Orders"
          value={stats?.activeOrders || 0}
          icon={Clock}
          color="from-orange-500 to-orange-600"
        />
        <StatCard
          title="Available Tables"
          value={stats?.availableTables || 0}
          icon={Users}
          color="from-purple-500 to-purple-600"
        />
        <StatCard
          title="Tips Today"
          value={safeFormatCurrency(stats?.totalTips || 0)}
          icon={Star}
          color="from-yellow-500 to-yellow-600"
          trend="up"
          trendValue="15%"
        />
        <StatCard
          title="Avg Order"
          value={safeFormatCurrency(stats?.averageOrderValue || 0)}
          icon={TrendingUp}
          color="from-indigo-500 to-indigo-600"
        />
      </div>

      {/* Sales Trend Pie Chart */}
      <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Sales Distribution (Last 4 Days)</h2>
        <div className="h-64">
          {salesTrendData.labels.length > 0 ? (
            <Pie data={salesTrendData} options={chartOptions} />
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500">
              No sales data available for the last 4 days
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Recent Orders</h2>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <Clock className="w-4 h-4" />
              <span>Live Updates</span>
            </div>
          </div>
          
          <div className="space-y-4">
            {recentOrders.length > 0 ? (
              recentOrders.map(order => (
                <div key={order.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${
                      order.status === 'paid' ? 'bg-green-500' :
                      order.status === 'ready' ? 'bg-blue-500' :
                      order.status === 'preparing' ? 'bg-orange-500' :
                      'bg-gray-400'
                    }`}></div>
                    <div>
                      <p className="font-semibold text-gray-900">{order.order_number}</p>
                      <p className="text-sm text-gray-500">
                        {order.table ? `Table ${order.table.number}` : order.order_type}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">{safeFormatCurrency(order.total_amount)}</p>
                    <p className="text-xs text-gray-500">{format(new Date(order.created_at), 'HH:mm')}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Coffee className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No recent orders</p>
              </div>
            )}
          </div>
        </div>

        {/* Alerts & Notifications */}
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Alerts & Status</h2>
            <div className="flex items-center space-x-2">
              {(urgentOrders.length > 0 || stats.availableTables <= 2) && (
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            {/* Shift Status */}
            <div className={`p-4 rounded-xl border-l-4 ${
              currentShift 
                ? 'bg-green-50 border-green-500' 
                : 'bg-yellow-50 border-yellow-500'
            }`}>
              <div className="flex items-center space-x-3">
                {currentShift ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-yellow-600" />
                )}
                <div>
                  <p className="font-semibold text-gray-900">
                    {currentShift ? 'Shift Active' : 'No Active Shift'}
                  </p>
                  <p className="text-sm text-gray-600">
                    {currentShift 
                      ? `Started at ${format(new Date(currentShift.start_time), 'HH:mm')} • Sales: ${safeFormatCurrency(currentShift.total_sales || 0)}`
                      : 'Start your shift to begin taking orders'
                    }
                  </p>
                </div>
              </div>
            </div>

            {/* Urgent Orders */}
            {urgentOrders.length > 0 && (
              <div className="p-4 bg-red-50 rounded-xl border-l-4 border-red-500">
                <div className="flex items-center space-x-3">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <div>
                    <p className="font-semibold text-gray-900">Urgent Orders</p>
                    <p className="text-sm text-gray-600">
                      {urgentOrders.length} order(s) exceed preparation time
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Low Table Availability */}
            {stats.availableTables <= 2 && (
              <div className="p-4 bg-red-50 rounded-xl border-l-4 border-red-500">
                <div className="flex items-center space-x-3">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <div>
                    <p className="font-semibold text-gray-900">Low Tables</p>
                    <p className="text-sm text-gray-600">
                      Only {stats.availableTables} tables available
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Table Status */}
            <div className="p-4 bg-blue-50 rounded-xl border-l-4 border-blue-500">
              <div className="flex items-center space-x-3">
                <Users className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="font-semibold text-gray-900">Table Status</p>
                  <p className="text-sm text-gray-600">
                    {stats.availableTables} of {tables.length} tables available
                  </p>
                </div>
              </div>
            </div>

            {/* System Status */}
            <div className="p-4 bg-green-50 rounded-xl border-l-4 border-green-500">
              <div className="flex items-center space-x-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div>
                  <p className="font-semibold text-gray-900">System Online</p>
                  <p className="text-sm text-gray-600">All systems operational</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}