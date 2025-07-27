import { useState, useCallback, useRef, useEffect } from 'react';
import { PreAnalysisConfig, PreAnalysisResult } from '@/types/methods';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/sonner';
import { formatColumnNameWithId } from '@/lib/data-utils';
import { DatasetType } from '@/types/dataset';

interface UsePreAnalysisPipelineReturn {
  isSubmitting: boolean;
  isPolling: boolean;
  submitPreAnalysis: (config: PreAnalysisConfig, versionId: number, dataset?: DatasetType | null) => Promise<{ success: boolean; taskMethodId?: number; error?: string }>;
  pollPreAnalysisResult: (taskMethodId: number) => Promise<PreAnalysisResult | null>;
  startPolling: (taskMethodId: number, onResult: (result: PreAnalysisResult) => void) => void;
  stopPolling: () => void;
  getOrCreatePreAnalysisTaskMethod: (versionId: number) => Promise<{ taskMethodId: number | null; result: PreAnalysisResult | null }>;
}

const BACKEND_BASE_URL = import.meta.env.VITE_BACKEND_API;
const POLLING_INTERVAL = 3000; // 3 seconds

export function usePreAnalysisPipeline(): UsePreAnalysisPipelineReturn {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const getOrCreatePreAnalysisTaskMethod = useCallback(async (versionId: number): Promise<{ taskMethodId: number | null; result: PreAnalysisResult | null }> => {
    try {
      // First, check if a pre-analysis TaskMethod already exists for this version
      const { data: existingTaskMethod, error: fetchError } = await supabase
        .from('TaskMethods')
        .select('id, pre_analysis, task_id')
        .eq('id', versionId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Error fetching existing TaskMethod:', fetchError);
        return { taskMethodId: null, result: null };
      }

      if (existingTaskMethod) {
        return {
          taskMethodId: existingTaskMethod.id,
          result: existingTaskMethod.pre_analysis ? existingTaskMethod.pre_analysis as unknown as PreAnalysisResult : null
        };
      }

      return { taskMethodId: null, result: null };
    } catch (error) {
      console.error('Error getting or creating pre-analysis TaskMethod:', error);
      return { taskMethodId: null, result: null };
    }
  }, []);

  const submitPreAnalysis = useCallback(async (
    config: PreAnalysisConfig, 
    versionId: number,
    dataset?: DatasetType | null
  ): Promise<{ success: boolean; taskMethodId?: number; error?: string }> => {
    setIsSubmitting(true);
    
    try {
      // Transform column names in config to include IDs if dataset is provided
      const transformedConfig = dataset 
        ? transformPreAnalysisConfig(config, dataset) 
        : config;
      
      const response = await fetch(`${BACKEND_BASE_URL}/pre-analysis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(transformedConfig),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('Pre-analysis submitted successfully:', result);
      
      toast.success('Pre-analysis started successfully', {
        description: 'We will notify you when the analysis is complete.',
      });

      return { success: true, taskMethodId: versionId };
    } catch (error) {
      console.error('Error submitting pre-analysis:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      toast.error('Failed to start pre-analysis', {
        description: errorMessage,
      });

      return { success: false, error: errorMessage };
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  // Function to transform column names in pre-analysis config
  const transformPreAnalysisConfig = (config: PreAnalysisConfig, dataset: DatasetType): PreAnalysisConfig => {
    if (!dataset) return config;
    
    const transformedConfig = { ...config };
    
    console.log('Original pre-analysis config:', { 
      target: config.target || config.target_variable,
      selectedColumns: config.selected_columns ? config.selected_columns.length : 0
    });
    
    // Transform target variable if present
    if (transformedConfig.target_variable) {
      const originalTarget = transformedConfig.target_variable;
      transformedConfig.target_variable = formatColumnNameWithId(transformedConfig.target_variable, dataset);
      console.log(`Target variable transformed: "${originalTarget}" => "${transformedConfig.target_variable}"`);
    }

    // Also transform target if present (different field name used in some cases)
    if (transformedConfig.target) {
      const originalTarget = transformedConfig.target;
      transformedConfig.target = formatColumnNameWithId(transformedConfig.target, dataset);
      console.log(`Target transformed: "${originalTarget}" => "${transformedConfig.target}"`);
    }
    
    // Transform selected columns if present
    if (Array.isArray(transformedConfig.selected_columns)) {
      transformedConfig.selected_columns = transformedConfig.selected_columns.map(
        (col: string) => {
          const transformedCol = formatColumnNameWithId(col, dataset);
          console.log(`Selected column transformed: "${col}" => "${transformedCol}"`);
          return transformedCol;
        }
      );
      console.log(`Transformed ${transformedConfig.selected_columns.length} selected columns`);
    }
    
    return transformedConfig;
  };

  const pollPreAnalysisResult = useCallback(async (taskMethodId: number): Promise<PreAnalysisResult | null> => {
    try {
      const { data, error } = await supabase
        .from('TaskMethods')
        .select('pre_analysis')
        .eq('id', taskMethodId)
        .single();

      if (error) {
        console.error('Error polling pre-analysis result:', error);
        return null;
      }

      if (data?.pre_analysis) {
        console.log('Pre-analysis result found:', data.pre_analysis);
        return data.pre_analysis as unknown as PreAnalysisResult;
      }

      return null;
    } catch (error) {
      console.error('Error polling pre-analysis result:', error);
      return null;
    }
  }, []);

  const startPolling = useCallback((taskMethodId: number, onResult: (result: PreAnalysisResult) => void) => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    setIsPolling(true);
    
    pollingIntervalRef.current = setInterval(async () => {
      const result = await pollPreAnalysisResult(taskMethodId);
      
      if (result) {
        setIsPolling(false);
        clearInterval(pollingIntervalRef.current!);
        pollingIntervalRef.current = null;
        
        toast.success('Pre-analysis completed!', {
          description: 'The analysis results are now available.',
        });
        
        onResult(result);
      }
    }, POLLING_INTERVAL);
  }, [pollPreAnalysisResult]);

  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    setIsPolling(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  return {
    isSubmitting,
    isPolling,
    submitPreAnalysis,
    pollPreAnalysisResult,
    startPolling,
    stopPolling,
    getOrCreatePreAnalysisTaskMethod,
  };
} 