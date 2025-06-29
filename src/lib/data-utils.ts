import { ColumnInfo } from "@/types/dataset";

/**
 * Calculate statistics for a column based on its data type
 * This is adapted from the FileUploader component to be reusable
 */
export const calculateColumnStats = (
  columnData: any[], 
  type: 'numeric' | 'categorical' | 'datetime' | 'text' | 'boolean'
): Partial<ColumnInfo> => {
  const nonNullValues = columnData.filter(val =>
    val !== null &&
    val !== undefined &&
    val !== '' &&
    String(val).toUpperCase() !== 'NA' &&
    String(val).toUpperCase() !== 'NAN' &&
    String(val).toUpperCase() !== 'NULL' &&
    !(typeof val === 'number' && isNaN(val))
  );
  const stats: Partial<ColumnInfo> = {
    uniqueValues: new Set(nonNullValues).size,
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
      
      // Calculate skewness
      const skewnessResult = calculateSkewness(numericValues);
      stats.skewness = skewnessResult.skewness;
      stats.isSkewed = skewnessResult.isSkewed;
      
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
      
      // Use the new outlier detection algorithm
      const outlierIndices = getOutlierIndices(columnData);
      stats.outliers = outlierIndices.filter(Boolean).length;
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
 * Get outlier indices for a column using the IQR method
 * This follows the algorithm from the provided R function
 */
export const getOutlierIndices = (columnData: any[]): boolean[] => {
  // Create array to track outlier status for each value
  const outlierIndices = new Array(columnData.length).fill(false);
  
  // Convert values to strings and identify invalid values
  const stringValues = columnData.map(val => String(val));
  const invalidIndices = stringValues.map(val => 
    val === null || 
    val === undefined || 
    val === '' || 
    val.toUpperCase() === 'NA' || 
    val.toUpperCase() === 'NAN' || 
    val.toUpperCase() === 'NULL' ||
    isNaN(Number(val))
  );
  
  // Extract valid numeric values
  const numericValues: number[] = [];
  const validIndices: number[] = [];
  
  stringValues.forEach((val, idx) => {
    if (!invalidIndices[idx]) {
      const numVal = Number(val);
      if (!isNaN(numVal)) {
        numericValues.push(numVal);
        validIndices.push(idx);
      }
    }
  });
  
  // If no valid values, return array of false
  if (numericValues.length === 0) {
    return outlierIndices;
  }
  
  // Sort values to calculate quartiles
  numericValues.sort((a, b) => a - b);
  
  // Calculate quartiles
  const q1Index = Math.floor(numericValues.length * 0.25);
  const q3Index = Math.floor(numericValues.length * 0.75);
  const q1 = numericValues[q1Index];
  const q3 = numericValues[q3Index];
  
  // Calculate IQR and bounds
  const iqr = q3 - q1;
  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;
  
  // Mark outliers
  validIndices.forEach((originalIdx, idx) => {
    const val = numericValues[idx];
    if (val < lowerBound || val > upperBound) {
      outlierIndices[originalIdx] = true;
    }
  });
  
  return outlierIndices;
};

/**
 * Calculate skewness of a numerical column
 * Following the algorithm described in the skewness detection requirements
 * @param columnData Array of values to analyze
 * @param threshold Threshold to determine if skewness is significant (default = 1)
 * @returns Object with skewness value and a boolean indicating if it's significantly skewed
 */
export const calculateSkewness = (columnData: any[], threshold: number = 1): { skewness: number; isSkewed: boolean } => {
  // Filter out invalid values
  const numericValues = columnData
    .filter(val => 
      val !== null &&
      val !== undefined &&
      val !== '' &&
      String(val).toUpperCase() !== 'NA' &&
      String(val).toUpperCase() !== 'NAN' &&
      String(val).toUpperCase() !== 'NULL'
    )
    .map(Number)
    .filter(val => !isNaN(val));
  
  if (numericValues.length === 0) {
    return { skewness: 0, isSkewed: false };
  }
  
  // Calculate mean
  const mean = numericValues.reduce((sum, val) => sum + val, 0) / numericValues.length;
  
  // Calculate skewness using the formula: Σ((x-μ)³)/(n * σ³)
  // First, calculate the sum of cubed deviations from the mean
  const cubedDeviationsSum = numericValues.reduce(
    (sum, val) => sum + Math.pow(val - mean, 3), 0
  );
  
  // Calculate standard deviation
  const squaredDeviationsSum = numericValues.reduce(
    (sum, val) => sum + Math.pow(val - mean, 2), 0
  );
  const variance = squaredDeviationsSum / numericValues.length;
  const std = Math.sqrt(variance);
  
  // Calculate skewness
  const skewness = std === 0 
    ? 0 
    : cubedDeviationsSum / (numericValues.length * Math.pow(std, 3));
  
  // Determine if the data is significantly skewed
  const isSkewed = Math.abs(skewness) > threshold;
  
  return { skewness, isSkewed };
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

/**
 * Get all skewed columns from a dataset
 * @param dataset The dataset to analyze
 * @param threshold Threshold to determine significant skewness (default = 1)
 * @returns Array of column names that have significant skewness
 */
export const getSkewedColumns = (dataset: any[][], columnNames: string[], threshold: number = 1): string[] => {
  if (!dataset || !columnNames || dataset.length === 0) return [];
  
  const skewedColumns: string[] = [];
  
  // Transpose data for column-wise access
  const transposedData = Array.from({ length: columnNames.length }, (_, i) => 
    dataset.map(row => row[i])
  );
  
  transposedData.forEach((columnData, index) => {
    // First check if this column is numeric
    const type = inferDataType(columnData);
    if (type === 'numeric') {
      // Calculate skewness
      const { isSkewed } = calculateSkewness(columnData, threshold);
      
      if (isSkewed) {
        skewedColumns.push(columnNames[index]);
      }
    }
  });
  
  return skewedColumns;
};

/**
 * Detect CSV separator by analyzing the first few lines of CSV text
 * @param csvText The raw CSV text content
 * @param maxLinesToCheck Maximum number of lines to analyze (default: 5)
 * @returns The detected separator (',' or ';')
 */
export const detectCSVSeparator = (csvText: string, maxLinesToCheck: number = 5): ',' | ';' => {
  const lines = csvText.trim().split('\n').slice(0, maxLinesToCheck);
  
  if (lines.length === 0) {
    return ','; // Default to comma if no content
  }
  
  let commaCount = 0;
  let semicolonCount = 0;
  let commaConsistency = 0;
  let semicolonConsistency = 0;
  
  // Count occurrences and check consistency across lines
  const commaCountsPerLine: number[] = [];
  const semicolonCountsPerLine: number[] = [];
  
  lines.forEach(line => {
    const commasInLine = (line.match(/,/g) || []).length;
    const semicolonsInLine = (line.match(/;/g) || []).length;
    
    commaCount += commasInLine;
    semicolonCount += semicolonsInLine;
    commaCountsPerLine.push(commasInLine);
    semicolonCountsPerLine.push(semicolonsInLine);
  });
  
  // Calculate consistency (how uniform the separator count is across lines)
  // High consistency means the separator count is similar across lines
  if (commaCountsPerLine.length > 1) {
    const avgCommas = commaCount / commaCountsPerLine.length;
    const avgSemicolons = semicolonCount / semicolonCountsPerLine.length;
    
    // Calculate standard deviation to measure consistency
    const commaVariance = commaCountsPerLine.reduce((sum, count) => 
      sum + Math.pow(count - avgCommas, 2), 0) / commaCountsPerLine.length;
    const semicolonVariance = semicolonCountsPerLine.reduce((sum, count) => 
      sum + Math.pow(count - avgSemicolons, 2), 0) / semicolonCountsPerLine.length;
    
    // Lower variance means higher consistency
    commaConsistency = 1 / (1 + Math.sqrt(commaVariance));
    semicolonConsistency = 1 / (1 + Math.sqrt(semicolonVariance));
  }
  
  // Decision logic:
  // 1. If one separator has much higher count, choose it
  // 2. If counts are similar, choose the one with higher consistency
  // 3. If no clear winner, default to comma
  
  if (commaCount === 0 && semicolonCount === 0) {
    return ','; // No separators found, default to comma
  }
  
  if (commaCount === 0) {
    return ';'; // Only semicolons found
  }
  
  if (semicolonCount === 0) {
    return ','; // Only commas found
  }
  
  // Both separators present, use heuristics to decide
  const commaScore = commaCount * commaConsistency;
  const semicolonScore = semicolonCount * semicolonConsistency;
  
  // If one separator appears at least 3x more frequently, prefer it
  if (commaCount >= semicolonCount * 3) {
    return ',';
  }
  
  if (semicolonCount >= commaCount * 3) {
    return ';';
  }
  
  // Otherwise, choose based on combined score of frequency and consistency
  return commaScore >= semicolonScore ? ',' : ';';
};
