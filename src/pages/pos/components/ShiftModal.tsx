import React, { useState } from 'react';
import { usePOSStore } from '../../../store/posStore';
import { printReceipt as printToAPI } from '../../../lib/api';
import { printReceipt as printToUSB } from '../../../lib/printer';
import { usePrinterStore } from '../../../store/printerStore';
import { Clock, DollarSign, TrendingUp, Receipt, Printer } from 'lucide-react';
import toast from 'react-hot-toast';
import { Shift } from '../../../types/pos';

interface ShiftModalProps {
  onClose: () => void;
}

export function ShiftModal({ onClose }: ShiftModalProps) {
  const { currentUser, currentShift, startShift, endShift } = usePOSStore();
  const [startingCash, setStartingCash] = useState('');
  const [endingCash, setEndingCash] = useState('');
  const [loading, setLoading] = useState(false);
  const [shiftEnded, setShiftEnded] = useState(false);
  const [endedShiftData, setEndedShiftData] = useState<Shift | null>(null);

  const formatCurrency = (value: number | undefined): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(value || 0);
  };

  const handleStartShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      toast.error('No user logged in');
      return;
    }
    const amount = parseFloat(startingCash);
    if (isNaN(amount) || amount < 0) {
      toast.error('Please enter a valid starting cash amount');
      return;
    }

    // Show immediate feedback
    const startingToast = toast.loading('Starting shift...');
    
    setLoading(true);
    try {
      await startShift(amount);
      
      toast.dismiss(startingToast);
      // Print shift start receipt
      await printShiftStartReceipt(amount, currentUser);
      
      toast.success('Shift started successfully! 🎉');
      onClose();
    } catch (error) {
      toast.dismiss(startingToast);
      toast.error(`Failed to start shift: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEndShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      toast.error('No user logged in');
      return;
    }
    const amount = parseFloat(endingCash);
    if (isNaN(amount) || amount < 0) {
      toast.error('Please enter a valid ending cash amount');
      return;
    }

    // Show immediate feedback
    const endingToast = toast.loading('Ending shift...');
    
    setLoading(true);
    try {
      const shift: Shift = await endShift(amount);
      
      toast.dismiss(endingToast);
      setEndedShiftData(shift);
      setShiftEnded(true);
      
      // Auto-print shift end receipt
      await sendShiftReceiptToPrinter(shift, currentUser);
      
      toast.success(`Shift ended! Total sales: ${formatCurrency(shift.total_sales)}`);
    } catch (error) {
      toast.dismiss(endingToast);
      toast.error(`Failed to end shift: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const printShiftStartReceipt = async (startingCash: number, user: any) => {
    const printerSettings = usePrinterStore.getState().settings;
    const { businessSettings } = usePOSStore.getState();
    
    const printData = {
      type: 'shift_start',
      business_name: businessSettings?.business_name || 'RESTAURANT POS',
      address: businessSettings?.address || null,
      phone: businessSettings?.phone || null,
      email: businessSettings?.email || null,
      logo_url: businessSettings?.logo_url || null,
      timestamp: new Date().toISOString(),
      staff_name: user?.full_name || currentUser?.full_name || 'Unknown Staff',
      staff_id: user?.staff_id || currentUser?.staff_id || 'Unknown ID',
      role: user?.role || currentUser?.role || 'Unknown Role',
      shift_start: new Date().toISOString(),
      starting_cash: startingCash,
      receipt_footer: businessSettings?.receipt_footer || 'Shift started successfully!'
    };

    try {
      let result;
      
      // Try USB printing first if enabled and auto-print is on
      if (printerSettings.enabled && printerSettings.autoprint) {
        result = await printToUSB(printData, printerSettings);
        
        if (!result.success) {
          result = await printToAPI(printData);
        }
      } else {
        // Use API printing as fallback
        result = await printToAPI(printData);
      }
      
      if (result.success) {
        toast.success('Shift start receipt printed! 🖨️');
      }
    } catch (error) {
      console.error('Print shift start receipt error:', error);
      // Don't show error toast for printing failures during shift start
    }
  };
  const handlePrintShiftReceipt = () => {
    if (!endedShiftData || !currentUser) {
      toast.error('No shift data available for printing');
      return;
    }
    
    sendShiftReceiptToPrinter(endedShiftData, currentUser);
  };

  const sendShiftReceiptToPrinter = async (shift: Shift, user: any) => {
    const shiftDuration = shift.end_time && shift.start_time ? 
      Math.round((new Date(shift.end_time).getTime() - new Date(shift.start_time).getTime()) / (1000 * 60 * 60 * 100)) / 100 : 0;
    
    const printerSettings = usePrinterStore.getState().settings;
    const { businessSettings } = usePOSStore.getState();
    
    const printData = {
      type: 'shift_report',
      business_name: businessSettings?.business_name || 'RESTAURANT POS',
      address: businessSettings?.address || null,
      phone: businessSettings?.phone || null,
      email: businessSettings?.email || null,
      logo_url: businessSettings?.logo_url || null,
      timestamp: new Date().toISOString(),
      staff_name: user?.full_name || currentUser?.full_name || 'Unknown Staff',
      staff_id: user?.staff_id || currentUser?.staff_id || 'Unknown ID',
      role: user?.role || currentUser?.role || 'Unknown Role',
      shift_start: shift.start_time,
      shift_end: shift.end_time,
      shift_duration: shiftDuration,
      starting_cash: shift.starting_cash,
      ending_cash: shift.ending_cash || 0,
      cash_difference: (shift.ending_cash || 0) - shift.starting_cash,
      total_orders: shift.total_orders || 0,
      total_sales: shift.total_sales || 0,
      total_tips: shift.total_tips || 0,
      cash_sales: shift.cash_sales || 0,
      card_sales: shift.card_sales || 0,
      mobile_sales: shift.mobile_sales || 0,

      receipt_footer: businessSettings?.receipt_footer || 'Thank you for your service!'
    }    
    try {
      let result;
      
      // Try USB printing first if enabled and auto-print is on
      if (printerSettings.enabled && printerSettings.autoprint) {
        result = await printToUSB(printData, printerSettings);
        
        if (!result.success) {
          result = await printToAPI(printData);
        }
      } else {
        // Use API printing as fallback
        result = await printToAPI(printData);
      }
      
      if (result.success) {
        toast.success('Shift report sent to printer! 🖨️')
      } else {
        toast.error(`Failed to print shift report: ${result.error}`)
      }
    } catch (error) {
      console.error('Print shift report error:', error)
      toast.error('Failed to send shift report to printer')
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
        {shiftEnded && endedShiftData ? (
          // Shift Summary View
          <div>
            <div className="flex items-center mb-6">
              <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-3 rounded-xl mr-4">
                <Receipt className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Shift Completed! 🎉</h2>
                <p className="text-gray-600">Here's your shift summary</p>
              </div>
            </div>

            <div className="space-y-4 mb-6">
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-xl border border-green-200">
                <h3 className="font-bold text-green-900 mb-3">💰 Financial Summary</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-gray-600">Total Sales:</p>
                    <p className="font-bold text-green-600 text-lg">{formatCurrency(endedShiftData.total_sales || 0)}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Total Tips:</p>
                    <p className="font-bold text-blue-600 text-lg">{formatCurrency(endedShiftData.total_tips || 0)}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Total Orders:</p>
                    <p className="font-bold text-purple-600 text-lg">{endedShiftData.total_orders || 0}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Avg Order:</p>
                    <p className="font-bold text-indigo-600 text-lg">
                      {endedShiftData.total_orders ? formatCurrency((endedShiftData.total_sales || 0) / endedShiftData.total_orders) : formatCurrency(0)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
                <h3 className="font-bold text-blue-900 mb-3">💳 Payment Breakdown</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Cash Sales:</span>
                    <span className="font-semibold">{formatCurrency(endedShiftData.cash_sales || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Card Sales:</span>
                    <span className="font-semibold">{formatCurrency(endedShiftData.card_sales || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Mobile Sales:</span>
                    <span className="font-semibold">{formatCurrency(endedShiftData.mobile_sales || 0)}</span>
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-200">
                <h3 className="font-bold text-yellow-900 mb-3">💵 Cash Reconciliation</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Starting Cash:</span>
                    <span className="font-semibold">{formatCurrency(endedShiftData.starting_cash)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Ending Cash:</span>
                    <span className="font-semibold">{formatCurrency(endedShiftData.ending_cash || 0)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="font-bold">Difference:</span>
                    <span className="font-bold">{formatCurrency((endedShiftData.ending_cash || 0) - endedShiftData.starting_cash)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={handlePrintShiftReceipt}
                className="flex-1 px-4 py-4 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl hover:from-blue-600 hover:to-indigo-600 font-bold transition-all transform hover:scale-105 flex items-center justify-center"
              >
                <Printer className="w-5 h-5 mr-2" />
                Print Receipt
              </button>
              <button
                onClick={onClose}
                className="flex-1 px-4 py-4 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 font-semibold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
        <div>
        <div className="flex items-center mb-6">
          <div className="bg-gradient-to-r from-blue-500 to-purple-500 p-3 rounded-xl mr-4">
            <Clock className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {currentShift ? 'End Shift' : 'Start Shift'}
            </h2>
            <p className="text-gray-600">
              {currentShift ? 'Complete your shift and cash out' : 'Begin your shift with starting cash'}
            </p>
          </div>
          {currentShift && (
            <button
              onClick={onClose}
              className="ml-auto p-2 text-gray-400 hover:text-gray-600 rounded-lg"
            >
              ✕
            </button>
          )}
        </div>

        {!currentShift ? (
          <form onSubmit={handleStartShift} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-3">
                <DollarSign className="inline w-4 h-4 mr-2" />
                Starting Cash Amount
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={startingCash}
                onChange={(e) => setStartingCash(e.target.value)}
                className="w-full px-4 py-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg font-semibold text-center"
                placeholder="0.00"
                required
              />
            </div>
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
              <h4 className="font-semibold text-blue-900 mb-2">💡 Shift Start Tips:</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Count your cash drawer carefully</li>
                <li>• Verify all bills and coins</li>
                <li>• Keep your receipt for records</li>
              </ul>
            </div>
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-4 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl hover:from-blue-600 hover:to-purple-600 disabled:opacity-50 font-bold transition-all transform hover:scale-105"
              >
                {loading ? 'Starting...' : 'Start Shift 🚀'}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleEndShift} className="space-y-6">
            <div className="bg-gradient-to-r from-green-50 to-blue-50 p-4 rounded-xl border border-green-200">
              <h4 className="font-bold text-gray-900 mb-3 flex items-center">
                <TrendingUp className="w-5 h-5 mr-2 text-green-600" />
                Shift Summary
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Started:</p>
                  <p className="font-semibold">{new Date(currentShift.start_time).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-gray-600">Starting Cash:</p>
                  <p className="font-semibold">{formatCurrency(currentShift.starting_cash)}</p>
                </div>
                <div>
                  <p className="text-gray-600">Total Sales:</p>
                  <p className="font-semibold text-green-600">{formatCurrency(currentShift.total_sales || 0)}</p>
                </div>
                <div>
                  <p className="text-gray-600">Total Tips:</p>
                  <p className="font-semibold text-blue-600">{formatCurrency(currentShift.total_tips || 0)}</p>
                </div>
                <div>
                  <p className="text-gray-600">Total Orders:</p>
                  <p className="font-semibold text-purple-600">{currentShift.total_orders || 0}</p>
                </div>
                <div>
                  <p className="text-gray-600">Cash Sales:</p>
                  <p className="font-semibold text-green-600">{formatCurrency(currentShift.cash_sales || 0)}</p>
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-3">
                <DollarSign className="inline w-4 h-4 mr-2" />
                Ending Cash Amount
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={endingCash}
                onChange={(e) => setEndingCash(e.target.value)}
                className="w-full px-4 py-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent text-lg font-semibold text-center"
                placeholder="0.00"
                required
              />
            </div>
            <div className="bg-red-50 p-4 rounded-xl border border-red-200">
              <h4 className="font-semibold text-red-900 mb-2">⚠️ Before Ending Shift:</h4>
              <ul className="text-sm text-red-700 space-y-1">
                <li>• Count all cash in drawer</li>
                <li>• Complete all pending orders</li>
                <li>• Clean your work area</li>
                <li>• Hand over to next shift</li>
              </ul>
            </div>
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-4 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-4 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-xl hover:from-red-600 hover:to-pink-600 disabled:opacity-50 font-bold transition-all transform hover:scale-105"
              >
                {loading ? 'Ending...' : 'End Shift 🏁'}
              </button>
            </div>
          </form>
        )}
        </div>
        )}
      </div>
    </div>
  );
}