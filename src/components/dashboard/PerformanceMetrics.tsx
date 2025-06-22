import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tables } from "@/integrations/supabase/types";
import { TrendingUp, TrendingDown, Clock, Target, Zap, AlertTriangle, CheckCircle } from "lucide-react";
import { useMemo } from "react";

interface PerformanceMetricsProps {
  tasks: Tables<'Tasks'>[];
}

export const PerformanceMetrics = ({ tasks }: PerformanceMetricsProps) => {
  const metrics = useMemo(() => {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(task => task.status === 'PROCESSED').length;
    const runningTasks = tasks.filter(task => task.status === 'RUNNING').length;
    const failedTasks = tasks.filter(task => task.status === 'FAILED').length;

    const successRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
    const failureRate = totalTasks > 0 ? (failedTasks / totalTasks) * 100 : 0;
    const completionRate = totalTasks > 0 ? ((completedTasks + failedTasks) / totalTasks) * 100 : 0;

    // Mock performance data (in real app, this would come from actual processing times)
    const avgProcessingTime = 2.5; // hours
    const dataQualityScore = 87; // percentage
    const methodEfficiency = 92; // percentage

    return {
      successRate: Math.round(successRate),
      failureRate: Math.round(failureRate),
      completionRate: Math.round(completionRate),
      avgProcessingTime,
      dataQualityScore,
      methodEfficiency,
      totalTasks,
      completedTasks,
      runningTasks,
      failedTasks,
    };
  }, [tasks]);

  const performanceItems = [
    {
      title: "Success Rate",
      value: `${metrics.successRate}%`,
      progress: metrics.successRate,
      icon: CheckCircle,
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-50 dark:bg-green-950/20",
      progressColor: "bg-green-500",
      trend: metrics.successRate > 80 ? 'up' : 'down',
      description: "Tasks completed successfully"
    },
    {
      title: "Data Quality Score",
      value: `${metrics.dataQualityScore}%`,
      progress: metrics.dataQualityScore,
      icon: Target,
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-50 dark:bg-blue-950/20",
      progressColor: "bg-blue-500",
      trend: 'up',
      description: "Average quality after processing"
    },
    {
      title: "Method Efficiency",
      value: `${metrics.methodEfficiency}%`,
      progress: metrics.methodEfficiency,
      icon: Zap,
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-50 dark:bg-purple-950/20",
      progressColor: "bg-purple-500",
      trend: 'up',
      description: "Processing method effectiveness"
    },
    {
      title: "Completion Rate",
      value: `${metrics.completionRate}%`,
      progress: metrics.completionRate,
      icon: Clock,
      color: "text-orange-600 dark:text-orange-400",
      bgColor: "bg-orange-50 dark:bg-orange-950/20",
      progressColor: "bg-orange-500",
      trend: metrics.completionRate > 70 ? 'up' : 'down',
      description: "Tasks that finished processing"
    }
  ];

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Performance Metrics
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            Real-time
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Key Performance Indicators */}
        <div className="space-y-4">
          {performanceItems.map((item) => (
            <div key={item.title} className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-md ${item.bgColor}`}>
                    <item.icon className={`h-4 w-4 ${item.color}`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold">{item.value}</span>
                  {item.trend === 'up' ? (
                    <TrendingUp className="h-4 w-4 text-green-500 dark:text-green-400" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-500 dark:text-red-400" />
                  )}
                </div>
              </div>
              <Progress value={item.progress} className="h-2" />
            </div>
          ))}
        </div>

        {/* Processing Stats */}
        <div className="pt-4 border-t border-border/50">
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Processing Stats
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Avg. Processing Time</p>
              <p className="text-sm font-semibold">{metrics.avgProcessingTime}h</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Active Tasks</p>
              <p className="text-sm font-semibold text-orange-600 dark:text-orange-400">{metrics.runningTasks}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Queue Efficiency</p>
              <p className="text-sm font-semibold">95%</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Error Rate</p>
              <p className="text-sm font-semibold text-red-600 dark:text-red-400">{metrics.failureRate}%</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}; 