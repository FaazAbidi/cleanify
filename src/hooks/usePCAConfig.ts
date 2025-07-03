import { useState, useCallback, useMemo } from 'react';
import { DatasetType } from '@/types/dataset';

export interface PCAConfig {
  varianceThreshold: number;
  targetColumn: string | null; // null initially, but required for submission
}

interface UsePCAConfigProps {
  dataset: DatasetType | null;
}

export function usePCAConfig({ dataset }: UsePCAConfigProps) {
  const [pcaConfig, setPCAConfig] = useState<PCAConfig>({
    varianceThreshold: 0.95,
    targetColumn: null
  });

  // Update PCA configuration
  const updatePCAConfig = useCallback((updates: Partial<PCAConfig>) => {
    setPCAConfig(prev => ({ ...prev, ...updates }));
  }, []);

  // Get numeric columns (excluding target if selected)
  const availableNumericColumns = useMemo(() => {
    if (!dataset) return [];
    
    return dataset.columns
      .filter(column => column.type === 'QUANTITATIVE')
      .map(column => column.name);
  }, [dataset]);

  // Get columns that will be used for PCA (numeric columns excluding target)
  const pcaColumns = useMemo(() => {
    if (!availableNumericColumns.length) return [];
    
    return availableNumericColumns.filter(col => col !== pcaConfig.targetColumn);
  }, [availableNumericColumns, pcaConfig.targetColumn]);

  // Generate the final payload
  const generatePayload = useCallback(() => {
    if (!pcaConfig.targetColumn) {
      console.error('Target column is required for PCA');
      return null;
    }

    if (pcaColumns.length < 2) {
      console.error('At least 2 numeric columns (excluding target) are required for PCA');
      return null;
    }

    return {
      technique: 'data_reduction',
      method: 'perform_pca_reduction',
      step: null,
      value: pcaConfig.varianceThreshold,
      taskMethodId: '213', // This would typically come from props or context
      target: pcaConfig.targetColumn,
      columns: null // PCA uses all numeric columns automatically (excluding target)
    };
  }, [pcaConfig, pcaColumns]);

  return {
    pcaConfig,
    updatePCAConfig,
    availableNumericColumns,
    pcaColumns,
    generatePayload
  };
} 