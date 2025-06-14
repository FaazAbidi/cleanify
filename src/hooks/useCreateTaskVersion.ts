import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';

// Input type for creating a new task version
interface CreateTaskVersionInput {
  taskId: number;
  methodId: number;
  name: string;
  parentVersionId: number | null;
  config?: any;
}

// Hook to create a new task version (TaskMethods entry)
export function useCreateTaskVersion() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createTaskVersion = async (input: CreateTaskVersionInput) => {
    try {
      setLoading(true);
      setError(null);

      const { taskId, methodId, name, parentVersionId, config } = input;

      // Create a new entry in the TaskMethods table
      const { data, error } = await supabase
        .from('TaskMethods')
        .insert({
          task_id: taskId,
          method_id: methodId,
          name,
          prev_version: parentVersionId,
          status: 'RAW',
          config: config
        })
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (err) {
      console.error('Error creating task version:', err);
      setError(err as Error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    createTaskVersion,
    loading,
    error,
  };
} 