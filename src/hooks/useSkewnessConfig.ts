import { useState, useEffect } from 'react';
import { DatasetType } from '@/types/dataset';
import { SkewnessMethod } from '@/types/methods';
import { getSkewedColumns } from '@/lib/data-utils';

type ColumnConfig = {
  columnName: string;
  method: SkewnessMethod;
  value: string | null;
};

type UseSkewnessConfigProps = {
  dataset: DatasetType | null;
};

type UseSkewnessConfigReturn = {
  selectedColumns: string[];
  setSelectedColumns: (columns: string[]) => void;
  columnConfigurations: ColumnConfig[];
  updateColumnConfiguration: (columnName: string, updates: Partial<ColumnConfig>) => void;
  getDefaultMethodForColumn: (columnName: string) => SkewnessMethod;
  generatePayload: () => any;
};

export function useSkewnessConfig({ dataset }: UseSkewnessConfigProps): UseSkewnessConfigReturn {
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [columnConfigurations, setColumnConfigurations] = useState<ColumnConfig[]>([]);
  
  // Initialize configurations when selected columns change
  useEffect(() => {
    if (!dataset || !selectedColumns.length) return;
    
    // Initialize configuration for each selected column
    const initialConfigs: ColumnConfig[] = selectedColumns.map(columnName => {
      // Find existing config or create a new one
      const existingConfig = columnConfigurations.find(config => config.columnName === columnName);
      
      if (existingConfig) {
        return existingConfig;
      }
      
      // Get default method for this column
      const defaultMethod = getDefaultMethodForColumn(columnName);
      
      return {
        columnName,
        method: defaultMethod,
        value: null // Skewness methods don't usually need a value
      };
    });
    
    setColumnConfigurations(initialConfigs);
  }, [selectedColumns, dataset]);
  
  // Get default method based on column characteristics (like skewness direction)
  const getDefaultMethodForColumn = (columnName: string): SkewnessMethod => {
    if (!dataset) return 'log';
    
    const columnInfo = dataset.columns.find(col => col.name === columnName);
    
    if (columnInfo && columnInfo.skewness !== undefined) {
      // For positive skewness, log is often good
      // For negative skewness, square root might be better
      if (columnInfo.skewness > 0) {
        return 'log';
      } else {
        return 'sqrt';
      }
    }
    
    // Default to log transform
    return 'log';
  };
  
  // Update a column's configuration
  const updateColumnConfiguration = (columnName: string, updates: Partial<ColumnConfig>) => {
    setColumnConfigurations(prevConfigs => {
      return prevConfigs.map(config => {
        if (config.columnName === columnName) {
          return { ...config, ...updates };
        }
        return config;
      });
    });
  };
  
  // Generate payload for API call
  const generatePayload = () => {
    if (!dataset || !selectedColumns.length || !columnConfigurations.length) {
      return null;
    }
    
    const columns: Record<string, any> = {};
    
    columnConfigurations.forEach(config => {
      columns[config.columnName] = {
        type: "QUANTITATIVE",
        step: config.method,
        value: config.value
      };
    });
    
    return {
      technique: "data_transformation",
      method: "fix_skewness",
      step: null,
      value: null,
      target: null,
      columns
    };
  };
  
  return {
    selectedColumns,
    setSelectedColumns,
    columnConfigurations,
    updateColumnConfiguration,
    getDefaultMethodForColumn,
    generatePayload
  };
} 