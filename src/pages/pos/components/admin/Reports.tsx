import React, { useState, useEffect } from 'react';
import { usePOSStore } from '../../../../store/posStore';
import { posApi } from '../../../../lib/api';
import { 
  BarChart2, 
  TrendingUp, 
  DollarSign, 
  Users, 
  Calendar, 
  Download, 
  Filter,
  Clock,
  CreditCard,
  Smartphone,
  Receipt,
  Star,
  Package,
  Target,
  PieChart,
  LineChart,
  Activity,
  FileText,
  RefreshCw,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { format, subDays, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { Line, Bar, Pie, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import toast from 'react-hot-toast';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface ReportData {
  orders: any[];
  shifts: any[];
  users: any[];
  totalSales: number;
  totalOrders: number;
  totalTips: number;
  averageOrderValue: number;
  paymentBreakdown: {
    cash: number;
    card: number;
    mobile: number;
  };
  topItems: Array<{
    name: string;
    quantity: number;
    revenue: number;
  }>;
  staffPerformance: Array<{
    staff_name: string;
    total_sales: number;
    total_orders: number;
    total_tips: number;
    hours_worked: number;
  }>;
}

const REPORT_TYPES = {
  sales: { label: 'Sales Reports', icon: TrendingUp, color: 'from-green-500 to-emerald-500' },
  staff: { label: 'Staff Performance', icon: Users, color: 'from-blue-500 to-indigo-500' },
  shifts: { label: 'Shift Reports', icon: Clock, color: 'from-purple-500 to-pink-500' },
  financial: { label: 'Financial Analysis', icon: DollarSign, color: 'from-yellow-500 to-orange-500' },
  inventory: { label: 'Inventory Reports', icon: Package, color: 'from-red-500 to-rose-500' },
  customer: { label: 'Customer Insights', icon: Target, color: 'from-indigo-500 to-purple-500' },
};

const TIME_PERIODS = {
  today: { label: 'Today', days: 0 },
  yesterday: { label: 'Yesterday', days: 1 },
  week: { label: 'This Week', days: 7 },
  month: { label: 'This Month', days: 30 },
  quarter: { label: 'This Quarter', days: 90 },
  year: { label: 'This Year', days: 365 },
  custom: { label: 'Custom Range', days: 0 },
};

export default function Reports() {
  const { users, businessSettings } = usePOSStore();
  const [activeReportType, setActiveReportType] = useState('sales');
  const [timePeriod, setTimePeriod] = useState<'today' | 'week' | 'month' | 'custom'>('today');
  const [selectedStaff, setSelectedStaff] = useState('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [chartType, setChartType] = useState('line');
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [rawOrders, setRawOrders] = useState<any[]>([]);
  const [rawShifts, setRawShifts] = useState<any[]>([]);

  // Get date range based on selected period
  const getDateRange = () => {
    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;

    switch (timePeriod) {
      case 'today':
        startDate = startOfDay(now);
        endDate = endOfDay(now);
        break;
      case 'yesterday':
        const yesterday = subDays(now, 1);
        startDate = startOfDay(yesterday);
        endDate = endOfDay(yesterday);
        break;
      case 'week':
        startDate = startOfWeek(now);
        endDate = endOfWeek(now);
        break;
      case 'month':
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
        break;
      case 'quarter':
        startDate = subDays(now, 90);
        break;
      case 'year':
        startDate = startOfYear(now);
        endDate = endOfYear(now);
        break;
      case 'custom':
        if (customStartDate && customEndDate) {
          startDate = new Date(customStartDate);
          endDate = new Date(customEndDate);
        } else {
          startDate = startOfMonth(now);
          endDate = endOfMonth(now);
        }
        break;
      default:
        startDate = startOfMonth(now);
    }

    return { startDate, endDate };
  };

  // Fetch comprehensive report data
  const fetchReportData = async () => {
    setLoading(true);
    try {
      const { startDate, endDate } = getDateRange();
      
      // Fetch all necessary data
      const [orders, shifts, allUsers] = await Promise.all([
        posApi.getOrdersInDateRange(startDate.toISOString(), endDate.toISOString()),
        posApi.getShiftsInDateRange(startDate.toISOString(), endDate.toISOString()),
        posApi.getUsers()
      ]);

      console.log('Fetched orders:', orders?.length || 0);
      console.log('Fetched shifts:', shifts?.length || 0);
      console.log('Date range:', { startDate: startDate.toISOString(), endDate: endDate.toISOString() });

      setRawOrders(orders || []);
      setRawShifts(shifts || []);

      // Filter orders by staff if selected
      const filteredOrders = selectedStaff === 'all' 
        ? (orders || [])
        : (orders || []).filter(order => order.server?.id === selectedStaff || order.user_id === selectedStaff);

      // Filter shifts by staff if selected
      const filteredShifts = selectedStaff === 'all'
        ? (shifts || [])
        : (shifts || []).filter(shift => shift.user_id === selectedStaff);

      console.log('Filtered orders:', filteredOrders.length);
      console.log('Filtered shifts:', filteredShifts.length);

      // Calculate comprehensive metrics
      const totalSales = filteredOrders.reduce((sum, order) => {
        const amount = parseFloat(order.total_amount) || 0;
        console.log(`Order ${order.order_number}: ${amount}`);
        return sum + amount;
      }, 0);

      const totalOrders = filteredOrders.length;
      
      const totalTips = filteredOrders.reduce((sum, order) => {
        const tips = parseFloat(order.tip_amount) || 0;
        return sum + tips;
      }, 0);

      const averageOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

      // Payment method breakdown
      const paymentBreakdown = filteredOrders.reduce((acc, order) => {
        const amount = parseFloat(order.total_amount) || 0;
        const method = order.payment_method || 'unknown';
        
        if (method === 'cash') acc.cash += amount;
        else if (method === 'card') acc.card += amount;
        else if (method === 'mobile') acc.mobile += amount;
        
        return acc;
      }, { cash: 0, card: 0, mobile: 0 });

      console.log('Payment breakdown:', paymentBreakdown);
      console.log('Total sales calculated:', totalSales);

      // Top selling items
      const itemSales = {};
      filteredOrders.forEach(order => {
        if (order.items && Array.isArray(order.items)) {
          order.items.forEach(item => {
            const itemName = item.menu_item?.name || 'Unknown Item';
            const quantity = parseInt(item.quantity) || 0;
            const revenue = parseFloat(item.total_price) || 0;
            const soldQuantity = quantity;
            const originalStock = item.inventory_count + soldQuantity; // Calculate original stock
            
            if (!itemSales[itemName]) {
              itemSales[itemName] = { quantity: 0, revenue: 0 };
            }
            itemSales[itemName].quantity += quantity;
            itemSales[itemName].revenue += revenue;
            itemSales[itemName].original_stock = originalStock;
          });
        }
      });

      const topItems = Object.entries(itemSales)
        .map(([name, data]: [string, any]) => ({
          name,
          quantity: data.quantity,
          revenue: data.revenue
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);

      // Staff performance
      const staffPerformance = allUsers.map(user => {
        const userOrders = filteredOrders.filter(order => 
          order.server?.id === user.id || order.user_id === user.id
        );
        const userShifts = filteredShifts.filter(shift => shift.user_id === user.id);
        
        const userSales = userOrders.reduce((sum, order) => sum + (parseFloat(order.total_amount) || 0), 0);
        const userTips = userOrders.reduce((sum, order) => sum + (parseFloat(order.tip_amount) || 0), 0);
        const hoursWorked = userShifts.reduce((sum, shift) => {
          if (shift.start_time && shift.end_time) {
            const duration = (new Date(shift.end_time).getTime() - new Date(shift.start_time).getTime()) / (1000 * 60 * 60);
            return sum + duration;
          }
          return sum;
        }, 0);

        return {
          staff_name: user.full_name,
          staff_id: user.staff_id,
          role: user.role,
          total_sales: userSales,
          total_orders: userOrders.length,
          total_tips: userTips,
          hours_worked: hoursWorked,
          average_order_value: userOrders.length > 0 ? userSales / userOrders.length : 0,
          sales_per_hour: hoursWorked > 0 ? userSales / hoursWorked : 0
        };
      }).filter(staff => staff.total_orders > 0 || staff.hours_worked > 0);

      const processedData: ReportData = {
        orders: filteredOrders,
        shifts: filteredShifts,
        users: allUsers,
        totalSales,
        totalOrders,
        totalTips,
        averageOrderValue,
        paymentBreakdown,
        topItems,
        staffPerformance
      };

      console.log('Processed report data:', processedData);
      setReportData(processedData);

    } catch (error) {
      console.error('Error fetching report data:', error);
      toast.error('Failed to load report data');
      setReportData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, [timePeriod, selectedStaff]);

  // Format currency
  const formatCurrency = (value: number) => {
    const currency = businessSettings?.currency || 'UGX';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
    }).format(value || 0);
  };

  // Generate chart data based on report type
  const generateChartData = () => {
    if (!reportData) return null;

    const { startDate, endDate } = getDateRange();
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    switch (activeReportType) {
      case 'sales':
        // Daily sales trend
        const dailySales = {};
        for (let i = 0; i < days; i++) {
          const date = format(subDays(endDate, days - 1 - i), 'MMM dd');
          dailySales[date] = 0;
        }
        
        reportData.orders.forEach(order => {
          if (order.created_at) {
            const orderDate = format(new Date(order.created_at), 'MMM dd');
            if (dailySales.hasOwnProperty(orderDate)) {
              dailySales[orderDate] += parseFloat(order.total_amount) || 0;
            }
          }
        });

        return {
          labels: Object.keys(dailySales),
          datasets: [{
            label: 'Daily Sales',
            data: Object.values(dailySales),
            borderColor: 'rgb(59, 130, 246)',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            tension: 0.4,
            fill: true,
          }]
        };

      case 'financial':
        // Payment method breakdown
        const { cash, card, mobile } = reportData.paymentBreakdown;
        const total = cash + card + mobile;
        
        if (total === 0) {
          return {
            labels: ['No Data'],
            datasets: [{
              data: [1],
              backgroundColor: ['#E5E7EB'],
              borderWidth: 0,
            }]
          };
        }

        return {
          labels: ['Cash', 'Card', 'Mobile'],
          datasets: [{
            data: [cash, card, mobile],
            backgroundColor: [
              'rgba(34, 197, 94, 0.8)',
              'rgba(59, 130, 246, 0.8)',
              'rgba(168, 85, 247, 0.8)',
            ],
            borderColor: [
              'rgb(34, 197, 94)',
              'rgb(59, 130, 246)',
              'rgb(168, 85, 247)',
            ],
            borderWidth: 2,
          }]
        };

      case 'staff':
        // Staff performance
        return {
          labels: reportData.staffPerformance.map(staff => staff.staff_name),
          datasets: [{
            label: 'Sales',
            data: reportData.staffPerformance.map(staff => staff.total_sales),
            backgroundColor: 'rgba(59, 130, 246, 0.8)',
            borderColor: 'rgb(59, 130, 246)',
            borderWidth: 1,
          }]
        };

      case 'inventory':
        // Top selling items
        return {
          labels: reportData.topItems.slice(0, 8).map(item => item.name),
          datasets: [{
            label: 'Revenue',
            data: reportData.topItems.slice(0, 8).map(item => item.revenue),
            backgroundColor: [
              'rgba(239, 68, 68, 0.8)',
              'rgba(245, 158, 11, 0.8)',
              'rgba(34, 197, 94, 0.8)',
              'rgba(59, 130, 246, 0.8)',
              'rgba(168, 85, 247, 0.8)',
              'rgba(236, 72, 153, 0.8)',
              'rgba(14, 165, 233, 0.8)',
              'rgba(99, 102, 241, 0.8)',
            ],
            borderWidth: 2,
          }]
        };

      default:
        return null;
    }
  };

  // Export report data to CSV
  const exportToCSV = () => {
    if (!reportData) {
      toast.error('No data to export');
      return;
    }

    let csvContent = '';
    let filename = '';

    switch (activeReportType) {
      case 'sales':
        filename = `sales-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
        csvContent = 'Date,Order Number,Customer,Table,Type,Items,Subtotal,Tax,Discount,Tips,Total,Payment Method,Staff\n';
        reportData.orders.forEach(order => {
          const date = order.created_at ? format(new Date(order.created_at), 'yyyy-MM-dd HH:mm') : 'N/A';
          const customer = order.customer_name || 'Walk-in';
          const table = order.table?.number || 'N/A';
          const type = order.order_type || 'Unknown';
          const itemCount = order.items?.length || 0;
          const subtotal = order.subtotal || 0;
          const tax = order.tax_amount || 0;
          const discount = order.discount_amount || 0;
          const tips = order.tip_amount || 0;
          const total = order.total_amount || 0;
          const paymentMethod = order.payment_method || 'Unknown';
          const staff = order.server?.full_name || order.user?.full_name || 'Unknown';
          
          csvContent += `"${date}","${order.order_number}","${customer}","${table}","${type}",${itemCount},${subtotal},${tax},${discount},${tips},${total},"${paymentMethod}","${staff}"\n`;
        });
        break;

      case 'staff':
        filename = `staff-performance-${format(new Date(), 'yyyy-MM-dd')}.csv`;
        csvContent = 'Staff Name,Staff ID,Role,Total Sales,Total Orders,Total Tips,Hours Worked,Avg Order Value,Sales per Hour\n';
        reportData.staffPerformance.forEach(staff => {
          csvContent += `"${staff.staff_name}","${staff.staff_id}","${staff.role}",${staff.total_sales},${staff.total_orders},${staff.total_tips},${staff.hours_worked.toFixed(2)},${staff.average_order_value.toFixed(2)},${staff.sales_per_hour.toFixed(2)}\n`;
        });
        break;

      case 'shifts':
        filename = `shift-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
        csvContent = 'Date,Staff,Start Time,End Time,Duration (hrs),Starting Cash,Ending Cash,Cash Difference,Total Sales,Total Tips,Total Orders,Cash Sales,Card Sales,Mobile Sales\n';
        reportData.shifts.forEach(shift => {
          const startTime = shift.start_time ? format(new Date(shift.start_time), 'yyyy-MM-dd HH:mm') : 'N/A';
          const endTime = shift.end_time ? format(new Date(shift.end_time), 'yyyy-MM-dd HH:mm') : 'Ongoing';
          const duration = shift.start_time && shift.end_time 
            ? ((new Date(shift.end_time).getTime() - new Date(shift.start_time).getTime()) / (1000 * 60 * 60)).toFixed(2)
            : '0';
          const staff = users.find(u => u.id === shift.user_id)?.full_name || 'Unknown';
          const cashDiff = (shift.ending_cash || 0) - (shift.starting_cash || 0);
          
          csvContent += `"${startTime}","${staff}","${startTime}","${endTime}",${duration},${shift.starting_cash || 0},${shift.ending_cash || 0},${cashDiff},${shift.total_sales || 0},${shift.total_tips || 0},${shift.total_orders || 0},${shift.cash_sales || 0},${shift.card_sales || 0},${shift.mobile_sales || 0}\n`;
        });
        break;

      case 'financial':
        filename = `financial-analysis-${format(new Date(), 'yyyy-MM-dd')}.csv`;
        csvContent = 'Metric,Amount,Percentage\n';
        const total = reportData.paymentBreakdown.cash + reportData.paymentBreakdown.card + reportData.paymentBreakdown.mobile;
        csvContent += `Total Sales,${reportData.totalSales},100%\n`;
        csvContent += `Cash Sales,${reportData.paymentBreakdown.cash},${total > 0 ? ((reportData.paymentBreakdown.cash / total) * 100).toFixed(1) : 0}%\n`;
        csvContent += `Card Sales,${reportData.paymentBreakdown.card},${total > 0 ? ((reportData.paymentBreakdown.card / total) * 100).toFixed(1) : 0}%\n`;
        csvContent += `Mobile Sales,${reportData.paymentBreakdown.mobile},${total > 0 ? ((reportData.paymentBreakdown.mobile / total) * 100).toFixed(1) : 0}%\n`;
        csvContent += `Total Tips,${reportData.totalTips},${reportData.totalSales > 0 ? ((reportData.totalTips / reportData.totalSales) * 100).toFixed(1) : 0}%\n`;
        csvContent += `Average Order Value,${reportData.averageOrderValue.toFixed(2)},-\n`;
        csvContent += `Total Orders,${reportData.totalOrders},-\n`;
        break;

      case 'inventory':
        filename = `inventory-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
        csvContent = 'Item Name,Quantity Sold,Revenue,Avg Price\n';
        reportData.topItems.forEach(item => {
          const avgPrice = item.quantity > 0 ? item.revenue / item.quantity : 0;
          csvContent += `"${item.name}",${item.quantity},${item.revenue},${avgPrice.toFixed(2)}\n`;
        });
        break;

      case 'customer':
        filename = `customer-insights-${format(new Date(), 'yyyy-MM-dd')}.csv`;
        csvContent = 'Order Type,Count,Revenue,Percentage\n';
        const orderTypes = {};
        reportData.orders.forEach(order => {
          const type = order.order_type || 'unknown';
          const amount = parseFloat(order.total_amount) || 0;
          if (!orderTypes[type]) {
            orderTypes[type] = { count: 0, revenue: 0 };
          }
          orderTypes[type].count++;
          orderTypes[type].revenue += amount;
        });
        
        Object.entries(orderTypes).forEach(([type, data]: [string, any]) => {
          const percentage = reportData.totalSales > 0 ? ((data.revenue / reportData.totalSales) * 100).toFixed(1) : 0;
          csvContent += `"${type.replace('_', ' ').toUpperCase()}",${data.count},${data.revenue},${percentage}%\n`;
        });
        break;
    }

    // Create and download CSV file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success(`Report exported as ${filename}! 📊`);
  };

  // Chart options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          font: { size: 12 },
          color: '#374151',
        },
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const label = context.dataset.label || '';
            const value = context.parsed.y || context.parsed || 0;
            if (activeReportType === 'financial' || activeReportType === 'inventory') {
              return `${label}: ${formatCurrency(value)}`;
            }
            return `${label}: ${value}`;
          },
        },
      },
    },
    scales: activeReportType !== 'financial' && activeReportType !== 'inventory' ? {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value: any) {
            if (activeReportType === 'sales' || activeReportType === 'staff') {
              return formatCurrency(value);
            }
            return value;
          }
        }
      }
    } : undefined,
  };

  const renderChart = () => {
    const data = generateChartData();
    if (!data) return null;

    switch (chartType) {
      case 'line':
        return <Line data={data} options={chartOptions} />;
      case 'bar':
        return <Bar data={data} options={chartOptions} />;
      case 'pie':
        return <Pie data={data} options={chartOptions} />;
      case 'doughnut':
        return <Doughnut data={data} options={chartOptions} />;
      default:
        return <Line data={data} options={chartOptions} />;
    }
  };

  const renderReportContent = () => {
    if (!reportData) return null;

    switch (activeReportType) {
      case 'sales':
        return (
          <div className="space-y-6">
            {/* Sales Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-6 rounded-2xl text-white shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-100 text-sm font-medium">Total Sales</p>
                    <p className="text-2xl font-bold">{formatCurrency(reportData.totalSales)}</p>
                  </div>
                  <DollarSign className="w-8 h-8 text-green-200" />
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-blue-500 to-indigo-500 p-6 rounded-2xl text-white shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm font-medium">Total Orders</p>
                    <p className="text-2xl font-bold">{reportData.totalOrders}</p>
                  </div>
                  <Receipt className="w-8 h-8 text-blue-200" />
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-yellow-500 to-orange-500 p-6 rounded-2xl text-white shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-yellow-100 text-sm font-medium">Total Tips</p>
                    <p className="text-2xl font-bold">{formatCurrency(reportData.totalTips)}</p>
                  </div>
                  <Star className="w-8 h-8 text-yellow-200" />
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-6 rounded-2xl text-white shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-100 text-sm font-medium">Avg Order</p>
                    <p className="text-2xl font-bold">{formatCurrency(reportData.averageOrderValue)}</p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-purple-200" />
                </div>
              </div>
            </div>

            {/* Daily Breakdown Table */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-bold text-gray-900">Daily Sales Breakdown</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Orders</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Sales</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Tips</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Avg Order</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {(() => {
                      const { startDate, endDate } = getDateRange();
                      const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
                      const dailyData = [];
                      
                      for (let i = 0; i < days; i++) {
                        const date = subDays(endDate, days - 1 - i);
                        const dayStart = startOfDay(date);
                        const dayEnd = endOfDay(date);
                        
                        const dayOrders = reportData.orders.filter(order => {
                          if (!order.created_at) return false;
                          const orderDate = new Date(order.created_at);
                          return orderDate >= dayStart && orderDate <= dayEnd;
                        });
                        
                        const daySales = dayOrders.reduce((sum, order) => sum + (parseFloat(order.total_amount) || 0), 0);
                        const dayTips = dayOrders.reduce((sum, order) => sum + (parseFloat(order.tip_amount) || 0), 0);
                        const avgOrder = dayOrders.length > 0 ? daySales / dayOrders.length : 0;
                        
                        dailyData.push({
                          date: format(date, 'MMM dd, yyyy'),
                          orders: dayOrders.length,
                          sales: daySales,
                          tips: dayTips,
                          avgOrder
                        });
                      }
                      
                      return dailyData.map((day, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{day.date}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{day.orders}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600">{formatCurrency(day.sales)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-yellow-600">{formatCurrency(day.tips)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{formatCurrency(day.avgOrder)}</td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );

      case 'staff':
        return (
          <div className="space-y-6">
            {/* Staff Performance Table */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-bold text-gray-900">Staff Performance Analysis</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Staff</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Role</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Sales</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Orders</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Tips</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Hours</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Avg Order</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Sales/Hr</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {reportData.staffPerformance.map((staff, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mr-3">
                              <span className="text-white font-bold text-xs">{staff.staff_name.charAt(0)}</span>
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">{staff.staff_name}</div>
                              <div className="text-xs text-gray-500">ID: {staff.staff_id}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 py-1 text-xs font-bold rounded-full bg-blue-100 text-blue-800 capitalize">
                            {staff.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600">
                          {formatCurrency(staff.total_sales)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{staff.total_orders}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-yellow-600">
                          {formatCurrency(staff.total_tips)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {staff.hours_worked.toFixed(1)}h
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {formatCurrency(staff.average_order_value)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {formatCurrency(staff.sales_per_hour)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );

      case 'shifts':
        return (
          <div className="space-y-6">
            {/* Shift Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gradient-to-r from-blue-500 to-indigo-500 p-6 rounded-2xl text-white shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm font-medium">Total Shifts</p>
                    <p className="text-2xl font-bold">{reportData.shifts.length}</p>
                  </div>
                  <Clock className="w-8 h-8 text-blue-200" />
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-6 rounded-2xl text-white shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-100 text-sm font-medium">Avg Shift Sales</p>
                    <p className="text-2xl font-bold">
                      {formatCurrency(reportData.shifts.length > 0 ? reportData.totalSales / reportData.shifts.length : 0)}
                    </p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-green-200" />
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-6 rounded-2xl text-white shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-100 text-sm font-medium">Total Hours</p>
                    <p className="text-2xl font-bold">
                      {reportData.shifts.reduce((sum, shift) => {
                        if (shift.start_time && shift.end_time) {
                          return sum + ((new Date(shift.end_time).getTime() - new Date(shift.start_time).getTime()) / (1000 * 60 * 60));
                        }
                        return sum;
                      }, 0).toFixed(1)}h
                    </p>
                  </div>
                  <Activity className="w-8 h-8 text-purple-200" />
                </div>
              </div>
            </div>

            {/* Shifts Table */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-bold text-gray-900">Detailed Shift Reports</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Staff</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Duration</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Starting Cash</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Ending Cash</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Cash Diff</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Sales</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Orders</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Tips</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {reportData.shifts.map((shift, index) => {
                      const staff = users.find(u => u.id === shift.user_id);
                      const duration = shift.start_time && shift.end_time 
                        ? ((new Date(shift.end_time).getTime() - new Date(shift.start_time).getTime()) / (1000 * 60 * 60))
                        : 0;
                      const cashDiff = (shift.ending_cash || 0) - (shift.starting_cash || 0);
                      
                      return (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center mr-3">
                                <span className="text-white font-bold text-xs">{staff?.full_name?.charAt(0) || '?'}</span>
                              </div>
                              <div>
                                <div className="text-sm font-medium text-gray-900">{staff?.full_name || 'Unknown'}</div>
                                <div className="text-xs text-gray-500">{staff?.role || 'Unknown'}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                            {shift.start_time ? format(new Date(shift.start_time), 'MMM dd, yyyy') : 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                            {duration.toFixed(1)}h
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                            {formatCurrency(shift.starting_cash || 0)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                            {formatCurrency(shift.ending_cash || 0)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span className={`font-bold ${cashDiff >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {cashDiff >= 0 ? '+' : ''}{formatCurrency(cashDiff)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600">
                            {formatCurrency(shift.total_sales || 0)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                            {shift.total_orders || 0}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-yellow-600">
                            {formatCurrency(shift.total_tips || 0)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );

      case 'financial':
        const { cash, card, mobile } = reportData.paymentBreakdown;
        const totalPayments = cash + card + mobile;
        
        return (
          <div className="space-y-6">
            {/* Payment Method Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-6 rounded-2xl text-white shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-100 text-sm font-medium">Cash Sales</p>
                    <p className="text-2xl font-bold">{formatCurrency(cash)}</p>
                    <p className="text-green-200 text-xs">
                      {totalPayments > 0 ? ((cash / totalPayments) * 100).toFixed(1) : 0}% of total
                    </p>
                  </div>
                  <DollarSign className="w-8 h-8 text-green-200" />
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-blue-500 to-indigo-500 p-6 rounded-2xl text-white shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm font-medium">Card Sales</p>
                    <p className="text-2xl font-bold">{formatCurrency(card)}</p>
                    <p className="text-blue-200 text-xs">
                      {totalPayments > 0 ? ((card / totalPayments) * 100).toFixed(1) : 0}% of total
                    </p>
                  </div>
                  <CreditCard className="w-8 h-8 text-blue-200" />
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-6 rounded-2xl text-white shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-100 text-sm font-medium">Mobile Sales</p>
                    <p className="text-2xl font-bold">{formatCurrency(mobile)}</p>
                    <p className="text-purple-200 text-xs">
                      {totalPayments > 0 ? ((mobile / totalPayments) * 100).toFixed(1) : 0}% of total
                    </p>
                  </div>
                  <Smartphone className="w-8 h-8 text-purple-200" />
                </div>
              </div>
            </div>

            {/* Financial Metrics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Financial Metrics</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium text-gray-700">Total Revenue</span>
                    <span className="font-bold text-green-600 text-lg">{formatCurrency(reportData.totalSales)}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium text-gray-700">Total Tips</span>
                    <span className="font-bold text-yellow-600 text-lg">{formatCurrency(reportData.totalTips)}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium text-gray-700">Tip Percentage</span>
                    <span className="font-bold text-blue-600 text-lg">
                      {reportData.totalSales > 0 ? ((reportData.totalTips / reportData.totalSales) * 100).toFixed(1) : 0}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium text-gray-700">Average Order Value</span>
                    <span className="font-bold text-purple-600 text-lg">{formatCurrency(reportData.averageOrderValue)}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Payment Distribution</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                      <span className="font-medium text-gray-700">Cash</span>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-gray-900">{formatCurrency(cash)}</div>
                      <div className="text-xs text-gray-500">
                        {totalPayments > 0 ? ((cash / totalPayments) * 100).toFixed(1) : 0}%
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
                      <span className="font-medium text-gray-700">Card</span>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-gray-900">{formatCurrency(card)}</div>
                      <div className="text-xs text-gray-500">
                        {totalPayments > 0 ? ((card / totalPayments) * 100).toFixed(1) : 0}%
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 bg-purple-500 rounded-full"></div>
                      <span className="font-medium text-gray-700">Mobile</span>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-gray-900">{formatCurrency(mobile)}</div>
                      <div className="text-xs text-gray-500">
                        {totalPayments > 0 ? ((mobile / totalPayments) * 100).toFixed(1) : 0}%
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Detailed Shifts Table */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-bold text-gray-900">Shift Details with Cash Reconciliation</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Staff</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Start Time</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">End Time</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Duration</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Start Cash</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">End Cash</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Difference</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Sales</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Tips</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Orders</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {reportData.shifts.map((shift, index) => {
                      const staff = users.find(u => u.id === shift.user_id);
                      const duration = shift.start_time && shift.end_time 
                        ? ((new Date(shift.end_time).getTime() - new Date(shift.start_time).getTime()) / (1000 * 60 * 60))
                        : 0;
                      const cashDiff = (shift.ending_cash || 0) - (shift.starting_cash || 0);
                      
                      return (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="w-8 h-8 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full flex items-center justify-center mr-3">
                                <span className="text-white font-bold text-xs">{staff?.full_name?.charAt(0) || '?'}</span>
                              </div>
                              <div>
                                <div className="text-sm font-medium text-gray-900">{staff?.full_name || 'Unknown'}</div>
                                <div className="text-xs text-gray-500">ID: {staff?.staff_id || 'N/A'}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                            {shift.start_time ? format(new Date(shift.start_time), 'MMM dd, HH:mm') : 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                            {shift.end_time ? format(new Date(shift.end_time), 'MMM dd, HH:mm') : 'Ongoing'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                            {duration.toFixed(1)}h
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                            {formatCurrency(shift.starting_cash || 0)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                            {formatCurrency(shift.ending_cash || 0)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span className={`font-bold ${cashDiff >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {cashDiff >= 0 ? '+' : ''}{formatCurrency(cashDiff)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600">
                            {formatCurrency(shift.total_sales || 0)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-yellow-600">
                            {formatCurrency(shift.total_tips || 0)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                            {shift.total_orders || 0}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );

      case 'inventory':
        return (
          <div className="space-y-6">
            {/* Top Items Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {reportData.topItems.slice(0, 6).map((item, index) => (
                <div key={index} className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-all">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${
                      index === 0 ? 'from-yellow-400 to-orange-500' :
                      index === 1 ? 'from-gray-400 to-gray-500' :
                      index === 2 ? 'from-orange-400 to-red-500' :
                      'from-blue-400 to-indigo-500'
                    } flex items-center justify-center`}>
                      <span className="text-white font-bold text-lg">#{index + 1}</span>
                    </div>
                    {index < 3 && (
                      <Star className={`w-6 h-6 ${
                        index === 0 ? 'text-yellow-500' :
                        index === 1 ? 'text-gray-400' :
                        'text-orange-500'
                      }`} />
                    )}
                  </div>
                  <h3 className="font-bold text-gray-900 text-lg mb-2">{item.name}</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Quantity Sold:</span>
                      <span className="font-bold text-gray-900">{item.quantity}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Revenue:</span>
                      <span className="font-bold text-green-600">{formatCurrency(item.revenue)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Avg Price:</span>
                      <span className="font-bold text-blue-600">
                        {formatCurrency(item.quantity > 0 ? item.revenue / item.quantity : 0)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Complete Items Table */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-bold text-gray-900">Complete Item Sales Report</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Rank</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Item Name</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Quantity Sold</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Total Revenue</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Average Price</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">% of Total Sales</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {reportData.topItems.map((item, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            index === 0 ? 'bg-yellow-100 text-yellow-800' :
                            index === 1 ? 'bg-gray-100 text-gray-800' :
                            index === 2 ? 'bg-orange-100 text-orange-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            <span className="font-bold text-sm">#{index + 1}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{item.name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-600">
                          {item.quantity}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600">
                          {formatCurrency(item.revenue)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {formatCurrency(item.quantity > 0 ? item.revenue / item.quantity : 0)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {reportData.totalSales > 0 ? ((item.revenue / reportData.totalSales) * 100).toFixed(1) : 0}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );

      case 'customer':
        // Order type analysis
        const orderTypeData = {};
        reportData.orders.forEach(order => {
          const type = order.order_type || 'unknown';
          const amount = parseFloat(order.total_amount) || 0;
          if (!orderTypeData[type]) {
            orderTypeData[type] = { count: 0, revenue: 0 };
          }
          orderTypeData[type].count++;
          orderTypeData[type].revenue += amount;
        });

        return (
          <div className="space-y-6">
            {/* Order Type Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.entries(orderTypeData).map(([type, data]: [string, any], index) => (
                <div key={type} className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${
                      type === 'dine_in' ? 'from-blue-500 to-indigo-500' :
                      type === 'takeaway' ? 'from-green-500 to-emerald-500' :
                      type === 'delivery' ? 'from-orange-500 to-red-500' :
                      type === 'bar' ? 'from-purple-500 to-pink-500' :
                      'from-gray-500 to-gray-600'
                    } flex items-center justify-center`}>
                      <span className="text-white font-bold text-lg">
                        {type === 'dine_in' ? '🍽️' :
                         type === 'takeaway' ? '🥡' :
                         type === 'delivery' ? '🚚' :
                         type === 'bar' ? '🍺' : '📦'}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-gray-900">{data.count}</div>
                      <div className="text-xs text-gray-500">orders</div>
                    </div>
                  </div>
                  <h3 className="font-bold text-gray-900 text-lg mb-2 capitalize">
                    {type.replace('_', ' ')}
                  </h3>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-gray-600 text-sm">Revenue:</span>
                      <span className="font-bold text-green-600">{formatCurrency(data.revenue)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 text-sm">Avg Order:</span>
                      <span className="font-bold text-blue-600">
                        {formatCurrency(data.count > 0 ? data.revenue / data.count : 0)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 text-sm">% of Total:</span>
                      <span className="font-bold text-purple-600">
                        {reportData.totalSales > 0 ? ((data.revenue / reportData.totalSales) * 100).toFixed(1) : 0}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Customer Insights Table */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-bold text-gray-900">Customer Order Analysis</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Order Type</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Total Orders</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Total Revenue</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Average Order Value</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">% of Orders</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">% of Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {Object.entries(orderTypeData).map(([type, data]: [string, any]) => (
                      <tr key={type} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <span className="text-2xl mr-3">
                              {type === 'dine_in' ? '🍽️' :
                               type === 'takeaway' ? '🥡' :
                               type === 'delivery' ? '🚚' :
                               type === 'bar' ? '🍺' : '📦'}
                            </span>
                            <span className="text-sm font-medium text-gray-900 capitalize">
                              {type.replace('_', ' ')}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-600">
                          {data.count}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600">
                          {formatCurrency(data.revenue)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {formatCurrency(data.count > 0 ? data.revenue / data.count : 0)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {reportData.totalOrders > 0 ? ((data.count / reportData.totalOrders) * 100).toFixed(1) : 0}%
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {reportData.totalSales > 0 ? ((data.revenue / reportData.totalSales) * 100).toFixed(1) : 0}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );

      default:
        return <div className="text-center py-8 text-gray-500">Select a report type to view data</div>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-500 mx-auto mb-6"></div>
          <p className="text-xl font-semibold text-gray-700">Loading Reports...</p>
          <p className="text-gray-500 mt-2">Analyzing your business data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-3xl p-8 text-white shadow-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="bg-white/20 backdrop-blur-sm p-4 rounded-2xl">
              <BarChart2 className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold mb-2">Business Reports & Analytics</h1>
              <p className="text-indigo-100">Comprehensive insights into your restaurant performance</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={fetchReportData}
              disabled={loading}
              className="px-6 py-3 bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white rounded-2xl font-bold transition-all transform hover:scale-105 flex items-center shadow-lg border border-white/30"
            >
              <RefreshCw className={`w-5 h-5 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh Data
            </button>
            <button
              onClick={exportToCSV}
              disabled={!reportData}
              className="px-6 py-3 bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white rounded-2xl font-bold transition-all transform hover:scale-105 flex items-center shadow-lg border border-white/30"
            >
              <Download className="w-5 h-5 mr-2" />
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Report Type */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-3">Report Type</label>
            <select
              value={activeReportType}
              onChange={(e) => setActiveReportType(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent font-semibold"
            >
              {Object.entries(REPORT_TYPES).map(([key, type]) => (
                <option key={key} value={key}>{type.label}</option>
              ))}
            </select>
          </div>

          {/* Time Period */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-3">Time Period</label>
            <select
              value={timePeriod}
              onChange={(e) => setTimePeriod(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent font-semibold"
            >
              {Object.entries(TIME_PERIODS).map(([key, period]) => (
                <option key={key} value={key}>{period.label}</option>
              ))}
            </select>
          </div>

          {/* Staff Filter */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-3">Staff Member</label>
            <select
              value={selectedStaff}
              onChange={(e) => setSelectedStaff(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent font-semibold"
            >
              <option value="all">All Staff</option>
              {users.map(user => (
                <option key={user.id} value={user.id}>
                  {user.full_name} ({user.role})
                </option>
              ))}
            </select>
          </div>

          {/* Chart Type */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-3">Chart Type</label>
            <select
              value={chartType}
              onChange={(e) => setChartType(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent font-semibold"
            >
              <option value="line">Line Chart</option>
              <option value="bar">Bar Chart</option>
              <option value="pie">Pie Chart</option>
              <option value="doughnut">Doughnut Chart</option>
            </select>
          </div>
        </div>

        {/* Custom Date Range */}
        {timePeriod === 'custom' && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Start Date</label>
              <input
                type="datetime-local"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent font-semibold"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">End Date</label>
              <input
                type="datetime-local"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent font-semibold"
              />
            </div>
          </div>
        )}
      </div>

      {/* Report Type Tabs */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
        <div className="flex flex-wrap gap-3 mb-6">
          {Object.entries(REPORT_TYPES).map(([key, type]) => {
            const Icon = type.icon;
            return (
              <button
                key={key}
                onClick={() => setActiveReportType(key)}
                className={`flex items-center space-x-3 px-6 py-3 rounded-2xl font-bold transition-all transform hover:scale-105 ${
                  activeReportType === key
                    ? `bg-gradient-to-r ${type.color} text-white shadow-lg`
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{type.label}</span>
              </button>
            );
          })}
        </div>

        {/* Chart */}
        {reportData && generateChartData() && (
          <div className="mb-8">
            <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
              <div className="h-80">
                {renderChart()}
              </div>
            </div>
          </div>
        )}

        {/* Report Content */}
        {reportData ? (
          renderReportContent()
        ) : (
          <div className="text-center py-16">
            <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-500 mb-2">No Data Available</h3>
            <p className="text-gray-400 mb-6">No data found for the selected period and filters</p>
            <button
              onClick={fetchReportData}
              className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-2xl hover:from-purple-600 hover:to-pink-600 font-bold transition-all transform hover:scale-105"
            >
              <RefreshCw className="w-5 h-5 mr-2 inline" />
              Refresh Data
            </button>
          </div>
        )}
      </div>
    </div>
  );
}