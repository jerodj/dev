import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Supplier, Expense, PurchaseOrder, InventoryItem, ERPDashboardStats, ExpenseCategory, AuditTrail, InventoryAdjustment } from '../types/erp';
import toast from 'react-hot-toast';
import { posApi } from '../lib/api';
import { invalidateInventoryCaches } from '../lib/cache';
import { debounce } from '../utils/debounce';

interface Expense {
  id: string;
  expense_number: string;
  description: string;
  amount: number;
  category_id: string;
  supplier_id?: string | null;
  expense_date: string | null;
  status: string;
  created_by?: string | null;
  approved_by?: string | null;
  approved_at?: string | null;
  payment_method?: string | null;
  payment_reference?: string | null;
  receipt_url?: string | null;
  currency?: string | null;
  created_at: string;
  updated_at: string;
  rejection_reason?: string | null;
}

interface ERPState {
  suppliers: Supplier[];
  expenses: Expense[];
  expenseCategories: ExpenseCategory[];
  purchaseOrders: PurchaseOrder[];
  inventoryItems: InventoryItem[];
  dashboardStats: ERPDashboardStats | null;
  salesAnalytics: any | null;
  expenseAnalytics: any | null;
  profitAnalytics: any | null;
  auditTrail: AuditTrail[];
  inventoryAdjustments: InventoryAdjustment[];
  loading: boolean;
  error: string | null;
  lastFetch: number | null;
  dataLoaded: {
    suppliers: boolean;
    expenses: boolean;
    expenseCategories: boolean;
    purchaseOrders: boolean;
    inventoryItems: boolean;
    dashboardStats: boolean;
    auditTrail: boolean;
    inventoryAdjustments: boolean;
  };
  pagination: {
    expenses: { page: number; limit: number; total: number };
    suppliers: { page: number; limit: number; total: number };
    purchaseOrders: { page: number; limit: number; total: number };
  };

  fetchSuppliers: () => Promise<void>;
  createSupplier: (data: Omit<Supplier, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateSupplier: (id: string, data: Partial<Supplier>) => Promise<void>;
  deleteSupplier: (id: string) => Promise<void>;
  fetchExpenseCategories: () => Promise<void>;
  createExpenseCategory: (data: Omit<ExpenseCategory, 'id' | 'created_at'>) => Promise<void>;
  fetchExpenses: () => Promise<void>;
  createExpense: (data: Omit<Expense, 'id' | 'expense_number' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateExpense: (id: string, data: Partial<Expense>) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  approveExpense: (id: string, userId: string) => Promise<void>;
  rejectExpense: (id: string, userId: string, reason: string) => Promise<void>;
  fetchPurchaseOrders: () => Promise<void>;
  createPurchaseOrder: (data: Omit<PurchaseOrder, 'id' | 'po_number' | 'created_at' | 'updated_at'>) => Promise<void>;
  updatePurchaseOrder: (id: string, data: Partial<PurchaseOrder>) => Promise<void>;
  approvePurchaseOrder: (id: string, userId: string) => Promise<void>;
  rejectPurchaseOrder: (id: string, userId: string, reason: string) => Promise<void>;
  receivePurchaseOrder: (id: string, items: Array<{ id: string; received_quantity: number }>) => Promise<void>;
  fetchInventoryItems: () => Promise<void>;
  updateInventoryItem: (id: string, data: Partial<InventoryItem>) => Promise<void>;
  adjustInventory: (id: string, adjustment: number, reason: string) => Promise<void>;
  fetchDashboardStats: () => Promise<void>;
  fetchSalesAnalytics: (period?: 'daily' | 'weekly' | 'monthly', days?: number) => Promise<void>;
  fetchExpenseAnalytics: (period?: 'daily' | 'weekly' | 'monthly', days?: number) => Promise<void>;
  fetchProfitAnalytics: (period?: 'daily' | 'weekly' | 'monthly', days?: number) => Promise<void>;
  fetchAuditTrail: (filters?: { table?: string; action?: string; user?: string; days?: number }) => Promise<void>;
  fetchInventoryAdjustments: () => Promise<void>;
  createInventoryAdjustment: (data: Omit<InventoryAdjustment, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  approveInventoryAdjustment: (id: string, userId: string) => Promise<void>;
  rejectInventoryAdjustment: (id: string, userId: string, reason: string) => Promise<void>;
  fetchAllERPData: () => Promise<void>;
  fetchERPDataLazy: (modules?: string[]) => Promise<void>;
  clearError: () => void;
}

const retryFetch = async <T>(fn: () => Promise<T>, retries = 1, delay = 1000): Promise<T> => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fn();
      return response;
    } catch (error) {
      if (attempt === retries) throw error;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Max retries reached');
};

export const useERPStore = create<ERPState>()(
  persist(
    (set, get) => ({
      suppliers: [],
      expenses: [],
      expenseCategories: [],
      purchaseOrders: [],
      inventoryItems: [],
      dashboardStats: null,
      salesAnalytics: null,
      expenseAnalytics: null,
      profitAnalytics: null,
      auditTrail: [],
      inventoryAdjustments: [],
      loading: false,
      error: null,
      lastFetch: null,
      dataLoaded: {
        suppliers: false,
        expenses: false,
        expenseCategories: false,
        purchaseOrders: false,
        inventoryItems: false,
        dashboardStats: false,
        auditTrail: false,
        inventoryAdjustments: false,
      },
      pagination: {
        expenses: { page: 1, limit: 20, total: 0 },
        suppliers: { page: 1, limit: 20, total: 0 },
        purchaseOrders: { page: 1, limit: 20, total: 0 },
      },

      fetchERPDataLazy: async (modules = ['expenseCategories', 'dashboardStats']) => {
        const { dataLoaded } = get();
        
        try {
          const promises = [];
          
          if (modules.includes('expenseCategories') && !dataLoaded.expenseCategories) {
            promises.push(get().fetchExpenseCategories());
          }
          
          if (modules.includes('dashboardStats') && !dataLoaded.dashboardStats) {
            promises.push(get().fetchDashboardStats());
          }
          
          if (modules.includes('suppliers') && !dataLoaded.suppliers) {
            promises.push(get().fetchSuppliers());
          }
          
          if (modules.includes('expenses') && !dataLoaded.expenses) {
            promises.push(get().fetchExpenses());
          }
          
          if (modules.includes('purchaseOrders') && !dataLoaded.purchaseOrders) {
            promises.push(get().fetchPurchaseOrders());
          }
          
          if (modules.includes('inventoryItems') && !dataLoaded.inventoryItems) {
            promises.push(get().fetchInventoryItems());
          }
          
          if (modules.includes('auditTrail') && !dataLoaded.auditTrail) {
            promises.push(get().fetchAuditTrail());
          }
          
          if (modules.includes('inventoryAdjustments') && !dataLoaded.inventoryAdjustments) {
            promises.push(get().fetchInventoryAdjustments());
          }

          await Promise.allSettled(promises);
        } catch (error) {
          console.error('Error in lazy ERP data fetch:', error);
          toast.error('Some ERP data failed to load');
        }
      },

      fetchSuppliers: async () => {
        set({ error: null, loading: true });
        try {
          console.log('Fetching suppliers from /api/suppliers...');
          const suppliers = await retryFetch(() => posApi.request('/api/suppliers'));
          console.log('Fetched suppliers:', JSON.stringify(suppliers, null, 2));
          if (!Array.isArray(suppliers)) {
            console.error('Suppliers response is not an array:', suppliers);
            set({ suppliers: [], loading: false });
            return;
          }
          const normalizedSuppliers = suppliers.map((supplier: any) => ({
            id: supplier.id || '',
            name: supplier.name || '',
            contact_person: supplier.contact_person || supplier.contact_info || null,
            email: supplier.email || null,
            phone: supplier.phone || null,
            address: supplier.address || null,
            payment_terms: supplier.payment_terms || 'net_30',
            tax_id: supplier.tax_id || null,
            is_active: supplier.is_active !== undefined ? supplier.is_active : true,
            created_at: supplier.created_at || new Date().toISOString(),
            updated_at: supplier.updated_at || new Date().toISOString(),
          }));
          console.log('Normalized suppliers:', JSON.stringify(normalizedSuppliers, null, 2));
          set(state => ({ 
            suppliers: normalizedSuppliers, 
            loading: false,
            dataLoaded: { ...state.dataLoaded, suppliers: true }
          }));
        } catch (error) {
          console.error('Error fetching suppliers:', {
            message: error.message,
            stack: error.stack,
          });
          const errorMessage = error instanceof Error ? error.message : 'Failed to load suppliers';
          set({ error: errorMessage, suppliers: [], loading: false });
          toast.error(errorMessage);
          if (errorMessage.includes('Session expired')) {
            window.location.reload();
          }
        }
      },

      createSupplier: async (data) => {
        set({ loading: true, error: null });
        try {
          console.log('createSupplier - Request payload:', JSON.stringify(data, null, 2));
          await retryFetch(() => posApi.request('/api/suppliers', {
            method: 'POST',
            body: JSON.stringify(data),
            headers: { 'Content-Type': 'application/json' },
          }));
          await get().fetchSuppliers();
          toast.success('Supplier created successfully!');
        } catch (error) {
          console.error('Error creating supplier:', {
            message: error.message,
            stack: error.stack,
          });
          const errorMessage = error instanceof Error ? error.message : 'Failed to create supplier';
          set({ error: errorMessage });
          toast.error(errorMessage);
          throw error;
        } finally {
          set({ loading: false });
        }
      },

      updateSupplier: async (id, data) => {
        set({ loading: true, error: null });
        try {
          console.log(`updateSupplier - Request payload for ID ${id}:`, JSON.stringify(data, null, 2));
          await retryFetch(() => posApi.request(`/api/suppliers/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
            headers: { 'Content-Type': 'application/json' },
          }));
          await get().fetchSuppliers();
          toast.success('Supplier updated successfully!');
        } catch (error) {
          console.error('Error updating supplier:', {
            message: error.message,
            stack: error.stack,
          });
          const errorMessage = error instanceof Error ? error.message : 'Failed to update supplier';
          set({ error: errorMessage });
          toast.error(errorMessage);
          throw error;
        } finally {
          set({ loading: false });
        }
      },

      deleteSupplier: async (id) => {
        set({ loading: true, error: null });
        try {
          console.log(`deleteSupplier - Deleting supplier ID ${id}`);
          await retryFetch(() => posApi.request(`/api/suppliers/${id}`, {
            method: 'DELETE',
          }));
          await get().fetchSuppliers();
          toast.success('Supplier deleted successfully!');
        } catch (error) {
          console.error('Error deleting supplier:', {
            message: error.message,
            stack: error.stack,
          });
          const errorMessage = error instanceof Error ? error.message : 'Failed to delete supplier';
          set({ error: errorMessage });
          toast.error(errorMessage);
          throw error;
        } finally {
          set({ loading: false });
        }
      },

      fetchExpenseCategories: async () => {
        set({ error: null, loading: true });
        try {
          console.log('Fetching expense categories from /api/expense-categories...');
          const categories = await retryFetch(() => posApi.request('/api/expense-categories'));
          console.log('Fetched expense categories:', JSON.stringify(categories, null, 2));
          if (!Array.isArray(categories)) {
            console.error('Expense categories response is not an array:', categories);
            set({ expenseCategories: [], loading: false });
            return;
          }
          const normalizedCategories = categories.map((category: any) => ({
            id: category.id || '',
            name: category.name || '',
            created_at: category.created_at || new Date().toISOString(),
          }));
          console.log('Normalized expense categories:', JSON.stringify(normalizedCategories, null, 2));
          set(state => ({ 
            expenseCategories: normalizedCategories, 
            loading: false,
            dataLoaded: { ...state.dataLoaded, expenseCategories: true }
          }));
        } catch (error) {
          console.error('Error fetching expense categories:', {
            message: error.message,
            stack: error.stack,
          });
          const errorMessage = error instanceof Error ? error.message : 'Failed to load expense categories';
          set({ error: errorMessage, expenseCategories: [], loading: false });
          toast.error(errorMessage);
        }
      },

      createExpenseCategory: async (data) => {
        set({ loading: true, error: null });
        try {
          console.log('createExpenseCategory - Request payload:', JSON.stringify(data, null, 2));
          await retryFetch(() => posApi.request('/api/expense-categories', {
            method: 'POST',
            body: JSON.stringify(data),
            headers: { 'Content-Type': 'application/json' },
          }));
          await get().fetchExpenseCategories();
          toast.success('Expense category created successfully!');
        } catch (error) {
          console.error('Error creating expense category:', {
            message: error.message,
            stack: error.stack,
          });
          const errorMessage = error instanceof Error ? error.message : 'Failed to create expense category';
          set({ error: errorMessage });
          toast.error(errorMessage);
          throw error;
        } finally {
          set({ loading: false });
        }
      },

      fetchExpenses: async () => {
        set({ error: null, loading: true });
        try {
          console.log('Fetching expenses from /api/expenses...');
          const expenses = await retryFetch(() => posApi.request('/api/expenses'));
          console.log('Fetched expenses:', JSON.stringify(expenses, null, 2));
          if (!Array.isArray(expenses)) {
            console.error('Expenses response is not an array:', expenses);
            set({ expenses: [], loading: false });
            return;
          }
          const validExpenses = expenses
            .filter(expense => 
              expense && 
              expense.id && 
              typeof expense.description === 'string' && 
              typeof expense.expense_number === 'string'
            )
            .map(expense => {
              let expenseDate = expense.expense_date;
              if (!expenseDate || isNaN(new Date(expenseDate).getTime())) {
                console.warn(`Invalid expense_date for expense ${expense.id}: ${expenseDate}`);
                expenseDate = null;
              } else {
                expenseDate = new Date(expenseDate).toISOString().split('T')[0];
              }
              return {
                id: expense.id || '',
                expense_number: expense.expense_number || '',
                description: expense.description || '',
                amount: parseFloat(expense.amount) || 0,
                category_id: expense.category_id || null,
                supplier_id: expense.supplier_id || null,
                expense_date: expenseDate,
                status: expense.status || 'pending',
                created_by: expense.created_by || null,
                approved_by: expense.approved_by || null,
                approved_at: expense.approved_at || null,
                payment_method: expense.payment_method || 'cash',
                payment_reference: expense.payment_reference || null,
                receipt_url: expense.receipt_url || null,
                currency: expense.currency || 'UGX',
                created_at: expense.created_at ? new Date(expense.created_at).toISOString() : new Date().toISOString(),
                updated_at: expense.updated_at ? new Date(expense.updated_at).toISOString() : new Date().toISOString(),
                rejection_reason: expense.rejection_reason || null,
              };
            });
          console.log('Normalized expenses:', JSON.stringify(validExpenses, null, 2));
          set(state => ({ 
            expenses: validExpenses, 
            loading: false,
            dataLoaded: { ...state.dataLoaded, expenses: true }
          }));
        } catch (error) {
          console.error('Error fetching expenses:', {
            message: error.message,
            stack: error.stack,
          });
          const errorMessage = error instanceof Error ? error.message : 'Failed to load expenses';
          set({ error: errorMessage, expenses: [], loading: false });
          toast.error(errorMessage);
        }
      },

      createExpense: async (data) => {
        set({ loading: true, error: null });
        try {
          const payload = {
            amount: data.amount,
            category_id: data.category_id,
            description: data.description.trim(),
            expense_date: data.expense_date,
            ...(data.supplier_id && { supplier_id: data.supplier_id }),
            ...(data.payment_method && { payment_method: data.payment_method }),
            ...(data.payment_reference?.trim() && { payment_reference: data.payment_reference.trim() }),
            ...(data.receipt_url && { receipt_url: data.receipt_url }),
            ...(data.currency?.trim() && { currency: data.currency.trim() }),
            ...(data.created_by && { created_by: data.created_by }),
          };
          console.log('createExpense - Request payload:', JSON.stringify(payload, null, 2));
          await retryFetch(() => posApi.request('/api/expenses', {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: { 'Content-Type': 'application/json' },
          }));
          await get().fetchExpenses();
          await get().fetchDashboardStats();
          toast.success('Expense created successfully!');
        } catch (error) {
          console.error('Error creating expense:', {
            message: error.message,
            stack: error.stack,
          });
          const errorMessage = error instanceof Error ? error.message : 'Failed to create expense';
          set({ error: errorMessage });
          toast.error(errorMessage);
          throw error;
        } finally {
          set({ loading: false });
        }
      },

      updateExpense: async (id, data) => {
        set({ loading: true, error: null });
        try {
          const payload = {
            amount: data.amount,
            category_id: data.category_id,
            description: data.description?.trim(),
            expense_date: data.expense_date,
            ...(data.supplier_id !== undefined && { supplier_id: data.supplier_id }),
            ...(data.payment_method && { payment_method: data.payment_method }),
            ...(data.payment_reference?.trim() && { payment_reference: data.payment_reference.trim() }),
            ...(data.receipt_url !== undefined && { receipt_url: data.receipt_url }),
            ...(data.currency?.trim() && { currency: data.currency.trim() }),
            ...(data.status && { status: data.status }),
          };
          console.log(`updateExpense - Request payload for ID ${id}:`, JSON.stringify(payload, null, 2));
          await retryFetch(() => posApi.request(`/api/expenses/${id}`, {
            method: 'PUT',
            body: JSON.stringify(payload),
            headers: { 'Content-Type': 'application/json' },
          }));
          await get().fetchExpenses();
          await get().fetchDashboardStats();
          toast.success('Expense updated successfully!');
        } catch (error) {
          console.error('Error updating expense:', {
            message: error.message,
            stack: error.stack,
          });
          const errorMessage = error instanceof Error ? error.message : 'Failed to update expense';
          set({ error: errorMessage });
          toast.error(errorMessage);
          throw error;
        } finally {
          set({ loading: false });
        }
      },

      deleteExpense: async (id) => {
        set({ loading: true, error: null });
        try {
          console.log(`deleteExpense - Deleting expense ID ${id}`);
          await retryFetch(() => posApi.request(`/api/expenses/${id}`, {
            method: 'DELETE',
          }));
          await get().fetchExpenses();
          await get().fetchDashboardStats();
          toast.success('Expense deleted successfully!');
        } catch (error) {
          console.error('Error deleting expense:', {
            message: error.message,
            stack: error.stack,
          });
          const errorMessage = error instanceof Error ? error.message : 'Failed to delete expense';
          set({ error: errorMessage });
          toast.error(errorMessage);
          throw error;
        } finally {
          set({ loading: false });
        }
      },

      approveExpense: async (id, userId) => {
        set({ loading: true, error: null });
        try {
          console.log(`approveExpense - Approving expense ID ${id} by user ${userId}`);
          await retryFetch(() => posApi.request(`/api/expenses/${id}/approve`, {
            method: 'POST',
            body: JSON.stringify({ userId }),
            headers: { 'Content-Type': 'application/json' },
          }));
          await get().fetchExpenses();
          toast.success('Expense approved successfully!');
        } catch (error) {
          console.error('Error approving expense:', {
            message: error.message,
            stack: error.stack,
          });
          const errorMessage = error instanceof Error ? error.message : 'Failed to approve expense';
          set({ error: errorMessage });
          toast.error(errorMessage);
          throw error;
        } finally {
          set({ loading: false });
        }
      },

      rejectExpense: async (id, userId, reason) => {
        set({ loading: true, error: null });
        try {
          console.log(`rejectExpense - Rejecting expense ID ${id} by user ${userId} with reason: ${reason}`);
          await retryFetch(() => posApi.request(`/api/expenses/${id}/reject`, {
            method: 'POST',
            body: JSON.stringify({ userId, rejection_reason: reason }),
            headers: { 'Content-Type': 'application/json' },
          }));
          await get().fetchExpenses();
          toast.success('Expense rejected successfully!');
        } catch (error) {
          console.error('Error rejecting expense:', {
            message: error.message,
            stack: error.stack,
          });
          const errorMessage = error instanceof Error ? error.message : 'Failed to reject expense';
          set({ error: errorMessage });
          toast.error(errorMessage);
          throw error;
        } finally {
          set({ loading: false });
        }
      },

      fetchPurchaseOrders: async () => {
        set({ error: null, loading: true });
        try {
          console.log('Fetching purchase orders from /api/purchase-orders...');
          const purchaseOrders = await retryFetch(() => posApi.request('/api/purchase-orders'));
          console.log('Fetched purchase orders:', JSON.stringify(purchaseOrders, null, 2));
          if (!Array.isArray(purchaseOrders)) {
            console.error('Purchase orders response is not an array:', purchaseOrders);
            set({ purchaseOrders: [], loading: false });
            return;
          }
          const normalizedPOs = purchaseOrders.map((po: any) => ({
            id: po.id || '',
            po_number: po.po_number || '',
            supplier_id: po.supplier_id || '',
            supplier: po.supplier || null,
            status: po.status || 'draft',
            order_date: po.order_date || null,
            expected_delivery: po.expected_delivery || null,
            subtotal: po.subtotal || 0,
            tax_amount: po.tax_amount || 0,
            total_amount: po.total_amount || 0,
            notes: po.notes || null,
            created_by: po.created_by || '',
            approved_by: po.approved_by || null,
            approved_at: po.approved_at || null,
            received_at: po.received_at || null,
            currency: po.currency || 'UGX',
            items: (po.items || []).map((item: any) => ({
              id: item.id || '',
              menu_item_id: item.menu_item_id || '',
              item_name: item.item_name || '',
              description: item.description || null,
              quantity: item.quantity || 0,
              unit_price: item.unit_price || 0,
              total_price: item.total_price || 0,
              unit_of_measure: item.unit_of_measure || 'pcs',
            })),
            created_at: po.created_at || new Date().toISOString(),
            updated_at: po.updated_at || new Date().toISOString(),
          }));
          console.log('Normalized purchase orders:', JSON.stringify(normalizedPOs, null, 2));
          set(state => ({ 
            purchaseOrders: normalizedPOs, 
            loading: false,
            dataLoaded: { ...state.dataLoaded, purchaseOrders: true }
          }));
        } catch (error) {
          console.error('Error fetching purchase orders:', {
            message: error.message,
            stack: error.stack,
          });
          const errorMessage = error instanceof Error ? error.message : 'Failed to load purchase orders';
          set({ error: errorMessage, purchaseOrders: [], loading: false });
          toast.error(errorMessage);
        }
      },

      createPurchaseOrder: async (data) => {
        set({ loading: true, error: null });
        try {
          console.log('createPurchaseOrder - Request payload:', JSON.stringify(data, null, 2));
          await retryFetch(() => posApi.request('/api/purchase-orders', {
            method: 'POST',
            body: JSON.stringify(data),
            headers: { 'Content-Type': 'application/json' },
          }));
          await get().fetchPurchaseOrders();
          await get().fetchDashboardStats();
          toast.success('Purchase order created successfully!');
        } catch (error) {
          console.error('Error creating purchase order:', {
            message: error.message,
            stack: error.stack,
          });
          const errorMessage = error instanceof Error ? error.message : 'Failed to create purchase order';
          set({ error: errorMessage });
          toast.error(errorMessage);
          throw error;
        } finally {
          set({ loading: false });
        }
      },

      updatePurchaseOrder: async (id, data) => {
        set({ loading: true, error: null });
        try {
          console.log(`updatePurchaseOrder - Request payload for ID ${id}:`, JSON.stringify(data, null, 2));
          await retryFetch(() => posApi.request(`/api/purchase-orders/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
            headers: { 'Content-Type': 'application/json' },
          }));
          await get().fetchPurchaseOrders();
          toast.success('Purchase order updated successfully!');
        } catch (error) {
          console.error('Error updating purchase order:', {
            message: error.message,
            stack: error.stack,
          });
          const errorMessage = error instanceof Error ? error.message : 'Failed to update purchase order';
          set({ error: errorMessage });
          toast.error(errorMessage);
          throw error;
        } finally {
          set({ loading: false });
        }
      },

      approvePurchaseOrder: async (id, userId) => {
        set({ loading: true, error: null });
        try {
          console.log(`approvePurchaseOrder - Approving purchase order ID ${id} by user ${userId}`);
          await retryFetch(() => posApi.request(`/api/purchase-orders/${id}/approve`, {
            method: 'POST',
            body: JSON.stringify({ userId }),
            headers: { 'Content-Type': 'application/json' },
          }));
          await get().fetchPurchaseOrders();
          toast.success('Purchase order approved successfully!');
        } catch (error) {
          console.error('Error approving purchase order:', {
            message: error.message,
            stack: error.stack,
          });
          const errorMessage = error instanceof Error ? error.message : 'Failed to approve purchase order';
          set({ error: errorMessage });
          toast.error(errorMessage);
          throw error;
        } finally {
          set({ loading: false });
        }
      },

      rejectPurchaseOrder: async (id, userId, reason) => {
        set({ loading: true, error: null });
        try {
          console.log(`rejectPurchaseOrder - Rejecting purchase order ID ${id} by user ${userId} with reason: ${reason}`);
          await retryFetch(() => posApi.request(`/api/purchase-orders/${id}/reject`, {
            method: 'POST',
            body: JSON.stringify({ userId, rejection_reason: reason }),
            headers: { 'Content-Type': 'application/json' },
          }));
          await get().fetchPurchaseOrders();
          toast.success('Purchase order rejected successfully!');
        } catch (error) {
          console.error('Error rejecting purchase order:', {
            message: error.message,
            stack: error.stack,
          });
          const errorMessage = error instanceof Error ? error.message : 'Failed to reject purchase order';
          set({ error: errorMessage });
          toast.error(errorMessage);
          throw error;
        } finally {
          set({ loading: false });
        }
      },

      receivePurchaseOrder: async (id, items) => {
        set({ loading: true, error: null });
        try {
          console.log(`receivePurchaseOrder - Receiving purchase order ID ${id} with items:`, JSON.stringify(items, null, 2));
          await retryFetch(() => posApi.request(`/api/purchase-orders/${id}/receive`, {
            method: 'POST',
            body: JSON.stringify({ items }),
            headers: { 'Content-Type': 'application/json' },
          }));
          await get().fetchPurchaseOrders();
          await get().fetchInventoryItems();
          // Invalidate caches after receiving purchase order
          invalidateInventoryCaches();
          window.dispatchEvent(new CustomEvent('inventoryUpdated'));
          localStorage.setItem('inventory_updated', Date.now().toString());
          toast.success('Purchase order received successfully!');
        } catch (error) {
          console.error('Error receiving purchase order:', {
            message: error.message,
            stack: error.stack,
          });
          const errorMessage = error instanceof Error ? error.message : 'Failed to receive purchase order';
          set({ error: errorMessage });
          toast.error(errorMessage);
          throw error;
        } finally {
          set({ loading: false });
        }
      },

      fetchInventoryItems: async () => {
        set({ error: null, loading: true });
        try {
          console.log('Fetching inventory items from /api/inventory-items...');
          const inventoryItems = await retryFetch(() => posApi.request('/api/inventory-items'));
          console.log('Fetched inventory items:', JSON.stringify(inventoryItems, null, 2));
          if (!Array.isArray(inventoryItems)) {
            console.error('Inventory items response is not an array:', inventoryItems);
            set({ inventoryItems: [], loading: false });
            return;
          }
          const normalizedItems = inventoryItems.map((item: any) => ({
            id: item.id || '',
            item_name: item.name || 'Unknown Item',
            description: item.description || null,
            current_stock: item.inventory_count || 0,
            minimum_stock: item.minimum_stock || 0,
            unit_price: item.unit_price || 0,
            unit_of_measure: item.unit_of_measure || 'pcs',
            category_id: item.category_id || null,
            supplier_id: item.supplier_id || null,
            track_inventory: item.track_inventory || false,
            created_at: item.created_at || new Date().toISOString(),
            updated_at: item.updated_at || new Date().toISOString(),
          }));
          console.log('Normalized inventory items:', JSON.stringify(normalizedItems, null, 2));
          set(state => ({ 
            inventoryItems: normalizedItems, 
            loading: false,
            dataLoaded: { ...state.dataLoaded, inventoryItems: true }
          }));
        } catch (error) {
          console.error('Error fetching inventory:', {
            message: error.message,
            stack: error.stack,
          });
          const errorMessage = error instanceof Error ? error.message : 'Failed to load inventory';
          set({ error: errorMessage, inventoryItems: [], loading: false });
          toast.error(errorMessage);
        }
      },

      updateInventoryItem: async (id, data) => {
        set({ loading: true, error: null });
        try {
          console.log(`updateInventoryItem - Request payload for ID ${id}:`, JSON.stringify(data, null, 2));
          await retryFetch(() => posApi.request(`/api/inventory-items/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
            headers: { 'Content-Type': 'application/json' },
          }));
          await get().fetchInventoryItems();
          // Invalidate caches after updating inventory item
          invalidateInventoryCaches();
          window.dispatchEvent(new CustomEvent('inventoryUpdated'));
          localStorage.setItem('inventory_updated', Date.now().toString());
          toast.success('Inventory item updated successfully!');
        } catch (error) {
          console.error('Error updating inventory item:', {
            message: error.message,
            stack: error.stack,
          });
          const errorMessage = error instanceof Error ? error.message : 'Failed to update inventory item';
          set({ error: errorMessage });
          toast.error(errorMessage);
          throw error;
        } finally {
          set({ loading: false });
        }
      },

      adjustInventory: async (id, adjustment, reason) => {
        set({ loading: true, error: null });
        try {
          const inventoryItem = get().inventoryItems.find(item => item.id === id);
          if (!inventoryItem) {
            throw new Error('Inventory item not found');
          }

          const adjustmentData = {
            inventory_item_id: id,
            adjustment_type: adjustment > 0 ? 'increase' : 'decrease',
            quantity_before: inventoryItem.current_stock,
            quantity_after: inventoryItem.current_stock + adjustment,
            adjustment_quantity: Math.abs(adjustment),
            quantity: Math.abs(adjustment),
            reason,
            reference_type: 'manual',
            reference_id: null,
            created_by: localStorage.getItem('user_id') || 'system',
            created_by_name: localStorage.getItem('user_name') || 'System',
            approved_by: null,
            approved_by_name: null,
            approved_at: null,
            status: 'pending',
            notes: null,
            item_name: inventoryItem.item_name,
          };

          console.log('adjustInventory - Request payload:', JSON.stringify(adjustmentData, null, 2));
          await retryFetch(() => posApi.request('/api/inventory-adjustments', {
            method: 'POST',
            body: JSON.stringify(adjustmentData),
            headers: { 'Content-Type': 'application/json' },
          }));
          
          await get().fetchInventoryAdjustments();
          await get().fetchInventoryItems();
          // Invalidate caches after adjusting inventory
          invalidateInventoryCaches();
          window.dispatchEvent(new CustomEvent('inventoryUpdated'));
          localStorage.setItem('inventory_updated', Date.now().toString());
          toast.success('Inventory adjustment created and pending approval!');
        } catch (error) {
          console.error('Error creating inventory adjustment:', {
            message: error.message,
            stack: error.stack,
          });
          const errorMessage = error instanceof Error ? error.message : 'Failed to create inventory adjustment';
          set({ error: errorMessage });
          toast.error(errorMessage);
          throw error;
        } finally {
          set({ loading: false });
        }
      },

      fetchAuditTrail: async (filters = {}) => {
        set({ error: null, loading: true });
        try {
          console.log('Fetching audit trail from /api/audit-trail...');
          const queryParams = new URLSearchParams();
          if (filters.table) queryParams.append('table', filters.table);
          if (filters.action) queryParams.append('action', filters.action);
          if (filters.user) queryParams.append('user', filters.user);
          if (filters.days) queryParams.append('days', filters.days.toString());
          
          const url = `/api/audit-trail${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
          const auditTrail = await retryFetch(() => posApi.request(url));
          console.log('Fetched audit trail:', JSON.stringify(auditTrail, null, 2));
          
          if (!Array.isArray(auditTrail)) {
            console.error('Audit trail response is not an array:', auditTrail);
            set(state => ({ 
              auditTrail: [], 
              loading: false,
              dataLoaded: { ...state.dataLoaded, auditTrail: true }
            }));
            return;
          }
          
          const normalizedAuditTrail = auditTrail.map((entry: any) => ({
            id: entry.id || '',
            user_id: entry.user_id || '',
            action: entry.action || '',
            description: entry.description || '',
            metadata: entry.metadata || {},
            ip_address: entry.ip_address || '',
            user_agent: entry.user_agent || '',
            created_at: entry.created_at || new Date().toISOString(),
          }));
          set(state => ({ 
            auditTrail: normalizedAuditTrail, 
            loading: false,
            dataLoaded: { ...state.dataLoaded, auditTrail: true }
          }));
        } catch (error) {
          console.error('Error fetching audit trail:', {
            message: error.message,
            stack: error.stack,
          });
          const errorMessage = error instanceof Error ? error.message : 'Failed to load audit trail';
          set({ error: errorMessage, auditTrail: [], loading: false });
          toast.error(errorMessage);
        }
      },

      fetchInventoryAdjustments: async () => {
        set({ error: null, loading: true });
        try {
          console.log('Fetching inventory adjustments from /api/inventory-adjustments...');
          const adjustments = await retryFetch(() => posApi.request('/api/inventory-adjustments'));
          console.log('Fetched inventory adjustments:', JSON.stringify(adjustments, null, 2));
          
          if (!Array.isArray(adjustments)) {
            console.error('Inventory adjustments response is not an array:', adjustments);
            set(state => ({ 
              inventoryAdjustments: [], 
              loading: false,
              dataLoaded: { ...state.dataLoaded, inventoryAdjustments: true }
            }));
            return;
          }
          
          const normalizedAdjustments = adjustments.map((adj: any) => ({
            id: adj.id || '',
            inventory_item_id: adj.inventory_item_id || '',
            item_name: adj.item_name || adj.inventory_item?.item_name || 'Deleted Item',
            inventory_item: adj.inventory_item || {
              id: adj.inventory_item_id || '',
              item_name: adj.item_name || 'Deleted Item',
              current_stock: adj.inventory_item?.current_stock || 0,
              minimum_stock: adj.inventory_item?.minimum_stock || 0,
              is_active: adj.inventory_item?.is_active || false,
              created_at: adj.inventory_item?.created_at || new Date().toISOString(),
              updated_at: adj.inventory_item?.updated_at || new Date().toISOString(),
              description: adj.inventory_item?.description || null,
            },
            adjustment_type: adj.adjustment_type || 'increase',
            quantity: adj.quantity || adj.adjustment_quantity || 0,
            quantity_before: adj.quantity_before || 0,
            quantity_after: adj.quantity_after || 0,
            adjustment_quantity: adj.adjustment_quantity || adj.quantity || 0,
            reason: adj.reason || '',
            reference_type: adj.reference_type || null,
            reference_id: adj.reference_id || null,
            created_by: adj.created_by || 'system',
            created_by_name: adj.created_by_name || 'System',
            approved_by: adj.approved_by || null,
            approved_by_name: adj.approved_by_name || null,
            approved_at: adj.approved_at || null,
            status: adj.status || 'approved',
            notes: adj.notes || null,
            created_at: adj.created_at || new Date().toISOString(),
            updated_at: adj.updated_at || new Date().toISOString(),
          }));
          set(state => ({ 
            inventoryAdjustments: normalizedAdjustments, 
            loading: false,
            dataLoaded: { ...state.dataLoaded, inventoryAdjustments: true }
          }));
        } catch (error) {
          console.error('Error fetching inventory adjustments:', {
            message: error.message,
            stack: error.stack,
          });
          const errorMessage = error instanceof Error ? error.message : 'Failed to load inventory adjustments';
          set({ error: errorMessage, inventoryAdjustments: [], loading: false });
          toast.error(errorMessage);
        }
      },

      createInventoryAdjustment: async (data) => {
        set({ loading: true, error: null });
        try {
          const inventoryItem = get().inventoryItems.find(item => item.id === data.inventory_item_id);
          if (!inventoryItem) {
            throw new Error('Inventory item not found');
          }

          const adjustmentData = {
            ...data,
            quantity: data.adjustment_quantity || 0,
            item_name: inventoryItem.item_name,
            created_by: data.created_by || localStorage.getItem('user_id') || 'system',
            created_by_name: data.created_by_name || localStorage.getItem('user_name') || 'System',
            status: data.status || 'pending',
          };

          console.log('createInventoryAdjustment - Request payload:', JSON.stringify(adjustmentData, null, 2));
          await retryFetch(() => posApi.request('/api/inventory-adjustments', {
            method: 'POST',
            body: JSON.stringify(adjustmentData),
            headers: { 'Content-Type': 'application/json' },
          }));
          await get().fetchInventoryAdjustments();
          await get().fetchInventoryItems();
          // Invalidate caches after creating inventory adjustment
          invalidateInventoryCaches();
          window.dispatchEvent(new CustomEvent('inventoryUpdated'));
          localStorage.setItem('inventory_updated', Date.now().toString());
          
          if (data.quantity_after <= inventoryItem.minimum_stock && inventoryItem.supplier_id) {
            toast.info(`⚠️ ${inventoryItem.item_name} is now below minimum stock. Consider creating a purchase order.`, {
              duration: 8000,
              style: {
                background: '#FEF3C7',
                color: '#92400E',
                border: '2px solid #F59E0B'
              }
            });
          }
          
          toast.success('Inventory adjustment created successfully!');
        } catch (error) {
          console.error('Error creating inventory adjustment:', {
            message: error.message,
            stack: error.stack,
          });
          const errorMessage = error instanceof Error ? error.message : 'Failed to create inventory adjustment';
          set({ error: errorMessage });
          toast.error(errorMessage);
          throw error;
        } finally {
          set({ loading: false });
        }
      },

      approveInventoryAdjustment: async (id, userId) => {
        set({ loading: true, error: null });
        try {
          console.log(`approveInventoryAdjustment - Approving adjustment ID ${id} by user ${userId}`);
          await retryFetch(() => posApi.request(`/api/inventory-adjustments/${id}/approve`, {
            method: 'POST',
            body: JSON.stringify({ userId }),
            headers: { 'Content-Type': 'application/json' },
          }));
          await get().fetchInventoryAdjustments();
          await get().fetchInventoryItems();
          // Invalidate caches after approving inventory adjustment
          invalidateInventoryCaches();
          window.dispatchEvent(new CustomEvent('inventoryUpdated'));
          localStorage.setItem('inventory_updated', Date.now().toString());
          toast.success('Inventory adjustment approved successfully!');
          
          const adjustment = get().inventoryItems.find(adj => adj.id === id);
          if (adjustment && adjustment.quantity_after <= (adjustment.inventory_item?.minimum_stock || 0)) {
            const item = adjustment.inventory_item;
            if (item?.supplier_id) {
              toast.info(`📦 ${item.item_name} is now below minimum stock. Consider creating a purchase order.`, {
                duration: 8000,
                style: {
                  background: '#FEF3C7',
                  color: '#92400E',
                  border: '2px solid #F59E0B'
                }
              });
            }
          }
        } catch (error) {
          console.error('Error approving inventory adjustment:', {
            message: error.message,
            stack: error.stack,
          });
          const errorMessage = error instanceof Error ? error.message : 'Failed to approve inventory adjustment';
          set({ error: errorMessage });
          toast.error(errorMessage);
          throw error;
        } finally {
          set({ loading: false });
        }
      },

      rejectInventoryAdjustment: async (id, userId, reason) => {
        set({ loading: true, error: null });
        try {
          console.log(`rejectInventoryAdjustment - Rejecting adjustment ID ${id} by user ${userId} with reason: ${reason}`);
          await retryFetch(() => posApi.request(`/api/inventory-adjustments/${id}/reject`, {
            method: 'POST',
            body: JSON.stringify({ userId, rejection_reason: reason }),
            headers: { 'Content-Type': 'application/json' },
          }));
          await get().fetchInventoryAdjustments();
          toast.success('Inventory adjustment rejected successfully!');
        } catch (error) {
          console.error('Error rejecting inventory adjustment:', {
            message: error.message,
            stack: error.stack,
          });
          const errorMessage = error instanceof Error ? error.message : 'Failed to reject inventory adjustment';
          set({ error: errorMessage });
          toast.error(errorMessage);
          throw error;
        } finally {
          set({ loading: false });
        }
      },

      fetchDashboardStats: async () => {
        set({ error: null, loading: true });
        try {
          console.log('Fetching dashboard stats from /api/erp/dashboard-stats...');
          const stats = await retryFetch(() => posApi.request('/api/erp/dashboard-stats'));
          console.log('Fetched dashboard stats:', JSON.stringify(stats, null, 2));
          set(state => ({ 
            dashboardStats: stats, 
            lastFetch: Date.now(), 
            loading: false,
            dataLoaded: { ...state.dataLoaded, dashboardStats: true }
          }));
        } catch (error) {
          console.error('Error fetching ERP dashboard stats:', {
            message: error.message,
            stack: error.stack,
          });
          const errorMessage = error instanceof Error ? error.message : 'Failed to load dashboard stats';
          set({ error: errorMessage, loading: false });
          toast.error(errorMessage);
        }
      },

      fetchSalesAnalytics: async (period = 'daily', days = 30) => {
        set({ error: null, loading: true });
        try {
          console.log(`Fetching sales analytics from /api/pos/analytics/sales?period=${period}&days=${days}...`);
          const analytics = await retryFetch(() => posApi.request(`/api/pos/analytics/sales?period=${period}&days=${days}`));
          console.log('Fetched sales analytics:', JSON.stringify(analytics, null, 2));
          set({ salesAnalytics: analytics, loading: false });
        } catch (error) {
          console.error('Error fetching sales analytics:', {
            message: error.message,
            stack: error.stack,
          });
          const errorMessage = error instanceof Error ? error.message : 'Failed to load sales analytics';
          set({ error: errorMessage, loading: false });
          toast.error(errorMessage);
        }
      },

      fetchExpenseAnalytics: async (period = 'daily', days = 30) => {
        set({ error: null, loading: true });
        try {
          console.log(`Fetching expense analytics from /api/pos/analytics/expenses?period=${period}&days=${days}...`);
          const analytics = await retryFetch(() => posApi.request(`/api/pos/analytics/expenses?period=${period}&days=${days}`));
          console.log('Fetched expense analytics:', JSON.stringify(analytics, null, 2));
          set({ expenseAnalytics: analytics, loading: false });
        } catch (error) {
          console.error('Error fetching expense analytics:', {
            message: error.message,
            stack: error.stack,
          });
          const errorMessage = error instanceof Error ? error.message : 'Failed to load expense analytics';
          set({ error: errorMessage, loading: false });
          toast.error(errorMessage);
        }
      },

      fetchProfitAnalytics: async (period = 'daily', days = 30) => {
        set({ loading: true, error: null });
        try {
          console.log(`Fetching profit analytics from /api/pos/analytics/profit?period=${period}&days=${days}...`);
          const analytics = await retryFetch(() => posApi.request(`/api/pos/analytics/profit?period=${period}&days=${days}`));
          console.log('Fetched profit analytics:', JSON.stringify(analytics, null, 2));
          set({ profitAnalytics: analytics, loading: false });
        } catch (error) {
          console.error('Error fetching profit analytics:', {
            message: error.message,
            stack: error.stack,
          });
          const errorMessage = error instanceof Error ? error.message : 'Failed to load profit analytics';
          set({ error: errorMessage, loading: false });
          toast.error(errorMessage);
        }
      },

      fetchAllERPData: async () => {
        set({ loading: true, error: null });
        try {
          // Load essential data first
          await get().fetchERPDataLazy(['expenseCategories', 'dashboardStats']);
          
          // Load remaining data with delays to prevent overwhelming the server
          setTimeout(() => {
            get().fetchERPDataLazy(['suppliers', 'expenses']);
          }, 500);
          
          setTimeout(() => {
            get().fetchERPDataLazy(['purchaseOrders', 'inventoryItems']);
          }, 1000);
          
          setTimeout(() => {
            get().fetchERPDataLazy(['auditTrail', 'inventoryAdjustments']);
            get().fetchSalesAnalytics();
            get().fetchExpenseAnalytics();
            get().fetchProfitAnalytics();
          }, 1500);
          
          console.log('All ERP data fetched successfully');
        } catch (error) {
          console.error('Error fetching ERP data:', {
            message: error.message,
            stack: error.stack,
          });
          const errorMessage = error instanceof Error ? error.message : 'Failed to load ERP data';
          set({ error: errorMessage });
          toast.error(errorMessage);
        } finally {
          set({ loading: false });
        }
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'erp-storage',
      partialize: (state) => ({
        suppliers: state.suppliers,
        expenseCategories: state.expenseCategories,
        expenses: state.expenses,
        purchaseOrders: state.purchaseOrders,
        inventoryItems: state.inventoryItems,
        dashboardStats: state.dashboardStats,
        auditTrail: state.auditTrail,
        inventoryAdjustments: state.inventoryAdjustments,
        salesAnalytics: state.salesAnalytics,
        expenseAnalytics: state.expenseAnalytics,
        profitAnalytics: state.profitAnalytics,
        lastFetch: state.lastFetch,
        dataLoaded: state.dataLoaded,
        pagination: state.pagination,
      }),
    }
  )
);