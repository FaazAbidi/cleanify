
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tables } from "@/integrations/supabase/types";
import { TrendingUp, Database, AlertTriangle } from "lucide-react";

interface DataInsightsProps {
  tasks: Tables<'Tasks'>[];
}

export const DataInsights = ({ tasks }: DataInsightsProps) => {
  const totalTasks = tasks.length;
  const successfulTasks = tasks.filter(task => task.status === 'PROCESSED').length;
  const failedTasks = tasks.filter(task => task.status === 'FAILED').length;
  const runningTasks = tasks.filter(task => task.status === 'RUNNING').length;

  const successRate = totalTasks > 0 ? (successfulTasks / totalTasks) * 100 : 0;
  const failureRate = totalTasks > 0 ? (failedTasks / totalTasks) * 100 : 0;

  const insights = [
    {
      title: "Success Rate",
      value: `${Math.round(successRate)}%`,
      progress: successRate,
      icon: TrendingUp,
      color: "text-green-600",
      progressColor: "bg-green-500",
    },
    {
      title: "Active Tasks",
      value: runningTasks,
      progress: totalTasks > 0 ? (runningTasks / totalTasks) * 100 : 0,
      icon: Database,
      color: "text-blue-600",
      progressColor: "bg-blue-500",
    },
    {
      title: "Error Rate",
      value: `${Math.round(failureRate)}%`,
      progress: failureRate,
      icon: AlertTriangle,
      color: "text-red-600",
      progressColor: "bg-red-500",
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Data Processing Insights</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {insights.map((insight) => (
            <div key={insight.title} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <insight.icon className={`h-4 w-4 ${insight.color}`} />
                  <span className="text-sm font-medium">{insight.title}</span>
                </div>
                <span className="text-sm font-bold">{insight.value}</span>
              </div>
              <Progress 
                value={insight.progress} 
                className="h-2"
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
