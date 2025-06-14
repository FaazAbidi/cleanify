
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tables } from "@/integrations/supabase/types";
import { formatDistanceToNow } from "date-fns";
import { FileText, Clock, CheckCircle, XCircle } from "lucide-react";

interface RecentActivityProps {
  tasks: Tables<'Tasks'>[];
}

export const RecentActivity = ({ tasks }: RecentActivityProps) => {
  const recentTasks = tasks
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PROCESSED':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'RUNNING':
        return <Clock className="h-4 w-4 text-orange-600" />;
      case 'FAILED':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <FileText className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PROCESSED':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'RUNNING':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'FAILED':
        return 'bg-red-50 text-red-700 border-red-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {recentTasks.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              No recent activities found.
            </p>
          ) : (
            recentTasks.map((task) => (
              <div key={task.id} className="flex items-center space-x-4 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                <div className="flex-shrink-0">
                  {getStatusIcon(task.status)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {task.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatDistanceToNow(new Date(task.created_at), { addSuffix: true })}
                  </p>
                </div>
                <Badge className={getStatusColor(task.status)}>
                  {task.status}
                </Badge>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};
