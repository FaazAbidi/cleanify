
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, Plus, BarChart3, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface QuickActionsProps {
  onUploadDataset?: () => void;
}

export const QuickActions = ({ onUploadDataset }: QuickActionsProps) => {
  const navigate = useNavigate();

  const actions = [
    {
      title: "Upload Dataset",
      description: "Start a new data preprocessing task",
      icon: Upload,
      color: "bg-blue-500 hover:bg-blue-600",
      onClick: () => onUploadDataset?.(),
    },
    {
      title: "View Tasks",
      description: "Manage your preprocessing tasks",
      icon: BarChart3,
      color: "bg-green-500 hover:bg-green-600",
      onClick: () => navigate('/tasks'),
    },
    {
      title: "Profile Settings",
      description: "Update your account settings",
      icon: Settings,
      color: "bg-purple-500 hover:bg-purple-600",
      onClick: () => navigate('/profile'),
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3">
          {actions.map((action) => (
            <Button
              key={action.title}
              variant="outline"
              className="h-auto p-4 justify-start hover:shadow-md transition-all"
              onClick={action.onClick}
            >
              <div className={`p-2 rounded-md mr-3 text-white ${action.color}`}>
                <action.icon className="h-4 w-4" />
              </div>
              <div className="text-left">
                <div className="font-medium">{action.title}</div>
                <div className="text-xs text-muted-foreground">
                  {action.description}
                </div>
              </div>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
