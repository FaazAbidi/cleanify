import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Navbar } from "@/components/Navbar";
import { Home, ArrowLeft, AlertTriangle } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8 flex justify-center items-center min-h-[calc(100vh-64px)]">
        <Card className="w-full max-w-md text-center">
          <CardHeader className="space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center">
              <AlertTriangle className="h-8 w-8 text-orange-600 dark:text-orange-400" />
            </div>
            <CardTitle className="text-4xl font-bold">404</CardTitle>
            <p className="text-xl text-muted-foreground">
              Oops! Page not found
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-muted-foreground">
              The page you're looking for doesn't exist or has been moved.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild className="flex items-center gap-2">
                <Link to="/">
                  <Home className="h-4 w-4" />
                  Go Home
                </Link>
              </Button>
              <Button variant="outline" onClick={() => window.history.back()} className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Go Back
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default NotFound;
