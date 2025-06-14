
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from "recharts";
import { Tables } from "@/integrations/supabase/types";
import { format, subDays, startOfDay } from "date-fns";

interface ActivityChartProps {
  tasks: Tables<'Tasks'>[];
}

export const ActivityChart = ({ tasks }: ActivityChartProps) => {
  // Generate data for the last 7 days
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = startOfDay(subDays(new Date(), 6 - i));
    const dayTasks = tasks.filter(task => {
      const taskDate = startOfDay(new Date(task.created_at));
      return taskDate.getTime() === date.getTime();
    });

    return {
      date: format(date, 'MMM dd'),
      tasks: dayTasks.length,
      completed: dayTasks.filter(t => t.status === 'PROCESSED').length,
      failed: dayTasks.filter(t => t.status === 'FAILED').length,
    };
  });

  const chartConfig = {
    tasks: {
      label: "Total Tasks",
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
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity Overview</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={last7Days}>
              <XAxis 
                dataKey="date" 
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="tasks" fill="var(--color-tasks)" radius={4} />
              <Bar dataKey="completed" fill="var(--color-completed)" radius={4} />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};
