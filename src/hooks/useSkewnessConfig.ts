import { useState, useEffect, useCallback } from 'react';
import { DatasetType } from '@/types/dataset';
import { formatColumnNameWithId } from '@/lib/data-utils';

interface SkewnessConfig {
  columnName: string;
  method?: 'log' | 'sqrt' | 'boxcox' | 'yeo-johnson';
}

interface UseSkewnessConfigProps {
  dataset: DatasetType | null;
}

interface UseSkewnessConfigReturn {
  selectedColumns: string[];
  setSelectedColumns: (columns: string[]) => void;
  columnConfigurations: SkewnessConfig[];
  updateColumnConfig: (columnName: string, config: Partial<SkewnessConfig>) => void;
  generatePayload: () => any | null;
}

export function useSkewnessConfig({ dataset }: UseSkewnessConfigProps): UseSkewnessConfigReturn {
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [columnConfigurations, setColumnConfigurations] = useState<SkewnessConfig[]>([]);
  
  // Initialize configurations when selected columns change
  useEffect(() => {
    if (!dataset || !selectedColumns.length) return;
    
    // Initialize configuration for each selected column
    const initialConfigs: SkewnessConfig[] = selectedColumns.map(columnName => {
      // Find existing config or create a new one
      const existingConfig = columnConfigurations.find(config => config.columnName === columnName);
      
      if (existingConfig) {
        return existingConfig;
      }
      
      return {
        columnName,
        method: 'log' as const // explicitly typed as literal
      };
    });
    
    setColumnConfigurations(initialConfigs);
  }, [selectedColumns, dataset]);
  
  // Update a single column's config
  const updateColumnConfig = useCallback((columnName: string, config: Partial<SkewnessConfig>) => {
    setColumnConfigurations(currentConfigs => {
      return currentConfigs.map(colConfig => {
        if (colConfig.columnName === columnName) {
          return { ...colConfig, ...config };
        }
        return colConfig;
      });
    });
  }, []);
  
  // Generate payload for API call
  const generatePayload = useCallback(() => {
    if (!dataset || !selectedColumns.length || !columnConfigurations.length) {
      return null;
    }
    
    const columns: Record<string, any> = {};
    
    columnConfigurations.forEach(config => {
      // Format column name with ID for API
      const formattedColumnName = formatColumnNameWithId(config.columnName, dataset);
      
      columns[formattedColumnName] = {
        type: "QUANTITATIVE",
        step: config.method || 'log',
        value: null
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
  }, [dataset, selectedColumns, columnConfigurations]);
  
  return {
    selectedColumns,
    setSelectedColumns,
    columnConfigurations,
    updateColumnConfig,
    generatePayload
  };
} 