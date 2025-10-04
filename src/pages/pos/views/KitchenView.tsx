import React, { useState, useEffect } from 'react';
import { usePOSStore } from '../../../store/posStore';
import { posApi } from '../../../lib/api';
import { Order, POSUser } from '../../../types/pos';
import { Clock, AlertTriangle, CheckCircle, Users, Flame } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

const priorityConfig = {
  low: { color: 'border-gray-300 bg-gray-50', textColor: 'text-gray-600' },
  normal: { color: 'border-blue-300 bg-blue-50', textColor: 'text-blue-700' },
  high: { color: 'border-orange-300 bg-orange-50', textColor: 'text-orange-700' },
  urgent: { color: 'border-red-300 bg-red-50', textColor: 'text-red-700' }
};

const statusConfig = {
  sent_to_kitchen: { label: 'New Order', color: 'bg-blue-500', action: 'Start Preparing' },
  preparing: { label: 'Preparing', color: 'bg-orange-500', action: 'Mark Ready' },
  
};

export function KitchenView() {
  const { orders, dataLoaded, fetchDataLazy } = usePOSStore();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [user, setUser] = useState<POSUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [kitchenPolling, setKitchenPolling] = useState<NodeJS.Timeout | null>(null);

  // Real-time updates via WebSocket
  useEffect(() => {
    // Load orders data if not already loaded
    if (!dataLoaded.orders) {
      fetchDataLazy(['orders']);
    }
  }, [dataLoaded.orders, fetchDataLazy]);

  useEffect(() => {
    // Set up optimized polling for kitchen orders
    const interval = setInterval(() => {
      if (dataLoaded.orders) {
        fetchDataLazy(['orders']);
      }
    }, 1500); // Refresh every 1.5 seconds for kitchen (faster updates)

    setKitchenPolling(interval);

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [dataLoaded.orders, fetchDataLazy]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0,
    }).format(value);
  };

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Load current user from local storage
  useEffect(() => {
    const storedUser = localStorage.getItem('pos_user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error(JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'error',
          message: 'Failed to parse stored user',
          error: error instanceof Error ? error.message : String(error),
        }, null, 2));
      }
    }
  }, []);



  // Filter orders for kitchen display
  const filteredOrders = orders
    .filter(order => ['sent_to_kitchen', 'preparing', 'ready'].includes(order.status))
    .sort((a, b) => {
      const priorityOrder = { urgent: 4, high: 3, normal: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority || 'normal'] - priorityOrder[a.priority || 'normal'];
      if (priorityDiff !== 0) return priorityDiff;
      return new Date(a.created_at || Date.now()).getTime() - new Date(b.created_at || Date.now()).getTime();
    });

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    if (!user?.id) {
      console.error(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'error',
        message: 'No user ID available for status update',
      }, null, 2));
      toast.error('User not authenticated');
      return;
    }

    setLoading(true);
    try {
      await posApi.updateOrderStatus(orderId, newStatus, user.id);
      
      // Immediately update local state for instant feedback
      const { orders: currentOrders } = usePOSStore.getState();
      const updatedOrders = currentOrders.map(order => 
        order.id === orderId 
          ? { ...order, status: newStatus, updated_at: new Date().toISOString() }
          : order
      );
      usePOSStore.setState({ orders: updatedOrders });
      
      // Then fetch fresh data in background
      setTimeout(() => fetchDataLazy(['orders']), 100);
      
      toast.success(`Order updated to ${statusConfig[newStatus]?.label || newStatus}`);
    } catch (error) {
      console.error(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'error',
        message: 'Failed to update order status',
        order_id: orderId,
        new_status: newStatus,
        error: error instanceof Error ? error.message : String(error),
      }, null, 2));
      toast.error(`Failed to update order status: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  };

  const getElapsedTime = (createdAt: string) => {
    const elapsed = Date.now() - new Date(createdAt || Date.now()).getTime();
    return Math.floor(elapsed / (1000 * 60)); // minutes
  };

  const getNextStatus = (currentStatus: string) => {
    switch (currentStatus) {
      case 'sent_to_kitchen': return 'preparing';
      case 'preparing': return 'ready';
      default: return currentStatus;
    }
  };

  // Show loading only if data is not loaded yet
  if (!dataLoaded.orders) {
    return (
      <div className="h-full flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900 text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-orange-500 mx-auto mb-6"></div>
          <p className="text-xl font-semibold">Loading Kitchen Orders...</p>
          <p className="text-slate-300">Preparing your kitchen display</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-gradient-to-br from-slate-800 to-slate-900 text-white">
      {/* Kitchen Header */}
      <div className="p-6 bg-slate-900 border-b border-slate-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="bg-gradient-to-r from-orange-500 to-red-500 p-3 rounded-xl">
              <Flame className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Kitchen Display</h1>
              <p className="text-slate-300">
                {format(currentTime, 'EEEE, MMMM d, yyyy • HH:mm')}
              </p>
            </div>
          </div>
          
          <div className="text-right">
            <div className="text-3xl font-bold text-orange-400">
              {filteredOrders.length}
            </div>
            <div className="text-slate-300">Active Orders</div>
            <div className="text-slate-400 text-sm mt-1">
              Auto-refresh: 2s
            </div>
          </div>
        </div>
      </div>

      {/* Orders Grid */}
      <div className="flex-1 overflow-auto p-6">
        {filteredOrders.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
            {filteredOrders.map((order: Order) => {
              const elapsedMinutes = getElapsedTime(order.created_at);
              const isOverdue = elapsedMinutes > 20;
              const priorityStyle = priorityConfig[order.priority || 'normal'] || priorityConfig.normal;
              const statusInfo = statusConfig[order.status] || { label: order.status, color: 'bg-green-500', action: 'Serve Now' };
              
              return (
                <div 
                  key={order.id}
                  className={`bg-white text-gray-900 rounded-2xl shadow-2xl border-4 transition-all ${
                    isOverdue ? 'border-red-500 ring-4 ring-red-200 animate-pulse' : priorityStyle.color
                  }`}
                >
                  {/* Order Header */}
                  <div className="p-6 border-b border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <h2 className="text-2xl font-bold text-gray-900">
                          {order.order_number || 'Unknown Order'}
                        </h2>
                        {isOverdue && (
                          <AlertTriangle className="w-6 h-6 text-red-500 animate-bounce" />
                        )}
                      </div>
                      <div className={`px-3 py-1 rounded-full text-white text-sm font-bold ${statusInfo.color}`}>
                        {statusInfo.label}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-1">
                          <Clock className="w-4 h-4 text-gray-500" />
                          <span className={`font-semibold ${isOverdue ? 'text-red-600' : 'text-gray-600'}`}>
                            {elapsedMinutes}m ago
                          </span>
                        </div>
                        {order.table && (
                          <div className="flex items-center space-x-1">
                            <Users className="w-4 h-4 text-gray-500" />
                            <span className="text-gray-600">Table {order.table.number}</span>
                          </div>
                        )}
                      </div>
                      <div className={`font-bold ${priorityStyle.textColor}`}>
                        {order.priority?.toUpperCase() || 'NORMAL'} PRIORITY
                      </div>
                    </div>
                  </div>

                  {/* Order Items */}
                  <div className="p-6">
                    <div className="space-y-4">
                      {order.items?.map(item => (
                        <div key={item.id} className="border-l-2 border-blue-500 pl-2">
                          <div className="flex items-center justify-between mb-1">
                            <h3 className="text-sm font-bold text-gray-900">
                              {item.quantity || 0}x {item.menu_item?.name || `Item ID: ${item.menu_item_id}`}
                            </h3>
                            <div className="text-xs font-semibold text-gray-900">
                              {formatCurrency(item.total_price || 0)}
                            </div>
                          </div>
                          <div className={`px-1 py-0.5 rounded text-2xs font-bold inline-block ${
                            item.status === 'preparing' ? 'bg-orange-100 text-orange-800' :
                            item.status === 'ready' ? 'bg-green-100 text-green-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {item.status || 'Ordered'}
                          </div>
                          {item.modifiers && item.modifiers.length > 0 && (
                            <div className="mt-1">
                              <p className="text-xs font-semibold text-gray-700">Modifiers:</p>
                              <p className="text-xs text-gray-600">
                                {item.modifiers.map(mod => mod.name).join(', ')}
                              </p>
                            </div>
                          )}
                          {item.special_instructions && (
                            <div className="mt-1 p-1 bg-yellow-100 rounded border border-yellow-300">
                              <p className="text-xs font-semibold text-yellow-800">
                                Special Instructions:
                              </p>
                              <p className="text-xs text-yellow-700">
                                {item.special_instructions}
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Order Notes */}
                    {(order.special_requests || order.kitchen_notes) && (
                      <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-200">
                        {order.special_requests && (
                          <div className="mb-1">
                            <p className="text-xs font-semibold text-blue-800">Special Requests:</p>
                            <p className="text-xs text-blue-700">{order.special_requests}</p>
                          </div>
                        )}
                        {order.kitchen_notes && (
                          <div>
                            <p className="text-xs font-semibold text-blue-800">Kitchen Notes:</p>
                            <p className="text-xs text-blue-700">{order.kitchen_notes}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Action Button */}
                  <div className="p-3 border-t border-gray-200">
                    <button
                      onClick={() => updateOrderStatus(order.id, getNextStatus(order.status))}
                      className={`w-full py-2 px-4 rounded-lg font-bold text-white transition-all transform hover:scale-105 ${statusInfo.color} hover:opacity-90 text-sm`}
                      disabled={loading || !user?.id}
                    >
                      {statusInfo.action}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16">
            <CheckCircle className="w-20 h-20 text-green-400 mx-auto mb-6" />
            <h2 className="text-3xl font-bold text-white mb-4">All Caught Up! 🎉</h2>
            <p className="text-xl text-slate-300">No orders in the kitchen queue</p>
            <p className="text-slate-400 mt-2">New orders will appear here automatically</p>
          </div>
        )}
      </div>
    </div>
  );
}