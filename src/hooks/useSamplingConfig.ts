import { useState, useEffect, useCallback } from 'react';
import { DatasetType } from '@/types/dataset';

interface SamplingConfig {
  value: number;
  unit: 'percentage' | 'count';
}

interface UseSamplingConfigProps {
  dataset: DatasetType | null;
}

interface UseSamplingConfigReturn {
  samplingConfig: SamplingConfig;
  updateSamplingConfig: (updates: Partial<SamplingConfig>) => void;
  generatePayload: () => any | null;
}

export function useSamplingConfig({ dataset }: UseSamplingConfigProps): UseSamplingConfigReturn {
  const [samplingConfig, setSamplingConfig] = useState<SamplingConfig>({
    value: 75,
    unit: 'percentage'
  });

  // Reset config when dataset changes
  useEffect(() => {
    if (dataset) {
      // Set default value based on dataset size
      const defaultValue = dataset.rows > 1000 ? 75 : 90;
      setSamplingConfig(prev => ({
        ...prev,
        value: defaultValue
      }));
    }
  }, [dataset?.rows]); // Only depend on rows count, not the entire dataset object

  // Update sampling configuration
  const updateSamplingConfig = useCallback((updates: Partial<SamplingConfig>) => {
    setSamplingConfig(prev => ({ ...prev, ...updates }));
  }, []);

  // Generate payload for API call
  const generatePayload = () => {
    if (!dataset) {
      return null;
    }

    // Calculate final sample size
    let sampleSize = samplingConfig.value;
    if (samplingConfig.unit === 'percentage') {
      sampleSize = Math.round((dataset.rows * samplingConfig.value) / 100);
    }

    return {
      technique: "data_reduction",
      method: "perform_sampling",
      step: null,
      value: sampleSize,
      target: null,
      columns: null
    };
  };

  return {
    samplingConfig,
    updateSamplingConfig,
    generatePayload
  };
} 