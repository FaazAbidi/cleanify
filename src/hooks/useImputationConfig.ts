import { useState, useEffect } from 'react';
import { DatasetType, ColumnInfo } from '@/types/dataset';
import { ImputationMethod, ColumnImputationConfig } from '@/components/preprocessing/ImputationMethodSelector';

interface UseImputationConfigProps {
  dataset: DatasetType | null;
}

interface UseImputationConfigReturn {
  selectedColumns: string[];
  setSelectedColumns: (columns: string[]) => void;
  columnConfigurations: ColumnImputationConfig[];
  updateColumnConfiguration: (configurations: ColumnImputationConfig[]) => void;
  getDefaultMethodForColumn: (columnInfo: ColumnInfo) => ImputationMethod;
  generatePayload: () => ImputationPayload | null;
}

export interface ImputationPayload {
  method: string; // 'fix_missing'
  columns: Record<string, {
    type: 'QUANTITATIVE' | 'QUALITATIVE';
    step: ImputationMethod;
  }>;
}

export function useImputationConfig({ dataset }: UseImputationConfigProps): UseImputationConfigReturn {
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [columnConfigurations, setColumnConfigurations] = useState<ColumnImputationConfig[]>([]);

  // Determine default imputation method based on column type
  const getDefaultMethodForColumn = (columnInfo: ColumnInfo): ImputationMethod => {
    if (columnInfo.type === 'numeric') {
      return 'impute_mean';
    } else if (columnInfo.type === 'categorical' || columnInfo.type === 'text' || columnInfo.type === 'boolean') {
      return 'impute_mode';
    } else if (columnInfo.type === 'datetime') {
      return 'impute_random';
    } else {
      return 'remove';
    }
  };

  // Update configurations when selected columns change
  useEffect(() => {
    if (!dataset) return;

    // Create default configurations for newly selected columns
    const newConfigs: ColumnImputationConfig[] = [];
    
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
  const updateColumnConfiguration = (configurations: ColumnImputationConfig[]) => {
    setColumnConfigurations(configurations);
  };

  // Generate payload for API
  const generatePayload = (): ImputationPayload | null => {
    if (!selectedColumns.length || !columnConfigurations.length || !dataset) {
      return null;
    }

    const columns: Record<string, {
      type: 'QUANTITATIVE' | 'QUALITATIVE';
      step: ImputationMethod;
    }> = {};
    
    columnConfigurations.forEach(config => {
      const columnInfo = dataset.columns.find(col => col.name === config.columnName);
      if (columnInfo) {
        // Determine if the column is quantitative or qualitative
        const columnType = 
          columnInfo.type === 'numeric' ? 'QUANTITATIVE' : 'QUALITATIVE';

        columns[config.columnName] = {
          type: columnType,
          step: config.method
        };
      }
    });
    
    return {
      method: 'fix_missing',
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