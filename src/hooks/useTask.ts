import { useState, useEffect } from 'react';
import { Tables } from '@/integrations/supabase/types';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export function useTask(taskId: string) {
  const [task, setTask] = useState<Tables<'Tasks'> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    const fetchTask = async () => {
      if (!taskId || !user) {
        setTask(null);
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        setError(null);
        
        const { data, error } = await supabase
          .from('Tasks')
          .select('*')
          .eq('id', parseInt(taskId))
          .single();
          
        if (error) throw error;
        
        setTask(data);
      } catch (err) {
        console.error('Error fetching task:', err);
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchTask();
  }, [taskId, user]);

  return { task, loading, error };
} 