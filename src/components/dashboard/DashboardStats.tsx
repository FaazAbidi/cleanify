import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Database, FileText, TrendingUp, Clock, Wrench, GitBranch, Zap, AlertTriangle } from "lucide-react";
import { Tables } from "@/integrations/supabase/types";
import { TaskMethodStats } from "@/hooks/useTaskMethods";
import { useMethods } from "@/hooks/useMethods";
import { useMemo } from "react";

interface DashboardStatsProps {
  tasks: Tables<'Tasks'>[];
  taskMethodStats: TaskMethodStats | null;
}

export const DashboardStats = ({ tasks, taskMethodStats }: DashboardStatsProps) => {
  const { methods } = useMethods();
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(task => task.status === 'PROCESSED').length;
  const runningTasks = tasks.filter(task => task.status === 'RUNNING').length;
  const failedTasks = tasks.filter(task => task.status === 'FAILED').length;
  
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  
  // Use real data from TaskMethods
  const totalVersions = taskMethodStats?.totalVersions || 0;

  const stats = [
    {
      title: "Total Tasks",
      value: totalTasks,
      icon: Database,
      color: "text-blue-600",
      bgColor: "bg-blue-50 dark:bg-blue-950/20",
      borderColor: "border-blue-200 dark:border-blue-800",
      description: "Active preprocessing tasks",
    },
    {
      title: "Success Rate",
      value: `${completionRate}%`,
      icon: TrendingUp,
      color: "text-green-600",
      bgColor: "bg-green-50 dark:bg-green-950/20",
      borderColor: "border-green-200 dark:border-green-800",
      description: "Task completion rate",
    },
    {
      title: "Processing Methods",
      value: methods.length,
      icon: Wrench,
      color: "text-purple-600",
      bgColor: "bg-purple-50 dark:bg-purple-950/20",
      borderColor: "border-purple-200 dark:border-purple-800",
      description: "Available preprocessing methods",
    },
    {
      title: "Data Versions",
      value: totalVersions,
      icon: GitBranch,
      color: "text-orange-600",
      bgColor: "bg-orange-50 dark:bg-orange-950/20",
      borderColor: "border-orange-200 dark:border-orange-800",
      description: "Total version iterations",
    },
    {
      title: "Active Tasks",
      value: runningTasks,
      icon: Zap,
      color: "text-indigo-600",
      bgColor: "bg-indigo-50 dark:bg-indigo-950/20",
      borderColor: "border-indigo-200 dark:border-indigo-800",
      description: "Currently processing",
    },
    {
      title: "Failed Tasks",
      value: failedTasks,
      icon: AlertTriangle,
      color: "text-red-600",
      bgColor: "bg-red-50 dark:bg-red-950/20",
      borderColor: "border-red-200 dark:border-red-800",
      description: "Tasks with errors",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {stats.map((stat) => (
        <Card key={stat.title} className={`hover:shadow-lg transition-all duration-300 ${stat.borderColor} border-2`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">{stat.value}</p>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                {stat.title}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {stat.description}
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
