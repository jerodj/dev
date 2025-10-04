import React, { useState, useEffect } from 'react';
import { usePOSStore } from '../../../store/posStore';
import { printReceipt as printToUSB } from '../../../lib/printer';
import { usePrinterStore } from '../../../store/printerStore';
import { CreditCard, DollarSign, Smartphone, Receipt, Star, Printer, X, Calculator, Check } from 'lucide-react';
import toast from 'react-hot-toast';

interface PaymentModalProps {
  order: any;
  onClose: () => void;
}

interface TouchKeypadProps {
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
  title?: string;
  showDecimal?: boolean;
  isAlphanumeric?: boolean;
}

// Touch Keypad Component
const TouchKeypad = ({ value, onChange, onClose, title = "Enter Amount", showDecimal = true, isAlphanumeric = false }: TouchKeypadProps) => {
  const [currentValue, setCurrentValue] = useState(value);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const { key } = event;

      if (['Enter', 'Escape'].includes(key)) {
        event.preventDefault();
      }

      if (isAlphanumeric) {
        // Allow alphanumeric, space, and hyphen
        if (/^[a-zA-Z0-9 -]$/.test(key)) {
          setCurrentValue(prev => prev + key);
        } else if (key === 'Backspace') {
          setCurrentValue(prev => prev.slice(0, -1));
        } else if (key === 'Enter') {
          onChange(currentValue);
          onClose();
        } else if (key === 'Escape') {
          onClose();
        } else if (key.toLowerCase() === 'c') {
          setCurrentValue('');
        }
      } else {
        // Numeric-only input
        if (/[0-9]/.test(key)) {
          setCurrentValue(prev => prev + key);
        } else if (key === '.' && showDecimal && !currentValue.includes('.')) {
          setCurrentValue(prev => prev + '.');
        } else if (key === 'Backspace') {
          setCurrentValue(prev => prev.slice(0, -1));
        } else if (key === 'Enter') {
          onChange(currentValue);
          onClose();
        } else if (key === 'Escape') {
          onClose();
        } else if (key.toLowerCase() === 'c') {
          setCurrentValue('');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentValue, onChange, onClose, showDecimal, isAlphanumeric]);

  const handleKeyPress = (key: string) => {
    if (key === 'clear') {
      setCurrentValue('');
    } else if (key === 'backspace') {
      setCurrentValue(prev => prev.slice(0, -1));
    } else if (key === '.' && showDecimal && !isAlphanumeric) {
      if (!currentValue.includes('.')) {
        setCurrentValue(prev => prev + '.');
      }
    } else if (key === '00' && !isAlphanumeric) {
      setCurrentValue(prev => prev + '00');
    } else if (isAlphanumeric ? /^[a-zA-Z0-9 -]$/.test(key) : /^[0-9]$/.test(key)) {
      setCurrentValue(prev => prev + key);
    }
  };

  const handleDone = () => {
    onChange(currentValue);
    onClose();
  };

  const numericKeypadButtons = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['clear', '0', 'backspace']
  ];

  const alphanumericKeypadButtons = [
    ['1', '2', '3', '4', '5'],
    ['6', '7', '8', '9', '0'],
    ['Q', 'W', 'E', 'R', 'T'],
    ['Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G'],
    ['H', 'J', 'K', 'L', '-'],
    ['Z', 'X', 'C', 'V', 'B'],
    ['N', 'M', ' ', 'clear', 'backspace']
  ];

  const keypadButtons = isAlphanumeric ? alphanumericKeypadButtons : numericKeypadButtons;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-4 w-full max-w-sm mx-2 shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold text-gray-900 flex items-center">
            <Calculator className="w-4 h-4 mr-2 text-blue-500" />
            {title}
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="mb-4">
          <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
            <div className="text-xl font-bold text-blue-900 text-center min-h-[2rem] flex items-center justify-center">
              {currentValue || '0'}
              <span className="animate-pulse ml-1">|</span>
            </div>
          </div>
        </div>
        <div className={`grid ${isAlphanumeric ? 'grid-cols-5' : 'grid-cols-3'} gap-2 mb-4`}>
          {keypadButtons.flat().map((key, index) => (
            <button
              key={index}
              onClick={() => handleKeyPress(key)}
              className={`h-10 rounded-lg font-bold text-base transition-all transform active:scale-95 ${
                key === 'clear' 
                  ? 'bg-red-100 hover:bg-red-200 text-red-700' 
                  : key === 'backspace'
                  ? 'bg-orange-100 hover:bg-orange-200 text-orange-700'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
              } ${isAlphanumeric && key === ' ' ? 'col-span-2' : ''}`}
            >
              {key === 'clear' ? 'Clear' : key === 'backspace' ? '⌫' : key}
            </button>
          ))}
        </div>
        {!isAlphanumeric && (
          <div className="grid grid-cols-2 gap-2 mb-4">
            {showDecimal && (
              <button
                onClick={() => handleKeyPress('.')}
                className="h-10 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg font-bold text-base transition-all transform active:scale-95"
              >
                .
              </button>
            )}
            <button
              onClick={() => handleKeyPress('00')}
              className="h-10 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg font-bold text-base transition-all transform active:scale-95"
            >
              00
            </button>
          </div>
        )}
        <div className="flex space-x-2">
          <button
            onClick={onClose}
            className="flex-1 h-10 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-bold text-sm transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleDone}
            className="flex-1 h-10 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg hover:from-blue-600 hover:to-indigo-600 font-bold text-sm transition-all transform hover:scale-105 flex items-center justify-center"
          >
            <Check className="w-4 h-4 mr-1" />
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

// Error Boundary Component
class PaymentModalErrorBoundary extends React.Component<{ onClose: () => void }, { hasError: boolean; error: any }> {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-4 max-w-xs w-full mx-2 shadow-lg">
            <h2 className="text-lg font-bold text-red-600 mb-2">Something went wrong</h2>
            <p className="text-sm text-gray-600 mb-4">
              An error occurred while processing the payment. Please try again or contact support.
            </p>
            <button
              onClick={() => this.props.onClose()}
              className="w-full px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 font-bold text-sm transition-all"
            >
              Close
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export function PaymentModal({ order, onClose }: PaymentModalProps) {
  const { processPayment, businessSettings } = usePOSStore();
  const { settings: printerSettings } = usePrinterStore();
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'mobile'>('cash');
  const [tipAmount, setTipAmount] = useState('');
  const [cashReceived, setCashReceived] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [loading, setLoading] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);
  const [showKeypad, setShowKeypad] = useState(false);
  const [keypadTarget, setKeypadTarget] = useState<'tip' | 'cash' | 'reference'>('tip');
  const [isPrinting, setIsPrinting] = useState(false);

  // Debug order data
  useEffect(() => {
    console.log('Order data in PaymentModal:', JSON.stringify(order, null, 2));
  }, [order]);

  // Use pre-calculated values from order
  const orderSubtotal = order.subtotal || 0;
  const orderTaxAmount = order.tax_amount || 0;
  const orderTotal = order.total_amount || (orderSubtotal + orderTaxAmount);
  const orderDiscountAmount = order.discount_amount || 0; // For receipt display only
  const totalWithTip = orderTotal + parseFloat(tipAmount || '0');
  const changeAmount = paymentMethod === 'cash' && cashReceived ? 
    Math.max(0, parseFloat(cashReceived) - totalWithTip) : 0;

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (paymentMethod === 'cash' && (!cashReceived || parseFloat(cashReceived) < totalWithTip)) {
      toast.error('Cash received must be at least the total amount');
      return;
    }
    
    if ((paymentMethod === 'card' || paymentMethod === 'mobile') && !paymentReference.trim()) {
      toast.error('Payment reference is required');
      return;
    }
    
    setLoading(true);
    try {
      await processPayment(order.id, paymentMethod, totalWithTip, parseFloat(tipAmount || '0'), parseFloat(cashReceived || '0'), paymentReference);
      
      // Create receipt data for printing
      const receiptData = {
        ...order,
        tax_amount: orderTaxAmount,
        discount_amount: orderDiscountAmount, // Include for receipt display
        total_amount: orderTotal,
        payment_method: paymentMethod,
        tip_amount: parseFloat(tipAmount || '0'),
        cash_received: parseFloat(cashReceived || '0'),
        change_amount: changeAmount,
        payment_reference: paymentReference,
        total_with_tip: totalWithTip,
        business_name: businessSettings?.business_name || 'RESTAURANT POS',
        address: businessSettings?.address || null,
        phone: businessSettings?.phone || null,
        email: businessSettings?.email || null,
        receipt_footer: businessSettings?.receipt_footer || 'Thank you for dining with us!',
      };
      
      setReceiptData(receiptData);
      toast.success('💰 Payment processed successfully!');

      // Auto-print if enabled
      if (printerSettings.enabled && printerSettings.autoprint) {
        try {
          setIsPrinting(true);
          const printResult = await handlePrintReceipt(receiptData);
          if (printResult) {
            toast.success('Receipt printed automatically! 🖨️');
          }
          onClose();
          return;
        } catch (error) {
          console.error('Auto-print failed, showing receipt modal');
        }
      }
      
      setShowReceiptModal(true);
      
    } catch (error) {
      console.error('Payment processing error:', error);
      toast.error(`Payment failed: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
      setIsPrinting(false);
    }
  };

  const handlePrintReceipt = async (receipt = receiptData): Promise<boolean> => {
    if (!receipt) {
      console.error('No receipt data available for printing');
      toast.error('No receipt data available');
      return false;
    }

    if (!printerSettings.enabled) {
      console.warn('Printer is disabled in settings');
      toast.error('Printer is disabled. Enable it in Printer Settings.');
      return false;
    }

    console.log('Printer settings:', JSON.stringify(printerSettings, null, 2));

    const printData = {
      type: 'order_receipt',
      business_name: receipt.business_name || 'RESTAURANT POS',
      address: receipt.address || null,
      phone: receipt.phone || null,
      email: receipt.email || null,
      logo_url: businessSettings?.logo_url || null,
      receipt_footer: receipt.receipt_footer || 'Thank you for dining with us!',
      order_number: receipt.order_number || 'UNKNOWN',
      table: receipt.table?.number || null,
      customer_name: receipt.customer_name || null,
      order_type: receipt.order_type || 'Unknown',
      payment_method: receipt.payment_method || 'Unknown',
      payment_reference: receipt.payment_reference || null,
      cash_received: receipt.cash_received || 0,
      change_amount: receipt.change_amount || 0,
      card_last_four: receipt.card_last_four || null,
      items: receipt.items?.map(item => ({
        name: item.menu_item?.name || 'Unknown Item',
        quantity: item.quantity || 1,
        unit_price: item.unit_price || 0,
        total_price: item.total_price || 0,
        special_instructions: item.special_instructions || null,
        modifiers: item.modifiers || [],
      })) || [],
      subtotal: receipt.subtotal || 0,
      discount_amount: receipt.discount_amount || 0,
      tax_amount: receipt.tax_amount || 0,
      tip_amount: receipt.tip_amount || 0,
      total_amount: receipt.total_with_tip || 0,
    };

    console.log('Printing receipt with data:', JSON.stringify(printData, null, 2));

    try {
      const result = await printToUSB(printData, printerSettings);
      if (result.success) {
        console.log('Receipt printed successfully');
        if (!receipt.auto_print) {
          toast.success('Receipt sent to printer! 🖨️');
        }
        return true;
      } else {
        console.error('USB printing failed:', result.error);
        if (!receipt.auto_print) {
          toast.error(`Failed to print receipt: ${result.error || 'Unknown error'}`);
        }
        return false;
      }
    } catch (error) {
      console.error('Print receipt error:', error);
      if (!receipt.auto_print) {
        toast.error(`Printing error: ${error.message || 'Unknown error'}`);
      }
      return false;
    }
  };

  const handleSkipPrint = () => {
    setShowReceiptModal(false);
    onClose();
  };

  const handleManualPrint = async () => {
    setIsPrinting(true);
    try {
      const success = await handlePrintReceipt(receiptData);
      if (success) {
        setShowReceiptModal(false);
        onClose();
      }
    } finally {
      setIsPrinting(false);
    }
  };

  const quickTipPercentages = [10, 15, 18, 20, 25];
  const quickCashAmounts = [
    Math.ceil(totalWithTip / 1000) * 1000,
    Math.ceil(totalWithTip / 5000) * 5000,
    Math.ceil(totalWithTip / 10000) * 10000,
  ].filter((amount, index, arr) => arr.indexOf(amount) === index && amount > totalWithTip);

  const calculateTipFromPercentage = (percentage: number) => {
    return ((order.total_amount * percentage) / 100).toFixed(2);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: businessSettings?.currency || 'UGX',
      minimumFractionDigits: 0,
      signDisplay: 'auto',
    }).format(value || 0);
  };

  if (showReceiptModal && receiptData) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-4 max-w-xs w-full mx-2 shadow-lg max-h-[80vh] overflow-y-auto">
          <div className="text-center mb-4">
            <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-2 rounded-lg mx-auto w-fit mb-3">
              <Receipt className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-1">Payment Complete! 🎉</h2>
            <p className="text-gray-600 text-sm">Transaction processed successfully</p>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg mb-4 text-xs font-mono border border-gray-200">
            <div className="text-center mb-3 border-b border-gray-300 pb-2">
              <h3 className="font-bold text-base mb-1">{businessSettings?.business_name || 'RESTAURANT POS'}</h3>
              <p className="text-gray-600 text-2xs">{businessSettings?.receipt_footer || 'Thank you for your visit!'}</p>
            </div>
            <div className="mb-3 space-y-1">
              <div className="flex justify-between">
                <span className="font-semibold">Order:</span>
                <span>{receiptData.order_number}</span>
              </div>
              {receiptData.table && (
                <div className="flex justify-between">
                  <span className="font-semibold">Table:</span>
                  <span>{receiptData.table.number}</span>
                </div>
              )}
              {receiptData.customer_name && (
                <div className="flex justify-between">
                  <span className="font-semibold">Customer:</span>
                  <span>{receiptData.customer_name}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="font-semibold">Type:</span>
                <span>{receiptData.order_type.replace('_', ' ').toUpperCase()}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">Payment:</span>
                <span>{receiptData.payment_method.toUpperCase()}</span>
              </div>
              {receiptData.payment_reference && (
                <div className="flex justify-between">
                  <span className="font-semibold">Ref:</span>
                  <span>{receiptData.payment_reference}</span>
                </div>
              )}
            </div>
            <div className="mb-3">
              <h4 className="font-bold mb-1 text-center border-b border-gray-300 pb-1">ITEMS</h4>
              {receiptData.items?.map(item => (
                <div key={item.id} className="flex justify-between mb-1">
                  <span>{item.quantity}x {item.menu_item?.name || 'Unknown Item'}</span>
                  <span>{formatCurrency(item.total_price || 0)}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-gray-400 pt-2 space-y-1">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{formatCurrency(receiptData.subtotal || 0)}</span>
              </div>
              {receiptData.discount_amount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount:</span>
                  <span>-{formatCurrency(receiptData.discount_amount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Tax:</span>
                <span>{formatCurrency(receiptData.tax_amount || 0)}</span>
              </div>
              {receiptData.tip_amount > 0 && (
                <div className="flex justify-between">
                  <span>Tip:</span>
                  <span>{formatCurrency(receiptData.tip_amount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-sm border-t border-gray-400 pt-2">
                <span>TOTAL:</span>
                <span>{formatCurrency(receiptData.total_with_tip)}</span>
              </div>
              {receiptData.payment_method === 'cash' && (
                <>
                  <div className="flex justify-between">
                    <span>Cash Received:</span>
                    <span>{formatCurrency(receiptData.cash_received)}</span>
                  </div>
                  {receiptData.change_amount > 0 && (
                    <div className="flex justify-between font-bold text-green-600">
                      <span>Change:</span>
                      <span>{formatCurrency(receiptData.change_amount)}</span>
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="text-center mt-3 pt-2 border-t border-gray-300 text-2xs">
              <p>{businessSettings?.receipt_footer || 'Thank you for dining with us!'}</p>
              <p>Please come again soon</p>
            </div>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={handleSkipPrint}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-bold text-sm transition-all"
            >
              Skip Print
            </button>
            <button
              onClick={handleManualPrint}
              disabled={isPrinting}
              className={`flex-1 px-3 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg hover:from-blue-600 hover:to-indigo-600 font-bold text-sm transition-all transform hover:scale-105 flex items-center justify-center ${isPrinting ? 'opacity-50' : ''}`}
            >
              {isPrinting ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-1"></div>
              ) : (
                <Printer className="w-4 h-4 mr-1" />
              )}
              {isPrinting ? 'Printing...' : 'Print Receipt'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <PaymentModalErrorBoundary onClose={onClose}>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-4 max-w-md w-full mx-2 shadow-lg max-h-[80vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-2 rounded-lg mr-3">
                <CreditCard className="w-4 h-4 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Process Payment</h2>
                <p className="text-gray-600 text-sm">Complete the transaction securely</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="mb-4 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
            <h3 className="font-bold text-blue-900 mb-2 text-base flex items-center">
              📋 Order Summary
            </h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-600">Order:</span>
                  <span className="font-bold">{order.order_number}</span>
                </div>
                {order.table && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Table:</span>
                    <span className="font-bold">Table {order.table.number}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-bold">{formatCurrency(orderSubtotal)}</span>
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-600">Tax:</span>
                  <span className="font-bold">{formatCurrency(orderTaxAmount)}</span>
                </div>
                <div className="flex justify-between font-bold text-base border-t pt-1 text-green-600">
                  <span>Total:</span>
                  <span>{formatCurrency(orderTotal)}</span>
                </div>
              </div>
            </div>
          </div>
          <form onSubmit={handlePayment} className="space-y-4">
            <div>
              <label className="block text-base font-bold text-gray-700 mb-2">
                💳 Payment Method
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'cash', label: 'Cash', icon: DollarSign, color: 'from-green-500 to-emerald-500' },
                  { value: 'card', label: 'Card', icon: CreditCard, color: 'from-blue-500 to-indigo-500' },
                  { value: 'mobile', label: 'Mobile', icon: Smartphone, color: 'from-purple-500 to-pink-500' },
                ].map(method => {
                  const Icon = method.icon;
                  return (
                    <button
                      key={method.value}
                      type="button"
                      onClick={() => setPaymentMethod(method.value as any)}
                      className={`p-3 border rounded-lg flex flex-col items-center transition-all transform hover:scale-105 ${
                        paymentMethod === method.value
                          ? `border-transparent bg-gradient-to-r ${method.color} text-white shadow-md`
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <Icon className="w-6 h-6 mb-1" />
                      <span className="text-sm font-bold">{method.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label className="block text-base font-bold text-gray-700 mb-2">
                <Star className="inline w-4 h-4 mr-1 text-yellow-500" />
                Add Tip
              </label>
              <div className="grid grid-cols-5 gap-2 mb-2">
                {quickTipPercentages.map(percentage => (
                  <button
                    key={percentage}
                    type="button"
                    onClick={() => setTipAmount(calculateTipFromPercentage(percentage))}
                    className={`py-2 px-1 border rounded-lg hover:bg-gray-50 text-sm font-bold transition-all transform hover:scale-105 ${
                      tipAmount === calculateTipFromPercentage(percentage)
                        ? 'border-yellow-500 bg-yellow-50 text-yellow-700'
                        : 'border-gray-300'
                    }`}
                  >
                    {percentage}%
                    <div className="text-2xs text-gray-500 mt-0.5">
                      {formatCurrency(parseFloat(calculateTipFromPercentage(percentage)))}
                    </div>
                  </button>
                ))}
              </div>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={tipAmount}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '' || /^\d*\.?\d{0,2}$/.test(value)) {
                      setTipAmount(value);
                    }
                  }}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-green-500 focus:border-transparent text-base font-bold text-center bg-gray-50"
                  placeholder="0.00"
                />
                <button
                  type="button"
                  onClick={() => {
                    setKeypadTarget('tip');
                    setShowKeypad(true);
                  }}
                  className="px-3 py-2 bg-yellow-100 hover:bg-yellow-200 text-yellow-700 rounded-lg transition-all transform hover:scale-105 font-bold"
                >
                  <Calculator className="w-4 h-4" />
                </button>
              </div>
            </div>
            {paymentMethod === 'cash' && (
              <div>
                <label className="block text-base font-bold text-gray-700 mb-2">
                  💵 Cash Received
                </label>
                {quickCashAmounts.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    {quickCashAmounts.slice(0, 3).map(amount => (
                      <button
                        key={amount}
                        type="button"
                        onClick={() => setCashReceived(amount.toString())}
                        className={`py-2 px-1 border rounded-lg font-bold transition-all transform hover:scale-105 ${
                          cashReceived === amount.toString()
                            ? 'border-green-500 bg-green-50 text-green-700'
                            : 'border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {formatCurrency(amount)}
                      </button>
                    ))}
                  </div>
                )}
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={cashReceived}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === '' || /^\d*\.?\d{0,2}$/.test(value)) {
                        setCashReceived(value);
                      }
                    }}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-green-500 focus:border-transparent text-base font-bold text-center bg-gray-50"
                    placeholder={totalWithTip.toFixed(2)}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setKeypadTarget('cash');
                      setShowKeypad(true);
                    }}
                    className="px-3 py-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg transition-all transform hover:scale-105 font-bold"
                  >
                    <Calculator className="w-4 h-4" />
                  </button>
                </div>
                {changeAmount > 0 && (
                  <div className="mt-2 p-3 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-300 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-yellow-800 text-base">💰 Change to Give:</span>
                      <span className="text-base font-bold text-yellow-800">
                        {formatCurrency(changeAmount)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
            {(paymentMethod === 'card' || paymentMethod === 'mobile') && (
              <div>
                <label className="block text-base font-bold text-gray-700 mb-2">
                  📝 Payment Reference
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={paymentReference}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === '' || /^[a-zA-Z0-9 -]*$/.test(value)) {
                        setPaymentReference(value);
                      }
                    }}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-transparent text-base font-bold text-center bg-gray-50"
                    placeholder={paymentMethod === 'card' ? 'Transaction ID' : 'Mobile Money Reference'}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setKeypadTarget('reference');
                      setShowKeypad(true);
                    }}
                    className="px-3 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-all transform hover:scale-105 font-bold"
                  >
                    <Calculator className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
            <div className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-300 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="font-bold text-green-800 text-base">💰 Total to Charge:</span>
                <span className="text-xl font-bold text-green-800">
                  {formatCurrency(totalWithTip)}
                </span>
              </div>
              {parseFloat(tipAmount) > 0 && (
                <div className="text-sm text-green-600 mt-1 text-center">
                  Includes {formatCurrency(parseFloat(tipAmount))} tip ⭐
                </div>
              )}
            </div>
            <div className="flex space-x-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-bold text-sm transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:from-green-600 hover:to-emerald-600 disabled:opacity-50 font-bold text-sm transition-all transform hover:scale-105 flex items-center justify-center shadow-md"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-1"></div>
                ) : (
                  <Receipt className="w-4 h-4 mr-1" />
                )}
                {loading ? 'Processing...' : 'Process Payment 🎉'}
              </button>
            </div>
          </form>
        </div>
        {showKeypad && (
          <TouchKeypad
            value={
              keypadTarget === 'tip' ? tipAmount :
              keypadTarget === 'cash' ? cashReceived :
              keypadTarget === 'reference' ? paymentReference : ''
            }
            onChange={(value) => {
              if (keypadTarget === 'tip') setTipAmount(value);
              else if (keypadTarget === 'cash') setCashReceived(value);
              else if (keypadTarget === 'reference') setPaymentReference(value);
            }}
            onClose={() => setShowKeypad(false)}
            title={
              keypadTarget === 'tip' ? 'Enter Tip Amount' :
              keypadTarget === 'cash' ? 'Enter Cash Received' :
              keypadTarget === 'reference' ? 'Enter Reference' : 'Enter Amount'
            }
            showDecimal={keypadTarget !== 'reference'}
            isAlphanumeric={keypadTarget === 'reference'}
          />
        )}
      </div>
    </PaymentModalErrorBoundary>
  );
}