
export interface POSUser {
  id: string;
  staff_id: string;
  pin: string;
  full_name: string;
  role: string;
  avatar_url: string | null;
  is_active: boolean;
  last_login: string | null;
  email?: string | null;
  phone?: string | null;
}

export interface SalesTrend {
  labels: string[];
  sales: number[];
}

export interface Receipt {
  id: string;
  receipt_number: string;
  order_id: string;
  receipt_data: {
    business_name: string;
    order_number: string;
    items: Array<{
      name: string;
      quantity: number;
      unit_price: number;
      total_price: number;
      modifiers: Array<any>;
    }>;
    subtotal: number;
    tax_amount: number;
    discount_amount: number;
    tip_amount: number;
    total_amount: number;
    payment_method: string;
    change_amount: number;
    reference_number: string | null;
    card_last_four: string | null;
    timestamp: string;
    receipt_footer: string;
  };
  receipt_type: string;
  created_at: string;
}

export interface Order {
  id: string;
  order_number: string;
  table: Table | null;
  server: POSUser | null;
  customer_name: string;
  customer_phone: string;
  customer_count: number;
  order_type: string;
  status: string;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  tip_amount: number;
  total_amount: number;
  notes: string;
  special_requests: string;
  estimated_time: number;
  priority: string;
  reference: string | null;
  cancellation_reason?: string | null;
  cancelled_by?: string | null;
  cancelled_at?: string | null;
  created_at: string;
  updated_at: string | null;
  items: Array<{
    id: string;
    order_id: string;
    menu_item_id: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    modifiers: Array<any>;
    special_instructions: string | null;
    menu_item: MenuItem | null;
  }>;
  currency: string;
}

export interface Table {
  id: string;
  number: string;
  name: string;
  status: string;
  capacity: number;
  x_position: number;
  y_position: number;
}

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  cost_price: number;
  profit_margin: number;
  description: string | null;
  image_url: string | null;
  is_available: boolean;
  category_id: string | null;
  category: MenuCategory | null;
  abv?: number;
  calories?: number;
  spice_level: number;
  preparation_time: number;
  modifiers: Array<any>;
  is_featured?: boolean;
  is_vegetarian?: boolean;
  is_vegan?: boolean;
  is_gluten_free?: boolean;
  is_alcoholic?: boolean;
  inventory_count: number;
  minimum_stock: number;
  track_inventory: boolean;
  is_deleted: boolean;
}

export interface MenuCategory {
  id: string;
  name: string;
  color: string;
  icon: string | null;
  business_type: string;
  is_active: boolean;
  sort_order: number;
}

export interface Shift {
  id: string;
  user_id: string;
  starting_cash: number;
  ending_cash?: number;
  total_sales: number;
  total_tips: number;
  total_orders: number;
  cash_sales: number;
  card_sales: number;
  mobile_sales: number;
  status: string;
  start_time: string;
  end_time?: string;
  notes?: string;
  currency: string;
  orders_by_type: Array<{
    order_type: string;
    count: number;
    amount: number;
  }>;
}

export interface OrderData {
  table_id?: string;
  customer_name?: string;
  customer_phone?: string;
  customer_count: number;
  order_type: string;
  items: Array<{
    menu_item_id: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    modifiers?: Array<any>;
    special_instructions?: string;
  }>;
  user_id: string;
  discount_type?: string;
  discount_value?: number;
  status?: string;
  priority?: string;
  notes?: string;
  special_requests?: string;
  estimated_time?: number;
  reference?: string;
}

export interface PaymentData {
  user_id: string;
  payment_method: string;
  amount: number;
  tip_amount?: number;
  cash_received?: number;
  reference?: string;
  card_last_four?: string;
}

export interface DashboardStats {
  todaySales: number;
  todayOrders: number;
  activeOrders: number;
  availableTables: number;
  totalTips: number;
  averageOrderValue: number;
  currency: string;
}

export interface WebSocketEvent {
  event: 'order_update' | 'table_update' | 'menu_item_update' | 'dashboard_update' | 'shift_update' | 'kitchen_update' | 'shift_realtime_update';
  data: any;
}

export interface BusinessSettings {
  id: string;
  business_name: string;
  currency: string;
  tax_rate: number;
  receipt_footer: string;
  logo_url: string | null;
  business_type: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  enable_kitchen_display: boolean;
  enable_modifiers: boolean;
  enable_tables: boolean;
  created_at: string;
  updated_at: string;
}

export interface POSStore {
  businessSettings: BusinessSettings | null;
  setBusinessSettings: (settings: BusinessSettings) => void;
  menuItems: MenuItem[];
  categories: MenuCategory[];
  users: POSUser[];
  setUsers: (users: POSUser[]) => void;
  tables: Table[];
  setTables: (tables: Table[]) => void;
  orders: Order[];
  fetchData: () => Promise<void>;
}

export interface CartItem {
  id: string;
  menu_item: MenuItem;
  quantity: number;
  unit_price: string;
  total_price: string;
  modifiers: Array<any>;
  special_instructions: string | null;
}
