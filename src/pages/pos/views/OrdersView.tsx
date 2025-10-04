
import React, { useState, useEffect } from 'react';
import { usePOSStore } from '../../../store/posStore';
import { printReceipt as printToUSB } from '../../../lib/printer';
import { usePrinterStore } from '../../../store/printerStore';
import { posApi } from '../../../lib/api';
import { 
  Clock, 
  Users, 
  DollarSign, 
  CheckCircle, 
  Send, 
  AlertTriangle, 
  Filter, 
  Receipt, 
  Search,
  X,
  Keyboard,
  ChefHat,
  MapPin,
  Phone,
  User,
  Star,
  Flame,
  Package,
  Ban,
  Plus,
  Minus,
  Trash2,
  FileText,
  Edit3
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const statusConfig = {
  open: { 
    color: 'bg-blue-500', 
    bgColor: 'bg-blue-50', 
    borderColor: 'border-blue-200', 
    textColor: 'text-blue-800',
    label: 'Open',
    icon: Package
  },
  sent_to_kitchen: { 
    color: 'bg-yellow-500', 
    bgColor: 'bg-yellow-50', 
    borderColor: 'border-yellow-200', 
    textColor: 'text-yellow-800',
    label: 'In Kitchen',
    icon: ChefHat
  },
  preparing: { 
    color: 'bg-orange-500', 
    bgColor: 'bg-orange-50', 
    borderColor: 'border-orange-200', 
    textColor: 'text-orange-800',
    label: 'Preparing',
    icon: Flame
  },
  ready: { 
    color: 'bg-green-500', 
    bgColor: 'bg-green-50', 
    borderColor: 'border-green-200', 
    textColor: 'text-green-800',
    label: 'Ready',
    icon: CheckCircle
  },
  served: { 
    color: 'bg-purple-500', 
    bgColor: 'bg-purple-50', 
    borderColor: 'border-purple-200', 
    textColor: 'text-purple-800',
    label: 'Served',
    icon: Users
  },
  paid: { 
    color: 'bg-gray-500', 
    bgColor: 'bg-gray-50', 
    borderColor: 'border-gray-200', 
    textColor: 'text-gray-800',
    label: 'Completed',
    icon: DollarSign
  },
  cancelled: { 
    color: 'bg-red-500', 
    bgColor: 'bg-red-50', 
    borderColor: 'border-red-200', 
    textColor: 'text-red-800',
    label: 'Cancelled',
    icon: X
  },
  unknown: { 
    color: 'bg-gray-500', 
    bgColor: 'bg-gray-50', 
    borderColor: 'border-gray-200', 
    textColor: 'text-gray-800',
    label: 'Unknown',
    icon: AlertTriangle
  }
};

const priorityConfig = {
  low: { color: 'text-gray-500', bgColor: 'bg-gray-100', label: 'Low' },
  normal: { color: 'text-blue-500', bgColor: 'bg-blue-100', label: 'Normal' },
  high: { color: 'text-orange-500', bgColor: 'bg-orange-100', label: 'High' },
  urgent: { color: 'text-red-500', bgColor: 'bg-red-100', label: 'Urgent' },
  unknown: { color: 'text-gray-500', bgColor: 'bg-gray-100', label: 'Unknown' }
};

interface OrdersViewProps {
  onPayment: (order: any) => void;
}

// Add Items to Order Modal Component
const AddItemsModal = ({ order, onClose, onAddItems }) => {
  const { menuItems, categories } = usePOSStore();
  const [selectedItems, setSelectedItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);

  const filteredItems = menuItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || item.category_id === selectedCategory;
    return matchesSearch && matchesCategory && item.is_available;
  });

  const addItem = (menuItem) => {
    const existingItem = selectedItems.find(item => item.menu_item_id === menuItem.id);
    if (existingItem) {
      setSelectedItems(items => 
        items.map(item => 
          item.menu_item_id === menuItem.id 
            ? { ...item, quantity: item.quantity + 1, total_price: (item.quantity + 1) * menuItem.price }
            : item
        )
      );
    } else {
      setSelectedItems(items => [...items, {
        menu_item_id: menuItem.id,
        menu_item: menuItem,
        quantity: 1,
        unit_price: menuItem.price,
        total_price: menuItem.price,
        special_instructions: null
      }]);
    }
  };

  const updateQuantity = (menuItemId, newQuantity) => {
    if (newQuantity <= 0) {
      setSelectedItems(items => items.filter(item => item.menu_item_id !== menuItemId));
    } else {
      setSelectedItems(items => 
        items.map(item => 
          item.menu_item_id === menuItemId 
            ? { ...item, quantity: newQuantity, total_price: newQuantity * item.unit_price }
            : item
        )
      );
    }
  };

  const handleSubmit = () => {
    if (selectedItems.length === 0) {
      toast.error('Please select at least one item');
      return;
    }
    onAddItems(selectedItems);
    onClose();
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
        <div className="p-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-bold flex items-center">
              <Plus className="w-6 h-6 mr-3" />
              Add Items to Order {order.order_number}
            </h3>
            <button
              onClick={onClose}
              className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-xl transition-all"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="flex h-[70vh]">
          {/* Menu Items */}
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="mb-4">
              <input
                type="text"
                placeholder="Search menu items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="mb-4 flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-3 py-1 rounded-lg text-sm font-medium ${
                  !selectedCategory ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700'
                }`}
              >
                All
              </button>
              {categories.map(category => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`px-3 py-1 rounded-lg text-sm font-medium ${
                    selectedCategory === category.id ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => addItem(item)}
                  className="p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md transition-all text-left"
                >
                  <h4 className="font-semibold text-gray-900 mb-1">{item.name}</h4>
                  <p className="text-blue-600 font-bold">{formatCurrency(item.price)}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Selected Items */}
          <div className="w-80 border-l border-gray-200 p-6 bg-gray-50">
            <h4 className="font-bold text-gray-900 mb-4">Selected Items ({selectedItems.length})</h4>
            
            <div className="space-y-3 mb-6 max-h-96 overflow-y-auto">
              {selectedItems.map(item => (
                <div key={item.menu_item_id} className="bg-white p-3 rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="font-semibold text-gray-900 text-sm">{item.menu_item.name}</h5>
                    <button
                      onClick={() => updateQuantity(item.menu_item_id, 0)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => updateQuantity(item.menu_item_id, item.quantity - 1)}
                        className="p-1 bg-gray-100 rounded hover:bg-gray-200"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="font-bold">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.menu_item_id, item.quantity + 1)}
                        className="p-1 bg-gray-100 rounded hover:bg-gray-200"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <span className="font-bold text-green-600">{formatCurrency(item.total_price)}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-gray-300 pt-4">
              <div className="flex justify-between items-center mb-4">
                <span className="font-bold text-gray-900">Total:</span>
                <span className="font-bold text-green-600 text-lg">
                  {formatCurrency(selectedItems.reduce((sum, item) => sum + item.total_price, 0))}
                </span>
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={selectedItems.length === 0}
                  className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 font-semibold"
                >
                  Add Items
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Cancel Order Modal Component
const CancelOrderModal = ({ order, onClose, onCancel }) => {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onCancel(order.id, reason);
      onClose();
    } catch (error) {
      // Error handling is done in the parent component
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl">
        <div className="p-6 bg-gradient-to-r from-red-600 to-pink-600 text-white">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold flex items-center">
              <Ban className="w-6 h-6 mr-3" />
              Cancel Order
            </h3>
            <button
              onClick={onClose}
              className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-xl transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h4 className="font-bold text-red-900 mb-2">⚠️ Cancel Order {order.order_number}?</h4>
            <p className="text-red-700 text-sm">
              This action will mark the order as cancelled. The order will remain visible but cannot be processed further.
            </p>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Cancellation Reason (Optional)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 resize-none"
              rows={3}
              placeholder="Enter reason for cancellation..."
            />
          </div>

          <div className="flex space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-semibold"
            >
              Keep Order
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 font-semibold flex items-center justify-center"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : (
                <Ban className="w-4 h-4 mr-2" />
              )}
              {loading ? 'Cancelling...' : 'Cancel Order'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Utility Functions
const getElapsedTime = (createdAt: string): number => {
  const elapsed = Date.now() - new Date(createdAt || Date.now()).getTime();
  return Math.floor(elapsed / (1000 * 60)); // minutes
};

const isOrderUrgent = (order: any): boolean => {
  const elapsedMinutes = getElapsedTime(order.created_at);
  const isUrgent = (order.priority === 'urgent' || elapsedMinutes > 30) && 
                   !['paid', 'cancelled'].includes(order.status);

  return isUrgent;
};

const formatCurrency = (value: number, currency: string): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'UGX',
    minimumFractionDigits: 0,
  }).format(value);
};

// Touch Screen Keyboard Component
const TouchKeyboard = ({ value, onChange, onClose, placeholder = "", type = "text" }) => {
  const [currentValue, setCurrentValue] = useState(value);

  useEffect(() => {
    setCurrentValue(value);
  }, [value]);

  const handleKeyPress = (key: string) => {
    let newValue = currentValue;
    if (key === 'backspace') {
      newValue = currentValue.slice(0, -1);
    } else if (key === 'clear') {
      newValue = '';
    } else if (key === 'space' && type === 'text') {
      newValue = currentValue + ' ';
    } else if (type === 'text') {
      newValue = currentValue + key;
    }
    setCurrentValue(newValue);
    onChange(newValue);
  };

  const handleDone = () => {
    onChange(currentValue);
    onClose();
  };

  const handleCancel = () => {
    setCurrentValue(value);
    onChange(value);
    onClose();
  };

  const numberKeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
  const letterKeys = [
    ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
    ['z', 'x', 'c', 'v', 'b', 'n', 'm']
  ];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end justify-center z-50">
      <div className="bg-white rounded-t-3xl p-6 w-full max-w-2xl shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-900 flex items-center">
            <Keyboard className="w-6 h-6 mr-3 text-blue-500" />
            Touch Keyboard
          </h3>
          <button
            onClick={handleCancel}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
            aria-label="Close keyboard"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="mb-6">
          <div className="p-4 bg-gray-50 rounded-2xl border-2 border-gray-200 min-h-[60px] flex items-center">
            <input
              type="text"
              value={currentValue}
              onChange={(e) => {
                setCurrentValue(e.target.value);
                onChange(e.target.value);
              }}
              placeholder={placeholder}
              className="w-full bg-transparent text-xl font-mono text-gray-900 outline-none"
              aria-label={placeholder}
            />
          </div>
        </div>
        <div className="grid grid-cols-10 gap-2 mb-4">
          {numberKeys.map(key => (
            <button
              key={key}
              onClick={() => handleKeyPress(key)}
              className="h-12 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 rounded-xl font-semibold text-gray-800 transition-all transform active:scale-95"
              aria-label={`Number ${key}`}
            >
              {key}
            </button>
          ))}
        </div>
        {type === 'text' && letterKeys.map((row, rowIndex) => (
          <div key={rowIndex} className={`grid gap-2 mb-3 ${
            rowIndex === 0 ? 'grid-cols-10' : 
            rowIndex === 1 ? 'grid-cols-9' : 'grid-cols-7'
          }`}>
            {row.map(key => (
              <button
                key={key}
                onClick={() => handleKeyPress(key)}
                className="h-12 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 rounded-xl font-semibold text-gray-800 transition-all transform active:scale-95 uppercase"
                aria-label={`Letter ${key}`}
              >
                {key}
              </button>
            ))}
          </div>
        ))}
        <div className="grid grid-cols-4 gap-3 mb-6">
          <button
            onClick={() => handleKeyPress('space')}
            className="h-12 bg-blue-100 hover:bg-blue-200 active:bg-blue-300 text-blue-700 rounded-xl font-semibold transition-all transform active:scale-95"
            aria-label="Space"
          >
            Space
          </button>
          <button
            onClick={() => handleKeyPress('.')}
            className="h-12 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 rounded-xl font-semibold text-gray-800 transition-all transform active:scale-95"
            aria-label="Period"
          >
            .
          </button>
          <button
            onClick={() => handleKeyPress('backspace')}
            className="h-12 bg-orange-100 hover:bg-orange-200 active:bg-orange-300 text-orange-700 rounded-xl font-semibold transition-all transform active:scale-95"
            aria-label="Backspace"
          >
            ⌫
          </button>
          <button
            onClick={() => handleKeyPress('clear')}
            className="h-12 bg-red-100 hover:bg-red-200 active:bg-red-300 text-red-700 rounded-xl font-semibold transition-all transform active:scale-95"
            aria-label="Clear"
          >
            Clear
          </button>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={handleCancel}
            className="flex-1 h-14 border-2 border-gray-300 rounded-2xl text-gray-700 hover:bg-gray-50 font-bold transition-all"
            aria-label="Cancel keyboard"
          >
            Cancel
          </button>
          <button
            onClick={handleDone}
            className="flex-1 h-14 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-2xl hover:from-blue-600 hover:to-indigo-600 font-bold transition-all transform hover:scale-105 flex items-center justify-center"
            aria-label="Confirm keyboard input"
          >
            <CheckCircle className="w-6 h-6 mr-2" />
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

// Error Boundary Component
class OrdersViewErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError(error: any) {
    console.error('[OrdersViewErrorBoundary] Error caught:', error);
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
          <div className="text-center">
            <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-gray-700 mb-4">Something went wrong</h2>
            <p className="text-gray-500 mb-6">Please try refreshing the page or contact support.</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-2xl hover:from-blue-600 hover:to-indigo-600 font-bold transition-all"
            >
              Refresh
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export function OrdersView({ onPayment }: OrdersViewProps) {
  const { orders, sendToKitchen, cancelOrder, addItemsToOrder, removeItemFromOrder, printOrderInvoice, loading, currency, fetchData, currentUser, menuItems, businessSettings } = usePOSStore();
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [sortBy, setSortBy] = useState<'time' | 'priority' | 'amount'>('time');
  const [searchQuery, setSearchQuery] = useState('');
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showAddItemsModal, setShowAddItemsModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  useEffect(() => {
    if (!currentUser?.id) return;

    posApi.initWebSocket(currentUser.id, (event) => {
     
      if (event.event === 'order_update' || event.event === 'dashboard_update' || event.event === 'shift_realtime_update') {
        fetchData();
      }
    });

    posApi.addWebSocketListener('orders-view', (event) => {
     
      if (event.event === 'order_update' || event.event === 'shift_realtime_update') {
        fetchData();
      }
    });

    return () => {
      posApi.removeWebSocketListener('orders-view');
    };
  }, [fetchData]);

  const handleSendToKitchen = async (orderId: string) => {
    // Check inventory before sending to kitchen
    const order = orders.find(o => o.id === orderId);
    if (order?.items) {
      for (const item of order.items) {
        const menuItem = menuItems.find(mi => mi.id === item.menu_item_id);
        if (menuItem?.track_inventory && menuItem.inventory_count < item.quantity) {
          toast.error(`Insufficient inventory for ${menuItem.name}. Available: ${menuItem.inventory_count}, Required: ${item.quantity}`);
          return;
        }
      }
    }

    try {
      await sendToKitchen(orderId);
      toast.success('Order sent to kitchen! 🍳');
    } catch (error: any) {
      toast.error(`Failed to send to kitchen: ${error.message}`);
    }
  };

  const handleCancelOrder = async (orderId: string, reason?: string) => {
    try {
      await cancelOrder(orderId, reason);
      setShowCancelModal(false);
      setSelectedOrder(null);
    } catch (error) {
      // Error handling is done in the store
    }
  };

  const handleAddItemsToOrder = async (items: any[]) => {
    if (!selectedOrder) return;
    try {
      await addItemsToOrder(selectedOrder.id, items);
      setShowAddItemsModal(false);
      setSelectedOrder(null);
    } catch (error) {
      // Error handling is done in the store
    }
  };

  const handlePrintInvoice = (order: any) => {
    try {
      const printerSettings = usePrinterStore.getState().settings;
      
      if (printerSettings.enabled && printerSettings.autoprint) {
        const servedBy = order.user?.name || currentUser?.name || 'Staff';
        const printData = {
          type: 'order_invoice',
          business_name: businessSettings?.business_name || 'RESTAURANT POS',
          address: businessSettings?.address || null,
          phone: businessSettings?.phone || null,
          email: businessSettings?.email || null,
          logo_url: businessSettings?.logo_url || null,
          order_number: order.order_number,
          timestamp: new Date().toISOString(),
          table: order.table?.number || null,
          customer_name: order.customer_name || null,
          order_type: order.order_type,
          items: order.items?.map(item => ({
            name: item.menu_item?.name || 'Unknown Item',
            quantity: item.quantity,
            unit_price: item.unit_price,
            total_price: item.total_price,
            special_instructions: item.special_instructions
          })) || [],
          subtotal: order.subtotal || 0,
          discount_amount: order.discount_amount || 0,
          tax_amount: order.tax_amount || 0,
          tip_amount: order.tip_amount || 0,
          total_amount: order.total_amount,
          payment_method: 'pending',
          served_by: servedBy,
          receipt_footer: 'Amount can change. This is not final. ' + (businessSettings?.receipt_footer || 'Thank you for dining with us!')
        };
        
        printToUSB(printData, printerSettings).then(result => {
          if (result.success) {
            toast.success('Invoice sent to USB printer! 🖨️');
          } else {
            toast.error('Failed to print invoice');
          }
        });
      } else {
        toast.info('Auto-print is disabled. Enable it in printer settings.');
      }
    } catch (error: any) {
      console.error('Print invoice error:', error);
      toast.error('Failed to print invoice');
    }
  };

  const handlePrintReceipt = (order: any) => {
    try {
      const printerSettings = usePrinterStore.getState().settings;
      const { businessSettings } = usePOSStore.getState();
      
      if (printerSettings.enabled && printerSettings.autoprint) {
        const servedBy = order.user?.name || currentUser?.name || 'Staff';
        const printData = {
          type: 'order_receipt',
          business_name: businessSettings?.business_name || 'RESTAURANT POS',
          address: businessSettings?.address || null,
          phone: businessSettings?.phone || null,
          email: businessSettings?.email || null,
          logo_url: businessSettings?.logo_url || null,
          order_number: order.order_number,
          timestamp: new Date().toISOString(),
          table: order.table?.number || null,
          customer_name: order.customer_name || null,
          order_type: order.order_type,
          items: order.items?.map(item => ({
            name: item.menu_item?.name || 'Unknown Item',
            quantity: item.quantity,
            unit_price: item.unit_price,
            total_price: item.total_price,
            special_instructions: item.special_instructions
          })) || [],
          subtotal: order.subtotal || 0,
          discount_amount: order.discount_amount || 0,
          tax_amount: order.tax_amount || 0,
          tip_amount: order.tip_amount || 0,
          total_amount: order.total_amount,
          payment_method: 'reprint',
          served_by: servedBy,
          receipt_footer: businessSettings?.receipt_footer || 'Thank you for dining with us!'
        };
        
        printToUSB(printData, printerSettings).then(result => {
          if (result.success) {
            toast.success('Receipt sent to USB printer! 🖨️');
          } else {
            toast.error('Failed to print receipt');
          }
        });
      } else {
        toast.info('Auto-print is disabled. Enable it in printer settings.');
      }
    } catch (error: any) {
      console.error('Print error:', error);
      toast.error('Failed to print receipt');
    }
  };

  const filteredOrders = orders
    .filter(order => {
      let statusMatch = true;
      if (statusFilter === 'active') {
        statusMatch = ['open', 'sent_to_kitchen', 'preparing', 'ready', 'served'].includes(order.status);
      } else if (statusFilter === 'completed') {
        statusMatch = order.status === 'paid';
      } else if (statusFilter === 'cancelled') {
        statusMatch = order.status === 'cancelled';
      } else if (statusFilter === 'urgent') {
        statusMatch = isOrderUrgent(order);
      } else if (statusFilter !== 'all') {
        statusMatch = order.status === statusFilter;
      }

      const searchMatch = !searchQuery || 
        order.order_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.table?.number?.toString().includes(searchQuery) ||
        order.items?.some(item => 
          item.menu_item?.name?.toLowerCase().includes(searchQuery.toLowerCase())
        );

      return statusMatch && searchMatch;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'priority':
          const priorityOrder = { urgent: 4, high: 3, normal: 2, low: 1, unknown: 0 };
          return priorityOrder[b.priority || 'unknown'] - priorityOrder[a.priority || 'unknown'];
        case 'amount':
          return (b.total_amount || 0) - (a.total_amount || 0);
        case 'time':
        default:
          return new Date(b.created_at || Date.now()).getTime() - new Date(a.created_at || Date.now()).getTime();
      }
    });

  const getStatusCounts = () => {
    return {
      active: orders.filter(o => ['open', 'sent_to_kitchen', 'preparing', 'ready', 'served'].includes(o.status)).length,
      completed: orders.filter(o => o.status === 'paid').length,
      cancelled: orders.filter(o => o.status === 'cancelled').length,
      urgent: orders.filter(o => isOrderUrgent(o)).length,
      total: orders.length,
    };
  };

  const statusCounts = getStatusCounts();
  const canProcessPayment = currentUser?.role !== 'waiter' && currentUser?.role !== 'waitress';
  const canCancelOrder = currentUser?.role === 'manager' || currentUser?.role === 'admin';

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-500 mx-auto mb-6"></div>
          <p className="text-xl text-gray-700 font-semibold">Loading Orders...</p>
          <p className="text-gray-500 mt-2">Please wait while we fetch your orders</p>
        </div>
      </div>
    );
  }

  return (
    <OrdersViewErrorBoundary>
      <div className="h-full bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col">
        <div className="bg-white shadow-lg border-b border-gray-200">
          <div className="p-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="flex items-center space-x-6">
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                    Order Management
                  </h1>
                  <p className="text-gray-600 mt-1">Track and manage all orders efficiently</p>
                </div>
                <div className="hidden lg:flex space-x-4">
                  <button
                    onClick={() => {
                      setStatusFilter('active');
                    }}
                    className="bg-gradient-to-r from-blue-50 to-blue-100 px-4 py-3 rounded-2xl border border-blue-200 hover:bg-blue-200 transition-all"
                    aria-label="Show active orders"
                  >
                    <div className="text-2xl font-bold text-blue-600">{statusCounts.active}</div>
                    <div className="text-xs text-blue-600 font-medium">Active</div>
                  </button>
                  <button
                    onClick={() => {
                      setStatusFilter('completed');
                    }}
                    className="bg-gradient-to-r from-green-50 to-green-100 px-4 py-3 rounded-2xl border border-green-200 hover:bg-green-200 transition-all"
                    aria-label="Show completed orders"
                  >
                    <div className="text-2xl font-bold text-green-600">{statusCounts.completed}</div>
                    <div className="text-xs text-green-600 font-medium">Completed</div>
                  </button>
                  {statusCounts.urgent > 0 && (
                    <button
                      onClick={() => {
                        setStatusFilter('urgent');
                      }}
                      className="bg-gradient-to-r from-red-50 to-red-100 px-4 py-3 rounded-2xl border border-red-200 animate-pulse hover:bg-red-200 transition-all"
                      aria-label="Show urgent orders"
                    >
                      <div className="text-2xl font-bold text-red-600">{statusCounts.urgent}</div>
                      <div className="text-xs text-red-600 font-medium">Urgent</div>
                    </button>
                  )}
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1 min-w-[300px]">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search orders, customers, items..."
                    className="w-full pl-12 pr-12 py-3 border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white text-lg shadow-sm"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                    }}
                    aria-label="Search orders"
                  />
                  <button
                    onClick={() => setShowKeyboard(true)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 p-2 text-gray-400 hover:text-purple-500 hover:bg-purple-50 rounded-xl transition-colors"
                    aria-label="Open keyboard for search"
                  >
                    <Keyboard className="w-5 h-5" />
                  </button>
                </div>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center space-x-2 px-6 py-3 rounded-2xl font-semibold transition-all transform hover:scale-105 ${
                    showFilters 
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg' 
                      : 'bg-white text-gray-700 hover:bg-gray-50 border-2 border-gray-200'
                  }`}
                  aria-label={showFilters ? 'Hide filters' : 'Show filters'}
                >
                  <Filter className="w-5 h-5" />
                  <span>Filters</span>
                </button>
              </div>
            </div>
            {showFilters && (
              <div className="mt-6 p-6 bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl border border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-3">Order Status</label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { value: 'active', label: 'Active Orders', count: statusCounts.active },
                        { value: 'completed', label: 'Completed', count: statusCounts.completed },
                        { value: 'cancelled', label: 'Cancelled', count: statusCounts.cancelled },
                        { value: 'urgent', label: 'Urgent Orders', count: statusCounts.urgent },
                        { value: 'all', label: 'All Orders', count: statusCounts.total },
                      ].map(filter => (
                        <button
                          key={filter.value}
                          onClick={() => {
                            setStatusFilter(filter.value);
                          }}
                          className={`p-3 rounded-xl font-semibold transition-all transform hover:scale-105 ${
                            statusFilter === filter.value
                              ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                              : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                          }`}
                          aria-label={`Filter by ${filter.label}`}
                        >
                          <div>{filter.label}</div>
                          <div className="text-sm opacity-75">({filter.count})</div>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-3">Sort By</label>
                    <div className="space-y-2">
                      {[
                        { value: 'time', label: 'Most Recent', icon: Clock },
                        { value: 'priority', label: 'Priority', icon: AlertTriangle },
                        { value: 'amount', label: 'Amount', icon: DollarSign }
                      ].map(sort => {
                        const Icon = sort.icon;
                        return (
                          <button
                            key={sort.value}
                            onClick={() => {
                              setSortBy(sort.value as any);
                            }}
                            className={`w-full p-3 rounded-xl font-semibold transition-all flex items-center space-x-3 ${
                              sortBy === sort.value
                                ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg'
                                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                            }`}
                            aria-label={`Sort by ${sort.label}`}
                          >
                            <Icon className="w-5 h-5" />
                            <span>{sort.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="flex-1 overflow-auto p-6">
          {filteredOrders.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
              {filteredOrders.map(order => {
                const statusInfo = statusConfig[order.status] || statusConfig.unknown;
                const priorityInfo = priorityConfig[order.priority] || priorityConfig.unknown;
                const elapsedMinutes = getElapsedTime(order.created_at);
                const isUrgent = isOrderUrgent(order);
                const StatusIcon = statusInfo.icon;
                
                return (
                  <div 
                    key={order.id} 
                    className={`bg-white rounded-3xl shadow-xl border-2 transition-all duration-300 hover:shadow-2xl transform hover:scale-105 ${
                      isUrgent ? 'border-red-300 ring-4 ring-red-100 animate-pulse' : statusInfo.borderColor
                    }`}
                  >
                    <div className={`p-6 rounded-t-3xl ${statusInfo.bgColor} ${statusInfo.borderColor} border-b-2`}>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className={`p-3 rounded-2xl ${statusInfo.color} shadow-lg`}>
                            <StatusIcon className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-gray-900">
                              {order.order_number || 'Unknown Order'}
                            </h3>
                            <p className='text-sm text-gray-500 mt-1'>
                              Created By:{""}
                              <span className="font-medium text-purple-600">
                                {order.server?.full_name || 'Unknown'}
                              </span>
                            </p>
                            <div className="flex items-center space-x-2">
                              <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusInfo.color} text-white`}>
                                {statusInfo.label}
                              </span>
                              <span className={`px-2 py-1 rounded-full text-xs font-bold ${priorityInfo.bgColor} ${priorityInfo.color}`}>
                                {priorityInfo.label}
                              </span>
                            </div>
                          </div>
                        </div>
                        {isUrgent && (
                          <button
                            onClick={() => {
                              setStatusFilter('urgent');
                            }}
                            className="flex flex-col items-center"
                            aria-label="Filter urgent orders"
                          >
                            <AlertTriangle className="w-8 h-8 text-red-500 animate-bounce" />
                            <span className="text-xs font-bold text-red-500">URGENT</span>
                          </button>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-bold text-green-600">
                          {formatCurrency(order.total_amount || 0, currency)}
                        </div>
                        <div className="text-sm text-gray-600">
                          {elapsedMinutes < 60 ? `${elapsedMinutes}m ago` : `${Math.floor(elapsedMinutes/60)}h ${elapsedMinutes%60}m ago`}
                        </div>
                      </div>
                    </div>
                    <div className="p-6 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center space-x-2 text-sm">
                          <Clock className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-600 font-medium">
                            {order.created_at ? format(new Date(order.created_at), 'HH:mm') : 'N/A'}
                          </span>
                        </div>
                        {order.table && (
                          <div className="flex items-center space-x-2 text-sm">
                            <MapPin className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-600 font-medium">
                              Table {order.table.number}
                            </span>
                          </div>
                        )}
                        {order.customer_name && (
                          <div className="flex items-center space-x-2 text-sm col-span-2">
                            <User className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-600 font-medium">{order.customer_name}</span>
                          </div>
                        )}
                        {order.customer_phone && (
                          <div className="flex items-center space-x-2 text-sm col-span-2">
                            <Phone className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-600 font-medium">{order.customer_phone}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex justify-center">
                        <span className="px-4 py-2 bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-700 rounded-full text-sm font-bold border border-indigo-200">
                          {order.order_type?.replace('_', ' ').toUpperCase() || 'UNKNOWN'}
                        </span>
                      </div>
                      {order.items && order.items.length > 0 && (
                        <div className="bg-gray-50 rounded-2xl p-4">
                          <h4 className="font-bold text-gray-900 mb-3 flex items-center">
                            <Package className="w-4 h-4 mr-2" />
                            Items ({order.items.length})
                          </h4>
                          <div className="space-y-2 max-h-32 overflow-y-auto">
                            {order.items.map(item => (
                              <div key={item.id} className="flex justify-between items-center text-sm bg-white rounded-xl p-3 shadow-sm">
                                <div className="flex-1">
                                  <span className="font-semibold text-gray-900">
                                    {item.quantity || 0}x {item.menu_item?.name || 'Unknown Item'}
                                  </span>
                                  {item.special_instructions && (
                                    <div className="text-xs text-blue-600 mt-1 italic">
                                      Note: {item.special_instructions}
                                    </div>
                                  )}
                                </div>
                                <span className="font-bold text-green-600 ml-2">
                                  {formatCurrency(item.total_price || 0, currency)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {order.special_requests && (
                        <div className="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-2xl border-2 border-yellow-200">
                          <div className="flex items-start space-x-2">
                            <Star className="w-5 h-5 text-yellow-600 mt-0.5" />
                            <div>
                              <p className="font-bold text-yellow-800 text-sm">Special Requests:</p>
                              <p className="text-yellow-700 text-sm mt-1">{order.special_requests}</p>
                            </div>
                          </div>
                        </div>
                      )}
                      {order.notes && (
                        <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border-2 border-blue-200">
                          <div className="flex items-start space-x-2">
                            <AlertTriangle className="w-5 h-5 text-blue-600 mt-0.5" />
                            <div>
                              <p className="font-bold text-blue-800 text-sm">Notes:</p>
                              <p className="text-blue-700 text-sm mt-1">{order.notes}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="p-6 border-t border-gray-100">
                      <div className="space-y-3">
                        {/* Print Invoice Button - Available for all non-cancelled orders */}
                        {order.status !== 'cancelled' && (
                          <button
                            onClick={() => handlePrintInvoice(order)}
                            className="w-full py-3 px-4 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-2xl hover:from-gray-600 hover:to-gray-700 font-bold flex items-center justify-center transition-all transform hover:scale-105 shadow-lg"
                            disabled={loading}
                            aria-label={`Print invoice for order ${order.order_number}`}
                          >
                            <FileText className="w-5 h-5 mr-2" />
                            Print Invoice
                          </button>
                        )}

                        {/* Order Management Actions */}
                        {['open', 'sent_to_kitchen', 'preparing', 'ready', 'served'].includes(order.status) && (
                          <div className="grid grid-cols-2 gap-3">
                            <button
                              onClick={() => {
                                setSelectedOrder(order);
                                setShowAddItemsModal(true);
                              }}
                              className="py-3 px-4 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-2xl hover:from-blue-600 hover:to-indigo-600 transition-all font-bold flex items-center justify-center transform hover:scale-105 shadow-lg"
                              disabled={loading}
                              aria-label={`Add items to order ${order.order_number}`}
                            >
                              <Plus className="w-5 h-5 mr-2" />
                              Add Items
                            </button>
                            {canCancelOrder && (
                              <button
                                onClick={() => {
                                  setSelectedOrder(order);
                                  setShowCancelModal(true);
                                }}
                                className="py-3 px-4 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-2xl hover:from-red-600 hover:to-pink-600 transition-all font-bold flex items-center justify-center transform hover:scale-105 shadow-lg"
                                disabled={loading}
                                aria-label={`Cancel order ${order.order_number}`}
                              >
                                <Ban className="w-5 h-5 mr-2" />
                                Cancel
                              </button>
                            )}
                          </div>
                        )}

                        {order.status === 'open' && (
                          <div className="grid grid-cols-2 gap-3">
                            <button
                              onClick={() => handleSendToKitchen(order.id)}
                              className="py-4 px-4 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-2xl hover:from-yellow-600 hover:to-orange-600 transition-all font-bold flex items-center justify-center transform hover:scale-105 shadow-lg"
                              disabled={loading}
                              aria-label={`Send order ${order.order_number} to kitchen`}
                            >
                              <Send className="w-5 h-5 mr-2" />
                              Kitchen
                            </button>
                            {canProcessPayment && (
                              <button
                                onClick={() => onPayment(order)}
                                className="py-4 px-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-2xl hover:from-green-600 hover:to-emerald-600 transition-all font-bold flex items-center justify-center transform hover:scale-105 shadow-lg"
                                disabled={loading}
                                aria-label={`Process payment for order ${order.order_number}`}
                              >
                                <DollarSign className="w-5 h-5 mr-2" />
                                Pay
                              </button>
                            )}
                          </div>
                        )}

                        {(order.status === 'ready' || order.status === 'served') && canProcessPayment && (
                          <button
                            onClick={() => onPayment(order)}
                            className="w-full py-4 px-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-2xl hover:from-green-600 hover:to-emerald-600 transition-all font-bold flex items-center justify-center transform hover:scale-105 shadow-lg"
                            disabled={loading}
                            aria-label={`Process payment for order ${order.order_number}`}
                          >
                            <DollarSign className="w-5 h-5 mr-2" />
                            Process Payment
                          </button>
                        )}
                        {order.status === 'paid' && (
                          <button
                            onClick={() => handlePrintReceipt(order)}
                            className="w-full py-4 px-4 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-2xl hover:from-blue-600 hover:to-indigo-600 font-bold flex items-center justify-center transition-all transform hover:scale-105 shadow-lg"
                            aria-label={`Print receipt for order ${order.order_number}`}
                          >
                            <Receipt className="w-5 h-5 mr-2" />
                            Print Receipt
                          </button>
                        )}

                        {order.status === 'cancelled' && (
                          <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                            <div className="flex items-center space-x-2 text-red-700">
                              <Ban className="w-5 h-5" />
                              <span className="font-bold">Order Cancelled</span>
                            </div>
                            {order.cancellation_reason && (
                              <p className="text-sm text-red-600 mt-2">
                                Reason: {order.cancellation_reason}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-20">
              <div className="bg-gradient-to-r from-gray-100 to-gray-200 rounded-full w-32 h-32 flex items-center justify-center mx-auto mb-8">
                <Clock className="w-16 h-16 text-gray-400" />
              </div>
              <h2 className="text-3xl font-bold text-gray-500 mb-4">No Orders Found</h2>
              <p className="text-xl text-gray-400 mb-6">
                {statusFilter === 'all' 
                  ? 'No orders have been placed yet'
                  : statusFilter === 'urgent'
                  ? 'No urgent orders found'
                  : searchQuery
                  ? `No orders match "${searchQuery}"`
                  : `No ${statusFilter} orders found`
                }
              </p>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-2xl hover:from-purple-600 hover:to-pink-600 font-bold transition-all transform hover:scale-105"
                  aria-label="Clear search"
                >
                  Clear Search
                </button>
              )}
            </div>
          )}
        </div>

        {/* Modals */}
        {showCancelModal && selectedOrder && (
          <CancelOrderModal
            order={selectedOrder}
            onClose={() => {
              setShowCancelModal(false);
              setSelectedOrder(null);
            }}
            onCancel={handleCancelOrder}
          />
        )}

        {showAddItemsModal && selectedOrder && (
          <AddItemsModal
            order={selectedOrder}
            onClose={() => {
              setShowAddItemsModal(false);
              setSelectedOrder(null);
            }}
            onAddItems={handleAddItemsToOrder}
          />
        )}
        {showKeyboard && (
          <TouchKeyboard
            value={searchQuery}
            onChange={setSearchQuery}
            onClose={() => setShowKeyboard(false)}
            placeholder="Search orders, customers, items..."
            type="text"
          />
        )}
      </div>
    </OrdersViewErrorBoundary>
  );
}
