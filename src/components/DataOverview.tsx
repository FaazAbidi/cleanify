import { DatasetType } from "@/types/dataset";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { ChartBarBig, FileText, TableProperties, Download, Search, AlertCircle, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { PerformanceWarning } from "@/components/PerformanceWarning";

const dataTypeIcons = {
  QUANTITATIVE: <ChartBarBig className="h-5 w-5" />,
  QUALITATIVE: <TableProperties className="h-5 w-5" />,
};

interface DataOverviewProps {
  dataset: DatasetType;
  onSelectColumn?: (columnName: string) => void;
}

export const DataOverview = ({ dataset, onSelectColumn }: DataOverviewProps) => {
  const dataTypeColors = {
    QUANTITATIVE: "#0EA5E9", // Blue
    QUALITATIVE: "#10B981", // Green
  };

  const dataTypeData = Object.entries(dataset.dataTypes)
    .filter(([_, count]) => count > 0)
    .map(([type, count]) => ({
      name: type,
      value: count,
    }));

  const dataQualityData = [
    {
      name: "Missing Values",
      value: dataset.missingValuesCount,
      color: "#EF4444", // Red
    },
    {
      name: "Duplicate Rows",
      value: dataset.duplicateRowsCount,
      color: "#F97316", // Orange
    },
    {
      name: "Duplicate Columns",
      value: dataset.duplicateColumnsCount,
      color: "#EAB308", // Yellow
    },
  ];

  // Get columns with most missing values (top 5)
  const columnsWithMostMissing = dataset.columns
    .filter(col => col.missingValues > 0)
    .sort((a, b) => b.missingValues - a.missingValues)
    .slice(0, 5);

  // Get columns with most outliers (top 5)
  const columnsWithMostOutliers = dataset.columns
    .filter(col => col.outliers && col.outliers > 0 && col.type === 'QUANTITATIVE')
    .sort((a, b) => (b.outliers || 0) - (a.outliers || 0))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Performance Warning */}
      <PerformanceWarning 
        rows={dataset.rows} 
        columns={dataset.columns.length}
      />
      
      {/* Data Types Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Data Types Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={dataTypeData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {dataTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={dataTypeColors[entry.name as keyof typeof dataTypeColors]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-2">
              {Object.entries(dataset.dataTypes)
                .filter(([_, count]) => count > 0)
                .map(([type, count]) => (
                <div key={type} className="flex items-center justify-between">
                  <div className="flex items-center">
                    {dataTypeIcons[type as keyof typeof dataTypeIcons]}
                    <span className="ml-2 text-sm font-medium">{type}</span>
                  </div>
                  <Badge variant="secondary">{count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Data Quality Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={dataQualityData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {dataQualityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-2">
              {dataQualityData.map((item) => (
                <div key={item.name} className="flex items-center justify-between">
                  <span className="text-sm font-medium">{item.name}</span>
                  <Badge variant="secondary">{item.value}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Columns with Missing Values and Outliers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              Columns with Most Missing Values
            </CardTitle>
          </CardHeader>
          <CardContent>
            {columnsWithMostMissing.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                No columns with missing values found
              </div>
            ) : (
              <div className="space-y-3">
                {columnsWithMostMissing.map((column) => (
                  <div 
                    key={column.name} 
                    className="space-y-2 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => onSelectColumn?.(column.name)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{column.name}</span>
                      <Badge variant="destructive" className="text-xs">
                        {column.missingPercent.toFixed(1)}%
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Missing: {column.missingValues}</span>
                        <span>Total: {dataset.rows}</span>
                      </div>
                      <Progress 
                        value={column.missingPercent} 
                        className="h-2"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-red-500" />
              Columns with Most Outliers
            </CardTitle>
          </CardHeader>
          <CardContent>
            {columnsWithMostOutliers.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                No columns with outliers found
              </div>
            ) : (
              <div className="space-y-3">
                {columnsWithMostOutliers.map((column) => (
                  <div 
                    key={column.name} 
                    className="space-y-2 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => onSelectColumn?.(column.name)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{column.name}</span>
                      <Badge variant="destructive" className="text-xs">
                        {column.outliers} outliers
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Outliers: {column.outliers}</span>
                        <span>Total: {dataset.rows}</span>
                      </div>
                      <Progress 
                        value={((column.outliers || 0) / dataset.rows) * 100} 
                        className="h-2"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// Supporting components
interface DataOverviewCardProps {
  dataset: DatasetType;
}

export const DataOverviewCard = ({ dataset }: DataOverviewCardProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Dataset Overview</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-medium text-gray-600">Rows</p>
            <p className="text-2xl font-bold">{dataset.rows.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600">Columns</p>
            <p className="text-2xl font-bold">{dataset.columns.length}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600">Missing Values</p>
            <p className="text-2xl font-bold text-red-600">{dataset.missingValuesCount}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600">Duplicate Rows</p>
            <p className="text-2xl font-bold text-orange-600">{dataset.duplicateRowsCount}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

interface DataTypeSummaryProps {
  dataset: DatasetType;
}

export const DataTypeSummary = ({ dataset }: DataTypeSummaryProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Data Types</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {Object.entries(dataset.dataTypes)
            .filter(([_, count]) => count > 0)
            .map(([type, count]) => (
            <div key={type} className="flex items-center justify-between">
              <div className="flex items-center">
                {dataTypeIcons[type as keyof typeof dataTypeIcons]}
                <span className="ml-2 text-sm font-medium">{type}</span>
              </div>
              <Badge variant="secondary">{count}</Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
