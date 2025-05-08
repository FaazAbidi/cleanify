
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { DatasetType, ColumnInfo } from "@/types/dataset";

interface FileUploaderProps {
  onDataLoaded: (data: DatasetType) => void;
  label?: string;
}

export const FileUploader = ({ onDataLoaded, label = "Upload CSV" }: FileUploaderProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const inferDataType = (values: any[]): 'numeric' | 'categorical' | 'datetime' | 'text' | 'boolean' => {
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

  const calculateColumnStats = (columnData: any[], type: 'numeric' | 'categorical' | 'datetime' | 'text' | 'boolean'): Partial<ColumnInfo> => {
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
        
        // Calculate distribution (simplified histogram)
        const distribution: Record<number, number> = {};
        const buckets = 5;
        const range = stats.max as number - (stats.min as number);
        const bucketSize = range / buckets;
        
        for (let i = 0; i < buckets; i++) {
          const bucketMin = (stats.min as number) + i * bucketSize;
          const bucketMax = bucketMin + bucketSize;
          const bucketKey = bucketMin;
          distribution[bucketKey] = numericValues.filter(
            val => val >= bucketMin && val < bucketMax
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

  const parseCSV = (text: string): any[][] => {
    const lines = text.split('\n');
    return lines.map(line => {
      let values: string[] = [];
      let currentValue = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
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
      return values;
    });
  };
  
  const calculateCorrelation = (data: any[][], columnNames: string[], columnTypes: Record<string, string>): { matrix: number[][], labels: string[] } => {
    // Only include numeric columns
    const numericColumnIndices = columnNames
      .map((name, idx) => ({ name, idx }))
      .filter(col => columnTypes[col.name] === 'numeric');
    
    const labels = numericColumnIndices.map(col => col.name);
    const indices = numericColumnIndices.map(col => col.idx);
    
    // Initialize correlation matrix
    const matrix: number[][] = Array(indices.length)
      .fill(0)
      .map(() => Array(indices.length).fill(0));
    
    // Calculate correlation for each pair of columns
    for (let i = 0; i < indices.length; i++) {
      // Perfect correlation with itself
      matrix[i][i] = 1;
      
      for (let j = i + 1; j < indices.length; j++) {
        const col1 = data.map(row => parseFloat(row[indices[i]])).filter(val => !isNaN(val));
        const col2 = data.map(row => parseFloat(row[indices[j]])).filter(val => !isNaN(val));
        
        // Only calculate if we have enough data points
        if (col1.length > 5 && col2.length > 5) {
          // Calculate means
          const mean1 = col1.reduce((a, b) => a + b, 0) / col1.length;
          const mean2 = col2.reduce((a, b) => a + b, 0) / col2.length;
          
          // Calculate correlation
          let num = 0, den1 = 0, den2 = 0;
          
          for (let k = 0; k < Math.min(col1.length, col2.length); k++) {
            const diff1 = col1[k] - mean1;
            const diff2 = col2[k] - mean2;
            
            num += diff1 * diff2;
            den1 += diff1 * diff1;
            den2 += diff2 * diff2;
          }
          
          const corr = num / Math.sqrt(den1 * den2);
          matrix[i][j] = Math.round(corr * 100) / 100;
          matrix[j][i] = matrix[i][j]; // Correlation matrix is symmetric
        }
      }
    }
    
    return { matrix, labels };
  };
  
  const countDuplicateRows = (data: any[][]): number => {
    const stringifiedRows = data.map(row => JSON.stringify(row));
    const uniqueRows = new Set(stringifiedRows);
    return data.length - uniqueRows.size;
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsedData = parseCSV(text);
        
        if (parsedData.length < 2) {
          throw new Error("The file does not contain enough data");
        }

        const columnNames = parsedData[0];
        const dataRows = parsedData.slice(1).filter(row => row.length === columnNames.length && !row.every(cell => cell === ''));

        const columnTypes: Record<string, 'numeric' | 'categorical' | 'datetime' | 'text' | 'boolean'> = {};
        const columns: ColumnInfo[] = columnNames.map((name, colIndex) => {
          const columnData = dataRows.map(row => row[colIndex]);
          const type = inferDataType(columnData);
          columnTypes[name] = type;
          
          return {
            name,
            type,
            ...calculateColumnStats(columnData, type),
          } as ColumnInfo;
        });

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
        
        // Calculate total missing values
        const missingValuesCount = columns.reduce((total, col) => total + col.missingValues, 0);
        
        // Count duplicate rows
        const duplicateRowsCount = countDuplicateRows(dataRows);
        
        // Calculate correlations
        const correlationData = calculateCorrelation(dataRows, columnNames, columnTypes);

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

        onDataLoaded(processedData);
      } catch (error) {
        console.error("Error processing file:", error);
        toast({
          title: "Error processing file",
          description: "Please ensure your CSV file is properly formatted",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    reader.onerror = () => {
      toast({
        title: "Error reading file",
        description: "There was an error reading the file",
        variant: "destructive",
      });
      setIsLoading(false);
    };

    reader.readAsText(file);
  };

  return (
    <div className="flex flex-col items-center">
      <label htmlFor="file-upload" className="cursor-pointer">
        <div className="flex items-center">
          <Button disabled={isLoading}>
            <Upload className="mr-2 h-4 w-4" />
            {isLoading ? "Processing..." : label}
          </Button>
        </div>
        <input
          id="file-upload"
          type="file"
          className="hidden"
          accept=".csv"
          onChange={handleFileUpload}
          disabled={isLoading}
        />
      </label>
      <p className="text-xs text-gray-500 mt-2">Supports CSV files</p>
    </div>
  );
};
