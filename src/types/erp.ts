/**
 * Type definitions for ERP-related data structures.
 * These interfaces define the shape of data used in the ERP system, including suppliers, expenses, purchase orders, inventory, and dashboard statistics.
 */

/** Represents a supplier in the ERP system */
export interface Supplier {
  id: string;
  name: string;
  contact_person: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  payment_terms: string;
  tax_id: string | null;
  is_active: boolean;
  approval_status?: 'pending' | 'approved' | 'rejected';
  approved_by?: string | null;
  approved_at?: string | null;
  rejection_reason?: string | null;
  approval_notes?: string | null;
  created_at: string;
  updated_at: string;
}

/** Represents an expense category in the ERP system */
export interface ExpenseCategory {
  id: string;
  name: string;
  description: string | null;
  color: string;
  is_active: boolean;
  created_at: string;
}

/** Represents an expense entry in the ERP system */
export interface Expense {
  id: string;
  expense_number: string; // Required to prevent undefined errors in filtering
  category_id: string;
  category: ExpenseCategory | null;
  supplier_id: string | null;
  supplier: Supplier | null;
  description: string; // Required to prevent undefined errors in filtering
  amount: number;
  expense_date: string;
  payment_method: string;
  payment_reference: string | null;
  receipt_url: string | null;
  status: 'pending' | 'approved' | 'rejected';
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason?: string | null;
  approval_notes?: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  currency: string;
}

/** Represents a purchase order in the ERP system */
export interface PurchaseOrder {
  id: string;
  po_number: string;
  supplier_id: string;
  supplier: Supplier | null;
  status: string;
  order_date: string;
  expected_delivery: string | null;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  notes: string | null;
  created_by: string;
  approved_by: string | null;
  approved_at: string | null;
  received_at: string | null;
  rejection_reason?: string | null;
  approval_notes?: string | null;
  created_at: string;
  updated_at: string;
  currency: string;
  items: PurchaseOrderItem[];
}

/** Represents an item within a purchase order */
export interface PurchaseOrderItem {
  id: string;
  purchase_order_id: string;
  menu_item_id: string | null;
  menu_item: any | null; // Consider defining a specific MenuItem interface if possible
  item_name: string;
  description: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  received_quantity: number;
  unit_of_measure: string;
}

/** Represents an inventory item in the ERP system */
export interface InventoryItem {
  id: string;
  menu_item_id: string | null;
  menu_item: any | null; // Consider defining a specific MenuItem interface if possible
  item_name: string;
  description: string | null;
  current_stock: number;
  minimum_stock: number;
  maximum_stock: number;
  unit_of_measure: string;
  unit_cost: number;
  supplier_id: string | null;
  supplier: Supplier | null;
  last_restocked: string | null;
  expiry_date: string | null;
  location: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/** Represents dashboard statistics for the ERP system */
export interface ERPDashboardStats {
  totalExpenses: number;
  monthlyExpenses: number;
  dailyExpenses: number;
  weeklyExpenses: number;
  pendingPurchaseOrders: number;
  lowStockItems: number;
  totalSuppliers: number;
  averageOrderValue: number;
  totalSales: number;
  monthlySales: number;
  dailySales: number;
  weeklySales: number;
  totalOrders: number;
  monthlyOrders: number;
  dailyOrders: number;
  weeklyOrders: number;
  profitMargin: number;
  topSellingItems: Array<{
    item_name: string;
    quantity_sold: number;
    revenue: number;
  }>;
  salesTrend: Array<{
    date: string;
    sales: number;
    orders: number;
  }>;
  expenseTrend: Array<{
    date: string;
    expenses: number;
  }>;
  categoryBreakdown: Array<{
    category: string;
    amount: number;
    percentage: number;
  }>;
  currency: string;
}

/** Represents an audit trail entry in the ERP system */
export interface AuditTrail {
  id: string;
  table_name: string;
  record_id: string;
  action: 'create' | 'update' | 'delete' | 'approve' | 'reject' | 'adjust';
  old_values: Record<string, any> | null;
  new_values: Record<string, any> | null;
  user_id: string;
  user_name: string;
  user_role: string;
  ip_address: string | null;
  user_agent: string | null;
  reason: string | null;
  created_at: string;
}

/** Represents an inventory adjustment in the ERP system */
export interface InventoryAdjustment {
  id: string;
  inventory_item_id: string;
  inventory_item: InventoryItem | null;
  adjustment_type: 'increase' | 'decrease' | 'restock' | 'waste' | 'transfer';
  quantity_before: number;
  quantity_after: number;
  adjustment_quantity: number;
  reason: string;
  reference_type: 'manual' | 'purchase_order' | 'sale' | 'waste' | 'transfer';
  reference_id: string | null;
  created_by: string;
  created_by_name: string;
  approved_by: string | null;
  approved_by_name: string | null;
  approved_at: string | null;
  status: 'pending' | 'approved' | 'rejected';
  notes: string | null;
  rejection_reason?: string | null;
  approval_notes?: string | null;
  created_at: string;
  updated_at: string;
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
  clearError: () => void;
}