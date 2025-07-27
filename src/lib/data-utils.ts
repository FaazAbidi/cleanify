import { ColumnInfo, ColumnMapping, DatasetType } from "@/types/dataset";

/**
 * Map internal detailed types to simplified QUANTITATIVE/QUALITATIVE types
 */
const mapToSimplifiedType = (detailedType: 'numeric' | 'categorical' | 'datetime' | 'text' | 'boolean'): 'QUANTITATIVE' | 'QUALITATIVE' => {
  return detailedType === 'numeric' ? 'QUANTITATIVE' : 'QUALITATIVE';
};

/**
 * Calculate statistics with sampling for large datasets
 */
const calculateStatsWithSampling = (
  sampledValues: any[], 
  type: 'QUANTITATIVE' | 'QUALITATIVE',
  originalLength: number,
  missingCount: number
): Partial<ColumnInfo> => {
  const stats: Partial<ColumnInfo> = {
    type,
    uniqueValues: new Set(sampledValues).size,
    missingValues: missingCount,
    missingPercent: (missingCount / originalLength) * 100,
  };

  if (type === 'QUANTITATIVE') {
    const numericValues = sampledValues.map(Number).filter(val => !isNaN(val));
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
      
      // Simplified distribution for large datasets (fixed 15 buckets for performance)
      const buckets = 15;
      const range = (stats.max as number) - (stats.min as number);
      const bucketSize = range <= 0 ? 1 : range / buckets;
      const distribution: Record<string, number> = {};

      console.log(`Creating distribution for sampled QUANTITATIVE data:`, {
        min: stats.min, 
        max: stats.max, 
        range, 
        buckets, 
        bucketSize,
        numericValuesCount: numericValues.length
      });

      // First initialize all buckets to ensure a complete distribution
      for (let i = 0; i < buckets; i++) {
        const bucketMin = (stats.min as number) + i * bucketSize;
        const bucketKey = bucketMin.toFixed(2);
        distribution[bucketKey] = 0;
      }

      // Then populate the distribution with actual counts
      numericValues.forEach(val => {
        const bucketIndex = Math.min(Math.floor((val - (stats.min as number)) / bucketSize), buckets - 1);
        const bucketKey = ((stats.min as number) + bucketIndex * bucketSize).toFixed(2);
        distribution[bucketKey]++;
      });

      console.log(`Sampled distribution created:`, {
        distributionKeys: Object.keys(distribution).length,
        hasData: Object.values(distribution).some(v => v > 0),
        totalCounted: Object.values(distribution).reduce((sum, v) => sum + v, 0),
        shouldEqual: numericValues.length
      });

      stats.distribution = distribution;
      
      // Simplified outlier detection for performance
      stats.outliers = 0; // Skip outlier calculation for large datasets
    }
  } else {
    // For qualitative, limit to top categories
    const distribution: Record<string, number> = {};
    sampledValues.forEach(val => {
      distribution[String(val)] = (distribution[String(val)] || 0) + 1;
    });
    
    // Only keep top 20 categories for performance
    const sortedEntries = Object.entries(distribution)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 20);
    
    stats.distribution = Object.fromEntries(sortedEntries);
    
    // Find mode from sampled data
    let maxFreq = 0;
    let mode: string | undefined;
    sortedEntries.forEach(([val, freq]) => {
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
 * Calculate statistics for a column based on its data type
 * This is adapted from the FileUploader component to be reusable
 */
export const calculateColumnStats = (
  columnData: any[], 
  type: 'QUANTITATIVE' | 'QUALITATIVE'
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
  
  const missingCount = columnData.length - nonNullValues.length;
  
  // Performance optimization: Use sampling for very large datasets
  if (columnData.length > 5000) {
    console.warn(`⚠️ Large dataset detected (${columnData.length} rows), using sampling for distribution calculation`);
    // Sample the data for distribution calculation
    const sampleSize = Math.min(2000, nonNullValues.length);
    const sampledValues = nonNullValues.length <= sampleSize 
      ? nonNullValues 
      : nonNullValues
          .map(value => ({ value, sort: Math.random() }))
          .sort((a, b) => a.sort - b.sort)
          .slice(0, sampleSize)
          .map(({ value }) => value);
    
    return calculateStatsWithSampling(sampledValues, type, columnData.length, missingCount);
  }

  // Analyze data type consistency
  const consistencyAnalysis = analyzeDataTypeConsistency(columnData);
  
  const stats: Partial<ColumnInfo> = {
    type, // Use the simplified type directly since it's already simplified
    uniqueValues: new Set(nonNullValues).size,
    missingValues: missingCount,
    missingPercent: (missingCount / columnData.length) * 100,
    // Include consistency information
    hasMixedTypes: consistencyAnalysis.hasMixedTypes,
    inconsistencyRatio: consistencyAnalysis.inconsistencyRatio,
    typeBreakdown: consistencyAnalysis.typeBreakdown,
  };

  if (type === 'QUANTITATIVE') {
    const numericValues = nonNullValues.map(Number).filter(val => !isNaN(val));
    console.log(`Processing QUANTITATIVE column with ${numericValues.length} values:`, { 
      nonNullCount: nonNullValues.length, 
      numericCount: numericValues.length 
    });
    
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
      const distribution: Record<string, number> = {};
      
      // Dynamically determine optimal number of buckets based on data size and range
      const min = stats.min as number;
      const max = stats.max as number;
      const range = max - min;
      const uniqueValueCount = new Set(numericValues).size;
      
      console.log(`QUANTITATIVE distribution calculation:`, { min, max, range, uniqueValueCount });
      
      // Use Sturges' formula as a starting point: k = 1 + log2(n)
      // but with modifications for different data characteristics
      let buckets = Math.ceil(1 + Math.log2(numericValues.length));
      
      // Performance optimization: limit buckets for large datasets
      if (numericValues.length > 1000) {
        buckets = Math.min(buckets, 15); // Cap at 15 buckets for large datasets
      } else if (range > numericValues.length * 10) {
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
      
      console.log(`QUANTITATIVE buckets calculation:`, { buckets, bucketSize });
      
      // Initialize all bucket keys to ensure we have a complete distribution
      for (let i = 0; i < buckets; i++) {
        const bucketMin = min + i * bucketSize;
        const bucketKey = bucketMin.toFixed(2);
        distribution[bucketKey] = 0;
      }
      
      // Now populate the buckets with values
      for (let i = 0; i < buckets; i++) {
        const bucketMin = min + i * bucketSize;
        const bucketMax = i === buckets - 1 ? max + 0.0001 : min + (i + 1) * bucketSize; // Ensure last bucket includes max value
        const bucketKey = bucketMin.toFixed(2); // String key that matches the expected type
        
        const count = numericValues.filter(
          val => val >= bucketMin && (i === buckets - 1 ? val <= bucketMax : val < bucketMax)
        ).length;
        
        distribution[bucketKey] = count;
      }
      
      const distributionStats = {
        keys: Object.keys(distribution).length,
        hasData: Object.values(distribution).some(v => v > 0),
        totalCounted: Object.values(distribution).reduce((sum, v) => sum + v, 0),
        shouldEqual: numericValues.length
      };
      
      console.log(`QUANTITATIVE distribution created:`, distributionStats);
      console.log("Sample distribution:", Object.entries(distribution).slice(0, 3));
      
      const distributionObj = {...distribution}; // Make a separate copy
      stats.distribution = distribution;

      // Debug: Check that distribution has been correctly added to stats
      console.log(`Distribution added to QUANTITATIVE stats:`, {
        columnWithType: `${type} column`,
        hasDistribution: !!stats.distribution,
        keyCount: Object.keys(distributionObj).length,
        totalCount: Object.values(distributionObj).reduce((sum, val) => sum + val, 0),
        sampleKeys: Object.keys(distributionObj).slice(0, 3)
      });
      
      // Use the new outlier detection algorithm (but skip for very large datasets)
      if (numericValues.length <= 1000) {
        const outlierIndices = getOutlierIndices(columnData);
        stats.outliers = outlierIndices.filter(Boolean).length;
      } else {
        stats.outliers = 0; // Skip outlier calculation for performance
      }
      
      // Explicitly check that distribution is attached to stats
      console.log("Final QUANTITATIVE stats has distribution:", stats.distribution !== undefined);
    } else {
      console.warn("QUANTITATIVE column has no valid numeric values");
    }
  } else if (type === 'QUALITATIVE') {
    // Calculate frequency distribution
    const distribution: Record<string, number> = {};
    nonNullValues.forEach(val => {
      const key = String(val);
      distribution[key] = (distribution[key] || 0) + 1;
    });
    
    // For large datasets with many categories, limit to top categories
    if (Object.keys(distribution).length > 100) {
      const sortedEntries = Object.entries(distribution)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 50); // Keep top 50 categories for performance
      stats.distribution = Object.fromEntries(sortedEntries);
    } else {
      stats.distribution = distribution;
    }
    
    // Find mode
    let maxFreq = 0;
    let mode: string | undefined;
    Object.entries(stats.distribution).forEach(([val, freq]) => {
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
 * Analyze data type consistency within a column
 * Returns information about mixed data types
 */
export const analyzeDataTypeConsistency = (values: any[]): {
  hasMixedTypes: boolean;
  typeBreakdown: {
    numeric: number;
    string: number;
    boolean: number;
    null: number;
    total: number;
  };
  inconsistencyRatio: number;
} => {
  const nonNullValues = values.filter(val => val !== null && val !== undefined && val !== '');
  const totalValues = values.length;
  
  if (nonNullValues.length === 0) {
    return {
      hasMixedTypes: false,
      typeBreakdown: { numeric: 0, string: 0, boolean: 0, null: totalValues, total: totalValues },
      inconsistencyRatio: 0
    };
  }

  let numericCount = 0;
  let stringCount = 0;
  let booleanCount = 0;
  let nullCount = totalValues - nonNullValues.length;

  nonNullValues.forEach(val => {
    const strVal = String(val).toLowerCase().trim();
    
    // Check for boolean values first
    if (strVal === 'true' || strVal === 'false' || val === true || val === false) {
      booleanCount++;
    }
    // Check for numeric values
    else if (!isNaN(Number(val)) && isFinite(Number(val))) {
      numericCount++;
    }
    // Everything else is treated as string
    else {
      stringCount++;
    }
  });

  const typeBreakdown = {
    numeric: numericCount,
    string: stringCount,
    boolean: booleanCount,
    null: nullCount,
    total: totalValues
  };

  // Count how many different data types are present (ignoring nulls for this calculation)
  const presentTypes = [
    numericCount > 0,
    stringCount > 0,
    booleanCount > 0
  ].filter(Boolean).length;

  const hasMixedTypes = presentTypes > 1;
  
  // Calculate inconsistency ratio: what proportion of the data is "minority types"
  const majorityCount = Math.max(numericCount, stringCount, booleanCount);
  const minorityCount = nonNullValues.length - majorityCount;
  const inconsistencyRatio = nonNullValues.length > 0 ? minorityCount / nonNullValues.length : 0;

  return {
    hasMixedTypes,
    typeBreakdown,
    inconsistencyRatio
  };
};

/**
 * Infer data type from column values using detailed analysis, then map to simplified type
 */
export const inferDataType = (values: any[]): 'QUANTITATIVE' | 'QUALITATIVE' => {
  const nonNullValues = values.filter(val => val !== null && val !== undefined && val !== '');
  if (nonNullValues.length === 0) return 'QUALITATIVE';

  const numericCount = nonNullValues.filter(val => !isNaN(Number(val))).length;
  const booleanCount = nonNullValues.filter(val => val === 'true' || val === 'false' || val === true || val === false).length;
  const dateCount = nonNullValues.filter(val => !isNaN(Date.parse(val))).length;

  if (numericCount / nonNullValues.length > 0.8) return 'QUANTITATIVE';
  return 'QUALITATIVE';
};

/**
 * Infer simplified data type from column values (QUANTITATIVE/QUALITATIVE)
 */
export const inferSimplifiedDataType = (values: any[]): 'QUANTITATIVE' | 'QUALITATIVE' => {
  return inferDataType(values);
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
    // First check if this column is numeric (using detailed type for internal calculations)
    const type = inferDataType(columnData);
    if (type === 'QUANTITATIVE') {
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

export const isNumericColumn = (values: any[]): boolean => {
  // First check if this column is numeric (using detailed type for internal calculations)
  const detailedType = inferDataTypeDetailed(values);
  if (detailedType === 'numeric') {
    return true;
  }
  return false;
};

/**
 * Infer detailed data type from column values (for internal use)
 */
const inferDataTypeDetailed = (values: any[]): 'numeric' | 'categorical' | 'datetime' | 'text' | 'boolean' => {
  const nonNullValues = values.filter(val => val !== null && val !== undefined && val !== '');
  if (nonNullValues.length === 0) return 'text';

  const numericCount = nonNullValues.filter(val => !isNaN(Number(val))).length;
  const booleanCount = nonNullValues.filter(val => val === 'true' || val === 'false' || val === true || val === false).length;
  const dateCount = nonNullValues.filter(val => !isNaN(Date.parse(val))).length;
  const uniqueValuesRatio = new Set(nonNullValues).size / nonNullValues.length;

  if (numericCount / nonNullValues.length > 0.8) return 'numeric';
  if (booleanCount / nonNullValues.length > 0.8) return 'boolean';
  if (dateCount / nonNullValues.length > 0.8) return 'datetime';

  return uniqueValuesRatio < 0.2 ? 'categorical' : 'text';
};

/**
 * Create data types object from column data for storage in TaskMethods.data_types
 * Uses the "originalName$id" format to handle duplicate column names
 */
export const createDataTypesFromColumns = (columns: ColumnInfo[], dataset: DatasetType | null): Record<string, 'QUANTITATIVE' | 'QUALITATIVE'> => {
  const dataTypes: Record<string, 'QUANTITATIVE' | 'QUALITATIVE'> = {};
  
  if (!columns || columns.length === 0) {
    console.error('createDataTypesFromColumns: No columns provided');
    return dataTypes;
  }
  
  console.log(`Creating data types for ${columns.length} columns`);
  
  columns.forEach((column, index) => {
    try {
      // Create key ONLY in the format "originalName$columnId" to handle duplicate column names
      const formattedColumnKey = formatColumnNameWithId(column.name, column.originalName, index);
      dataTypes[formattedColumnKey] = column.type;
      
      // Debug log for the first few columns
      if (index < 5) {
        console.log(`Column ${index} key: ${formattedColumnKey}, type: ${column.type}, name: ${column.name}, originalName: ${column.originalName}`);
      }
    } catch (error) {
      console.error(`Error formatting column key for column ${column.name}:`, error);
    }
  });
  
  console.log(`Created ${Object.keys(dataTypes).length} data type entries`);
  
  return dataTypes;
};

/**
 * Create column info array from stored data types and column data
 * Handles data types stored in "originalName$id" format
 */
export const createColumnsFromDataTypes = (
  rawData: any[][],
  columnNames: string[],
  storedDataTypes: Record<string, 'QUANTITATIVE' | 'QUALITATIVE'>,
  columnMapping?: ColumnMapping
): ColumnInfo[] => {
  const columns: ColumnInfo[] = [];
  
  for (let i = 0; i < columnNames.length; i++) {
    const name = columnNames[i];
    const columnData = rawData.map(row => row[i]);
    
    // Get original name from column mapping if available
    const originalName = columnMapping?.idToOriginalMap?.[name];
    
    // First try to find data type using the formatted name$id key
    const formattedKey = originalName ? `${originalName}$${name}` : name;
    
    // Try to get stored data type using formatted key, then try using just the column name,
    // otherwise infer the type from data
    const type = 
      storedDataTypes[formattedKey] || 
      storedDataTypes[name] || 
      inferSimplifiedDataType(columnData);
    
    // Calculate stats using the determined type
    const stats = calculateColumnStats(columnData, type);
    
    const columnInfo: ColumnInfo = {
      name,
      originalName, // Set original name if available
      type, // Use the stored/determined type
      uniqueValues: stats.uniqueValues || 0,
      missingValues: stats.missingValues || 0,
      missingPercent: stats.missingPercent || 0,
      // Explicitly set stats properties
      distribution: stats.distribution,
      min: stats.min,
      max: stats.max,
      mean: stats.mean,
      median: stats.median,
      mode: stats.mode,
      std: stats.std,
      outliers: stats.outliers,
      skewness: stats.skewness,
      isSkewed: stats.isSkewed,
      hasMixedTypes: stats.hasMixedTypes,
      inconsistencyRatio: stats.inconsistencyRatio,
      typeBreakdown: stats.typeBreakdown
    };
    
    columns.push(columnInfo);
  }
  
  return columns;
};

/**
 * Infer data types for a new original data version
 * Uses the "originalName$id" format for column keys
 */
export const inferDataTypesForOriginalData = (
  rawData: any[][],
  columnNames: string[],
  dataset: DatasetType | null
): Record<string, 'QUANTITATIVE' | 'QUALITATIVE'> => {
  const dataTypes: Record<string, 'QUANTITATIVE' | 'QUALITATIVE'> = {};
  
  for (let i = 0; i < columnNames.length; i++) {
    const name = columnNames[i];
    const columnData = rawData.map(row => row[i]);
    
    // Format the column name using name$id format if dataset is available
    const columnKey = dataset ? formatColumnNameWithId(name, dataset) : name;
    dataTypes[columnKey] = inferSimplifiedDataType(columnData);
  }
  
  return dataTypes;
};

/**
 * Get parent version's data types for inheritance
 */
export const getParentDataTypes = async (parentVersionId: number): Promise<Record<string, 'QUANTITATIVE' | 'QUALITATIVE'> | null> => {
  try {
    const { supabase } = await import('@/integrations/supabase/client');
    
    const { data, error } = await supabase
      .from('TaskMethods')
      .select('data_types')
      .eq('id', parentVersionId)
      .single();
    
    if (error) {
      console.error('Error fetching parent data types:', error);
      return null;
    }
    
    return data?.data_types as Record<string, 'QUANTITATIVE' | 'QUALITATIVE'> || null;
  } catch (error) {
    console.error('Error in getParentDataTypes:', error);
    return null;
  }
};

/**
 * Update data types in database for a specific version
 */
export const updateVersionDataTypes = async (
  versionId: number, 
  dataTypes: Record<string, 'QUANTITATIVE' | 'QUALITATIVE'>
): Promise<boolean> => {
  try {
    if (!dataTypes || Object.keys(dataTypes).length === 0) {
      console.error('updateVersionDataTypes: No data types provided');
      return false;
    }

    // Clean the data types to ensure consistent formatting
    const cleanedDataTypes = cleanDataTypes(dataTypes);
    
    console.log(`Updating data types for version ${versionId} with ${Object.keys(cleanedDataTypes).length} entries (cleaned from ${Object.keys(dataTypes).length} original entries)`);
    console.log('Sample cleaned data types:', Object.entries(cleanedDataTypes).slice(0, 3));
    
    const { supabase } = await import('@/integrations/supabase/client');
    
    // Update with a retry mechanism in case of transient failures
    let attempts = 0;
    const maxAttempts = 3;
    
    while (attempts < maxAttempts) {
      attempts++;
      
      try {
        const { error, data } = await supabase
          .from('TaskMethods')
          .update({ data_types: cleanedDataTypes })
          .eq('id', versionId)
          .select('id');
        
        if (error) {
          console.error(`Error updating data types (attempt ${attempts}/${maxAttempts}):`, error);
          
          if (attempts < maxAttempts) {
            // Wait for a short time before retrying
            await new Promise(resolve => setTimeout(resolve, 1000));
            continue;
          }
          return false;
        }
        
        console.log('Data types updated successfully:', data);
        return true;
      } catch (updateError) {
        console.error(`Error in Supabase update (attempt ${attempts}/${maxAttempts}):`, updateError);
        
        if (attempts < maxAttempts) {
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }
        return false;
      }
    }
    
    return false;
  } catch (error) {
    console.error('Error in updateVersionDataTypes:', error);
    return false;
  }
};

/**
 * Generate unique column identifiers to handle duplicate header names
 * @param columnNames Array of original column names (potentially with duplicates)
 * @returns Object with unique identifiers, original names mapping, and duplicate info
 */
export const generateUniqueColumnIdentifiers = (columnNames: string[]): {
  uniqueIds: string[];
  originalNames: string[];
  duplicateInfo: Record<string, number>;
  idToOriginalMap: Record<string, string>;
  originalToIdsMap: Record<string, string[]>;
} => {
  const uniqueIds: string[] = [];
  const originalNames: string[] = [...columnNames];
  const duplicateInfo: Record<string, number> = {};
  const idToOriginalMap: Record<string, string> = {};
  const originalToIdsMap: Record<string, string[]> = {};
  const nameCounts: Record<string, number> = {};

  // First pass: count occurrences of each name
  columnNames.forEach(name => {
    const cleanName = (name || '').toString().trim();
    nameCounts[cleanName] = (nameCounts[cleanName] || 0) + 1;
  });

  // Second pass: generate unique identifiers
  const nameCounters: Record<string, number> = {};
  
  columnNames.forEach((originalName, index) => {
    const cleanName = (originalName || '').toString().trim();
    const isEmpty = cleanName === '' || cleanName.toLowerCase() === 'na' || 
                   cleanName.toLowerCase() === 'null' || cleanName.toLowerCase() === 'unnamed';
    
    // Handle empty/null/NA names
    const baseName = isEmpty ? 'Unnamed_Column' : cleanName;
    
    // Track how many times we've seen this name
    nameCounters[baseName] = (nameCounters[baseName] || 0) + 1;
    
    let uniqueId: string;
    
    if (nameCounts[cleanName] > 1 || isEmpty) {
      // Generate unique ID for duplicates or empty names
      uniqueId = `${baseName}_${nameCounters[baseName]}_col${index}`;
      duplicateInfo[cleanName] = nameCounts[cleanName];
    } else {
      // Use original name if it's unique and not empty
      uniqueId = baseName;
    }
    
    uniqueIds.push(uniqueId);
    idToOriginalMap[uniqueId] = originalName;
    
    // Track mapping from original name to all its unique IDs
    if (!originalToIdsMap[cleanName]) {
      originalToIdsMap[cleanName] = [];
    }
    originalToIdsMap[cleanName].push(uniqueId);
  });

  return {
    uniqueIds,
    originalNames,
    duplicateInfo,
    idToOriginalMap,
    originalToIdsMap
  };
};

/**
 * Process CSV headers and handle duplicates
 * @param csvContent Raw CSV content
 * @param separator CSV separator
 * @returns Object with processed headers and column mapping info
 */
export const processCSVHeaders = (csvContent: string, separator: string = ',') => {
  const lines = csvContent.trim().split('\n');
  if (lines.length === 0) {
    throw new Error('CSV content is empty');
  }
  
  // Parse headers
  const originalHeaders = lines[0].split(separator).map(h => 
    h.trim().replace(/^["']|["']$/g, '')
  );
  
  // Generate unique column identifiers
  const columnMapping = generateUniqueColumnIdentifiers(originalHeaders);
  
  return {
    originalHeaders,
    uniqueHeaders: columnMapping.uniqueIds,
    columnMapping,
    dataStartLine: 1
  };
};

/**
 * Format column names with their IDs for API calls
 * @param columnName The column name (which is the unique ID)
 * @param datasetOrOriginalName Either the dataset containing column information or the original column name
 * @param columnIndex Optional column index (used when originalName is provided)
 * @returns String in "displayName$id" format where id is an integer from 1 to N
 */
export const formatColumnNameWithId = (
  columnName: string, 
  datasetOrOriginalName?: DatasetType | string | null,
  columnIndex?: number
): string => {
  // Handle the worker-style call with (name, originalName, index) signature
  if (typeof datasetOrOriginalName === 'string' && columnIndex !== undefined) {
    // Use displayName (original name or column name) and a simple numeric ID
    const displayName = datasetOrOriginalName || columnName;
    
    // Ensure we use a simple numeric ID (1-based indexing)
    const numericId = columnIndex + 1;
    
    // Standard format: "displayName$numericId"
    return `${displayName}$${numericId}`;
  }
  
  // Handle the original (name, dataset) signature
  const dataset = datasetOrOriginalName as DatasetType;
  if (!dataset || !dataset.columns) return `${columnName}$1`;
  
  // Find the column in the dataset
  const column = dataset.columns.find(col => col.name === columnName);
  if (!column) return `${columnName}$1`;
  
  // Find the index of the column (1-based)
  const colIndex = dataset.columns.findIndex(col => col.name === columnName) + 1;
  
  // Use the display name (original column name if available) and the simple numeric ID
  const displayName = column.originalName || columnName;
  
  // Return in standard format: "displayName$numericId"
  return `${displayName}$${colIndex}`;
};

/**
 * Test function to verify formatting behavior with various column scenarios
 */
export const testColumnFormatting = (dataset: DatasetType): void => {
  if (!dataset || !dataset.columns || dataset.columns.length === 0) {
    console.error('Cannot test column formatting - invalid dataset');
    return;
  }
  
  console.log('====== TESTING COLUMN NAME FORMATTING ======');
  
  // Test a few columns from the dataset
  const testColumns = dataset.columns.slice(0, Math.min(5, dataset.columns.length));
  
  testColumns.forEach(column => {
    const formatted = formatColumnNameWithId(column.name, dataset);
    console.log(`Original: "${column.name}", Display: "${column.originalName || column.name}", Formatted: "${formatted}"`);
  });
  
  // Test a column without originalName
  const noOriginalColumn = { ...testColumns[0], originalName: undefined };
  console.log('Testing column without originalName:');
  console.log(`Original: "${noOriginalColumn.name}", Formatted: "${formatColumnNameWithId(noOriginalColumn.name, {
    ...dataset,
    columns: [noOriginalColumn, ...dataset.columns.slice(1)]
  })}"`);
  
  // Test a column with duplicate name (originalName === name)
  const duplicateColumn = { ...testColumns[0], originalName: testColumns[0].name };
  console.log('Testing column with duplicate name:');
  console.log(`Original: "${duplicateColumn.name}", Formatted: "${formatColumnNameWithId(duplicateColumn.name, {
    ...dataset,
    columns: [duplicateColumn, ...dataset.columns.slice(1)]
  })}"`);
  
  console.log('=========================================');
};

/**
 * Check if data types in database match local data types and identify inconsistencies
 * This is a debugging utility function to help identify format mismatches
 */
export const checkDataTypeConsistency = (
  storedDataTypes: Record<string, 'QUANTITATIVE' | 'QUALITATIVE'>,
  localDataTypes: Record<string, 'QUANTITATIVE' | 'QUALITATIVE'>
): void => {
  console.group('Data Type Consistency Check');
  
  // Check if keys match
  const storedKeys = Object.keys(storedDataTypes);
  const localKeys = Object.keys(localDataTypes);
  const commonKeys = storedKeys.filter(key => localKeys.includes(key));
  
  console.log(`Stored data types: ${storedKeys.length} entries`);
  console.log(`Local data types: ${localKeys.length} entries`);
  console.log(`Common keys: ${commonKeys.length} entries`);
  
  // Check if any keys in stored data types are not in local data types
  const missingInLocal = storedKeys.filter(key => !localKeys.includes(key));
  if (missingInLocal.length > 0) {
    console.log(`${missingInLocal.length} keys in stored data types are missing in local:`);
    missingInLocal.slice(0, 5).forEach(key => console.log(`- ${key}`));
    if (missingInLocal.length > 5) console.log(`... and ${missingInLocal.length - 5} more`);
  }
  
  // Check if any keys in local data types are not in stored data types
  const missingInStored = localKeys.filter(key => !storedKeys.includes(key));
  if (missingInStored.length > 0) {
    console.log(`${missingInStored.length} keys in local data types are missing in stored:`);
    missingInStored.slice(0, 5).forEach(key => console.log(`- ${key}`));
    if (missingInStored.length > 5) console.log(`... and ${missingInStored.length - 5} more`);
  }
  
  // Check for value differences in common keys
  const differences = commonKeys.filter(key => storedDataTypes[key] !== localDataTypes[key]);
  if (differences.length > 0) {
    console.log(`${differences.length} keys have different values:`);
    differences.slice(0, 5).forEach(key => {
      console.log(`- ${key}: stored=${storedDataTypes[key]}, local=${localDataTypes[key]}`);
    });
    if (differences.length > 5) console.log(`... and ${differences.length - 5} more`);
  }
  
  console.groupEnd();
};

/**
 * Clean data types object by removing duplicates and ensuring consistent formatting
 * This can be used to fix existing data in the database
 * @param dataTypes The data types object to clean
 * @returns A new data types object with only name$id format keys
 */
export const cleanDataTypes = (
  dataTypes: Record<string, 'QUANTITATIVE' | 'QUALITATIVE'>
): Record<string, 'QUANTITATIVE' | 'QUALITATIVE'> => {
  const cleanedTypes: Record<string, 'QUANTITATIVE' | 'QUALITATIVE'> = {};
  
  // First pass: identify all keys that follow the name$id pattern
  const regex = /^(.+)\$(\d+)$/;
  const nameIdKeys: string[] = [];
  const otherKeys: string[] = [];
  
  Object.keys(dataTypes).forEach(key => {
    if (regex.test(key)) {
      nameIdKeys.push(key);
    } else {
      otherKeys.push(key);
    }
  });
  
  // Keep all properly formatted name$id keys
  nameIdKeys.forEach(key => {
    cleanedTypes[key] = dataTypes[key];
  });
  
  // Log info about what was removed
  const removedCount = Object.keys(dataTypes).length - nameIdKeys.length;
  console.log(`Cleaned ${removedCount} duplicate/invalid keys from data types`);
  if (otherKeys.length > 0) {
    console.log(`Examples of removed keys:`, otherKeys.slice(0, 5));
  }
  
  return cleanedTypes;
};

/**
 * Utility function to clean data types for all versions of a task
 * This can be used to fix existing data in the database
 * @param taskId The ID of the task whose versions need to be cleaned
 * @returns True if successful, false otherwise
 */
export const cleanAllVersionDataTypes = async (taskId: string): Promise<boolean> => {
  try {
    const { supabase } = await import('@/integrations/supabase/client');
    
    // Get all versions for this task
    const { data: versions, error: versionsError } = await supabase
      .from('TaskMethods')
      .select('id, data_types')
      .eq('task', taskId);
    
    if (versionsError || !versions) {
      console.error('Error fetching task versions:', versionsError);
      return false;
    }
    
    console.log(`Found ${versions.length} versions for task ${taskId}`);
    
    // Process each version
    let successCount = 0;
    for (const version of versions) {
      // Check if data_types exists and is an object
      if (version.data_types && typeof version.data_types === 'object' && !Array.isArray(version.data_types)) {
        try {
          // Cast to the expected type with validation
          const typedDataTypes: Record<string, 'QUANTITATIVE' | 'QUALITATIVE'> = {};
          let isValid = true;
          
          // Validate each entry
          Object.entries(version.data_types).forEach(([key, value]) => {
            if (typeof key === 'string' && (value === 'QUANTITATIVE' || value === 'QUALITATIVE')) {
              typedDataTypes[key] = value;
            } else {
              isValid = false;
              console.error(`Invalid data type entry: ${key}: ${value}`);
            }
          });
          
          if (!isValid) {
            console.error(`Skipping version ${version.id} due to invalid data types`);
            continue;
          }
          
          // Clean the data types
          const cleanedDataTypes = cleanDataTypes(typedDataTypes);
          
          // Update in database
          const { error } = await supabase
            .from('TaskMethods')
            .update({ data_types: cleanedDataTypes })
            .eq('id', version.id);
          
          if (error) {
            console.error(`Error updating version ${version.id}:`, error);
          } else {
            successCount++;
          }
        } catch (versionError) {
          console.error(`Error processing version ${version.id}:`, versionError);
        }
      } else {
        console.log(`Version ${version.id} has no data types to clean`);
      }
    }
    
    console.log(`Successfully cleaned ${successCount} of ${versions.length} versions`);
    return successCount > 0;
  } catch (error) {
    console.error('Error in cleanAllVersionDataTypes:', error);
    return false;
  }
};
