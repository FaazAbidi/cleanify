import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tables } from "@/integrations/supabase/types";
import { formatDistanceToNow } from "date-fns";
import { FileText, Clock, CheckCircle, XCircle, ArrowRight, Calendar, User } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface RecentActivityProps {
  tasks: Tables<'Tasks'>[];
}

export const RecentActivity = ({ tasks }: RecentActivityProps) => {
  const navigate = useNavigate();
  
  const recentTasks = tasks
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 8); // Show more tasks

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PROCESSED':
        return <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />;
      case 'RUNNING':
        return <Clock className="h-4 w-4 text-orange-600 dark:text-orange-400 animate-pulse" />;
      case 'FAILED':
        return <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />;
      default:
        return <FileText className="h-4 w-4 text-gray-600 dark:text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PROCESSED':
        return 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/20 dark:text-green-300 dark:border-green-800';
      case 'RUNNING':
        return 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/20 dark:text-orange-300 dark:border-orange-800';
      case 'FAILED':
        return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/20 dark:text-red-300 dark:border-red-800';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-950/20 dark:text-gray-300 dark:border-gray-800';
    }
  };

  const getStatusDescription = (status: string) => {
    switch (status) {
      case 'PROCESSED':
        return 'Successfully completed';
      case 'RUNNING':
        return 'Currently processing';
      case 'FAILED':
        return 'Processing failed';
      default:
        return 'Unknown status';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            <CardTitle>Recent Activity</CardTitle>
          </div>
          {tasks.length > 8 && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigate('/tasks')}
              className="hover:bg-primary hover:text-primary-foreground transition-colors"
            >
              View All
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {recentTasks.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground font-medium">No recent activities found.</p>
              <p className="text-sm text-muted-foreground mt-1">
                Create your first task to see activities here.
              </p>
            </div>
          ) : (
            recentTasks.map((task) => (
              <div 
                key={task.id} 
                className="group flex items-center gap-4 p-4 rounded-lg bg-muted/30 hover:bg-muted/60 transition-all duration-200 border border-border/50 hover:border-border cursor-pointer"
                onClick={() => navigate(`/tasks/${task.id}`)}
              >
                <div className="flex-shrink-0">
                  <div className="relative">
                    {getStatusIcon(task.status)}
                    {task.status === 'RUNNING' && (
                      <div className="absolute -inset-1 bg-orange-500/20 rounded-full animate-ping" />
                    )}
                  </div>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                      {task.name}
                    </p>
                    <Badge className={`${getStatusColor(task.status)} text-xs font-medium`}>
                      {task.status}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>{formatDistanceToNow(new Date(task.created_at), { addSuffix: true })}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      <span>{getStatusDescription(task.status)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex-shrink-0">
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            ))
          )}
        </div>

        {/* Activity Summary */}
        {recentTasks.length > 0 && (
          <div className="mt-6 pt-4 border-t border-border/50">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Completed</p>
                <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                  {recentTasks.filter(t => t.status === 'PROCESSED').length}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Running</p>
                <p className="text-lg font-semibold text-orange-600 dark:text-orange-400">
                  {recentTasks.filter(t => t.status === 'RUNNING').length}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Failed</p>
                <p className="text-lg font-semibold text-red-600 dark:text-red-400">
                  {recentTasks.filter(t => t.status === 'FAILED').length}
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
