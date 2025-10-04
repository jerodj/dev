/**
 * Performance monitoring utilities
 */

interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
}

class PerformanceMonitor {
  private metrics = new Map<string, PerformanceMetric>();

  start(name: string) {
    this.metrics.set(name, { name, startTime: performance.now() });
  }

  end(name: string) {
    const metric = this.metrics.get(name);
    if (metric) {
      const endTime = performance.now();
      const duration = endTime - metric.startTime;
      this.metrics.set(name, { ...metric, endTime, duration });
      return duration;
    }
    return 0;
  }

  getMetric(name: string) {
    return this.metrics.get(name);
  }

  getAllMetrics() {
    return Array.from(this.metrics.values());
  }

  clear() {
    this.metrics.clear();
  }
}

export const performanceMonitor = new PerformanceMonitor();

// Utility functions
export async function measureAsync<T>(name: string, operation: () => Promise<T>): Promise<T> {
  performanceMonitor.start(name);
  try {
    const result = await operation();
    performanceMonitor.end(name);
    return result;
  } catch (error) {
    performanceMonitor.end(name);
    throw error;
  }
}

export function measureSync<T>(name: string, operation: () => T): T {
  performanceMonitor.start(name);
  try {
    const result = operation();
    performanceMonitor.end(name);
    return result;
  } catch (error) {
    performanceMonitor.end(name);
    throw error;
  }
}

// Fixed RequestQueue with proper priority handling
interface QueuedRequest<T> {
  fn: () => Promise<T>;
  priority: number;
  resolve: (value: T) => void;
  reject: (reason?: any) => void;
  timestamp: number;
}

class RequestQueue {
  private queue: Array<QueuedRequest<any>> = [];
  private running = false;
  private maxConcurrent = 3; // Reduced concurrent requests
  private activeRequests = 0;
  private requestTimeout = 10000; // 10 second timeout

  add<T>(request: () => Promise<T>, priority = 0): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      // Add timeout handling
      const timeoutId = setTimeout(() => {
        reject(new Error('Request timeout'));
      }, this.requestTimeout);
      
      const wrappedRequest = async () => {
        try {
          const result = await request();
          clearTimeout(timeoutId);
          return result;
        } catch (error) {
          clearTimeout(timeoutId);
          throw error;
        }
      };
      
      this.queue.push({ 
        fn: wrappedRequest, 
        priority, 
        resolve, 
        reject,
        timestamp: Date.now()
      });
      
      // Sort queue: higher priority first
      this.queue.sort((a, b) => b.priority - a.priority);
      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.running) return;
    this.running = true;

    // Clean up old requests (older than 30 seconds)
    const now = Date.now();
    this.queue = this.queue.filter(req => now - req.timestamp < 30000);

    while (this.activeRequests < this.maxConcurrent && this.queue.length > 0) {
      const next = this.queue.shift();
      if (!next) break;

      this.activeRequests++;
      next.fn()
        .then(next.resolve)
        .catch(next.reject)
        .finally(() => {
          this.activeRequests--;
          // Small delay before processing next request
          setTimeout(() => this.processQueue(), 50);
        });
    }

    this.running = false;
  }

  clear() {
    this.queue = [];
    this.activeRequests = 0;
    this.running = false;
  }

  getStats() {
    return {
      queueLength: this.queue.length,
      activeRequests: this.activeRequests,
      maxConcurrent: this.maxConcurrent,
      oldestRequest: this.queue.length > 0 ? Date.now() - this.queue[0].timestamp : 0
    };
  }
}

export const requestQueue = new RequestQueue();

// Optimized data fetcher (unchanged)
export class OptimizedDataFetcher {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private pendingRequests = new Map<string, Promise<any>>();

  async fetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl = 5000,
    forceRefresh = false
  ): Promise<T> {
    if (!forceRefresh) {
      const cached = this.cache.get(key);
      if (cached && Date.now() - cached.timestamp < cached.ttl) {
        return cached.data;
      }
    }

    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key)!;
    }

    const request = fetcher()
      .then(data => {
        this.cache.set(key, { data, timestamp: Date.now(), ttl });
        this.pendingRequests.delete(key);
        return data;
      })
      .catch(error => {
        this.pendingRequests.delete(key);
        throw error;
      });

    this.pendingRequests.set(key, request);
    return request;
  }

  clearCache(pattern?: string) {
    if (pattern) {
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) this.cache.delete(key);
      }
    } else {
      this.cache.clear();
    }
  }

  getStats() {
    return {
      cacheSize: this.cache.size,
      pendingRequests: this.pendingRequests.size,
      cacheKeys: Array.from(this.cache.keys())
    };
  }
}

export const dataFetcher = new OptimizedDataFetcher();
