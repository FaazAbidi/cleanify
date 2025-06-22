import { useState } from "react";
import { DatasetType, ColumnInfo } from "@/types/dataset";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell
} from "recharts";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

interface ColumnAnalysisProps {
  dataset: DatasetType;
}

export const ColumnAnalysis = ({ dataset }: ColumnAnalysisProps) => {
  const [search, setSearch] = useState("");
  const [selectedColumn, setSelectedColumn] = useState<string | null>(
    dataset.columns.find(col => col.type === "numeric" || col.type === "categorical")?.name || null
  );
  const [selectedType, setSelectedType] = useState<string>("all");

  const filteredColumns = dataset.columns.filter((col) => {
    const nameMatch = col.name.toLowerCase().includes(search.toLowerCase());
    const typeMatch = selectedType === "all" || col.type === selectedType;
    return nameMatch && typeMatch;
  });

  const selectedColumnInfo = selectedColumn 
    ? dataset.columns.find(col => col.name === selectedColumn) 
    : null;

  const formatDistributionData = (column: ColumnInfo | null) => {
    if (!column || !column.distribution) return [];

    return Object.entries(column.distribution).map(([key, value]) => ({
      name: key,
      value: value,
    }));
  };

  const distributionData = formatDistributionData(selectedColumnInfo);

  const dataTypeColors = {
    numeric: "#0EA5E9", // Blue
    categorical: "#10B981", // Green  
    datetime: "#8B5CF6", // Purple
    text: "#F97316", // Orange
    boolean: "#EAB308", // Yellow
  };

  // Generate random colors for pie chart categories
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#83a6ed', '#8dd1e1', '#82ca9d', '#a4de6c', '#d0ed57'];

  const renderColumnList = () => (
    <div className="space-y-1.5 mt-4 max-h-[500px] overflow-y-auto">
      {filteredColumns.map((column) => (
        <div
          key={column.name}
          onClick={() => setSelectedColumn(column.name)}
          className={`p-2 rounded-md cursor-pointer ${
            selectedColumn === column.name ? "bg-primary text-primary-foreground" : "hover:bg-secondary"
          }`}
        >
          <div className="font-medium truncate">{column.name}</div>
          <div className="text-xs flex justify-between">
            <span className="capitalize">{column.type}</span>
            <span>{column.uniqueValues} unique values</span>
          </div>
        </div>
      ))}
    </div>
  );

  const renderColumnDetails = () => {
    if (!selectedColumnInfo) return <div className="text-muted-foreground">Select a column to view details</div>;
    
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col p-3 bg-muted rounded-md">
            <span className="text-sm text-muted-foreground">Type</span>
            <span className="font-medium capitalize text-foreground">{selectedColumnInfo.type}</span>
          </div>
          <div className="flex flex-col p-3 bg-muted rounded-md">
            <span className="text-sm text-muted-foreground">Unique Values</span>
            <span className="font-medium text-foreground">{selectedColumnInfo.uniqueValues}</span>
          </div>
          <div className="flex flex-col p-3 bg-muted rounded-md">
            <span className="text-sm text-muted-foreground">Missing Values</span>
            <span className="font-medium text-foreground">{selectedColumnInfo.missingValues} ({selectedColumnInfo.missingPercent.toFixed(1)}%)</span>
          </div>
          
          {selectedColumnInfo.type === 'numeric' && (
            <>
              <div className="flex flex-col p-3 bg-muted rounded-md">
                <span className="text-sm text-muted-foreground">Range</span>
                <span className="font-medium text-foreground">{selectedColumnInfo.min} to {selectedColumnInfo.max}</span>
              </div>
              <div className="flex flex-col p-3 bg-muted rounded-md">
                <span className="text-sm text-muted-foreground">Mean</span>
                <span className="font-medium text-foreground">{(selectedColumnInfo.mean || 0).toFixed(2)}</span>
              </div>
              <div className="flex flex-col p-3 bg-muted rounded-md">
                <span className="text-sm text-muted-foreground">Standard Deviation</span>
                <span className="font-medium text-foreground">{(selectedColumnInfo.std || 0).toFixed(2)}</span>
              </div>
              {selectedColumnInfo.outliers !== undefined && (
                <div className="flex flex-col p-3 bg-muted rounded-md">
                  <span className="text-sm text-muted-foreground">Outliers</span>
                  <span className="font-medium text-foreground">{selectedColumnInfo.outliers}</span>
                </div>
              )}
            </>
          )}
          
          {selectedColumnInfo.type === 'categorical' && selectedColumnInfo.mode && (
            <div className="flex flex-col p-3 bg-muted rounded-md">
              <span className="text-sm text-muted-foreground">Most Common Value</span>
              <span className="font-medium text-foreground">{selectedColumnInfo.mode}</span>
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
                    color: dataTypeColors[selectedColumnInfo.type],
                  },
                }}
                className="h-full w-full"
              >
                <ResponsiveContainer width="100%" height="100%">
                  {selectedColumnInfo.type === 'numeric' ? (
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
                        fill={dataTypeColors[selectedColumnInfo.type]}
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
            {selectedColumnInfo.type === 'categorical' && distributionData.length > 10 && (
              <div className="text-xs text-muted-foreground text-center mt-2">
                Showing top 10 of {distributionData.length} categories
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Card className="md:col-span-1">
        <CardHeader>
          <CardTitle className="text-lg">Columns</CardTitle>
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search columns..."
                className="pl-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select
              value={selectedType}
              onValueChange={setSelectedType}
            >
              <SelectTrigger>
                <SelectValue placeholder="All data types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All data types</SelectItem>
                <SelectItem value="numeric">Numeric</SelectItem>
                <SelectItem value="categorical">Categorical</SelectItem>
                <SelectItem value="datetime">Datetime</SelectItem>
                <SelectItem value="text">Text</SelectItem>
                <SelectItem value="boolean">Boolean</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {renderColumnList()}
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="text-lg">
            {selectedColumn ? `Column: ${selectedColumn}` : "Column Details"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {renderColumnDetails()}
        </CardContent>
      </Card>
    </div>
  );
};
