import { ColumnInfo } from "@/types/dataset";

/**
 * Calculate statistics for a column based on its data type
 * This is adapted from the FileUploader component to be reusable
 */
export const calculateColumnStats = (
  columnData: any[], 
  type: 'numeric' | 'categorical' | 'datetime' | 'text' | 'boolean'
): Partial<ColumnInfo> => {
  const nonNullValues = columnData.filter(val => val !== null && val !== undefined && val !== '');
  const stats: Partial<ColumnInfo> = {
    uniqueValues: new Set(columnData).size,
    missingValues: columnData.length - nonNullValues.length,
    missingPercent: ((columnData.length - nonNullValues.length) / columnData.length) * 100,
  };

  if (type === 'numeric') {
    const numericValues = nonNullValues.map(Number).filter(val => !isNaN(val));
    if (numericValues.length > 0) {
      numericValues.sort((a, b) => a - b);
      stats.min = Math.min(...numericValues);
      stats.max = Math.max(...numericValues);
      stats.mean = numericValues.reduce((a, b) => a + b, 0) / numericValues.length;
      stats.median = numericValues[Math.floor(numericValues.length / 2)];
      
      // Calculate standard deviation
      const mean = stats.mean as number;
      stats.std = Math.sqrt(
        numericValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / numericValues.length
      );
      
      // Calculate distribution (histogram with buckets covering full range)
      const distribution: Record<string | number, number> = {};
      
      // Dynamically determine optimal number of buckets based on data size and range
      const min = stats.min as number;
      const max = stats.max as number;
      const range = max - min;
      const uniqueValueCount = new Set(numericValues).size;
      
      // Use Sturges' formula as a starting point: k = 1 + log2(n)
      // but with modifications for different data characteristics
      let buckets = Math.ceil(1 + Math.log2(numericValues.length));
      
      // If range is very large compared to number of values, adjust bucket count
      if (range > numericValues.length * 10) {
        buckets = Math.min(buckets, 15); // Cap at 15 buckets for very large ranges
      } else if (uniqueValueCount < 10) {
        // For few unique values, use one bucket per unique value
        buckets = uniqueValueCount;
      } else if (range < 10 && uniqueValueCount > 5) {
        // For small ranges with many unique values, increase resolution
        buckets = Math.min(uniqueValueCount, 20);
      }
      
      // Ensure at least 5 buckets for better visualization, but no more than 20
      buckets = Math.max(5, Math.min(buckets, 20));
      
      // Handle edge case with zero or very small range
      const bucketSize = range <= 0 ? 1 : range / buckets;
      
      for (let i = 0; i < buckets; i++) {
        const bucketMin = min + i * bucketSize;
        const bucketMax = i === buckets - 1 ? max + 0.0001 : min + (i + 1) * bucketSize; // Ensure last bucket includes max value
        const bucketKey = bucketMin.toFixed(2); // String key that matches the expected type
        
        distribution[bucketKey] = numericValues.filter(
          val => val >= bucketMin && (i === buckets - 1 ? val <= bucketMax : val < bucketMax)
        ).length;
      }
      stats.distribution = distribution;
      
      // Simple outlier detection (values outside 1.5 * IQR)
      const q1Index = Math.floor(numericValues.length / 4);
      const q3Index = Math.floor(3 * numericValues.length / 4);
      const iqr = numericValues[q3Index] - numericValues[q1Index];
      stats.outliers = numericValues.filter(
        val => val < numericValues[q1Index] - 1.5 * iqr || val > numericValues[q3Index] + 1.5 * iqr
      ).length;
    }
  } else if (type === 'categorical' || type === 'boolean') {
    // Calculate frequency distribution
    const distribution: Record<string, number> = {};
    nonNullValues.forEach(val => {
      distribution[val] = (distribution[val] || 0) + 1;
    });
    stats.distribution = distribution;
    
    // Find mode
    let maxFreq = 0;
    let mode: string | undefined;
    Object.entries(distribution).forEach(([val, freq]) => {
      if (freq > maxFreq) {
        maxFreq = freq;
        mode = val;
      }
    });
    stats.mode = mode;
  }
  
  return stats;
};

/**
 * Infer data type from column values
 */
export const inferDataType = (values: any[]): 'numeric' | 'categorical' | 'datetime' | 'text' | 'boolean' => {
  const nonNullValues = values.filter(val => val !== null && val !== undefined && val !== '');
  if (nonNullValues.length === 0) return 'text';

  const numericCount = nonNullValues.filter(val => !isNaN(Number(val))).length;
  const booleanCount = nonNullValues.filter(val => val === 'true' || val === 'false' || val === true || val === false).length;
  const dateCount = nonNullValues.filter(val => !isNaN(Date.parse(String(val)))).length;

  if (numericCount / nonNullValues.length > 0.8) return 'numeric';
  if (booleanCount / nonNullValues.length > 0.8) return 'boolean';
  if (dateCount / nonNullValues.length > 0.8) return 'datetime';
  
  const uniqueValuesRatio = new Set(nonNullValues).size / nonNullValues.length;
  return uniqueValuesRatio < 0.2 ? 'categorical' : 'text';
}; 