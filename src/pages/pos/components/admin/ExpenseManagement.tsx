import React, { useState, useEffect } from 'react';
import { useERPStore } from '../../../../store/erpStore';
import { usePOSStore } from '../../../../store/posStore';
import { 
  DollarSign, 
  Plus, 
  Edit3, 
  Trash2, 
  Search, 
  Filter,
  Calendar,
  Receipt,
  CheckCircle,
  Clock,
  X,
  Save,
  Upload,
  Tag,
  User,
  Building,
  AlertCircle,
  Eye,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  FileText,
  Download,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart,
  Target,
  Zap
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format, isValid, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns';

export default function ExpenseManagement() {
  const { 
    expenses, 
    expenseCategories, 
    suppliers, 
    loading,
    error,
    fetchExpenses, 
    fetchExpenseCategories, 
    fetchSuppliers,
    createExpense, 
    updateExpense, 
    deleteExpense,
    approveExpense,
    rejectExpense,
    createExpenseCategory
  } = useERPStore();
  const { currentUser, businessSettings } = usePOSStore();

  const [activeTab, setActiveTab] = useState<'expenses' | 'categories' | 'analytics'>('expenses');
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedExpenses, setSelectedExpenses] = useState<string[]>([]);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [isUploading, setIsUploading] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvingExpense, setApprovingExpense] = useState(null);
  const [approvalReason, setApprovalReason] = useState('');
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject'>('approve');
  const [expandedExpenses, setExpandedExpenses] = useState<string[]>([]);

  const [expenseForm, setExpenseForm] = useState({
    category_id: '',
    supplier_id: '',
    description: '',
    amount: '',
    expense_date: format(new Date(), 'yyyy-MM-dd'),
    payment_method: 'cash',
    payment_reference: '',
    receipt_url: '',
    status: 'pending'
  });

  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: '',
    color: '#3B82F6'
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        await Promise.all([
          fetchExpenses(),
          fetchExpenseCategories(),
          fetchSuppliers()
        ]);
      } catch (error) {
        console.error('Failed to load ERP data:', error);
        toast.error('Failed to load initial data');
      }
    };
    loadData();
  }, [fetchExpenses, fetchExpenseCategories, fetchSuppliers]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: businessSettings?.currency || 'UGX',
      minimumFractionDigits: 0,
    }).format(value || 0);
  };

  const validateExpenseForm = () => {
    const errors = {};
    if (!expenseForm.category_id) errors.category_id = 'Category is required';
    if (!expenseForm.description.trim()) errors.description = 'Description is required';
    if (!expenseForm.amount || isNaN(parseFloat(expenseForm.amount)) || parseFloat(expenseForm.amount) <= 0) {
      errors.amount = 'Valid amount is required';
    }
    if (!expenseForm.expense_date || !isValid(new Date(expenseForm.expense_date))) {
      errors.expense_date = 'Valid date is required';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateCategoryForm = () => {
    const errors = {};
    if (!categoryForm.name.trim()) errors.name = 'Category name is required';
    if (categoryForm.name.length > 50) errors.name = 'Name must be less than 50 characters';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    setIsUploading(true);
    try {
      // Convert to base64 for storage
      const reader = new FileReader();
      reader.onload = (e) => {
        setExpenseForm({ ...expenseForm, receipt_url: e.target.result as string });
        toast.success('Receipt uploaded successfully! 📎');
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast.error('Failed to upload receipt');
    } finally {
      setIsUploading(false);
    }
  };

  const handleCreateExpense = async (e) => {
    e.preventDefault();
    if (!validateExpenseForm()) {
      toast.error('Please fix form errors');
      return;
    }

    try {
      const expenseData = {
        category_id: expenseForm.category_id,
        supplier_id: expenseForm.supplier_id || null,
        description: expenseForm.description.trim(),
        amount: parseFloat(expenseForm.amount),
        expense_date: expenseForm.expense_date,
        payment_method: expenseForm.payment_method,
        payment_reference: expenseForm.payment_reference || null,
        receipt_url: expenseForm.receipt_url || null,
        status: expenseForm.status,
        created_by: currentUser?.id || '',
        currency: businessSettings?.currency || 'UGX',
        approved_by: null,
        approved_at: null
      };

      if (editingExpense) {
        await updateExpense(editingExpense.id, expenseData);
        toast.success('Expense updated successfully! ✨');
      } else {
        await createExpense(expenseData);
        toast.success('Expense created successfully! 🎉');
      }
      setShowExpenseForm(false);
      setEditingExpense(null);
      resetExpenseForm();
    } catch (error) {
      // Error handled in store
    }
  };

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!validateCategoryForm()) {
      toast.error('Please fix form errors');
      return;
    }

    try {
      await createExpenseCategory({
        name: categoryForm.name.trim(),
        description: categoryForm.description.trim() || null,
        color: categoryForm.color,
        is_active: true
      });
      toast.success('Category created successfully! 🏷️');
      setShowCategoryForm(false);
      resetCategoryForm();
    } catch (error) {
      // Error handled in store
    }
  };

  const handleApprovalSubmit = async () => {
    if (!approvingExpense || !currentUser?.id) {
      toast.error('Invalid approval request');
      return;
    }

    if (approvalAction === 'reject' && !approvalReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    try {
      if (approvalAction === 'approve') {
        await approveExpense(approvingExpense.id, currentUser.id);
        toast.success('Expense approved successfully! ✅');
      } else {
        await rejectExpense(approvingExpense.id, currentUser.id, approvalReason);
        toast.success('Expense rejected ❌');
      }
      setShowApprovalModal(false);
      setApprovingExpense(null);
      setApprovalReason('');
    } catch (error) {
      // Error handled in store
    }
  };

  const handleBulkApprove = async () => {
    if (selectedExpenses.length === 0) {
      toast.error('No expenses selected');
      return;
    }

    if (!currentUser?.id) {
      toast.error('User not authenticated');
      return;
    }

    try {
      await Promise.all(
        selectedExpenses.map(expenseId => approveExpense(expenseId, currentUser.id))
      );
      toast.success(`${selectedExpenses.length} expenses approved! ✅`);
      setSelectedExpenses([]);
      setShowBulkActions(false);
    } catch (error) {
      toast.error('Failed to approve some expenses');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedExpenses.length === 0) {
      toast.error('No expenses selected');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete ${selectedExpenses.length} expenses?`)) {
      return;
    }

    try {
      await Promise.all(
        selectedExpenses.map(expenseId => deleteExpense(expenseId))
      );
      toast.success(`${selectedExpenses.length} expenses deleted! 🗑️`);
      setSelectedExpenses([]);
      setShowBulkActions(false);
    } catch (error) {
      toast.error('Failed to delete some expenses');
    }
  };

  const resetExpenseForm = () => {
    setExpenseForm({
      category_id: '',
      supplier_id: '',
      description: '',
      amount: '',
      expense_date: format(new Date(), 'yyyy-MM-dd'),
      payment_method: 'cash',
      payment_reference: '',
      receipt_url: '',
      status: 'pending'
    });
    setFormErrors({});
    setEditingExpense(null);
  };

  const resetCategoryForm = () => {
    setCategoryForm({
      name: '',
      description: '',
      color: '#3B82F6'
    });
    setFormErrors({});
  };

  const handleOpenApprovalModal = (expense, action: 'approve' | 'reject') => {
    setApprovingExpense(expense);
    setApprovalAction(action);
    setApprovalReason('');
    setShowApprovalModal(true);
  };

  const toggleExpenseExpansion = (expenseId: string) => {
    setExpandedExpenses(prev =>
      prev.includes(expenseId) 
        ? prev.filter(id => id !== expenseId) 
        : [...prev, expenseId]
    );
  };

  const handleSelectExpense = (expenseId: string) => {
    setSelectedExpenses(prev =>
      prev.includes(expenseId)
        ? prev.filter(id => id !== expenseId)
        : [...prev, expenseId]
    );
  };

  const handleSelectAll = () => {
    if (selectedExpenses.length === filteredExpenses.length) {
      setSelectedExpenses([]);
    } else {
      setSelectedExpenses(filteredExpenses.map(expense => expense.id));
    }
  };

  const sortExpenses = (expenses) => {
    return [...expenses].sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];

      if (sortBy === 'amount') {
        aValue = parseFloat(aValue) || 0;
        bValue = parseFloat(bValue) || 0;
      } else if (sortBy === 'expense_date' || sortBy === 'created_at') {
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

  const filteredExpenses = sortExpenses(
    expenses.filter(expense => {
      if (!expense || !expense.description || !expense.expense_number) {
        return false;
      }
      
      const matchesSearch = 
        expense.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        expense.expense_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (expense.supplier?.name || '').toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || expense.status === statusFilter;
      const matchesCategory = categoryFilter === 'all' || expense.category_id === categoryFilter;
      
      let matchesDate = true;
      if (dateFilter !== 'all' && expense.expense_date && isValid(new Date(expense.expense_date))) {
        const expenseDate = new Date(expense.expense_date);
        const now = new Date();
        
        switch (dateFilter) {
          case 'today':
            matchesDate = format(expenseDate, 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd');
            break;
          case 'week':
            matchesDate = expenseDate >= startOfWeek(now) && expenseDate <= endOfWeek(now);
            break;
          case 'month':
            matchesDate = expenseDate >= startOfMonth(now) && expenseDate <= endOfMonth(now);
            break;
        }
      }

      return matchesSearch && matchesStatus && matchesCategory && matchesDate;
    })
  );

  const getExpenseStats = () => {
    const total = filteredExpenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);
    const pending = filteredExpenses.filter(e => e.status === 'pending').length;
    const approved = filteredExpenses.filter(e => e.status === 'approved').length;
    const thisMonth = expenses.filter(e => {
      if (!e.expense_date) return false;
      const expenseDate = new Date(e.expense_date);
      return expenseDate >= startOfMonth(new Date()) && expenseDate <= endOfMonth(new Date());
    }).reduce((sum, expense) => sum + (expense.amount || 0), 0);

    return { total, pending, approved, thisMonth };
  };

  const stats = getExpenseStats();

  const statusConfig = {
    pending: { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock },
    approved: { color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle },
    rejected: { color: 'bg-red-100 text-red-800 border-red-200', icon: X }
  };

  const paymentMethodConfig = {
    cash: { label: 'Cash', icon: '💵', color: 'bg-green-50 text-green-700' },
    card: { label: 'Card', icon: '💳', color: 'bg-blue-50 text-blue-700' },
    bank_transfer: { label: 'Bank Transfer', icon: '🏦', color: 'bg-purple-50 text-purple-700' },
    mobile_money: { label: 'Mobile Money', icon: '📱', color: 'bg-orange-50 text-orange-700' },
    check: { label: 'Check', icon: '📝', color: 'bg-gray-50 text-gray-700' }
  };

  if (loading && expenses.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-500 mx-auto mb-6"></div>
          <p className="text-xl font-semibold text-gray-700">Loading Expense Management...</p>
          <p className="text-gray-500 mt-2">Preparing your financial data</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-red-800 mb-4">Failed to Load Expenses</h2>
          <p className="text-red-600 mb-6">{error}</p>
          <button
            onClick={() => {
              fetchExpenses();
              fetchExpenseCategories();
              fetchSuppliers();
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
      <div className="bg-gradient-to-r from-red-600 via-pink-600 to-purple-600 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 bg-white/5 backdrop-blur-sm"></div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-32 translate-x-32"></div>
        
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <div className="bg-white/20 backdrop-blur-sm p-4 rounded-2xl shadow-lg">
                <DollarSign className="w-10 h-10 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold mb-2">Expense Management</h1>
                <p className="text-red-100 text-lg">Professional expense tracking and approval workflow</p>
              </div>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowCategoryForm(true)}
                className="px-6 py-3 bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white rounded-xl font-bold transition-all transform hover:scale-105 flex items-center shadow-lg border border-white/30"
              >
                <Tag className="w-5 h-5 mr-2" />
                Add Category
              </button>
              <button
                onClick={() => setShowExpenseForm(true)}
                className="px-6 py-3 bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white rounded-xl font-bold transition-all transform hover:scale-105 flex items-center shadow-lg border border-white/30"
              >
                <Plus className="w-5 h-5 mr-2" />
                Add Expense
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-6 border border-white/30">
              <div className="flex items-center space-x-3">
                <div className="bg-white/20 p-3 rounded-xl">
                  <DollarSign className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">{formatCurrency(stats.total)}</div>
                  <div className="text-red-100">Total Expenses</div>
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
                  <div className="text-red-100">This Month</div>
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
                  <div className="text-red-100">Pending Approval</div>
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
                  <div className="text-red-100">Approved</div>
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
            { id: 'expenses', label: 'Expenses', icon: DollarSign },
            { id: 'categories', label: 'Categories', icon: Tag },
            { id: 'analytics', label: 'Analytics', icon: BarChart3 }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-bold transition-all transform hover:scale-105 ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
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
      {activeTab === 'expenses' && (
        <>
          {/* Advanced Filters */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Filters & Search</h3>
              <div className="flex items-center space-x-3">
                {selectedExpenses.length > 0 && (
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-semibold text-gray-700">
                      {selectedExpenses.length} selected
                    </span>
                    <button
                      onClick={() => setShowBulkActions(!showBulkActions)}
                      className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-all"
                    >
                      Bulk Actions
                    </button>
                  </div>
                )}
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('all');
                    setCategoryFilter('all');
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
                  placeholder="Search expenses..."
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="all">All Categories</option>
                {expenseCategories.map(category => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>

              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="created_at">Date Created</option>
                <option value="expense_date">Expense Date</option>
                <option value="amount">Amount</option>
                <option value="description">Description</option>
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
            {showBulkActions && selectedExpenses.length > 0 && (
              <div className="mt-4 p-4 bg-purple-50 border border-purple-200 rounded-xl">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-purple-900">
                    {selectedExpenses.length} expense{selectedExpenses.length !== 1 ? 's' : ''} selected
                  </span>
                  <div className="flex space-x-3">
                    <button
                      onClick={handleBulkApprove}
                      className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all flex items-center"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Approve All
                    </button>
                    <button
                      onClick={handleBulkDelete}
                      className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all flex items-center"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete All
                    </button>
                    <button
                      onClick={() => {
                        setSelectedExpenses([]);
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

          {/* Enhanced Expenses Table */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            {filteredExpenses.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-4 text-left">
                        <input
                          type="checkbox"
                          checked={selectedExpenses.length === filteredExpenses.length && filteredExpenses.length > 0}
                          onChange={handleSelectAll}
                          className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                        />
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">Expense Details</th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">Category & Supplier</th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">Amount & Payment</th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">Date & Status</th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredExpenses.map(expense => {
                      const statusInfo = statusConfig[expense.status] || statusConfig.pending;
                      const StatusIcon = statusInfo.icon;
                      const category = expenseCategories.find(cat => cat.id === expense.category_id);
                      const supplier = suppliers.find(sup => sup.id === expense.supplier_id);
                      const paymentMethod = paymentMethodConfig[expense.payment_method] || paymentMethodConfig.cash;
                      const isExpanded = expandedExpenses.includes(expense.id);
                      const isSelected = selectedExpenses.includes(expense.id);
                      
                      return (
                        <React.Fragment key={expense.id}>
                          <tr className={`hover:bg-gray-50 transition-colors ${isSelected ? 'bg-purple-50' : ''}`}>
                            <td className="px-6 py-4">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleSelectExpense(expense.id)}
                                className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                              />
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center space-x-3">
                                <div className="bg-red-100 p-2 rounded-lg">
                                  <Receipt className="w-4 h-4 text-red-600" />
                                </div>
                                <div>
                                  <p className="font-bold text-gray-900 text-lg">{expense.expense_number}</p>
                                  <p className="text-gray-700 font-medium">{expense.description}</p>
                                  {expense.receipt_url && (
                                    <a
                                      href={expense.receipt_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-sm text-blue-500 hover:underline flex items-center mt-1"
                                    >
                                      <FileText className="w-3 h-3 mr-1" />
                                      View Receipt
                                    </a>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="space-y-2">
                                {category && (
                                  <span 
                                    className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold text-white"
                                    style={{ backgroundColor: category.color }}
                                  >
                                    <Tag className="w-3 h-3 mr-1" />
                                    {category.name}
                                  </span>
                                )}
                                {supplier && (
                                  <div className="flex items-center space-x-2">
                                    <Building className="w-4 h-4 text-gray-400" />
                                    <span className="text-gray-700 font-medium">{supplier.name}</span>
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="space-y-2">
                                <div className="text-2xl font-bold text-gray-900">
                                  {formatCurrency(expense.amount)}
                                </div>
                                <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${paymentMethod.color}`}>
                                  <span className="mr-1">{paymentMethod.icon}</span>
                                  {paymentMethod.label}
                                </div>
                                {expense.payment_reference && (
                                  <p className="text-xs text-gray-500 font-mono">
                                    Ref: {expense.payment_reference}
                                  </p>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="space-y-2">
                                <p className="font-semibold text-gray-900">
                                  {expense.expense_date && isValid(new Date(expense.expense_date))
                                    ? format(new Date(expense.expense_date), 'MMM dd, yyyy')
                                    : 'Invalid Date'
                                  }
                                </p>
                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold border ${statusInfo.color}`}>
                                  <StatusIcon className="w-3 h-3 mr-1" />
                                  {expense.status.charAt(0).toUpperCase() + expense.status.slice(1)}
                                </span>
                                {expense.approved_by && expense.approved_at && (
                                  <p className="text-xs text-green-600">
                                    Approved {format(new Date(expense.approved_at), 'MMM dd')}
                                  </p>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex space-x-2">
                                {expense.status === 'pending' && ['admin', 'manager'].includes(currentUser?.role || '') && (
                                  <>
                                    <button
                                      onClick={() => handleOpenApprovalModal(expense, 'approve')}
                                      className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-all"
                                      title="Approve Expense"
                                    >
                                      <ThumbsUp className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => handleOpenApprovalModal(expense, 'reject')}
                                      className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-all"
                                      title="Reject Expense"
                                    >
                                      <ThumbsDown className="w-4 h-4" />
                                    </button>
                                  </>
                                )}
                                <button
                                  onClick={() => toggleExpenseExpansion(expense.id)}
                                  className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-all"
                                  title="View Details"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                {expense.status === 'pending' && (
                                  <button
                                    onClick={() => {
                                      setEditingExpense(expense);
                                      setExpenseForm({
                                        category_id: expense.category_id || '',
                                        supplier_id: expense.supplier_id || '',
                                        description: expense.description || '',
                                        amount: expense.amount ? expense.amount.toString() : '',
                                        expense_date: expense.expense_date && isValid(new Date(expense.expense_date))
                                          ? format(new Date(expense.expense_date), 'yyyy-MM-dd')
                                          : format(new Date(), 'yyyy-MM-dd'),
                                        payment_method: expense.payment_method || 'cash',
                                        payment_reference: expense.payment_reference || '',
                                        receipt_url: expense.receipt_url || '',
                                        status: expense.status || 'pending'
                                      });
                                      setShowExpenseForm(true);
                                    }}
                                    className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-all"
                                    title="Edit Expense"
                                  >
                                    <Edit3 className="w-4 h-4" />
                                  </button>
                                )}
                                <button
                                  onClick={() => handleDeleteExpense(expense.id)}
                                  className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-all"
                                  title="Delete Expense"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr>
                              <td colSpan={6} className="px-6 py-4 bg-gray-50">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                  <div className="space-y-3">
                                    <h4 className="font-bold text-gray-900">Expense Information</h4>
                                    <div className="space-y-2 text-sm">
                                      <div className="flex justify-between">
                                        <span className="text-gray-600">Created By:</span>
                                        <span className="font-semibold">{expense.created_by || 'Unknown'}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-gray-600">Created At:</span>
                                        <span className="font-semibold">
                                          {format(new Date(expense.created_at), 'MMM dd, yyyy HH:mm')}
                                        </span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-gray-600">Currency:</span>
                                        <span className="font-semibold">{expense.currency || 'UGX'}</span>
                                      </div>
                                    </div>
                                  </div>
                                  {(expense.approved_by || expense.rejection_reason) && (
                                    <div className="space-y-3">
                                      <h4 className="font-bold text-gray-900">Approval Details</h4>
                                      <div className="space-y-2 text-sm">
                                        {expense.approved_by && (
                                          <div className="flex justify-between">
                                            <span className="text-gray-600">Approved By:</span>
                                            <span className="font-semibold">{expense.approved_by}</span>
                                          </div>
                                        )}
                                        {expense.approved_at && (
                                          <div className="flex justify-between">
                                            <span className="text-gray-600">Approved At:</span>
                                            <span className="font-semibold">
                                              {format(new Date(expense.approved_at), 'MMM dd, yyyy HH:mm')}
                                            </span>
                                          </div>
                                        )}
                                        {expense.rejection_reason && (
                                          <div>
                                            <span className="text-gray-600">Rejection Reason:</span>
                                            <p className="mt-1 p-2 bg-red-50 border border-red-200 rounded text-red-800">
                                              {expense.rejection_reason}
                                            </p>
                                          </div>
                                        )}
                                        {expense.approval_notes && (
                                          <div>
                                            <span className="text-gray-600">Approval Notes:</span>
                                            <p className="mt-1 p-2 bg-green-50 border border-green-200 rounded text-green-800">
                                              {expense.approval_notes}
                                            </p>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}
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
                <DollarSign className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-500 mb-2">
                  {expenses.length === 0 ? 'No expenses found' : 'No matching expenses'}
                </h3>
                <p className="text-gray-400 mb-6">
                  {expenses.length === 0 
                    ? 'Start tracking your business expenses' 
                    : 'Try adjusting your search or filters'
                  }
                </p>
                <button
                  onClick={() => setShowExpenseForm(true)}
                  className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:from-purple-600 hover:to-pink-600 font-bold transition-all transform hover:scale-105 flex items-center mx-auto"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  {expenses.length === 0 ? 'Add First Expense' : 'Add New Expense'}
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'categories' && (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900">Expense Categories</h3>
            <button
              onClick={() => setShowCategoryForm(true)}
              className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:from-purple-600 hover:to-pink-600 font-bold transition-all transform hover:scale-105 flex items-center"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add Category
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {expenseCategories.map(category => (
              <div key={category.id} className="bg-gradient-to-br from-white to-gray-50 rounded-2xl p-6 border-2 border-gray-100 hover:border-purple-200 hover:shadow-lg transition-all">
                <div className="flex items-center space-x-4 mb-4">
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: category.color }}
                  >
                    <Tag className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-gray-900">{category.name}</h4>
                    <p className="text-sm text-gray-600">{category.description || 'No description'}</p>
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">
                    {expenses.filter(e => e.category_id === category.id).length}
                  </div>
                  <div className="text-sm text-gray-500">Expenses</div>
                </div>
              </div>
            ))}
          </div>

          {expenseCategories.length === 0 && (
            <div className="text-center py-16">
              <Tag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-500 mb-2">No categories found</h3>
              <p className="text-gray-400 mb-6">Create categories to organize your expenses</p>
              <button
                onClick={() => setShowCategoryForm(true)}
                className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:from-purple-600 hover:to-pink-600 font-bold transition-all transform hover:scale-105 flex items-center mx-auto"
              >
                <Plus className="w-5 h-5 mr-2" />
                Create First Category
              </button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
              <div className="flex items-center space-x-3 mb-4">
                <div className="bg-blue-100 p-3 rounded-xl">
                  <BarChart3 className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Monthly Trend</h3>
                  <p className="text-gray-600">Expense growth analysis</p>
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600 mb-2">
                  {formatCurrency(stats.thisMonth)}
                </div>
                <div className="text-sm text-gray-500">This Month</div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
              <div className="flex items-center space-x-3 mb-4">
                <div className="bg-green-100 p-3 rounded-xl">
                  <Target className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Average Expense</h3>
                  <p className="text-gray-600">Per transaction</p>
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600 mb-2">
                  {formatCurrency(expenses.length > 0 ? stats.total / expenses.length : 0)}
                </div>
                <div className="text-sm text-gray-500">Average Amount</div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
              <div className="flex items-center space-x-3 mb-4">
                <div className="bg-purple-100 p-3 rounded-xl">
                  <Zap className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Approval Rate</h3>
                  <p className="text-gray-600">Success percentage</p>
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600 mb-2">
                  {expenses.length > 0 ? Math.round((stats.approved / expenses.length) * 100) : 0}%
                </div>
                <div className="text-sm text-gray-500">Approved</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Expense Form Modal */}
      {showExpenseForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6 bg-gradient-to-r from-red-600 to-pink-600 text-white">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold flex items-center">
                  <DollarSign className="w-6 h-6 mr-3" />
                  {editingExpense ? 'Edit Expense' : 'Create New Expense'}
                </h3>
                <button
                  onClick={() => {
                    setShowExpenseForm(false);
                    setEditingExpense(null);
                    resetExpenseForm();
                  }}
                  className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-xl transition-all"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <form onSubmit={handleCreateExpense} className="p-8 space-y-8">
              {/* Primary Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-3">
                    <Tag className="w-4 h-4 inline mr-2" />
                    Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={expenseForm.category_id}
                    onChange={(e) => setExpenseForm({ ...expenseForm, category_id: e.target.value })}
                    className={`w-full px-4 py-4 border-2 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-lg font-semibold ${
                      formErrors.category_id ? 'border-red-500' : 'border-gray-300'
                    }`}
                    required
                  >
                    <option value="">Select Category</option>
                    {expenseCategories.map(category => (
                      <option key={category.id} value={category.id}>{category.name}</option>
                    ))}
                  </select>
                  {formErrors.category_id && (
                    <p className="text-red-500 text-sm mt-2 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {formErrors.category_id}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-3">
                    <Building className="w-4 h-4 inline mr-2" />
                    Supplier (Optional)
                  </label>
                  <select
                    value={expenseForm.supplier_id}
                    onChange={(e) => setExpenseForm({ ...expenseForm, supplier_id: e.target.value })}
                    className="w-full px-4 py-4 border-2 border-gray-300 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-lg font-semibold"
                  >
                    <option value="">No Supplier</option>
                    {suppliers.filter(s => s.is_active).map(supplier => (
                      <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-3">
                  <FileText className="w-4 h-4 inline mr-2" />
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={expenseForm.description}
                  onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                  className={`w-full px-4 py-4 border-2 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none text-lg ${
                    formErrors.description ? 'border-red-500' : 'border-gray-300'
                  }`}
                  rows={4}
                  placeholder="Provide a detailed description of the expense..."
                  required
                />
                {formErrors.description && (
                  <p className="text-red-500 text-sm mt-2 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {formErrors.description}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-3">
                    <DollarSign className="w-4 h-4 inline mr-2" />
                    Amount <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 font-bold text-lg">
                      {businessSettings?.currency || 'UGX'}
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={expenseForm.amount}
                      onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                      className={`w-full pl-16 pr-4 py-4 border-2 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-lg font-bold ${
                        formErrors.amount ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="0.00"
                      required
                    />
                  </div>
                  {formErrors.amount && (
                    <p className="text-red-500 text-sm mt-2 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {formErrors.amount}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-3">
                    <Calendar className="w-4 h-4 inline mr-2" />
                    Expense Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={expenseForm.expense_date}
                    onChange={(e) => setExpenseForm({ ...expenseForm, expense_date: e.target.value })}
                    className={`w-full px-4 py-4 border-2 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-lg font-semibold ${
                      formErrors.expense_date ? 'border-red-500' : 'border-gray-300'
                    }`}
                    required
                  />
                  {formErrors.expense_date && (
                    <p className="text-red-500 text-sm mt-2 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {formErrors.expense_date}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-3">Payment Method</label>
                  <div className="grid grid-cols-2 gap-3">
                    {Object.entries(paymentMethodConfig).map(([method, config]) => (
                      <button
                        key={method}
                        type="button"
                        onClick={() => setExpenseForm({ ...expenseForm, payment_method: method })}
                        className={`p-4 border-2 rounded-2xl transition-all transform hover:scale-105 ${
                          expenseForm.payment_method === method
                            ? 'border-purple-500 bg-purple-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="text-2xl mb-2">{config.icon}</div>
                        <div className="text-sm font-bold">{config.label}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-3">Payment Reference</label>
                  <input
                    type="text"
                    value={expenseForm.payment_reference}
                    onChange={(e) => setExpenseForm({ ...expenseForm, payment_reference: e.target.value })}
                    className="w-full px-4 py-4 border-2 border-gray-300 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-lg font-semibold"
                    placeholder="Transaction ID, Check #, etc."
                  />
                </div>
              </div>

              {/* Receipt Upload */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-3">
                  <Receipt className="w-4 h-4 inline mr-2" />
                  Receipt Upload
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-2xl p-8 text-center hover:border-purple-400 transition-colors">
                  {expenseForm.receipt_url ? (
                    <div className="space-y-4">
                      <div className="bg-green-100 p-4 rounded-xl">
                        <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                        <p className="text-green-800 font-semibold">Receipt uploaded successfully!</p>
                      </div>
                      <div className="flex space-x-3 justify-center">
                        <a
                          href={expenseForm.receipt_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all flex items-center"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View Receipt
                        </a>
                        <button
                          type="button"
                          onClick={() => setExpenseForm({ ...expenseForm, receipt_url: '' })}
                          className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all flex items-center"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <Upload className="w-12 h-12 text-gray-400 mx-auto" />
                      <div>
                        <h4 className="text-lg font-semibold text-gray-700 mb-2">Upload Receipt</h4>
                        <p className="text-gray-500 mb-4">Drag and drop or click to select files</p>
                        <label className="cursor-pointer bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all transform hover:scale-105 inline-flex items-center font-bold">
                          <Upload className="w-5 h-5 mr-2" />
                          {isUploading ? 'Uploading...' : 'Choose File'}
                          <input
                            type="file"
                            accept="image/*,.pdf"
                            onChange={handleFileUpload}
                            className="hidden"
                            disabled={isUploading}
                          />
                        </label>
                      </div>
                      <p className="text-xs text-gray-400">Supported: Images, PDF (Max 5MB)</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-4 pt-8 border-t-2 border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowExpenseForm(false);
                    setEditingExpense(null);
                    resetExpenseForm();
                  }}
                  className="flex-1 px-8 py-4 border-2 border-gray-300 rounded-2xl text-gray-700 hover:bg-gray-50 font-bold text-lg transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || isUploading}
                  className="flex-1 px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-2xl hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 font-bold text-lg transition-all transform hover:scale-105 flex items-center justify-center shadow-lg"
                >
                  {loading || isUploading ? (
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                  ) : (
                    <Save className="w-6 h-6 mr-3" />
                  )}
                  {loading || isUploading ? 'Processing...' : editingExpense ? 'Update Expense' : 'Create Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Enhanced Category Form Modal */}
      {showCategoryForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl">
            <div className="p-6 bg-gradient-to-r from-purple-600 to-pink-600 text-white">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold flex items-center">
                  <Tag className="w-6 h-6 mr-3" />
                  Create Expense Category
                </h3>
                <button
                  onClick={() => {
                    setShowCategoryForm(false);
                    resetCategoryForm();
                  }}
                  className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-xl transition-all"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <form onSubmit={handleCreateCategory} className="p-8 space-y-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-3">
                  Category Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  className={`w-full px-4 py-4 border-2 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-lg font-semibold ${
                    formErrors.name ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="e.g., Office Supplies, Utilities, Marketing"
                  required
                />
                {formErrors.name && (
                  <p className="text-red-500 text-sm mt-2 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {formErrors.name}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-3">Description</label>
                <textarea
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                  className="w-full px-4 py-4 border-2 border-gray-300 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none text-lg"
                  rows={3}
                  placeholder="Optional description for this category"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-3">Category Color</label>
                <div className="flex items-center space-x-6">
                  <input
                    type="color"
                    value={categoryForm.color}
                    onChange={(e) => setCategoryForm({ ...categoryForm, color: e.target.value })}
                    className="w-20 h-16 border-2 border-gray-300 rounded-2xl cursor-pointer"
                  />
                  <div className="flex-1">
                    <div 
                      className="w-full h-16 rounded-2xl border-2 border-gray-300 flex items-center justify-center text-white font-bold text-lg shadow-inner"
                      style={{ backgroundColor: categoryForm.color }}
                    >
                      {categoryForm.name || 'Category Preview'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex space-x-4 pt-6 border-t-2 border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowCategoryForm(false);
                    resetCategoryForm();
                  }}
                  className="flex-1 px-6 py-4 border-2 border-gray-300 rounded-2xl text-gray-700 hover:bg-gray-50 font-bold text-lg transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-6 py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-2xl hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 font-bold text-lg transition-all transform hover:scale-105 flex items-center justify-center shadow-lg"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                  ) : (
                    <Save className="w-6 h-6 mr-3" />
                  )}
                  {loading ? 'Creating...' : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Enhanced Approval Modal */}
      {showApprovalModal && approvingExpense && (
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
                  {approvalAction === 'approve' ? 'Approve Expense' : 'Reject Expense'}
                </h3>
                <button
                  onClick={() => {
                    setShowApprovalModal(false);
                    setApprovingExpense(null);
                    setApprovalReason('');
                  }}
                  className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-xl transition-all"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-8 space-y-6">
              {/* Expense Details */}
              <div className="p-6 bg-gray-50 rounded-2xl border border-gray-200">
                <h4 className="font-bold text-gray-900 mb-4 text-lg">Expense Details</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Expense #:</span>
                    <p className="font-bold text-lg">{approvingExpense.expense_number}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Amount:</span>
                    <p className="font-bold text-xl text-green-600">{formatCurrency(approvingExpense.amount)}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-600">Description:</span>
                    <p className="font-semibold text-gray-900 mt-1">{approvingExpense.description}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Date:</span>
                    <p className="font-semibold">
                      {approvingExpense.expense_date 
                        ? format(new Date(approvingExpense.expense_date), 'MMM dd, yyyy')
                        : 'N/A'
                      }
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-600">Payment:</span>
                    <p className="font-semibold capitalize">{approvingExpense.payment_method}</p>
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
                    setApprovingExpense(null);
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
                  {loading ? 'Processing...' : approvalAction === 'approve' ? 'Approve Expense' : 'Reject Expense'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}