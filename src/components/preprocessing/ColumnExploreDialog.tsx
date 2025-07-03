import { DatasetType, ColumnInfo } from "@/types/dataset";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, 
  PieChart, Pie, Cell, CartesianGrid, Tooltip
} from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Card, CardContent } from "@/components/ui/card";
import { Target } from "lucide-react";

interface ColumnExploreDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  column: ColumnInfo | null;
  dataset: DatasetType | null;
}

export function ColumnExploreDialog({ 
  open, 
  onOpenChange, 
  column, 
  dataset 
}: ColumnExploreDialogProps) {
  if (!column || !dataset) return null;

  const formatDistributionData = (column: ColumnInfo) => {
    if (!column.distribution) return [];

    if (column.type === 'QUANTITATIVE') {
      // For quantitative data, use bin ranges as keys
      return Object.entries(column.distribution).map(([key, value]) => ({
        bin: key,
        count: value,
      }));
    } else {
      // For qualitative data, use name/value pairs for pie chart
      return Object.entries(column.distribution)
        .sort(([,a], [,b]) => b - a) // Sort by frequency
        .slice(0, 10) // Show top 10 categories
        .map(([key, value]) => ({
          name: key,
          value: value,
        }));
    }
  };

  const distributionData = formatDistributionData(column);

  const dataTypeColors = {
    QUANTITATIVE: "#0EA5E9", // Blue
    QUALITATIVE: "#10B981", // Green
  };

  // Generate random colors for pie chart categories
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#83a6ed', '#8dd1e1', '#82ca9d', '#a4de6c', '#d0ed57'];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Column: {column.name}</DialogTitle>
          <DialogDescription>
            Explore the distribution of values in the column.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="flex flex-col p-3 bg-muted rounded-md">
              <span className="text-sm text-muted-foreground">Type</span>
              <span className="font-medium capitalize text-foreground">{column.type}</span>
            </div>
            <div className="flex flex-col p-3 bg-muted rounded-md">
              <span className="text-sm text-muted-foreground">Unique Values</span>
              <span className="font-medium text-foreground">{column.uniqueValues}</span>
            </div>
            <div className="flex flex-col p-3 bg-muted rounded-md">
              <span className="text-sm text-muted-foreground">Missing Values</span>
              <span className="font-medium text-foreground">{column.missingValues} ({column.missingPercent.toFixed(1)}%)</span>
            </div>
            
            {column.type === 'QUANTITATIVE' && (
              <>
                <div className="flex flex-col p-3 bg-muted rounded-md">
                  <span className="text-sm text-muted-foreground">Range</span>
                  <span className="font-medium text-foreground">{column.min} to {column.max}</span>
                </div>
                <div className="flex flex-col p-3 bg-muted rounded-md">
                  <span className="text-sm text-muted-foreground">Mean</span>
                  <span className="font-medium text-foreground">{(column.mean || 0).toFixed(2)}</span>
                </div>
                <div className="flex flex-col p-3 bg-muted rounded-md">
                  <span className="text-sm text-muted-foreground">Standard Deviation</span>
                  <span className="font-medium text-foreground">{(column.std || 0).toFixed(2)}</span>
                </div>
                {column.outliers !== undefined && (
                  <div className="flex flex-col p-3 bg-muted rounded-md">
                    <span className="text-sm text-muted-foreground">Outliers</span>
                    <span className="font-medium text-foreground">{column.outliers}</span>
                  </div>
                )}
                {column.skewness !== undefined && (
                  <div className="flex flex-col p-3 bg-muted rounded-md">
                    <span className="text-sm text-muted-foreground">Skewness</span>
                    <span className="font-medium text-foreground">
                      {column.skewness.toFixed(2)}
                      {column.isSkewed && (
                        <span className="ml-2 text-xs text-amber-600 dark:text-amber-400 font-normal">
                          (Significant)
                        </span>
                      )}
                    </span>
                  </div>
                )}
              </>
            )}
            
            {column.type === 'QUALITATIVE' && column.mode && (
              <div className="flex flex-col p-3 bg-muted rounded-md">
                <span className="text-sm text-muted-foreground">Most Common Value</span>
                <span className="font-medium text-foreground">{column.mode}</span>
              </div>
            )}
          </div>

          {distributionData.length > 0 && (
            <div>
              <div className="text-sm font-medium mb-2">Value Distribution</div>
              <div className="h-72">
                {column.type === 'QUANTITATIVE' ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={distributionData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="bin" 
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#3B82F6" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={distributionData}
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, value, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                      >
                        {distributionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value, name) => [value, name]} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
              {column.type === 'QUALITATIVE' && Object.keys(column.distribution || {}).length > 10 && (
                <div className="text-xs text-muted-foreground text-center mt-2">
                  Showing top 10 of {Object.keys(column.distribution || {}).length} categories
                </div>
              )}
            </div>
          )}

          {column.type === 'QUANTITATIVE' && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-4">
                <Card className="flex-1 min-w-[200px]">
                  <CardContent className="pt-6">
                    <div className="flex items-center space-x-2">
                      <BarChart className="h-5 w-5 text-blue-600" />
                      <span className="text-sm font-medium">Mean</span>
                    </div>
                    <p className="text-2xl font-bold mt-2">
                      {column.mean?.toFixed(2) || 'N/A'}
                    </p>
                  </CardContent>
                </Card>
                {/* ... more cards ... */}
              </div>
            </div>
          )}
          
          {column.type === 'QUALITATIVE' && column.mode && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2">
                  <Target className="h-5 w-5 text-green-600" />
                  <span className="text-sm font-medium">Most Common Value</span>
                </div>
                <p className="text-2xl font-bold mt-2">{column.mode}</p>
              </CardContent>
            </Card>
          )}
        </div>
        
      </DialogContent>
    </Dialog>
  );
} 