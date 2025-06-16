import { useState, useEffect } from 'react';
import { DatasetType } from '@/types/dataset';

type ColumnConfig = {
  columnName: string;
};

type UseStandardizationConfigProps = {
  dataset: DatasetType | null;
};

type UseStandardizationConfigReturn = {
  selectedColumns: string[];
  setSelectedColumns: (columns: string[]) => void;
  columnConfigurations: ColumnConfig[];
  generatePayload: () => any;
};

export function useStandardizationConfig({ dataset }: UseStandardizationConfigProps): UseStandardizationConfigReturn {
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
  const generatePayload = () => {
    if (!dataset || !selectedColumns.length || !columnConfigurations.length) {
      return null;
    }
    
    const columns: Record<string, any> = {};
    
    columnConfigurations.forEach(config => {
      columns[config.columnName] = {
        type: "QUANTITATIVE",
        step: null,
        value: null
      };
    });
    
    return {
      technique: "data_transformation",
      method: "perform_standarization",
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
    generatePayload
  };
} 