import React, { useState, useEffect } from 'react';
import { useERPStore } from '../../../../store/erpStore';
import { usePOSStore } from '../../../../store/posStore';
import {
  ShoppingCart,
  Plus,
  Edit3,
  Trash2,
  Search,
  CheckCircle,
  Clock,
  X,
  Save,
  Truck,
  Package,
  Calendar,
  DollarSign,
  FileText,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  Eye,
  Building,
  User,
  Target,
  TrendingUp,
  TrendingDown,
  BarChart3,
  RefreshCw,
  Download,
  Filter,
  Zap,
  Star
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format, startOfMonth, endOfMonth, isValid } from 'date-fns';

export default function PurchaseManagement() {
  const {
    purchaseOrders,
    suppliers,
    inventoryItems,
    loading,
    error,
    fetchPurchaseOrders,
    fetchSuppliers,
    fetchInventoryItems,
    createPurchaseOrder,
    updatePurchaseOrder,
    approvePurchaseOrder,
    rejectPurchaseOrder,
    receivePurchaseOrder,
  } = useERPStore();
  const { currentUser, businessSettings } = usePOSStore();

  const [activeTab, setActiveTab] = useState<'orders' | 'analytics' | 'templates'>('orders');
  const [showPOForm, setShowPOForm] = useState(false);
  const [editingPO, setEditingPO] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [supplierFilter, setSupplierFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [receivingPO, setReceivingPO] = useState(null);
  const [expandedRows, setExpandedRows] = useState<string[]>([]);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvingPO, setApprovingPO] = useState(null);
  const [approvalReason, setApprovalReason] = useState('');
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject'>('approve');
  const [selectedPOs, setSelectedPOs] = useState<string[]>([]);
  const [showBulkActions, setShowBulkActions] = useState(false);

  const [poForm, setPOForm] = useState({
    supplier_id: '',
    order_date: format(new Date(), 'yyyy-MM-dd'),
    expected_delivery: '',
    notes: '',
    priority: 'normal',
    items: [],
  });

  const [receivingItems, setReceivingItems] = useState([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        await Promise.all([fetchPurchaseOrders(), fetchSuppliers(), fetchInventoryItems()]);
      } catch (error) {
        console.error('Failed to load purchase management data:', error);
        toast.error('Failed to load purchase management data');
      }
    };
    loadData();
  }, [fetchPurchaseOrders, fetchSuppliers, fetchInventoryItems]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: businessSettings?.currency || 'UGX',
      minimumFractionDigits: 0,
    }).format(value || 0);
  };

  const validatePOForm = () => {
    if (!poForm.supplier_id) {
      toast.error('Please select a supplier');
      return false;
    }
    if (poForm.items.length === 0) {
      toast.error('Please add at least one item');
      return false;
    }
    if (poForm.items.some(item => !item.item_name || item.quantity <= 0 || item.unit_price <= 0)) {
      toast.error('Please ensure all items have valid names, quantities, and prices');
      return false;
    }
    return true;
  };

  const handleCreatePO = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validatePOForm()) return;

    const subtotal = poForm.items.reduce((sum, item) => sum + item.total_price, 0);
    const taxAmount = subtotal * ((businessSettings?.tax_rate || 0) / 100);
    const totalAmount = subtotal + taxAmount;

    try {
      const poData = {
        supplier_id: poForm.supplier_id,
        status: 'pending',
        order_date: poForm.order_date,
        expected_delivery: poForm.expected_delivery || null,
        subtotal,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        notes: poForm.notes || null,
        priority: poForm.priority,
        created_by: currentUser?.id || '',
        approved_by: null,
        approved_at: null,
        received_at: null,
        currency: businessSettings?.currency || 'UGX',
        items: poForm.items,
      };

      if (editingPO) {
        await updatePurchaseOrder(editingPO.id, poData);
        toast.success('Purchase order updated successfully! ✨');
      } else {
        await createPurchaseOrder(poData);
        toast.success('Purchase order created successfully! 🎉');
      }
      setShowPOForm(false);
      resetPOForm();
    } catch (error) {
      // Error handled in store
    }
  };

  const handleApprovalSubmit = async () => {
    if (!approvingPO || !currentUser?.id) {
      toast.error('Invalid approval request');
      return;
    }

    if (approvalAction === 'reject' && !approvalReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    try {
      if (approvalAction === 'approve') {
        await approvePurchaseOrder(approvingPO.id, currentUser.id);
        toast.success('Purchase order approved successfully! ✅');
      } else {
        await rejectPurchaseOrder(approvingPO.id, currentUser.id, approvalReason);
        toast.success('Purchase order rejected ❌');
      }
      setShowApprovalModal(false);
      setApprovingPO(null);
      setApprovalReason('');
    } catch (error) {
      // Error handled in store
    }
  };

  const handleReceivePO = async () => {
    if (!receivingPO) return;

    const hasReceivedItems = receivingItems.some(item => item.received_quantity > 0);
    if (!hasReceivedItems) {
      toast.error('Please specify received quantities for at least one item');
      return;
    }

    try {
      await receivePurchaseOrder(receivingPO.id, receivingItems);
      setShowReceiveModal(false);
      setReceivingPO(null);
      setReceivingItems([]);
      toast.success('Purchase order received successfully! 📦');
    } catch (error) {
      // Error handled in store
    }
  };

  const addItemToPO = () => {
    setPOForm({
      ...poForm,
      items: [
        ...poForm.items,
        {
          id: `temp-${Date.now()}`,
          menu_item_id: '',
          item_name: '',
          description: '',
          quantity: 1,
          unit_price: 0,
          total_price: 0,
          unit_of_measure: 'pcs',
        },
      ],
    });
  };

  const updatePOItem = (index: number, field: string, value: any) => {
    const updatedItems = [...poForm.items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };

    if (field === 'quantity' || field === 'unit_price') {
      updatedItems[index].total_price = updatedItems[index].quantity * updatedItems[index].unit_price;
    }

    setPOForm({ ...poForm, items: updatedItems });
  };

  const removePOItem = (index: number) => {
    setPOForm({
      ...poForm,
      items: poForm.items.filter((_, i) => i !== index),
    });
  };

  const resetPOForm = () => {
    setPOForm({
      supplier_id: '',
      order_date: format(new Date(), 'yyyy-MM-dd'),
      expected_delivery: '',
      notes: '',
      priority: 'normal',
      items: [],
    });
    setEditingPO(null);
  };

  const toggleRowExpansion = (poId: string) => {
    setExpandedRows((prev) =>
      prev.includes(poId) ? prev.filter((id) => id !== poId) : [...prev, poId]
    );
  };

  const handleSelectPO = (poId: string) => {
    setSelectedPOs(prev =>
      prev.includes(poId)
        ? prev.filter(id => id !== poId)
        : [...prev, poId]
    );
  };

  const handleSelectAll = () => {
    if (selectedPOs.length === filteredPOs.length) {
      setSelectedPOs([]);
    } else {
      setSelectedPOs(filteredPOs.map(po => po.id));
    }
  };

  const sortPOs = (pos) => {
    return [...pos].sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];

      if (sortBy === 'total_amount') {
        aValue = parseFloat(aValue) || 0;
        bValue = parseFloat(bValue) || 0;
      } else if (sortBy === 'order_date' || sortBy === 'created_at') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      } else if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
  };

  const filteredPOs = sortPOs(
    purchaseOrders
      .map((po) => ({
        ...po,
        supplier: suppliers.find((s) => s.id === po.supplier_id) || null,
        items: po.items || [],
      }))
      .filter((po) => {
        const matchesSearch =
          po.po_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (po.supplier?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
          (po.notes || '').toLowerCase().includes(searchQuery.toLowerCase());
        
        const matchesStatus = statusFilter === 'all' || po.status === statusFilter;
        const matchesSupplier = supplierFilter === 'all' || po.supplier_id === supplierFilter;
        
        let matchesDate = true;
        if (dateFilter !== 'all' && po.order_date && isValid(new Date(po.order_date))) {
          const orderDate = new Date(po.order_date);
          const now = new Date();
          
          switch (dateFilter) {
            case 'today':
              matchesDate = format(orderDate, 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd');
              break;
            case 'week':
              const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
              matchesDate = orderDate >= weekAgo;
              break;
            case 'month':
              matchesDate = orderDate >= startOfMonth(now) && orderDate <= endOfMonth(now);
              break;
          }
        }

        return matchesSearch && matchesStatus && matchesSupplier && matchesDate;
      })
  );

  const getPOStats = () => {
    const total = filteredPOs.reduce((sum, po) => sum + (po.total_amount || 0), 0);
    const pending = filteredPOs.filter(po => po.status === 'pending').length;
    const approved = filteredPOs.filter(po => po.status === 'approved').length;
    const received = filteredPOs.filter(po => po.status === 'received').length;
    const thisMonth = purchaseOrders.filter(po => {
      if (!po.order_date) return false;
      const orderDate = new Date(po.order_date);
      return orderDate >= startOfMonth(new Date()) && orderDate <= endOfMonth(new Date());
    }).reduce((sum, po) => sum + (po.total_amount || 0), 0);

    return { total, pending, approved, received, thisMonth };
  };

  const stats = getPOStats();

  const statusConfig = {
    draft: { color: 'bg-gray-100 text-gray-800 border-gray-200', icon: FileText, label: 'Draft' },
    pending: { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock, label: 'Pending Approval' },
    approved: { color: 'bg-blue-100 text-blue-800 border-blue-200', icon: CheckCircle, label: 'Approved' },
    ordered: { color: 'bg-purple-100 text-purple-800 border-purple-200', icon: Truck, label: 'Ordered' },
    received: { color: 'bg-green-100 text-green-800 border-green-200', icon: Package, label: 'Received' },
    cancelled: { color: 'bg-red-100 text-red-800 border-red-200', icon: X, label: 'Cancelled' },
    rejected: { color: 'bg-red-100 text-red-800 border-red-200', icon: ThumbsDown, label: 'Rejected' },
  };

  const priorityConfig = {
    low: { color: 'bg-gray-100 text-gray-700', label: 'Low Priority' },
    normal: { color: 'bg-blue-100 text-blue-700', label: 'Normal Priority' },
    high: { color: 'bg-orange-100 text-orange-700', label: 'High Priority' },
    urgent: { color: 'bg-red-100 text-red-700', label: 'Urgent' }
  };

  if (loading && purchaseOrders.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-500 mx-auto mb-6"></div>
          <p className="text-xl font-semibold text-gray-700">Loading Purchase Management...</p>
          <p className="text-gray-500 mt-2">Preparing your procurement data</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-red-800 mb-4">Failed to Load Purchase Orders</h2>
          <p className="text-red-600 mb-6">{error}</p>
          <button
            onClick={() => {
              fetchPurchaseOrders();
              fetchSuppliers();
              fetchInventoryItems();
            }}
            className="px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 flex items-center mx-auto"
          >
            <RefreshCw className="w-5 h-5 mr-2" />
            Retry Loading
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Enhanced Header with Stats */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 bg-white/5 backdrop-blur-sm"></div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-32 translate-x-32"></div>
        
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <div className="bg-white/20 backdrop-blur-sm p-4 rounded-2xl shadow-lg">
                <ShoppingCart className="w-10 h-10 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold mb-2">Purchase Management</h1>
                <p className="text-blue-100 text-lg">Professional procurement and supplier management</p>
              </div>
            </div>
            <button
              onClick={() => {
                setShowPOForm(true);
                resetPOForm();
              }}
              className="px-6 py-3 bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white rounded-xl font-bold transition-all transform hover:scale-105 flex items-center shadow-lg border border-white/30"
            >
              <Plus className="w-5 h-5 mr-2" />
              Create Purchase Order
            </button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-6 border border-white/30">
              <div className="flex items-center space-x-3">
                <div className="bg-white/20 p-3 rounded-xl">
                  <DollarSign className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">{formatCurrency(stats.total)}</div>
                  <div className="text-blue-100">Total Value</div>
                </div>
              </div>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-6 border border-white/30">
              <div className="flex items-center space-x-3">
                <div className="bg-white/20 p-3 rounded-xl">
                  <Clock className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">{stats.pending}</div>
                  <div className="text-blue-100">Pending</div>
                </div>
              </div>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-6 border border-white/30">
              <div className="flex items-center space-x-3">
                <div className="bg-white/20 p-3 rounded-xl">
                  <CheckCircle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">{stats.approved}</div>
                  <div className="text-blue-100">Approved</div>
                </div>
              </div>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-6 border border-white/30">
              <div className="flex items-center space-x-3">
                <div className="bg-white/20 p-3 rounded-xl">
                  <Package className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">{stats.received}</div>
                  <div className="text-blue-100">Received</div>
                </div>
              </div>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-6 border border-white/30">
              <div className="flex items-center space-x-3">
                <div className="bg-white/20 p-3 rounded-xl">
                  <Calendar className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">{formatCurrency(stats.thisMonth)}</div>
                  <div className="text-blue-100">This Month</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-2">
        <div className="flex space-x-2">
          {[
            { id: 'orders', label: 'Purchase Orders', icon: ShoppingCart },
            { id: 'analytics', label: 'Analytics', icon: BarChart3 },
            { id: 'templates', label: 'Quick Templates', icon: Star }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-bold transition-all transform hover:scale-105 ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'orders' && (
        <>
          {/* Advanced Filters */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Filters & Search</h3>
              <div className="flex items-center space-x-3">
                {selectedPOs.length > 0 && (
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-semibold text-gray-700">
                      {selectedPOs.length} selected
                    </span>
                    <button
                      onClick={() => setShowBulkActions(!showBulkActions)}
                      className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-all"
                    >
                      Bulk Actions
                    </button>
                  </div>
                )}
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('all');
                    setSupplierFilter('all');
                    setDateFilter('all');
                    setSortBy('created_at');
                    setSortOrder('desc');
                  }}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all"
                >
                  Clear Filters
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search purchase orders..."
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                {Object.entries(statusConfig).map(([status, config]) => (
                  <option key={status} value={status}>{config.label}</option>
                ))}
              </select>

              <select
                value={supplierFilter}
                onChange={(e) => setSupplierFilter(e.target.value)}
                className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Suppliers</option>
                {suppliers.filter(s => s.is_active).map(supplier => (
                  <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                ))}
              </select>

              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="created_at">Date Created</option>
                <option value="order_date">Order Date</option>
                <option value="total_amount">Total Amount</option>
                <option value="po_number">PO Number</option>
                <option value="status">Status</option>
              </select>

              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all flex items-center justify-center"
              >
                {sortOrder === 'asc' ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
              </button>
            </div>

            {/* Bulk Actions */}
            {showBulkActions && selectedPOs.length > 0 && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-blue-900">
                    {selectedPOs.length} purchase order{selectedPOs.length !== 1 ? 's' : ''} selected
                  </span>
                  <div className="flex space-x-3">
                    <button
                      onClick={() => {
                        // Bulk approve logic
                        toast.info('Bulk approve feature coming soon!');
                      }}
                      className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all flex items-center"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Approve All
                    </button>
                    <button
                      onClick={() => {
                        setSelectedPOs([]);
                        setShowBulkActions(false);
                      }}
                      className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Enhanced Purchase Orders Table */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            {filteredPOs.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-4 text-left">
                        <input
                          type="checkbox"
                          checked={selectedPOs.length === filteredPOs.length && filteredPOs.length > 0}
                          onChange={handleSelectAll}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">PO Details</th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">Supplier & Priority</th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">Amount & Items</th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">Dates & Status</th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredPOs.map((po) => {
                      const statusInfo = statusConfig[po.status] || statusConfig.draft;
                      const StatusIcon = statusInfo.icon;
                      const priorityInfo = priorityConfig[po.priority || 'normal'] || priorityConfig.normal;
                      const isExpanded = expandedRows.includes(po.id);
                      const isSelected = selectedPOs.includes(po.id);

                      return (
                        <React.Fragment key={po.id}>
                          <tr className={`hover:bg-gray-50 transition-colors ${isSelected ? 'bg-blue-50' : ''}`}>
                            <td className="px-6 py-4">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleSelectPO(po.id)}
                                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                              />
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center space-x-3">
                                <div className="bg-blue-100 p-2 rounded-lg">
                                  <FileText className="w-4 h-4 text-blue-600" />
                                </div>
                                <div>
                                  <p className="font-bold text-gray-900 text-lg">{po.po_number}</p>
                                  <p className="text-gray-600">
                                    Created by {po.created_by || 'Unknown'}
                                  </p>
                                  {po.notes && (
                                    <p className="text-sm text-gray-500 mt-1 line-clamp-1">{po.notes}</p>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="space-y-2">
                                <div className="flex items-center space-x-2">
                                  <Building className="w-4 h-4 text-gray-400" />
                                  <span className="font-semibold text-gray-900">{po.supplier?.name || 'N/A'}</span>
                                </div>
                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${priorityInfo.color}`}>
                                  {priorityInfo.label}
                                </span>
                                {po.supplier?.contact_person && (
                                  <p className="text-sm text-gray-500 flex items-center">
                                    <User className="w-3 h-3 mr-1" />
                                    {po.supplier.contact_person}
                                  </p>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="space-y-2">
                                <div className="text-2xl font-bold text-gray-900">
                                  {formatCurrency(po.total_amount || 0)}
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Package className="w-4 h-4 text-gray-400" />
                                  <span className="text-gray-600 font-medium">
                                    {po.items?.length || 0} item{(po.items?.length || 0) !== 1 ? 's' : ''}
                                  </span>
                                </div>
                                <div className="text-sm text-gray-500">
                                  Subtotal: {formatCurrency(po.subtotal || 0)}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="space-y-2">
                                <p className="font-semibold text-gray-900">
                                  {po.order_date ? format(new Date(po.order_date), 'MMM dd, yyyy') : 'N/A'}
                                </p>
                                {po.expected_delivery && (
                                  <p className="text-sm text-gray-500">
                                    Expected: {format(new Date(po.expected_delivery), 'MMM dd')}
                                  </p>
                                )}
                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold border ${statusInfo.color}`}>
                                  <StatusIcon className="w-3 h-3 mr-1" />
                                  {statusInfo.label}
                                </span>
                                {po.approved_by && po.approved_at && (
                                  <p className="text-xs text-green-600">
                                    Approved {format(new Date(po.approved_at), 'MMM dd')}
                                  </p>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex space-x-2">
                                {po.status === 'pending' && ['admin', 'manager'].includes(currentUser?.role || '') && (
                                  <>
                                    <button
                                      onClick={() => {
                                        setApprovingPO(po);
                                        setApprovalAction('approve');
                                        setApprovalReason('');
                                        setShowApprovalModal(true);
                                      }}
                                      className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-all"
                                      title="Approve Purchase Order"
                                    >
                                      <ThumbsUp className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => {
                                        setApprovingPO(po);
                                        setApprovalAction('reject');
                                        setApprovalReason('');
                                        setShowApprovalModal(true);
                                      }}
                                      className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-all"
                                      title="Reject Purchase Order"
                                    >
                                      <ThumbsDown className="w-4 h-4" />
                                    </button>
                                  </>
                                )}
                                <button
                                  onClick={() => toggleRowExpansion(po.id)}
                                  className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-all"
                                  title="View Details"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                {po.status === 'approved' && (
                                  <button
                                    onClick={() => {
                                      setReceivingPO(po);
                                      setReceivingItems(
                                        (po.items || []).map((item) => ({
                                          id: item.id,
                                          received_quantity: 0,
                                        }))
                                      );
                                      setShowReceiveModal(true);
                                    }}
                                    className="p-2 text-purple-600 hover:bg-purple-100 rounded-lg transition-all"
                                    title="Receive Items"
                                  >
                                    <Package className="w-4 h-4" />
                                  </button>
                                )}
                                {['draft', 'pending'].includes(po.status) && (
                                  <button
                                    onClick={() => {
                                      setEditingPO(po);
                                      setPOForm({
                                        supplier_id: po.supplier_id || '',
                                        order_date: po.order_date || format(new Date(), 'yyyy-MM-dd'),
                                        expected_delivery: po.expected_delivery || '',
                                        notes: po.notes || '',
                                        priority: po.priority || 'normal',
                                        items: (po.items || []).map((item) => ({
                                          id: item.id,
                                          menu_item_id: item.menu_item_id || '',
                                          item_name: item.item_name || '',
                                          description: item.description || '',
                                          quantity: item.quantity || 1,
                                          unit_price: item.unit_price || 0,
                                          total_price: item.total_price || 0,
                                          unit_of_measure: item.unit_of_measure || 'pcs',
                                        })),
                                      });
                                      setShowPOForm(true);
                                    }}
                                    className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-all"
                                    title="Edit Purchase Order"
                                  >
                                    <Edit3 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr>
                              <td colSpan={6} className="px-6 py-6 bg-gray-50">
                                <div className="space-y-6">
                                  {/* PO Information */}
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                      <h4 className="font-bold text-gray-900 text-lg">Order Information</h4>
                                      <div className="space-y-3 text-sm">
                                        <div className="flex justify-between">
                                          <span className="text-gray-600">Created:</span>
                                          <span className="font-semibold">
                                            {format(new Date(po.created_at), 'MMM dd, yyyy HH:mm')}
                                          </span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-gray-600">Expected Delivery:</span>
                                          <span className="font-semibold">
                                            {po.expected_delivery 
                                              ? format(new Date(po.expected_delivery), 'MMM dd, yyyy')
                                              : 'Not specified'
                                            }
                                          </span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-gray-600">Currency:</span>
                                          <span className="font-semibold">{po.currency || 'UGX'}</span>
                                        </div>
                                      </div>
                                    </div>
                                    
                                    {(po.approved_by || po.rejection_reason) && (
                                      <div className="space-y-4">
                                        <h4 className="font-bold text-gray-900 text-lg">Approval Details</h4>
                                        <div className="space-y-3 text-sm">
                                          {po.approved_by && (
                                            <div className="flex justify-between">
                                              <span className="text-gray-600">Approved By:</span>
                                              <span className="font-semibold">{po.approved_by}</span>
                                            </div>
                                          )}
                                          {po.approved_at && (
                                            <div className="flex justify-between">
                                              <span className="text-gray-600">Approved At:</span>
                                              <span className="font-semibold">
                                                {format(new Date(po.approved_at), 'MMM dd, yyyy HH:mm')}
                                              </span>
                                            </div>
                                          )}
                                          {po.rejection_reason && (
                                            <div>
                                              <span className="text-gray-600">Rejection Reason:</span>
                                              <p className="mt-1 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800">
                                                {po.rejection_reason}
                                              </p>
                                            </div>
                                          )}
                                          {po.approval_notes && (
                                            <div>
                                              <span className="text-gray-600">Approval Notes:</span>
                                              <p className="mt-1 p-3 bg-green-50 border border-green-200 rounded-lg text-green-800">
                                                {po.approval_notes}
                                              </p>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                  </div>

                                  {/* Items Table */}
                                  <div>
                                    <h4 className="font-bold text-gray-900 text-lg mb-4">Order Items</h4>
                                    {po.items && po.items.length > 0 ? (
                                      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                                        <table className="w-full">
                                          <thead className="bg-gray-100">
                                            <tr className="text-left text-sm font-bold text-gray-700">
                                              <th className="px-4 py-3">Item Name</th>
                                              <th className="px-4 py-3">Description</th>
                                              <th className="px-4 py-3">Quantity</th>
                                              <th className="px-4 py-3">Unit Price</th>
                                              <th className="px-4 py-3">Total</th>
                                              <th className="px-4 py-3">Unit</th>
                                              {po.status === 'received' && <th className="px-4 py-3">Received</th>}
                                            </tr>
                                          </thead>
                                          <tbody className="divide-y divide-gray-100">
                                            {po.items.map((item) => (
                                              <tr key={item.id} className="text-sm">
                                                <td className="px-4 py-3 font-semibold text-gray-900">{item.item_name || 'N/A'}</td>
                                                <td className="px-4 py-3 text-gray-600">{item.description || '-'}</td>
                                                <td className="px-4 py-3 font-bold">{item.quantity || 0}</td>
                                                <td className="px-4 py-3 font-semibold">{formatCurrency(item.unit_price || 0)}</td>
                                                <td className="px-4 py-3 font-bold text-green-600">{formatCurrency(item.total_price || 0)}</td>
                                                <td className="px-4 py-3">{item.unit_of_measure || 'N/A'}</td>
                                                {po.status === 'received' && (
                                                  <td className="px-4 py-3 font-bold text-blue-600">
                                                    {item.received_quantity || 0}
                                                  </td>
                                                )}
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    ) : (
                                      <p className="text-gray-500 text-center py-8">No items available</p>
                                    )}
                                  </div>

                                  {/* Financial Summary */}
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
                                      <div className="text-center">
                                        <div className="text-2xl font-bold text-blue-600">{formatCurrency(po.subtotal || 0)}</div>
                                        <div className="text-blue-700 font-semibold">Subtotal</div>
                                      </div>
                                    </div>
                                    <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-200">
                                      <div className="text-center">
                                        <div className="text-2xl font-bold text-yellow-600">{formatCurrency(po.tax_amount || 0)}</div>
                                        <div className="text-yellow-700 font-semibold">Tax</div>
                                      </div>
                                    </div>
                                    <div className="bg-green-50 p-4 rounded-xl border border-green-200">
                                      <div className="text-center">
                                        <div className="text-2xl font-bold text-green-600">{formatCurrency(po.total_amount || 0)}</div>
                                        <div className="text-green-700 font-semibold">Total</div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-16">
                <ShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-500 mb-2">
                  {purchaseOrders.length === 0 ? 'No purchase orders found' : 'No matching purchase orders'}
                </h3>
                <p className="text-gray-400 mb-6">
                  {purchaseOrders.length === 0 
                    ? 'Create your first purchase order to get started' 
                    : 'Try adjusting your search or filters'
                  }
                </p>
                <button
                  onClick={() => {
                    setShowPOForm(true);
                    resetPOForm();
                  }}
                  className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl hover:from-blue-600 hover:to-indigo-600 font-bold transition-all transform hover:scale-105 flex items-center mx-auto"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  {purchaseOrders.length === 0 ? 'Create First PO' : 'Create New PO'}
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
              <div className="flex items-center space-x-3 mb-4">
                <div className="bg-blue-100 p-3 rounded-xl">
                  <Target className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Average PO Value</h3>
                  <p className="text-gray-600">Per order</p>
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600 mb-2">
                  {formatCurrency(purchaseOrders.length > 0 ? stats.total / purchaseOrders.length : 0)}
                </div>
                <div className="text-sm text-gray-500">Average Amount</div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
              <div className="flex items-center space-x-3 mb-4">
                <div className="bg-green-100 p-3 rounded-xl">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Approval Rate</h3>
                  <p className="text-gray-600">Success percentage</p>
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600 mb-2">
                  {purchaseOrders.length > 0 ? Math.round((stats.approved / purchaseOrders.length) * 100) : 0}%
                </div>
                <div className="text-sm text-gray-500">Approved</div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
              <div className="flex items-center space-x-3 mb-4">
                <div className="bg-purple-100 p-3 rounded-xl">
                  <Package className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Delivery Rate</h3>
                  <p className="text-gray-600">Received orders</p>
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600 mb-2">
                  {purchaseOrders.length > 0 ? Math.round((stats.received / purchaseOrders.length) * 100) : 0}%
                </div>
                <div className="text-sm text-gray-500">Received</div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
              <div className="flex items-center space-x-3 mb-4">
                <div className="bg-orange-100 p-3 rounded-xl">
                  <Zap className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Active Suppliers</h3>
                  <p className="text-gray-600">With orders</p>
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-orange-600 mb-2">
                  {new Set(purchaseOrders.map(po => po.supplier_id)).size}
                </div>
                <div className="text-sm text-gray-500">Suppliers</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'templates' && (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
          <div className="text-center py-16">
            <Star className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-500 mb-2">Quick Templates</h3>
            <p className="text-gray-400 mb-6">Save frequently used purchase order templates</p>
            <button
              onClick={() => toast.info('Template feature coming soon!')}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl hover:from-blue-600 hover:to-indigo-600 font-bold transition-all transform hover:scale-105 flex items-center mx-auto"
            >
              <Plus className="w-5 h-5 mr-2" />
              Create Template
            </button>
          </div>
        </div>
      )}

      {/* Enhanced Purchase Order Form Modal */}
      {showPOForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-6xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold flex items-center">
                  <ShoppingCart className="w-6 h-6 mr-3" />
                  {editingPO ? 'Edit Purchase Order' : 'Create Purchase Order'}
                </h3>
                <button
                  onClick={() => {
                    setShowPOForm(false);
                    resetPOForm();
                  }}
                  className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-xl transition-all"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <form onSubmit={handleCreatePO} className="p-8 space-y-8">
              {/* Header Information */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-3">
                    <Building className="w-4 h-4 inline mr-2" />
                    Supplier <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={poForm.supplier_id}
                    onChange={(e) => setPOForm({ ...poForm, supplier_id: e.target.value })}
                    className="w-full px-4 py-4 border-2 border-gray-300 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg font-semibold"
                    required
                  >
                    <option value="">Select Supplier</option>
                    {suppliers.filter(s => s.is_active).map((supplier) => (
                      <option key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-3">
                    <Calendar className="w-4 h-4 inline mr-2" />
                    Order Date
                  </label>
                  <input
                    type="date"
                    value={poForm.order_date}
                    onChange={(e) => setPOForm({ ...poForm, order_date: e.target.value })}
                    className="w-full px-4 py-4 border-2 border-gray-300 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-3">
                    <Truck className="w-4 h-4 inline mr-2" />
                    Expected Delivery
                  </label>
                  <input
                    type="date"
                    value={poForm.expected_delivery}
                    onChange={(e) => setPOForm({ ...poForm, expected_delivery: e.target.value })}
                    className="w-full px-4 py-4 border-2 border-gray-300 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-3">
                    <AlertCircle className="w-4 h-4 inline mr-2" />
                    Priority
                  </label>
                  <select
                    value={poForm.priority}
                    onChange={(e) => setPOForm({ ...poForm, priority: e.target.value })}
                    className="w-full px-4 py-4 border-2 border-gray-300 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg font-semibold"
                  >
                    {Object.entries(priorityConfig).map(([priority, config]) => (
                      <option key={priority} value={priority}>{config.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Items Section */}
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h4 className="text-xl font-bold text-gray-900 flex items-center">
                    <Package className="w-6 h-6 mr-2" />
                    Order Items
                  </h4>
                  <button
                    type="button"
                    onClick={addItemToPO}
                    className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl hover:from-green-600 hover:to-emerald-600 transition-all transform hover:scale-105 flex items-center font-bold"
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    Add Item
                  </button>
                </div>

                <div className="space-y-4">
                  {poForm.items.map((item, index) => (
                    <div key={item.id} className="p-6 border-2 border-gray-200 rounded-2xl bg-gradient-to-r from-gray-50 to-white hover:border-blue-300 transition-all">
                      <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
                        <div className="md:col-span-2">
                          <label className="block text-sm font-bold text-gray-700 mb-2">
                            Item Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={item.item_name}
                            onChange={(e) => updatePOItem(index, 'item_name', e.target.value)}
                            className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent font-semibold"
                            placeholder="Enter item name"
                            required
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-bold text-gray-700 mb-2">Description</label>
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) => updatePOItem(index, 'description', e.target.value)}
                            className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Item description"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-gray-700 mb-2">
                            Quantity <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) =>
                              updatePOItem(index, 'quantity', parseInt(e.target.value) || 1)
                            }
                            className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent font-bold text-center"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-gray-700 mb-2">
                            Unit Price <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.unit_price}
                            onChange={(e) =>
                              updatePOItem(index, 'unit_price', parseFloat(e.target.value) || 0)
                            }
                            className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent font-bold text-center"
                            required
                          />
                        </div>
                        <div className="flex flex-col justify-between">
                          <label className="block text-sm font-bold text-gray-700 mb-2">Total</label>
                          <div className="px-4 py-3 bg-green-50 border-2 border-green-200 rounded-xl text-center">
                            <span className="font-bold text-green-600 text-lg">
                              {formatCurrency(item.total_price)}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-end justify-center">
                          <button
                            type="button"
                            onClick={() => removePOItem(index)}
                            className="p-3 text-red-600 hover:bg-red-100 rounded-xl transition-all transform hover:scale-110"
                            title="Remove Item"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {poForm.items.length === 0 && (
                  <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-2xl bg-gray-50">
                    <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h4 className="text-lg font-bold text-gray-500 mb-2">No items added yet</h4>
                    <p className="text-gray-400 mb-6">Add items to create your purchase order</p>
                    <button
                      type="button"
                      onClick={addItemToPO}
                      className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl hover:from-blue-600 hover:to-indigo-600 transition-all transform hover:scale-105 flex items-center mx-auto font-bold"
                    >
                      <Plus className="w-5 h-5 mr-2" />
                      Add First Item
                    </button>
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-3">
                  <MessageSquare className="w-4 h-4 inline mr-2" />
                  Notes & Special Instructions
                </label>
                <textarea
                  value={poForm.notes}
                  onChange={(e) => setPOForm({ ...poForm, notes: e.target.value })}
                  className="w-full px-4 py-4 border-2 border-gray-300 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-lg"
                  rows={4}
                  placeholder="Add any special instructions, delivery requirements, or notes for the supplier..."
                />
              </div>

              {/* Order Summary */}
              {poForm.items.length > 0 && (
                <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl">
                  <h4 className="font-bold text-blue-900 mb-4 text-xl">Order Summary</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-blue-600 mb-2">
                        {formatCurrency(poForm.items.reduce((sum, item) => sum + item.total_price, 0))}
                      </div>
                      <div className="text-blue-700 font-semibold">Subtotal</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-purple-600 mb-2">
                        {formatCurrency(
                          poForm.items.reduce((sum, item) => sum + item.total_price, 0) *
                            ((businessSettings?.tax_rate || 0) / 100)
                        )}
                      </div>
                      <div className="text-purple-700 font-semibold">Tax ({businessSettings?.tax_rate || 0}%)</div>
                    </div>
                    <div className="text-center">
                      <div className="text-4xl font-bold text-green-600 mb-2">
                        {formatCurrency(
                          poForm.items.reduce((sum, item) => sum + item.total_price, 0) *
                            (1 + (businessSettings?.tax_rate || 0) / 100)
                        )}
                      </div>
                      <div className="text-green-700 font-semibold">Total Amount</div>
                    </div>
                  </div>
                  <div className="mt-4 text-center">
                    <p className="text-blue-700 font-semibold">
                      {poForm.items.length} item{poForm.items.length !== 1 ? 's' : ''} • 
                      Total Quantity: {poForm.items.reduce((sum, item) => sum + item.quantity, 0)}
                    </p>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex space-x-4 pt-8 border-t-2 border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowPOForm(false);
                    resetPOForm();
                  }}
                  className="flex-1 px-8 py-4 border-2 border-gray-300 rounded-2xl text-gray-700 hover:bg-gray-50 font-bold text-lg transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || poForm.items.length === 0}
                  className="flex-1 px-8 py-4 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-2xl hover:from-blue-600 hover:to-indigo-600 disabled:opacity-50 font-bold text-lg transition-all transform hover:scale-105 flex items-center justify-center shadow-lg"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                  ) : (
                    <Save className="w-6 h-6 mr-3" />
                  )}
                  {loading ? 'Saving...' : editingPO ? 'Update Purchase Order' : 'Create Purchase Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Enhanced Receive Items Modal */}
      {showReceiveModal && receivingPO && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6 bg-gradient-to-r from-green-600 to-emerald-600 text-white">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold flex items-center">
                  <Package className="w-6 h-6 mr-3" />
                  Receive Items - {receivingPO.po_number}
                </h3>
                <button
                  onClick={() => {
                    setShowReceiveModal(false);
                    setReceivingPO(null);
                    setReceivingItems([]);
                  }}
                  className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-xl transition-all"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-8 space-y-6">
              {/* PO Summary */}
              <div className="p-6 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-green-600">{receivingPO.po_number}</div>
                    <div className="text-green-700 font-semibold">PO Number</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-600">{receivingPO.supplier?.name}</div>
                    <div className="text-green-700 font-semibold">Supplier</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-600">{formatCurrency(receivingPO.total_amount)}</div>
                    <div className="text-green-700 font-semibold">Total Value</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-600">{receivingPO.items?.length || 0}</div>
                    <div className="text-green-700 font-semibold">Items</div>
                  </div>
                </div>
              </div>

              {/* Receiving Items */}
              <div className="space-y-4">
                <h4 className="text-lg font-bold text-gray-900">Items to Receive</h4>
                {(receivingPO.items || []).map((item, index) => (
                  <div key={item.id} className="p-6 border-2 border-gray-200 rounded-2xl bg-white hover:border-green-300 transition-all">
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                      <div className="md:col-span-2">
                        <h5 className="font-bold text-gray-900 text-lg">{item.item_name || 'N/A'}</h5>
                        <p className="text-gray-600">{item.description || 'No description'}</p>
                        <div className="mt-2 flex items-center space-x-4 text-sm">
                          <span className="text-gray-500">Unit: {item.unit_of_measure || 'N/A'}</span>
                          <span className="text-gray-500">Price: {formatCurrency(item.unit_price || 0)}</span>
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">{item.quantity || 0}</div>
                        <div className="text-blue-700 font-semibold">Ordered</div>
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2 text-center">
                          Received Quantity
                        </label>
                        <input
                          type="number"
                          min="0"
                          max={item.quantity || 0}
                          value={receivingItems[index]?.received_quantity || 0}
                          onChange={(e) => {
                            const newItems = [...receivingItems];
                            newItems[index] = {
                              ...newItems[index],
                              id: item.id,
                              received_quantity: parseInt(e.target.value) || 0,
                            };
                            setReceivingItems(newItems);
                          }}
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent font-bold text-center text-lg"
                        />
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {formatCurrency((receivingItems[index]?.received_quantity || 0) * (item.unit_price || 0))}
                        </div>
                        <div className="text-green-700 font-semibold">Received Value</div>
                      </div>
                    </div>
                  </div>
                ))}
                
                {(!receivingPO.items || receivingPO.items.length === 0) && (
                  <div className="text-center py-8">
                    <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 font-semibold">No items available for receiving</p>
                  </div>
                )}
              </div>

              {/* Receiving Summary */}
              {receivingItems.some(item => item.received_quantity > 0) && (
                <div className="p-6 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl">
                  <h4 className="font-bold text-green-900 mb-4 text-lg">Receiving Summary</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-green-600">
                        {receivingItems.reduce((sum, item) => sum + (item.received_quantity || 0), 0)}
                      </div>
                      <div className="text-green-700 font-semibold">Total Items Received</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-600">
                        {formatCurrency(
                          receivingItems.reduce((sum, item, index) => {
                            const poItem = receivingPO.items[index];
                            return sum + ((item.received_quantity || 0) * (poItem?.unit_price || 0));
                          }, 0)
                        )}
                      </div>
                      <div className="text-green-700 font-semibold">Received Value</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-600">
                        {Math.round(
                          (receivingItems.reduce((sum, item) => sum + (item.received_quantity || 0), 0) /
                          (receivingPO.items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 1)) * 100
                        )}%
                      </div>
                      <div className="text-green-700 font-semibold">Completion Rate</div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex space-x-4 pt-8 border-t-2 border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowReceiveModal(false);
                    setReceivingPO(null);
                    setReceivingItems([]);
                  }}
                  className="flex-1 px-8 py-4 border-2 border-gray-300 rounded-2xl text-gray-700 hover:bg-gray-50 font-bold text-lg transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReceivePO}
                  disabled={loading || !receivingItems.some(item => item.received_quantity > 0)}
                  className="flex-1 px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-2xl hover:from-green-600 hover:to-emerald-600 disabled:opacity-50 font-bold text-lg transition-all transform hover:scale-105 flex items-center justify-center shadow-lg"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                  ) : (
                    <CheckCircle className="w-6 h-6 mr-3" />
                  )}
                  {loading ? 'Processing...' : 'Receive Items'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Approval Modal */}
      {showApprovalModal && approvingPO && (
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
                  {approvalAction === 'approve' ? 'Approve Purchase Order' : 'Reject Purchase Order'}
                </h3>
                <button
                  onClick={() => {
                    setShowApprovalModal(false);
                    setApprovingPO(null);
                    setApprovalReason('');
                  }}
                  className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-xl transition-all"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-8 space-y-6">
              {/* PO Details */}
              <div className="p-6 bg-gray-50 rounded-2xl border border-gray-200">
                <h4 className="font-bold text-gray-900 mb-4 text-lg">Purchase Order Details</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">PO Number:</span>
                    <p className="font-bold text-lg">{approvingPO.po_number}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Total Amount:</span>
                    <p className="font-bold text-xl text-green-600">{formatCurrency(approvingPO.total_amount)}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Supplier:</span>
                    <p className="font-semibold">{approvingPO.supplier?.name || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Items:</span>
                    <p className="font-semibold">{approvingPO.items?.length || 0} items</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Order Date:</span>
                    <p className="font-semibold">
                      {approvingPO.order_date 
                        ? format(new Date(approvingPO.order_date), 'MMM dd, yyyy')
                        : 'N/A'
                      }
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-600">Expected Delivery:</span>
                    <p className="font-semibold">
                      {approvingPO.expected_delivery 
                        ? format(new Date(approvingPO.expected_delivery), 'MMM dd, yyyy')
                        : 'Not specified'
                      }
                    </p>
                  </div>
                </div>
              </div>

              {/* Approval Reason */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-3">
                  <MessageSquare className="w-4 h-4 inline mr-2" />
                  {approvalAction === 'approve' ? 'Approval Notes (Optional)' : 'Rejection Reason *'}
                </label>
                <textarea
                  value={approvalReason}
                  onChange={(e) => setApprovalReason(e.target.value)}
                  className="w-full px-4 py-4 border-2 border-gray-300 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none text-lg"
                  rows={4}
                  placeholder={
                    approvalAction === 'approve' 
                      ? 'Optional notes for approval...' 
                      : 'Please provide a detailed reason for rejection...'
                  }
                  required={approvalAction === 'reject'}
                />
              </div>

              <div className="flex space-x-4 pt-6 border-t-2 border-gray-200">
                <button
                  onClick={() => {
                    setShowApprovalModal(false);
                    setApprovingPO(null);
                    setApprovalReason('');
                  }}
                  className="flex-1 px-6 py-4 border-2 border-gray-300 rounded-2xl text-gray-700 hover:bg-gray-50 font-bold text-lg transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApprovalSubmit}
                  disabled={loading || (approvalAction === 'reject' && !approvalReason.trim())}
                  className={`flex-1 px-6 py-4 text-white rounded-2xl font-bold text-lg transition-all transform hover:scale-105 flex items-center justify-center shadow-lg ${
                    approvalAction === 'approve'
                      ? 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600'
                      : 'bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600'
                  } disabled:opacity-50`}
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                  ) : approvalAction === 'approve' ? (
                    <ThumbsUp className="w-6 h-6 mr-3" />
                  ) : (
                    <ThumbsDown className="w-6 h-6 mr-3" />
                  )}
                  {loading ? 'Processing...' : approvalAction === 'approve' ? 'Approve Purchase Order' : 'Reject Purchase Order'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}