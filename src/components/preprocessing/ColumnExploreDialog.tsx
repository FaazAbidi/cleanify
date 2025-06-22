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
  PieChart, Pie, Cell
} from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

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

    return Object.entries(column.distribution).map(([key, value]) => ({
      name: key,
      value: value,
    }));
  };

  const distributionData = formatDistributionData(column);

  const dataTypeColors = {
    numeric: "#0EA5E9", // Blue
    categorical: "#10B981", // Green
    datetime: "#8B5CF6", // Purple
    text: "#F97316", // Orange
    boolean: "#EAB308", // Yellow
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
            
            {column.type === 'numeric' && (
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
            
            {column.type === 'categorical' && column.mode && (
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
                <ChartContainer
                  config={{
                    value: {
                      label: "Count",
                      color: dataTypeColors[column.type],
                    },
                  }}
                  className="h-full w-full"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    {column.type === 'numeric' ? (
                      <BarChart data={distributionData}>
                        <XAxis 
                          dataKey="name" 
                          tick={{ fontSize: 12 }}
                          tickFormatter={(val) => Number(val).toFixed(1)}
                        />
                        <YAxis />
                        <ChartTooltip 
                          content={
                            <ChartTooltipContent 
                              formatter={(value) => [value, "Count"]}
                              labelFormatter={(label) => `Value: ${Number(label).toFixed(2)}`}
                            />
                          }
                        />
                        <Bar 
                          dataKey="value" 
                          fill={dataTypeColors[column.type]}
                        />
                      </BarChart>
                    ) : (
                      <PieChart>
                        <Pie
                          data={distributionData.slice(0, 10)} // Limit to top 10 categories
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          labelLine={false}
                          label={({ name, percent }) => 
                            `${name.length > 15 ? name.substring(0, 15) + '...' : name} ${(percent * 100).toFixed(0)}%`
                          }
                        >
                          {distributionData.slice(0, 10).map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <ChartTooltip 
                          content={
                            <ChartTooltipContent 
                              formatter={(value) => [value, "Count"]}
                            />
                          }
                        />
                      </PieChart>
                    )}
                  </ResponsiveContainer>
                </ChartContainer>
              </div>
              {column.type === 'categorical' && distributionData.length > 10 && (
                <div className="text-xs text-muted-foreground text-center mt-2">
                  Showing top 10 of {distributionData.length} categories
                </div>
              )}
            </div>
          )}
        </div>
        
      </DialogContent>
    </Dialog>
  );
} 