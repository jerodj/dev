import React, { useState, useEffect } from 'react';
import { useERPStore } from '../../../../store/erpStore';
import { 
  Truck, 
  Plus, 
  Edit3, 
  Trash2, 
  Search, 
  Mail, 
  Phone, 
  MapPin,
  User,
  Building,
  CreditCard,
  CheckCircle,
  X,
  Save,
  AlertCircle,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  Eye
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function SupplierManagement() {
  const { 
    suppliers, 
    loading,
    error,
    fetchSuppliers, 
    createSupplier, 
    updateSupplier, 
    deleteSupplier
  } = useERPStore();

  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [formErrors, setFormErrors] = useState({});
  const [debugData, setDebugData] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvingSupplier, setApprovingSupplier] = useState(null);
  const [approvalReason, setApprovalReason] = useState('');
  const [approvalAction, setApprovalAction] = useState('approve');

  const [supplierForm, setSupplierForm] = useState({
    name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    payment_terms: 'net_30',
    tax_id: '',
    is_active: true
  });

  useEffect(() => {
    const loadSuppliers = async () => {
      try {
        console.log('Loading suppliers in SupplierManagement...');
        await fetchSuppliers();
        console.log('Suppliers loaded successfully');
      } catch (error) {
        console.error('Failed to load suppliers:', error);
        toast.error('Failed to load suppliers. Please check your connection.');
      }
    };
    loadSuppliers();
  }, []);

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  // Debug effect to see what data we're working with
  useEffect(() => {
    console.log('Suppliers data:', suppliers);
    console.log('Filtered suppliers count:', filteredSuppliers.length);
    if (suppliers.length > 0 && filteredSuppliers.length === 0 && searchQuery) {
      console.log('Search query is filtering out all suppliers:', searchQuery);
    }
  }, [suppliers, searchQuery]);

  const validateForm = () => {
    const errors = {};
    if (!supplierForm.name.trim()) errors.name = 'Supplier name is required';
    if (!supplierForm.contact_person.trim()) errors.contact_person = 'Contact person is required';
    if (supplierForm.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(supplierForm.email)) {
      errors.email = 'Invalid email format';
    }
    if (supplierForm.phone && !/^\+?\d{10,14}$/.test(supplierForm.phone.replace(/\D/g, ''))) {
      errors.phone = 'Invalid phone number';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateSupplier = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error('Please fix form errors');
      return;
    }

    try {
      const supplierData = {
        name: supplierForm.name.trim(),
        contact_person: supplierForm.contact_person.trim(),
        email: supplierForm.email || null,
        phone: supplierForm.phone || null,
        address: supplierForm.address || null,
        payment_terms: supplierForm.payment_terms || 'net_30',
        tax_id: supplierForm.tax_id || null,
        is_active: supplierForm.is_active
      };

      if (editingSupplier) {
        await updateSupplier(editingSupplier.id, supplierData);
        toast.success('Supplier updated successfully!');
      } else {
        await createSupplier(supplierData);
        toast.success('Supplier created successfully!');
      }
      setShowSupplierForm(false);
      setEditingSupplier(null);
      resetForm();
    } catch (error) {
      // Error handled in store
    }
  };

  const handleEditSupplier = (supplier) => {
    setEditingSupplier(supplier);
    setSupplierForm({
      name: supplier.name || '',
      contact_person: supplier.contact_person || '',
      email: supplier.email || '',
      phone: supplier.phone || '',
      address: supplier.address || '',
      payment_terms: supplier.payment_terms || 'net_30',
      tax_id: supplier.tax_id || '',
      is_active: supplier.is_active ?? true
    });
    setShowSupplierForm(true);
  };

  const handleDeleteSupplier = async (supplierId) => {
    if (!window.confirm('Are you sure you want to delete this supplier?')) return;
    try {
      await deleteSupplier(supplierId);
      toast.success('Supplier deleted successfully!');
    } catch (error) {
      // Error handled in store
    }
  };

  const handleOpenApprovalModal = (supplier, action) => {
    setApprovingSupplier(supplier);
    setApprovalAction(action);
    setApprovalReason('');
    setShowApprovalModal(true);
  };

  const handleApprovalSubmit = async () => {
    if (!approvingSupplier) {
      toast.error('Invalid approval request');
      return;
    }

    if (approvalAction === 'reject' && !approvalReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    try {
      if (approvalAction === 'approve') {
        await updateSupplier(approvingSupplier.id, {
          is_active: true,
          approval_status: 'approved',
          approved_by: currentUser?.id,
          approved_at: new Date().toISOString(),
          approval_notes: approvalReason || null
        });
        toast.success('Supplier approved successfully!');
      } else {
        await updateSupplier(approvingSupplier.id, {
          is_active: false,
          approval_status: 'rejected',
          approved_by: currentUser?.id,
          approved_at: new Date().toISOString(),
          rejection_reason: approvalReason
        });
        toast.success('Supplier rejected');
      }
      setShowApprovalModal(false);
      setApprovingSupplier(null);
      setApprovalReason('');
    } catch (error) {
      toast.error(`Failed to ${approvalAction} supplier`);
    }
  };

  const resetForm = () => {
    setSupplierForm({
      name: '',
      contact_person: '',
      email: '',
      phone: '',
      address: '',
      payment_terms: 'net_30',
      tax_id: '',
      is_active: true
    });
    setFormErrors({});
  };

  const formatPaymentTerms = (terms) => {
    if (!terms) return 'N/A';
    return terms.replace(/_/g, ' ').toUpperCase();
  };

  // Improved filtering logic
  const filteredSuppliers = suppliers.filter(supplier => {
    if (!supplier) return false;
    
    // If no search query, show all suppliers
    if (!searchQuery.trim()) return true;
    
    const searchLower = searchQuery.toLowerCase();
    
    // Check all possible fields for matches
    return (
      (supplier.name && supplier.name.toLowerCase().includes(searchLower)) ||
      (supplier.contact_person && supplier.contact_person.toLowerCase().includes(searchLower)) ||
      (supplier.email && supplier.email.toLowerCase().includes(searchLower)) ||
      (supplier.phone && supplier.phone.includes(searchQuery)) ||
      (supplier.address && supplier.address.toLowerCase().includes(searchLower)) ||
      (supplier.tax_id && supplier.tax_id.toLowerCase().includes(searchLower)) ||
      (supplier.payment_terms && supplier.payment_terms.toLowerCase().includes(searchLower))
    );
  });

  const handleRefresh = async () => {
    try {
      await fetchSuppliers();
      toast.success('Suppliers refreshed successfully!');
    } catch (error) {
      console.error('Failed to refresh suppliers:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 rounded-3xl p-8 text-white shadow-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="bg-white/20 backdrop-blur-sm p-4 rounded-2xl">
              <Truck className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold mb-2">Supplier Management</h1>
              <p className="text-green-100">Manage your business suppliers and vendors</p>
              {suppliers.length > 0 && (
                <p className="text-green-200 text-sm mt-1">
                  {suppliers.length} supplier{suppliers.length !== 1 ? 's' : ''} loaded
                </p>
              )}
            </div>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handleRefresh}
              className="px-4 py-3 bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white rounded-xl font-bold transition-all flex items-center shadow-lg border border-white/30"
              aria-label="Refresh Suppliers"
              title="Refresh suppliers"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
            <button
              onClick={() => {
                setShowSupplierForm(true);
                setEditingSupplier(null);
                resetForm();
              }}
              className="px-6 py-3 bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white rounded-xl font-bold transition-all transform hover:scale-105 flex items-center shadow-lg border border-white/30"
              aria-label="Add New Supplier"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add Supplier
            </button>
          </div>
        </div>
      </div>

      {/* Debug Info - Remove in production */}
      {debugData && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-bold text-yellow-800">Debug Information</h3>
            <button 
              onClick={() => setDebugData(false)}
              className="text-yellow-600 hover:text-yellow-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="text-sm text-yellow-700">
            <p>Total suppliers: {suppliers.length}</p>
            <p>Filtered suppliers: {filteredSuppliers.length}</p>
            <p>Search query: "{searchQuery}"</p>
            <pre className="mt-2 text-xs overflow-auto max-h-32">
              {JSON.stringify(suppliers, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && suppliers.length === 0 && (
        <div className="text-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto"></div>
          <p className="text-gray-500 mt-4">Loading suppliers...</p>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="text-center py-16">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-500">{error}</p>
          <button
            onClick={handleRefresh}
            className="mt-4 px-6 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-all"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Search and Controls */}
      {!loading && !error && suppliers.length > 0 && (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search suppliers by name, contact, email, phone, address..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                id="search-suppliers"
                name="search-suppliers"
              />
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setDebugData(!debugData)}
                className="px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all text-sm"
                title="Toggle debug info"
              >
                Debug
              </button>
            </div>
          </div>
          {searchQuery && (
            <p className="text-sm text-gray-500 mt-3">
              Showing {filteredSuppliers.length} of {suppliers.length} suppliers matching "{searchQuery}"
            </p>
          )}
        </div>
      )}

      {/* Suppliers Grid */}
      {!loading && !error && filteredSuppliers.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSuppliers.map(supplier => {
            // Additional safety check
            if (!supplier || !supplier.id) return null;
            
            return (
              <div key={supplier.id} className="bg-white rounded-3xl shadow-xl border border-gray-100 hover:shadow-2xl transition-all duration-300 transform hover:scale-105 overflow-hidden">
                <div className="p-6 bg-gradient-to-r from-green-500 to-emerald-500 text-white">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl">
                        <Building className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold">{supplier.name || 'Unnamed Supplier'}</h3>
                        <p className="text-green-100">{supplier.contact_person || 'No contact'}</p>
                      </div>
                    </div>
                    <div className={`w-4 h-4 rounded-full ${supplier.is_active ? 'bg-green-300' : 'bg-red-300'}`}></div>
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  <div className="space-y-3">
                    {supplier.email && (
                      <div className="flex items-center space-x-3 text-sm">
                        <Mail className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600">{supplier.email}</span>
                      </div>
                    )}
                    {supplier.phone && (
                      <div className="flex items-center space-x-3 text-sm">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600">{supplier.phone}</span>
                      </div>
                    )}
                    {supplier.address && (
                      <div className="flex items-center space-x-3 text-sm">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600 line-clamp-2">{supplier.address}</span>
                      </div>
                    )}
                    <div className="flex items-center space-x-3 text-sm">
                      <CreditCard className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-600">Payment: {formatPaymentTerms(supplier.payment_terms)}</span>
                    </div>
                    {supplier.tax_id && (
                      <div className="flex items-center space-x-3 text-sm">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600">Tax ID: {supplier.tax_id}</span>
                      </div>
                    )}
                  </div>
                  <div className={`p-3 rounded-xl ${supplier.is_active ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                    <div className="flex items-center justify-between">
                      <span className={`font-bold ${supplier.is_active ? 'text-green-800' : 'text-red-800'}`}>
                        {supplier.is_active ? 'Active Supplier' : 'Inactive Supplier'}
                      </span>
                      {supplier.is_active ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : (
                        <X className="w-4 h-4 text-red-600" />
                      )}
                    </div>
                  </div>
                  <div className="flex space-x-2 pt-4 border-t border-gray-200">
                    {/* Approval buttons for pending suppliers */}
                    {(!supplier.is_active || supplier.approval_status === 'pending') && ['admin', 'manager'].includes(currentUser?.role || '') && (
                      <>
                        <button
                          onClick={() => handleOpenApprovalModal(supplier, 'approve')}
                          className="px-4 py-3 bg-green-100 text-green-700 rounded-xl hover:bg-green-200 transition-all flex items-center justify-center font-semibold"
                          title="Approve Supplier"
                        >
                          <ThumbsUp className="w-4 h-4 mr-2" />
                          Approve
                        </button>
                        <button
                          onClick={() => handleOpenApprovalModal(supplier, 'reject')}
                          className="px-4 py-3 bg-red-100 text-red-700 rounded-xl hover:bg-red-200 transition-all flex items-center justify-center font-semibold"
                          title="Reject Supplier"
                        >
                          <ThumbsDown className="w-4 h-4 mr-2" />
                          Reject
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => handleEditSupplier(supplier)}
                      className="flex-1 px-4 py-3 bg-blue-100 text-blue-700 rounded-xl hover:bg-blue-200 transition-all flex items-center justify-center font-semibold"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View/Edit
                    </button>
                    <button
                      onClick={() => handleEditSupplier(supplier)}
                      className="flex-1 px-4 py-3 bg-blue-100 text-blue-700 rounded-xl hover:bg-blue-200 transition-all flex items-center justify-center font-semibold"
                      aria-label={`Edit Supplier ${supplier.name}`}
                    >
                      <Edit3 className="w-4 h-4 mr-2" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteSupplier(supplier.id)}
                      className="px-4 py-3 bg-red-100 text-red-700 rounded-xl hover:bg-red-200 transition-all flex items-center justify-center font-semibold"
                      aria-label={`Delete Supplier ${supplier.name}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty States */}
      {!loading && !error && (
        <>
          {/* No suppliers at all */}
          {suppliers.length === 0 && (
            <div className="text-center py-16">
              <div className="bg-gradient-to-r from-gray-100 to-gray-200 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6">
                <Truck className="w-12 h-12 text-gray-400" />
              </div>
              <h3 className="text-2xl font-bold text-gray-500 mb-4">No suppliers yet</h3>
              <p className="text-gray-400 mb-6">
                Start by adding your first supplier to manage your vendors
              </p>
              <button
                onClick={() => {
                  setShowSupplierForm(true);
                  setEditingSupplier(null);
                  resetForm();
                }}
                className="px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-2xl hover:from-green-600 hover:to-emerald-600 font-bold transition-all transform hover:scale-105 flex items-center mx-auto shadow-lg"
                aria-label="Add First Supplier"
              >
                <Plus className="w-5 h-5 mr-2" />
                Add First Supplier
              </button>
            </div>
          )}

          {/* No matching suppliers for search */}
          {suppliers.length > 0 && filteredSuppliers.length === 0 && searchQuery && (
            <div className="text-center py-16">
              <div className="bg-gradient-to-r from-gray-100 to-gray-200 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6">
                <Search className="w-12 h-12 text-gray-400" />
              </div>
              <h3 className="text-2xl font-bold text-gray-500 mb-4">No matching suppliers</h3>
              <p className="text-gray-400 mb-6">
                No suppliers found for "{searchQuery}"
              </p>
              <button
                onClick={() => setSearchQuery('')}
                className="px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-2xl hover:from-green-600 hover:to-emerald-600 font-bold transition-all"
              >
                Clear Search
              </button>
            </div>
          )}
        </>
      )}

      {/* Supplier Form Modal */}
      {showSupplierForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6 bg-gradient-to-r from-green-600 to-emerald-600 text-white">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold flex items-center">
                  <Truck className="w-6 h-6 mr-3" />
                  {editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}
                </h3>
                <button
                  onClick={() => {
                    setShowSupplierForm(false);
                    setEditingSupplier(null);
                    resetForm();
                  }}
                  className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-xl transition-all"
                  aria-label="Close Supplier Form"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            <form onSubmit={handleCreateSupplier} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2" htmlFor="supplier-name">
                    Supplier Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="supplier-name"
                    name="supplier-name"
                    value={supplierForm.name}
                    onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })}
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent ${formErrors.name ? 'border-red-500' : 'border-gray-300'}`}
                    placeholder="Enter supplier name"
                    required
                  />
                  {formErrors.name && (
                    <p className="text-red-500 text-sm mt-1 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {formErrors.name}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2" htmlFor="contact-person">
                    Contact Person <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="contact-person"
                    name="contact-person"
                    value={supplierForm.contact_person}
                    onChange={(e) => setSupplierForm({ ...supplierForm, contact_person: e.target.value })}
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent ${formErrors.contact_person ? 'border-red-500' : 'border-gray-300'}`}
                    placeholder="Enter contact person name"
                    required
                  />
                  {formErrors.contact_person && (
                    <p className="text-red-500 text-sm mt-1 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {formErrors.contact_person}
                    </p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2" htmlFor="supplier-email">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="email"
                      id="supplier-email"
                      name="supplier-email"
                      value={supplierForm.email}
                      onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })}
                      className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent ${formErrors.email ? 'border-red-500' : 'border-gray-300'}`}
                      placeholder="supplier@example.com"
                    />
                  </div>
                  {formErrors.email && (
                    <p className="text-red-500 text-sm mt-1 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {formErrors.email}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2" htmlFor="supplier-phone">
                    Phone
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="tel"
                      id="supplier-phone"
                      name="supplier-phone"
                      value={supplierForm.phone}
                      onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })}
                      className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent ${formErrors.phone ? 'border-red-500' : 'border-gray-300'}`}
                      placeholder="+256 123 456 789"
                    />
                  </div>
                  {formErrors.phone && (
                    <p className="text-red-500 text-sm mt-1 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {formErrors.phone}
                    </p>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2" htmlFor="supplier-address">
                  Address
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <textarea
                    id="supplier-address"
                    name="supplier-address"
                    value={supplierForm.address}
                    onChange={(e) => setSupplierForm({ ...supplierForm, address: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                    rows={3}
                    placeholder="Enter supplier address"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2" htmlFor="payment-terms">
                    Payment Terms
                  </label>
                  <select
                    id="payment-terms"
                    name="payment-terms"
                    value={supplierForm.payment_terms}
                    onChange={(e) => setSupplierForm({ ...supplierForm, payment_terms: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="net_15">Net 15 Days</option>
                    <option value="net_30">Net 30 Days</option>
                    <option value="net_60">Net 60 Days</option>
                    <option value="cash_on_delivery">Cash on Delivery</option>
                    <option value="prepaid">Prepaid</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2" htmlFor="tax-id">
                    Tax ID
                  </label>
                  <input
                    type="text"
                    id="tax-id"
                    name="tax-id"
                    value={supplierForm.tax_id}
                    onChange={(e) => setSupplierForm({ ...supplierForm, tax_id: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Enter tax identification number"
                  />
                </div>
              </div>
              <div className="flex items-center justify-center">
                <label className="flex items-center space-x-4 cursor-pointer group p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl border-2 border-green-100 hover:border-green-300 transition-all" htmlFor="active-status">
                  <div className="relative">
                    <input
                      type="checkbox"
                      id="active-status"
                      name="active-status"
                      checked={supplierForm.is_active}
                      onChange={(e) => setSupplierForm({ ...supplierForm, is_active: e.target.checked })}
                      className="sr-only"
                    />
                    <div className={`w-12 h-6 rounded-full transition-all duration-300 ${supplierForm.is_active ? 'bg-gradient-to-r from-green-500 to-emerald-500' : 'bg-gray-300'}`}>
                      <div className={`w-5 h-5 bg-white rounded-full shadow-lg transform transition-transform duration-300 ${supplierForm.is_active ? 'translate-x-6' : 'translate-x-0.5'} mt-0.5`}></div>
                    </div>
                  </div>
                  <div>
                    <span className="text-lg font-bold text-green-800 group-hover:text-green-900 transition-colors">
                      Active Supplier
                    </span>
                    <p className="text-sm text-green-600">Supplier can receive purchase orders</p>
                  </div>
                </label>
              </div>
              <div className="flex space-x-4 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowSupplierForm(false);
                    setEditingSupplier(null);
                    resetForm();
                  }}
                  className="flex-1 px-6 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 font-bold transition-all"
                  aria-label="Cancel Supplier Form"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl hover:from-green-600 hover:to-emerald-600 disabled:opacity-50 font-bold transition-all transform hover:scale-105 flex items-center justify-center"
                  aria-label={editingSupplier ? 'Update Supplier' : 'Create Supplier'}
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  ) : (
                    <Save className="w-5 h-5 mr-2" />
                  )}
                  {loading ? 'Saving...' : editingSupplier ? 'Update Supplier' : 'Create Supplier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Approval Modal */}
      {showApprovalModal && approvingSupplier && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl">
            <div className={`p-6 bg-gradient-to-r ${
              approvalAction === 'approve' 
                ? 'from-green-600 to-emerald-600' 
                : 'from-red-600 to-pink-600'
            } text-white`}>
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold flex items-center">
                  {approvalAction === 'approve' ? (
                    <ThumbsUp className="w-6 h-6 mr-3" />
                  ) : (
                    <ThumbsDown className="w-6 h-6 mr-3" />
                  )}
                  {approvalAction === 'approve' ? 'Approve Supplier' : 'Reject Supplier'}
                </h3>
                <button
                  onClick={() => {
                    setShowApprovalModal(false);
                    setApprovingSupplier(null);
                    setApprovalReason('');
                  }}
                  className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-xl transition-all"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Supplier Details */}
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                <h4 className="font-bold text-gray-900 mb-3">Supplier Details</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Name:</span>
                    <p className="font-semibold">{approvingSupplier.name}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Contact:</span>
                    <p className="font-semibold">{approvingSupplier.contact_person}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Email:</span>
                    <p className="font-semibold">{approvingSupplier.email || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Phone:</span>
                    <p className="font-semibold">{approvingSupplier.phone || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Approval Reason */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  {approvalAction === 'approve' ? 'Approval Notes (Optional)' : 'Rejection Reason *'}
                </label>
                <div className="relative">
                  <MessageSquare className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <textarea
                    value={approvalReason}
                    onChange={(e) => setApprovalReason(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                    rows={3}
                    placeholder={
                      approvalAction === 'approve' 
                        ? 'Optional notes for approval...' 
                        : 'Please provide a reason for rejection...'
                    }
                    required={approvalAction === 'reject'}
                  />
                </div>
              </div>

              <div className="flex space-x-4">
                <button
                  onClick={() => {
                    setShowApprovalModal(false);
                    setApprovingSupplier(null);
                    setApprovalReason('');
                  }}
                  className="flex-1 px-6 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApprovalSubmit}
                  disabled={loading || (approvalAction === 'reject' && !approvalReason.trim())}
                  className={`flex-1 px-6 py-3 text-white rounded-xl font-bold transition-all transform hover:scale-105 flex items-center justify-center ${
                    approvalAction === 'approve'
                      ? 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600'
                      : 'bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600'
                  } disabled:opacity-50`}
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  ) : approvalAction === 'approve' ? (
                    <ThumbsUp className="w-5 h-5 mr-2" />
                  ) : (
                    <ThumbsDown className="w-5 h-5 mr-2" />
                  )}
                  {loading ? 'Processing...' : approvalAction === 'approve' ? 'Approve Supplier' : 'Reject Supplier'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}