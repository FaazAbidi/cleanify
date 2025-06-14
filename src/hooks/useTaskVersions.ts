import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { TaskVersion } from '@/types/version';

// Hook to fetch and manage task versions
export function useTaskVersions(taskId: string | number | undefined) {
  const [versions, setVersions] = useState<TaskVersion[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<TaskVersion | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const pendingVersionIdRef = useRef<number | null>(null);

  // Function to fetch versions - pulled out so it can be called multiple times
  const fetchVersions = useCallback(async () => {
    if (!taskId) {
      setVersions([]);
      setSelectedVersion(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Convert taskId to number if it's a string
      const taskIdNumber = typeof taskId === 'string' ? parseInt(taskId) : taskId;

      // Fetch all versions for this task from TaskMethods table, joining with Files
      const { data, error } = await supabase
        .from('TaskMethods')
        .select(`
          *,
          file:processed_file(*)
        `)
        .eq('task_id', taskIdNumber)
        .order('created_at', { ascending: true });

      if (error) throw `Error fetching task versions: ${error.message}`;

      console.log(`Fetched ${data?.length} versions for task ${taskIdNumber}`);

      if (data && data.length > 0) {
        setVersions(data);
        
        // Check if there's a pending version ID to select
        const pendingId = pendingVersionIdRef.current;
        
        setSelectedVersion(currentSelectedVersion => {
          if (pendingId) {
            // If there's a pending version ID, try to find and select it
            const pendingVersion = data.find(v => v.id === pendingId);
            if (pendingVersion) {
              // Clear the pending ID since we found and selected it
              pendingVersionIdRef.current = null;
              return pendingVersion;
            }
          }
          
          if (!currentSelectedVersion) {
            return data[0];
          } else {
            // If we already have a selected version, make sure it's updated with the latest data
            const updatedSelectedVersion = data.find(v => v.id === currentSelectedVersion.id);
            return updatedSelectedVersion || data[0];
          }
        });
      } else {
        setVersions([]);
        setSelectedVersion(null);
      }
    } catch (err) {
      console.error('Error fetching task versions:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  // Initial fetch of versions
  useEffect(() => {
    fetchVersions();
  }, [fetchVersions]);

  // Function to select a specific version
  const selectVersion = useCallback((versionId: number) => {
    setSelectedVersion(currentSelectedVersion => {
      const version = versions.find(v => v.id === versionId);
      return version || currentSelectedVersion;
    });
  }, [versions]);

  // Function to refresh versions with an option to select a specific version after refresh
  const refreshVersions = useCallback(async (targetVersionId?: number) => {
    if (targetVersionId) {
      // Store the target version ID to select after refresh
      pendingVersionIdRef.current = targetVersionId;
    }
    await fetchVersions();
  }, [fetchVersions]);

  return {
    versions,
    selectedVersion,
    selectVersion,
    loading,
    error,
    refreshVersions
  };
} 