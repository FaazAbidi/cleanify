import { useState, useCallback, useMemo } from 'react';
import { DatasetType } from '@/types/dataset';
import { formatColumnNameWithId } from '@/lib/data-utils';

export interface BinningColumnConfig {
  columnName: string;
  strategy: 'equal_width' | 'equal_depth';
  binCount: number;
}

interface UseBinningConfigProps {
  dataset: DatasetType | null;
}

export function useBinningConfig({ dataset }: UseBinningConfigProps) {
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [columnConfigurations, setColumnConfigurations] = useState<BinningColumnConfig[]>([]);

  // Update column configuration
  const updateColumnConfiguration = useCallback((columnName: string, strategy: 'equal_width' | 'equal_depth', binCount: number) => {
    setColumnConfigurations(prev => {
      const existing = prev.find(config => config.columnName === columnName);
      if (existing) {
        return prev.map(config => 
          config.columnName === columnName 
            ? { ...config, strategy, binCount }
            : config
        );
      } else {
        return [...prev, { columnName, strategy, binCount }];
      }
    });
  }, []);

  // Initialize configurations when columns are selected
  const initializeConfigurations = useCallback((columns: string[]) => {
    const newConfigs: BinningColumnConfig[] = columns.map(columnName => {
      const existing = columnConfigurations.find(config => config.columnName === columnName);
      return existing || {
        columnName,
        strategy: 'equal_width' as const,
        binCount: 3
      };
    });
    setColumnConfigurations(newConfigs);
  }, [columnConfigurations]);

  // Update selected columns and initialize configurations
  const updateSelectedColumns = useCallback((columns: string[]) => {
    setSelectedColumns(columns);
    initializeConfigurations(columns);
  }, [initializeConfigurations]);

  // Generate column configurations for payload
  const generateColumnConfigurations = useMemo(() => {
    if (!dataset) return {};
    
    const configs: Record<string, any> = {};
    
    columnConfigurations.forEach(config => {
      if (selectedColumns.includes(config.columnName)) {
        // Format the column key properly
        const formattedKey = formatColumnNameWithId(config.columnName, dataset);
        configs[formattedKey] = {
          type: 'QUANTITATIVE',
          step: config.strategy,
          value: config.binCount
        };
      }
    });
    
    return configs;
  }, [selectedColumns, columnConfigurations, dataset]);

  // Generate the final payload
  const generatePayload = useCallback(() => {
    if (!dataset || selectedColumns.length === 0) {
      console.error('At least 1 column must be selected for binning');
      return null;
    }

    const configuredColumns = {};
    columnConfigurations.forEach(config => {
      if (selectedColumns.includes(config.columnName)) {
        const formattedKey = formatColumnNameWithId(config.columnName, dataset);
        configuredColumns[formattedKey] = {
          type: 'QUANTITATIVE',
          step: config.strategy,
          value: config.binCount
        };
      }
    });

    return {
      technique: 'feature_engineering',
      method: 'perform_binning',
      step: null,
      value: null,
      target: null,
      columns: configuredColumns
    };
  }, [selectedColumns, columnConfigurations, dataset]);

  return {
    selectedColumns,
    setSelectedColumns: updateSelectedColumns,
    columnConfigurations,
    updateColumnConfiguration,
    generatePayload
  };
} 