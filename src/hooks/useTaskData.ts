import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DatasetType } from "@/types/dataset";
import { Tables } from "@/integrations/supabase/types";
import { calculateColumnStats, inferDataType } from "@/lib/data-utils";
import { useToast } from "@/components/ui/use-toast";
import { TaskVersion } from "@/types/version";

// Maximum number of retries for API calls
const MAX_RETRIES = 3;
// Delay between retries (in ms)
const RETRY_DELAY = 1000;

export function useTaskData() {
  const [taskData, setTaskData] = useState<DatasetType | null>(null);
  const [fileData, setFileData] = useState<Tables<'Files'> | null>(null);
  const [loadingTaskData, setLoadingTaskData] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [selectedTask, setSelectedTask] = useState<Tables<'Tasks'> | null>(null);
  const { toast } = useToast();

  // Helper function to calculate Pearson correlation
  const calculatePearsonCorrelation = (x: number[], y: number[]): number => {
    // Must have same length
    if (x.length !== y.length || x.length === 0) {
      return 0;
    }
    
    // Calculate means
    const meanX = x.reduce((sum, val) => sum + val, 0) / x.length;
    const meanY = y.reduce((sum, val) => sum + val, 0) / y.length;
    
    // Calculate covariance and standard deviations
    let covariance = 0;
    let varX = 0;
    let varY = 0;
    
    for (let i = 0; i < x.length; i++) {
      const xDiff = x[i] - meanX;
      const yDiff = y[i] - meanY;
      covariance += xDiff * yDiff;
      varX += xDiff * xDiff;
      varY += yDiff * yDiff;
    }
    
    // Prevent division by zero
    if (varX === 0 || varY === 0) {
      return 0;
    }
    
    // Return Pearson correlation coefficient
    return covariance / (Math.sqrt(varX) * Math.sqrt(varY));
  };

  // Calculate correlation matrix for numeric columns
  const calculateCorrelation = async (
    data: any[][], 
    columnNames: string[], 
    columnTypes: Record<string, string>
  ): Promise<{ matrix: number[][], labels: string[] }> => {
    // Only include numeric columns
    const numericColumnIndices = columnNames
      .map((name, idx) => ({ name, idx }))
      .filter(col => columnTypes[col.name] === 'numeric');
    
    const labels = numericColumnIndices.map(col => col.name);
    const indices = numericColumnIndices.map(col => col.idx);
    
    // If we have too many numeric columns, sample them to prevent browser crashes
    const maxColumns = 20; // Reduced from 30 to prevent resource issues
    let sampledIndices = indices;
    let sampledLabels = labels;
    
    if (indices.length > maxColumns) {
      // Take a sample of columns if there are too many
      sampledIndices = [];
      sampledLabels = [];
      
      // Always include first few columns for consistency
      const firstColumns = 5;
      for (let i = 0; i < Math.min(firstColumns, indices.length); i++) {
        sampledIndices.push(indices[i]);
        sampledLabels.push(labels[i]);
      }
      
      // Then sample the rest
      const step = Math.ceil((indices.length - firstColumns) / (maxColumns - firstColumns));
      for (let i = firstColumns; i < indices.length; i += step) {
        if (sampledIndices.length < maxColumns) {
          sampledIndices.push(indices[i]);
          sampledLabels.push(labels[i]);
        }
      }
    }
    
    // Create empty correlation matrix
    const matrix: number[][] = Array(sampledIndices.length).fill(0)
      .map(() => Array(sampledIndices.length).fill(0));
    
    // Fill matrix diagonal with 1's (self-correlation)
    for (let i = 0; i < sampledIndices.length; i++) {
      matrix[i][i] = 1;
    }
    
    // Process correlations in batches to prevent UI from freezing
    const totalPairs = (sampledIndices.length * (sampledIndices.length - 1)) / 2;
    let processedPairs = 0;
    const batchSize = 50; // Reduced from 100 to prevent resource issues
    
    return new Promise((resolve) => {
      const processBatch = () => {
        const startTime = Date.now();
        let pairsInBatch = 0;
        
        // For each pair of columns
        outerLoop: for (let i = 0; i < sampledIndices.length; i++) {
          for (let j = i + 1; j < sampledIndices.length; j++) {
            // Skip if already calculated
            if (matrix[i][j] !== 0) continue;
            
            const colIndex1 = sampledIndices[i];
            const colIndex2 = sampledIndices[j];
            
            // Extract data for both columns, filter out non-numeric values
            const colData1: number[] = [];
            const colData2: number[] = [];
            
            for (let k = 0; k < data.length; k++) {
              const val1 = parseFloat(data[k][colIndex1]);
              const val2 = parseFloat(data[k][colIndex2]);
              
              if (!isNaN(val1) && !isNaN(val2)) {
                colData1.push(val1);
                colData2.push(val2);
              }
            }
            
            // Calculate correlation if we have enough data points
            if (colData1.length > 1) {
              const correlation = calculatePearsonCorrelation(colData1, colData2);
              
              // Store correlation in matrix (symmetric)
              matrix[i][j] = correlation;
              matrix[j][i] = correlation;
            } else {
              // Not enough data for correlation
              matrix[i][j] = 0;
              matrix[j][i] = 0;
            }
            
            pairsInBatch++;
            processedPairs++;
            
            // Check if batch limit reached or taking too long (50ms)
            if (pairsInBatch >= batchSize || Date.now() - startTime > 50) {
              break outerLoop;
            }
          }
        }
        
        // Update progress
        const correlationProgress = Math.min(95, 70 + Math.floor((processedPairs / totalPairs) * 25));
        setProcessingProgress(correlationProgress);
        
        // Check if all pairs processed
        const allProcessed = processedPairs >= totalPairs;
        
        if (allProcessed) {
          resolve({ matrix, labels: sampledLabels });
        } else {
          // Schedule next batch with a small delay to allow UI updates
          setTimeout(processBatch, 0);
        }
      };
      
      // Start processing
      if (sampledIndices.length > 0) {
        processBatch();
      } else {
        resolve({ matrix: [], labels: [] });
      }
    });
  };

  const countDuplicateRows = (data: any[][]): number => {
    const stringifiedRows = data.map(row => JSON.stringify(row));
    const uniqueRows = new Set(stringifiedRows);
    return data.length - uniqueRows.size;
  };

  const countDuplicateColumns = (columnNames: string[]): number => {
    const uniqueColumnNames = new Set(columnNames);
    return columnNames.length - uniqueColumnNames.size;
  };

  // Helper function to retry API calls
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

  const loadTaskData = useCallback(async (
    taskMethod: TaskVersion,
  ) => {
    // If already loading, don't make another request
    if (loadingTaskData) return;

    setLoadingTaskData(true);
    setProcessingProgress(0);
    
    try {
      const fileDetails = taskMethod.file
      if (fileDetails === null) {
        toast({
          title: "Error",
          description: "No file found for this task method",
          variant: "destructive",
        });
        return;
      }

      const fileName = fileDetails.file_name || 'dataset.csv';
  
      setFileData(fileDetails);

      let bucket = 'raw-data';
      if (taskMethod.prev_version === null) {
        bucket = 'raw-data';
      } else {
        bucket = 'processed-data';
      }
      
      // Now download the file using the path
      const { data: fileData, error: fileError } = await retryFetch(() => 
        Promise.resolve(
          supabase.storage
            .from(bucket)
            .download(fileDetails.path)
        )
      );
      
      if (fileError) throw fileError;
      
      // Parse the CSV data
      const text = await fileData.text();
      const lines = text.trim().split('\n');
      const headers = lines[0].split(',');
      
      // Sample the data if it's very large to prevent browser crashes
      const MAX_ROWS = 5000;
      let rowData: string[][];
      
      if (lines.length > MAX_ROWS + 1) {
        // Extract a sample of rows
        const sampleRows = [
          ...lines.slice(1, Math.floor(MAX_ROWS/2) + 1),
          ...lines.slice(lines.length - Math.ceil(MAX_ROWS/2))
        ];
        rowData = sampleRows.map(line => line.split(','));
        
        toast({
          title: "Large dataset detected",
          description: `Showing a sample of ${MAX_ROWS} rows out of ${lines.length - 1} total rows`,
        });
      } else {
        rowData = lines.slice(1).map(line => line.split(','));
      }
      
      setProcessingProgress(20);

      // Process column types and statistics in batches
      const columnTypes: Record<string, string> = {};
      const columns: any[] = [];
      const batchSize = 5; // Process 5 columns at a time

      for (let i = 0; i < headers.length; i += batchSize) {
        await new Promise(resolve => {
          setTimeout(() => {
            const batchEnd = Math.min(i + batchSize, headers.length);
            
            for (let colIndex = i; colIndex < batchEnd; colIndex++) {
              const name = headers[colIndex];
              const columnData = rowData.map(row => row[colIndex]);
              const type = inferDataType(columnData);
              columnTypes[name] = type;
              
              columns.push({
                name,
                type,
                ...calculateColumnStats(columnData, type),
              });
            }
            
            // Update progress (40% of total for column processing)
            const colProgress = 20 + Math.floor(((i + batchSize) / headers.length) * 40);
            setProcessingProgress(Math.min(colProgress, 60));
            resolve(null);
          }, 0);
        });
      }

      setProcessingProgress(60);

      // Count data types
      const dataTypes: Record<string, number> = {
        numeric: 0,
        categorical: 0,
        datetime: 0,
        text: 0,
        boolean: 0,
      };
      
      columns.forEach(col => {
        dataTypes[col.type]++;
      });
      
      setProcessingProgress(65);
      
      // Calculate total missing values
      const missingValuesCount = columns.reduce((total, col) => total + col.missingValues, 0);
      
      // Calculate duplicate rows (in a separate thread to avoid blocking UI)
      const duplicateRowsCount = await new Promise<number>(resolve => {
        setTimeout(() => {
          resolve(countDuplicateRows(rowData));
        }, 0);
      });

      // Calculate duplicate columns
      const duplicateColumnsCount = countDuplicateColumns(headers);
      
      setProcessingProgress(70);
      
      // Create dataset object
      const dataset: DatasetType = {
        filename: fileName,
        columns: columns,
        rows: rowData.length,
        rawData: rowData,
        columnNames: headers,
        missingValuesCount,
        duplicateRowsCount,
        duplicateColumnsCount,
        dataTypes,
        correlationData: { matrix: [], labels: [] }
      };
      
      // Calculate correlations (potentially expensive)
      const correlationData = await calculateCorrelation(rowData, headers, columnTypes);
      dataset.correlationData = correlationData;
      
      setProcessingProgress(100);
      setTaskData(dataset);
    } catch (error: any) {
      console.error("Error loading task data:", error);
      toast({
        title: "Error",
        description: "Failed to load task data. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setLoadingTaskData(false);
    }
  }, [loadingTaskData, toast]);

  return {
    taskData,
    loadingTaskData,
    processingProgress,
    selectedTask,
    loadTaskData,
    setTaskData,
    fileData,
    setFileData
  };
} 