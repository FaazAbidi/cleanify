import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Progress } from "@/components/ui/progress";
import { Tables } from "@/integrations/supabase/types";
import { TaskMethodStats } from "@/hooks/useTaskMethods";
import { GitBranch, Clock, CheckCircle, XCircle, TrendingUp, Activity } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useMemo } from "react";

interface VersionActivityProps {
  tasks: Tables<'Tasks'>[];
  taskMethodStats: TaskMethodStats | null;
}

export const VersionActivity = ({ tasks, taskMethodStats }: VersionActivityProps) => {
  // Use real version data from TaskMethods
  const versionStats = useMemo(() => {
    if (!taskMethodStats) {
      return {
        totalVersions: 0,
        activeVersions: 0,
        averageVersionsPerTask: '0',
        versionSuccessRate: 0,
      };
    }

    const totalVersionsByStatus = taskMethodStats.versionsByStatus;
    const totalVersions = taskMethodStats.totalVersions;
    const activeVersions = totalVersionsByStatus.RUNNING;
    const averageVersionsPerTask = taskMethodStats.averageVersionsPerTask.toFixed(1);
    
    // Calculate success rate from real data
    const successfulVersions = totalVersionsByStatus.PROCESSED;
    const versionSuccessRate = totalVersions > 0 ? Math.round((successfulVersions / totalVersions) * 100) : 0;
    
    return {
      totalVersions,
      activeVersions,
      averageVersionsPerTask,
      versionSuccessRate,
    };
  }, [taskMethodStats]);

  // Use real recent version activities
  const recentVersions = useMemo(() => {
    if (!taskMethodStats?.recentVersions) return [];
    
    return taskMethodStats.recentVersions.slice(0, 6).map((version, index) => ({
      id: version.id,
      taskName: version.task_name,
      versionNumber: index + 1, // Simple sequential numbering for display
      status: version.status as 'PROCESSED' | 'RUNNING' | 'FAILED',
      createdAt: new Date(version.created_at),
      methodsApplied: version.method_name ? 1 : 0, // Simple count based on whether method exists
      methodName: version.method_name,
    }));
  }, [taskMethodStats]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PROCESSED':
        return <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />;
      case 'RUNNING':
        return <Clock className="h-4 w-4 text-orange-600 dark:text-orange-400 animate-spin" />;
      case 'FAILED':
        return <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />;
      default:
        return <Activity className="h-4 w-4 text-gray-600 dark:text-gray-400" />;
    }
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Version Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5" />
            Version Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Total Versions */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Total Versions</p>
                <p className="text-2xl font-bold">{versionStats.totalVersions}</p>
              </div>
              <div className="p-3 rounded-full bg-blue-50 dark:bg-blue-950/20">
                <GitBranch className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>

            {/* Version Success Rate */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Version Success Rate</span>
                <span className="text-sm font-bold">{versionStats.versionSuccessRate}%</span>
              </div>
              <Progress value={versionStats.versionSuccessRate} className="h-2" />
            </div>

            {/* Average Versions per Task */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Avg. Versions/Task</p>
                <p className="text-lg font-semibold">{versionStats.averageVersionsPerTask}</p>
              </div>
              <TrendingUp className="h-5 w-5 text-green-500 dark:text-green-400" />
            </div>

            {/* Active Versions */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Active Versions</p>
                <p className="text-lg font-semibold text-orange-600 dark:text-orange-400">{versionStats.activeVersions}</p>
              </div>
              <Clock className="h-5 w-5 text-orange-500 dark:text-orange-400" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Version Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Version Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentVersions.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                No recent version activities found.
              </p>
            ) : (
              recentVersions.map((version) => (
                <div 
                  key={version.id} 
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors border border-border/50"
                >
                  <div className="flex-shrink-0">
                    {getStatusIcon(version.status)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-medium truncate">
                        {version.taskName}
                      </p>
                      <Badge variant="outline" className="text-xs">
                        v{version.versionNumber}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>{version.methodName || 'No method'}</span>
                      <span>{formatDistanceToNow(version.createdAt, { addSuffix: true })}</span>
                    </div>
                  </div>
                  <StatusBadge status={version.status} size="sm" />
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}; 