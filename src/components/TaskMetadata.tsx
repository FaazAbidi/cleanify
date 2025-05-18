import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tables } from "@/integrations/supabase/types";
import { formatDistance } from "date-fns";
import { StatusBadge } from "./ui/StatusBadge";

interface TaskMetadataProps {
  task: Tables<'Tasks'> | null;
  file?: any;
}

export function TaskMetadata({ task, file }: TaskMetadataProps) {
  if (!task) return null;

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return formatDistance(date, new Date(), { addSuffix: true });
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Task Information</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2 text-sm">

          <div className="text-muted-foreground">Name:</div>
          <div>{task.name}</div>

          <div className="text-muted-foreground">Created:</div>
          <div>{formatDate(task.created_at)}</div>
          
          <div className="text-muted-foreground">Last Modified:</div>
          <div>{formatDate(task.modified_at)}</div>
          
          <div className="text-muted-foreground">Status:</div>
          <div>
            <StatusBadge status={task.status} />
          </div>
          
          {file && file.name && (
            <>
              <div className="text-muted-foreground">File:</div>
              <div>{file.name}</div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 