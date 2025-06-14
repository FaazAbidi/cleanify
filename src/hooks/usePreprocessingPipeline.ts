import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getErrorMessage } from '@/lib/utils';
import { Tables } from '@/integrations/supabase/types';
import { useAuth } from './useAuth';

// Status types for preprocessing - must match the database enum values
export type PreprocessingStatus = 'RUNNING' | 'RAW' | 'PROCESSED' | 'FAILED';

// For UI display, we also use these additional statuses
export type UIPreprocessingStatus = PreprocessingStatus | 'PENDING' | 'PROCESSING';

interface StartPreprocessingParams {
  versionId: number;
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
  const startPreprocessing = useCallback(async ({ versionId }: StartPreprocessingParams) => {
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


      console.log('Hitting preprocessing endpoint');
      // Make API call to trigger preprocessing
      const config = taskMethod.config as object;
      const body = {
        ...config,
        'userId': user?.id,
        'taskMethodId': taskMethod.id,
      }
      const response = await fetch(`${import.meta.env.VITE_BACKEND_API}/preprocess`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      console.log('Response:', response);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to start preprocessing');
      }

      console.log('Response:', response);
      
      console.log('Starting preprocessing for version:', versionId);

      await updateTaskMethod(versionId, 'RUNNING');
      
      console.log('Updated task method status to RUNNING');
      // Set status to RUNNING (which is a valid enum value in the database)
      setCurrentStatus('RUNNING');
      
      return { success: true, versionId };
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsStarting(false);
    }
  }, [checkVersionStatus, user]);

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