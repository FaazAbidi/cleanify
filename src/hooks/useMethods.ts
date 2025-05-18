import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';

// Type for a method from the Methods table
export interface Method extends Tables<'Methods'> {}

// Hook to fetch methods from the Methods table
export function useMethods() {
  const [methods, setMethods] = useState<Method[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchMethods = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data, error } = await supabase
          .from('Methods')
          .select('*')
          .order('label', { ascending: true });

        if (error) throw error;

        if (data) {
          setMethods(data);
        } else {
          setMethods([]);
        }
      } catch (err) {
        console.error('Error fetching methods:', err);
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchMethods();
  }, []);

  return {
    methods,
    loading,
    error
  };
} 