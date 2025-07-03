import { ColumnInfo, ColumnMapping } from "@/types/dataset";

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
      
             for (let i = 0; i < buckets; i++) {
         const bucketMin = (stats.min as number) + i * bucketSize;
         const bucketKey = bucketMin.toFixed(2);
         distribution[bucketKey] = 0;
       }
       
       numericValues.forEach(val => {
         const bucketIndex = Math.min(Math.floor((val - (stats.min as number)) / bucketSize), buckets - 1);
         const bucketKey = ((stats.min as number) + bucketIndex * bucketSize).toFixed(2);
         distribution[bucketKey]++;
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
      
      for (let i = 0; i < buckets; i++) {
        const bucketMin = min + i * bucketSize;
        const bucketMax = i === buckets - 1 ? max + 0.0001 : min + (i + 1) * bucketSize; // Ensure last bucket includes max value
        const bucketKey = bucketMin.toFixed(2); // String key that matches the expected type
        
        distribution[bucketKey] = numericValues.filter(
          val => val >= bucketMin && (i === buckets - 1 ? val <= bucketMax : val < bucketMax)
        ).length;
      }
      stats.distribution = distribution;
      
      // Use the new outlier detection algorithm (but skip for very large datasets)
      if (numericValues.length <= 1000) {
        const outlierIndices = getOutlierIndices(columnData);
        stats.outliers = outlierIndices.filter(Boolean).length;
      } else {
        stats.outliers = 0; // Skip outlier calculation for performance
      }
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
 */
export const createDataTypesFromColumns = (columns: ColumnInfo[]): Record<string, 'QUANTITATIVE' | 'QUALITATIVE'> => {
  const dataTypes: Record<string, 'QUANTITATIVE' | 'QUALITATIVE'> = {};
  columns.forEach(column => {
    dataTypes[column.name] = column.type;
  });
  return dataTypes;
};

/**
 * Create column info array from stored data types and column data
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
    
    // Use stored data type if available, otherwise infer
    const type = storedDataTypes[name] || inferSimplifiedDataType(columnData);
    
    // Calculate stats using the determined type
    const stats = calculateColumnStats(columnData, type);
    
    // Get original name from column mapping if available
    const originalName = columnMapping?.idToOriginalMap?.[name];
    
    const columnInfo: ColumnInfo = {
      name,
      originalName, // Set original name if available
      type, // Use the stored/determined type
      uniqueValues: stats.uniqueValues || 0,
      missingValues: stats.missingValues || 0,
      missingPercent: stats.missingPercent || 0,
      ...stats,
    };
    
    columns.push(columnInfo);
  }
  
  return columns;
};

/**
 * Infer data types for a new original data version
 */
export const inferDataTypesForOriginalData = (
  rawData: any[][],
  columnNames: string[]
): Record<string, 'QUANTITATIVE' | 'QUALITATIVE'> => {
  const dataTypes: Record<string, 'QUANTITATIVE' | 'QUALITATIVE'> = {};
  
  for (let i = 0; i < columnNames.length; i++) {
    const name = columnNames[i];
    const columnData = rawData.map(row => row[i]);
    dataTypes[name] = inferSimplifiedDataType(columnData);
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
    const { supabase } = await import('@/integrations/supabase/client');
    
    const { error } = await supabase
      .from('TaskMethods')
      .update({ data_types: dataTypes })
      .eq('id', versionId);
    
    if (error) {
      console.error('Error updating data types:', error);
      return false;
    }
    
    return true;
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
