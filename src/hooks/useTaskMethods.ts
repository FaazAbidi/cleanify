import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';

export interface TaskMethodStats {
  totalVersions: number;
  averageVersionsPerTask: number;
  versionsByStatus: {
    PROCESSED: number;
    RUNNING: number;
    FAILED: number;
    RAW: number;
  };
  methodUsage: Array<{
    method_id: number;
    method_name: string;
    usage_count: number;
    success_rate: number;
    last_used: string;
  }>;
  recentVersions: Array<{
    id: number;
    name: string;
    status: string;
    created_at: string;
    task_name: string;
    method_name?: string;
  }>;
  dailyActivity: Array<{
    date: string;
    versions: number;
    methods: number;
  }>;
}

export function useTaskMethods(userId?: string) {
  const [stats, setStats] = useState<TaskMethodStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchTaskMethods = useCallback(async () => {
    if (!userId) {
      setStats(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch all TaskMethods with related data for the user
      const { data: taskMethods, error: methodsError } = await supabase
        .from('TaskMethods')
        .select(`
          *,
          task:Tasks!inner(
            id,
            name,
            user_id,
            status,
            created_at
          ),
          method:Methods(
            id,
            label,
            description
          )
        `)
        .eq('task.user_id', userId)
        .order('created_at', { ascending: false });

      if (methodsError) throw new Error(`Error fetching task methods: ${methodsError.message}`);

      if (!taskMethods) {
        setStats({
          totalVersions: 0,
          averageVersionsPerTask: 0,
          versionsByStatus: { PROCESSED: 0, RUNNING: 0, FAILED: 0, RAW: 0 },
          methodUsage: [],
          recentVersions: [],
          dailyActivity: []
        });
        return;
      }

      // Calculate statistics
      const totalVersions = taskMethods.length;
      const uniqueTaskIds = new Set(taskMethods.map(tm => tm.task_id));
      const averageVersionsPerTask = uniqueTaskIds.size > 0 ? totalVersions / uniqueTaskIds.size : 0;

      // Group by status
      const versionsByStatus = taskMethods.reduce((acc, tm) => {
        acc[tm.status as keyof typeof acc]++;
        return acc;
      }, { PROCESSED: 0, RUNNING: 0, FAILED: 0, RAW: 0 });

      // Calculate method usage statistics
      const methodUsageMap = new Map<number, {
        method_id: number;
        method_name: string;
        usage_count: number;
        success_count: number;
        last_used: string;
      }>();

      taskMethods.forEach(tm => {
        if (tm.method_id && tm.method) {
          const existing = methodUsageMap.get(tm.method_id) || {
            method_id: tm.method_id,
            method_name: tm.method.label,
            usage_count: 0,
            success_count: 0,
            last_used: tm.created_at
          };

          existing.usage_count++;
          if (tm.status === 'PROCESSED') {
            existing.success_count++;
          }
          if (new Date(tm.created_at) > new Date(existing.last_used)) {
            existing.last_used = tm.created_at;
          }

          methodUsageMap.set(tm.method_id, existing);
        }
      });

      const methodUsage = Array.from(methodUsageMap.values())
        .map(m => ({
          method_id: m.method_id,
          method_name: m.method_name,
          usage_count: m.usage_count,
          success_rate: m.usage_count > 0 ? (m.success_count / m.usage_count) * 100 : 0,
          last_used: m.last_used
        }))
        .sort((a, b) => b.usage_count - a.usage_count);

      // Get recent versions
      const recentVersions = taskMethods.slice(0, 10).map(tm => ({
        id: tm.id,
        name: tm.name,
        status: tm.status,
        created_at: tm.created_at,
        task_name: tm.task?.name || 'Unknown Task',
        method_name: tm.method?.label
      }));

      // Calculate daily activity for last 14 days
      const now = new Date();
      const dailyActivity = Array.from({ length: 14 }, (_, i) => {
        const date = new Date(now);
        date.setDate(date.getDate() - (13 - i));
        const dateStr = date.toISOString().split('T')[0];
        
        const dayVersions = taskMethods.filter(tm => 
          tm.created_at.startsWith(dateStr)
        );
        
        const uniqueMethods = new Set(
          dayVersions.filter(tm => tm.method_id).map(tm => tm.method_id)
        );

        return {
          date: dateStr,
          versions: dayVersions.length,
          methods: uniqueMethods.size
        };
      });

      setStats({
        totalVersions,
        averageVersionsPerTask,
        versionsByStatus,
        methodUsage,
        recentVersions,
        dailyActivity
      });

    } catch (err) {
      console.error('Error fetching task methods:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchTaskMethods();
  }, [fetchTaskMethods]);

  return {
    stats,
    loading,
    error,
    refetch: fetchTaskMethods
  };
} 