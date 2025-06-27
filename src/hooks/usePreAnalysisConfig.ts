import { useState, useCallback } from 'react';
import { PreAnalysisModel, PreAnalysisConfig, PreAnalysisColumnConfig } from '@/types/methods';
import { DatasetType } from '@/types/dataset';

interface UsePreAnalysisConfigReturn {
  config: Partial<PreAnalysisConfig>;
  setModel: (model: PreAnalysisModel) => void;
  setTarget: (target: string | null) => void;
  setThresholds: (thresholds: Partial<Pick<PreAnalysisConfig, 
    'threshold_check_categorical' | 'threshold_check_skewness' | 'threshold_sampling' | 
    'threshold_check_dimensionality' | 'threshold_check_multicollinearity'>>) => void;
  setColumns: (columns: Record<string, PreAnalysisColumnConfig> | null) => void;
  getFullConfig: (taskMethodId: string) => PreAnalysisConfig;
  resetConfig: () => void;
  isConfigValid: boolean;
}

const defaultThresholds = {
  threshold_check_categorical: 0.3,
  threshold_check_skewness: 1,
  threshold_sampling: 100,
  threshold_check_dimensionality: 0.5,
  threshold_check_multicollinearity: 0.8,
};

export function usePreAnalysisConfig(dataset?: DatasetType | null): UsePreAnalysisConfigReturn {
  const [config, setConfig] = useState<Partial<PreAnalysisConfig>>({
    method: 'pre_analysis',
    model: 'Logistic Regression',
    target: null,
    columns: null,
    ...defaultThresholds,
  });

  const setModel = useCallback((model: PreAnalysisModel) => {
    setConfig(prev => ({ ...prev, model }));
  }, []);

  const setTarget = useCallback((target: string | null) => {
    setConfig(prev => ({ ...prev, target }));
  }, []);

  const setThresholds = useCallback((thresholds: Partial<Pick<PreAnalysisConfig, 
    'threshold_check_categorical' | 'threshold_check_skewness' | 'threshold_sampling' | 
    'threshold_check_dimensionality' | 'threshold_check_multicollinearity'>>) => {
    setConfig(prev => ({ ...prev, ...thresholds }));
  }, []);

  const setColumns = useCallback((columns: Record<string, PreAnalysisColumnConfig> | null) => {
    setConfig(prev => ({ ...prev, columns }));
  }, []);

  const getFullConfig = useCallback((taskMethodId: string): PreAnalysisConfig => {
    return {
      task_id: taskMethodId,
      method: 'pre_analysis',
      model: config.model || 'Logistic Regression',
      target: config.target || null,
      threshold_check_categorical: config.threshold_check_categorical || defaultThresholds.threshold_check_categorical,
      threshold_check_skewness: config.threshold_check_skewness || defaultThresholds.threshold_check_skewness,
      threshold_sampling: config.threshold_sampling || defaultThresholds.threshold_sampling,
      threshold_check_dimensionality: config.threshold_check_dimensionality || defaultThresholds.threshold_check_dimensionality,
      threshold_check_multicollinearity: config.threshold_check_multicollinearity || defaultThresholds.threshold_check_multicollinearity,
      columns: config.columns || null,
    };
  }, [config]);

  const resetConfig = useCallback(() => {
    setConfig({
      method: 'pre_analysis',
      model: 'Logistic Regression',
      target: null,
      columns: null,
      ...defaultThresholds,
    });
  }, []);

  const isConfigValid = Boolean(config.model);

  return {
    config,
    setModel,
    setTarget,
    setThresholds,
    setColumns,
    getFullConfig,
    resetConfig,
    isConfigValid,
  };
} 