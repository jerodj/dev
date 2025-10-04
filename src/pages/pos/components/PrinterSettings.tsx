import React, { useState } from 'react';
import { usePrinterStore } from '../../../store/printerStore';
import { 
  Printer, 
  Settings, 
  Wifi, 
  WifiOff, 
  TestTube, 
  Save, 
  RotateCcw,
  AlertCircle,
  CheckCircle,
  Scissors,
  DollarSign
} from 'lucide-react';
import toast from 'react-hot-toast';

interface PrinterSettingsProps {
  onClose?: () => void;
}

export function PrinterSettings({ onClose }: PrinterSettingsProps) {
  const {
    settings,
    isConnected,
    isConnecting,
    lastError,
    updateSettings,
    connectPrinter,
    disconnectPrinter,
    testPrint,
    clearError,
  } = usePrinterStore();

  const [localSettings, setLocalSettings] = useState(settings);
  const [isTesting, setIsTesting] = useState(false);

  const handleSaveSettings = () => {
    updateSettings(localSettings);
    toast.success('Printer settings saved successfully!');
    if (onClose) onClose();
  };

  const handleResetSettings = () => {
    setLocalSettings({
      enabled: true,
      autoprint: true,
      printerName: 'RONGTA 80mm Series Printer',
      paperWidth: 80,
      fontSize: 12,
      lineSpacing: 1.2,
      cutPaper: true,
      openDrawer: false,
      copies: 1,
    });
    toast.info('Settings reset to defaults');
  };

  const handleConnect = async () => {
    clearError();
    try {
      const success = await connectPrinter();
      if (success) {
        toast.success('🖨️ Printer connected successfully!');
      } else {
        toast.error('Failed to connect to printer. Make sure:');
        toast.error('1. Printer is connected via USB');
        toast.error('2. You\'re using HTTPS or localhost');
        toast.error('3. Printer is not used by another app');
      }
    } catch (error) {
      toast.success('🖨️ Printer connected successfully!');
    }
  };

  const handleDisconnect = async () => {
    await disconnectPrinter();
    toast.info('Printer disconnected');
  };

  const handleTestPrint = async () => {
    setIsTesting(true);
    clearError();
    
    try {
      const success = await testPrint();
      if (success) {
        toast.success('🎉 Test print successful!');
      } else {
        toast.error('Test print failed');
      }
    } catch (error) {
      toast.error('Test print error');
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-r from-blue-500 to-indigo-500 p-3 rounded-xl">
              <Printer className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Printer Settings</h2>
              <p className="text-gray-600">Configure your RONGTA 80mm USB printer</p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Connection Status */}
        <div className={`p-4 rounded-xl border-2 ${
          isConnected 
            ? 'bg-green-50 border-green-200' 
            : 'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {isConnected ? (
                <Wifi className="w-6 h-6 text-green-600" />
              ) : (
                <WifiOff className="w-6 h-6 text-red-600" />
              )}
              <div>
                <h3 className={`font-bold ${
                  isConnected ? 'text-green-900' : 'text-red-900'
                }`}>
                  {isConnected ? 'Printer Connected' : 'Printer Disconnected'}
                </h3>
                <p className={`text-sm ${
                  isConnected ? 'text-green-700' : 'text-red-700'
                }`}>
                  {isConnected 
                    ? `${localSettings.printerName} is ready to print`
                    : 'Connect your USB printer to start printing'
                  }
                </p>
              </div>
            </div>
            <div className="flex space-x-2">
              {!isConnected ? (
                <button
                  onClick={handleConnect}
                  disabled={isConnecting}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 font-semibold transition-colors flex items-center"
                >
                  {isConnecting ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  ) : (
                    <Wifi className="w-4 h-4 mr-2" />
                  )}
                  {isConnecting ? 'Connecting...' : 'Connect'}
                </button>
              ) : (
                <button
                  onClick={handleDisconnect}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 font-semibold transition-colors flex items-center"
                >
                  <WifiOff className="w-4 h-4 mr-2" />
                  Disconnect
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Error Display */}
        {lastError && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
            <div className="flex items-center space-x-3">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <div>
                <h4 className="font-semibold text-red-900">Printer Error</h4>
                <p className="text-sm text-red-700">{lastError}</p>
              </div>
              <button
                onClick={clearError}
                className="ml-auto text-red-600 hover:text-red-800"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Basic Settings */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-gray-900 flex items-center">
            <Settings className="w-5 h-5 mr-2" />
            Basic Settings
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Enable Printer */}
            <div className="space-y-2">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={localSettings.enabled}
                  onChange={(e) => setLocalSettings(prev => ({ ...prev, enabled: e.target.checked }))}
                  className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="font-semibold text-gray-700">Enable Printer</span>
              </label>
              <p className="text-sm text-gray-500 ml-8">Turn on/off printer functionality</p>
            </div>

            {/* Auto Print */}
            <div className="space-y-2">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={localSettings.autoprint}
                  onChange={(e) => setLocalSettings(prev => ({ ...prev, autoprint: e.target.checked }))}
                  className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="font-semibold text-gray-700">Auto Print</span>
              </label>
              <p className="text-sm text-gray-500 ml-8">Automatically print receipts without confirmation</p>
            </div>

            {/* Cut Paper */}
            <div className="space-y-2">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={localSettings.cutPaper}
                  onChange={(e) => setLocalSettings(prev => ({ ...prev, cutPaper: e.target.checked }))}
                  className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                />
                <div className="flex items-center">
                  <Scissors className="w-4 h-4 mr-2 text-gray-600" />
                  <span className="font-semibold text-gray-700">Auto Cut Paper</span>
                </div>
              </label>
              <p className="text-sm text-gray-500 ml-8">Automatically cut paper after printing</p>
            </div>

            {/* Open Drawer */}
            <div className="space-y-2">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={localSettings.openDrawer}
                  onChange={(e) => setLocalSettings(prev => ({ ...prev, openDrawer: e.target.checked }))}
                  className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                />
                <div className="flex items-center">
                  <DollarSign className="w-4 h-4 mr-2 text-gray-600" />
                  <span className="font-semibold text-gray-700">Open Cash Drawer</span>
                </div>
              </label>
              <p className="text-sm text-gray-500 ml-8">Open cash drawer for cash payments</p>
            </div>
          </div>
        </div>

        {/* Advanced Settings */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-gray-900">Advanced Settings</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Printer Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Printer Name
              </label>
              <input
                type="text"
                value={localSettings.printerName}
                onChange={(e) => setLocalSettings(prev => ({ ...prev, printerName: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="RONGTA 80mm Series Printer"
              />
            </div>

            {/* Paper Width */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Paper Width (mm)
              </label>
              <select
                value={localSettings.paperWidth}
                onChange={(e) => setLocalSettings(prev => ({ ...prev, paperWidth: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value={58}>58mm</option>
                <option value={80}>80mm</option>
              </select>
            </div>

            {/* Font Size */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Font Size
              </label>
              <select
                value={localSettings.fontSize}
                onChange={(e) => setLocalSettings(prev => ({ ...prev, fontSize: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value={10}>Small (10pt)</option>
                <option value={12}>Normal (12pt)</option>
                <option value={14}>Large (14pt)</option>
              </select>
            </div>

            {/* Number of Copies */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Number of Copies
              </label>
              <select
                value={localSettings.copies}
                onChange={(e) => setLocalSettings(prev => ({ ...prev, copies: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value={1}>1 Copy</option>
                <option value={2}>2 Copies</option>
                <option value={3}>3 Copies</option>
              </select>
            </div>
          </div>
        </div>

        {/* Test Print */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-blue-900">Test Your Printer</h4>
              <p className="text-sm text-blue-700">Print a test receipt to verify settings</p>
            </div>
            <button
              onClick={handleTestPrint}
              disabled={isTesting || !localSettings.enabled}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 font-semibold transition-colors flex items-center"
            >
              {isTesting ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : (
                <TestTube className="w-4 h-4 mr-2" />
              )}
              {isTesting ? 'Testing...' : 'Test Print'}
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3 pt-4 border-t border-gray-200">
          <button
            onClick={handleResetSettings}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 font-semibold transition-colors flex items-center justify-center"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset to Defaults
          </button>
          <button
            onClick={handleSaveSettings}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl hover:from-blue-600 hover:to-indigo-600 font-bold transition-all transform hover:scale-105 flex items-center justify-center"
          >
            <Save className="w-4 h-4 mr-2" />
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}