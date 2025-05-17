import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { Tables } from "@/integrations/supabase/types";
import { Button } from "./ui/button";
import { useNavigate } from "react-router-dom";
import { Clock, BarChart } from "lucide-react";
import { memo } from "react";

interface TaskCardProps {
  task: Tables<'Tasks'>;
}

function TaskCardComponent({ task }: TaskCardProps) {
  const navigate = useNavigate();
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PROCESSED':
        return <Badge className="bg-green-500">Completed</Badge>;
      case 'RUNNING':
        return <Badge className="bg-yellow-500">Processing</Badge>;
      case 'FAILED':
        return <Badge className="bg-red-500">Error</Badge>;
      default:
        return <Badge>Pending</Badge>;
    }
  };
  
  const handleViewTask = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigate(`/tasks/${task.id}`);
  };
  
  return (
    <Card className="h-full hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg">{task.name}</CardTitle>
          {getStatusBadge(task.status)}
        </div>
        <CardDescription>
          Task #{task.id}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center text-sm text-muted-foreground mb-2">
          <Clock className="h-4 w-4 mr-1" />
          <span>Created {formatDistanceToNow(new Date(task.created_at), { addSuffix: true })}</span>
        </div>
        <div className="flex items-center text-sm text-muted-foreground">
          <BarChart className="h-4 w-4 mr-1" />
          <span>Data processing task</span>
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          variant="default" 
          onClick={handleViewTask}
          className="w-full"
        >
          View Task
        </Button>
      </CardFooter>
    </Card>
  );
}

// Memoize component to prevent unnecessary re-renders
export const TaskCard = memo(TaskCardComponent); 