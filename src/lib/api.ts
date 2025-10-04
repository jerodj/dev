import { DateTime } from 'luxon';
import { POSUser, Order, Table, MenuItem, MenuCategory, Shift, OrderData, PaymentData, DashboardStats, Receipt, WebSocketEvent } from '../types/pos';
import { Supplier, Expense, PurchaseOrder, InventoryItem, ERPDashboardStats, ExpenseCategory } from '../types/erp';
import { printReceipt as printToUSB } from './printer';
import { usePrinterStore } from '../store/printerStore';
import CryptoJS from 'crypto-js';

interface LoginResponse {
  token: string;
  user: POSUser;
  currency: string;
}
interface CancelOrderResponse {
  success: boolean;
  orderId: string;
  status: string;
  reason?: string;
}
interface PaymentResponse {
  payment: {
    id: string;
    order_id: string;
    payment_method: string;
    amount: number;
    tip_amount: number;
    change_amount: number;
    reference_number: string | null;
    card_last_four: string | null;
    status: string;
    processed_by: string;
    processed_at: string;
    created_at: string;
  };
  receipt: Receipt;
}

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL;
const WS_BASE_URL = import.meta.env.VITE_WS_URL;
const REQUEST_TIMEOUT = 20000; // 20 seconds
const MAX_RETRIES = 2;

class POSApi {
  private token: string | null = null;
  private refreshToken: string | null = null;
  private ws: WebSocket | null = null;
  private wsListeners: Map<string, (event: WebSocketEvent) => void> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 0;

  constructor() {
    this.token = localStorage.getItem('pos_token');
    this.refreshToken = localStorage.getItem('refresh_token');

  }

  // ---------------- Token Handling ----------------
  private setToken(token: string) {
    this.token = token;
    localStorage.setItem('pos_token', token);
  }

  private setRefreshToken(refreshToken: string) {
    this.refreshToken = refreshToken;
    localStorage.setItem('refresh_token', refreshToken);
  }

  private logout() {
    this.token = null;
    this.refreshToken = null;
    localStorage.removeItem('pos_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('pos_user');
    localStorage.removeItem('user_id');
  }

  private async refreshTokenIfNeeded(): Promise<void> {
    if (!this.refreshToken) {
      this.logout();
      throw new Error('No refresh token available');
    }

    try {
      const data = await this.request('/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refresh_token: this.refreshToken }),
      });

      if (data.token) this.setToken(data.token);
      if (data.refresh_token) this.setRefreshToken(data.refresh_token);
    } catch (err: any) {
      this.logout();
      throw new Error('Failed to refresh token');
    }
  }



// ---------------- Main request handler ----------------
private async request(endpoint: string, options: RequestInit = {}, retries = 0): Promise<any> {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  if (this.token && !['/auth/login', '/auth/refresh'].includes(endpoint)) {
    headers['x-pos-token'] = this.token; // ← FIXED: lowercase to match CORS
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const response = await fetch(url, { ...options, headers, signal: controller.signal });
    clearTimeout(timeoutId);

    // Handle non-JSON responses better
    let data;
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${data}`);
      }
    }

    // Save tokens if endpoint is login/refresh
    if (['/auth/login', '/auth/refresh'].includes(endpoint)) {
      if (data.token) this.setToken(data.token);
      if (data.refresh_token) this.setRefreshToken(data.refresh_token);
    }

    // Retry on 401 with refresh token
    if (!response.ok) {
      if (response.status === 401 && this.refreshToken && retries < MAX_RETRIES) {
        await this.refreshTokenIfNeeded();
        return this.request(endpoint, options, retries + 1);
      }

      if (response.status === 401) this.logout();
      if (retries < MAX_RETRIES) {
        await new Promise(r => setTimeout(r, 1000 * (retries + 1)));
        return this.request(endpoint, options, retries + 1);
      }

      throw new Error(data.error || response.statusText || `HTTP ${response.status}`);
    }

    return data;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      if (retries < MAX_RETRIES) {
        await new Promise(r => setTimeout(r, 1000 * (retries + 1)));
        return this.request(endpoint, options, retries + 1);
      }
      throw new Error(`Request to ${url} timed out after ${REQUEST_TIMEOUT}ms`);
    }
    throw error;
  }
}

// ---------------- WebSocket Handling ----------------
initWebSocket(userId: string, onMessage: (event: WebSocketEvent) => void) {
  console.warn('WebSocket not supported on this API yet. Requests will use HTTP.');
  this.wsMessageHandler = onMessage; // keep for future implementation
}

addWebSocketListener(id: string, listener: (event: WebSocketEvent) => void) {
  console.warn('WebSocket listener added, but WS is not active.');
  this.wsListeners.set(id, listener);
}

removeWebSocketListener(id: string) {
  this.wsListeners.delete(id);
}

closeWebSocket() {
  if (this.ws) {
    this.ws.close();
    this.ws = null;
    this.wsListeners.clear();
    this.reconnectAttempts = 0;
  }
}

// Optional: keep attemptReconnect as a placeholder for future WS
private async attemptReconnect(userId: string) {
  console.warn('WebSocket reconnect skipped: WS not active.');
}

broadcastDashboardUpdate(): void {
  if (this.ws && this.ws.readyState === WebSocket.OPEN) {
    const event: WebSocketEvent = { event: 'dashboard_update', data: {} };
    const message = JSON.stringify(event);

    this.ws.send(message); 
  } else {
  }
}


  broadcastShiftUpdate(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const event: WebSocketEvent = { event: 'shift_update', data: {} };
      this.ws.send(JSON.stringify(event));
     
    }
  }

  broadcastShiftRealtimeUpdate(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const event: WebSocketEvent = { event: 'shift_realtime_update', data: {} };
      this.ws.send(JSON.stringify(event));
    }
  }

  broadcastKitchenUpdate(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const event: WebSocketEvent = { event: 'kitchen_update', data: {} };
      this.ws.send(JSON.stringify(event));     
    }
  }

  broadcastOrderUpdate(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const event: WebSocketEvent = { event: 'order_update', data: {} };
      this.ws.send(JSON.stringify(event));
    }
  }

  // Authentication
  async login(staff_id: string, pin: string): Promise<LoginResponse> {
    if (!staff_id || !pin) {
      throw new Error('Invalid login credentials: staff_id and pin are required');
    }
    const response = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ staff_id, pin }),
    });
    this.token = response.token;
    localStorage.setItem('pos_token', response.token);
    localStorage.setItem('pos_user', JSON.stringify({
      ...response.user,
      last_login: response.user.last_login ? DateTime.fromISO(response.user.last_login, { zone: 'Africa/Nairobi' }).toISO() : null,
    }));
    localStorage.setItem('user_id', response.user.id);
    return {
      ...response,
      user: {
        ...response.user,
        last_login: response.user.last_login ? DateTime.fromISO(response.user.last_login, { zone: 'Africa/Nairobi' }).toISO() : null,
      },
    };
  }





  // Dashboard
  async getDashboardStats(): Promise<DashboardStats> {
    const stats = await this.request('/dashboard/stats');
  
    return {
      todaySales: parseFloat(stats.todaySales) || 0,
      todayOrders: parseInt(stats.todayOrders) || 0,
      activeOrders: parseInt(stats.activeOrders) || 0,
      availableTables: parseInt(stats.availableTables) || 0,
      totalTips: parseFloat(stats.totalTips) || 0,
      averageOrderValue: parseFloat(stats.averageOrderValue) || 0,
      currency: stats.currency || 'UGX',
      orders: stats.orders?.map((order: any) => ({
        ...order,
        total_amount: parseFloat(order.total_amount) || 0,
        tip_amount: parseFloat(order.tip_amount) || 0,
        created_at: DateTime.fromISO(order.created_at, { zone: 'Africa/Nairobi' }).toISO(),
      })) || [],
    };
  }

  // Menu
  async getMenuItems(): Promise<MenuItem[]> {

    const items = await this.request('/menu/items');
    const mappedItems = items.map((item: any) => ({
      id: item.id,
      name: item.name,
      description: item.description || null,
      price: parseFloat(item.price) || 0.0,
      category_id: item.category_id || null,
      image_url: item.image_url || null,
      is_available: item.is_available ?? true,
      preparation_time: parseInt(item.preparation_time) || 0,
      modifiers: item.modifiers || [],
      allergens: item.allergens || null,
      is_alcoholic: item.is_alcoholic ?? false,
      abv: item.abv ? parseFloat(item.abv) : null,
      created_at: item.created_at || null,
      updated_at: item.updated_at || null,
      user_id: item.user_id || null,
      cost_price: parseFloat(item.cost_price) || 0.0,
      spice_level: parseInt(item.spice_level) || 0,
      profit_margin: parseFloat(item.profit_margin) || 0.0,
      category: item.category || null,
      is_deleted: item.is_deleted ?? false,
      inventory_count: parseInt(item.inventory_count) || 0,
      minimum_stock: parseInt(item.minimum_stock) || 0,
      track_inventory: item.track_inventory ?? false,
    }));
    return mappedItems;
  }

  async createMenuItem(itemData: any): Promise<MenuItem> {
    const item = await this.request('/menu/items', {
      method: 'POST',
      body: JSON.stringify({
        ...itemData,
        user_id: localStorage.getItem('user_id'),
      }),
    });
    this.broadcastMenuUpdate();
    return {
      ...item,
      price: parseFloat(item.price) || 0,
      cost_price: parseFloat(item.cost_price) || 0,
      profit_margin: parseFloat(item.profit_margin) || 0,
      abv: item.abv ? parseFloat(item.abv) : undefined,
      calories: item.calories ? parseInt(item.calories) : undefined,
      spice_level: parseInt(item.spice_level) || 0,
      preparation_time: parseInt(item.preparation_time) || 0,
      category: item.category || null,
      modifiers: item.modifiers || [],
      is_deleted: item.is_deleted ?? false,
      inventory_count: parseInt(item.inventory_count) || 0,
      minimum_stock: parseInt(item.minimum_stock) || 0,
      track_inventory: item.track_inventory ?? false,
    };
  }

  async updateMenuItem(itemId: string, itemData: any): Promise<MenuItem> {
    const item = await this.request(`/menu/items/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify({
        ...itemData,
        user_id: localStorage.getItem('user_id'),
      }),
    });
    this.broadcastMenuUpdate();
    return {
      ...item,
      price: parseFloat(item.price) || 0,
      cost_price: parseFloat(item.cost_price) || 0,
      profit_margin: parseFloat(item.profit_margin) || 0,
      abv: item.abv ? parseFloat(item.abv) : undefined,
      calories: item.calories ? parseInt(item.calories) : undefined,
      spice_level: parseInt(item.spice_level) || 0,
      preparation_time: parseInt(item.preparation_time) || 0,
      category: item.category || null,
      modifiers: item.modifiers || [],
      is_deleted: item.is_deleted ?? false,
      inventory_count: parseInt(item.inventory_count) || 0,
      minimum_stock: parseInt(item.minimum_stock) || 0,
      track_inventory: item.track_inventory ?? false,
    };
  }

  async deleteMenuItem(itemId: string): Promise<void> {
    if (!itemId) {
      throw new Error('Invalid itemId: itemId is required');
    }
    await this.request(`/menu/items/${itemId}`, {
      method: 'DELETE',
      body: JSON.stringify({
        user_id: localStorage.getItem('user_id'),
      }),
    });

    await this.forceCacheRefresh();
    this.broadcastMenuUpdate();
  }

  async toggleItemAvailability(itemId: string, isAvailable: boolean): Promise<void> {
  
    await this.request(`/menu/items/${itemId}/availability`, {
      method: 'PUT',
      body: JSON.stringify({
        is_available: isAvailable,
        user_id: localStorage.getItem('user_id'),
      }),
    });
    this.broadcastMenuUpdate();
  }

  async updateInventory(itemId: string, newCount: number): Promise<void> {
    if (!itemId || newCount < 0) {
      throw new Error('Invalid inventory update: itemId is required and count must be non-negative');
    }

    await this.request(`/menu/items/${itemId}/inventory`, {
      method: 'PUT',
      body: JSON.stringify({
        inventory_count: newCount,
        user_id: localStorage.getItem('user_id'),
      }),
    });
    this.broadcastMenuUpdate();
  }

  async adjustInventory(itemId: string, adjustment: number, reason: string): Promise<void> {
    if (!itemId || !reason) {
      throw new Error('Invalid inventory adjustment: itemId and reason are required');
    }

    await this.request(`/menu/items/${itemId}/inventory/adjust`, {
      method: 'POST',
      body: JSON.stringify({
        adjustment,
        reason,
        user_id: localStorage.getItem('user_id'),
      }),
    });
    this.broadcastMenuUpdate();
  }

  async getLowStockItems(): Promise<MenuItem[]> {
 
    const items = await this.request('/menu/items/low-stock');
    return items.map((item: any) => ({
      id: item.id,
      name: item.name,
      description: item.description || null,
      price: parseFloat(item.price) || 0.0,
      category_id: item.category_id || null,
      image_url: item.image_url || null,
      is_available: item.is_available ?? true,
      preparation_time: parseInt(item.preparation_time) || 0,
      modifiers: item.modifiers || [],
      allergens: item.allergens || null,
      is_alcoholic: item.is_alcoholic ?? false,
      abv: item.abv ? parseFloat(item.abv) : null,
      created_at: item.created_at || null,
      updated_at: item.updated_at || null,
      user_id: item.user_id || null,
      cost_price: parseFloat(item.cost_price) || 0.0,
      spice_level: parseInt(item.spice_level) || 0,
      profit_margin: parseFloat(item.profit_margin) || 0.0,
      category: item.category || null,
      is_deleted: item.is_deleted ?? false,
      inventory_count: parseInt(item.inventory_count) || 0,
      minimum_stock: parseInt(item.minimum_stock) || 0,
      track_inventory: item.track_inventory ?? false,
    }));
  }

  async getMenuCategories(): Promise<MenuCategory[]> {
    const categories = await this.request('/menu/categories');
    const mappedCategories = categories.map((category: any) => ({
      ...category,
      sort_order: parseInt(category.sort_order) || 0,
      is_active: category.is_active ?? true,
    }));
    return mappedCategories;
  }

  async createCategory(categoryData: any): Promise<MenuCategory> {
    if (!categoryData.name) {
      throw new Error('Invalid category data: name is required');
    }
    const category = await this.request('/menu/categories', {
      method: 'POST',
      body: JSON.stringify({
        ...categoryData,
        user_id: localStorage.getItem('user_id'),
      }),
    });
    this.broadcastMenuUpdate();
    return {
      ...category,
      sort_order: parseInt(category.sort_order) || 0,
      is_active: category.is_active ?? true,
    };
  }

  async updateCategory(categoryId: string, categoryData: any): Promise<MenuCategory> {
    if (!categoryId || !categoryData.name) {
      throw new Error('Invalid category data: categoryId and name are required');
    }
    const category = await this.request(`/menu/categories/${categoryId}`, {
      method: 'PUT',
      body: JSON.stringify({
        ...categoryData,
        user_id: localStorage.getItem('user_id'),
      }),
    });
    this.broadcastMenuUpdate();
    return {
      ...category,
      sort_order: parseInt(category.sort_order) || 0,
      is_active: category.is_active ?? true,
    };
  }

  async deleteCategory(categoryId: string): Promise<void> {
    if (!categoryId) {
      throw new Error('Invalid categoryId: categoryId is required');
    }
    await this.request(`/menu/categories/${categoryId}`, {
      method: 'DELETE',
      body: JSON.stringify({
        user_id: localStorage.getItem('user_id'),
      }),
    });
    this.broadcastMenuUpdate();
  }

  async forceCacheRefresh(): Promise<void> {
    try {
      await this.request('/menu/refresh-cache', {
        method: 'POST',
        body: JSON.stringify({
          user_id: localStorage.getItem('user_id'),
        }),
      });
    } catch (error) {
      throw error;
    }
  }

  async refreshMenuData(): Promise<{ items: MenuItem[]; categories: MenuCategory[] }> {
    try {
      await this.forceCacheRefresh();
      const [items, categories] = await Promise.all([
        this.getMenuItems(),
        this.getMenuCategories(),
      ]);
      return { items, categories };
    } catch (error) {
      throw error;
    }
  }

  broadcastMenuUpdate(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const event: WebSocketEvent = { event: 'menu_update', data: {} };
      this.ws.send(JSON.stringify(event));
    } else {
      console.warn(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'warn',
        message: 'Cannot broadcast menu_update: WebSocket not open',
      }, null, 2));
    }
  }

  // Tables
  async getTables(): Promise<Table[]> {
    const tables = await this.request('/tables');
    return tables.map((table: any) => ({
      ...table,
      capacity: parseInt(table.capacity) || 0,
      x_position: parseFloat(table.x_position) || 0,
      y_position: parseFloat(table.y_position) || 0,
    }));
  }

  async createTable(tableData: any): Promise<Table> {
    const table = await this.request('/tables', {
      method: 'POST',
      body: JSON.stringify({
        ...tableData,
        user_id: localStorage.getItem('user_id'),
      }),
    });
    return {
      ...table,
      capacity: parseInt(table.capacity) || 0,
      x_position: parseFloat(table.x_position) || 0,
      y_position: parseFloat(table.y_position) || 0,
    };
  }

  async updateTable(tableId: string, tableData: any): Promise<Table> {
    const table = await this.request(`/tables/${tableId}`, {
      method: 'PUT',
      body: JSON.stringify({
        ...tableData,
        user_id: localStorage.getItem('user_id'),
      }),
    });
    return {
      ...table,
      capacity: parseInt(table.capacity) || 0,
      x_position: parseFloat(table.x_position) || 0,
      y_position: parseFloat(table.y_position) || 0,
    };
  }

  async deleteTable(tableId: string): Promise<void> {
    if (!tableId) {
      throw new Error('Invalid tableId: tableId is required');
    }
    await this.request(`/tables/${tableId}`, {
      method: 'DELETE',
      body: JSON.stringify({
        user_id: localStorage.getItem('user_id'),
      }),
    });
  }

  // Orders
 async getOrders(): Promise<Order[]> {
    try {
      const orders = await this.request('/orders'); 
      const normalizedOrders = orders.map((order: any) => ({
        ...order,
        subtotal: parseFloat(order.subtotal) || 0,
        tax_amount: parseFloat(order.tax_amount) || 0,
        discount_amount: parseFloat(order.discount_amount) || 0,
        tip_amount: parseFloat(order.tip_amount) || 0,
        total_amount: parseFloat(order.total_amount) || 0,
        customer_count: parseInt(order.customer_count) || 0,
        estimated_time: parseInt(order.estimated_time) || 0,
        created_at: order.created_at
          ? DateTime.fromISO(order.created_at, { zone: 'Africa/Nairobi' }).toISO()
          : DateTime.now().setZone('Africa/Nairobi').toISO(),
        updated_at: order.updated_at
          ? DateTime.fromISO(order.updated_at, { zone: 'Africa/Nairobi' }).toISO()
          : null,
        items: order.items?.map((item: any) => ({
          ...item,
          quantity: parseInt(item.quantity) || 0,
          unit_price: parseFloat(item.unit_price) || 0,
          total_price: parseFloat(item.total_price) || 0,
          created_at: item.created_at
            ? DateTime.fromISO(item.created_at, { zone: 'Africa/Nairobi' }).toISO()
            : null,
          modifiers: item.modifiers || [],
          special_instructions: item.special_instructions || null,
          menu_item: item.menu_item
            ? {
                ...item.menu_item,
                price: parseFloat(item.menu_item.price) || 0,
                is_available: item.menu_item.is_available ?? false,
              }
            : null,
        })) || [],
        table: order.table
          ? {
              ...order.table,
              capacity: parseInt(order.table.capacity) || 0,
              x_position: parseFloat(order.table.x_position) || 0,
              y_position: parseFloat(order.table.y_position) || 0,
            }
          : null,
        server: order.server || null,
        // created_by_name: order.created_by?.full_name || 'Unknown',
        created_by_name: order.server?.full_name || 'Unknown',
        currency: order.currency || 'UGX',
        order_type: order.order_type || 'dine_in',
        notes: order.notes || '',
      }));

      return normalizedOrders;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      throw new Error(`Failed to fetch orders: ${errorMessage}`);
    }
  }
  async getPendingOrders(userId: string): Promise<Order[]> {
    if (!userId) {
      throw new Error('Invalid userId: userId is required');
    }
    const orders = await this.request(`/orders?user_id=${userId}&status=open,sent_to_kitchen,preparing,ready`);
    return orders.map((order: any) => ({
      ...order,
      subtotal: parseFloat(order.subtotal) || 0,
      tax_amount: parseFloat(order.tax_amount) || 0,
      discount_amount: parseFloat(order.discount_amount) || 0,
      tip_amount: parseFloat(order.tip_amount) || 0,
      total_amount: parseFloat(order.total_amount) || 0,
      customer_count: parseInt(order.customer_count) || 0,
      estimated_time: parseInt(order.estimated_time) || 0,
      created_at: DateTime.fromISO(order.created_at, { zone: 'Africa/Nairobi' }).toISO(),
      items: order.items?.map((item: any) => ({
        ...item,
        quantity: parseInt(item.quantity) || 0,
        unit_price: parseFloat(item.unit_price) || 0,
        total_price: parseFloat(item.total_price) || 0,
        created_at: item.created_at ? DateTime.fromISO(item.created_at, { zone: 'Africa/Nairobi' }).toISO() : null,
        menu_item: item.menu_item ? {
          ...item.menu_item,
          price: parseFloat(item.menu_item.price) || 0,
          is_available: item.menu_item.is_available || false,
        } : null,
      })) || [],
      table: order.table ? {
        ...order.table,
        capacity: parseInt(order.table.capacity) || 0,
        x_position: parseFloat(order.table.x_position) || 0,
        y_position: parseFloat(order.table.y_position) || 0,
      } : null,
      server: order.server || null,
      currency: order.currency || 'UGX',
    }));
  }

  async createOrder(orderData: OrderData): Promise<Order> {
    if (!orderData.user_id || !orderData.order_type || !orderData.items?.length) {
      throw new Error('Invalid order data: user_id, order_type, and items are required');
    }
  
    // Fetch menu items once
    const menuItems = await this.getMenuItems();
  
    // Aggregate requested quantities by menu_item_id
    const aggregated: Record<string, number> = {};
    for (const item of orderData.items) {
      aggregated[item.menu_item_id] =
        (aggregated[item.menu_item_id] || 0) + item.quantity;
    }
  
    // Validate aggregated quantities against stock
    for (const [menuItemId, totalRequested] of Object.entries(aggregated)) {
      const menuItem = menuItems.find(mi => mi.id === menuItemId);
  
      if (!menuItem) {
        throw new Error(`Menu item with ID "${menuItemId}" not found`);
      }
  
      if (!menuItem.is_available) {
        throw new Error(`Item "${menuItem.name}" is not available`);
      }
  
      if (menuItem.track_inventory) {
        const available = menuItem.inventory_count ?? 0;
  
  
        if (available < totalRequested) {
          throw new Error(
            `Not enough stock for "${menuItem.name}". Requested: ${totalRequested}, Available: ${available}`
          );
        }
      }
    }
  
    // ✅ Only reaches here if validation passes
    const currentShift = await this.getCurrentShift(orderData.user_id);
    if (!currentShift || currentShift.ending_cash !== undefined) {
      throw new Error('Cannot create order: Shift has not been started or has already ended.');
    }

    //continue with order creation
    const order = await this.request('/orders', {
      method: 'POST',
      body: JSON.stringify({
        ...orderData,
        items: orderData.items.map(item => ({
          ...item,
          modifiers: item.modifiers || [],
          special_instructions: item.special_instructions || null,
        })),
      }),
    });

    this.broadcastDashboardUpdate();
    this.broadcastShiftUpdate();
    this.broadcastKitchenUpdate();
    await this.updateShiftDataRealTime(orderData.user_id, orderData);

    return {
      ...order,
      subtotal: parseFloat(order.subtotal) || 0,
      tax_amount: parseFloat(order.tax_amount) || 0,
      discount_amount: parseFloat(order.discount_amount) || 0,
      tip_amount: parseFloat(order.tip_amount) || 0,
      total_amount: parseFloat(order.total_amount) || 0,
      customer_count: parseInt(order.customer_count) || 0,
      estimated_time: parseInt(order.estimated_time) || 0,
      created_at: DateTime.fromISO(order.created_at, { zone: 'Africa/Nairobi' }).toISO(),
      items: order.items?.map((item: any) => ({
        ...item,
        quantity: parseInt(item.quantity) || 0,
        unit_price: parseFloat(item.unit_price) || 0,
        total_price: parseFloat(item.total_price) || 0,
        created_at: item.created_at ? DateTime.fromISO(item.created_at, { zone: 'Africa/Nairobi' }).toISO() : null,
        menu_item: item.menu_item ? {
          ...item.menu_item,
          price: parseFloat(item.menu_item.price) || 0,
          is_available: item.menu_item.is_available || false,
        } : null,
      })) || [],
      table: order.table ? {
        ...order.table,
        capacity: parseInt(order.table.capacity) || 0,
        x_position: parseFloat(order.table.x_position) || 0,
        y_position: parseFloat(order.table.y_position) || 0,
      } : null,
      server: order.server || null,
      currency: order.currency || 'UGX',
    };
  }
localOrdersCache: Order[] = [];

  async addItemsToOrder(orderId: string, items: Array<{ menu_item_id: string; quantity: number; modifiers?: string[]; special_instructions?: string | null }>, userId: string): Promise<Order> {
    if (!orderId || !userId || !items?.length) {
      throw new Error('Invalid data: orderId, userId, and items are required');
    }

    const currentShift = await this.getCurrentShift(userId);
    if (!currentShift || currentShift.ending_cash !== undefined) {
      throw new Error('Cannot add items to order: Shift has not been started or has already ended.');
    }

    //fetch existing order
    const menuItems = await this.getMenuItems();
    let existingOrder: Order | null = null;
    try{
    
    const existingOrder = await this.request(`/orders/${orderId}`, {method: 'GET'});
    }catch(error:any){
      console.error('Error fetching existing order:', error);
      //fall back to local catche
      const cachedOrders = this.localOrdersCache || []; // make sure you maintain this
      existingOrder = cachedOrders.find(o => o.id === orderId) || null;
    }

    //aggregate total quantities (existing +new)
    const totalAggregated: Record<string, number> = {};
    //inclde existing items
    for (const item of items) {
      totalAggregated[item.menu_item_id] = (totalAggregated[item.menu_item_id] || 0) + item.quantity;
    }
    //validate against stock
    for (const [menuItemId, totalRequested] of Object.entries(totalAggregated)){
      const menuItem = menuItems.find(mi => mi.id === menuItemId);
      if (!menuItem) throw new Error(`Menu item with ID "${menuItemId}" not found`);
    if (!menuItem.is_available) throw new Error(`Item "${menuItem.name}" is not available`);

    if (menuItem.track_inventory) {
      const available = menuItem.inventory_count ?? 0;

      if (available < totalRequested) {
        throw new Error(
          `Not enough stock for "${menuItem.name}". Requested: ${totalRequested}, Available: ${available}`
        );
      }
    }
  }

    const order = await this.request(`/orders/${orderId}/items`, {
      method: 'POST',
      body: JSON.stringify({
        items: items.map(item => ({
          ...item,
          modifiers: item.modifiers || [],
          special_instructions: item.special_instructions || null,
        })),
        user_id: userId,
      }),
    });

    this.broadcastDashboardUpdate();
    this.broadcastOrderUpdate();
    this.broadcastKitchenUpdate();
    await this.updateShiftDataRealTime(userId);
    return {
      ...order,
      subtotal: parseFloat(order.subtotal) || 0,
      tax_amount: parseFloat(order.tax_amount) || 0,
      discount_amount: parseFloat(order.discount_amount) || 0,
      tip_amount: parseFloat(order.tip_amount) || 0,
      total_amount: parseFloat(order.total_amount) || 0,
      customer_count: parseInt(order.customer_count) || 0,
      estimated_time: parseInt(order.estimated_time) || 0,
      created_at: DateTime.fromISO(order.created_at, { zone: 'Africa/Nairobi' }).toISO(),
      items: order.items?.map((item: any) => ({
        ...item,
        quantity: parseInt(item.quantity) || 0,
        unit_price: parseFloat(item.unit_price) || 0,
        total_price: parseFloat(item.total_price) || 0,
        created_at: item.created_at ? DateTime.fromISO(item.created_at, { zone: 'Africa/Nairobi' }).toISO() : null,
        menu_item: item.menu_item ? {
          ...item.menu_item,
          price: parseFloat(item.menu_item.price) || 0,
          is_available: item.menu_item.is_available || false,
        } : null,
      })) || [],
      table: order.table ? {
        ...order.table,
        capacity: parseInt(order.table.capacity) || 0,
        x_position: parseFloat(order.table.x_position) || 0,
        y_position: parseFloat(order.table.y_position) || 0,
      } : null,
      server: order.server || null,
      currency: order.currency || 'UGX',
    };
  }

  async updateOrderStatus(orderId: string, status: string, userId: string): Promise<void> {
    if (!orderId || !status || !userId) {
      throw new Error('Invalid order status update: orderId, status, and userId are required');
    }

    const validStatuses = ['open', 'sent_to_kitchen', 'preparing', 'ready', 'served', 'paid', 'cancelled'];
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid status: ${status}. Must be one of: ${validStatuses.join(', ')}`);
    }

    await this.request(`/orders/${orderId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, user_id: userId }),
    });
    this.broadcastDashboardUpdate();
    this.broadcastKitchenUpdate();
    this.broadcastOrderUpdate();
  }

  async processPayment(orderId: string, paymentData: PaymentData): Promise<PaymentResponse> {
    if (!orderId || !paymentData.user_id || !paymentData.payment_method || paymentData.amount == null) {
      throw new Error('Invalid payment data: orderId, user_id, payment_method, and amount are required');
    }
    const response = await this.request(`/orders/${orderId}/payment`, {
      method: 'POST',
      body: JSON.stringify({
        ...paymentData,
        tip_amount: paymentData.tip_amount || 0,
        change_amount: paymentData.cash_received ? Math.max(0, paymentData.cash_received - paymentData.amount) : 0,
        reference_number: paymentData.reference || null,
        card_last_four: paymentData.card_last_four || null,
      }),
    });


    if (!response.receipt) {

      throw new Error('Invalid payment response: receipt is missing');
    }

    this.broadcastDashboardUpdate();
    this.broadcastShiftUpdate();
    await this.updateShiftDataRealTime(paymentData.user_id);

    return {
      payment: {
        ...response.payment,
        amount: parseFloat(response.payment.amount) || 0,
        tip_amount: parseFloat(response.payment.tip_amount) || 0,
        change_amount: parseFloat(response.payment.change_amount) || 0,
        processed_at: DateTime.fromISO(response.payment.processed_at, { zone: 'Africa/Nairobi' }).toISO(),
        created_at: DateTime.fromISO(response.payment.created_at, { zone: 'Africa/Nairobi' }).toISO(),
      },
      receipt: {
        ...response.receipt,
        created_at: DateTime.fromISO(response.receipt.created_at, { zone: 'Africa/Nairobi' }).toISO(),
        receipt_data: response.receipt.receipt_data ? {
          ...response.receipt.receipt_data,
          subtotal: parseFloat(response.receipt.receipt_data.subtotal) || 0,
          tax_amount: parseFloat(response.receipt.receipt_data.tax_amount) || 0,
          discount_amount: parseFloat(response.receipt.receipt_data.discount_amount) || 0,
          tip_amount: parseFloat(response.receipt.receipt_data.tip_amount) || 0,
          total_amount: parseFloat(response.receipt.receipt_data.total_amount) || 0,
          change_amount: parseFloat(response.receipt.receipt_data.change_amount) || 0,
          timestamp: DateTime.fromISO(response.receipt.receipt_data.timestamp, { zone: 'Africa/Nairobi' }).toISO(),
          items: (response.receipt.receipt_data.items || []).map((item: any) => ({
            ...item,
            quantity: parseInt(item.quantity) || 0,
            unit_price: parseFloat(item.unit_price) || 0,
            total_price: parseFloat(item.total_price) || 0,
            modifiers: item.modifiers || [],
          })),
        } : {},
      },
    };
  }

  async reprintReceipt(orderId: string, userId: string): Promise<Receipt> {
    if (!orderId || !userId) {
      throw new Error('Invalid reprint request: orderId and userId are required');
    }

    const receipt = await this.request(`/receipts/${orderId}/reprint`, {
      method: 'POST',
      body: JSON.stringify({ user_id: userId }),
    });



    if (!receipt.receipt_data) {
      throw new Error('Invalid reprint response: receipt_data is missing');
    }

    return {
      ...receipt,
      created_at: DateTime.fromISO(receipt.created_at, { zone: 'Africa/Nairobi' }).toISO(),
      receipt_data: {
        ...receipt.receipt_data,
        subtotal: parseFloat(receipt.receipt_data.subtotal) || 0,
        tax_amount: parseFloat(receipt.receipt_data.tax_amount) || 0,
        discount_amount: parseFloat(receipt.receipt_data.discount_amount) || 0,
        tip_amount: parseFloat(receipt.receipt_data.tip_amount) || 0,
        total_amount: parseFloat(receipt.receipt_data.total_amount) || 0,
        change_amount: parseFloat(receipt.receipt_data.change_amount) || 0,
        timestamp: DateTime.fromISO(receipt.receipt_data.timestamp, { zone: 'Africa/Nairobi' }).toISO(),
        items: (receipt.receipt_data.items || []).map((item: any) => ({
          ...item,
          quantity: parseInt(item.quantity) || 0,
          unit_price: parseFloat(item.unit_price) || 0,
          total_price: parseFloat(item.total_price) || 0,
          modifiers: item.modifiers || [],
        })),
      },
    };
  }

  // Shifts
  async startShift(userId: string, startingCash: number): Promise<Shift> {
    if (!userId || startingCash == null || isNaN(startingCash)) {
      throw new Error('Invalid shift data: userId and startingCash are required and must be valid');
    }
    const shift = await this.request('/shifts/start', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, starting_cash: startingCash }),
    });
    return {
      ...shift,
      starting_cash: parseFloat(shift.starting_cash) || 0,
      ending_cash: shift.ending_cash ? parseFloat(shift.ending_cash) : undefined,
      total_sales: parseFloat(shift.total_sales) || 0,
      total_tips: parseFloat(shift.total_tips) || 0,
      total_orders: parseInt(shift.total_orders) || 0,
      cash_sales: parseFloat(shift.cash_sales) || 0,
      card_sales: parseFloat(shift.card_sales) || 0,
      mobile_sales: parseFloat(shift.mobile_sales) || 0,
      orders_by_type: shift.orders_by_type?.map((type: any) => ({
        order_type: type.order_type,
        count: parseInt(type.count) || 0,
        amount: parseFloat(type.amount) || 0,
      })) || [],
      start_time: DateTime.fromISO(shift.start_time, { zone: 'Africa/Nairobi' }).toISO(),
      end_time: shift.end_time ? DateTime.fromISO(shift.end_time, { zone: 'Africa/Nairobi' }).toISO() : undefined,
      currency: shift.currency || 'UGX',
    };
  }

  async endShift(userId: string, endingCash: number, notes?: string): Promise<Shift> {
    if (!userId || endingCash == null || isNaN(endingCash)) {
      throw new Error('Invalid shift data: userId and endingCash are required and must be valid');
    }
    try {
      const shift = await this.request('/shifts/end', {
        method: 'POST',
        body: JSON.stringify({ user_id: userId, ending_cash: endingCash, notes }),
      });
      return {
        ...shift,
        starting_cash: parseFloat(shift.starting_cash) || 0,
        ending_cash: parseFloat(shift.ending_cash) || 0,
        total_sales: parseFloat(shift.total_sales) || 0,
        total_tips: parseFloat(shift.total_tips) || 0,
        total_orders: parseInt(shift.total_orders) || 0,
        cash_sales: parseFloat(shift.cash_sales) || 0,
        card_sales: parseFloat(shift.card_sales) || 0,
        mobile_sales: parseFloat(shift.mobile_sales) || 0,
        orders_by_type: shift.orders_by_type?.map((type: any) => ({
          order_type: type.order_type,
          count: parseInt(type.count) || 0,
          amount: parseFloat(type.amount) || 0,
        })) || [],
        start_time: DateTime.fromISO(shift.start_time, { zone: 'Africa/Nairobi' }).toISO(),
        end_time: shift.end_time ? DateTime.fromISO(shift.end_time, { zone: 'Africa/Nairobi' }).toISO() : undefined,
        currency: shift.currency || 'UGX',
      };
    } catch (error) {
      if (error.message === 'Resource not found' && (await this.getCurrentShift(userId)) === null) {
        throw new Error('No active shift found');
      }
      throw error;
    }
  }

  async getCurrentShift(userId: string): Promise<Shift | null> {
    if (!userId) {
      throw new Error('Invalid userId: userId is required');
    }
    const shift = await this.request(`/shifts/current?user_id=${userId}`);
    if (!shift) return null;
    return {
      ...shift,
      starting_cash: parseFloat(shift.starting_cash) || 0,
      ending_cash: shift.ending_cash ? parseFloat(shift.ending_cash) : undefined,
      total_sales: parseFloat(shift.total_sales) || 0,
      total_tips: parseFloat(shift.total_tips) || 0,
      total_orders: parseInt(shift.total_orders) || 0,
      cash_sales: parseFloat(shift.cash_sales) || 0,
      card_sales: parseFloat(shift.card_sales) || 0,
      mobile_sales: parseFloat(shift.mobile_sales) || 0,
      orders_by_type: shift.orders_by_type?.map((type: any) => ({
        order_type: type.order_type,
        count: parseInt(type.count) || 0,
        amount: parseFloat(type.amount) || 0,
      })) || [],
      start_time: DateTime.fromISO(shift.start_time, { zone: 'Africa/Nairobi' }).toISO(),
      end_time: shift.end_time ? DateTime.fromISO(shift.end_time, { zone: 'Africa/Nairobi' }).toISO() : undefined,
      currency: shift.currency || 'UGX',
    };
  }

  // Admin endpoints
  async getUsers(): Promise<POSUser[]> {
    const users = await this.request('/users');
    return users.map((user: any) => ({
      ...user,
      is_active: user.is_active || false,
      last_login: user.last_login ? DateTime.fromISO(user.last_login, { zone: 'Africa/Nairobi' }).toISO() : null,
    }));
  }

  async createUser(userData: any): Promise<POSUser> {
    const user = await this.request('/users', {
      method: 'POST',
      body: JSON.stringify({
        ...userData,
        user_id: localStorage.getItem('user_id'),
      }),
    });
    return {
      ...user,
      is_active: user.is_active || false,
      last_login: user.last_login ? DateTime.fromISO(user.last_login, { zone: 'Africa/Nairobi' }).toISO() : null,
    };
  }

  async updateUser(userId: string, userData: any): Promise<POSUser> {
    if (!userId) {
      throw new Error('Invalid userId: userId is required');
    }
    const user = await this.request(`/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify({
        ...userData,
        user_id: localStorage.getItem('user_id'),
      }),
    });
    return {
      ...user,
      is_active: user.is_active || false,
      last_login: user.last_login ? DateTime.fromISO(user.last_login, { zone: 'Africa/Nairobi' }).toISO() : null,
    };
  }

  async deleteUser(userId: string): Promise<void> {
    if (!userId) {
      throw new Error('Invalid userId: userId is required');
    }
    await this.request(`/users/${userId}`, {
      method: 'DELETE',
      body: JSON.stringify({
        user_id: localStorage.getItem('user_id'),
      }),
    });
  }

  async toggleUserStatus(userId: string, isActive: boolean): Promise<void> {
    await this.request(`/users/${userId}/status`, {
      method: 'PUT',
      body: JSON.stringify({
        is_active: isActive,
        user_id: localStorage.getItem('user_id'),
      }),
    });
  }

  async logoutUser(userId: string): Promise<void> {
    await this.request(`/users/${userId}/logout`, {
      method: 'POST',
      body: JSON.stringify({
        user_id: localStorage.getItem('user_id'),
      }),
    });
  }

  async updateBusinessSettings(settingsData: any): Promise<any> {
    if (!settingsData.business_name || !settingsData.currency || settingsData.tax_rate === undefined) {
      throw new Error('Invalid settings data: business_name, currency, and tax_rate are required');
    }

    const settings = await this.request('/settings/business', {
      method: 'PUT',
      body: JSON.stringify({
        ...settingsData,
        user_id: localStorage.getItem('user_id'),
      }),
    });
    return {
      ...settings,
      tax_rate: parseFloat(settings.tax_rate) || 0,
      enable_kitchen_display: settings.enable_kitchen_display ?? false,
      enable_modifiers: settings.enable_modifiers ?? true,
      enable_tables: settings.enable_tables ?? true,
    };
  }

  async getBusinessSettings(): Promise<any> {
    const settings = await this.request('/settings/business');
    
    return {
      ...settings,
      tax_rate: parseFloat(settings.tax_rate) || 0,
      enable_kitchen_display: settings.enable_kitchen_display ?? false,
      enable_modifiers: settings.enable_modifiers ?? true,
      enable_tables: settings.enable_tables ?? true,
    };
  }

  async getSalesTrend(days: number): Promise<any> {
    if (!days || isNaN(days) || days <= 0) {
      throw new Error('Invalid days parameter: Must be a positive number');
    }
    const response = await this.request(`/dashboard/sales-trend?days=${days}`);
    return {
      labels: response.map((item: any) => item.date || ''),
      sales: response.map((item: any) => parseFloat(item.sales) || 0),
    };
  }

  async refreshShiftData(userId: string): Promise<Shift | null> {
    if (!userId) {
      throw new Error('Invalid userId: userId is required');
    }
    try {
      const shift = await this.getCurrentShift(userId);
      this.broadcastShiftUpdate();
      return shift;
    } catch (error) {
      return null;
    }
  }

  async getShiftsInDateRange(startDate: string, endDate: string, userId?: string): Promise<Shift[]> {
    try {
      if (!startDate || !endDate) {
        throw new Error('Invalid date range: startDate and endDate are required');
      }

      const start = DateTime.fromISO(startDate, { zone: 'Africa/Nairobi' });
      const end = DateTime.fromISO(endDate, { zone: 'Africa/Nairobi' });

      if (!start.isValid || !end.isValid) {
        throw new Error('Invalid date format: Use ISO 8601 format');
      }

      if (start > end) {
        throw new Error('Invalid date range: startDate must be before endDate');
      }

      let url = `/shifts/date-range?start=${encodeURIComponent(startDate)}&end=${encodeURIComponent(endDate)}`;
      if (userId) url += `&user_id=${encodeURIComponent(userId)}`;

      const response = await this.request(url);
      if (!response.shifts) {
  
        return [];
      }

      return response.shifts.map((shift: any) => ({
        id: shift.id,
        user_id: shift.user_id,
        starting_cash: parseFloat(shift.starting_cash) || 0,
        ending_cash: shift.ending_cash ? parseFloat(shift.ending_cash) : null,
        total_sales: parseFloat(shift.total_sales) || 0,
        total_tips: parseFloat(shift.total_tips) || 0,
        total_orders: parseInt(shift.total_orders) || 0,
        cash_sales: parseFloat(shift.cash_sales) || 0,
        card_sales: parseFloat(shift.card_sales) || 0,
        mobile_sales: parseFloat(shift.mobile_sales) || 0,
        orders_by_type: shift.orders_by_type || [],
        start_time: DateTime.fromISO(shift.start_time, { zone: 'Africa/Nairobi' }).isValid
          ? shift.start_time
          : DateTime.now().setZone('Africa/Nairobi').toISO(),
        end_time: shift.end_time && DateTime.fromISO(shift.end_time, { zone: 'Africa/Nairobi' }).isValid
          ? shift.end_time
          : null,
        notes: shift.notes || '',
        currency: shift.currency || 'UGX',
        server: shift.server || null,
        payments_summary: shift.payments_summary
          ? {
              cash_payments: parseFloat(shift.payments_summary.cash_payments) || 0,
              card_payments: parseFloat(shift.payments_summary.card_payments) || 0,
              mobile_payments: parseFloat(shift.payments_summary.mobile_payments) || 0,
              total_payment_tips: parseFloat(shift.payments_summary.total_payment_tips) || 0,
            }
          : {
              cash_payments: 0,
              card_payments: 0,
              mobile_payments: 0,
              total_payment_tips: 0,
            },
      }));
    } catch (error) {
      throw error;
    }
  }

  async getOrdersInDateRange(startDate: string, endDate: string): Promise<Order[]> {
    const response = await this.request(`/ordersreport/date-range?start=${encodeURIComponent(startDate)}&end=${encodeURIComponent(endDate)}`);
    return response.orders.map((order: any) => ({
      ...order,
      subtotal: parseFloat(order.subtotal) || 0,
      tax_amount: parseFloat(order.tax_amount) || 0,
      discount_amount: parseFloat(order.discount_amount) || 0,
      tip_amount: parseFloat(order.tip_amount) || 0,
      total_amount: parseFloat(order.total_amount) || 0,
      customer_count: parseInt(order.customer_count) || 0,
      estimated_time: parseInt(order.estimated_time) || 0,
      created_at: DateTime.fromISO(order.created_at, { zone: 'Africa/Nairobi' }).toISO(),
      items: order.items?.map((item: any) => ({
        ...item,
        quantity: parseInt(item.quantity) || 0,
        unit_price: parseFloat(item.unit_price) || 0,
        total_price: parseFloat(item.total_price) || 0,
        created_at: item.created_at ? DateTime.fromISO(item.created_at, { zone: 'Africa/Nairobi' }).toISO() : null,
        menu_item: item.menu_item ? {
          ...item.menu_item,
          price: parseFloat(item.menu_item.price) || 0,
          is_available: item.menu_item.is_available || false,
        } : null,
      })) || [],
      table: order.table ? {
        ...order.table,
        capacity: parseInt(order.table.capacity) || 0,
        x_position: parseFloat(order.table.x_position) || 0,
        y_position: parseFloat(order.table.y_position) || 0,
      } : null,
      server: order.server || null,
      currency: order.currency || 'UGX',
    }));
  }


  async updateShiftDataRealTime(userId: string, orderData: OrderData): Promise<void> {
    if (!userId) {
      return;
    }

    if (!orderData) {
      return;
    }

    try {
      const token = localStorage.getItem('pos_token');
      if (!token) {
        throw new Error('Authentication token not found');
      }

      await this.request('/shifts/update-realtime', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ user_id: userId, order_data: orderData }),
      });

      this.broadcastShiftRealtimeUpdate();

     
    } catch (error) {
      throw error;
    }
  }

  async cancelOrder(orderId: string, userId: string, reason?: string): Promise<CancelOrderResponse> {
    if (!orderId) {
    
      return { success: false, orderId: '', status: 'failed', reason: 'No orderId provided' };
    }

    if (!userId) {
      console.warn(JSON.stringify({
        timestamp: new Date().toLocaleString('en-US', { timeZone: 'Africa/Nairobi' }),
        level: 'warn',
        message: 'No userId provided for order cancellation',
      }, null, 2));
      return { success: false, orderId, status: 'failed', reason: 'No userId provided' };
    }

    try {
      const token = localStorage.getItem('pos_token');
      if (!token) {
        throw new Error('Authentication token not found');
      }

      await this.request(`/orders/${orderId}/cancel`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ user_id: userId, reason }),
      });
      return {
        success: true,
        orderId,
        status: 'cancelled',
        reason,
      };
    } catch (error) {
      throw error;
    }
  }

  // ERP API Methods
  // Suppliers
  async getSuppliers(): Promise<Supplier[]> {
    try {
      const response = await this.request('/api/suppliers');
      return Array.isArray(response) ? response : (response.suppliers || []);
    } catch (error) {
      throw error;
    }
  }

  async createSupplier(data: Omit<Supplier, 'id' | 'created_at' | 'updated_at'>): Promise<Supplier> {
    return this.request('/api/suppliers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateSupplier(id: string, data: Partial<Supplier>): Promise<Supplier> {
    return this.request(`/api/suppliers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteSupplier(id: string): Promise<void> {
    await this.request(`/api/suppliers/${id}`, { method: 'DELETE' });
  }

  // Expense Categories
  async getExpenseCategories(): Promise<ExpenseCategory[]> {
    return this.request('/api/expense-categories');
  }

  async createExpenseCategory(data: Omit<ExpenseCategory, 'id' | 'created_at'>): Promise<ExpenseCategory> {
    return this.request('/api/expense-categories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Expenses
  async getExpenses(): Promise<Expense[]> {
    return this.request('/api/expenses');
  }

  async createExpense(data: Omit<Expense, 'id' | 'expense_number' | 'created_at' | 'updated_at'>): Promise<Expense> {
  try {
    // Log the request payload
    const response = await this.request('/api/expenses', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    // Log the successful response

    return response as Expense;
  } catch (error) {
    // Log the error and response details if available
    throw error; // Re-throw to allow caller to handle
  }
}


  async updateExpense(id: string, data: Partial<Expense>): Promise<Expense> {
    return this.request(`/api/expenses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteExpense(id: string): Promise<void> {
    await this.request(`/api/expenses/${id}`, { method: 'DELETE' });
  }

  async approveExpense(id: string, userId: string): Promise<Expense> {
    return this.request(`/api/expenses/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ approved_by: userId }),
    });
  }

  // Purchase Orders
  async getPurchaseOrders(): Promise<PurchaseOrder[]> {
    return this.request('/api/purchase-orders');
  }

  async createPurchaseOrder(data: Omit<PurchaseOrder, 'id' | 'po_number' | 'created_at' | 'updated_at'>): Promise<PurchaseOrder> {
    return this.request('/api/purchase-orders', {
      method: 'POST',
      body: JSON.stringify({
        ...data,
        items: data.items?.map(item => ({
          menu_item_id: item.menu_item_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
        })),
      }),
    });
  }

  async updatePurchaseOrder(id: string, data: Partial<PurchaseOrder>): Promise<PurchaseOrder> {
    return this.request(`/api/purchase-orders/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async approvePurchaseOrder(id: string, userId: string): Promise<PurchaseOrder> {
    return this.request(`/api/purchase-orders/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ approved_by: userId }),
    });
  }

  async receivePurchaseOrder(id: string, items: Array<{ id: string; received_quantity: number }>): Promise<PurchaseOrder> {
    return this.request(`/api/purchase-orders/${id}/receive`, {
      method: 'POST',
      body: JSON.stringify({ items }),
    });
  }

  // Inventory
  async getInventoryItems(): Promise<InventoryItem[]> {
    return this.request('/api/inventory');
  }

  async updateInventoryItem(id: string, data: Partial<InventoryItem>): Promise<InventoryItem> {
    return this.request(`/api/inventory/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async adjustInventoryerp(id: string, adjustment: number, reason: string): Promise<InventoryItem> {
    return this.request(`/api/inventory/${id}/adjust`, {
      method: 'POST',
      body: JSON.stringify({ adjustment, reason }),
    });
  }

  // ERP Dashboard Stats
  async getERPDashboardStats(): Promise<ERPDashboardStats> {
    return this.request('/api/erp/dashboard-stats');
  }

  // ERP Reports
  async getExpenseReport(startDate: string, endDate: string): Promise<any> {
    return this.request(`/api/reports/expenses?start_date=${startDate}&end_date=${endDate}`);
  }

  async getPurchaseReport(startDate: string, endDate: string): Promise<any> {
    return this.request(`/api/reports/purchases?start_date=${startDate}&end_date=${endDate}`);
  }

  async getInventoryReport(): Promise<any> {
    return this.request('/api/reports/inventory');
  }

  // ERP Analytics
  async getSalesAnalytics(period: 'daily' | 'weekly' | 'monthly' = 'daily', days: number = 30): Promise<any> {
    return this.request(`/api/analytics/sales?period=${period}&days=${days}`);
  }

  async getExpenseAnalytics(period: 'daily' | 'weekly' | 'monthly' = 'daily', days: number = 30): Promise<any> {
    return this.request(`/api/analytics/expenses?period=${period}&days=${days}`);
  }

  async getProfitAnalytics(period: 'daily' | 'weekly' | 'monthly' = 'daily', days: number = 30): Promise<any> {
    return this.request(`/api/analytics/profit?period=${period}&days=${days}`);
  }
}

export async function printReceipt(receiptData: any) {
  try {
    const printerSettings = usePrinterStore.getState().settings;

    if (printerSettings.enabled && printerSettings.autoprint) {
      const result = await printToUSB(receiptData, printerSettings);

      if (result.success) {
        return {
          success: true,
          data: { message: 'Receipt printed successfully to USB printer' },
        };
      } else {
      }
    }

    try {
      const response = await fetch(`${API_BASE_URL}/print-receipt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(receiptData),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to print receipt');
      }

      return {
        success: true,
        data,
      };
    } catch (apiError) {

      return {
        success: false,
        error: 'Both USB and API printing failed',
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

export const posApi = new POSApi();