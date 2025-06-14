import { useState, useEffect, useCallback } from 'react';
import { TaskVersion } from '@/types/version';
import { usePreprocessingPipeline } from '@/hooks/usePreprocessingPipeline';
import { toast } from '@/components/ui/sonner';

export function usePreprocessingStatus(
  selectedVersion: TaskVersion | null | undefined,
  refreshVersions?: () => void // Add refreshVersions callback
) {
  const { 
    startPolling, 
    stopPolling,
    currentVersionId, 
    currentStatus, 
    error: preprocessingError 
  } = usePreprocessingPipeline();

  const [isProcessing, setIsProcessing] = useState(false);
  const [processingVersion, setProcessingVersion] = useState<TaskVersion | null>(null);
  const [previousStatus, setPreviousStatus] = useState<string | null>(null);

  // Function to show appropriate toast based on status
  const showStatusToast = useCallback((status: string, versionName: string) => {
    if (status === 'PROCESSED' || status === 'RAW') {
      toast.success('Preprocessing complete', {
        description: `Successfully processed data for "${versionName}"`
      });
    } else if (status === 'FAILED') {
      toast.error('Preprocessing failed', {
        description: `Failed to process data for "${versionName}"`
      });
    } else if (status === 'RUNNING') {
      toast('Preprocessing in progress', {
        description: `Processing data for "${versionName}"...`,
        duration: 5000
      });
    }
  }, []);

  // Start polling when a version with RUNNING status is selected
  useEffect(() => {
    // First stop any existing polling
    stopPolling();
    setIsProcessing(false);
    setProcessingVersion(null);
    
    // Check if the selected version is in a running state
    if (selectedVersion && selectedVersion.status === 'RUNNING') {
      console.log('Selected version has RUNNING status, starting polling:', selectedVersion.id);
      
      // Set processing status
      setIsProcessing(true);
      setProcessingVersion(selectedVersion);
      setPreviousStatus(selectedVersion.status);
      
      // Start polling for status updates
      startPolling(selectedVersion.id);
      
      // Show running toast
      showStatusToast('RUNNING', selectedVersion.name);
    }
    
    return () => {
      stopPolling();
    };
  }, [selectedVersion, startPolling, stopPolling, showStatusToast]);

  // Handle status changes and show appropriate toasts
  useEffect(() => {
    if (processingVersion && currentStatus) {
      // Only process if status has actually changed
      if (currentStatus !== previousStatus) {
        console.log(`Status changed from ${previousStatus} to ${currentStatus}`);
        setPreviousStatus(currentStatus);
        
        // If status changed from RUNNING to something else, update our state
        if (currentStatus !== 'RUNNING') {
          setIsProcessing(false);
          
          // Refresh versions to get the latest data across the app
          if (refreshVersions) {
            console.log('Refreshing versions due to status change');
            refreshVersions();
          }
        }
        
        // Show status toast
        showStatusToast(currentStatus, processingVersion.name);
      }
    }
    
    // Handle errors
    if (preprocessingError) {
      toast.error('Error', {
        description: preprocessingError
      });
    }
  }, [currentStatus, processingVersion, preprocessingError, showStatusToast, previousStatus, refreshVersions]);

  return {
    isProcessing,
    processingVersion,
    currentStatus
  };
} 