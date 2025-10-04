/**
 * Enhanced in-memory cache for API responses
 */
class APICache {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private defaultTTL = 5 * 60 * 1000; // 5 minutes

  set(key: string, data: any, ttl = this.defaultTTL) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  get<T = any>(key: string, { forceRefresh = false } = {}): T | null {
    const item = this.cache.get(key);
    if (!item) return null;

    if (forceRefresh || Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.data as T;
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  delete(key: string) {
    this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
  }

  invalidate(keys: string | string[]) {
    if (Array.isArray(keys)) {
      keys.forEach(k => this.cache.delete(k));
    } else {
      this.cache.delete(keys);
    }
  }

  async wrap<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl = this.defaultTTL,
    { forceRefresh = false }: { forceRefresh?: boolean } = {}
  ): Promise<T> {
    const cached = this.get<T>(key, { forceRefresh });
    if (cached) return cached;

    const data = await fetchFn();
    this.set(key, data, ttl);
    return data;
  }

  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
      totalMemory: JSON.stringify(Array.from(this.cache.values())).length
    };
  }
}

export const apiCache = new APICache();

export const CACHE_KEYS = {
  MENU_ITEMS: 'menu_items',
  CATEGORIES: 'menu_categories',
  TABLES: 'tables',
  ORDERS: 'orders',
  BUSINESS_SETTINGS: 'business_settings',
  USERS: 'users',
  DASHBOARD_STATS: 'dashboard_stats',
  CURRENT_SHIFT: (userId: string) => `current_shift_${userId}`,
  INVENTORY_ITEMS: 'inventory_items',
  INVENTORY_ADJUSTMENTS: 'inventory_adjustments',
};

export const CACHE_TTL = {
  STATIC_DATA: 10 * 60 * 1000, // 10 minutes (increased for better performance)
  DYNAMIC_DATA: 5 * 1000,     // 5s for inventory updates
  DASHBOARD_DATA: 30 * 1000,  // 30s (reduced dashboard refresh)
  USER_DATA: 5 * 60 * 1000,   // 5 minutes
  BUSINESS_SETTINGS: 30 * 60 * 1000, // 30 minutes
  INVENTORY_DATA: 3 * 1000,   // 3s for real-time inventory
};

/**
 * Lightweight fast cache for very short-lived data
 */
export const createFastCache = (ttl = 5000) => {
  const cache = new Map<string, { data: any; timestamp: number }>();

  return {
    get<T = any>(key: string, { forceRefresh = false } = {}): T | null {
      const item = cache.get(key);
      if (!item) return null;

      if (forceRefresh || Date.now() - item.timestamp > ttl) {
        cache.delete(key);
        return null;
      }
      return item.data as T;
    },
    set(key: string, data: any) {
      cache.set(key, { data, timestamp: Date.now() });
    },
    clear() {
      cache.clear();
    },
    delete(key: string) {
      cache.delete(key);
    },
    size() {
      return cache.size;
    },
    async wrap<T>(key: string, fetchFn: () => Promise<T>, { forceRefresh = false } = {}): Promise<T> {
      const cached = this.get<T>(key, { forceRefresh });
      if (cached) return cached;
      const data = await fetchFn();
      this.set(key, data);
      return data;
    }
  };
};

// Real-time caches
export const ordersCache = createFastCache(8000);   // 8s TTL
export const tablesCache = createFastCache(10000);  // 10s TTL
export const menuCache = createFastCache(5000);     // 5s TTL for inventory updates
export const inventoryCache = createFastCache(3000); // 3s TTL for real-time inventory

/**
 * Invalidate all inventory-related caches
 */
export const invalidateInventoryCaches = () => {
  apiCache.delete(CACHE_KEYS.MENU_ITEMS);
  apiCache.delete(CACHE_KEYS.INVENTORY_ITEMS);
  apiCache.delete(CACHE_KEYS.INVENTORY_ADJUSTMENTS);
  menuCache.clear();
  inventoryCache.clear();
};

/**
 * Invalidate menu-related caches
 */
export const invalidateMenuCaches = () => {
  apiCache.delete(CACHE_KEYS.MENU_ITEMS);
  apiCache.delete(CACHE_KEYS.CATEGORIES);
  menuCache.clear();
};