
import { AppSidebar } from "@/components/AppSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useState } from "react";

interface Task {
  id: number;
  title: string;
  completed: boolean;
}

const Tasks = () => {
  const [tasks, setTasks] = useState<Task[]>([
    { id: 1, title: "Clean dataset A", completed: false },
    { id: 2, title: "Transform dataset B", completed: true },
    { id: 3, title: "Analyze correlations in dataset C", completed: false },
  ]);

  const toggleTask = (taskId: number) => {
    setTasks(
      tasks.map((task) =>
        task.id === taskId ? { ...task, completed: !task.completed } : task
      )
    );
  };

  return (
    <AppSidebar>
      <Card>
        <CardHeader>
          <CardTitle>Your Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center space-x-2 border-b pb-2"
              >
                <Checkbox
                  id={`task-${task.id}`}
                  checked={task.completed}
                  onCheckedChange={() => toggleTask(task.id)}
                />
                <label
                  htmlFor={`task-${task.id}`}
                  className={`flex-1 text-sm ${
                    task.completed ? "line-through text-muted-foreground" : ""
                  }`}
                >
                  {task.title}
                </label>
              </div>
            ))}
            
            {tasks.length === 0 && (
              <p className="text-muted-foreground text-center py-4">No tasks found</p>
            )}
            
            <Button variant="outline" className="w-full mt-4">
              Add New Task
            </Button>
          </div>
        </CardContent>
      </Card>
    </AppSidebar>
  );
};

export default Tasks;
