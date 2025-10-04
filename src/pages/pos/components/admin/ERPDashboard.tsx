import React, { useEffect, useState } from 'react';
import { useERPStore } from '../../../../store/erpStore';
import { usePOSStore } from '../../../../store/posStore';
import {
  DollarSign,
  ShoppingCart,
  Package,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Users,
  FileText,
  Truck,
  BarChart3,
  Calendar,
  Target,
  PieChart,
  Activity,
  Zap,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  Star,
  ArrowUpRight,
  ArrowDownRight,
  Download,
} from 'lucide-react';
import { Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  BarElement,
} from 'chart.js';
import { format, subDays } from 'date-fns';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  BarElement
);

export default function ERPDashboard() {
  const {
    dashboardStats,
    salesAnalytics,
    expenseAnalytics,
    profitAnalytics,
    loading,
    error,
    fetchDashboardStats,
    fetchSalesAnalytics,
    fetchExpenseAnalytics,
    fetchProfitAnalytics,
    clearError,
  } = useERPStore();
  const { businessSettings } = usePOSStore();

  const [selectedPeriod, setSelectedPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [selectedDays, setSelectedDays] = useState(30);
  const [refreshing, setRefreshing] = useState({
    stats: false,
    sales: false,
    expenses: false,
    profit: false,
  });
  const [errors, setErrors] = useState({
    stats: null,
    sales: null,
    expenses: null,
    profit: null,
  });

  useEffect(() => {
    const initializeData = async () => {
      setRefreshing({ stats: true, sales: true, expenses: true, profit: true });
      setErrors({ stats: null, sales: null, expenses: null, profit: null });

      try {
        await fetchDashboardStats();
      } catch (err) {
        setErrors(prev => ({ ...prev, stats: err.message || 'Failed to fetch dashboard stats' }));
      } finally {
        setRefreshing(prev => ({ ...prev, stats: false }));
      }

      try {
        await fetchSalesAnalytics(selectedPeriod, selectedDays);
      } catch (err) {
        setErrors(prev => ({ ...prev, sales: err.message || 'Failed to fetch sales analytics' }));
      } finally {
        setRefreshing(prev => ({ ...prev, sales: false }));
      }

      try {
        await fetchExpenseAnalytics(selectedPeriod, selectedDays);
      } catch (err) {
        setErrors(prev => ({ ...prev, expenses: err.message || 'Failed to fetch expense analytics' }));
      } finally {
        setRefreshing(prev => ({ ...prev, expenses: false }));
      }

      try {
        await fetchProfitAnalytics(selectedPeriod, selectedDays);
      } catch (err) {
        setErrors(prev => ({ ...prev, profit: err.message || 'Failed to fetch profit analytics' }));
      } finally {
        setRefreshing(prev => ({ ...prev, profit: false }));
      }
    };

    initializeData();
  }, [selectedPeriod, selectedDays, fetchDashboardStats, fetchSalesAnalytics, fetchExpenseAnalytics, fetchProfitAnalytics]);

  const handleRetry = async (type: 'stats' | 'sales' | 'expenses' | 'profit') => {
    setRefreshing(prev => ({ ...prev, [type]: true }));
    setErrors(prev => ({ ...prev, [type]: null }));
    try {
      if (type === 'stats') await fetchDashboardStats();
      if (type === 'sales') await fetchSalesAnalytics(selectedPeriod, selectedDays);
      if (type === 'expenses') await fetchExpenseAnalytics(selectedPeriod, selectedDays);
      if (type === 'profit') await fetchProfitAnalytics(selectedPeriod, selectedDays);
    } catch (err) {
      setErrors(prev => ({ ...prev, [type]: err.message || `Failed to fetch ${type}` }));
    } finally {
      setRefreshing(prev => ({ ...prev, [type]: false }));
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: dashboardStats?.currency || businessSettings?.currency || 'UGX',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value || 0);
  };

  const formatPercentage = (value: number) => {
    return `${(value || 0).toFixed(1)}%`;
  };

  const getErrorMessage = (errorMsg: string | null) => {
    if (!errorMsg) return null;
    if (errorMsg.includes('Failed to fetch') || errorMsg.includes('ERR_CONNECTION_REFUSED')) {
      return 'Unable to connect to the backend. Please ensure the server is running on https://localhost:3002 or check your network settings.';
    }
    return errorMsg;
  };

  const StatCard = ({ title, value, icon: Icon, gradient, trend, trendValue, subtitle, onClick }) => (
    <div
      className={`bg-white rounded-2xl p-4 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 transform hover:scale-105 ${onClick ? 'cursor-pointer' : ''} group relative overflow-hidden`}
      onClick={onClick}
    >
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <div className={`p-3 rounded-xl bg-gradient-to-r ${gradient} shadow-md`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
          {trend && (
            <div
              className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-bold ${
                trend === 'up' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}
            >
              {trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              <span>{trendValue}</span>
            </div>
          )}
        </div>
        <div className="space-y-1">
          <p className="text-xl font-bold text-gray-900 group-hover:text-purple-600 transition-colors break-words">
            {value}
          </p>
          <p className="text-sm font-semibold text-gray-700">{title}</p>
          {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
        </div>
      </div>
    </div>
  );

  // Chart configurations
  const salesTrendChartData = {
    labels: salesAnalytics?.labels || [],
    datasets: [
      {
        label: 'Sales',
        data: salesAnalytics?.sales || [],
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: 'rgb(59, 130, 246)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 6,
      },
      {
        label: 'Expenses',
        data: expenseAnalytics?.expenses || [],
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: 'rgb(239, 68, 68)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 6,
      },
    ],
  };

  const categoryBreakdownData = {
    labels: dashboardStats?.categoryBreakdown?.map(item => item.category) || [],
    datasets: [
      {
        data: dashboardStats?.categoryBreakdown?.map(item => item.amount) || [],
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',
          'rgba(16, 185, 129, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(239, 68, 68, 0.8)',
          'rgba(139, 92, 246, 0.8)',
          'rgba(236, 72, 153, 0.8)',
        ],
        borderColor: [
          'rgb(59, 130, 246)',
          'rgb(16, 185, 129)',
          'rgb(245, 158, 11)',
          'rgb(239, 68, 68)',
          'rgb(139, 92, 246)',
          'rgb(236, 72, 153)',
        ],
        borderWidth: 2,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 14,
            weight: 'bold',
          },
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        cornerRadius: 12,
        padding: 12,
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          font: {
            weight: 'bold',
          },
        },
      },
      y: {
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
        ticks: {
          font: {
            weight: 'bold',
          },
          callback: function (value: number) {
            return formatCurrency(value);
          },
        },
      },
    },
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12,
            weight: 'bold',
          },
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        cornerRadius: 12,
        padding: 12,
        callbacks: {
          label: (context) => {
            const value = context.parsed;
            return `${context.label}: ${formatCurrency(value)}`;
          },
        },
      },
    },
  };

  if (loading && !dashboardStats && !salesAnalytics && !expenseAnalytics && !profitAnalytics) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-20 w-20 border-4 border-purple-200 border-t-purple-600 mx-auto mb-6"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <BarChart3 className="w-8 h-8 text-purple-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-700 mb-2">Loading ERP Dashboard...</p>
          <p className="text-gray-500">Analyzing your business data</p>
        </div>
      </div>
    );
  }

  if (Object.values(errors).some(err => err !== null)) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center max-w-md">
          <div className="bg-red-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-10 h-10 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-red-800 mb-4">Unable to Load Dashboard</h2>
          <div className="space-y-4">
            {errors.stats && (
              <div className="text-red-600">
                <p>{getErrorMessage(errors.stats)}</p>
                <button
                  onClick={() => handleRetry('stats')}
                  disabled={refreshing.stats}
                  className="mt-2 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 flex items-center"
                >
                  {refreshing.stats ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4 mr-2" />
                  )}
                  Retry Stats
                </button>
              </div>
            )}
            {errors.sales && (
              <div className="text-red-600">
                <p>{getErrorMessage(errors.sales)}</p>
                <button
                  onClick={() => handleRetry('sales')}
                  disabled={refreshing.sales}
                  className="mt-2 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 flex items-center"
                >
                  {refreshing.sales ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4 mr-2" />
                  )}
                  Retry Sales
                </button>
              </div>
            )}
            {errors.expenses && (
              <div className="text-red-600">
                <p>{getErrorMessage(errors.expenses)}</p>
                <button
                  onClick={() => handleRetry('expenses')}
                  disabled={refreshing.expenses}
                  className="mt-2 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 flex items-center"
                >
                  {refreshing.expenses ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4 mr-2" />
                  )}
                  Retry Expenses
                </button>
              </div>
            )}
            {errors.profit && (
              <div className="text-red-600">
                <p>{getErrorMessage(errors.profit)}</p>
                <button
                  onClick={() => handleRetry('profit')}
                  disabled={refreshing.profit}
                  className="mt-2 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 flex items-center"
                >
                  {refreshing.profit ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4 mr-2" />
                  )}
                  Retry Profit
                </button>
              </div>
            )}
            <button
              onClick={clearError}
              className="mt-4 px-6 py-3 border border-red-300 text-red-700 rounded-xl hover:bg-red-50 font-bold"
            >
              Dismiss All
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Enhanced Header with Real-time Data */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 bg-white/5 backdrop-blur-sm"></div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-32 translate-x-32"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-24 -translate-x-24"></div>

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <div className="bg-white/20 backdrop-blur-sm p-4 rounded-2xl shadow-lg">
                <BarChart3 className="w-10 h-10 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold mb-2">ERP Dashboard</h1>
                <p className="text-indigo-100 text-lg">Complete business intelligence and analytics</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-xl border border-white/30">
                <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-white font-semibold">Live Data</span>
              </div>
              <button
                onClick={() => {
                  handleRetry('stats');
                  handleRetry('sales');
                  handleRetry('expenses');
                  handleRetry('profit');
                }}
                disabled={Object.values(refreshing).some(v => v)}
                className="bg-white/20 backdrop-blur-sm hover:bg-white/30 p-3 rounded-xl transition-all transform hover:scale-110 border border-white/30"
              >
                <RefreshCw className={`w-6 h-6 text-white ${Object.values(refreshing).some(v => v) ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Period Selector */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 bg-white/20 backdrop-blur-sm rounded-xl p-1 border border-white/30">
              {[
                { value: 'daily', label: 'Daily' },
                { value: 'weekly', label: 'Weekly' },
                { value: 'monthly', label: 'Monthly' },
              ].map(period => (
                <button
                  key={period.value}
                  onClick={() => setSelectedPeriod(period.value as any)}
                  className={`px-4 py-2 rounded-lg font-bold transition-all ${
                    selectedPeriod === period.value ? 'bg-white text-purple-600 shadow-lg' : 'text-white hover:bg-white/20'
                  }`}
                >
                  {period.label}
                </button>
              ))}
            </div>

            <select
              value={selectedDays}
              onChange={(e) => setSelectedDays(parseInt(e.target.value))}
              className="bg-white/20 backdrop-blur-sm border border-white/30 text-white rounded-xl px-4 py-2 font-bold"
            >
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
              <option value={365}>Last year</option>
            </select>
          </div>
        </div>
      </div>

      {/* Key Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <StatCard
          title="Total Sales"
          value={formatCurrency(dashboardStats?.totalSales || 0)}
          icon={DollarSign}
          gradient="from-emerald-500 to-teal-600"
          trend={dashboardStats?.totalSalesTrend > 0 ? 'up' : 'down'}
          trendValue={formatPercentage(dashboardStats?.totalSalesTrend || 0)}
          subtitle="All time revenue"
        />
        <StatCard
          title="Monthly Sales"
          value={formatCurrency(dashboardStats?.monthlySales || 0)}
          icon={TrendingUp}
          gradient="from-blue-500 to-indigo-600"
          trend={dashboardStats?.monthlySalesTrend > 0 ? 'up' : 'down'}
          trendValue={formatPercentage(dashboardStats?.monthlySalesTrend || 0)}
          subtitle="This month"
        />
        <StatCard
          title="Daily Sales"
          value={formatCurrency(dashboardStats?.dailySales || 0)}
          icon={Activity}
          gradient="from-green-500 to-emerald-600"
          trend={dashboardStats?.dailySalesTrend > 0 ? 'up' : 'down'}
          trendValue={formatPercentage(dashboardStats?.dailySalesTrend || 0)}
          subtitle="Today"
        />
        <StatCard
          title="Total Expenses"
          value={formatCurrency(dashboardStats?.totalExpenses || 0)}
          icon={FileText}
          gradient="from-red-500 to-pink-600"
          trend={dashboardStats?.totalExpensesTrend > 0 ? 'down' : 'up'}
          trendValue={formatPercentage(dashboardStats?.totalExpensesTrend || 0)}
          subtitle="All time costs"
        />
      </div>
      
      {/* Second Row of KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <StatCard
          title="Monthly Expenses"
          value={formatCurrency(dashboardStats?.monthlyExpenses || 0)}
          icon={Calendar}
          gradient="from-orange-500 to-red-600"
          trend={dashboardStats?.monthlyExpensesTrend > 0 ? 'down' : 'up'}
          trendValue={formatPercentage(dashboardStats?.monthlyExpensesTrend || 0)}
          subtitle="This month"
        />
        <StatCard
          title="Profit Margin"
          value={formatPercentage(dashboardStats?.profitMargin || 0)}
          icon={Target}
          gradient="from-purple-500 to-indigo-600"
          trend={dashboardStats?.profitMarginTrend > 0 ? 'up' : 'down'}
          trendValue={formatPercentage(dashboardStats?.profitMarginTrend || 0)}
          subtitle="Net margin"
        />
        <StatCard
          title="Low Stock Items"
          value={dashboardStats?.lowStockItems || 0}
          icon={AlertTriangle}
          gradient="from-yellow-500 to-orange-600"
          subtitle="Need restocking"
        />
        <StatCard
          title="Active Suppliers"
          value={dashboardStats?.totalSuppliers || 0}
          icon={Truck}
          gradient="from-cyan-500 to-blue-600"
          subtitle="Registered vendors"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Sales vs Expenses Trend */}
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 hover:shadow-2xl transition-all">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-r from-blue-500 to-indigo-500 p-3 rounded-xl">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Sales vs Expenses Trend</h3>
                <p className="text-gray-600">Revenue and cost analysis over time</p>
              </div>
            </div>
            <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all">
              <Download className="w-5 h-5" />
            </button>
          </div>
          <div className="h-80">
            {salesAnalytics && expenseAnalytics ? (
              <Line data={salesTrendChartData} options={chartOptions} />
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <Activity className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-lg font-semibold">No analytics data available</p>
                  <p className="text-sm">Retry fetching analytics or check backend connection</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Expense Category Breakdown */}
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 hover:shadow-2xl transition-all">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-3 rounded-xl">
                <PieChart className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Expense Categories</h3>
                <p className="text-gray-600">Spending distribution by category</p>
              </div>
            </div>
            <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all">
              <Download className="w-5 h-5" />
            </button>
          </div>
          <div className="h-80">
            {dashboardStats?.categoryBreakdown?.length > 0 ? (
              <Doughnut data={categoryBreakdownData} options={doughnutOptions} />
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <PieChart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-lg font-semibold">No expense data available</p>
                  <p className="text-sm">Start adding expenses to see the breakdown</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Top Selling Items & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Top Selling Items */}
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 hover:shadow-2xl transition-all">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-r from-yellow-500 to-orange-500 p-3 rounded-xl">
                <Star className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Top Selling Items</h3>
                <p className="text-gray-600">Best performing menu items</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {dashboardStats?.topSellingItems?.length > 0 ? (
              dashboardStats.topSellingItems.slice(0, 5).map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl border border-gray-200 hover:from-yellow-50 hover:to-orange-50 hover:border-yellow-200 transition-all"
                >
                  <div className="flex items-center space-x-4">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${
                        index === 0
                          ? 'bg-gradient-to-r from-yellow-400 to-yellow-500'
                          : index === 1
                          ? 'bg-gradient-to-r from-gray-400 to-gray-500'
                          : index === 2
                          ? 'bg-gradient-to-r from-orange-400 to-orange-500'
                          : 'bg-gradient-to-r from-blue-400 to-blue-500'
                      }`}
                    >
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">{item.item_name}</p>
                      <p className="text-sm text-gray-600">{item.quantity_sold} sold</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg text-green-600">{formatCurrency(item.revenue)}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Star className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="font-semibold">No sales data available</p>
                <p className="text-sm">Sales data will appear here once orders are processed</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions & Alerts */}
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 hover:shadow-2xl transition-all">
          <div className="flex items-center space-x-3 mb-6">
            <div className="bg-gradient-to-r from-indigo-500 to-purple-500 p-3 rounded-xl">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Quick Actions & Alerts</h3>
              <p className="text-gray-600">Important notifications and shortcuts</p>
            </div>
          </div>

          <div className="space-y-4">
            {(dashboardStats?.lowStockItems || 0) > 0 && (
              <div className="p-4 bg-gradient-to-r from-red-50 to-orange-50 border-l-4 border-red-500 rounded-xl">
                <div className="flex items-center space-x-3">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                  <div>
                    <p className="font-bold text-red-900">Low Stock Alert</p>
                    <p className="text-sm text-red-700">{dashboardStats.lowStockItems} items need restocking</p>
                  </div>
                </div>
              </div>
            )}

            {(dashboardStats?.pendingPurchaseOrders || 0) > 0 && (
              <div className="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 border-l-4 border-yellow-500 rounded-xl">
                <div className="flex items-center space-x-3">
                  <Clock className="w-6 h-6 text-yellow-600" />
                  <div>
                    <p className="font-bold text-yellow-900">Pending Approvals</p>
                    <p className="text-sm text-yellow-700">
                      {dashboardStats.pendingPurchaseOrders} purchase orders awaiting approval
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-500 rounded-xl">
              <div className="flex items-center space-x-3">
                <CheckCircle className="w-6 h-6 text-green-600" />
                <div>
                  <p className="font-bold text-green-900">System Operational</p>
                  <p className="text-sm text-green-700">All ERP modules running smoothly</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-4">
              <button className="p-4 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-2xl hover:from-blue-600 hover:to-indigo-600 transition-all transform hover:scale-105 shadow-lg">
                <DollarSign className="w-6 h-6 mx-auto mb-2" />
                <p className="text-sm font-bold">Add Expense</p>
              </button>
              <button className="p-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-2xl hover:from-green-600 hover:to-emerald-600 transition-all transform hover:scale-105 shadow-lg">
                <ShoppingCart className="w-6 h-6 mx-auto mb-2" />
                <p className="text-sm font-bold">Create PO</p>
              </button>
              <button className="p-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-2xl hover:from-purple-600 hover:to-pink-600 transition-all transform hover:scale-105 shadow-lg">
                <Truck className="w-6 h-6 mx-auto mb-2" />
                <p className="text-sm font-bold">Add Supplier</p>
              </button>
              <button className="p-4 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-2xl hover:from-orange-600 hover:to-red-600 transition-all transform hover:scale-105 shadow-lg">
                <Package className="w-6 h-6 mx-auto mb-2" />
                <p className="text-sm font-bold">Check Inventory</p>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Financial Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-6">
              <div className="bg-white/20 backdrop-blur-sm p-4 rounded-2xl">
                <TrendingUp className="w-8 h-8 text-white" />
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold">{formatCurrency(dashboardStats?.monthlySales || 0)}</div>
                <div className="text-green-100">Monthly Revenue</div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-green-100">Daily Average:</span>
                <span className="font-bold">{formatCurrency((dashboardStats?.monthlySales || 0) / 30)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-green-100">Orders:</span>
                <span className="font-bold">{dashboardStats?.monthlyOrders || 0}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-500 to-pink-600 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-6">
              <div className="bg-white/20 backdrop-blur-sm p-4 rounded-2xl">
                <TrendingDown className="w-8 h-8 text-white" />
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold">{formatCurrency(dashboardStats?.monthlyExpenses || 0)}</div>
                <div className="text-red-100">Monthly Expenses</div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-red-100">Daily Average:</span>
                <span className="font-bold">{formatCurrency((dashboardStats?.monthlyExpenses || 0) / 30)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-red-100">Categories:</span>
                <span className="font-bold">{dashboardStats?.categoryBreakdown?.length || 0}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-6">
              <div className="bg-white/20 backdrop-blur-sm p-4 rounded-2xl">
                <Target className="w-8 h-8 text-white" />
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold">
                  {formatCurrency((dashboardStats?.monthlySales || 0) - (dashboardStats?.monthlyExpenses || 0))}
                </div>
                <div className="text-purple-100">Net Profit</div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-purple-100">Margin:</span>
                <span className="font-bold">{formatPercentage(dashboardStats?.profitMargin || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-purple-100">ROI:</span>
                <span className="font-bold">
                  {dashboardStats?.monthlyExpenses > 0
                    ? formatPercentage(((dashboardStats?.monthlySales || 0) / dashboardStats.monthlyExpenses - 1) * 100)
                    : '0%'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity & Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Expenses */}
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 hover:shadow-2xl transition-all">
          <div className="flex items-center space-x-3 mb-6">
            <div className="bg-gradient-to-r from-red-500 to-pink-500 p-3 rounded-xl">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Recent Expenses</h3>
              <p className="text-gray-600">Latest business costs</p>
            </div>
          </div>

          <div className="space-y-3">
            {dashboardStats?.recentExpenses?.length > 0 ? (
              dashboardStats.recentExpenses.slice(0, 5).map((expense, index) => (
                <div
                  key={index}
                  className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl border border-gray-200"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-gray-900">{expense.description}</p>
                      <p className="text-sm text-gray-600">{format(new Date(expense.date), 'MMM dd, yyyy')}</p>
                    </div>
                    <p className="font-bold text-red-600">{formatCurrency(expense.amount)}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="font-semibold">No recent expenses</p>
                <p className="text-sm">Recent expenses will appear here</p>
              </div>
            )}
          </div>
        </div>

        {/* Pending Purchase Orders */}
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 hover:shadow-2xl transition-all">
          <div className="flex items-center space-x-3 mb-6">
            <div className="bg-gradient-to-r from-blue-500 to-indigo-500 p-3 rounded-xl">
              <ShoppingCart className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Pending Orders</h3>
              <p className="text-gray-600">Awaiting approval</p>
            </div>
          </div>

          <div className="space-y-3">
            {dashboardStats?.pendingPurchaseOrders?.length > 0 ? (
              dashboardStats.pendingPurchaseOrders.slice(0, 5).map((order, index) => (
                <div
                  key={index}
                  className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl border border-gray-200"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-gray-900">{order.po_number}</p>
                      <p className="text-sm text-gray-600">{format(new Date(order.order_date), 'MMM dd, yyyy')}</p>
                    </div>
                    <p className="font-bold text-blue-600">{formatCurrency(order.total_amount)}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <ShoppingCart className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="font-semibold">No pending orders</p>
                <p className="text-sm">Purchase orders will appear here</p>
              </div>
            )}
          </div>
        </div>

        {/* Business Insights */}
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 hover:shadow-2xl transition-all">
          <div className="flex items-center space-x-3 mb-6">
            <div className="bg-gradient-to-r from-purple-500 to-indigo-500 p-3 rounded-xl">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Business Insights</h3>
              <p className="text-gray-600">AI-powered recommendations</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl">
              <div className="flex items-center space-x-3">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="font-bold text-blue-900">Sales Growth</p>
                  <p className="text-sm text-blue-700">
                    Revenue increased by {formatPercentage(dashboardStats?.monthlySalesTrend || 0)} this month
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl">
              <div className="flex items-center space-x-3">
                <Target className="w-5 h-5 text-green-600" />
                <div>
                  <p className="font-bold text-green-900">Cost Optimization</p>
                  <p className="text-sm text-green-700">
                    Expenses reduced by {formatPercentage(dashboardStats?.monthlyExpensesTrend || 0)} this month
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-2xl">
              <div className="flex items-center space-x-3">
                <Star className="w-5 h-5 text-purple-600" />
                <div>
                  <p className="font-bold text-purple-900">Performance</p>
                  <p className="text-sm text-purple-700">
                    Profit margin: {formatPercentage(dashboardStats?.profitMargin || 0)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 hover:shadow-2xl transition-all">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-r from-indigo-500 to-purple-500 p-4 rounded-2xl">
              <BarChart3 className="w-8 h-8 text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-900">Performance Metrics</h3>
              <p className="text-gray-600">Key business performance indicators</p>
            </div>
          </div>

          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <Clock className="w-4 h-4" />
            <span>Last updated: {format(new Date(), 'HH:mm')}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-200">
            <div className="bg-gradient-to-r from-blue-500 to-indigo-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <DollarSign className="w-8 h-8 text-white" />
            </div>
            <div className="text-3xl font-bold text-blue-600 mb-2">
              {formatCurrency(dashboardStats?.averageOrderValue || 0)}
            </div>
            <div className="text-blue-700 font-semibold">Average Order Value</div>
            <div className="text-sm text-blue-600 mt-1">Per transaction</div>
          </div>

          <div className="text-center p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border border-green-200">
            <div className="bg-gradient-to-r from-green-500 to-emerald-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShoppingCart className="w-8 h-8 text-white" />
            </div>
            <div className="text-3xl font-bold text-green-600 mb-2">{dashboardStats?.totalOrders || 0}</div>
            <div className="text-green-700 font-semibold">Total Orders</div>
            <div className="text-sm text-green-600 mt-1">All time</div>
          </div>

          <div className="text-center p-6 bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl border border-purple-200">
            <div className="bg-gradient-to-r from-purple-500 to-pink-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-white" />
            </div>
            <div className="text-3xl font-bold text-purple-600 mb-2">{dashboardStats?.totalSuppliers || 0}</div>
            <div className="text-purple-700 font-semibold">Active Suppliers</div>
            <div className="text-sm text-purple-600 mt-1">Registered vendors</div>
          </div>

          <div className="text-center p-6 bg-gradient-to-br from-orange-50 to-red-50 rounded-2xl border border-orange-200">
            <div className="bg-gradient-to-r from-orange-500 to-red-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Package className="w-8 h-8 text-white" />
            </div>
            <div className="text-3xl font-bold text-orange-600 mb-2">{dashboardStats?.lowStockItems || 0}</div>
            <div className="text-orange-700 font-semibold">Low Stock Items</div>
            <div className="text-sm text-orange-600 mt-1">Need attention</div>
          </div>
        </div>
      </div>
    </div>
  );
}