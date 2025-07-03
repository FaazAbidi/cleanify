import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DatasetType, ColumnMapping } from "@/types/dataset";
import { Tables } from "@/integrations/supabase/types";
import { calculateColumnStats, inferSimplifiedDataType, detectCSVSeparator, createColumnsFromDataTypes, inferDataTypesForOriginalData, createDataTypesFromColumns, processCSVHeaders, generateUniqueColumnIdentifiers } from "@/lib/data-utils";
import { useToast } from "@/components/ui/use-toast";
import { TaskVersion } from "@/types/version";
import { ColumnInfo } from "@/types/dataset";

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

  const countDuplicateRows = (data: any[][]): number => {
    const stringifiedRows = data.map(row => JSON.stringify(row));
    const uniqueRows = new Set(stringifiedRows);
    return data.length - uniqueRows.size;
  };

  const countDuplicateColumns = (columnNames: string[]): number => {
    // Trim column names to handle any whitespace/carriage return characters
    const trimmedColumnNames = columnNames.map(name => name.trim());
    const uniqueColumnNames = new Set(trimmedColumnNames);
    return trimmedColumnNames.length - uniqueColumnNames.size;
  };

  const calculateCorrelation = async (data: any[][], headers: string[], columnTypes: string[]) => {
    try {
      // Filter for numeric columns only
      const numericIndices = columnTypes
        .map((type, index) => type === 'QUANTITATIVE' ? index : -1)
        .filter(index => index !== -1);

      if (numericIndices.length < 2) {
        return null; // Need at least 2 numeric columns for correlation
      }

      // Extract numeric data
      const numericData = data.map(row => 
        numericIndices.map(index => {
          const value = parseFloat(row[index]);
          return isNaN(value) ? 0 : value;
        })
      );

      const numericHeaders = numericIndices.map(index => headers[index]);
      
      // Calculate correlation matrix
      const correlationMatrix = calculateCorrelationMatrix(numericData);
      
      return {
        matrix: correlationMatrix,
        labels: numericHeaders
      };
    } catch (error) {
      console.error('Error calculating correlation:', error);
      return null;
    }
  };

  const calculateCorrelationMatrix = (data: number[][]): number[][] => {
    const numCols = data[0].length;
    const matrix: number[][] = [];

    for (let i = 0; i < numCols; i++) {
      matrix[i] = [];
      for (let j = 0; j < numCols; j++) {
        if (i === j) {
          matrix[i][j] = 1;
        } else {
          const col1 = data.map(row => row[i]);
          const col2 = data.map(row => row[j]);
          matrix[i][j] = pearsonCorrelation(col1, col2);
        }
      }
    }

    return matrix;
  };

  const pearsonCorrelation = (x: number[], y: number[]): number => {
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
  };

  const processCSVData = async (csvContent: string, filename: string): Promise<DatasetType> => {
    try {
      // Detect separator
      const separator = detectCSVSeparator(csvContent);
      
      // Process headers and handle duplicates
      const headerInfo = processCSVHeaders(csvContent, separator);
      const { originalHeaders, uniqueHeaders, columnMapping } = headerInfo;
      
      // Parse CSV manually
      const lines = csvContent.trim().split('\n');
      
      // Parse data rows
      const rowData: any[][] = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(separator).map(v => {
          // Remove quotes and trim
          let cleaned = v.trim().replace(/^["']|["']$/g, '');
          
          // Handle empty values
          if (cleaned === '' || cleaned.toLowerCase() === 'na' || cleaned.toLowerCase() === 'null') {
            return null;
          }
          
          // Try to parse as number
          const num = parseFloat(cleaned);
          if (!isNaN(num) && isFinite(num)) {
            return num;
          }
          
          // Return as string
          return cleaned;
        });
        
        // Only add rows that have the correct number of columns
        if (values.length === originalHeaders.length) {
          rowData.push(values);
        }
      }

      if (rowData.length === 0) {
        throw new Error('No valid data rows found in CSV');
      }

      // Log duplicate header information
      if (Object.keys(columnMapping.duplicateInfo).length > 0) {
        console.log('Duplicate headers detected:', columnMapping.duplicateInfo);
        console.log('Generated unique column IDs:', uniqueHeaders);
      }

      // Calculate column statistics using unique identifiers
      const columns: ColumnInfo[] = [];
      for (let i = 0; i < uniqueHeaders.length; i++) {
        const uniqueId = uniqueHeaders[i];
        const originalName = originalHeaders[i];
        const columnData = rowData.map(row => row[i]);
        const type = inferSimplifiedDataType(columnData);
        
        const detailedType = inferSimplifiedDataType(columnData);
        const stats = calculateColumnStats(columnData, detailedType);
        
        const columnInfo: ColumnInfo = {
          name: uniqueId, // Use unique ID as primary identifier
          originalName: originalName, // Store original name for display
          type,
          uniqueValues: stats.uniqueValues || 0,
          missingValues: stats.missingValues || 0,
          missingPercent: stats.missingPercent || 0,
          ...stats,
        };
        
        columns.push(columnInfo);
      }

      // Count data types (using the simplified types from ColumnInfo)
      const dataTypes: Record<string, number> = {
        QUANTITATIVE: 0,
        QUALITATIVE: 0,
      };
      
      columns.forEach(col => {
        dataTypes[col.type]++;
      });

      // Count missing values, duplicates
      const missingValuesCount = columns.reduce((sum, col) => sum + col.missingValues, 0);
      
      // Calculate duplicate rows
      const rowStrings = rowData.map(row => JSON.stringify(row));
      const uniqueRows = new Set(rowStrings);
      const duplicateRowsCount = rowData.length - uniqueRows.size;

      // Calculate duplicate columns (by comparing column data)
      let duplicateColumnsCount = 0;
      for (let i = 0; i < uniqueHeaders.length; i++) {
        for (let j = i + 1; j < uniqueHeaders.length; j++) {
          const col1Data = rowData.map(row => row[i]);
          const col2Data = rowData.map(row => row[j]);
          if (JSON.stringify(col1Data) === JSON.stringify(col2Data)) {
            duplicateColumnsCount++;
            break; // Count each duplicate column only once
          }
        }
      }

      const dataset: DatasetType = {
        filename,
        columns,
        rows: rowData.length,
        rawData: rowData,
        columnNames: uniqueHeaders, // Use unique identifiers
        originalColumnNames: originalHeaders, // Store original names
        columnMapping, // Store mapping information
        missingValuesCount,
        duplicateRowsCount,
        duplicateColumnsCount,
        dataTypes,
      };

      // Calculate correlation data for numeric columns (using unique identifiers for calculation)
      const columnTypes = uniqueHeaders.map((_, index) => {
        const columnData = rowData.map(row => row[index]);
        return inferSimplifiedDataType(columnData);
      });
      
      const correlationData = await calculateCorrelation(rowData, uniqueHeaders, columnTypes);
      if (correlationData) {
        // Update correlation labels to use original names for display
        if (correlationData.labels && correlationData.labels.length > 0) {
          correlationData.labels = correlationData.labels.map(uniqueId => 
            columnMapping.idToOriginalMap[uniqueId] || uniqueId
          );
        }
        dataset.correlationData = correlationData;
      }

      return dataset;
    } catch (error) {
      console.error('Error processing CSV data:', error);
      throw error;
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
      
      // Detect the CSV separator and process headers
      const separator = detectCSVSeparator(text);
      const headerInfo = processCSVHeaders(text, separator);
      const { originalHeaders, uniqueHeaders, columnMapping } = headerInfo;
      
      const lines = text.trim().split('\n');
      
      // Sample the data if it's very large to prevent browser crashes
      const MAX_ROWS = 5000;
      let rowData: string[][];
      
      if (lines.length > MAX_ROWS + 1) {
        // Extract a sample of rows
        const sampleRows = [
          ...lines.slice(1, Math.floor(MAX_ROWS/2) + 1),
          ...lines.slice(lines.length - Math.ceil(MAX_ROWS/2))
        ];
        rowData = sampleRows.map(line => line.split(separator).map(cell => cell.trim()));
        
        toast({
          title: "Large dataset detected",
          description: `Showing a sample of ${MAX_ROWS} rows out of ${lines.length - 1} total rows`,
        });
      } else {
        rowData = lines.slice(1).map(line => line.split(separator).map(cell => cell.trim()));
      }
      
      setProcessingProgress(20);

      // Get stored data types from TaskMethods table
      const storedDataTypes = taskMethod.data_types as Record<string, 'QUANTITATIVE' | 'QUALITATIVE'> | null;
      
      let columns: ColumnInfo[] = [];
      let dataTypesToUse: Record<string, 'QUANTITATIVE' | 'QUALITATIVE'> = {};

      if (storedDataTypes) {
        // Use stored data types as source of truth
        console.log('Using stored data types from database:', storedDataTypes);
        dataTypesToUse = storedDataTypes;
        // Use unique headers and column mapping for stored data types
        columns = createColumnsFromDataTypes(rowData, uniqueHeaders, storedDataTypes, columnMapping);
      } else {
        // Fallback: infer data types and store them if this is an original version
        console.log('No stored data types found, inferring data types');
        
        // Process column types and statistics in batches
        const batchSize = 5;
        for (let i = 0; i < uniqueHeaders.length; i += batchSize) {
          await new Promise(resolve => {
            setTimeout(() => {
              const batchEnd = Math.min(i + batchSize, uniqueHeaders.length);
              
              for (let colIndex = i; colIndex < batchEnd; colIndex++) {
                const uniqueId = uniqueHeaders[colIndex];
                const originalName = originalHeaders[colIndex];
                const columnData = rowData.map(row => row[colIndex]);
                const type = inferSimplifiedDataType(columnData);
                dataTypesToUse[uniqueId] = type;
                
                const stats = calculateColumnStats(columnData, type);
                
                const columnInfo = {
                  name: uniqueId,
                  originalName: originalName,
                  type,
                  uniqueValues: stats.uniqueValues || 0,
                  missingValues: stats.missingValues || 0,
                  missingPercent: stats.missingPercent || 0,
                  ...stats,
                } as ColumnInfo;
                
                columns.push(columnInfo);
              }
              
              // Update progress (40% of total for column processing)
              const colProgress = 20 + Math.floor(((i + batchSize) / uniqueHeaders.length) * 40);
              setProcessingProgress(Math.min(colProgress, 60));
              resolve(null);
            }, 0);
          });
        }

        // If this is an original data version (no prev_version), store the inferred data types
        // Store using unique IDs as keys
        if (taskMethod.prev_version === null) {
          try {
            const dataTypesToStore = columns.reduce((acc, col) => {
              acc[col.name] = col.type; // Use unique ID as key
              return acc;
            }, {} as Record<string, 'QUANTITATIVE' | 'QUALITATIVE'>);
            
            const { error: updateError } = await supabase
              .from('TaskMethods')
              .update({ data_types: dataTypesToStore })
              .eq('id', taskMethod.id);
            
            if (updateError) {
              console.error('Error storing inferred data types:', updateError);
            } else {
              console.log('Successfully stored inferred data types for original version');
            }
          } catch (error) {
            console.error('Error updating TaskMethods with data types:', error);
          }
        }
      }

      setProcessingProgress(60);

      // Count data types using the determined types
      const dataTypes: Record<string, number> = {
        QUANTITATIVE: 0,
        QUALITATIVE: 0,
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
      const duplicateColumnsCount = countDuplicateColumns(originalHeaders);
      
      setProcessingProgress(70);
      
      // Create dataset object
      const dataset: DatasetType = {
        filename: fileName,
        columns: columns,
        rows: rowData.length,
        rawData: rowData,
        columnNames: uniqueHeaders,
        originalColumnNames: originalHeaders,
        columnMapping: columnMapping,
        missingValuesCount,
        duplicateRowsCount,
        duplicateColumnsCount,
        dataTypes,
        correlationData: { matrix: [], labels: [] }
      };
      
      // Calculate correlations (potentially expensive)
      const columnTypesArray = uniqueHeaders.map(uniqueId => dataTypesToUse[uniqueId]);
      const correlationData = await calculateCorrelation(rowData, uniqueHeaders, columnTypesArray);
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