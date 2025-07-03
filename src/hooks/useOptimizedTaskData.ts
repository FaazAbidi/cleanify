import { useState, useCallback, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DatasetType, ColumnInfo, ColumnMapping } from "@/types/dataset";
import { Tables } from "@/integrations/supabase/types";
import { 
  inferSimplifiedDataType, 
  detectCSVSeparator,
  processCSVHeaders,
  createColumnsFromDataTypes
} from "@/lib/data-utils";
import { useToast } from "@/components/ui/use-toast";
import { TaskVersion } from "@/types/version";

// Constants for performance optimization (optimized for large datasets)
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;
const MAX_ROWS_SAMPLE = 8000; // Increased sample size for better statistics
const BATCH_SIZE = 5; // Smaller batches for memory safety
const MAX_CORRELATION_COLUMNS = 30; // Reduced for memory safety
const MEMORY_CHECK_INTERVAL = 100; // Check memory usage every 100 operations

interface WorkerMessage {
  type: string;
  payload: any;
  batchId: string;
  progress?: number;
}

export function useOptimizedTaskData() {
  const [taskData, setTaskData] = useState<DatasetType | null>(null);
  const [fileData, setFileData] = useState<Tables<'Files'> | null>(null);
  const [loadingTaskData, setLoadingTaskData] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [selectedTask, setSelectedTask] = useState<Tables<'Tasks'> | null>(null);
  const [processingStage, setProcessingStage] = useState<string>('');
  
  // Worker reference
  const workerRef = useRef<Worker | null>(null);
  const pendingBatches = useRef<Map<string, any>>(new Map());
  
  const { toast } = useToast();

  // Initialize Web Worker
  useEffect(() => {
    const initWorker = () => {
      try {
        workerRef.current = new Worker(
          new URL('../workers/dataProcessingWorker.ts', import.meta.url),
          { type: 'module' }
        );
        
        workerRef.current.onmessage = handleWorkerMessage;
        workerRef.current.onerror = (error) => {
          console.error('Worker error:', error);
          toast({
            title: "Processing Error",
            description: "Data processing encountered an error. Falling back to main thread.",
            variant: "destructive",
          });
          // Terminate the worker and set to null for fallback
          if (workerRef.current) {
            workerRef.current.terminate();
            workerRef.current = null;
          }
        };
        
        console.log('Web Worker initialized successfully');
      } catch (error) {
        console.warn('Web Worker not supported, falling back to main thread processing:', error);
        workerRef.current = null;
      }
    };

    initWorker();

    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
      }
    };
  }, [toast]);

  // Handle messages from Web Worker
  const handleWorkerMessage = useCallback((e: MessageEvent<WorkerMessage>) => {
    const { type, payload, batchId, progress } = e.data;
    
    if (progress !== undefined) {
      setProcessingProgress(progress);
    }
    
    const batchData = pendingBatches.current.get(batchId);
    if (!batchData) return;
    
    switch (type) {
      case 'COLUMNS_BATCH_PROCESSED':
        handleColumnsBatchProcessed(payload, batchData);
        break;
      case 'CORRELATION_CALCULATED':
        handleCorrelationCalculated(payload, batchData);
        break;
      case 'DUPLICATES_DETECTED':
        handleDuplicatesDetected(payload, batchData);
        break;
      case 'ERROR':
        handleWorkerError(payload, batchData);
        break;
    }
  }, []);

  const handleColumnsBatchProcessed = (payload: any, batchData: any) => {
    const { columns, startIndex, endIndex, totalColumns } = payload;
    
    // Initialize processedColumns array if not exists
    if (!batchData.processedColumns) {
      batchData.processedColumns = [];
    }
    
    // Add the new columns to the accumulator
    batchData.processedColumns.push(...columns);
    
    console.log(`Processed columns ${startIndex}-${endIndex} of ${totalColumns}`);
    
    // Check if all columns have been processed
    if (endIndex >= totalColumns) {
      // All columns processed, resolve with all accumulated columns
      console.log(`All ${batchData.processedColumns.length} columns processed`);
      batchData.resolve(batchData.processedColumns);
      pendingBatches.current.delete(batchData.batchId);
    }
  };

  const handleCorrelationCalculated = (payload: any, batchData: any) => {
    batchData.resolve(payload);
    pendingBatches.current.delete(batchData.batchId);
  };

  const handleDuplicatesDetected = (payload: any, batchData: any) => {
    batchData.resolve(payload.duplicateCount);
    pendingBatches.current.delete(batchData.batchId);
  };

  const handleWorkerError = (payload: any, batchData: any) => {
    batchData.reject(new Error(payload.error));
    pendingBatches.current.delete(batchData.batchId);
  };

  // Optimized data processing functions
  const processColumnsWithWorker = async (
    rowData: any[][],
    headers: string[],
    dataTypes?: Record<string, 'QUANTITATIVE' | 'QUALITATIVE'>,
    columnMapping?: ColumnMapping
  ): Promise<ColumnInfo[]> => {
    if (!workerRef.current) {
      console.log('Worker not available, falling back to main thread processing');
      return processColumnsMainThread(rowData, headers, dataTypes, columnMapping);
    }

    // Check data size before attempting to send to worker
    const estimatedDataSize = rowData.length * headers.length;
    const WORKER_MEMORY_LIMIT = 100000; // ~100k data points limit for worker
    
    if (estimatedDataSize > WORKER_MEMORY_LIMIT) {
      console.log(`Dataset too large for worker (${estimatedDataSize} data points), using main thread`);
      return processColumnsMainThread(rowData, headers, dataTypes, columnMapping);
    }

    // Further reduce data for worker to prevent memory issues
    const workerSampleSize = Math.min(1000, rowData.length); // Very small sample for worker
    const workerRowData = rowData.slice(0, workerSampleSize);
    
    console.log(`Using worker with ${workerRowData.length} rows sample from ${rowData.length} total rows`);

    return new Promise((resolve, reject) => {
      if (!workerRef.current) {
        reject(new Error('Worker not available'));
        return;
      }

      const batchId = `columns_${Date.now()}`;
      const allColumns: ColumnInfo[] = [];
      let processedBatches = 0;
      const expectedBatches = Math.ceil(headers.length / BATCH_SIZE);

      const handleMessage = (event: MessageEvent) => {
        const { type, payload, batchId: msgBatchId, progress } = event.data;
        
        if (msgBatchId !== batchId) return;
        
        if (type === 'COLUMNS_BATCH_PROCESSED') {
          allColumns.push(...payload.columns);
          processedBatches++;
          
          if (progress !== undefined) {
            setProcessingProgress(progress);
          }
          
          if (processedBatches >= expectedBatches) {
            workerRef.current?.removeEventListener('message', handleMessage);
            // Sort columns by original index to maintain order
            const sortedColumns = allColumns.sort((a, b) => {
              const aIndex = headers.indexOf(a.name);
              const bIndex = headers.indexOf(b.name);
              return aIndex - bIndex;
            });
            resolve(sortedColumns);
          }
        } else if (type === 'ERROR') {
          workerRef.current?.removeEventListener('message', handleMessage);
          reject(new Error(payload.error));
        }
      };

      workerRef.current.addEventListener('message', handleMessage);

      // Send data to worker in batches with error handling
      try {
        for (let i = 0; i < headers.length; i += BATCH_SIZE) {
          workerRef.current.postMessage({
            type: 'PROCESS_COLUMNS',
            payload: {
              rowData: workerRowData, // Use the smaller sample
              headers,
              startIndex: i,
              batchSize: BATCH_SIZE,
              dataTypes,
              columnMapping // Pass column mapping to worker
            },
            batchId
          });
        }
      } catch (error) {
        console.error('Failed to send data to worker:', error);
        workerRef.current?.removeEventListener('message', handleMessage);
        // Fall back to main thread processing
        resolve(processColumnsMainThread(rowData, headers, dataTypes, columnMapping));
      }
    });
  };

  const processColumnsMainThread = async (
    rowData: any[][],
    headers: string[],
    dataTypes?: Record<string, 'QUANTITATIVE' | 'QUALITATIVE'>,
    columnMapping?: ColumnMapping
  ): Promise<ColumnInfo[]> => {
    console.log('Processing columns on main thread...');
    const columns: ColumnInfo[] = [];
    
    // Use smaller batches for better memory management
    const MAIN_THREAD_BATCH_SIZE = 3;
    
    for (let i = 0; i < headers.length; i += MAIN_THREAD_BATCH_SIZE) {
      // Yield to UI thread periodically
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, 10)); // Longer delay for better responsiveness
      }
      
      const batchEnd = Math.min(i + MAIN_THREAD_BATCH_SIZE, headers.length);
      console.log(`Processing columns ${i}-${batchEnd} of ${headers.length}`);
      
      try {
        for (let colIndex = i; colIndex < batchEnd; colIndex++) {
          const uniqueId = headers[colIndex];
          const originalName = columnMapping?.idToOriginalMap?.[uniqueId] || uniqueId;
          
          // Extract column data more efficiently
          const columnData: any[] = [];
          for (let rowIdx = 0; rowIdx < rowData.length; rowIdx++) {
            columnData.push(rowData[rowIdx][colIndex]);
          }
          
          // Use provided data type if available, checking both unique ID and original name
          const type = dataTypes?.[uniqueId] || dataTypes?.[originalName] || inferBasicDataType(columnData);
          const stats = calculateBasicStats(columnData, type);
          
          columns.push({
            name: uniqueId, // Use unique ID as primary identifier
            originalName: originalName, // Store original name for display
            type,
            uniqueValues: stats.uniqueValues || 0,
            missingValues: stats.missingValues || 0,
            missingPercent: stats.missingPercent || 0,
            ...stats,
          });
          
          // Clear the column data to free memory
          columnData.length = 0;
        }
      } catch (error) {
        console.error(`Error processing columns ${i}-${batchEnd}:`, error);
        // Continue with next batch on error
        continue;
      }
      
      const progress = Math.round((batchEnd / headers.length) * 80); // 80% for column processing
      setProcessingProgress(20 + progress);
      setProcessingStage(`Processing columns... ${batchEnd}/${headers.length}`);
    }
    
    console.log(`Main thread processing complete: ${columns.length} columns`);
    return columns;
  };

  const calculateCorrelationOptimized = async (
    rowData: any[][],
    headers: string[],
    columnMapping?: ColumnMapping
  ) => {
    // Skip correlation for very large datasets to prevent memory issues
    const estimatedDataSize = rowData.length * headers.length;
    if (estimatedDataSize > 50000 || !workerRef.current) {
      console.log('Skipping correlation calculation for large dataset or missing worker');
      return { matrix: [], labels: [] };
    }

    setProcessingStage('Calculating correlations...');
    
    return new Promise((resolve, reject) => {
      const batchId = `correlation_${Date.now()}`;
      
      pendingBatches.current.set(batchId, {
        batchId,
        resolve,
        reject
      });

      // Use very small sample for correlation to prevent memory issues
      const correlationSample = Math.min(500, rowData.length);
      const sampleData = rowData.slice(0, correlationSample);

      try {
        workerRef.current!.postMessage({
          type: 'CALCULATE_CORRELATION',
          payload: {
            rowData: sampleData, // Use small sample
            headers,
            maxColumns: Math.min(MAX_CORRELATION_COLUMNS, 20), // Further limit columns
            sampleSize: correlationSample,
            columnMapping // Pass column mapping for correlation labels
          },
          batchId
        });
      } catch (error) {
        console.error('Failed to send correlation data to worker:', error);
        pendingBatches.current.delete(batchId);
        resolve({ matrix: [], labels: [] }); // Return empty correlation on error
      }
    });
  };

  const detectDuplicatesOptimized = async (rowData: any[][]): Promise<number> => {
    // Always use main thread for duplicate detection to avoid memory issues
    const seen = new Set<string>();
    let duplicates = 0;
    const sampleSize = Math.min(300, rowData.length); // Very small sample for performance
    
    console.log(`Checking duplicates in sample of ${sampleSize} rows from ${rowData.length} total`);
    
    try {
      for (let i = 0; i < sampleSize; i++) {
        const row = rowData[i];
        // Use a simpler hash instead of full JSON stringify for better performance
        const rowHash = row.join('|'); // Simple delimiter-based hash
        if (seen.has(rowHash)) {
          duplicates++;
        } else {
          seen.add(rowHash);
        }
      }
    } catch (error) {
      console.error('Error in duplicate detection:', error);
      return 0; // Return 0 duplicates on error
    }
    
    return duplicates;
  };

  const retryFetch = async (fetchFn: () => Promise<any>, retries = MAX_RETRIES): Promise<any> => {
    try {
      return await fetchFn();
    } catch (error) {
      if (retries <= 0) throw error;
      
      console.log(`Retrying API call, ${retries} attempts left...`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return retryFetch(fetchFn, retries - 1);
    }
  };

  const loadTaskData = useCallback(async (taskMethod: TaskVersion) => {
    if (!taskMethod || loadingTaskData) return;

    // Add processing timeout to prevent infinite hanging
    const PROCESSING_TIMEOUT = 30000; // 30 seconds timeout
    let processingTimeoutId: NodeJS.Timeout;

    try {
      setLoadingTaskData(true);
      setProcessingProgress(0);
      setProcessingStage('Loading task data...');

      // Set up timeout protection
      processingTimeoutId = setTimeout(() => {
        console.error('Processing timeout reached');
        toast({
          title: "Processing Timeout",
          description: "Data processing is taking too long. Please try with a smaller dataset.",
          variant: "destructive",
        });
        setLoadingTaskData(false);
        setProcessingProgress(0);
        setProcessingStage('');
      }, PROCESSING_TIMEOUT);

      console.log('Loading task data for method:', {
        id: taskMethod.id,
        processed_file: taskMethod.processed_file,
        file: taskMethod.file,
        taskMethod: taskMethod
      });

      // Determine the file ID to use
      let fileId: number | null = null;
      
      // If we have a processed file ID, use that first
      if (taskMethod.processed_file) {
        fileId = taskMethod.processed_file;
      } 
      // Otherwise, try to get the file ID from the file object
      else if (taskMethod.file?.id) {
        fileId = taskMethod.file.id;
      }

      // Validate that we have a file ID
      if (!fileId) {
        throw new Error(`No file ID found for task method ${taskMethod.id}. Available: processed_file=${taskMethod.processed_file}, file.id=${taskMethod.file?.id}`);
      }

      // Fetch file data with retry logic
      setProcessingStage('Fetching file data...');
      const { data: fileDetails, error: fileError } = await retryFetch(() =>
        supabase
          .from('Files')
          .select('*')
          .eq('id', fileId)
          .single()
      );

      if (fileError) throw fileError;
      if (!fileDetails?.path) throw new Error('File path not found');

      console.log('File details:', fileDetails);

      // Determine which bucket to use based on file status
      let bucket = 'raw-data';
      if (taskMethod.status === 'PROCESSED' && taskMethod.processed_file) {
        bucket = 'processed-data';
      }

      // Download the file from Supabase Storage
      console.log('Downloading file from bucket:', bucket, 'path:', fileDetails.path);
      const { data: fileData, error: downloadError } = await retryFetch(() =>
        Promise.resolve(
          supabase.storage
            .from(bucket)
            .download(fileDetails.path)
        )
      );

      if (downloadError) throw downloadError;

      // Parse the file content
      const text = await fileData.text();
      console.log('File content loaded, size:', text.length);

      setFileData({ ...fileDetails, file_content: text });
      setProcessingProgress(10);

      // Parse CSV data with enhanced header handling
      setProcessingStage('Parsing CSV data...');
      const separator = detectCSVSeparator(text);
      
      // Process headers and handle duplicates
      const headerInfo = processCSVHeaders(text, separator);
      const { originalHeaders, uniqueHeaders, columnMapping } = headerInfo;

      console.log('Header processing complete:', {
        originalCount: originalHeaders.length,
        uniqueCount: uniqueHeaders.length,
        duplicates: Object.keys(columnMapping.duplicateInfo).length
      });

      const lines = text.trim().split('\n');
      
      // Adaptive sampling based on dataset size to prevent browser crashes
      const totalDataRows = lines.length - 1;
      let MAX_ROWS = 10000; // Default sample size
      
      // Reduce sample size for extremely large datasets
      if (totalDataRows > 100000) {
        MAX_ROWS = 5000; // Very large files
      } else if (totalDataRows > 50000) {
        MAX_ROWS = 7500; // Large files
      }
      
      let rowData: any[][] = [];
      let isDataSampled = false;
      
      console.log(`Dataset has ${totalDataRows} rows, max sample: ${MAX_ROWS}`);
      
      if (lines.length > MAX_ROWS + 1) {
        // For very large datasets, take a representative sample
        isDataSampled = true;
        const sampleSize = MAX_ROWS;
        
        // Take samples from beginning, middle, and end for better representation
        const sampledLines: string[] = [];
        
        // Take first quarter
        const quarter1End = Math.floor(sampleSize / 4);
        sampledLines.push(...lines.slice(1, quarter1End + 1));
        
        // Take middle half
        const middleStart = Math.floor(totalDataRows / 2) - Math.floor(sampleSize / 4);
        const middleEnd = middleStart + Math.floor(sampleSize / 2);
        sampledLines.push(...lines.slice(middleStart + 1, middleEnd + 1));
        
        // Take last quarter
        const quarter4Start = totalDataRows - Math.floor(sampleSize / 4);
        sampledLines.push(...lines.slice(quarter4Start + 1));
        
        console.log(`Sampling ${sampledLines.length} rows from ${totalDataRows} total rows`);
        
        // Process sampled data
        for (const line of sampledLines) {
          const values = line.split(separator).map(v => {
            let cleaned = v.trim().replace(/^["']|["']$/g, '');
            if (cleaned === '' || cleaned.toLowerCase() === 'na' || cleaned.toLowerCase() === 'null') {
              return null;
            }
            const num = parseFloat(cleaned);
            return !isNaN(num) && isFinite(num) ? num : cleaned;
          });

          if (values.length === originalHeaders.length) {
            rowData.push(values);
          }
        }
        
        toast({
          title: "Large dataset detected",
          description: `Analyzing a sample of ${rowData.length} rows from ${totalDataRows} total rows for performance`,
        });
      } else {
        // Process all data for smaller datasets
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(separator).map(v => {
            let cleaned = v.trim().replace(/^["']|["']$/g, '');
            if (cleaned === '' || cleaned.toLowerCase() === 'na' || cleaned.toLowerCase() === 'null') {
              return null;
            }
            const num = parseFloat(cleaned);
            return !isNaN(num) && isFinite(num) ? num : cleaned;
          });

          if (values.length === originalHeaders.length) {
            rowData.push(values);
          }
        }
      }

      if (rowData.length === 0) {
        throw new Error('No valid data rows found');
      }

      console.log(`Parsed ${rowData.length} rows with ${uniqueHeaders.length} columns (sampled: ${isDataSampled})`);
      setProcessingProgress(20);

      // Load stored data types
      let storedDataTypes: Record<string, 'QUANTITATIVE' | 'QUALITATIVE'> | null = null;
      if (taskMethod.data_types) {
        storedDataTypes = taskMethod.data_types as Record<string, 'QUANTITATIVE' | 'QUALITATIVE'>;
      }

      let columns: ColumnInfo[] = [];
      
      try {
        if (storedDataTypes && Object.keys(storedDataTypes).length > 0) {
          console.log('Using stored data types for faster processing');
          // Use stored types for faster processing - pass columnMapping
          columns = await processColumnsWithWorker(rowData, uniqueHeaders, storedDataTypes, columnMapping);
        } else {
          console.log('Inferring data types...');
          // Infer types - pass columnMapping
          columns = await processColumnsWithWorker(rowData, uniqueHeaders, undefined, columnMapping);
          
          // Store inferred types for original data using unique IDs
          if (taskMethod.prev_version === null && columns.length > 0) {
            const dataTypesToStore = columns.reduce((acc, col) => {
              acc[col.name] = col.type; // Store using unique ID
              return acc;
            }, {} as Record<string, 'QUANTITATIVE' | 'QUALITATIVE'>);
            
            try {
              await supabase
                .from('TaskMethods')
                .update({ data_types: dataTypesToStore })
                .eq('id', taskMethod.id);
              console.log('Data types stored successfully');
            } catch (error) {
              console.warn('Failed to store data types:', error);
            }
          }
        }
      } catch (error) {
        console.error('Error in column processing:', error);
        // If all else fails, try with minimal processing
        console.log('Attempting minimal column processing...');
        try {
          columns = await processColumnsMainThread(
            rowData.slice(0, 100), // Use only first 100 rows for minimal processing
            uniqueHeaders, 
            storedDataTypes, 
            columnMapping
          );
        } catch (minimalError) {
          console.error('Even minimal processing failed:', minimalError);
          throw new Error('Dataset too large to process. Please try with a smaller file.');
        }
      }

      console.log(`Column processing complete: ${columns.length} columns processed`);
      
      setProcessingProgress(70);
      setProcessingStage('Calculating statistics...');

      // Calculate dataset-level statistics
      const dataTypes = columns.reduce((acc, col) => {
        acc[col.type] = (acc[col.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const missingValuesCount = columns.reduce((total, col) => total + col.missingValues, 0);
      
      setProcessingProgress(80);
      setProcessingStage('Detecting duplicates...');
      
      console.log('Detecting duplicates...');
      const duplicateRowsCount = await detectDuplicatesOptimized(rowData);
      console.log(`Duplicate detection complete: ${duplicateRowsCount} duplicates found`);
      
      setProcessingProgress(85);
      setProcessingStage('Calculating correlations...');
      
      // Calculate correlation with column mapping
      const correlationData = await calculateCorrelationOptimized(rowData, uniqueHeaders, columnMapping);
      
      setProcessingProgress(95);
      setProcessingStage('Finalizing...');

      // Count duplicate columns by comparing data (optimized for memory)
      let duplicateColumnsCount = 0;
      const maxSampleRows = Math.min(1000, rowData.length); // Sample for duplicate detection
      
      for (let i = 0; i < uniqueHeaders.length; i++) {
        for (let j = i + 1; j < uniqueHeaders.length; j++) {
          // Compare only a sample of rows for performance
          let isDuplicate = true;
          for (let rowIdx = 0; rowIdx < maxSampleRows; rowIdx++) {
            if (rowData[rowIdx][i] !== rowData[rowIdx][j]) {
              isDuplicate = false;
              break;
            }
          }
          
          if (isDuplicate) {
            duplicateColumnsCount++;
            break; // Found a duplicate for column i, move to next column
          }
        }
      }

      const dataset: DatasetType = {
        filename: fileDetails.file_name || 'Unknown',
        columns,
        rows: totalDataRows, // Use actual total rows, not sampled count
        rawData: rowData, // This contains the sampled data for UI display
        columnNames: uniqueHeaders, // Use unique identifiers
        originalColumnNames: originalHeaders, // Store original names
        columnMapping, // Store mapping information
        correlationData: correlationData || { matrix: [], labels: [] },
        missingValuesCount,
        duplicateRowsCount,
        duplicateColumnsCount,
        dataTypes,
      };

      console.log('Dataset processing complete:', {
        filename: dataset.filename,
        rows: dataset.rows,
        columns: dataset.columns.length,
        duplicateHeaders: Object.keys(columnMapping.duplicateInfo).length,
        correlationCalculated: !!correlationData
      });

      setTaskData(dataset);
      setProcessingProgress(100);
      setProcessingStage('Complete');

    } catch (error) {
      console.error('Error loading task data:', error);
      setTaskData(null);
      toast({
        title: "Error loading task data",
        description: error.message || "Failed to load task data. Please try again.",
        variant: "destructive",
      });
    } finally {
      // Clear timeout if processing completed
      if (processingTimeoutId) {
        clearTimeout(processingTimeoutId);
      }
      setLoadingTaskData(false);
      setProcessingProgress(0);
      setProcessingStage('');
    }
  }, [loadingTaskData, toast]);

  return {
    taskData,
    loadingTaskData,
    processingProgress,
    processingStage,
    selectedTask,
    loadTaskData,
    setTaskData,
    fileData,
    setFileData
  };
}

// Helper functions for basic processing
function inferBasicDataType(values: any[]): 'QUANTITATIVE' | 'QUALITATIVE' {
  if (!values || values.length === 0) return 'QUALITATIVE';
  
  const nonNullValues = values.filter(val => 
    val !== null && val !== undefined && val !== '' && 
    String(val).toUpperCase() !== 'NA' && String(val).toUpperCase() !== 'NULL'
  );
  
  if (nonNullValues.length === 0) return 'QUALITATIVE';
  
  let numericCount = 0;
  for (const val of nonNullValues.slice(0, Math.min(100, nonNullValues.length))) {
    const num = parseFloat(String(val));
    if (!isNaN(num) && isFinite(num)) {
      numericCount++;
    }
  }
  
  return (numericCount / Math.min(100, nonNullValues.length)) > 0.6 ? 'QUANTITATIVE' : 'QUALITATIVE';
}

function calculateBasicStats(columnData: any[], type: 'QUANTITATIVE' | 'QUALITATIVE'): Partial<ColumnInfo> {
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

  const stats: Partial<ColumnInfo> = {
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
      const mean = stats.mean as number;
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

// Add the missing helper functions for main thread processing
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