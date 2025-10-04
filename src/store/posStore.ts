import { create } from 'zustand';
import { persist, PersistOptions } from 'zustand/middleware';
import { POSUser, Order, Table, MenuItem, MenuCategory, CartItem, BusinessSettings } from '../types/pos';
import { posApi } from '../lib/api';
import toast from 'react-hot-toast';
import { debounce } from '../pages/pos/utils/debounce';
import { performanceMonitor } from '../pages/pos/utils/performance';
import { invalidateInventoryCaches, invalidateMenuCaches } from '../lib/cache';

// Define interfaces (unchanged from your code)
interface Table {
  id: string;
  number: string | number;
  name?: string;
  capacity: number;
  status: 'available' | 'occupied' | 'reserved' | 'cleaning' | 'maintenance';
  [key: string]: any;
}

interface Shift {
  id: string;
  user_id: string;
  starting_cash: number;
  status: string;
  start_time: string;
  end_time?: string;
  ending_cash?: number;
  total_sales?: number;
  total_tips?: number;
  total_orders?: number;
  cash_sales?: number;
  card_sales?: number;
  mobile_sales?: number;
}

interface OrderData {
  items: {
    id: string;
    name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    special_instructions: string | null;
    modifiers: any[];
  }[];
  total: number;
  order_type: string;
  timestamp: string;
  order_id?: string;
  customer_name?: string | null;
  table_id?: string | null;
  created_by_name?: string | null;
  server?: { id: string; full_name: string } | null;
}

interface CancelOrderResponse {
  success: boolean;
  orderId: string;
  status: string;
  reason?: string;
}

interface POSState {
  currentUser: POSUser | null;
  currentShift: Shift | null;
  currentOrder: Order | null;
  selectedTable: Table | null;
  cart: CartItem[];
  orders: Order[];
  tables: Table[];
  menuItems: MenuItem[];
  categories: MenuCategory[];
  users: POSUser[];
  businessSettings: BusinessSettings | null;
  loading: boolean;
  discountType: 'percentage' | 'amount' | null;
  discountValue: number;
  currency: string | null;
  lastUpdate?: number;
  dataLoaded: {
    menuItems: boolean;
    categories: boolean;
    tables: boolean;
    orders: boolean;
    businessSettings: boolean;
  };
  isInitializing: boolean;
  pollingInterval: NodeJS.Timeout | null;
  lastPollingUpdate: number;
  isPolling: boolean;
  login: (staffId: string, pin: string) => Promise<boolean>;
  logout: () => void;
  startShift: (startingCash: number) => Promise<void>;
  endShift: (endingCash: number) => Promise<Shift>;
  getCurrentShift: (userId: string) => Promise<void>;
  selectTable: (table: Table | null) => void;
  addToCart: (item: MenuItem, modifiers?: any[], instructions?: string) => void;
  updateCartItem: (id: string, quantity: number, instructions?: string) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  setDiscount: (type: 'percentage' | 'amount' | null, value: number) => void;
  createOrder: (orderType: string, customerName?: string, sendToKitchen?: boolean) => Promise<Order>;
  sendToKitchen: (orderId: string) => Promise<void>;
  cancelOrder: (orderId: string, reason?: string) => Promise<void>;
  addItemsToOrder: (orderId: string, items: any[]) => Promise<void>;
  removeItemFromOrder: (orderId: string, itemId: string) => Promise<void>;
  printOrderInvoice: (orderId: string) => Promise<void>;
  processPayment: (
    orderId: string,
    paymentMethod: string,
    amount: number,
    tip?: number,
    cashReceived?: number,
    reference?: string
  ) => Promise<void>;
  fetchData: () => Promise<void>;
  setBusinessSettings: (settings: BusinessSettings) => void;
  setUsers: (users: POSUser[]) => void;
  setTables: (tables: Table[]) => void;
  playSound: (type: 'order_created' | 'order_ready' | 'payment_success') => void;
  updateShiftDataRealTime: (order_data: OrderData) => Promise<void>;
  initialize: () => Promise<void>;
  fetchDataLazy: (modules?: string[]) => Promise<void>;
  fetchCriticalData: () => Promise<void>;
  fetchNonCriticalData: () => Promise<void>;
  startPolling: () => void;
  stopPolling: () => void;
  refreshData: (modules?: string[]) => Promise<void>;
  invalidateStockCache: () => void;
  forceRefreshMenuItems: () => Promise<void>;
  forceRefreshCategories: () => Promise<void>;
}

export const usePOSStore = create<POSState>()(
  persist(
    (set, get) => ({
      currentUser: null,
      currentShift: null,
      currentOrder: null,
      selectedTable: null,
      cart: [],
      orders: [],
      tables: [],
      menuItems: [],
      categories: [],
      users: [],
      businessSettings: null,
      loading: false,
      discountType: null,
      discountValue: 0,
      currency: null,
      dataLoaded: {
        menuItems: false,
        categories: false,
        tables: false,
        orders: false,
        businessSettings: false,
      },
      isInitializing: false,
      pollingInterval: null,
      lastPollingUpdate: 0,
      isPolling: false,

      initialize: async () => {
        if (get().isInitializing) return;
        set({ isInitializing: true });
        try {
          await get().fetchBusinessSettingsOnly();
          setTimeout(() => get().fetchMenuDataOnly(), 50);
          setTimeout(() => get().fetchUserShiftOnly(), 200);
          setTimeout(() => get().fetchTablesAndOrders(), 500);
          setTimeout(() => get().startPolling(), 1000);
        } catch (error) {
          console.error(
            JSON.stringify(
              {
                timestamp: new Date().toISOString(),
                level: 'error',
                message: 'Failed to initialize POS system',
                error: error instanceof Error ? error.message : 'Unknown error',
              },
              null,
              2
            )
          );
          toast.error('Failed to initialize POS system');
        } finally {
          set({ isInitializing: false });
        }
      },

      fetchBusinessSettingsOnly: async () => {
        try {
          const fetchedSettings = await posApi.getBusinessSettings();
          set({
            businessSettings: {
              id: fetchedSettings.id || '',
              business_name: fetchedSettings.business_name,
              currency: fetchedSettings.currency || 'UGX',
              tax_rate: fetchedSettings.tax_rate ?? 0,
              receipt_footer: fetchedSettings.receipt_footer || 'Thank you for dining with us!',
              logo_url: fetchedSettings.logo_url || '',
              business_type: fetchedSettings.business_type || 'restaurant',
              address: fetchedSettings.address || null,
              phone: fetchedSettings.phone || null,
              email: fetchedSettings.email || null,
              enable_kitchen_display: fetchedSettings.enable_kitchen_display || false,
              enable_modifiers: fetchedSettings.enable_modifiers || true,
              enable_tables: fetchedSettings.enable_tables || true,
              created_at: fetchedSettings.created_at || '',
              updated_at: fetchedSettings.updated_at || '',
            },
            currency: fetchedSettings.currency || 'UGX',
            dataLoaded: { ...get().dataLoaded, businessSettings: true },
          });
          console.log('Business settings loaded');
        } catch (error) {
          console.error(
            JSON.stringify(
              {
                timestamp: new Date().toISOString(),
                level: 'error',
                message: 'Error loading business settings',
                error: error instanceof Error ? error.message : 'Unknown error',
              },
              null,
              2
            )
          );
          toast.error('Failed to load business settings');
        }
      },

      fetchMenuDataOnly: async () => {
        try {
          const [menuItems, categories] = await Promise.all([
            posApi.getMenuItems({ forceRefresh: true }),
            posApi.getMenuCategories({ forceRefresh: true }),
          ]);
          set({
            menuItems,
            categories,
            dataLoaded: {
              ...get().dataLoaded,
              menuItems: true,
              categories: true,
            },
            lastUpdate: Date.now(),
          });
        } catch (error) {
          console.error(
            JSON.stringify(
              {
                timestamp: new Date().toISOString(),
                level: 'error',
                message: 'Error loading menu data',
                error: error instanceof Error ? error.message : 'Unknown error',
              },
              null,
              2
            )
          );
          toast.error('Failed to load menu data');
        }
      },

      fetchUserShiftOnly: async () => {
        const { currentUser } = get();
        if (currentUser) {
          try {
            const shift = await posApi.getCurrentShift(currentUser.id);
            set({ currentShift: shift });
          } catch (error) {
            console.error(
              JSON.stringify(
                {
                  timestamp: new Date().toISOString(),
                  level: 'error',
                  message: 'Error loading user shift',
                  error: error instanceof Error ? error.message : 'Unknown error',
                },
                null,
                2
              )
            );
            toast.error('Failed to load shift data');
          }
        }
      },

      fetchTablesAndOrders: async () => {
        try {
          const [tables, orders] = await Promise.all([
            posApi.getTables(),
            posApi.getOrders(),
          ]);
          set({
            tables,
            orders,
            dataLoaded: {
              ...get().dataLoaded,
              tables: true,
              orders: true,
            },
            lastUpdate: Date.now(),
          });
        } catch (error) {
          console.error(
            JSON.stringify(
              {
                timestamp: new Date().toISOString(),
                level: 'error',
                message: 'Error loading tables and orders',
                error: error instanceof Error ? error.message : 'Unknown error',
              },
              null,
              2
            )
          );
          toast.error('Failed to load tables and orders');
        }
      },

      startPolling: () => {
        const { pollingInterval, isPolling } = get();
        if (isPolling || pollingInterval) return;
        set({ isPolling: true });
        const interval = setInterval(async () => {
          const { currentUser, lastPollingUpdate } = get();
          if (!currentUser) {
            get().stopPolling();
            return;
          }
          const now = Date.now();
          if (now - lastPollingUpdate < 2000) return;
          try {
            performanceMonitor.start('polling-update');
            await get().refreshData(['orders', 'tables']);
            if (currentUser?.id) {
              const shift = await posApi.getCurrentShift(currentUser.id);
              if (shift) set({ currentShift: shift });
            }
            set({ lastPollingUpdate: now, lastUpdate: now });
            performanceMonitor.end('polling-update');
          } catch (error) {
            console.error(
              JSON.stringify(
                {
                  timestamp: new Date().toISOString(),
                  level: 'error',
                  message: 'Error during polling',
                  error: error instanceof Error ? error.message : 'Unknown error',
                },
                null,
                2
              )
            );
          }
        }, 3000);
        set({ pollingInterval: interval });
      },

      stopPolling: () => {
        const { pollingInterval } = get();
        if (pollingInterval) {
          clearInterval(pollingInterval);
          set({ pollingInterval: null, isPolling: false });
        }
      },

      refreshData: async (modules = ['orders', 'tables']) => {
        try {
          const promises = [];
          if (modules.includes('orders')) {
            promises.push(
              posApi.getOrders({ limit: 50, status: ['open', 'sent_to_kitchen', 'preparing', 'ready'] }).then((data) => ({
                type: 'orders',
                data,
              }))
            );
          }
          if (modules.includes('tables')) {
            promises.push(posApi.getTables().then((data) => ({ type: 'tables', data })));
          }
          if (modules.includes('menuItems')) {
            promises.push(posApi.getMenuItems({ forceRefresh: true }).then((data) => ({ type: 'menuItems', data })));
          }
          if (modules.includes('categories')) {
            promises.push(posApi.getMenuCategories({ forceRefresh: true }).then((data) => ({ type: 'categories', data })));
          }
          if (modules.includes('users')) {
            promises.push(posApi.getUsers().then((data) => ({ type: 'users', data })));
          }
          const results = await Promise.allSettled(promises);
          results.forEach((result) => {
            if (result.status === 'fulfilled') {
              const { type, data } = result.value;
              set((state) => ({
                [type]: data,
                dataLoaded: { ...state.dataLoaded, [type]: true },
                lastUpdate: Date.now(),
              }));
            } else {
              console.error(
                JSON.stringify(
                  {
                    timestamp: new Date().toISOString(),
                    level: 'error',
                    message: `Failed to refresh ${result.reason}`,
                    error: result.reason,
                  },
                  null,
                  2
                )
              );
            }
          });
        } catch (error) {
          console.error(
            JSON.stringify(
              {
                timestamp: new Date().toISOString(),
                level: 'error',
                message: 'Error refreshing data',
                error: error instanceof Error ? error.message : 'Unknown error',
              },
              null,
              2
            )
          );
          toast.error('Failed to refresh data');
        }
      },

      invalidateStockCache: () => {
        invalidateInventoryCaches();
        invalidateMenuCaches();
        setTimeout(() => {
          get().forceRefreshMenuItems();
          get().forceRefreshCategories();
        }, 100);
      },

      forceRefreshMenuItems: async () => {
        try {
          const freshMenuItems = await posApi.getMenuItems({ forceRefresh: true });
          set((state) => ({
            menuItems: freshMenuItems,
            dataLoaded: { ...state.dataLoaded, menuItems: true },
            lastUpdate: Date.now(),
          }));
        } catch (error) {
          console.error(
            JSON.stringify(
              {
                timestamp: new Date().toISOString(),
                level: 'error',
                message: 'Error refreshing menu items',
                error: error instanceof Error ? error.message : 'Unknown error',
              },
              null,
              2
            )
          );
          toast.error('Failed to refresh menu items');
        }
      },

      forceRefreshCategories: async () => {
        try {
          const freshCategories = await posApi.getMenuCategories({ forceRefresh: true });
          set((state) => ({
            categories: freshCategories,
            dataLoaded: { ...state.dataLoaded, categories: true },
            lastUpdate: Date.now(),
          }));
        } catch (error) {
          console.error(
            JSON.stringify(
              {
                timestamp: new Date().toISOString(),
                level: 'error',
                message: 'Error refreshing categories',
                error: error instanceof Error ? error.message : 'Unknown error',
              },
              null,
              2
            )
          );
          toast.error('Failed to refresh categories');
        }
      },

      // Remaining methods (unchanged for brevity, but ensure they are included)
      login: async (staffId: string, pin: string) => {
        set({ loading: true, isInitializing: false });
        try {
          const { user, token } = await posApi.login(staffId, pin);
          set({ currentUser: user });
          localStorage.setItem('pos_token', token);
          localStorage.setItem('user_id', user.id);
          await get().initialize();
          return true;
        } catch (error) {
          console.error(
            JSON.stringify(
              {
                timestamp: new Date().toISOString(),
                level: 'error',
                message: 'Login failed',
                error: error instanceof Error ? error.message : 'Unknown error',
              },
              null,
              2
            )
          );
          toast.error(`Login failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
          return false;
        } finally {
          set({ loading: false });
        }
      },

      logout: () => {
        get().stopPolling();
        localStorage.removeItem('pos_token');
        localStorage.removeItem('user_id');
        set({
          currentUser: null,
          currentShift: null,
          cart: [],
          orders: [],
          dataLoaded: {
            menuItems: false,
            categories: false,
            tables: false,
            orders: false,
            businessSettings: false,
          },
          tables: [],
          menuItems: [],
          categories: [],
          users: [],
          businessSettings: null,
          currency: null,
          selectedTable: null,
          pollingInterval: null,
          isPolling: false,
        });
      },

      startShift: async (startingCash: number) => {
        const { currentUser } = get();
        if (!currentUser) throw new Error('No user logged in');
        set({ loading: true });
        try {
          const shift = await posApi.startShift(currentUser.id, startingCash);
          set({ currentShift: shift });
          setTimeout(() => get().refreshData(['orders']), 500);
        } catch (error) {
          console.error(
            JSON.stringify(
              {
                timestamp: new Date().toISOString(),
                level: 'error',
                message: 'Failed to start shift',
                error: error instanceof Error ? error.message : 'Unknown error',
              },
              null,
              2
            )
          );
          toast.error(`Failed to start shift: ${error instanceof Error ? error.message : 'Unknown error'}`);
          throw error;
        } finally {
          set({ loading: false });
        }
      },

      endShift: async (endingCash: number) => {
        const { currentUser } = get();
        if (!currentUser) throw new Error('No user logged in');
        if (endingCash < 0) throw new Error('Ending cash cannot be negative');
        set({ loading: true });
        try {
          const shift = await posApi.endShift(currentUser.id, endingCash);
          set({ currentShift: null });
          get().playSound('payment_success');
          setTimeout(() => get().refreshData(['orders', 'tables']), 1000);
          return shift;
        } catch (error) {
          console.error(
            JSON.stringify(
              {
                timestamp: new Date().toISOString(),
                level: 'error',
                message: 'Failed to end shift',
                error: error instanceof Error ? error.message : 'Unknown error',
              },
              null,
              2
            )
          );
          toast.error(`Failed to end shift: ${error instanceof Error ? error.message : 'Unknown error'}`);
          if (error instanceof Error && error.message.includes('No active shift')) {
            const updatedShift = await posApi.getCurrentShift(currentUser.id);
            set({ currentShift: updatedShift });
          }
          throw error;
        } finally {
          set({ loading: false });
        }
      },

      getCurrentShift: async (userId: string) => {
        set({ loading: true });
        try {
          const shift = await posApi.getCurrentShift(userId);
          set({ currentShift: shift });
          console.log('Current shift fetched');
        } catch (error) {
          console.error(
            JSON.stringify(
              {
                timestamp: new Date().toISOString(),
                level: 'error',
                message: 'Failed to fetch shift',
                error: error instanceof Error ? error.message : 'Unknown error',
              },
              null,
              2
            )
          );
          toast.error(`Failed to fetch shift: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
          set({ loading: false });
        }
      },

      selectTable: (table: Table | null) => {
        set({ selectedTable: table });
      },

      addToCart: (item: MenuItem, modifiers: any[] = [], instructions: string = '') => {
        if (item.track_inventory && item.inventory_count <= 0) {
          toast.error(`${item.name} is out of stock!`);
          return;
        }
        if (item.track_inventory && item.inventory_count <= item.minimum_stock) {
          toast.error(`${item.name} is running low on stock (${item.inventory_count} remaining)!`);
        }
        const cartItem: CartItem = {
          id: `${item.id}-${Date.now()}`,
          menu_item: item,
          quantity: 1,
          unit_price: item.price.toString(),
          total_price: item.price.toString(),
          modifiers: modifiers || [],
          special_instructions: instructions || null,
        };
        set((state) => ({ cart: [...state.cart, cartItem] }));
      },

      updateCartItem: (id: string, quantity: number, instructions?: string) => {
        set((state) => ({
          cart: state.cart
            .map((item) =>
              item.id === id
                ? {
                    ...item,
                    quantity,
                    total_price: (parseFloat(item.unit_price) * quantity).toFixed(2),
                    special_instructions: instructions || item.special_instructions,
                  }
                : item
            )
            .filter((item) => item.quantity > 0),
        }));
      },

      removeFromCart: (id: string) => {
        set((state) => ({ cart: state.cart.filter((item) => item.id !== id) }));
      },

      clearCart: () => {
        set({ cart: [], selectedTable: null, discountType: null, discountValue: 0 });
      },

      setDiscount: (type: 'percentage' | 'amount' | null, value: number) => {
        set({ discountType: type, discountValue: value });
      },

      createOrder: async (orderType: string, customerName = '', sendToKitchen = false) => {
        const { currentUser, selectedTable, cart, discountType, discountValue } = get();
        if (!currentUser) throw new Error('No user logged in');
        if (!get().currentShift) throw new Error('No active shift - please start your shift first');
        if (cart.length === 0) throw new Error('Cart is empty');
        if (orderType === 'dine_in' && !selectedTable) throw new Error('No table selected for dine-in order');

        const existingOrder = selectedTable
          ? get().orders.find(
              (order) => order.table?.id === selectedTable.id && !['paid', 'cancelled'].includes(order.status)
            )
          : null;

        for (const cartItem of cart) {
          const menuItem = cartItem.menu_item;
          if (menuItem.track_inventory && menuItem.inventory_count < cartItem.quantity) {
            throw new Error(
              `Insufficient inventory for ${menuItem.name}. Available: ${menuItem.inventory_count}, Required: ${cartItem.quantity}`
            );
          }
        }

        set({ loading: true });
        try {
          performanceMonitor.start('create-order-items');
          const items = cart.map((item) => ({
            menu_item_id: item.menu_item.id,
            quantity: item.quantity,
            unit_price: parseFloat(item.unit_price).toFixed(2),
            total_price: parseFloat(item.total_price).toFixed(2),
            modifiers: Array.isArray(item.modifiers) ? item.modifiers : [],
            special_instructions: item.special_instructions,
          }));
          performanceMonitor.end('create-order-items');

          let order;
          if (existingOrder) {
            order = await posApi.addItemsToOrder(existingOrder.id, items, currentUser.id);
            toast.success(`Items added to order ${existingOrder.order_number}`);
          } else {
            const orderData = {
              table_id: selectedTable?.id || null,
              customer_name: customerName || null,
              order_type: orderType,
              items,
              user_id: currentUser.id,
              discount_type: discountType,
              discount_value: discountValue.toString(),
              status: sendToKitchen ? 'sent_to_kitchen' : 'open',
              priority: items.some((item) => item.special_instructions?.toLowerCase().includes('urgent'))
                ? 'urgent'
                : 'normal',
              customer_count: 1,
              estimated_time: 15,
            };
            order = await posApi.createOrder(orderData);
            toast.success(`Order ${order.order_number} ${sendToKitchen ? 'sent to kitchen' : 'created'}`);
          }

          set({ currentOrder: order, cart: [], selectedTable: null, discountType: null, discountValue: 0 });
          setTimeout(() => get().refreshData(['orders']), 200);
          get().invalidateStockCache();
          if (sendToKitchen) get().playSound('order_created');
          return order;
        } catch (error) {
          console.error(
            JSON.stringify(
              {
                timestamp: new Date().toISOString(),
                level: 'error',
                message: `Failed to ${existingOrder ? 'add items to order' : 'create order'}`,
                error: error instanceof Error ? error.message : 'Unknown error',
              },
              null,
              2
            )
          );
          toast.error(
            `Failed to ${existingOrder ? 'add items to order' : 'create order'}: ${
              error instanceof Error ? error.message : 'Unknown error'
            }`
          );
          throw error;
        } finally {
          set({ loading: false });
        }
      },

      sendToKitchen: async (orderId: string) => {
        const { currentUser } = get();
        if (!currentUser) throw new Error('No user logged in');
        set({ loading: true });
        try {
          await posApi.updateOrderStatus(orderId, 'sent_to_kitchen', currentUser.id);
          setTimeout(() => get().refreshData(['orders']), 200);
          get().playSound('order_created');
          toast.success('Order sent to kitchen!');
        } catch (error) {
          console.error(
            JSON.stringify(
              {
                timestamp: new Date().toISOString(),
                level: 'error',
                message: 'Failed to send to kitchen',
                error: error instanceof Error ? error.message : 'Unknown error',
              },
              null,
              2
            )
          );
          toast.error(
            `Failed to send to kitchen: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
          throw error;
        } finally {
          set({ loading: false });
        }
      },

      cancelOrder: async (orderId: string, reason?: string) => {
        const { currentUser, orders } = get();
        if (!currentUser) throw new Error('No user logged in');
        set({ loading: true });
        try {
          const response: CancelOrderResponse = await posApi.cancelOrder(orderId, currentUser.id, reason);
          set((state) => ({
            orders: state.orders.map((order) =>
              order.id === orderId
                ? { ...order, status: response.status, cancellation_reason: response.reason }
                : order
            ),
            selectedTable: state.orders.find((o) => o.id === orderId)?.table_id === state.selectedTable?.id
              ? null
              : state.selectedTable,
          }));
          setTimeout(() => get().refreshData(['orders']), 200);
          get().playSound('order_created');
          toast.success('Order cancelled successfully');
        } catch (error) {
          console.error(
            JSON.stringify(
              {
                timestamp: new Date().toISOString(),
                level: 'error',
                message: 'Failed to cancel order',
                error: error instanceof Error ? error.message : 'Unknown error',
              },
              null,
              2
            )
          );
          toast.error(
            `Failed to cancel order: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
          throw error;
        } finally {
          set({ loading: false });
        }
      },

      addItemsToOrder: async (orderId: string, items: any[]) => {
        const { currentUser } = get();
        if (!currentUser) throw new Error('No user logged in');
        set({ loading: true });
        try {
          const { menuItems } = get();
          for (const cartItem of items) {
            const menuItem = menuItems.find((m: any) => m.id === cartItem.menu_item_id);
            if (!menuItem) {
              throw new Error(`Menu item with ID ${cartItem.menu_item_id} not found`);
            }
            if (menuItem.track_inventory && menuItem.inventory_count < cartItem.quantity) {
              throw new Error(
                `Insufficient inventory for ${menuItem.name}. Available: ${menuItem.inventory_count}, Required: ${cartItem.quantity}`
              );
            }
          }
          await posApi.addItemsToOrder(orderId, items, currentUser.id);
          setTimeout(() => get().refreshData(['orders']), 200);
          get().invalidateStockCache();
          toast.success('Items added to order successfully');
        } catch (error) {
          console.error(
            JSON.stringify(
              {
                timestamp: new Date().toISOString(),
                level: 'error',
                message: 'Failed to add items',
                error: error instanceof Error ? error.message : 'Unknown error',
              },
              null,
              2
            )
          );
          toast.error(
            `Failed to add items: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
          throw error;
        } finally {
          set({ loading: false });
        }
      },

      removeItemFromOrder: async (orderId: string, itemId: string) => {
        const { currentUser } = get();
        if (!currentUser) throw new Error('No user logged in');
        set({ loading: true });
        try {
          await posApi.removeItemFromOrder(orderId, itemId, currentUser.id);
          setTimeout(() => get().refreshData(['orders']), 200);
          get().invalidateStockCache();
          toast.success('Item removed from order');
        } catch (error) {
          console.error(
            JSON.stringify(
              {
                timestamp: new Date().toISOString(),
                level: 'error',
                message: 'Failed to remove item',
                error: error instanceof Error ? error.message : 'Unknown error',
              },
              null,
              2
            )
          );
          toast.error(
            `Failed to remove item: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
          throw error;
        } finally {
          set({ loading: false });
        }
      },

      printOrderInvoice: async (orderId: string) => {
        set({ loading: true });
        try {
          const result = await posApi.printOrderInvoice(orderId);
          if (result.success) {
            toast.success('Invoice sent to printer! 🖨️');
          } else {
            toast.error(`Failed to print invoice: ${result.error}`);
          }
        } catch (error) {
          console.error(
            JSON.stringify(
              {
                timestamp: new Date().toISOString(),
                level: 'error',
                message: 'Failed to print invoice',
                error: error instanceof Error ? error.message : 'Unknown error',
              },
              null,
              2
            )
          );
          toast.error(
            `Failed to print invoice: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
          throw error;
        } finally {
          set({ loading: false });
        }
      },

      processPayment: async (
        orderId: string,
        paymentMethod: string,
        amount: number,
        tip = 0,
        cashReceived = 0,
        reference = ''
      ) => {
        const { currentUser, orders } = get();
        if (!currentUser) throw new Error('No user logged in');
        set({ loading: true });
        try {
          let order = orders.find((o) => o.id === orderId);
          if (!order) {
            const orderResponse = await posApi.getOrder(orderId);
            if (!orderResponse || typeof orderResponse !== 'object') {
              throw new Error(`Order not found or invalid response for orderId: ${orderId}`);
            }
            order = orderResponse;
          }
          if (!order.id) {
            throw new Error(`Invalid order data: missing id for orderId: ${orderId}`);
          }
          await posApi.processPayment(orderId, {
            payment_method: paymentMethod,
            amount,
            tip_amount: tip,
            user_id: currentUser.id,
            cash_received: cashReceived,
            reference,
          });
          performanceMonitor.start('payment-state-update');
          set((state) => ({
            orders: state.orders.map((o) => (o.id === orderId ? { ...o, status: 'paid' } : o)),
            selectedTable: state.selectedTable?.id === order.table_id ? null : state.selectedTable,
          }));
          const shiftOrderData: OrderData = {
            items: order.items.map((item) => ({
              id: item.id,
              name: item.menu_item?.name || 'Unknown Item',
              quantity: item.quantity,
              unit_price: item.unit_price,
              total_price: item.total_price,
              special_instructions: item.special_instructions || null,
              modifiers: item.modifiers || [],
            })),
            total: amount,
            order_type: order.order_type,
            timestamp: order.created_at || new Date().toISOString(),
            order_id: order.id,
            customer_name: order.customer_name || null,
            table_id: order.table_id || null,
          };
          await get().updateShiftDataRealTime(shiftOrderData);
          performanceMonitor.end('payment-state-update');
          setTimeout(() => get().refreshData(['orders', 'tables']), 200);
          get().invalidateStockCache();
          get().playSound('payment_success');
          toast.success('Payment processed successfully');
        } catch (error) {
          console.error(
            JSON.stringify(
              {
                timestamp: new Date().toISOString(),
                level: 'error',
                message: 'Failed to process payment',
                error: error instanceof Error ? error.message : 'Unknown error',
              },
              null,
              2
            )
          );
          toast.error(
            `Failed to process payment: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
          throw error;
        } finally {
          set({ loading: false });
        }
      },

      updateShiftDataRealTime: async (order_data: OrderData) => {
        const { currentUser } = get();
        if (!currentUser) throw new Error('No user logged in');
        try {
          await posApi.updateShiftDataRealTime(currentUser.id, order_data);
        } catch (error) {
          console.error(
            JSON.stringify(
              {
                timestamp: new Date().toISOString(),
                level: 'error',
                message: 'Failed to update shift data',
                error: error instanceof Error ? error.message : 'Unknown error',
              },
              null,
              2
            )
          );
          toast.error(
            `Failed to update shift data: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
          throw error;
        }
      },

      fetchDataLazy: async (modules = ['all']) => {
        const { dataLoaded } = get();
        const modulesToLoad = [];
        if (modules.includes('all') || modules.includes('menuItems')) {
          modulesToLoad.push('menuItems');
        }
        if (modules.includes('all') || modules.includes('categories')) {
          modulesToLoad.push('categories');
        }
        if (modules.includes('all') || modules.includes('tables')) {
          modulesToLoad.push('tables');
        }
        if (modules.includes('all') || modules.includes('orders')) {
          modulesToLoad.push('orders');
        }
        if (modules.includes('all') || modules.includes('users')) {
          modulesToLoad.push('users');
        }
        if (modulesToLoad.length === 0) return;
        performanceMonitor.start(`lazy-load-${modulesToLoad.join('-')}`);
        try {
          const promises = [];
          if (modulesToLoad.includes('menuItems')) {
            promises.push(posApi.getMenuItems({ forceRefresh: true }).then((data) => ({ type: 'menuItems', data })));
          }
          if (modulesToLoad.includes('categories')) {
            promises.push(posApi.getMenuCategories({ forceRefresh: true }).then((data) => ({ type: 'categories', data })));
          }
          if (modulesToLoad.includes('tables')) {
            promises.push(posApi.getTables().then((data) => ({ type: 'tables', data })));
          }
          if (modulesToLoad.includes('orders')) {
            promises.push(posApi.getOrders().then((data) => ({ type: 'orders', data })));
          }
          if (modulesToLoad.includes('users')) {
            promises.push(posApi.getUsers().then((data) => ({ type: 'users', data })));
          }
          const results = await Promise.allSettled(promises);
          results.forEach((result) => {
            if (result.status === 'fulfilled') {
              const { type, data } = result.value;
              set((state) => ({
                [type]: data,
                dataLoaded: { ...state.dataLoaded, [type]: true },
                lastUpdate: Date.now(),
              }));
            } else {
              console.error(
                JSON.stringify(
                  {
                    timestamp: new Date().toISOString(),
                    level: 'error',
                    message: `Failed to load ${result.reason}`,
                    error: result.reason,
                  },
                  null,
                  2
                )
              );
              toast.error(`Failed to load ${result.reason}`);
            }
          });
          performanceMonitor.end(`lazy-load-${modulesToLoad.join('-')}`);
        } catch (error) {
          console.error(
            JSON.stringify(
              {
                timestamp: new Date().toISOString(),
                level: 'error',
                message: 'Error during lazy load',
                error: error instanceof Error ? error.message : 'Unknown error',
              },
              null,
              2
            )
          );
          toast.error('Failed to load data');
        }
      },

      fetchData: async () => {
        try {
          await get().fetchDataLazy(['menuItems', 'categories']);
          setTimeout(() => get().refreshData(['orders', 'tables']), 100);
        } catch (error) {
          console.error(
            JSON.stringify(
              {
                timestamp: new Date().toISOString(),
                level: 'error',
                message: 'Error fetching data',
                error: error instanceof Error ? error.message : 'Unknown error',
              },
              null,
              2
            )
          );
          toast.error('Failed to fetch data');
        }
      },

      setBusinessSettings: (settings: BusinessSettings) => {
        set({
          businessSettings: {
            id: settings.id || '',
            business_name: settings.business_name,
            currency: settings.currency || 'UGX',
            tax_rate: settings.tax_rate ?? 0,
            receipt_footer: settings.receipt_footer || 'Thank you for dining with us!',
            logo_url: settings.logo_url || '',
            business_type: settings.business_type || 'restaurant',
            address: settings.address || null,
            phone: settings.phone || null,
            email: settings.email || null,
            enable_kitchen_display: settings.enable_kitchen_display || false,
            enable_modifiers: settings.enable_modifiers || true,
            enable_tables: settings.enable_tables || true,
            created_at: settings.created_at || '',
            updated_at: settings.updated_at || '',
          },
          currency: settings.currency || 'UGX',
        });
      },

      setUsers: (users: POSUser[]) => {
        set({ users });
      },

      setTables: (tables: Table[]) => {
        set((state) => ({
          tables,
          selectedTable: state.selectedTable
            ? tables.find((t) => t.id === state.selectedTable!.id) || null
            : null,
        }));
      },

      playSound: (type: 'order_created' | 'order_ready' | 'payment_success') => {
        const audio = new Audio(`/sounds/${type}.mp3`);
        audio.play().catch((error) =>
          console.error(
            JSON.stringify(
              {
                timestamp: new Date().toISOString(),
                level: 'error',
                message: 'Error playing sound',
                error: error instanceof Error ? error.message : String(error),
              },
              null,
              2
            )
          )
        );
      },
    }),
    {
      name: 'pos-storage',
      partialize: (state) => ({
        currentUser: state.currentUser,
        currentShift: state.currentShift,
        cart: state.cart,
        selectedTable: state.selectedTable,
        discountType: state.discountType,
        discountValue: state.discountValue,
        currency: state.currency,
        businessSettings: state.businessSettings,
        users: state.users,
      }),
      version: 1,
      migrate: (persistedState: any, version: number) => {
        if (version < 1) {
          persistedState.selectedTable = persistedState.selectedTable ?? null;
        }
        return persistedState;
      },
    } as PersistOptions<POSState>
  )
);