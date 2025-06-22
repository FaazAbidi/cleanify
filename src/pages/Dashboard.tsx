import { useState } from "react";
import { AppSidebar } from "@/components/AppSidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useTasks } from "@/hooks/useTasks";
import { useTaskMethods } from "@/hooks/useTaskMethods";
import { DashboardStats } from "@/components/dashboard/DashboardStats";
import { ActivityChart } from "@/components/dashboard/ActivityChart";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { DataInsights } from "@/components/dashboard/DataInsights";
import { MethodInsights } from "@/components/dashboard/MethodInsights";
import { VersionActivity } from "@/components/dashboard/VersionActivity";
import { PerformanceMetrics } from "@/components/dashboard/PerformanceMetrics";
import { CreateTaskDialog } from "@/components/CreateTaskDialog";
import { Separator } from "@/components/ui/separator";
import { Loader2, Sparkles, TrendingUp } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const Dashboard = () => {
  const { user, profile } = useAuth();
  const { tasks, loading, fetchTasks } = useTasks(user?.id);
  const { stats: taskMethodStats, loading: methodsLoading } = useTaskMethods(user?.id);
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const { toast } = useToast();

  const welcomeName = profile?.username || profile?.full_name || user?.email?.split('@')[0] || 'there';

  const handleTaskCreated = () => {
    fetchTasks();
    toast({
      title: "Task created",
      description: "Your task has been created successfully.",
    });
  };

  if (loading || methodsLoading) {
    return (
      <AppSidebar>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 mx-auto animate-spin mb-4" />
            <p className="text-muted-foreground">Loading dashboard...</p>
          </div>
        </div>
      </AppSidebar>
    );
  }

  return (
    <AppSidebar>
      <div className="space-y-8 max-w-full overflow-hidden">
        {/* Welcome Section */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-primary">
              Welcome back, {welcomeName}!
            </h1>
            <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-500" />
          </div>
          <p className="text-muted-foreground text-base sm:text-lg">
            Here's an overview of your data preprocessing activities and insights.
          </p>
        </div>

        {/* Stats Overview */}
        <DashboardStats tasks={tasks} taskMethodStats={taskMethodStats} />

        <Separator className="my-8" />

        {/* Main Content Grid */}
        <div className="space-y-8">
          {/* Activity Section */}
          <section className="w-full">
            <div className="flex items-center gap-2 mb-4 sm:mb-6">
              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 dark:text-blue-400" />
              <h2 className="text-lg sm:text-xl font-semibold">Activity & Performance</h2>
            </div>
            <div className="grid gap-4 sm:gap-6 2xl:grid-cols-2 w-full">
              <div className="2xl:col-span-1 min-w-0">
                <ActivityChart tasks={tasks} taskMethodStats={taskMethodStats} />
              </div>
              <div className="2xl:col-span-1 min-w-0">
                <PerformanceMetrics tasks={tasks} taskMethodStats={taskMethodStats} />
              </div>
            </div>
          </section>

          {/* Methods and Versions Section */}
          <section>
            <div className="flex items-center gap-2 mb-6">
              <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              <h2 className="text-xl font-semibold">Methods & Versions</h2>
            </div>
            <div className="space-y-6">
              <MethodInsights tasks={tasks} taskMethodStats={taskMethodStats} />
              <VersionActivity tasks={tasks} taskMethodStats={taskMethodStats} />
            </div>
          </section>

          {/* Insights and Activity Section */}
          <section>
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Data Insights - spans 2 columns */}
              <div className="lg:col-span-2">
                <DataInsights tasks={tasks} />
              </div>

              {/* Quick Actions - takes full right space */}
              <div className="lg:col-span-1">
                <QuickActions onUploadDataset={() => setIsTaskDialogOpen(true)} />
              </div>
            </div>
          </section>

          {/* Recent Activity in full width */}
          <section>
            <RecentActivity tasks={tasks} />
          </section>
        </div>

        {/* Getting Started Card */}
        {tasks.length === 0 && (
          <Card className="border-dashed border-2 border-muted-foreground/25 bg-gradient-to-br from-blue-50/50 to-purple-50/50 dark:from-blue-950/20 dark:to-purple-950/20">
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                Get Started with Data Preprocessing
              </CardTitle>
              <CardDescription className="text-base">
                Upload your first dataset to begin your data cleaning journey
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-muted-foreground">
                Transform messy data into clean, analysis-ready datasets with our powerful preprocessing tools.
              </p>
              <div className="flex justify-center gap-4">
                <button 
                  onClick={() => setIsTaskDialogOpen(true)}
                  className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-6 py-2"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Upload Your First Dataset
                </button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Task creation dialog */}
      <CreateTaskDialog 
        open={isTaskDialogOpen} 
        onOpenChange={setIsTaskDialogOpen}
        onTaskCreated={handleTaskCreated}
      />
    </AppSidebar>
  );
};

export default Dashboard;
