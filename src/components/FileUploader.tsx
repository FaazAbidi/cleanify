import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { DatasetType, ColumnInfo } from "@/types/dataset";
import { Progress } from "@/components/ui/progress";
import { calculateColumnStats, inferDataType } from "@/lib/data-utils";

interface FileUploaderProps {
  onDataLoaded: (data: DatasetType) => void;
  label?: string;
}

export const FileUploader = ({ onDataLoaded, label = "Upload CSV" }: FileUploaderProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const parseCSVInChunks = (text: string, chunkSize = 1000): Promise<any[][]> => {
    return new Promise((resolve) => {
      const lines = text.split('\n');
      const totalChunks = Math.ceil(lines.length / chunkSize);
      const result: any[][] = [];
      let processedChunks = 0;
      
      // Process first chunk immediately to get headers
      const headers = lines[0].split(',');
      result.push(headers);
      
      // Function to process a chunk of data
      const processChunk = (startIdx: number) => {
        const endIdx = Math.min(startIdx + chunkSize, lines.length);
        
        // Process this chunk
        for (let i = startIdx; i < endIdx; i++) {
          if (lines[i].trim() === '') continue;
          
          let values: string[] = [];
          let currentValue = '';
          let inQuotes = false;
          
          for (let j = 0; j < lines[i].length; j++) {
            const char = lines[i][j];
            
            if (char === '"') {
              inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
              values.push(currentValue);
              currentValue = '';
            } else {
              currentValue += char;
            }
          }
          
          values.push(currentValue);
          if (values.length === headers.length) {
            result.push(values);
          }
        }
        
        // Update progress
        processedChunks++;
        const newProgress = Math.floor((processedChunks / totalChunks) * 100);
        setProgress(newProgress);
        
        // Schedule next chunk or resolve if done
        if (endIdx < lines.length) {
          setTimeout(() => {
            processChunk(endIdx);
          }, 0); // Yield to browser UI thread
        } else {
          resolve(result);
        }
      };
      
      // Start processing from the second line (after headers)
      if (lines.length > 1) {
        setTimeout(() => {
          processChunk(1);
        }, 0);
      } else {
        resolve([headers]);
      }
    });
  };
  
  const calculateCorrelation = (data: any[][], columnNames: string[], columnTypes: Record<string, string>): Promise<{ matrix: number[][], labels: string[] }> => {
    return new Promise((resolve) => {
      // Only include numeric columns
      const numericColumnIndices = columnNames
        .map((name, idx) => ({ name, idx }))
        .filter(col => columnTypes[col.name] === 'numeric');
      
      const labels = numericColumnIndices.map(col => col.name);
      const indices = numericColumnIndices.map(col => col.idx);
      
      // If we have too many numeric columns, sample them to prevent browser crashes
      const maxColumns = 30; // Limit to prevent browser from freezing
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
      
      // Split processing into batches to avoid blocking UI
      const totalPairs = (sampledIndices.length * (sampledIndices.length - 1)) / 2;
      let processedPairs = 0;
      let batchSize = 100; // Process 100 correlations at a time
      
      // Process correlations in batches
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
        
        // Update progress for correlation calculation
        const correlationProgress = Math.min(95, 70 + Math.floor((processedPairs / totalPairs) * 25));
        setProgress(correlationProgress);
        
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
  
  const countDuplicateRows = (data: any[][]): number => {
    const stringifiedRows = data.map(row => JSON.stringify(row));
    const uniqueRows = new Set(stringifiedRows);
    return data.length - uniqueRows.size;
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setProgress(0);
    
    try {
      // Use FileReader with a chunking strategy
      const text = await readFileAsText(file, (loadedPercent) => {
        // This only tracks file reading progress, not processing
        setProgress(Math.floor(loadedPercent * 0.3)); // Reading file is ~30% of work
      });
      
      toast({
        title: "File loaded",
        description: "Now processing data...",
      });
      
      // Process CSV data in chunks
      const parsedData = await parseCSVInChunks(text);
      
      if (parsedData.length < 2) {
        throw new Error("The file does not contain enough data");
      }

      const columnNames = parsedData[0];
      const dataRows = parsedData.slice(1).filter(row => row.length === columnNames.length && !row.every(cell => cell === ''));

      // Process columns in batches
      setProgress(70); // CSV parsing is done
      const columnTypes: Record<string, 'numeric' | 'categorical' | 'datetime' | 'text' | 'boolean'> = {};
      const columns: ColumnInfo[] = [];
      
      // Process columns in batches of 10 to avoid blocking UI
      const batchSize = 10;
      for (let i = 0; i < columnNames.length; i += batchSize) {
        await new Promise(resolve => {
          setTimeout(() => {
            const batchEnd = Math.min(i + batchSize, columnNames.length);
            
            for (let colIndex = i; colIndex < batchEnd; colIndex++) {
              const name = columnNames[colIndex];
              const columnData = dataRows.map(row => row[colIndex]);
              const type = inferDataType(columnData);
              columnTypes[name] = type;
              
              columns.push({
                name,
                type,
                ...calculateColumnStats(columnData, type),
              } as ColumnInfo);
            }
            
            // Update progress
            const colProgress = 70 + Math.floor(((i + batchSize) / columnNames.length) * 20);
            setProgress(Math.min(colProgress, 90));
            resolve(null);
          }, 0);
        });
      }

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
      
      setProgress(92);
      
      // Calculate total missing values and duplicates
      const missingValuesCount = columns.reduce((total, col) => total + col.missingValues, 0);
      const duplicateRowsCount = await new Promise<number>(resolve => {
        setTimeout(() => {
          resolve(countDuplicateRows(dataRows));
        }, 0);
      });
      
      setProgress(95);
      
      // Calculate correlations (potentially expensive)
      const correlationData = await calculateCorrelation(dataRows, columnNames, columnTypes);

      setProgress(100);
      
      const processedData: DatasetType = {
        filename: file.name,
        columns,
        rows: dataRows.length,
        rawData: dataRows.slice(0, 100), // Limit to first 100 rows for display
        columnNames,
        correlationData,
        missingValuesCount,
        duplicateRowsCount,
        dataTypes,
      };

      // Small delay to show 100% progress before completing
      setTimeout(() => {
        onDataLoaded(processedData);
        toast({
          title: "Data processed successfully",
          description: `Loaded ${columns.length} columns and ${dataRows.length} rows.`,
        });
        setIsLoading(false);
        setProgress(0);
        if (event.target) {
          event.target.value = ''; // Reset input
        }
      }, 300);
      
    } catch (error) {
      console.error("Error processing file:", error);
      toast({
        title: "Error processing file",
        description: error instanceof Error ? error.message : "Please ensure your CSV file is properly formatted",
        variant: "destructive",
      });
      setIsLoading(false);
      setProgress(0);
      if (event.target) {
        event.target.value = ''; // Reset input
      }
    }
  };

  // Helper function to read file with progress
  const readFileAsText = (file: File, onProgress: (percent: number) => void): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentLoaded = (event.loaded / event.total) * 100;
          onProgress(percentLoaded);
        }
      };
      
      reader.onload = (e) => {
        onProgress(100);
        resolve(e.target?.result as string);
      };
      
      reader.onerror = () => {
        reject(new Error("Failed to read file"));
      };
      
      reader.readAsText(file);
    });
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="flex flex-col items-center">
      <Button 
        onClick={handleButtonClick} 
        disabled={isLoading}
      >
        <Upload className="mr-2 h-4 w-4" />
        {isLoading ? "Processing..." : label}
      </Button>
      <input
        ref={fileInputRef}
        id="file-upload"
        type="file"
        className="hidden"
        accept=".csv"
        onChange={handleFileUpload}
        disabled={isLoading}
      />
      {isLoading && (
        <div className="w-full max-w-xs mt-4">
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-center mt-1 text-gray-500">
            {progress < 100 ? `Processing: ${progress}%` : "Finalizing..."}
          </p>
        </div>
      )}
      <p className="text-xs text-gray-500 mt-2">Supports CSV files up to 100MB</p>
    </div>
  );
};
