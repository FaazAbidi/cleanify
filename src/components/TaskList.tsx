import { Tables } from "@/integrations/supabase/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Loader2, File, PlusCircle } from "lucide-react";

interface TaskListProps {
  tasks: Tables<'Tasks'>[];
  loading: boolean;
  selectedTaskId: number | null;
  onSelectTask: (task: Tables<'Tasks'>) => void;
  onCreateTask: () => void;
}

export function TaskList({ tasks, loading, selectedTaskId, onSelectTask, onCreateTask }: TaskListProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Your Tasks</CardTitle>
        <Button size="sm" onClick={onCreateTask}>
          <PlusCircle className="mr-2 h-4 w-4" /> New
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : tasks.length > 0 ? (
          <div className="space-y-2">
            {tasks.map((task) => (
              <div
                key={task.id}
                className={`p-3 rounded-lg cursor-pointer flex items-center border 
                  ${selectedTaskId === task.id ? 'bg-primary/10 border-primary' : 'hover:bg-muted/50 dark:hover:bg-muted/80'}`}
                onClick={() => onSelectTask(task)}
              >
                <File className="h-4 w-4 mr-2 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{task.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(task.created_at).toLocaleDateString()}
                  </p>
                </div>
                <StatusBadge status={task.status} size="sm" />
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center">
            <p className="text-muted-foreground mb-4">No tasks found</p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onCreateTask}
            >
              Create your first task
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 