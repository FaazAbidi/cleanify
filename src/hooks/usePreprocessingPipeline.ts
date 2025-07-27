import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getErrorMessage } from '@/lib/utils';
import { formatColumnNameWithId } from '@/lib/data-utils';
import { Tables } from '@/integrations/supabase/types';
import { useAuth } from './useAuth';
import { MethodConfig, MethodConfigWithTaskMethodId } from '@/types/methods';
import { DatasetType } from '@/types/dataset';

// Status types for preprocessing - must match the database enum values
export type PreprocessingStatus = 'RUNNING' | 'RAW' | 'PROCESSED' | 'FAILED';

// For UI display, we also use these additional statuses
export type UIPreprocessingStatus = PreprocessingStatus | 'PENDING' | 'PROCESSING';

interface StartPreprocessingParams {
  versionId: number;
  dataset?: DatasetType | null;
}

export function usePreprocessingPipeline() {
  const [isStarting, setIsStarting] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [currentVersionId, setCurrentVersionId] = useState<number | null>(null);
  const [currentStatus, setCurrentStatus] = useState<PreprocessingStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchTaskMethod = useCallback(async (versionId: number) => {
    const { data, error } = await supabase
      .from('TaskMethods')
      .select('*')
      .eq('id', versionId)
      .single();

    if (error) throw error;

    return data;
  }, []);

  const updateTaskMethod = useCallback(async (versionId: number, status: PreprocessingStatus) => {
    const { data, error } = await supabase
      .from('TaskMethods')
      .update({ status })
      .eq('id', versionId)
      .single();
  }, []);

  // Check status of a version
  const checkVersionStatus = useCallback(async (versionId: number): Promise<PreprocessingStatus | null> => {
    console.log('Checking version status for:', versionId);
    try {
      const data = await fetchTaskMethod(versionId);
      return data?.status as PreprocessingStatus || null;
    } catch (err) {
      console.error('Error checking version status:', err);
      return null;
    }
  }, []);

  // Start preprocessing via API call
  const startPreprocessing = useCallback(async ({ versionId, dataset }: StartPreprocessingParams) => {
    setIsStarting(true);
    setError(null);
    setCurrentVersionId(versionId);

    const taskMethod = await fetchTaskMethod(versionId);

    try {
      if (!taskMethod) {
        setError('Task method not found');
        return { success: false, error: 'Task method not found' };
      }

      if (!user) {
        setError('User not found. Please sign in to continue.');
        return { success: false, error: 'User not found. Please sign in to continue.' };
      }

      // Make API call to trigger preprocessing
      const config = taskMethod.config as object;
      
      // Transform column names in config to include IDs if dataset is provided
      const transformedConfig = dataset 
        ? transformColumnNames(config, dataset) 
        : config;

      const body = {
        ...transformedConfig,
        'userId': user?.id,
        'taskMethodId': taskMethod.id,
      }

      console.log('Hitting preprocessing endpoint with body:', body);
      
      const response = await fetch(`${import.meta.env.VITE_BACKEND_API}/preprocess`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to start preprocessing');
      }
      
      // Update the database status to RUNNING
      await updateTaskMethod(versionId, 'RUNNING');
      console.log('Updated task method status to RUNNING in database');
      
      // Set local state to RUNNING
      setCurrentStatus('RUNNING');
      
      return { success: true, versionId };
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsStarting(false);
    }
  }, [fetchTaskMethod, user, updateTaskMethod]);

  // Function to transform column names to include their IDs
  const transformColumnNames = (config: any, dataset: DatasetType) => {
    if (!config || !dataset) return config;

    const transformedConfig = { ...config };
    
    console.log('Original config columns:', config.columns ? Object.keys(config.columns) : 'No columns');
    
    // Handle columns object if it exists
    if (transformedConfig.columns && typeof transformedConfig.columns === 'object') {
      const newColumns: Record<string, any> = {};
      
      // Transform each column key
      Object.entries(transformedConfig.columns).forEach(([columnName, columnConfig]) => {
        const newColumnName = formatColumnNameWithId(columnName, dataset);
        console.log(`Column transformed: "${columnName}" => "${newColumnName}"`);
        newColumns[newColumnName] = columnConfig;
      });
      
      transformedConfig.columns = newColumns;
      console.log('Transformed config columns:', Object.keys(transformedConfig.columns));
    }
    
    // Handle target column if it exists
    if (transformedConfig.target && typeof transformedConfig.target === 'string') {
      const originalTarget = transformedConfig.target;
      transformedConfig.target = formatColumnNameWithId(transformedConfig.target, dataset);
      console.log(`Target transformed: "${originalTarget}" => "${transformedConfig.target}"`);
    }
    
    // Handle selectedColumns array if it exists
    if (Array.isArray(transformedConfig.selectedColumns)) {
      transformedConfig.selectedColumns = transformedConfig.selectedColumns.map(
        (col: string) => {
          const transformedCol = formatColumnNameWithId(col, dataset);
          console.log(`Selected column transformed: "${col}" => "${transformedCol}"`);
          return transformedCol;
        }
      );
    }
    
    return transformedConfig;
  };

  // Poll for status changes
  const startPolling = useCallback((versionId: number) => {
    console.log('Starting polling for version:', versionId);
    setIsPolling(true);
    setCurrentVersionId(versionId);
    setError(null);
  }, []);

  // Stop polling
  const stopPolling = useCallback(() => {
    console.log('Stopping polling');
    setIsPolling(false);
    setCurrentVersionId(null);
    setCurrentStatus(null);
  }, []);

  // Polling effect
  useEffect(() => {
    if (!isPolling || !currentVersionId) {
      console.log('Polling conditions not met:', { isPolling, currentVersionId });
      return;
    }
    
    console.log('Setting up polling for version:', currentVersionId);
    const pollInterval = 5000; // Poll every 5 seconds
    let timeoutId: NodeJS.Timeout;
    
    const checkStatus = async () => {
      if (!currentVersionId) return;
      
      console.log('Checking status in polling loop');
      try {
        const status = await checkVersionStatus(currentVersionId);
        console.log('Polling received status:', status);
        
        if (status) {
          setCurrentStatus(status);
          console.log('Updated current status to:', status);
          
          // Stop polling if we reached a terminal status
          if (status === 'PROCESSED' || status === 'FAILED') {
            console.log('Reached terminal status, stopping polling');
            setIsPolling(false);
          }
        }
      } catch (err) {
        const errorMsg = getErrorMessage(err);
        console.error('Error in polling:', errorMsg);
        setError(errorMsg);
        setIsPolling(false);
      }
      
      // Continue polling if still needed
      if (isPolling && currentVersionId) {
        console.log('Scheduling next poll in', pollInterval, 'ms');
        timeoutId = setTimeout(checkStatus, pollInterval);
      }
    };
    
    // Start the first check immediately
    console.log('Starting first status check');
    checkStatus();
    
    // Cleanup
    return () => {
      console.log('Cleaning up polling effect');
      if (timeoutId) {
        console.log('Clearing timeout');
        clearTimeout(timeoutId);
      }
    };
  }, [isPolling, currentVersionId, checkVersionStatus]);

  return {
    startPreprocessing,
    startPolling,
    stopPolling,
    isStarting,
    isPolling,
    currentVersionId,
    currentStatus,
    error
  };
} 