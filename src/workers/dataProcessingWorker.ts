// Web Worker for processing large datasets without blocking UI

interface ProcessingMessage {
  type: 'PROCESS_COLUMNS' | 'CALCULATE_CORRELATION' | 'DETECT_DUPLICATES' | 'CALCULATE_STATS';
  payload: any;
  batchId: string;
}

interface ProcessingResult {
  type: string;
  payload: any;
  batchId: string;
  progress?: number;
}

interface ColumnMapping {
  uniqueIds: string[];
  originalNames: string[];
  duplicateInfo: Record<string, number>;
  idToOriginalMap: Record<string, string>;
  originalToIdsMap: Record<string, string[]>;
}

// Listen for messages from main thread
self.onmessage = function(e: MessageEvent<ProcessingMessage>) {
  const { type, payload, batchId } = e.data;
  
  try {
    switch (type) {
      case 'PROCESS_COLUMNS':
        processColumnsBatch(payload, batchId);
        break;
      case 'CALCULATE_CORRELATION':
        calculateCorrelationMatrix(payload, batchId);
        break;
      case 'DETECT_DUPLICATES':
        detectDuplicates(payload, batchId);
        break;
      case 'CALCULATE_STATS':
        calculateStatistics(payload, batchId);
        break;
      default:
        console.warn('Unknown worker message type:', type);
    }
  } catch (error) {
    postMessage({
      type: 'ERROR',
      payload: { error: error.message },
      batchId
    });
  }
};

// Process columns in batches
function processColumnsBatch(
  { rowData, headers, startIndex, batchSize, dataTypes, columnMapping }: any, 
  batchId: string
) {
  const totalColumns = headers.length;
  let currentIndex = startIndex;
  
  // Process all columns in batches
  const processNextBatch = () => {
    const endIndex = Math.min(currentIndex + batchSize, totalColumns);
    const columns = [];
    
    for (let i = currentIndex; i < endIndex; i++) {
      const uniqueId = headers[i]; // headers now contains unique IDs
      const originalName = columnMapping?.idToOriginalMap?.[uniqueId] || uniqueId;
      const columnData = rowData.map((row: any[]) => row[i]);
      
      // Use provided data type if available, otherwise infer
      // Check both unique ID and original name for backward compatibility
      const type = dataTypes?.[uniqueId] || dataTypes?.[originalName] || inferSimplifiedDataType(columnData);
      const stats = calculateColumnStats(columnData, type);
      
      columns.push({
        name: uniqueId, // Use unique ID as the primary identifier
        originalName: originalName, // Store original name for display
        type,
        uniqueValues: stats.uniqueValues || 0,
        missingValues: stats.missingValues || 0,
        missingPercent: stats.missingPercent || 0,
        ...stats,
      });
    }
    
    const progress = Math.round((endIndex / totalColumns) * 80); // 80% for column processing
    
    postMessage({
      type: 'COLUMNS_BATCH_PROCESSED',
      payload: { columns, startIndex: currentIndex, endIndex, totalColumns },
      batchId,
      progress: 20 + progress // Start from 20% (after CSV parsing)
    });
    
    // Continue with next batch if there are more columns
    if (endIndex < totalColumns) {
      currentIndex = endIndex;
      // Use setTimeout to avoid blocking and allow progress updates
      setTimeout(processNextBatch, 0);
    }
  };
  
  // Start processing
  processNextBatch();
}

// Calculate correlation matrix with sampling for large datasets
function calculateCorrelationMatrix(
  { rowData, headers, maxColumns = 50, sampleSize = 5000, columnMapping }: any,
  batchId: string
) {
  // Filter to numeric columns only
  const numericColumns = [];
  const numericIndices = [];
  
  for (let i = 0; i < headers.length; i++) {
    const columnData = rowData.map((row: any[]) => row[i]);
    if (isNumericColumn(columnData)) {
      const uniqueId = headers[i];
      const originalName = columnMapping?.idToOriginalMap?.[uniqueId] || uniqueId;
      numericColumns.push(originalName); // Use original name for correlation labels
      numericIndices.push(i);
    }
  }
  
  // Limit number of columns for correlation to prevent memory issues
  const limitedIndices = numericIndices.slice(0, maxColumns);
  const limitedColumns = limitedIndices.map(i => {
    const uniqueId = headers[i];
    return columnMapping?.idToOriginalMap?.[uniqueId] || uniqueId;
  });
  
  if (limitedIndices.length < 2) {
    postMessage({
      type: 'CORRELATION_CALCULATED',
      payload: { matrix: [], labels: [] },
      batchId,
      progress: 100
    });
    return;
  }
  
  // Sample data if too large
  let sampleData = rowData;
  if (rowData.length > sampleSize) {
    const step = Math.ceil(rowData.length / sampleSize);
    sampleData = rowData.filter((_: any, index: number) => index % step === 0);
  }
  
  // Extract numeric data for correlation calculation
  const numericData = sampleData.map((row: any[]) => 
    limitedIndices.map(index => {
      const value = parseFloat(row[index]);
      return isNaN(value) ? 0 : value;
    })
  );
  
  // Calculate correlation matrix
  const matrix: number[][] = [];
  const totalPairs = limitedIndices.length * limitedIndices.length;
  let processedPairs = 0;
  
  for (let i = 0; i < limitedIndices.length; i++) {
    matrix[i] = [];
    for (let j = 0; j < limitedIndices.length; j++) {
      if (i === j) {
        matrix[i][j] = 1;
      } else {
        const col1 = numericData.map(row => row[i]);
        const col2 = numericData.map(row => row[j]);
        matrix[i][j] = pearsonCorrelation(col1, col2);
      }
      
      processedPairs++;
      if (processedPairs % 100 === 0) {
        const progress = Math.round((processedPairs / totalPairs) * 100);
        postMessage({
          type: 'CORRELATION_PROGRESS',
          payload: { progress },
          batchId,
          progress
        });
      }
    }
  }
  
  postMessage({
    type: 'CORRELATION_CALCULATED',
    payload: { 
      matrix, 
      labels: limitedColumns, // Use original names for labels
      samplingInfo: {
        originalRows: rowData.length,
        sampledRows: sampleData.length,
        originalColumns: numericColumns.length,
        processedColumns: limitedColumns.length
      }
    },
    batchId,
    progress: 100
  });
}

// Detect duplicate rows efficiently
function detectDuplicates({ rowData }: any, batchId: string) {
  const seen = new Set<string>();
  let duplicates = 0;
  
  const batchSize = 1000;
  for (let i = 0; i < rowData.length; i += batchSize) {
    const batch = rowData.slice(i, i + batchSize);
    
    for (const row of batch) {
      const rowString = JSON.stringify(row);
      if (seen.has(rowString)) {
        duplicates++;
      } else {
        seen.add(rowString);
      }
    }
    
    if (i % (batchSize * 10) === 0) {
      const progress = Math.round((i / rowData.length) * 100);
      postMessage({
        type: 'DUPLICATE_PROGRESS',
        payload: { progress },
        batchId,
        progress
      });
    }
  }
  
  postMessage({
    type: 'DUPLICATES_DETECTED',
    payload: { duplicateCount: duplicates },
    batchId,
    progress: 100
  });
}

// Calculate dataset statistics
function calculateStatistics({ rowData, columns }: any, batchId: string) {
  const stats = {
    totalRows: rowData.length,
    totalColumns: columns.length,
    missingValues: columns.reduce((sum: number, col: any) => sum + (col.missingValues || 0), 0),
    dataTypes: columns.reduce((acc: any, col: any) => {
      acc[col.type] = (acc[col.type] || 0) + 1;
      return acc;
    }, {})
  };
  
  postMessage({
    type: 'STATISTICS_CALCULATED',
    payload: stats,
    batchId,
    progress: 100
  });
}

// Helper functions (copied from data-utils to work in worker context)
function inferSimplifiedDataType(values: any[]): 'QUANTITATIVE' | 'QUALITATIVE' {
  if (!values || values.length === 0) return 'QUALITATIVE';
  
  const nonNullValues = values.filter(val => 
    val !== null && 
    val !== undefined && 
    val !== '' && 
    String(val).toUpperCase() !== 'NA' &&
    String(val).toUpperCase() !== 'NAN' &&
    String(val).toUpperCase() !== 'NULL'
  );
  
  if (nonNullValues.length === 0) return 'QUALITATIVE';
  
  let numericCount = 0;
  for (const val of nonNullValues) {
    const num = parseFloat(String(val));
    if (!isNaN(num) && isFinite(num)) {
      numericCount++;
    }
  }
  
  const numericRatio = numericCount / nonNullValues.length;
  return numericRatio > 0.6 ? 'QUANTITATIVE' : 'QUALITATIVE';
}

function isNumericColumn(values: any[]): boolean {
  const nonNullValues = values.filter(val => 
    val !== null && val !== undefined && val !== ''
  );
  
  if (nonNullValues.length === 0) return false;
  
  let numericCount = 0;
  for (const val of nonNullValues) {
    const num = parseFloat(String(val));
    if (!isNaN(num) && isFinite(num)) {
      numericCount++;
    }
  }
  
  return (numericCount / nonNullValues.length) > 0.8;
}

function calculateColumnStats(columnData: any[], type: 'QUANTITATIVE' | 'QUALITATIVE'): any {
  const nonNullValues = columnData.filter(val =>
    val !== null &&
    val !== undefined &&
    val !== '' &&
    String(val).toUpperCase() !== 'NA' &&
    String(val).toUpperCase() !== 'NAN' &&
    String(val).toUpperCase() !== 'NULL' &&
    !(typeof val === 'number' && isNaN(val))
  );

  // Analyze data type consistency
  const consistencyAnalysis = analyzeDataTypeConsistency(columnData);

  const stats: any = {
    type,
    uniqueValues: new Set(nonNullValues).size,
    missingValues: columnData.length - nonNullValues.length,
    missingPercent: ((columnData.length - nonNullValues.length) / columnData.length) * 100,
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
      const mean = stats.mean;
      stats.std = Math.sqrt(
        numericValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / numericValues.length
      );
      
      // Calculate skewness
      const skewnessResult = calculateSkewness(numericValues);
      stats.skewness = skewnessResult.skewness;
      stats.isSkewed = skewnessResult.isSkewed;
      
      // Simple outlier detection using IQR
      const q1Index = Math.floor(numericValues.length * 0.25);
      const q3Index = Math.floor(numericValues.length * 0.75);
      const q1 = numericValues[q1Index];
      const q3 = numericValues[q3Index];
      const iqr = q3 - q1;
      const lowerBound = q1 - 1.5 * iqr;
      const upperBound = q3 + 1.5 * iqr;
      
      stats.outliers = numericValues.filter(val => val < lowerBound || val > upperBound).length;
    }
  } else {
    // Calculate frequency distribution for categorical
    const distribution: Record<string, number> = {};
    nonNullValues.forEach(val => {
      distribution[String(val)] = (distribution[String(val)] || 0) + 1;
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
}

// Add the missing helper functions to the worker
function analyzeDataTypeConsistency(values: any[]): {
  hasMixedTypes: boolean;
  typeBreakdown: {
    numeric: number;
    string: number;
    boolean: number;
    null: number;
    total: number;
  };
  inconsistencyRatio: number;
} {
  const typeBreakdown = {
    numeric: 0,
    string: 0,
    boolean: 0,
    null: 0,
    total: values.length
  };

  values.forEach(value => {
    if (value === null || value === undefined || value === '' || 
        String(value).toUpperCase() === 'NA' || String(value).toUpperCase() === 'NULL') {
      typeBreakdown.null++;
    } else if (typeof value === 'boolean' || 
               (typeof value === 'string' && (value.toLowerCase() === 'true' || value.toLowerCase() === 'false'))) {
      typeBreakdown.boolean++;
    } else if (!isNaN(Number(value)) && isFinite(Number(value))) {
      typeBreakdown.numeric++;
    } else {
      typeBreakdown.string++;
    }
  });

  // Determine if there are mixed types
  const nonNullCount = typeBreakdown.total - typeBreakdown.null;
  const typeCounts = [typeBreakdown.numeric, typeBreakdown.string, typeBreakdown.boolean];
  const nonZeroTypes = typeCounts.filter(count => count > 0).length;
  const hasMixedTypes = nonZeroTypes > 1;

  // Calculate inconsistency ratio
  let inconsistencyRatio = 0;
  if (nonNullCount > 0 && hasMixedTypes) {
    const maxTypeCount = Math.max(...typeCounts);
    const minorityTypeCount = nonNullCount - maxTypeCount;
    inconsistencyRatio = minorityTypeCount / nonNullCount;
  }

  return {
    hasMixedTypes,
    typeBreakdown,
    inconsistencyRatio
  };
}

function calculateSkewness(numericValues: number[], threshold: number = 1): { skewness: number; isSkewed: boolean } {
  if (numericValues.length === 0) {
    return { skewness: 0, isSkewed: false };
  }
  
  // Calculate mean
  const mean = numericValues.reduce((sum, val) => sum + val, 0) / numericValues.length;
  
  // Calculate skewness using the formula: Σ((x-μ)³)/(n * σ³)
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
}

function pearsonCorrelation(x: number[], y: number[]): number {
  const n = x.length;
  if (n === 0) return 0;

  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
  const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
  const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

  return denominator === 0 ? 0 : numerator / denominator;
}

export {}; 