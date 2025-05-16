
import { AppSidebar } from "@/components/AppSidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";

const Dashboard = () => {
  const { user, profile } = useAuth();

  return (
    <AppSidebar>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Welcome</CardTitle>
            <CardDescription>
              {profile?.username || profile?.full_name 
                ? `Welcome back, ${profile.full_name || profile.username}!` 
                : `Welcome back, ${user?.email?.split('@')[0]}!`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p>This is your data preprocessing dashboard.</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Your most recent data cleaning activities</CardDescription>
          </CardHeader>
          <CardContent>
            <p>No recent activities found.</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Quick Start</CardTitle>
            <CardDescription>Get started with data cleaning</CardDescription>
          </CardHeader>
          <CardContent>
            <a href="/" className="text-primary hover:underline block">
              Upload a new dataset
            </a>
          </CardContent>
        </Card>
      </div>
    </AppSidebar>
  );
};

export default Dashboard;
