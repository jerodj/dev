import React, { useState, useEffect, ChangeEvent } from 'react';
import { usePOSStore } from '../../../../store/posStore';
import { posApi } from '../../../../lib/api';
import { adminCache, ADMIN_CACHE_KEYS, ADMIN_CACHE_TTL, invalidateAdminCache } from '../../../../lib/adminCache';
import { Building, Upload, Image as ImageIcon, Save, AlertCircle, MapPin, Phone, Mail, Folder, Trash2,RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import type { BusinessSettings, POSStore } from '../../../../types/pos';

export default function BusinessSettings() {
  const { businessSettings, setBusinessSettings } = usePOSStore() as POSStore;
  const [loading, setLoading] = useState<boolean>(true);
  const [lastCacheUpdate, setLastCacheUpdate] = useState(0);

  useEffect(() => {
    loadCachedBusinessSettings();
  }, []);

  useEffect(() => {
    console.log('Current businessSettings.tax_rate:', businessSettings.tax_rate);
  }, [businessSettings.tax_rate]);

  const loadCachedBusinessSettings = async () => {
    setLoading(true);
    try {
      console.log('[BusinessSettings] Loading cached business settings...');
      const settings = await adminCache.getOrFetch(
        ADMIN_CACHE_KEYS.BUSINESS_SETTINGS,
        () => posApi.getBusinessSettings(),
        ADMIN_CACHE_TTL.BUSINESS_SETTINGS
      );
      
      console.log('Fetched business settings:', settings);
      if (settings && typeof settings === 'object' && settings.business_name) {
        setBusinessSettings({
          id: settings.id || '',
          business_name: settings.business_name || 'Restaurant POS',
          currency: settings.currency || 'UGX',
          tax_rate: settings.tax_rate ?? 0,
          receipt_footer: settings.receipt_footer || 'Thank you for dining with us!',
          logo_url: settings.logo_url || null,
          business_type: settings.business_type || 'restaurant',
          address: settings.address || null,
          phone: settings.phone || null,
          email: settings.email || null,
          enable_kitchen_display: settings.enable_kitchen_display || false,
          enable_modifiers: settings.enable_modifiers || true,
          enable_tables: settings.enable_tables || true,
          created_at: settings.created_at || new Date().toISOString(),
          updated_at: settings.updated_at || '',
        });
        setLastCacheUpdate(Date.now());
        console.log('[BusinessSettings] Cached business settings loaded successfully');
      } else {
        throw new Error('Invalid business settings response');
      }
    } catch (error) {
      console.error('Error fetching business settings:', error);
      toast.error('Failed to load business settings');
      setBusinessSettings({
        id: '',
        business_name: 'Restaurant POS',
        currency: 'UGX',
        tax_rate: 0,
        receipt_footer: 'Thank you for dining with us!',
        logo_url: null,
        business_type: 'restaurant',
        address: null,
        phone: null,
        email: null,
        enable_kitchen_display: false,
        enable_modifiers: true,
        enable_tables: true,
        created_at: new Date().toISOString(),
        updated_at: '',
      });
    } finally {
      setLoading(false);
    }
  };

  const refreshBusinessSettings = async (forceRefresh = false) => {
    setLoading(true);
    try {
      console.log('[BusinessSettings] Refreshing business settings...');
      
      if (forceRefresh) {
        invalidateAdminCache.business();
      }

      const settings = await adminCache.getOrFetch(
        ADMIN_CACHE_KEYS.BUSINESS_SETTINGS,
        () => posApi.getBusinessSettings(),
        ADMIN_CACHE_TTL.BUSINESS_SETTINGS,
        forceRefresh
      );
      
      if (settings && typeof settings === 'object' && settings.business_name) {
        setBusinessSettings({
          id: settings.id || '',
          business_name: settings.business_name || 'Restaurant POS',
          currency: settings.currency || 'UGX',
          tax_rate: settings.tax_rate ?? 0,
          receipt_footer: settings.receipt_footer || 'Thank you for dining with us!',
          logo_url: settings.logo_url || null,
          business_type: settings.business_type || 'restaurant',
          address: settings.address || null,
          phone: settings.phone || null,
          email: settings.email || null,
          enable_kitchen_display: settings.enable_kitchen_display || false,
          enable_modifiers: settings.enable_modifiers || true,
          enable_tables: settings.enable_tables || true,
          created_at: settings.created_at || new Date().toISOString(),
          updated_at: settings.updated_at || '',
        });
        setLastCacheUpdate(Date.now());
        
        if (forceRefresh) {
          toast.success('Business settings refreshed!');
        }
      }
    } catch (error) {
      console.error('[BusinessSettings] Refresh failed:', error);
      toast.error('Failed to refresh business settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBusinessSettings = async () => {
    if (!businessSettings) {
      toast.error('No business settings to save');
      return;
    }

    if (!businessSettings.business_name || !businessSettings.currency || !businessSettings.business_type) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (businessSettings.tax_rate < 0 || businessSettings.tax_rate > 100) {
      toast.error('Tax Rate must be between 0% and 100%');
      return;
    }

    setLoading(true);
    try {
      const settingsData = {
        business_name: businessSettings.business_name,
        business_type: businessSettings.business_type,
        currency: businessSettings.currency,
        tax_rate: businessSettings.tax_rate,
        receipt_footer: businessSettings.receipt_footer || 'Thank you for dining with us!',
        logo_url: businessSettings.logo_url,
        address: businessSettings.address,
        phone: businessSettings.phone,
        email: businessSettings.email,
        enable_kitchen_display: businessSettings.enable_kitchen_display,
        enable_modifiers: businessSettings.enable_modifiers,
        enable_tables: businessSettings.enable_tables,
        user_id: localStorage.getItem('user_id') || '',
      };
      console.log('Saving business settings:', settingsData);
      const updatedSettings = await posApi.updateBusinessSettings(settingsData);
      console.log('API response for updated settings:', updatedSettings);
      
      // Invalidate cache and refresh data
      invalidateAdminCache.business();
      
      if (updatedSettings.tax_rate !== settingsData.tax_rate) {
        console.warn('Server returned different tax_rate:', updatedSettings.tax_rate, 'Expected:', settingsData.tax_rate);
        toast.error('Tax rate was not updated correctly on the server');
        setBusinessSettings({
          ...businessSettings,
          updated_at: new Date().toISOString(),
        });
      } else {
        // Update cache with new data
        adminCache.set(ADMIN_CACHE_KEYS.BUSINESS_SETTINGS, updatedSettings, ADMIN_CACHE_TTL.BUSINESS_SETTINGS);
        setBusinessSettings({
          ...businessSettings,
          ...updatedSettings,
          updated_at: new Date().toISOString(),
        });
        setLastCacheUpdate(Date.now());
        toast.success('Business settings saved successfully!');
      }
      await posApi.forceCacheRefresh();
    } catch (error) {
      console.error('Error saving business settings:', error);
      toast.error(`Failed to save business settings: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          if (businessSettings && e.target?.result) {
            setBusinessSettings({ ...businessSettings, logo_url: e.target.result as string });
            toast.success('Logo uploaded successfully!');
          }
        };
        reader.readAsDataURL(file);
      } else {
        toast.error('Please select a valid image file');
      }
    }
  };

  const handleRemoveLogo = () => {
    if (businessSettings) {
      setBusinessSettings({ ...businessSettings, logo_url: null });
      toast.success('Logo removed successfully!');
    }
  };

const handleTaxRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const inputValue = e.target.value;
  
  // Allow empty string or valid numbers
  if (inputValue === '' || inputValue.match(/^\d*\.?\d*$/)) {
    setBusinessSettings({
      ...businessSettings,
      tax_rate: inputValue === '' ? '' : parseFloat(inputValue)
    });
  }
};

const handleTaxRateBlur = (e: React.FocusEvent<HTMLInputElement>) => {
  let value = e.target.value === '' ? 0 : parseFloat(e.target.value);
  
  // Handle NaN cases (when input is just ".")
  if (isNaN(value)) {
    value = 0;
  }

  // Clamp the value between 0 and 100
  const clampedValue = Math.max(0, Math.min(100, value));
  
  setBusinessSettings({
    ...businessSettings,
    tax_rate: clampedValue
  });
};

// In your input field:
<input
  type="number"
  step="0.01"
  min="0"
  max="100"
  value={businessSettings.tax_rate === 0 ? '' : businessSettings.tax_rate}
  onChange={handleTaxRateChange}
  onBlur={handleTaxRateBlur}
  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-purple-500 focus:border-transparent text-sm font-semibold"
  placeholder="0.00"
  required
/>


  return (
    <div className="max-w-3xl mx-auto space-y-6 p-4">
      {/* Header with cache info */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl">
              <Building className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Business Settings</h1>
              <p className="text-purple-100">Configure your business information</p>
              <div className="flex items-center space-x-2 mt-1 text-sm">
                <span className="bg-white/20 px-2 py-1 rounded-full">
                  Last updated: {new Date(lastCacheUpdate).toLocaleTimeString()}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={() => refreshBusinessSettings(true)}
            disabled={loading}
            className="px-4 py-3 bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white rounded-xl font-bold transition-all flex items-center shadow-lg border border-white/30"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
            <p className="text-gray-500">Loading business settings from cache...</p>
          </div>
        </div>
      ) : !businessSettings ? (
        <div className="text-center p-6 bg-white rounded-2xl shadow-xl border border-red-200">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-red-800 mb-2">Error</h2>
          <p className="text-red-600">Failed to load business settings. Please try again.</p>
          <button
            onClick={() => refreshBusinessSettings(true)}
            className="mt-4 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-all"
          >
            Retry
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center">
              Business Information
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Business ID</label>
                  <input
                    type="text"
                    value={businessSettings.id}
                    disabled
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-100 text-sm font-semibold text-gray-500 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Business Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={businessSettings.business_name}
                    onChange={(e) =>
                      setBusinessSettings({ ...businessSettings, business_name: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-purple-500 focus:border-transparent text-sm font-semibold"
                    placeholder="Enter your business name"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Business Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={businessSettings.business_type}
                    onChange={(e) =>
                      setBusinessSettings({
                        ...businessSettings,
                        business_type: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-purple-500 focus:border-transparent text-sm font-semibold"
                    required
                  >
                    <option value="restaurant">Restaurant</option>
                    <option value="bar">Bar</option>
                    <option value="cafe">Cafe</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Address</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={businessSettings.address ?? ''}
                      onChange={(e) =>
                        setBusinessSettings({ ...businessSettings, address: e.target.value || null })
                      }
                      className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-purple-500 focus:border-transparent text-sm font-semibold"
                      placeholder="Enter business address"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Phone</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="tel"
                        value={businessSettings.phone ?? ''}
                        onChange={(e) =>
                          setBusinessSettings({ ...businessSettings, phone: e.target.value || null })
                        }
                        className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-purple-500 focus:border-transparent text-sm font-semibold"
                        placeholder="Enter phone number"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="email"
                        value={businessSettings.email ?? ''}
                        onChange={(e) =>
                          setBusinessSettings({ ...businessSettings, email: e.target.value || null })
                        }
                        className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-purple-500 focus:border-transparent text-sm font-semibold"
                        placeholder="Enter email address"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Currency <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={businessSettings.currency}
                      onChange={(e) =>
                        setBusinessSettings({ ...businessSettings, currency: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-purple-500 focus:border-transparent text-sm font-semibold"
                      required
                    >
                      <option value="UGX">UGX - Ugandan Shilling</option>
                      <option value="USD">USD - US Dollar</option>
                      <option value="EUR">EUR - Euro</option>
                      <option value="GBP">GBP - British Pound</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Tax Rate (%) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={businessSettings.tax_rate}
                      onChange={handleTaxRateChange}
                      onBlur={handleTaxRateBlur}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-purple-500 focus:border-transparent text-sm font-semibold"
                      placeholder="0.00"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Receipt Footer Message</label>
                  <textarea
                    value={businessSettings.receipt_footer}
                    onChange={(e) =>
                      setBusinessSettings({ ...businessSettings, receipt_footer: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-purple-500 focus:border-transparent text-sm resize-none"
                    rows={3}
                    placeholder="Thank you for dining with us! Please come again soon."
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Business Logo</label>
                  <div className="border border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-purple-400 transition-colors">
                    {businessSettings.logo_url ? (
                      <div className="space-y-3">
                        <img
                          src={businessSettings.logo_url}
                          alt="Business Logo"
                          className="max-w-full max-h-32 mx-auto rounded-lg shadow-md"
                        />
                        <div className="flex space-x-2 justify-center">
                          <label className="cursor-pointer bg-purple-500 text-white px-3 py-2 rounded-lg hover:bg-purple-600 transition-colors flex items-center text-sm">
                            <Upload className="w-4 h-4 mr-1" />
                            Change Logo
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleLogoUpload}
                              className="hidden"
                            />
                          </label>
                          <button
                            onClick={handleRemoveLogo}
                            className="bg-red-500 text-white px-3 py-2 rounded-lg hover:bg-red-600 transition-colors flex items-center text-sm"
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            Remove
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="bg-gray-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto">
                          <ImageIcon className="w-8 h-8 text-gray-400" />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-gray-700 mb-1">Upload Your Logo</h3>
                          <p className="text-gray-500 text-xs mb-2">Choose an image file for your business logo</p>
                          <label className="cursor-pointer bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all transform hover:scale-105 inline-flex items-center text-sm font-semibold">
                            <Folder className="w-4 h-4 mr-1" />
                            Browse Files
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleLogoUpload}
                              className="hidden"
                            />
                          </label>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={businessSettings.enable_kitchen_display}
                      onChange={(e) =>
                        setBusinessSettings({
                          ...businessSettings,
                          enable_kitchen_display: e.target.checked,
                        })
                      }
                      className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                    />
                    <span className="text-sm font-semibold text-gray-700">Enable Kitchen Display</span>
                  </label>

                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={businessSettings.enable_modifiers}
                      onChange={(e) =>
                        setBusinessSettings({ ...businessSettings, enable_modifiers: e.target.checked })
                      }
                      className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                    />
                    <span className="text-sm font-semibold text-gray-700">Enable Modifiers</span>
                  </label>

                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={businessSettings.enable_tables}
                      onChange={(e) =>
                        setBusinessSettings({ ...businessSettings, enable_tables: e.target.checked })
                      }
                      className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                    />
                    <span className="text-sm font-semibold text-gray-700">Enable Tables</span>
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Created At</label>
                  <input
                    type="text"
                    value={
                      businessSettings.created_at
                        ? new Date(businessSettings.created_at).toLocaleString('en-US', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })
                        : 'N/A'
                    }
                    disabled
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-100 text-sm font-semibold text-gray-500 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Updated At</label>
                  <input
                    type="text"
                    value={
                      businessSettings.updated_at
                        ? new Date(businessSettings.updated_at).toLocaleString('en-US', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })
                        : 'N/A'
                    }
                    disabled
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-100 text-sm font-semibold text-gray-500 cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-6 border-t border-gray-200 mt-6">
              <button
                onClick={handleSaveBusinessSettings}
                disabled={loading || !businessSettings}
                className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 font-bold text-sm transition-all transform hover:scale-105 flex items-center shadow-md"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                {loading ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}