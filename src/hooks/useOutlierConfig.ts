import { useState, useEffect } from 'react';
import { DatasetType, ColumnInfo } from '@/types/dataset';
import { OutlierMethod, Method, MethodConfig } from '@/types/methods';
import { getOutlierIndices } from '@/lib/data-utils';

export interface ColumnOutlierConfig {
  columnName: string;
  method: OutlierMethod;
}

interface UseOutlierConfigProps {
  dataset: DatasetType | null;
}

interface UseOutlierConfigReturn {
  selectedColumns: string[];
  setSelectedColumns: (columns: string[]) => void;
  columnConfigurations: ColumnOutlierConfig[];
  updateColumnConfiguration: (configurations: ColumnOutlierConfig[]) => void;
  getDefaultMethodForColumn: (columnInfo: ColumnInfo) => OutlierMethod;
  generatePayload: () => MethodConfig | null;
  getOutlierIndicesForColumn: (columnName: string) => boolean[] | null;
}

export function useOutlierConfig({ dataset }: UseOutlierConfigProps): UseOutlierConfigReturn {
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [columnConfigurations, setColumnConfigurations] = useState<ColumnOutlierConfig[]>([]);
  const [outlierIndicesCache, setOutlierIndicesCache] = useState<Record<string, boolean[]>>({});

  // Determine default outlier handling method based on column type
  const getDefaultMethodForColumn = (columnInfo: ColumnInfo): OutlierMethod => {
    if (columnInfo.type === 'numeric') {
      return 'impute_median';
    } else {
      // Outliers typically only apply to numeric columns
      return 'remove';
    }
  };

  // Update configurations when selected columns change
  useEffect(() => {
    if (!dataset) return;

    // Create default configurations for newly selected columns
    const newConfigs: ColumnOutlierConfig[] = [];
    
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

  // Pre-compute outlier indices for selected columns
  useEffect(() => {
    if (!dataset) return;
    
    const newCache: Record<string, boolean[]> = { ...outlierIndicesCache };
    let cacheUpdated = false;
    
    selectedColumns.forEach(columnName => {
      // Skip if already in cache
      if (newCache[columnName]) return;
      
      const columnIndex = dataset.columnNames.indexOf(columnName);
      if (columnIndex === -1) return;
      
      // Extract column data
      const columnData = dataset.rawData.map(row => row[columnIndex]);
      
      // Calculate outlier indices
      newCache[columnName] = getOutlierIndices(columnData);
      cacheUpdated = true;
    });
    
    if (cacheUpdated) {
      setOutlierIndicesCache(newCache);
    }
  }, [selectedColumns, dataset]);

  // Get outlier indices for a specific column
  const getOutlierIndicesForColumn = (columnName: string): boolean[] | null => {
    if (!dataset || !outlierIndicesCache[columnName]) return null;
    return outlierIndicesCache[columnName];
  };

  // Update column configurations
  const updateColumnConfiguration = (configurations: ColumnOutlierConfig[]) => {
    setColumnConfigurations(configurations);
  };

  // Generate payload for API
  const generatePayload = (): MethodConfig | null => {
    if (!selectedColumns.length || !columnConfigurations.length || !dataset) {
      return null;
    }

    const columns: Record<string, {
      type: 'QUANTITATIVE' | 'QUALITATIVE';
      step: OutlierMethod;
      value: string | null;
    }> = {};
    
    columnConfigurations.forEach(config => {
      const columnInfo = dataset.columns.find(col => col.name === config.columnName);
      if (columnInfo) {
        // Outliers are only relevant for quantitative columns
        const columnType = 'QUANTITATIVE';

        columns[config.columnName] = {
          type: columnType,
          step: config.method,
          value: null
        };
      }
    });
    
    return {
      technique: 'data_cleaning' as const,
      method: 'fix_outliers' as Method,
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
    generatePayload,
    getOutlierIndicesForColumn
  };
} 