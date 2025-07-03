import { useState, useEffect } from 'react';
import { DatasetType, ColumnInfo } from '@/types/dataset';
import { ColumnConfig, InconsistencyMethod, Method, MethodConfig } from '@/types/methods';

export interface ColumnInconsistencyConfig {
  columnName: string;
  method: InconsistencyMethod;
}

interface UseInconsistencyConfigProps {
  dataset: DatasetType | null;
}

interface UseInconsistencyConfigReturn {
  selectedColumns: string[];
  setSelectedColumns: (columns: string[]) => void;
  columnConfigurations: ColumnInconsistencyConfig[];
  updateColumnConfiguration: (configurations: ColumnInconsistencyConfig[]) => void;
  getDefaultMethodForColumn: (columnInfo: ColumnInfo) => InconsistencyMethod;
  generatePayload: () => MethodConfig | null;
}

export function useInconsistencyConfig({ dataset }: UseInconsistencyConfigProps): UseInconsistencyConfigReturn {
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [columnConfigurations, setColumnConfigurations] = useState<ColumnInconsistencyConfig[]>([]);

  // Determine default inconsistency method based on column type
  const getDefaultMethodForColumn = (columnInfo: ColumnInfo): InconsistencyMethod => {
    if (columnInfo.type === 'QUANTITATIVE') {
      return 'impute_mean';
    } else if (columnInfo.type === 'QUALITATIVE') {
      return 'impute_mode';
    } else {
      return 'remove';
    }
  };

  // Update configurations when selected columns change
  useEffect(() => {
    if (!dataset) return;

    // Create default configurations for newly selected columns
    const newConfigs: ColumnInconsistencyConfig[] = [];
    
    selectedColumns.forEach(columnName => {
      // Check if configuration already exists
      const existingConfig = columnConfigurations.find(config => config.columnName === columnName);
      
      if (existingConfig) {
        newConfigs.push(existingConfig);
      } else {
        // Create new configuration with default method
        const columnInfo = dataset.columns.find(col => col.name === columnName);
        if (columnInfo) {
          const defaultMethod = getDefaultMethodForColumn(columnInfo);
          newConfigs.push({
            columnName,
            method: defaultMethod
          });
        }
      }
    });
    
    setColumnConfigurations(newConfigs);
  }, [selectedColumns, dataset]);

  // Update column configurations
  const updateColumnConfiguration = (configurations: ColumnInconsistencyConfig[]) => {
    setColumnConfigurations(configurations);
  };

  // Generate payload for API
  const generatePayload = (): MethodConfig | null => {
    if (!selectedColumns.length || !columnConfigurations.length || !dataset) {
      return null;
    }

    const columns: Record<string, {
      type: 'QUANTITATIVE' | 'QUALITATIVE';
      step: InconsistencyMethod;
    }> = {};
    
    columnConfigurations.forEach(config => {
      const columnInfo = dataset.columns.find(col => col.name === config.columnName);
      if (columnInfo) {
        // Determine if the column is quantitative or qualitative
        const columnType = 
          columnInfo.type === 'QUANTITATIVE' ? 'QUANTITATIVE' : 'QUALITATIVE';

        columns[config.columnName] = {
          type: columnType,
          step: config.method
        };
      }
    });
    
    return {
      technique: 'data_cleaning' as const,
      method: 'fix_inconsistencies' as Method,
      step: null,
      value: null,
      target: null,
      columns: columns as Record<string, ColumnConfig>
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