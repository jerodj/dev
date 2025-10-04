import { apiCache, CACHE_KEYS, CACHE_TTL } from './cache';

// Admin-specific cache keys
export const ADMIN_CACHE_KEYS = {
  MENU_ITEMS: 'admin_menu_items',
  MENU_CATEGORIES: 'admin_menu_categories',
  USERS: 'admin_users',
  TABLES: 'admin_tables',
  BUSINESS_SETTINGS: 'admin_business_settings',
  SUPPLIERS: 'admin_suppliers',
  EXPENSES: 'admin_expenses',
  PURCHASE_ORDERS: 'admin_purchase_orders',
  INVENTORY_ITEMS: 'admin_inventory_items',
  INVENTORY_ADJUSTMENTS: 'admin_inventory_adjustments',
};

// Admin-specific cache TTL configurations
export const ADMIN_CACHE_TTL = {
  MENU_DATA: 2 * 60 * 1000, // 2 minutes for menu items and categories
  USER_DATA: 5 * 60 * 1000, // 5 minutes for user data
  TABLE_DATA: 3 * 60 * 1000, // 3 minutes for table data
  BUSINESS_SETTINGS: 10 * 60 * 1000, // 10 minutes for business settings
  ERP_DATA: 2 * 60 * 1000, // 2 minutes for ERP data
};

/**
 * Admin cache manager with optimized caching strategies
 */
class AdminCacheManager {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private pendingRequests = new Map<string, Promise<any>>();

  /**
   * Get data from cache or fetch if not available/expired
   */
  async getOrFetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl = ADMIN_CACHE_TTL.MENU_DATA,
    forceRefresh = false
  ): Promise<T> {
    // Check cache first
    if (!forceRefresh) {
      const cached = this.cache.get(key);
      if (cached && Date.now() - cached.timestamp < cached.ttl) {
        return cached.data;
      }
    }

    // Check if request is already pending
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key);
    }

    // Create new request
    const request = fetcher().then(data => {
      this.cache.set(key, {
        data,
        timestamp: Date.now(),
        ttl
      });
      this.pendingRequests.delete(key);
      return data;
    }).catch(error => {
      this.pendingRequests.delete(key);
      throw error;
    });

    this.pendingRequests.set(key, request);
    return request;
  }

  /**
   * Set data in cache
   */
  set(key: string, data: any, ttl = ADMIN_CACHE_TTL.MENU_DATA) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  /**
   * Invalidate specific cache key
   */
  invalidate(key: string) {
    this.cache.delete(key);
    this.pendingRequests.delete(key);
  }

  /**
   * Invalidate multiple cache keys by pattern
   */
  invalidatePattern(pattern: string) {
    const keysToDelete = Array.from(this.cache.keys()).filter(key => key.includes(pattern));
    keysToDelete.forEach(key => {
      this.cache.delete(key);
      this.pendingRequests.delete(key);
    });
  }

  /**
   * Clear all cache
   */
  clear() {
    this.cache.clear();
    this.pendingRequests.clear();
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      cacheSize: this.cache.size,
      pendingRequests: this.pendingRequests.size,
      cacheKeys: Array.from(this.cache.keys()),
      totalMemory: JSON.stringify(Array.from(this.cache.values())).length
    };
  }

  /**
   * Preload data for better UX
   */
  async preloadAdminData(modules: string[] = ['all']) {
    const { posApi } = await import('./api');
    
    const preloadPromises = [];

    if (modules.includes('all') || modules.includes('menu')) {
      preloadPromises.push(
        this.getOrFetch(ADMIN_CACHE_KEYS.MENU_ITEMS, () => posApi.getMenuItems(), ADMIN_CACHE_TTL.MENU_DATA),
        this.getOrFetch(ADMIN_CACHE_KEYS.MENU_CATEGORIES, () => posApi.getMenuCategories(), ADMIN_CACHE_TTL.MENU_DATA)
      );
    }

    if (modules.includes('all') || modules.includes('users')) {
      preloadPromises.push(
        this.getOrFetch(ADMIN_CACHE_KEYS.USERS, () => posApi.getUsers(), ADMIN_CACHE_TTL.USER_DATA)
      );
    }

    if (modules.includes('all') || modules.includes('tables')) {
      preloadPromises.push(
        this.getOrFetch(ADMIN_CACHE_KEYS.TABLES, () => posApi.getTables(), ADMIN_CACHE_TTL.TABLE_DATA)
      );
    }

    if (modules.includes('all') || modules.includes('business')) {
      preloadPromises.push(
        this.getOrFetch(ADMIN_CACHE_KEYS.BUSINESS_SETTINGS, () => posApi.getBusinessSettings(), ADMIN_CACHE_TTL.BUSINESS_SETTINGS)
      );
    }

    try {
      await Promise.allSettled(preloadPromises);
    } catch (error) {
    }
  }
}

export const adminCache = new AdminCacheManager();

// Cache invalidation helpers
export const invalidateAdminCache = {
  menu: () => {
    adminCache.invalidatePattern('menu');
    apiCache.delete(CACHE_KEYS.MENU_ITEMS);
    apiCache.delete(CACHE_KEYS.CATEGORIES);
    // Also invalidate inventory-related caches
    apiCache.delete(CACHE_KEYS.INVENTORY_ITEMS);
    menuCache.clear();
    inventoryCache.clear();
    
    // Trigger menu management refresh event
    window.dispatchEvent(new CustomEvent('menuManagementRefresh'));
  },
  users: () => {
    adminCache.invalidate(ADMIN_CACHE_KEYS.USERS);
    apiCache.delete(CACHE_KEYS.USERS);
  },
  tables: () => {
    adminCache.invalidate(ADMIN_CACHE_KEYS.TABLES);
    apiCache.delete(CACHE_KEYS.TABLES);
  },
  business: () => {
    adminCache.invalidate(ADMIN_CACHE_KEYS.BUSINESS_SETTINGS);
    apiCache.delete(CACHE_KEYS.BUSINESS_SETTINGS);
  },
  inventory: () => {
    adminCache.invalidatePattern('inventory');
    apiCache.delete(CACHE_KEYS.MENU_ITEMS);
    apiCache.delete(CACHE_KEYS.INVENTORY_ITEMS);
    apiCache.delete(CACHE_KEYS.INVENTORY_ADJUSTMENTS);
    menuCache.clear();
    inventoryCache.clear();
    
    // Trigger menu management refresh event for inventory changes
    window.dispatchEvent(new CustomEvent('menuManagementRefresh'));
  },
  all: () => {
    adminCache.clear();
    apiCache.clear();
    menuCache.clear();
    inventoryCache.clear();
    
    // Trigger all refresh events
    window.dispatchEvent(new CustomEvent('menuManagementRefresh'));
    window.dispatchEvent(new CustomEvent('inventoryUpdated'));
  }
};