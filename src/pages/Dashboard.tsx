
import { useState } from "react";
import { AppSidebar } from "@/components/AppSidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useTasks } from "@/hooks/useTasks";
import { DashboardStats } from "@/components/dashboard/DashboardStats";
import { ActivityChart } from "@/components/dashboard/ActivityChart";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { DataInsights } from "@/components/dashboard/DataInsights";
import { CreateTaskDialog } from "@/components/CreateTaskDialog";
import { Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const Dashboard = () => {
  const { user, profile } = useAuth();
  const { tasks, loading, fetchTasks } = useTasks(user?.id);
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

  if (loading) {
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
      <div className="space-y-6">
        {/* Welcome Section */}
        <div>
          <h1 className="text-3xl font-bold">Welcome back, {welcomeName}!</h1>
          <p className="text-muted-foreground">
            Here's an overview of your data preprocessing activities.
          </p>
        </div>

        {/* Stats Overview */}
        <DashboardStats tasks={tasks} />

        {/* Main Content Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Activity Chart - spans 2 columns on larger screens */}
          <div className="lg:col-span-2">
            <ActivityChart tasks={tasks} />
          </div>

          {/* Data Insights */}
          <DataInsights tasks={tasks} />

          {/* Recent Activity */}
          <div className="lg:col-span-2">
            <RecentActivity tasks={tasks} />
          </div>

          {/* Quick Actions */}
          <QuickActions onUploadDataset={() => setIsTaskDialogOpen(true)} />
        </div>

        {/* Additional Info Card */}
        {tasks.length === 0 && (
          <Card className="border-dashed">
            <CardHeader className="text-center">
              <CardTitle>Get Started with Data Preprocessing</CardTitle>
              <CardDescription>
                Upload your first dataset to begin your data cleaning journey
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-muted-foreground mb-4">
                Transform messy data into clean, analysis-ready datasets with our powerful preprocessing tools.
              </p>
              <button 
                onClick={() => setIsTaskDialogOpen(true)}
                className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
              >
                Upload Your First Dataset
              </button>
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
