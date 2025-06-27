import { useState, useCallback } from 'react';
import { DatasetType } from '@/types/dataset';

interface DropDuplicatesConfig {
  value: 'row' | 'column';
}

interface UseDropDuplicatesConfigProps {
  dataset: DatasetType | null;
}

interface UseDropDuplicatesConfigReturn {
  dropDuplicatesConfig: DropDuplicatesConfig;
  updateDropDuplicatesConfig: (updates: Partial<DropDuplicatesConfig>) => void;
  generatePayload: () => any | null;
}

export function useDropDuplicatesConfig({ dataset }: UseDropDuplicatesConfigProps): UseDropDuplicatesConfigReturn {
  const [dropDuplicatesConfig, setDropDuplicatesConfig] = useState<DropDuplicatesConfig>({
    value: 'row'
  });

  // Update drop duplicates configuration
  const updateDropDuplicatesConfig = useCallback((updates: Partial<DropDuplicatesConfig>) => {
    setDropDuplicatesConfig(prev => ({ ...prev, ...updates }));
  }, []);

  // Generate payload for API call
  const generatePayload = useCallback(() => {
    if (!dataset) {
      return null;
    }

    return {
      technique: "data_cleaning",
      method: "perform_drop_duplicates",
      step: null,
      value: dropDuplicatesConfig.value,
      target: null,
      columns: null
    };
  }, [dataset, dropDuplicatesConfig.value]);

  return {
    dropDuplicatesConfig,
    updateDropDuplicatesConfig,
    generatePayload
  };
} 