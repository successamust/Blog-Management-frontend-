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
      console.warn('Slow API call: ' + method + ' ' + url + ' took ' + duration + 'ms');
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
    // Simplified version - Web Vitals tracking disabled due to Vite build issues
    if (!this.isEnabled || typeof window === 'undefined') return;
    if (!('PerformanceObserver' in window)) return;
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
      .map(function (entry) {
        return { endpoint: entry[0], count: entry[1] };
      });

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
    console.log('Performance Summary:', summary);
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
    console.log('Performance metrics cleared');
  }
}

// Create singleton instance
const performanceMonitor = new PerformanceMonitor();

// Initialize Web Vitals tracking
if (typeof window !== 'undefined') {
  performanceMonitor.trackWebVitals();
}

export default performanceMonitor;
