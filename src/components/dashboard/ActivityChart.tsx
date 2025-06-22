import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, LineChart, Line, ComposedChart, Area, AreaChart } from "recharts";
import { Tables } from "@/integrations/supabase/types";
import { format, subDays, startOfDay } from "date-fns";
import { TrendingUp, Activity, GitBranch } from "lucide-react";

interface ActivityChartProps {
  tasks: Tables<'Tasks'>[];
}

export const ActivityChart = ({ tasks }: ActivityChartProps) => {
  // Generate data for the last 14 days for better trend visualization
  const last14Days = Array.from({ length: 14 }, (_, i) => {
    const date = startOfDay(subDays(new Date(), 13 - i));
    const dayTasks = tasks.filter(task => {
      const taskDate = startOfDay(new Date(task.created_at));
      return taskDate.getTime() === date.getTime();
    });

    // Mock version and method data (in real app, this would come from TaskMethods)
    const mockVersions = dayTasks.length * (1 + Math.random() * 2);
    const mockMethods = dayTasks.length * (2 + Math.random() * 3);

    return {
      date: format(date, 'MMM dd'),
      fullDate: format(date, 'yyyy-MM-dd'),
      tasks: dayTasks.length,
      completed: dayTasks.filter(t => t.status === 'PROCESSED').length,
      failed: dayTasks.filter(t => t.status === 'FAILED').length,
      running: dayTasks.filter(t => t.status === 'RUNNING').length,
      versions: Math.floor(mockVersions),
      methods: Math.floor(mockMethods),
    };
  });

  const chartConfig = {
    tasks: {
      label: "Tasks Created",
      color: "#3B82F6",
    },
    completed: {
      label: "Completed",
      color: "#10B981",
    },
    failed: {
      label: "Failed",
      color: "#EF4444",
    },
    running: {
      label: "Running",
      color: "#F59E0B",
    },
    versions: {
      label: "Versions Created",
      color: "#8B5CF6",
    },
    methods: {
      label: "Methods Applied",
      color: "#EC4899",
    },
  };

  // Calculate trend indicators
  const recentActivity = last14Days.slice(-7);
  const previousActivity = last14Days.slice(-14, -7);
  
  const recentTotal = recentActivity.reduce((sum, day) => sum + day.tasks + day.versions, 0);
  const previousTotal = previousActivity.reduce((sum, day) => sum + day.tasks + day.versions, 0);
  
  const trendDirection = recentTotal > previousTotal ? 'up' : 'down';
  const trendPercentage = previousTotal > 0 ? Math.abs(((recentTotal - previousTotal) / previousTotal) * 100) : 0;

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Activity Overview
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              14-day activity trends
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <TrendingUp className={`h-4 w-4 ${trendDirection === 'up' ? 'text-green-500 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`} />
            <span className={`font-medium ${trendDirection === 'up' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {trendDirection === 'up' ? '+' : '-'}{trendPercentage.toFixed(1)}%
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={last14Days} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
              {/* Background area for total activity */}
              <Area 
                type="monotone" 
                dataKey="tasks" 
                fill="var(--color-tasks)" 
                fillOpacity={0.1}
                stroke="none"
              />
              
              <XAxis 
                dataKey="date" 
                fontSize={11}
                tickLine={false}
                axisLine={false}
                interval={2}
              />
              <YAxis 
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <ChartTooltip 
                content={<ChartTooltipContent />}
                labelFormatter={(value, payload) => {
                  if (payload && payload[0]) {
                    return `${payload[0].payload.fullDate}`;
                  }
                  return value;
                }}
              />
              
              {/* Bars for different task statuses */}
              <Bar dataKey="completed" fill="var(--color-completed)" radius={[2, 2, 0, 0]} />
              <Bar dataKey="running" fill="var(--color-running)" radius={[2, 2, 0, 0]} />
              <Bar dataKey="failed" fill="var(--color-failed)" radius={[2, 2, 0, 0]} />
              
              {/* Lines for versions and methods */}
              <Line 
                type="monotone" 
                dataKey="versions" 
                stroke="var(--color-versions)" 
                strokeWidth={2}
                dot={{ r: 2 }}
              />
              <Line 
                type="monotone" 
                dataKey="methods" 
                stroke="var(--color-methods)" 
                strokeWidth={2}
                dot={{ r: 2 }}
                strokeDasharray="3 3"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartContainer>

        {/* Activity Summary */}
        <div className="mt-4 pt-4 border-t border-border/50">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Weekly Tasks</p>
              <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                {recentActivity.reduce((sum, day) => sum + day.tasks, 0)}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Versions</p>
              <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
                {recentActivity.reduce((sum, day) => sum + day.versions, 0)}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Methods</p>
              <p className="text-lg font-bold text-pink-600 dark:text-pink-400">
                {recentActivity.reduce((sum, day) => sum + day.methods, 0)}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
