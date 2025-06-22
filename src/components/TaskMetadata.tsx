import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tables } from "@/integrations/supabase/types";
import { formatDistance } from "date-fns";
import { StatusBadge } from "./ui/StatusBadge";
import { FileText, Calendar, Clock, Activity, Database } from "lucide-react";

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
    <Card className="hover:shadow-lg transition-all duration-300">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Task Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Task Name */}
        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">Task Name</p>
            <p className="font-semibold text-foreground">{task.name}</p>
          </div>
        </div>

        {/* Status */}
        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
          <Activity className="h-4 w-4 text-muted-foreground" />
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">Status</p>
            <StatusBadge status={task.status} />
          </div>
        </div>

        {/* Date Information */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Created</p>
              <p className="text-sm font-medium text-foreground">{formatDate(task.created_at)}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Last Modified</p>
              <p className="text-sm font-medium text-foreground">{formatDate(task.modified_at)}</p>
            </div>
          </div>
        </div>

        {/* File Information */}
        {file && file.name && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Original File</p>
              <p className="text-sm font-medium text-foreground">{file.name}</p>
            </div>
            <Badge variant="secondary" className="text-xs">
              Raw Data
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 