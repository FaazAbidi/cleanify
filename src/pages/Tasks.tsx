import { useState } from "react";
import { AppSidebar } from "@/components/AppSidebar";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/ui/use-toast";
import { CreateTaskDialog } from "@/components/CreateTaskDialog";
import { useTasks } from "@/hooks/useTasks";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { TaskCard } from "@/components/TaskCard";
import { Breadcrumbs } from "@/components/Breadcrumbs";

const Tasks = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);

  console.log(user);
  
  // Use our custom hooks
  const { tasks, loading: tasksLoading, fetchTasks } = useTasks(user?.id);

  // Handle task creation
  const handleTaskCreated = () => {
    fetchTasks();
    toast({
      title: "Task created",
      description: "Your task has been created successfully.",
    });
  };

  const breadcrumbItems = [
    { label: "Tasks", href: "/tasks" }
  ];

  return (
    <AppSidebar>
      <Breadcrumbs items={breadcrumbItems} />
      
      {tasksLoading && (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      )}
      {tasks.length !== 0 && (
      <div className="flex justify-end items-center mb-6">
        <Button onClick={() => setIsTaskDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Create Task
        </Button>
      </div>
      )}
      
      {tasksLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <p className="text-muted-foreground mb-4">You don't have any tasks yet</p>
          <Button onClick={() => setIsTaskDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Create your first task
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </div>
      )}
      
      {/* Task creation dialog */}
      <CreateTaskDialog 
        open={isTaskDialogOpen} 
        onOpenChange={setIsTaskDialogOpen}
        onTaskCreated={handleTaskCreated}
      />
    </AppSidebar>
  );
};

export default Tasks;
