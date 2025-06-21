import { useState, useCallback, useMemo } from 'react';
import { DatasetType } from '@/types/dataset';

export interface CombineFeaturesConfig {
  operation: string;
}

interface UseCombineFeaturesConfigProps {
  dataset: DatasetType | null;
}

export function useCombineFeaturesConfig({ dataset }: UseCombineFeaturesConfigProps) {
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [operation, setOperation] = useState<string>('+');

  // Update the operation
  const updateOperation = useCallback((newOperation: string) => {
    setOperation(newOperation);
  }, []);

  // Generate column configurations for payload
  const columnConfigurations = useMemo(() => {
    if (!dataset) return {};
    
    const configs: Record<string, any> = {};
    
    selectedColumns.forEach(columnName => {
      const column = dataset.columns.find(col => col.name === columnName);
      if (column) {
        configs[columnName] = {
          type: 'QUANTITATIVE',
          step: null,
          value: null
        };
      }
    });
    
    return configs;
  }, [selectedColumns, dataset]);

  // Generate the final payload
  const generatePayload = useCallback(() => {
    if (selectedColumns.length < 2) {
      console.error('At least 2 columns must be selected for combining features');
      return null;
    }

    return {
      technique: 'feature_engineering',
      method: 'perform_combine_features',
      step: operation,
      value: null,
      taskMethodId: '213', // This would typically come from props or context
      target: null,
      columns: columnConfigurations
    };
  }, [selectedColumns, operation, columnConfigurations]);

  return {
    selectedColumns,
    setSelectedColumns,
    operation,
    updateOperation,
    columnConfigurations,
    generatePayload
  };
} 