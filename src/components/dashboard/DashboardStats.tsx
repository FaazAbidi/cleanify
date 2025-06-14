
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Database, FileText, TrendingUp, Clock } from "lucide-react";
import { Tables } from "@/integrations/supabase/types";

interface DashboardStatsProps {
  tasks: Tables<'Tasks'>[];
}

export const DashboardStats = ({ tasks }: DashboardStatsProps) => {
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(task => task.status === 'PROCESSED').length;
  const runningTasks = tasks.filter(task => task.status === 'RUNNING').length;
  const failedTasks = tasks.filter(task => task.status === 'FAILED').length;
  
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const stats = [
    {
      title: "Total Tasks",
      value: totalTasks,
      icon: Database,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "Completed",
      value: completedTasks,
      icon: FileText,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "Success Rate",
      value: `${completionRate}%`,
      icon: TrendingUp,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
    {
      title: "In Progress",
      value: runningTasks,
      icon: Clock,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.title} className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </p>
                <p className="text-3xl font-bold">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-full ${stat.bgColor}`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
