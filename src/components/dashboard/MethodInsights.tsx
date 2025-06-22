import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tables } from "@/integrations/supabase/types";
import { useMethods } from "@/hooks/useMethods";
import { useCategories } from "@/hooks/useCategories";
import { Wrench, TrendingUp, Activity, Zap } from "lucide-react";
import { useMemo } from "react";

interface MethodInsightsProps {
  tasks: Tables<'Tasks'>[];
}

export const MethodInsights = ({ tasks }: MethodInsightsProps) => {
  const { methods, loading: methodsLoading } = useMethods();
  const { categories, loading: categoriesLoading } = useCategories();

  const loading = methodsLoading || categoriesLoading;

  // Transform categories data for display with usage statistics
  const methodCategories = useMemo(() => {
    if (!categories || categories.length === 0) return [];

    return categories.map((category) => ({
      name: category.name,
      count: category.methods.length,
      methods: category.methods,
      // TODO: Replace with actual usage statistics from task versions
      usage: Math.floor(Math.random() * 80) + 20, // Mock usage percentage for now
      trend: Math.random() > 0.5 ? 'up' : 'down' // Mock trend for now
    }));
  }, [categories]);

  const topMethods = useMemo(() => {
    if (!methods || methods.length === 0) return [];

    // Get all methods from all categories (enabled methods only)
    const enabledMethods = methods.filter(method => method.is_enabled);
    
    // Mock usage data for top methods
    return enabledMethods.slice(0, 5).map(method => ({
      ...method,
      usage: Math.floor(Math.random() * 100), // TODO: Replace with actual usage statistics
      lastUsed: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000) // Mock last used date
    }));
  }, [methods]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Method Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Method Categories Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Method Categories
          </CardTitle>
        </CardHeader>
        <CardContent>
          {methodCategories.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <p>No method categories found.</p>
              <p className="text-sm">Make sure categories and methods are properly configured in the database.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {methodCategories.map((category) => (
                <div key={category.name} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{category.name}</span>
                      <Badge variant="secondary" className="text-xs">
                        {category.count} methods
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-muted-foreground">
                        {category.usage}%
                      </span>
                      {category.trend === 'up' ? (
                        <TrendingUp className="h-3 w-3 text-green-500 dark:text-green-400" />
                      ) : (
                        <Activity className="h-3 w-3 text-blue-500 dark:text-blue-400" />
                      )}
                    </div>
                  </div>
                  <Progress value={category.usage} className="h-2" />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top Used Methods */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Most Used Methods
          </CardTitle>
        </CardHeader>
        <CardContent>
          {topMethods.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <p>No methods found.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {topMethods.map((method, index) => (
                <div key={method.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-xs font-bold text-primary">
                      {index + 1}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {method.label}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {method.description}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{method.usage}%</p>
                    <p className="text-xs text-muted-foreground">usage</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}; 