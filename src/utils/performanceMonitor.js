/**
 * Performance Monitoring Utility
 * Tracks Core Web Vitals and API performance
 */

class PerformanceMonitor {
  constructor() {
    this.metrics = {
      apiCalls: [],
      pageLoads: [],
      userInteractions: [],
    };
    this.isEnabled = process.env.NODE_ENV === 'production';
    
    // Expose to window for easy access in console
    if (typeof window !== 'undefined') {
      window.performanceMonitor = this;
    }
  }

  /**
   * Track API call performance
   */
  trackAPICall(url, method, duration, status) {
    if (!this.isEnabled) return;

    this.metrics.apiCalls.push({
      url,
      method,
      duration,
      status,
      timestamp: Date.now(),
    });

    // Keep only last 100 API calls
    if (this.metrics.apiCalls.length > 100) {
      this.metrics.apiCalls.shift();
    }

    // Log slow API calls (> 1 second)
    if (duration > 1000) {
      console.warn(`⚠️ Slow API call: ${method} ${url} took ${duration}ms`);
    }
  }

  /**
   * Track page load performance
   */
  trackPageLoad(pageName, loadTime) {
    if (!this.isEnabled) return;

    this.metrics.pageLoads.push({
      page: pageName,
      loadTime,
      timestamp: Date.now(),
    });

    // Keep only last 50 page loads
    if (this.metrics.pageLoads.length > 50) {
      this.metrics.pageLoads.shift();
    }
  }

  /**
   * Track Core Web Vitals
   */
  trackWebVitals() {
    if (!this.isEnabled || typeof window === 'undefined') return;

    if ('PerformanceObserver' in window) {
      try {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          if (lastEntry) {
            const lcp = lastEntry.renderTime || lastEntry.loadTime;
            if (lcp > 2500) {
              console.warn(`⚠️ LCP (Largest Contentful Paint) is ${Math.round(lcp)}ms (target: < 2500ms)`);
            } else {
              console.log(`✅ LCP: ${Math.round(lcp)}ms`);
            }
          }
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      } catch (e) {
        // PerformanceObserver not supported
      }
    }

    if ('PerformanceObserver' in window) {
      try {
        const fidObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry) => {
            const fid = entry.processingStart - entry.startTime;
            if (fid > 100) {
              console.warn(`⚠️ FID (First Input Delay) is ${Math.round(fid)}ms (target: < 100ms)`);
            } else {
              console.log(`✅ FID: ${Math.round(fid)}ms`);
            }
          });
        });
        fidObserver.observe({ entryTypes: ['first-input'] });
      } catch (e) {
        // PerformanceObserver not supported
      }
    }

    if ('PerformanceObserver' in window) {
      try {
        let clsValue = 0;
        const clsObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry) => {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
            }
          });
          if (clsValue > 0.1) {
            console.warn(`⚠️ CLS (Cumulative Layout Shift) is ${clsValue.toFixed(3)} (target: < 0.1)`);
          } else {
            console.log(`✅ CLS: ${clsValue.toFixed(3)}`);
          }
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });
      } catch (e) {
        // PerformanceObserver not supported
      }
    }
  }

  /**
   * Get performance summary
   */
  getSummary() {
    const apiCalls = this.metrics.apiCalls;
    const pageLoads = this.metrics.pageLoads;

    const avgAPIDuration = apiCalls.length > 0
      ? apiCalls.reduce((sum, call) => sum + call.duration, 0) / apiCalls.length
      : 0;

    const avgPageLoad = pageLoads.length > 0
      ? pageLoads.reduce((sum, load) => sum + load.loadTime, 0) / pageLoads.length
      : 0;

    const slowAPICalls = apiCalls.filter(call => call.duration > 1000);
    const failedAPICalls = apiCalls.filter(call => call.status >= 400);
    const successfulAPICalls = apiCalls.filter(call => call.status < 400);

    // Get slowest API calls
    const slowestCalls = [...apiCalls]
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 5)
      .map(call => ({
        url: call.url,
        method: call.method,
        duration: call.duration,
        status: call.status,
      }));

    // Get most frequent endpoints
    const endpointCounts = {};
    apiCalls.forEach(call => {
      const endpoint = call.url.split('?')[0]; // Remove query params
      endpointCounts[endpoint] = (endpointCounts[endpoint] || 0) + 1;
    });
    const mostFrequent = Object.entries(endpointCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([endpoint, count]) => ({ endpoint, count }));

    return {
      apiCalls: {
        total: apiCalls.length,
        averageDuration: Math.round(avgAPIDuration),
        slowCalls: slowAPICalls.length,
        failedCalls: failedAPICalls.length,
        successfulCalls: successfulAPICalls.length,
        successRate: apiCalls.length > 0 
          ? ((successfulAPICalls.length / apiCalls.length) * 100).toFixed(1) + '%'
          : 'N/A',
        slowestCalls,
        mostFrequentEndpoints: mostFrequent,
      },
      pageLoads: {
        total: pageLoads.length,
        averageLoadTime: Math.round(avgPageLoad),
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Print summary to console in a nice format
   */
  printSummary() {
    const summary = this.getSummary();
    
    console.group('📊 Performance Summary');
    console.log('Generated at:', summary.timestamp);
    
    console.group('🌐 API Calls');
    console.log('Total:', summary.apiCalls.total);
    console.log('Average Duration:', summary.apiCalls.averageDuration + 'ms');
    console.log('Success Rate:', summary.apiCalls.successRate);
    console.log('Slow Calls (>1s):', summary.apiCalls.slowCalls);
    console.log('Failed Calls:', summary.apiCalls.failedCalls);
    
    if (summary.apiCalls.slowestCalls.length > 0) {
      console.group('🐌 Slowest Calls');
      summary.apiCalls.slowestCalls.forEach((call, idx) => {
        console.log(`${idx + 1}. ${call.method} ${call.url} - ${call.duration}ms (${call.status})`);
      });
      console.groupEnd();
    }
    
    if (summary.apiCalls.mostFrequentEndpoints.length > 0) {
      console.group('📈 Most Frequent Endpoints');
      summary.apiCalls.mostFrequentEndpoints.forEach((ep, idx) => {
        console.log(`${idx + 1}. ${ep.endpoint} - ${ep.count} calls`);
      });
      console.groupEnd();
    }
    console.groupEnd();
    
    console.group('📄 Page Loads');
    console.log('Total:', summary.pageLoads.total);
    console.log('Average Load Time:', summary.pageLoads.averageLoadTime + 'ms');
    console.groupEnd();
    
    console.groupEnd();
    
    return summary;
  }

  /**
   * Get detailed API call history
   */
  getAPICallHistory(limit = 20) {
    return this.metrics.apiCalls.slice(-limit).reverse();
  }

  /**
   * Get page load history
   */
  getPageLoadHistory(limit = 10) {
    return this.metrics.pageLoads.slice(-limit).reverse();
  }

  /**
   * Clear metrics
   */
  clear() {
    this.metrics = {
      apiCalls: [],
      pageLoads: [],
      userInteractions: [],
    };
    console.log('✅ Performance metrics cleared');
  }
}

// Create singleton instance
const performanceMonitor = new PerformanceMonitor();

// Initialize Web Vitals tracking
if (typeof window !== 'undefined') {
  performanceMonitor.trackWebVitals();
  
  // Log instructions on first load
  console.log('%c📊 Performance Monitor Active', 'color: #1a8917; font-size: 14px; font-weight: bold');
  console.log('%cAccess performance data:', 'color: #666; font-size: 12px');
  console.log('  • window.performanceMonitor.getSummary() - Get summary');
  console.log('  • window.performanceMonitor.printSummary() - Print formatted summary');
  console.log('  • window.performanceMonitor.getAPICallHistory() - Get API call history');
  console.log('  • window.performanceMonitor.clear() - Clear metrics');
}

export default performanceMonitor;
