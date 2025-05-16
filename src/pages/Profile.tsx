
import { AppSidebar } from "@/components/AppSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

const Profile = () => {
  const { user, profile, signOut } = useAuth();
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (profile) {
      setUsername(profile.username || "");
      setFullName(profile.full_name || "");
    }
  }, [profile]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;
    
    setIsLoading(true);
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          username,
          full_name: fullName,
        })
        .eq('id', user.id);
      
      if (error) throw error;
      
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
    } catch (error: any) {
      console.error("Profile update error:", error);
      toast({
        title: "Profile update failed",
        description: error.message || "There was an error updating your profile.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
  };

  if (!user || !profile) {
    return <div>Loading...</div>;
  }

  return (
    <AppSidebar>
      <div className="grid gap-4 grid-cols-1">
        <Card className="max-w-2xl mx-auto w-full">
          <CardHeader>
            <CardTitle>Profile Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  value={user.email}
                  disabled
                  className="bg-muted"
                />
                <p className="text-sm text-muted-foreground">
                  Your email address is verified and cannot be changed
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Your username"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your full name"
                />
              </div>
              
              <div className="flex justify-between pt-4">
                <Button type="submit" variant="default" disabled={isLoading}>
                  {isLoading ? "Saving..." : "Save Changes"}
                </Button>
                <Button type="button" variant="destructive" onClick={handleLogout}>
                  Logout
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppSidebar>
  );
};

export default Profile;
