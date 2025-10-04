import React, { useState, useEffect } from 'react';
import { usePOSStore } from '../../../store/posStore';
import { ShoppingCart, Plus, Minus, Trash2, Send, User, MapPin, Percent, DollarSign, Tag, Edit3, Keyboard, X, Check, Coffee, Sparkles, Clock, Star, Users } from 'lucide-react';
import toast from 'react-hot-toast';

interface OrderPanelProps {
  onPayment?: (order: any) => void;
  onCreateOrder?: () => boolean;
  isDataLoaded?: boolean;
}

interface TouchKeyboardProps {
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
  placeholder?: string;
  type?: string;
}

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
    } else if (type === 'number' && !isNaN(parseInt(key))) {
      newValue = currentValue + key;
    } else if (type === 'text') {
      newValue = currentValue + key;
    }
    setCurrentValue(newValue);
    onChange(newValue); // Update parent state immediately
    console.log(`[TouchKeyboard] Key pressed: ${key}, New value: ${newValue}`);
  };

  const handleDone = () => {
    onChange(currentValue); // Ensure final value is sent
    onClose();
    console.log(`[TouchKeyboard] Done: Final value: ${currentValue}`);
  };

  const handleCancel = () => {
    setCurrentValue(value);
    onChange(value); // Revert to original value
    onClose();
    console.log(`[TouchKeyboard] Cancel: Reverted to: ${value}`);
  };

  const keypadButtons = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['clear', '0', 'backspace']
  ];

  const letterKeys = [
    ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
    ['z', 'x', 'c', 'v', 'b', 'n', 'm']
  ];

  return (
  <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-2 animate-in fade-in duration-300">
    <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-300">
      {/* Header Section */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-gray-900">ORD002028</h2>
          
          {/* ADD CREATOR'S NAME HERE */}
          <div className="flex items-center mt-1">
            <span className="text-sm text-gray-500">Created by: </span>
            <span className="text-sm font-medium text-purple-600 ml-1">
              {order.server_name || order.server?.full_name}
            </span>
          </div>
          
          <div className="flex items-center space-x-2 mt-2">
            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-bold rounded-full">
              Open
            </span>
            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-bold rounded-full">
              Normal
            </span>
          </div>
        </div>
        <button
          onClick={onClose} // Assuming you have an onClose prop
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all transform hover:scale-110"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Order Summary */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900">UGX 5,000</p>
          <p className="text-sm text-gray-500">36m ago</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-semibold text-gray-700">19:00</p>
          <p className="text-sm text-gray-500">TAKEAWAY</p>
        </div>
      </div>

      {/* Items Section */}
      <div className="mb-6">
        <h3 className="text-lg font-bold text-gray-900 mb-3">Items (1)</h3>
        <div className="bg-gray-50 rounded-2xl p-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="font-semibold">1x AFRICAN TEA</p>
              <p className="text-sm text-gray-500">UGX 5,000</p>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button className="col-span-2 py-3 px-4 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-2xl font-bold hover:from-blue-600 hover:to-indigo-600 transition-all">
          Print Invoice
        </button>
        
        <div className="col-span-2 grid grid-cols-2 gap-3">
          <button className="py-3 px-4 bg-gray-100 text-gray-700 rounded-2xl font-bold hover:bg-gray-200 transition-all">
            + Add Items
          </button>
          <button className="py-3 px-4 bg-green-100 text-green-700 rounded-2xl font-bold hover:bg-green-200 transition-all">
            Kitchen
          </button>
        </div>
        
        <button className="py-3 px-4 bg-red-100 text-red-700 rounded-2xl font-bold hover:bg-red-200 transition-all">
          Cancel
        </button>
        <button className="py-3 px-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-2xl font-bold hover:from-green-600 hover:to-emerald-600 transition-all">
          Pay
        </button>
      </div>
    </div>
  </div>
  );
};

export function OrderPanel({ onPayment, onCreateOrder, isDataLoaded = true }: OrderPanelProps = {}) {
  const {
    cart,
    selectedTable,
    currentUser,
    currentShift,
    discountType,
    discountValue,
    updateCartItem,
    removeFromCart,
    clearCart,
    setDiscount,
    createOrder,
    orders,
    fetchDataLazy,
  } = usePOSStore();

  const [orderType, setOrderType] = useState<'dine_in' | 'takeaway' | 'delivery' | 'bar'>('dine_in');
  const [customerName, setCustomerName] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [tempDiscountType, setTempDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [tempDiscountValue, setTempDiscountValue] = useState('');
  const [showPaymentFirst, setShowPaymentFirst] = useState(false);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editQuantity, setEditQuantity] = useState('');
  const [editInstructions, setEditInstructions] = useState('');
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [keyboardTarget, setKeyboardTarget] = useState<'quantity' | 'instructions' | 'customer' | 'discount'>('quantity');

  // Load required data if not available
  useEffect(() => {
    if (!isDataLoaded) {
      fetchDataLazy(['menuItems', 'categories']);
    }
  }, [isDataLoaded, fetchDataLazy]);

  // Check if selected table has an existing order
  const existingOrder = selectedTable ? orders.find(order => 
    order.table?.id === selectedTable.id && !['paid', 'cancelled'].includes(order.status)
  ) : null;

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value).replace('UGX', '').trim();
  };

  const getCurrentKeyboardValue = () => {
    console.log(`[OrderPanel] Getting current keyboard value for target: ${keyboardTarget}`);
    switch (keyboardTarget) {
      case 'quantity':
        return editQuantity;
      case 'instructions':
        return editInstructions;
      case 'customer':
        return customerName;
      case 'discount':
        return tempDiscountValue;
      default:
        return '';
    }
  };

  const subtotal = cart.reduce((sum, item) => sum + parseFloat(item.total_price), 0);
  let discountAmount = 0;
  if (discountType && discountValue) {
    discountAmount = discountType === 'percentage' ? (subtotal * discountValue) / 100 : discountValue;
    discountAmount = Math.floor(discountAmount);
  }
  const discountedSubtotal = subtotal - discountAmount;
  const taxAmount = discountedSubtotal * 0.0;
  const total = discountedSubtotal + taxAmount;

  const handleCreateOrder = async (sendToKitchenFlag = false) => {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return null;
    }
    if (orderType === 'dine_in' && !selectedTable) {
      toast.error('Please select a table');
      return null;
    }
    if (!currentUser) {
      toast.error('No user logged in');
      return null;
    }
    if (onCreateOrder && !onCreateOrder()) {
      return null;
    }

    // Show immediate feedback
    const loadingToast = toast.loading('Creating order...');
    
    setLoading(true);
    try {
      // Use optimized order creation
      const { createOrderOptimized } = usePOSStore.getState();
      const order = await (createOrderOptimized || createOrder)(orderType, customerName, sendToKitchenFlag);
      
      toast.dismiss(loadingToast);
      toast.success(`Order ${order.order_number} ${sendToKitchenFlag ? 'sent to kitchen' : 'created'}`);
      clearCart();
      setCustomerName('');
      return order;
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error(`Failed to ${sendToKitchenFlag ? 'send order to kitchen' : 'create order'}: ${error.message}`);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentFirst = async () => {
    if (!onPayment) {
      toast.error('Payment processing is not available');
      return;
    }
    try {
      const order = await handleCreateOrder(false);
      if (order) {
        onPayment(order);
        setShowPaymentFirst(false);
      }
    } catch (error) {
      toast.error(`Failed to create order for payment: ${error.message}`);
    }
  };

  const handleEditItem = (item: any) => {
    setEditingItem(item.id);
    setEditQuantity(item.quantity.toString());
    setEditInstructions(item.special_instructions || '');
  };

  const handleSaveEdit = () => {
    if (!editingItem) return;
    
    const quantity = parseInt(editQuantity);
    if (isNaN(quantity) || quantity < 1) {
      toast.error('Please enter a valid quantity (1 or greater)');
      return;
    }

    updateCartItem(editingItem, quantity, editInstructions);
    setEditingItem(null);
    setEditQuantity('');
    setEditInstructions('');
    toast.success('Item updated successfully');
  };

  const handleCancelEdit = () => {
    setEditingItem(null);
    setEditQuantity('');
    setEditInstructions('');
  };

  const handleApplyDiscount = () => {
    const value = parseInt(tempDiscountValue);
    if (isNaN(value) || value < 0) {
      toast.error('Please enter a valid discount value');
      return;
    }
    if (tempDiscountType === 'percentage' && value > 100) {
      toast.error('Percentage discount cannot exceed 100%');
      return;
    }
    setDiscount(tempDiscountType, value);
    setShowDiscountModal(false);
    setTempDiscountValue('');
    toast.success(`${tempDiscountType === 'percentage' ? value + '%' : formatCurrency(value)} discount applied`);
  };

  const handleRemoveDiscount = () => {
    setDiscount(null, 0);
    toast.success('Discount removed');
  };

  const handleKeyboardChange = (value: string) => {
    console.log(`[OrderPanel] Keyboard change: Target=${keyboardTarget}, Value=${value}`);
    switch (keyboardTarget) {
      case 'quantity':
        setEditQuantity(value);
        break;
      case 'instructions':
        setEditInstructions(value);
        break;
      case 'customer':
        setCustomerName(value);
        break;
      case 'discount':
        setTempDiscountValue(value);
        break;
    }
  };

  const handleKeyboardClose = () => {
    if (keyboardTarget === 'quantity' && editingItem) {
      const quantity = parseInt(editQuantity);
      if (!isNaN(quantity) && quantity >= 1) {
        updateCartItem(editingItem, quantity, editInstructions);
        toast.success('Quantity updated successfully');
      } else {
        toast.error('Quantity not saved: Invalid input');
      }
    } else if (keyboardTarget === 'instructions' && editingItem) {
      if (editQuantity && parseInt(editQuantity) >= 1) {
        updateCartItem(editingItem, parseInt(editQuantity), editInstructions);
        toast.success('Instructions updated successfully');
      } else {
        toast.error('Instructions not saved: Invalid quantity');
      }
    } else if (keyboardTarget === 'discount' && showDiscountModal) {
      const value = parseInt(tempDiscountValue);
      if (!isNaN(value) && value >= 0) {
        setTempDiscountValue(value.toString());
      } else {
        setTempDiscountValue('');
        toast.error('Discount not saved: Invalid input');
      }
    }
    setShowKeyboard(false);
    console.log(`[OrderPanel] Keyboard closed: Target=${keyboardTarget}`);
  };

  return (
    <div className="flex flex-col bg-gradient-to-br from-slate-50 via-white to-slate-100 h-full shadow-2xl border-l border-gray-200">
      {/* Enhanced Header */}
      <div className="p-6 bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 text-white shadow-xl relative overflow-hidden">
        <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-white/20 backdrop-blur-sm p-3 rounded-2xl shadow-lg">
                <ShoppingCart className="w-7 h-7 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight">Shopping Cart</h2>
                <div className="flex items-center space-x-2 mt-1">
                  <div className="bg-white/20 px-3 py-1 rounded-full">
                    <span className="text-sm font-semibold">
                      {cart.length} {cart.length === 1 ? 'item' : 'items'}
                    </span>
                  </div>
                  <div className="bg-white/20 px-3 py-1 rounded-full">
                    <span className="text-sm font-bold">USh{formatCurrency(total)}</span>
                  </div>
                </div>
              </div>
            </div>
            {cart.length > 0 && (
              <button
                onClick={clearCart}
                className="bg-white/20 hover:bg-white/30 backdrop-blur-sm p-3 rounded-2xl transition-all transform hover:scale-110 shadow-lg"
                aria-label="Clear cart"
              >
                <Trash2 className="w-5 h-5 text-white" />
              </button>
            )}
          </div>
        </div>
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-16 translate-x-16"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-12 -translate-x-12"></div>
      </div>

      {/* Order Type Selection */}
      <div className="p-4 bg-white border-b border-gray-100">
        <label className="block text-sm font-bold text-gray-700 mb-3 flex items-center">
          <Sparkles className="w-4 h-4 mr-2 text-purple-500" />
          Order Type
        </label>
        <div className="grid grid-cols-2 gap-3">
          {[
            { value: 'dine_in', label: 'Dine In', icon: '🍽️', gradient: 'from-blue-500 to-blue-600' },
            { value: 'takeaway', label: 'Takeaway', icon: '🥡', gradient: 'from-green-500 to-green-600' },
            { value: 'delivery', label: 'Delivery', icon: '🚚', gradient: 'from-orange-500 to-orange-600' },
            { value: 'bar', label: 'Bar', icon: '🍺', gradient: 'from-purple-500 to-purple-600' },
          ].map(type => (
            <button
              key={type.value}
              onClick={() => setOrderType(type.value as any)}
              className={`px-4 py-4 rounded-2xl font-bold transition-all transform hover:scale-105 shadow-lg ${
                orderType === type.value 
                  ? `bg-gradient-to-r ${type.gradient} text-white shadow-xl` 
                  : 'bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700 hover:from-gray-100 hover:to-gray-200 border border-gray-200'
              }`}
              aria-label={`Select ${type.label} order type`}
            >
              <div className="text-2xl mb-2">{type.icon}</div>
              <div className="text-xs font-bold">{type.label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Table Selection for Dine In */}
      {orderType === 'dine_in' && (
        <div className="p-4 bg-white border-b border-gray-100">
          <div className="flex items-center text-sm font-bold text-gray-700 mb-3">
            <MapPin className="w-4 h-4 mr-2 text-purple-500" />
            Selected Table
          </div>
          {selectedTable ? (
            <div className={`p-4 border-2 rounded-2xl shadow-sm ${
              existingOrder 
                ? 'bg-gradient-to-r from-orange-50 to-yellow-50 border-orange-200' 
                : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`font-bold text-lg ${existingOrder ? 'text-orange-900' : 'text-blue-900'}`}>
                    Table {selectedTable.number}
                  </p>
                  <p className={`text-sm flex items-center mt-1 ${existingOrder ? 'text-orange-600' : 'text-blue-600'}`}>
                    <Users className="w-4 h-4 mr-1" />
                    Capacity: {selectedTable.capacity} guests
                  </p>
                  {existingOrder && (
                    <p className="text-xs text-orange-700 mt-1 font-semibold">
                      ⚠️ Has active order: {existingOrder.order_number}
                    </p>
                  )}
                </div>
                <div className="text-3xl">{existingOrder ? '🍽️' : '🪑'}</div>
              </div>
              {existingOrder && (
                <div className="mt-3 p-2 bg-white/60 rounded-lg">
                  <p className="text-xs text-orange-800 font-bold">
                    Adding items to existing order
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-200 rounded-2xl shadow-sm">
              <div className="flex items-center">
                <div className="text-2xl mr-3">⚠️</div>
                <div>
                  <p className="text-sm text-yellow-800 font-bold">No Table Selected</p>
                  <p className="text-xs text-yellow-700">Please select a table from the Tables tab</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Customer Name for Takeaway/Delivery */}
      {(orderType === 'takeaway' || orderType === 'delivery') && (
        <div className="p-4 bg-white border-b border-gray-100">
          <label className="block text-sm font-bold text-gray-700 mb-3">
            <User className="inline w-4 h-4 mr-2 text-purple-500" />
            Customer Name
          </label>
          <div className="flex space-x-3">
            <input
              type="text"
              value={customerName}
              onChange={e => setCustomerName(e.target.value)}
              className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm font-semibold bg-gradient-to-r from-gray-50 to-white"
              placeholder="Enter customer name"
              aria-label="Customer name"
            />
            <button
              onClick={() => { setKeyboardTarget('customer'); setShowKeyboard(true); }}
              className="px-4 py-3 bg-gradient-to-r from-purple-100 to-pink-100 hover:from-purple-200 hover:to-pink-200 text-purple-600 rounded-2xl transition-all transform hover:scale-110 shadow-sm"
              aria-label="Open keyboard for customer name"
            >
              <Keyboard className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Cart Items */}
      <div className="flex-1 overflow-auto">
        {cart.length === 0 ? (
          <div className="p-6 text-center">
            <div className="bg-gradient-to-r from-gray-100 to-gray-200 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4 shadow-inner">
              <Coffee className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-500 mb-2">Your cart is empty</h3>
            <p className="text-sm text-gray-400">Add delicious items from the menu to get started</p>
            <div className="mt-4 flex justify-center">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-purple-300 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-pink-300 rounded-full animate-bounce animation-delay-200"></div>
                <div className="w-2 h-2 bg-indigo-300 rounded-full animate-bounce animation-delay-400"></div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {cart.map((item, index) => (
              <div 
                key={item.id} 
                className="bg-white rounded-3xl p-5 shadow-lg border-2 border-gray-100 hover:border-purple-200 transition-all duration-300 transform hover:scale-[1.02] hover:shadow-xl"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 pr-4">
                    <h3 className="font-bold text-gray-900 text-lg mb-2 leading-tight">
                      {item.menu_item?.name || 'Unknown Item'}
                    </h3>
                    <div className="flex items-center space-x-2 mb-3">
                      <div className="bg-gradient-to-r from-purple-100 to-pink-100 px-3 py-1 rounded-full">
                        <span className="text-purple-700 font-bold text-sm">
                          USh{formatCurrency(parseFloat(item.unit_price))} each
                        </span>
                      </div>
                      {item.menu_item?.preparation_time && (
                        <div className="bg-gradient-to-r from-blue- nk100 to-indigo-100 px-3 py-1 rounded-full flex items-center">
                          <Clock className="w-3 h-3 mr-1 text-blue-600" />
                          <span className="text-blue-700 font-semibold text-xs">
                            {item.menu_item.preparation_time}min
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {item.modifiers?.length > 0 && (
                      <div className="mt-3 p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl border border-purple-200">
                        <p className="text-xs font-bold text-purple-800 mb-1 flex items-center">
                          <Star className="w-3 h-3 mr-1" />
                          MODIFIERS:
                        </p>
                        <p className="text-sm text-purple-700 font-medium">
                          {item.modifiers.map(mod => mod.name).join(', ')}
                        </p>
                      </div>
                    )}
                    
                    {item.special_instructions && (
                      <div className="mt-3 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-200">
                        <p className="text-xs font-bold text-blue-800 mb-1 flex items-center">
                          <Edit3 className="w-3 h-3 mr-1" />
                          SPECIAL NOTE:
                        </p>
                        <p className="text-sm text-blue-700 font-medium">{item.special_instructions}</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-col space-y-2">
                    <button
                      onClick={() => handleEditItem(item)}
                      className="p-3 text-blue-500 hover:bg-blue-100 rounded-2xl transition-all transform hover:scale-110 shadow-sm"
                      aria-label={`Edit item ${item.menu_item?.name || 'Unknown Item'}`}
                    >
                      <Edit3 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="p-3 text-red-500 hover:bg-red-100 rounded-2xl transition-all transform hover:scale-110 shadow-sm"
                      aria-label={`Remove item ${item.menu_item?.name || 'Unknown Item'}`}
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                
                {editingItem === item.id ? (
                  <div className="space-y-4 p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl border-2 border-gray-200">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Quantity</label>
                      <div className="flex space-x-3">
                        <input
                          type="text"
                          value={editQuantity}
                          onChange={e => setEditQuantity(e.target.value)}
                          className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-2xl text-center font-bold text-lg bg-white shadow-inner"
                          placeholder="Enter quantity"
                          aria-label="Item quantity"
                        />
                        <button
                          onClick={() => { setKeyboardTarget('quantity'); setShowKeyboard(true); }}
                          className="px-4 py-3 bg-gradient-to-r from-blue-100 to-indigo-100 hover:from-blue-200 hover:to-indigo-200 text-blue-600 rounded-2xl transition-all transform hover:scale-110 shadow-sm"
                          aria-label="Open keyboard for quantity"
                        >
                          <Keyboard className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Special Instructions</label>
                      <div className="flex space-x-3">
                        <textarea
                          value={editInstructions}
                          onChange={e => setEditInstructions(e.target.value)}
                          className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-2xl resize-none bg-white text-sm shadow-inner"
                          rows={3}
                          placeholder="Add special instructions..."
                          aria-label="Special instructions"
                        />
                        <button
                          onClick={() => { setKeyboardTarget('instructions'); setShowKeyboard(true); }}
                          className="px-4 py-3 bg-gradient-to-r from-blue-100 to-indigo-100 hover:from-blue-200 hover:to-indigo-200 text-blue-600 rounded-2xl transition-all transform hover:scale-110 shadow-sm"
                          aria-label="Open keyboard for special instructions"
                        >
                          <Keyboard className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                    <div className="flex space-x-3">
                      <button
                        onClick={handleCancelEdit}
                        className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-2xl text-gray-700 hover:bg-gray-50 font-bold transition-all"
                        aria-label="Cancel item edit"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveEdit}
                        className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-2xl hover:from-blue-600 hover:to-indigo-600 font-bold transition-all transform hover:scale-105 shadow-lg"
                        aria-label="Save item changes"
                      >
                        Save Changes
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center bg-gradient-to-r from-gray-100 to-gray-200 rounded-2xl p-1 shadow-inner">
                        <button
                          onClick={() => updateCartItem(item.id, Math.max(1, item.quantity - 1))}
                          className="p-3 rounded-2xl bg-white hover:bg-gray-50 transition-all transform hover:scale-110 shadow-sm"
                          aria-label={`Decrease quantity of ${item.menu_item?.name || 'Unknown Item'}`}
                        >
                          <Minus className="w-4 h-4 text-gray-600" />
                        </button>
                        <div className="min-w-[4rem] px-4 py-3 bg-white border-2 border-gray-200 rounded-2xl font-bold text-xl text-center mx-2 shadow-sm">
                          {item.quantity}
                        </div>
                        <button
                          onClick={() => updateCartItem(item.id, item.quantity + 1)}
                          className="p-3 rounded-2xl bg-white hover:bg-gray-50 transition-all transform hover:scale-110 shadow-sm"
                          aria-label={`Increase quantity of ${item.menu_item?.name || 'Unknown Item'}`}
                        >
                          <Plus className="w-4 h-4 text-gray-600" />
                        </button>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-xl text-green-600">
                        USh{formatCurrency(parseFloat(item.total_price))}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cart Summary and Actions */}
      {cart.length > 0 && (
        <div className="p-6 bg-white border-t-2 border-purple-200 shadow-2xl">
          {/* Discount Section */}
          <div className="mb-6">
            {discountType ? (
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl border-2 border-green-200 shadow-sm">
                <div className="flex items-center">
                  <div className="bg-green-500 p-2 rounded-xl mr-3">
                    <Tag className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-green-800 text-base">
                      {discountType === 'percentage' ? `${discountValue}% Discount` : `USh${formatCurrency(discountValue)} Off`}
                    </p>
                    <p className="text-sm text-green-600">Saving USh{formatCurrency(discountAmount)}</p>
                  </div>
                </div>
                <button
                  onClick={handleRemoveDiscount}
                  className="text-red-500 hover:text-red-700 font-bold px-4 py-2 rounded-xl hover:bg-red-50 transition-all transform hover:scale-105"
                  aria-label="Remove discount"
                >
                  Remove
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowDiscountModal(true)}
                className="w-full p-4 border-2 border-dashed border-purple-300 rounded-2xl text-purple-600 hover:border-purple-400 hover:bg-purple-50 transition-all flex items-center justify-center font-bold transform hover:scale-105"
                aria-label="Add discount or coupon"
              >
                <Tag className="w-5 h-5 mr-2" />
                Add Discount or Coupon
              </button>
            )}
          </div>

          {/* Order Summary */}
          <div className="space-y-3 mb-6 p-5 bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl border border-gray-200 shadow-inner">
            {existingOrder && (
              <div className="flex justify-between text-sm text-orange-600 border-b border-orange-200 pb-2 mb-2">
                <span className="font-bold">Adding to Order:</span>
                <span className="font-bold">{existingOrder.order_number}</span>
              </div>
            )}
            <div className="flex justify-between text-base">
              <span className="font-bold text-gray-700">Subtotal</span>
              <span className="font-bold text-gray-900">USh{formatCurrency(subtotal)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-base text-green-600">
                <span className="font-bold">Discount</span>
                <span className="font-bold">-USh{formatCurrency(discountAmount)}</span>
              </div>
            )}
            
            <div className="flex justify-between text-xl font-bold border-t-2 border-gray-300 pt-3 text-purple-600">
              <span>TOTAL</span>
              <span>USh{formatCurrency(total)}</span>
            </div>
            {existingOrder && (
              <div className="text-xs text-orange-600 text-center mt-2 font-semibold">
                Items will be added to the existing order
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 relative">
            {/* Modified buttons text for existing orders */}
            {/* Floating Action Buttons */}
            <div className="fixed bottom-6 right-6 z-40 flex flex-col space-y-3">
              <button
                onClick={() => handleCreateOrder(true)}
                disabled={loading}
                className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-full hover:from-green-600 hover:to-emerald-600 disabled:opacity-50 font-bold transition-all flex items-center justify-center transform hover:scale-110 shadow-2xl border-4 border-white"
                title={existingOrder ? "Add to Order & Send to Kitchen" : "Send to Kitchen"}
                aria-label="Send order to kitchen"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                ) : (
                  <Send className="w-8 h-8" />
                )}
              </button>
              
              <button
                onClick={() => handleCreateOrder(false)}
                disabled={loading}
                className="w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-full hover:from-blue-600 hover:to-indigo-600 disabled:opacity-50 font-bold transition-all flex items-center justify-center transform hover:scale-110 shadow-2xl border-4 border-white"
                title={existingOrder ? "Add Items to Order" : "Create Order Only"}
                aria-label="Create order"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                ) : (
                  <Check className="w-8 h-8" />
                )}
              </button>
            </div>

            {/* Original buttons for larger screens */}
            {showPaymentFirst && (
              <button
                onClick={handlePaymentFirst}
                disabled={loading || !onPayment}
                className="hidden lg:flex w-full py-4 px-6 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-2xl hover:from-purple-600 hover:to-indigo-600 disabled:opacity-50 font-bold text-lg transition-all items-center justify-center transform hover:scale-105 shadow-xl"
                aria-label="Accept payment first"
              >
                <DollarSign className="w-6 h-6 mr-3" />
                {loading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                ) : null}
                {loading ? 'Processing...' : 'Accept Payment First 💳'}
              </button>
            )}
            
            <button
              onClick={() => handleCreateOrder(true)}
              disabled={loading}
              className="hidden lg:flex w-full py-4 px-6 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-2xl hover:from-green-600 hover:to-emerald-600 disabled:opacity-50 font-bold text-lg transition-all items-center justify-center transform hover:scale-105 shadow-xl"
              aria-label="Send order to kitchen"
            >
              <Send className="w-6 h-6 mr-3" />
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              ) : null}
              {loading ? 'Processing...' : existingOrder ? 'Add & Send to Kitchen 🍳' : 'Send to Kitchen 🍳'}
            </button>
            
            <button
              onClick={() => handleCreateOrder(false)}
              disabled={loading}
              className="hidden lg:flex w-full py-4 px-6 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-2xl hover:from-blue-600 hover:to-indigo-600 disabled:opacity-50 font-bold text-lg transition-all items-center justify-center transform hover:scale-105 shadow-xl"
              aria-label="Create order"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              ) : (
                <Check className="w-6 h-6 mr-3" />
              )}
              {loading ? 'Processing...' : existingOrder ? 'Add Items to Order 📝' : 'Create Order Only 📝'}
            </button>
          </div>
        </div>
      )}

      {/* Discount Modal */}
      {showDiscountModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full mx-4 shadow-2xl animate-in slide-in-from-bottom duration-300">
            <h3 className="text-xl font-bold mb-4 flex items-center text-purple-600">
              <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-2 rounded-xl mr-3">
                <Tag className="w-5 h-5 text-white" />
              </div>
              Add Discount
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-3">Discount Type</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setTempDiscountType('percentage')}
                    className={`p-4 rounded-2xl font-bold transition-all flex items-center justify-center transform hover:scale-105 shadow-lg ${
                      tempDiscountType === 'percentage' 
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-xl' 
                        : 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 hover:from-gray-200 hover:to-gray-300'
                    }`}
                    aria-label="Select percentage discount"
                  >
                    <Percent className="w-5 h-5 mr-2" />
                    Percentage
                  </button>
                  <button
                    onClick={() => setTempDiscountType('fixed')}
                    className={`p-4 rounded-2xl font-bold transition-all flex items-center justify-center transform hover:scale-105 shadow-lg ${
                      tempDiscountType === 'fixed' 
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-xl' 
                        : 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 hover:from-gray-200 hover:to-gray-300'
                    }`}
                    aria-label="Select fixed amount discount"
                  >
                    <DollarSign className="w-5 h-5 mr-2" />
                    Fixed Amount
                  </button>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-3">
                  {tempDiscountType === 'percentage' ? 'Percentage (%)' : 'Fixed Amount (UGX)'}
                </label>
                <div className="flex space-x-3">
                  <input
                    type="text"
                    value={tempDiscountValue}
                    onChange={e => setTempDiscountValue(e.target.value)}
                    className="flex-1 px-4 py-4 border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-lg font-bold text-center bg-gradient-to-r from-gray-50 to-white shadow-inner"
                    placeholder={tempDiscountType === 'percentage' ? '0' : '0'}
                    aria-label={tempDiscountType === 'percentage' ? 'Percentage discount' : 'Fixed amount discount'}
                  />
                  <button
                    onClick={() => { setKeyboardTarget('discount'); setShowKeyboard(true); }}
                    className="px-4 py-4 bg-gradient-to-r from-purple-100 to-pink-100 hover:from-purple-200 hover:to-pink-200 text-purple-600 rounded-2xl transition-all transform hover:scale-110 shadow-sm"
                    aria-label="Open keyboard for discount"
                  >
                    <Keyboard className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => { setShowDiscountModal(false); setTempDiscountValue(''); }}
                className="flex-1 py-4 px-4 border-2 border-gray-300 rounded-2xl text-gray-700 hover:bg-gray-50 font-bold transition-all"
                aria-label="Cancel discount"
              >
                Cancel
              </button>
              <button
                onClick={handleApplyDiscount}
                className="flex-1 py-4 px-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-2xl hover:from-purple-600 hover:to-pink-600 font-bold transition-all transform hover:scale-105 shadow-lg"
                aria-label="Apply discount"
              >
                Apply Discount
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Touch Keyboard */}
      {showKeyboard && (
        <TouchKeyboard
          value={getCurrentKeyboardValue()}
          onChange={handleKeyboardChange}
          onClose={handleKeyboardClose}
          placeholder={
            keyboardTarget === 'quantity' ? 'Enter quantity' :
            keyboardTarget === 'instructions' ? 'Special instructions' :
            keyboardTarget === 'customer' ? 'Customer name' :
            keyboardTarget === 'discount' ? (tempDiscountType === 'percentage' ? 'Enter percentage' : 'Enter fixed amount') : ''
          }
          type={keyboardTarget === 'instructions' || keyboardTarget === 'customer' ? 'text' : 'number'}
        />
      )}
    </div>
  );
}