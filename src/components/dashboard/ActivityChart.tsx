import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, LineChart, Line, ComposedChart, Area, AreaChart } from "recharts";
import { Tables } from "@/integrations/supabase/types";
import { format, subDays, startOfDay } from "date-fns";
import { TrendingUp, Activity, GitBranch } from "lucide-react";
import { useEffect, useState } from "react";

interface ActivityChartProps {
  tasks: Tables<'Tasks'>[];
}

export const ActivityChart = ({ tasks }: ActivityChartProps) => {
  const [screenSize, setScreenSize] = useState('lg');

  // Monitor screen size for responsive adjustments
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < 640) setScreenSize('sm');
      else if (width < 768) setScreenSize('md');
      else if (width < 1024) setScreenSize('lg');
      else if (width < 1280) setScreenSize('xl');
      else setScreenSize('2xl');
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
      date: screenSize === 'sm' || screenSize === 'md' ? format(date, 'M/d') : 
            screenSize === 'lg' || screenSize === 'xl' ? format(date, 'M/d') : 
            format(date, 'MMM dd'),
      shortDate: format(date, 'M/d'),
      mediumDate: format(date, 'MMM d'),
      fullDate: format(date, 'yyyy-MM-dd'),
      displayDate: format(date, 'MMM dd, yyyy'),
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

  // Responsive configurations
  const getChartMargins = () => {
    switch (screenSize) {
      case 'sm': return { top: 5, right: 5, left: 5, bottom: 20 };
      case 'md': return { top: 8, right: 10, left: 8, bottom: 25 };
      case 'lg': return { top: 10, right: 15, left: 10, bottom: 30 };
      case 'xl': return { top: 10, right: 20, left: 10, bottom: 25 };
      default: return { top: 15, right: 25, left: 15, bottom: 20 };
    }
  };

  const getFontSize = () => {
    if (screenSize === 'sm') return 9;
    if (screenSize === 'md' || screenSize === 'lg') return 10;
    return 11;
  };

  const getXAxisInterval = () => {
    switch (screenSize) {
      case 'sm': return 3;
      case 'md': return 2;
      case 'lg': return 2;
      case 'xl': return 1;
      default: return 1;
    }
  };

  const getXAxisProps = () => {
    if (screenSize === 'sm' || screenSize === 'md') {
      return {
        angle: -45,
        textAnchor: 'end' as const,
        height: 60,
      };
    } else if (screenSize === 'lg') {
      return {
        angle: -25,
        textAnchor: 'end' as const,
        height: 45,
      };
    } else {
      return {
        angle: 0,
        textAnchor: 'middle' as const,
        height: 30,
      };
    }
  };

  const getBarRadius = () => {
    return screenSize === 'sm' ? [1, 1, 0, 0] : [2, 2, 0, 0];
  };

  const getDotSize = () => {
    if (screenSize === 'sm') return 1.5;
    if (screenSize === 'md' || screenSize === 'lg') return 1.8;
    return 2;
  };

  const getStrokeWidth = () => {
    if (screenSize === 'sm') return 1.5;
    if (screenSize === 'md' || screenSize === 'lg') return 1.8;
    return 2;
  };

  const xAxisProps = getXAxisProps();

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Activity className="h-4 w-4 sm:h-5 sm:w-5" />
              Activity Overview
            </CardTitle>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              14-day activity trends
            </p>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
            <TrendingUp className={`h-3 w-3 sm:h-4 sm:w-4 ${trendDirection === 'up' ? 'text-green-500 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`} />
            <span className={`font-medium ${trendDirection === 'up' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {trendDirection === 'up' ? '+' : '-'}{trendPercentage.toFixed(1)}%
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pb-2">
        <ChartContainer config={chartConfig} className="w-full aspect-[4/3] min-h-[250px] max-h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart 
              data={last14Days} 
              margin={getChartMargins()}
            >
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
                fontSize={getFontSize()}
                tickLine={false}
                axisLine={false}
                interval={getXAxisInterval()}
                angle={xAxisProps.angle}
                textAnchor={xAxisProps.textAnchor}
                height={xAxisProps.height}
                tick={{ fontSize: getFontSize() }}
              />
              <YAxis 
                fontSize={getFontSize()}
                tickLine={false}
                axisLine={false}
                width={screenSize === 'sm' ? 25 : screenSize === 'lg' ? 35 : 40}
                tick={{ fontSize: getFontSize() }}
              />
              <ChartTooltip 
                content={<ChartTooltipContent />}
                labelFormatter={(value, payload) => {
                  if (payload && payload[0]) {
                    return payload[0].payload.displayDate;
                  }
                  return value;
                }}
              />
              
              {/* Bars for different task statuses */}
              <Bar dataKey="completed" fill="var(--color-completed)" radius={getBarRadius()} />
              <Bar dataKey="running" fill="var(--color-running)" radius={getBarRadius()} />
              <Bar dataKey="failed" fill="var(--color-failed)" radius={getBarRadius()} />
              
              {/* Lines for versions and methods */}
              <Line 
                type="monotone" 
                dataKey="versions" 
                stroke="var(--color-versions)" 
                strokeWidth={getStrokeWidth()}
                dot={{ r: getDotSize() }}
              />
              <Line 
                type="monotone" 
                dataKey="methods" 
                stroke="var(--color-methods)" 
                strokeWidth={getStrokeWidth()}
                dot={{ r: getDotSize() }}
                strokeDasharray="3 3"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartContainer>

        {/* Activity Summary */}
        <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-border/50">
          <div className="grid grid-cols-3 gap-2 sm:gap-3 text-center">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Weekly Tasks</p>
              <p className="text-sm sm:text-lg font-bold text-blue-600 dark:text-blue-400">
                {recentActivity.reduce((sum, day) => sum + day.tasks, 0)}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Versions</p>
              <p className="text-sm sm:text-lg font-bold text-purple-600 dark:text-purple-400">
                {recentActivity.reduce((sum, day) => sum + day.versions, 0)}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Methods</p>
              <p className="text-sm sm:text-lg font-bold text-pink-600 dark:text-pink-400">
                {recentActivity.reduce((sum, day) => sum + day.methods, 0)}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
