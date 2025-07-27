import { useState, useEffect, useCallback } from 'react';
import { DatasetType } from '@/types/dataset';
import { formatColumnNameWithId } from '@/lib/data-utils';

interface ColumnConfig {
  columnName: string;
}

interface UseDropColumnsConfigProps {
  dataset: DatasetType | null;
}

interface UseDropColumnsConfigReturn {
  selectedColumns: string[];
  setSelectedColumns: (columns: string[]) => void;
  columnConfigurations: ColumnConfig[];
  generatePayload: () => any | null;
}

export function useDropColumnsConfig({ dataset }: UseDropColumnsConfigProps): UseDropColumnsConfigReturn {
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

      return {
        columnName
      };
    });

    setColumnConfigurations(initialConfigs);
  }, [selectedColumns, dataset]);

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
        type: "QUALITATIVE",
        step: null,
        value: null
      };
    });

    return {
      technique: "data_reduction",
      method: "perform_drop_columns",
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
    generatePayload
  };
} 