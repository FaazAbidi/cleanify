// Performance monitoring and optimization utilities

export interface PerformanceMetrics {
  startTime: number;
  endTime?: number;
  duration?: number;
  memoryUsage?: number;
  operationType: string;
}

class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetrics> = new Map();

  startOperation(operationId: string, operationType: string): void {
    this.metrics.set(operationId, {
      startTime: performance.now(),
      operationType
    });
  }

  endOperation(operationId: string): PerformanceMetrics | null {
    const metric = this.metrics.get(operationId);
    if (!metric) return null;

    const endTime = performance.now();
    metric.endTime = endTime;
    metric.duration = endTime - metric.startTime;
    
    // Get memory usage if available
    if ('memory' in performance) {
      metric.memoryUsage = (performance as any).memory.usedJSHeapSize;
    }

    return metric;
  }

  getMetrics(operationId: string): PerformanceMetrics | null {
    return this.metrics.get(operationId) || null;
  }

  clearMetrics(): void {
    this.metrics.clear();
  }

  logPerformance(operationId: string): void {
    const metric = this.getMetrics(operationId);
    if (metric && metric.duration) {
      console.log(`Performance [${metric.operationType}]: ${metric.duration.toFixed(2)}ms`, {
        operationId,
        duration: metric.duration,
        memoryUsage: metric.memoryUsage
      });
    }
  }
}

export const performanceMonitor = new PerformanceMonitor();

// Memory optimization utilities
export function createChunkedProcessor<T, R>(
  items: T[],
  processor: (chunk: T[]) => R[],
  chunkSize: number = 100
): Promise<R[]> {
  return new Promise((resolve) => {
    const results: R[] = [];
    let currentIndex = 0;

    function processChunk() {
      const chunk = items.slice(currentIndex, currentIndex + chunkSize);
      if (chunk.length === 0) {
        resolve(results);
        return;
      }

      const chunkResults = processor(chunk);
      results.push(...chunkResults);
      currentIndex += chunkSize;

      // Use setTimeout to yield control back to the browser
      setTimeout(processChunk, 0);
    }

    processChunk();
  });
}

// Debounced function for performance optimization
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Throttled function for performance optimization
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// Memory usage checker
export function getMemoryUsage(): number | null {
  if ('memory' in performance) {
    return (performance as any).memory.usedJSHeapSize;
  }
  return null;
}

// Check if dataset is considered "large" and needs optimization
export function isLargeDataset(rows: number, columns: number): boolean {
  const totalCells = rows * columns;
  return totalCells > 500000 || columns > 1000 || rows > 10000;
}

// Estimate memory usage for dataset
export function estimateDatasetMemory(rows: number, columns: number, avgCellSize: number = 20): number {
  return rows * columns * avgCellSize; // Rough estimate in bytes
}

// Progress calculator for chunked operations
export function createProgressTracker(totalItems: number) {
  let processedItems = 0;
  
  return {
    update: (itemsProcessed: number) => {
      processedItems += itemsProcessed;
      return Math.min(100, (processedItems / totalItems) * 100);
    },
    reset: () => {
      processedItems = 0;
    },
    getProgress: () => Math.min(100, (processedItems / totalItems) * 100)
  };
}

// Web Worker availability checker
export function isWebWorkerSupported(): boolean {
  return typeof Worker !== 'undefined';
}

// Sample data efficiently for large datasets
export function sampleData<T>(data: T[], maxSamples: number, strategy: 'random' | 'systematic' = 'systematic'): T[] {
  if (data.length <= maxSamples) return data;
  
  if (strategy === 'random') {
    const sampled: T[] = [];
    const indices = new Set<number>();
    
    while (indices.size < maxSamples) {
      indices.add(Math.floor(Math.random() * data.length));
    }
    
    return Array.from(indices).sort((a, b) => a - b).map(i => data[i]);
  } else {
    // Systematic sampling
    const step = Math.ceil(data.length / maxSamples);
    const sampled: T[] = [];
    
    for (let i = 0; i < data.length; i += step) {
      sampled.push(data[i]);
      if (sampled.length >= maxSamples) break;
    }
    
    return sampled;
  }
}

// Optimize object for memory usage
export function optimizeForMemory<T extends Record<string, any>>(obj: T): T {
  // Remove undefined values and empty objects/arrays
  const optimized = {} as T;
  
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined && value !== null) {
      if (Array.isArray(value) && value.length > 0) {
        optimized[key as keyof T] = value;
      } else if (typeof value === 'object' && Object.keys(value).length > 0) {
        optimized[key as keyof T] = value;
      } else if (typeof value !== 'object') {
        optimized[key as keyof T] = value;
      }
    }
  }
  
  return optimized;
}

/**
 * Performance utilities for handling large datasets
 */

export interface DatasetPerformanceInfo {
  columnCount: number;
  rowCount: number;
  isLarge: boolean;
  isVeryLarge: boolean;
  shouldUseSampling: boolean;
  recommendedSampleSize: number;
  estimatedMemoryUsage: number; // in MB
}

/**
 * Analyze dataset performance characteristics
 */
export const analyzeDatasetPerformance = (
  columnCount: number,
  rowCount: number
): DatasetPerformanceInfo => {
  const isLarge = columnCount > 1000 || rowCount > 5000;
  const isVeryLarge = columnCount > 2000 || rowCount > 10000;
  const shouldUseSampling = rowCount > 5000;
  
  // Estimate memory usage (rough calculation)
  // Assuming average of 8 bytes per cell (mixed data types)
  const estimatedMemoryUsage = (columnCount * rowCount * 8) / (1024 * 1024);
  
  // Calculate recommended sample size based on dataset size
  let recommendedSampleSize = rowCount;
  if (shouldUseSampling) {
    if (rowCount > 50000) {
      recommendedSampleSize = 5000;
    } else if (rowCount > 20000) {
      recommendedSampleSize = 3000;
    } else {
      recommendedSampleSize = 2000;
    }
  }
  
  return {
    columnCount,
    rowCount,
    isLarge,
    isVeryLarge,
    shouldUseSampling,
    recommendedSampleSize,
    estimatedMemoryUsage
  };
};

/**
 * Get performance-optimized bucket count for histograms
 */
export const getOptimalBucketCount = (
  dataSize: number,
  uniqueValueCount: number,
  range: number
): number => {
  // Use Sturges' formula as base: k = 1 + log2(n)
  let buckets = Math.ceil(1 + Math.log2(dataSize));
  
  // Apply performance optimizations
  if (dataSize > 10000) {
    buckets = Math.min(buckets, 10); // Very conservative for large datasets
  } else if (dataSize > 1000) {
    buckets = Math.min(buckets, 15); // Conservative for medium datasets
  } else if (uniqueValueCount < 10) {
    buckets = uniqueValueCount; // One bucket per unique value
  } else if (range < 10 && uniqueValueCount > 5) {
    buckets = Math.min(uniqueValueCount, 20); // High resolution for small ranges
  }
  
  // Ensure reasonable bounds
  return Math.max(5, Math.min(buckets, 20));
};

/**
 * Create a random sample from an array
 */
export const createRandomSample = <T>(
  data: T[],
  sampleSize: number,
  seed?: number
): T[] => {
  if (data.length <= sampleSize) {
    return [...data];
  }
  
  // Simple random sampling using Fisher-Yates shuffle
  const sample = [...data];
  let currentIndex = sample.length;
  
  // If seed is provided, use a simple seeded random generator
  let random = seed ? () => {
    const x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
  } : Math.random;
  
  // Shuffle first sampleSize elements
  while (currentIndex > sample.length - sampleSize) {
    const randomIndex = Math.floor(random() * currentIndex);
    currentIndex--;
    
    // Swap elements
    [sample[currentIndex], sample[randomIndex]] = [sample[randomIndex], sample[currentIndex]];
  }
  
  return sample.slice(-sampleSize);
};

/**
 * Monitor performance of a function execution
 */
export const measurePerformance = async <T>(
  operation: () => Promise<T> | T,
  operationName: string
): Promise<{ result: T; executionTime: number; memoryUsed?: number }> => {
  const startTime = performance.now();
  
  // Measure memory if available
  const startMemory = (performance as any).memory?.usedJSHeapSize;
  
  try {
    const result = await operation();
    const endTime = performance.now();
    const executionTime = endTime - startTime;
    
    const endMemory = (performance as any).memory?.usedJSHeapSize;
    const memoryUsed = startMemory && endMemory ? endMemory - startMemory : undefined;
    
    if (executionTime > 1000) {
      console.warn(`⚠️ Slow operation detected: ${operationName} took ${executionTime.toFixed(2)}ms`);
    }
    
    if (memoryUsed && memoryUsed > 10 * 1024 * 1024) { // > 10MB
      console.warn(`⚠️ High memory usage: ${operationName} used ${(memoryUsed / 1024 / 1024).toFixed(2)}MB`);
    }
    
    return { result, executionTime, memoryUsed };
  } catch (error) {
    const endTime = performance.now();
    console.error(`❌ Error in ${operationName}:`, error);
    console.error(`Operation failed after ${(endTime - startTime).toFixed(2)}ms`);
    throw error;
  }
};

/**
 * Check if the browser has enough memory for an operation
 */
export const checkMemoryAvailability = (requiredMemoryMB: number): boolean => {
  const memory = (performance as any).memory;
  if (!memory) return true; // Assume available if we can't check
  
  const availableMemory = (memory.jsHeapSizeLimit - memory.usedJSHeapSize) / (1024 * 1024);
  return availableMemory > requiredMemoryMB;
};

/**
 * Get performance recommendations for a dataset
 */
export const getPerformanceRecommendations = (
  performanceInfo: DatasetPerformanceInfo
): string[] => {
  const recommendations: string[] = [];
  
  if (performanceInfo.isVeryLarge) {
    recommendations.push("Consider using data sampling for analysis");
    recommendations.push("Limit visualization complexity");
    recommendations.push("Enable lazy loading for data views");
  } else if (performanceInfo.isLarge) {
    recommendations.push("Use optimized distribution calculations");
    recommendations.push("Consider pagination for large column lists");
  }
  
  if (performanceInfo.estimatedMemoryUsage > 100) {
    recommendations.push("High memory usage detected - consider data streaming");
  }
  
  if (performanceInfo.columnCount > 5000) {
    recommendations.push("Consider column filtering or grouping");
  }
  
  return recommendations;
}; 