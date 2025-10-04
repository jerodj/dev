import React, { useState, useEffect } from 'react';
import { usePOSStore } from '../../../store/posStore';
import { ShoppingCart, Plus, Minus, Trash2, Send, User, MapPin, Percent, DollarSign, Tag, Edit3, Keyboard, X, Check, Coffee } from 'lucide-react';
import toast from 'react-hot-toast';

interface OrderPanelProps {
  onPayment?: (order: any) => void;
  onCreateOrder?: () => boolean;
}

const TouchKeyboard = ({ value, onChange, onClose, placeholder = "", type = "text" }) => {
  const [currentValue, setCurrentValue] = useState(value);

  useEffect(() => {
    setCurrentValue(value);
  }, [value]);

  const handleKeyPress = (key: string) => {
    if (key === 'backspace') {
      setCurrentValue(prev => prev.slice(0, -1));
    } else if (key === 'clear') {
      setCurrentValue('');
    } else if (key === 'space') {
      setCurrentValue(prev => prev + ' ');
    } else {
      setCurrentValue(prev => prev + key);
    }
  };

  const handleDone = () => {
    onChange(currentValue);
    onClose();
  };

  const handleCancel = () => {
    setCurrentValue(value);
    onClose();
  };

  const numberKeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
  const letterKeys = [
    ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
    ['z', 'x', 'c', 'v', 'b', 'n', 'm']
  ];

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-2">
      <div className="bg-white rounded-2xl p-4 w-full max-w-lg shadow-xl max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-bold text-gray-900 flex items-center">
            <Keyboard className="w-4 h-4 mr-2 text-blue-500" />
            Touch Keyboard
          </h3>
          <button
            onClick={handleCancel}
            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="mb-3">
          <div className="p-2 bg-gray-50 rounded-lg border border-gray-200 min-h-[40px] flex items-center">
            <input
              type="text"
              value={currentValue}
              onChange={(e) => setCurrentValue(e.target.value)}
              placeholder={placeholder}
              className="w-full bg-transparent text-base font-mono text-gray-900 outline-none"
              readOnly
            />
          </div>
        </div>
        <div className="grid grid-cols-10 gap-1 mb-2">
          {numberKeys.map(key => (
            <button
              key={key}
              onClick={() => handleKeyPress(key)}
              className="h-8 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 rounded-lg font-semibold text-gray-800 transition-all transform active:scale-95 text-sm"
            >
              {key}
            </button>
          ))}
        </div>
        {type === 'text' && letterKeys.map((row, rowIndex) => (
          <div key={rowIndex} className={`grid gap-1 mb-2 ${rowIndex === 0 ? 'grid-cols-10' : rowIndex === 1 ? 'grid-cols-9' : 'grid-cols-7'}`}>
            {row.map(key => (
              <button
                key={key}
                onClick={() => handleKeyPress(key)}
                className="h-8 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 rounded-lg font-semibold text-gray-800 transition-all transform active:scale-95 text-sm uppercase"
              >
                {key}
              </button>
            ))}
          </div>
        ))}
        <div className="grid grid-cols-4 gap-2 mb-3">
          <button
            onClick={() => handleKeyPress('space')}
            className="h-8 bg-blue-100 hover:bg-blue-200 active:bg-blue-300 text-blue-700 rounded-lg font-semibold transition-all transform active:scale-95 text-sm"
          >
            Space
          </button>
          <button
            onClick={() => handleKeyPress('.')}
            className="h-8 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 rounded-lg font-semibold text-gray-800 transition-all transform active:scale-95 text-sm"
          >
            .
          </button>
          <button
            onClick={() => handleKeyPress('backspace')}
            className="h-8 bg-orange-100 hover:bg-orange-200 active:bg-orange-300 text-orange-700 rounded-lg font-semibold transition-all transform active:scale-95 text-sm"
          >
            ⌫
          </button>
          <button
            onClick={() => handleKeyPress('clear')}
            className="h-8 bg-red-100 hover:bg-red-200 active:bg-red-300 text-red-700 rounded-lg font-semibold transition-all transform active:scale-95 text-sm"
          >
            Clear
          </button>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={handleCancel}
            className="flex-1 h-10 border-2 border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-bold transition-all text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleDone}
            className="flex-1 h-10 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg hover:from-blue-600 hover:to-indigo-600 font-bold transition-all transform hover:scale-105 flex items-center justify-center text-sm"
          >
            <Check className="w-4 h-4 mr-1" />
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export function OrderPanel({ onPayment, onCreateOrder }: OrderPanelProps = {}) {
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
  } = usePOSStore();

  const [orderType, setOrderType] = useState<'dine_in' | 'takeaway' | 'delivery' | 'bar'>('dine_in');
  const [customerName, setCustomerName] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [tempDiscountType, setTempDiscountType] = useState<'percentage' | 'amount'>('percentage');
  const [tempDiscountValue, setTempDiscountValue] = useState('');
  const [showPaymentFirst, setShowPaymentFirst] = useState(false);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editQuantity, setEditQuantity] = useState('');
  const [editInstructions, setEditInstructions] = useState('');
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [keyboardTarget, setKeyboardTarget] = useState<'quantity' | 'instructions' | 'customer' | 'discount'>('quantity');

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(value).replace('UGX', '').trim();
  };

  const subtotal = cart.reduce((sum, item) => sum + parseFloat(item.total_price), 0);
  let discountAmount = 0;
  if (discountType && discountValue) {
    discountAmount = discountType === 'percentage' ? (subtotal * discountValue) / 100 : discountValue;
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

    setLoading(true);
    try {
      const order = await createOrder(orderType, customerName, sendToKitchenFlag);
      toast.success(`Order ${order.order_number} ${sendToKitchenFlag ? 'sent to kitchen' : 'created'}`);
      clearCart();
      setCustomerName('');
      return order;
    } catch (error) {
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
    console.log('Editing item:', { id: item.id, quantity: item.quantity, instructions: item.special_instructions });
  };

  const handleSaveEdit = () => {
    if (!editingItem) {
      console.log('No item being edited');
      return;
    }
    
    const quantity = parseInt(editQuantity);
    if (isNaN(quantity) || quantity < 1) {
      toast.error('Please enter a valid quantity (1 or greater)');
      console.log('Invalid quantity:', editQuantity);
      return;
    }

    console.log('Saving item:', { id: editingItem, quantity, instructions: editInstructions });
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
    console.log('Edit cancelled');
  };

  const handleApplyDiscount = () => {
    const value = parseFloat(tempDiscountValue);
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
    console.log('Keyboard input:', { target: keyboardTarget, value });
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

  const getCurrentKeyboardValue = () => {
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

  const handleKeyboardClose = () => {
    console.log('Closing keyboard:', { target: keyboardTarget, value: getCurrentKeyboardValue() });
    if (keyboardTarget === 'quantity' && editingItem) {
      const quantity = parseInt(editQuantity);
      if (!isNaN(quantity) && quantity >= 1) {
        console.log('Auto-saving quantity:', { id: editingItem, quantity, instructions: editInstructions });
        updateCartItem(editingItem, quantity, editInstructions);
        toast.success('Quantity updated successfully');
      } else {
        console.log('Invalid quantity on close:', editQuantity);
        toast.error('Quantity not saved: Invalid input');
      }
    } else if (keyboardTarget === 'instructions' && editingItem) {
      console.log('Auto-saving instructions:', { id: editingItem, quantity: parseInt(editQuantity), instructions: editInstructions });
      if (editQuantity && parseInt(editQuantity) >= 1) {
        updateCartItem(editingItem, parseInt(editQuantity), editInstructions);
        toast.success('Instructions updated successfully');
      } else {
        console.log('Invalid quantity for instructions save:', editQuantity);
        toast.error('Instructions not saved: Invalid quantity');
      }
    }
    setShowKeyboard(false);
  };

  return (
    <div className="flex flex-col bg-gradient-to-br from-slate-50 to-slate-100 h-full">
      <div className="p-4 bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="bg-white/20 backdrop-blur-sm p-2 rounded-lg">
              <ShoppingCart className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Shopping Cart</h2>
              <p className="text-purple-100 text-xs">
                {cart.length} {cart.length === 1 ? 'item' : 'items'} • USh{formatCurrency(total)}
              </p>
            </div>
          </div>
          {cart.length > 0 && (
            <button
              onClick={clearCart}
              className="bg-white/20 hover:bg-white/30 backdrop-blur-sm p-2 rounded-lg transition-all transform hover:scale-105"
            >
              <Trash2 className="w-4 h-4 text-white" />
            </button>
          )}
        </div>
      </div>

      <div className="p-3 bg-white border-b border-gray-200">
        <label className="flex items-center space-x-2 cursor-pointer group">
          <div className="relative">
            <input 
              type="checkbox" 
              checked={showPaymentFirst} 
              onChange={() => setShowPaymentFirst(!showPaymentFirst)} 
              className="sr-only"
            />
            <div className={`w-8 h-4 rounded-full transition-all ${showPaymentFirst ? 'bg-purple-500' : 'bg-gray-300'}`}>
              <div className={`w-3 h-3 bg-white rounded-full shadow-sm transform transition-transform ${showPaymentFirst ? 'translate-x-4' : 'translate-x-0.5'} mt-0.5`}></div>
            </div>
          </div>
          <span className="text-xs font-semibold text-gray-700 group-hover:text-purple-600 transition-colors">
            Accept payment before kitchen
          </span>
        </label>
      </div>

      <div className="p-3 bg-white border-b border-gray-200">
        <label className="block text-xs font-bold text-gray-700 mb-2">Order Type</label>
        <div className="grid grid-cols-2 gap-2">
          {[
            { value: 'dine_in', label: 'Dine In', icon: '🍽️' },
            { value: 'takeaway', label: 'Takeaway', icon: '🥡' },
            { value: 'delivery', label: 'Delivery', icon: '🚚' },
            { value: 'bar', label: 'Bar', icon: '🍺' },
          ].map(type => (
            <button
              key={type.value}
              onClick={() => setOrderType(type.value as any)}
              className={`px-3 py-3 rounded-lg font-bold transition-all transform hover:scale-105 ${orderType === type.value ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              <div className="text-lg mb-1">{type.icon}</div>
              <div className="text-xs">{type.label}</div>
            </button>
          ))}
        </div>
      </div>

      {orderType === 'dine_in' && (
        <div className="p-3 bg-white border-b border-gray-200">
          <div className="flex items-center text-xs font-bold text-gray-700 mb-2">
            <MapPin className="w-4 h-4 mr-1 text-purple-500" />
            Selected Table
          </div>
          {selectedTable ? (
            <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-blue-900 text-sm">Table {selectedTable.number}</p>
                  <p className="text-xs text-blue-600">Capacity: {selectedTable.capacity} guests</p>
                </div>
                <div className="text-xl">🪑</div>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center">
                <div className="text-lg mr-2">⚠️</div>
                <p className="text-xs text-yellow-700 font-medium">Please select a table from the Tables tab</p>
              </div>
            </div>
          )}
        </div>
      )}

      {(orderType === 'takeaway' || orderType === 'delivery') && (
        <div className="p-3 bg-white border-b border-gray-200">
          <label className="block text-xs font-bold text-gray-700 mb-2">
            <User className="inline w-4 h-4 mr-1 text-purple-500" />
            Customer Name
          </label>
          <div className="flex space-x-2">
            <input
              type="text"
              value={customerName}
              onChange={e => setCustomerName(e.target.value)}
              className="flex-1 px-3 py-3 border border-gray-200 rounded-lg focus:ring-1 focus:ring-purple-500 focus:border-transparent text-sm font-semibold"
              placeholder="Enter customer name"
              readOnly
            />
            <button
              onClick={() => { setKeyboardTarget('customer'); setShowKeyboard(true); }}
              className="px-3 py-3 bg-purple-100 hover:bg-purple-200 text-purple-600 rounded-lg transition-all transform hover:scale-105"
            >
              <Keyboard className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-auto">
        {cart.length === 0 ? (
          <div className="p-4 text-center">
            <div className="bg-gray-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-3">
              <Coffee className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-base font-bold text-gray-500 mb-1">Your cart is empty</h3>
            <p className="text-xs text-gray-400">Add items from the menu to get started</p>
          </div>
        ) : (
          <div className="p-3 space-y-2">
            {cart.map(item => (
              <div key={item.id} className="bg-white rounded-2xl p-4 shadow-md border border-gray-100 hover:border-purple-200 transition-all">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 pr-3">
                    <h3 className="font-bold text-gray-900 text-base mb-1 leading-tight">
                      {item.menu_item?.name || 'Unknown Item'}
                    </h3>
                    <p className="text-purple-600 font-bold text-sm mb-2">
                      USh{formatCurrency(parseFloat(item.unit_price))} each
                    </p>
                    {item.modifiers?.length > 0 && (
                      <div className="mt-1 p-1 bg-purple-50 rounded border border-purple-200">
                        <p className="text-[8px] font-bold text-purple-800 mb-0.5">MODIFIERS:</p>
                        <p className="text-[10px] text-purple-700">{item.modifiers.map(mod => mod.name).join(', ')}</p>
                      </div>
                    )}
                    {item.special_instructions && (
                      <div className="mt-1 p-1 bg-blue-50 rounded border border-blue-200">
                        <p className="text-[8px] font-bold text-blue-800 mb-0.5">SPECIAL NOTE:</p>
                        <p className="text-[10px] text-blue-700">{item.special_instructions}</p>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col space-y-1">
                    <button
                      onClick={() => handleEditItem(item)}
                      className="p-2 text-blue-500 hover:bg-blue-100 rounded-lg transition-all transform hover:scale-110"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="p-2 text-red-500 hover:bg-red-100 rounded-lg transition-all transform hover:scale-110"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                {editingItem === item.id ? (
                  <div className="space-y-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Quantity</label>
                      <div className="flex space-x-2">
                        <input
                          type="text"
                          value={editQuantity}
                          readOnly
                          className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-center font-bold text-base bg-white"
                        />
                        <button
                          onClick={() => { setKeyboardTarget('quantity'); setShowKeyboard(true); }}
                          className="px-3 py-2 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-lg transition-all"
                        >
                          <Keyboard className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Special Instructions</label>
                      <div className="flex space-x-2">
                        <textarea
                          value={editInstructions}
                          readOnly
                          className="flex-1 px-3 py-2 border border-gray-200 rounded-lg resize-none bg-white text-sm"
                          rows={2}
                          placeholder="Add special instructions..."
                        />
                        <button
                          onClick={() => { setKeyboardTarget('instructions'); setShowKeyboard(true); }}
                          className="px-3 py-2 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-lg transition-all"
                        >
                          <Keyboard className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={handleCancelEdit}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-semibold transition-all text-sm"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveEdit}
                        className="flex-1 px-3 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg hover:from-blue-600 hover:to-indigo-600 font-bold transition-all transform hover:scale-105 text-sm"
                      >
                        Save Changes
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="flex items-center bg-gray-100 rounded p-0.5">
                        <button
                          onClick={() => updateCartItem(item.id, Math.max(1, item.quantity - 1))}
                          className="p-1 rounded bg-white hover:bg-gray-50 transition-all transform hover:scale-110 shadow-sm"
                        >
                          <Minus className="w-3 h-3 text-gray-600" />
                        </button>
                        <div className="min-w-[2rem] px-2 py-1 bg-white border border-gray-200 rounded font-bold text-sm text-center mx-0.5">
                          {item.quantity}
                        </div>
                        <button
                          onClick={() => updateCartItem(item.id, item.quantity + 1)}
                          className="p-1 rounded bg-white hover:bg-gray-50 transition-all transform hover:scale-110 shadow-sm"
                        >
                          <Plus className="w-3 h-3 text-gray-600" />
                        </button>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-sm text-green-600">USh{formatCurrency(parseFloat(item.total_price))}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {cart.length > 0 && (
        <div className="p-4 bg-white border-t-2 border-purple-200 shadow-lg">
          <div className="mb-3">
            {discountType ? (
              <div className="flex items-center justify-between p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                <div className="flex items-center">
                  <Tag className="w-4 h-4 text-green-600 mr-2" />
                  <div>
                    <p className="font-bold text-green-800 text-sm">
                      {discountType === 'percentage' ? `${discountValue}% Discount` : `USh${formatCurrency(discountValue)} Off`}
                    </p>
                    <p className="text-xs text-green-600">Saving USh{formatCurrency(discountAmount)}</p>
                  </div>
                </div>
                <button
                  onClick={handleRemoveDiscount}
                  className="text-red-500 hover:text-red-700 font-bold px-3 py-1 rounded-lg hover:bg-red-50 transition-all text-sm"
                >
                  Remove
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowDiscountModal(true)}
                className="w-full p-3 border-2 border-dashed border-purple-300 rounded-lg text-purple-600 hover:border-purple-400 hover:bg-purple-50 transition-all flex items-center justify-center font-bold text-sm"
              >
                <Tag className="w-4 h-4 mr-2" />
                Add Discount or Coupon
              </button>
            )}
          </div>

          <div className="space-y-2 mb-3 p-3 bg-gray-50 rounded-lg">
            <div className="flex justify-between text-sm">
              <span className="font-semibold">Subtotal</span>
              <span className="font-semibold">USh{formatCurrency(subtotal)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span className="font-semibold">Discount</span>
                <span className="font-semibold">-USh{formatCurrency(discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="font-semibold">Tax (0%)</span>
              <span className="font-semibold">USh{formatCurrency(taxAmount)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold border-t pt-2 text-purple-600">
              <span>TOTAL</span>
              <span>USh{formatCurrency(total)}</span>
            </div>
          </div>

          <div className="space-y-2">
            {/* Floating Action Buttons */}
            <div className="fixed bottom-6 right-6 z-40 flex flex-col space-y-3">
              <button
                onClick={() => handleCreateOrder(true)}
                disabled={loading}
                className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-full hover:from-green-600 hover:to-emerald-600 disabled:opacity-50 font-bold transition-all flex items-center justify-center transform hover:scale-110 shadow-2xl border-4 border-white"
                title="Send to Kitchen"
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
                title="Create Order Only"
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
                className="hidden lg:flex w-full py-3 px-4 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-lg hover:from-purple-600 hover:to-indigo-600 disabled:opacity-50 font-bold text-base transition-all items-center justify-center transform hover:scale-105 shadow-md"
              >
                <DollarSign className="w-4 h-4 mr-2" />
                {loading ? 'Processing...' : 'Accept Payment First'}
              </button>
            )}
            <button
              onClick={() => handleCreateOrder(true)}
              disabled={loading}
              className="hidden lg:flex w-full py-3 px-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:from-green-600 hover:to-emerald-600 disabled:opacity-50 font-bold text-base transition-all items-center justify-center transform hover:scale-105 shadow-md"
            >
              <Send className="w-4 h-4 mr-2" />
              {loading ? 'Processing...' : 'Send to Kitchen 🍳'}
            </button>
            <button
              onClick={() => handleCreateOrder(false)}
              disabled={loading}
              className="hidden lg:flex w-full py-3 px-4 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg hover:from-blue-600 hover:to-indigo-600 disabled:opacity-50 font-bold text-base transition-all items-center justify-center transform hover:scale-105 shadow-md"
            >
              {loading ? 'Processing...' : 'Create Order Only 📝'}
            </button>
          </div>
        </div>
      )}

      {showDiscountModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-4 max-w-sm w-full mx-2 shadow-xl">
            <h3 className="text-lg font-bold mb-3 flex items-center text-purple-600">
              <Tag className="w-5 h-5 mr-2" />
              Add Discount
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2">Discount Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setTempDiscountType('percentage')}
                    className={`p-3 rounded-lg font-bold transition-all flex items-center justify-center ${tempDiscountType === 'percentage' ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                  >
                    <Percent className="w-4 h-4 mr-1" />
                    Percentage
                  </button>
                  <button
                    onClick={() => setTempDiscountType('amount')}
                    className={`p-3 rounded-lg font-bold transition-all flex items-center justify-center ${tempDiscountType === 'amount' ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                  >
                    <DollarSign className="w-4 h-4 mr-1" />
                    Amount
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2">
                  {tempDiscountType === 'percentage' ? 'Percentage (%)' : 'Amount (UGX)'}
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={tempDiscountValue}
                    readOnly
                    className="flex-1 px-3 py-3 border border-gray-200 rounded-lg focus:ring-1 focus:ring-purple-500 focus:border-transparent text-base font-bold text-center"
                    placeholder={tempDiscountType === 'percentage' ? '10' : '5000'}
                  />
                  <button
                    onClick={() => { setKeyboardTarget('discount'); setShowKeyboard(true); }}
                    className="px-3 py-3 bg-purple-100 hover:bg-purple-200 text-purple-600 rounded-lg transition-all transform hover:scale-105"
                  >
                    <Keyboard className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
            <div className="flex space-x-2 mt-4">
              <button
                onClick={() => { setShowDiscountModal(false); setTempDiscountValue(''); }}
                className="flex-1 py-3 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-bold transition-all text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleApplyDiscount}
                className="flex-1 py-3 px-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 font-bold transition-all transform hover:scale-105 text-sm"
              >
                Apply Discount
              </button>
            </div>
          </div>
        </div>
      )}

      {showKeyboard && (
        <TouchKeyboard
          value={getCurrentKeyboardValue()}
          onChange={handleKeyboardChange}
          onClose={handleKeyboardClose}
          placeholder={
            keyboardTarget === 'quantity' ? 'Enter quantity' :
            keyboardTarget === 'instructions' ? 'Special instructions' :
            keyboardTarget === 'customer' ? 'Customer name' :
            keyboardTarget === 'discount' ? 'Discount value' : ''
          }
          type={keyboardTarget === 'instructions' || keyboardTarget === 'customer' ? 'text' : 'number'}
        />
      )}
    </div>
  );
}