import { useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppSidebar } from "@/components/AppSidebar";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { TaskDetails } from "@/components/TaskDetails";
import { useToast } from "@/components/ui/use-toast";
import { ArrowLeft } from "lucide-react";
import { useTask } from "@/hooks/useTask";
import { useTaskData } from "@/hooks/useTaskData";

const TaskPage = () => {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const dataLoadingAttempted = useRef(false);
  
  // Fetch the specific task
  const { task, loading: taskLoading, error } = useTask(taskId as string);
  
  const { 
    taskData, 
    loadingTaskData, 
    processingProgress, 
    selectedTask,
    setTaskData,
    loadTaskData
  } = useTaskData();

  // Load task data when component mounts and task is available
  useEffect(() => {
    // Prevent multiple loading attempts
    if (dataLoadingAttempted.current || loadingTaskData) return;
    
    if (taskId && task) {
      dataLoadingAttempted.current = true;
      // If we have the full task, pass it to loadTaskData
      loadTaskData(task);
    } else if (taskId) {
      dataLoadingAttempted.current = true;
      // Otherwise just pass the ID
      loadTaskData({ id: taskId as string });
    }
  }, [taskId, task, loadTaskData, loadingTaskData]);

  // Handle errors
  useEffect(() => {
    if (error) {
      toast({
        title: "Error",
        description: "Failed to load task. Please try again later.",
        variant: "destructive",
      });
      navigate("/tasks");
    }
  }, [error, toast, navigate]);

  const breadcrumbItems = [
    { label: "Tasks", href: "/tasks" },
    { label: task?.name || "Task Details", href: `/tasks/${taskId}` }
  ];

  return (
    <AppSidebar>
      <div className="w-full">
        <Breadcrumbs items={breadcrumbItems} />
        
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate("/tasks")}
              className="mr-2"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold">{task?.name || "Task Details"}</h1>
          </div>
        </div>
        
          <div className="w-full">
            {taskLoading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
              </div>
            ) : task ? (
              <TaskDetails 
                task={selectedTask || task}
                dataset={taskData}
                loadingData={loadingTaskData}
                progress={processingProgress}
                onDatasetUpdate={setTaskData}
              />
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Task not found</p>
              </div>
            )}
          </div>
        </div>
    </AppSidebar>
  );
};

export default TaskPage; 