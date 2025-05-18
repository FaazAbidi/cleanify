import { DatasetType } from "@/types/dataset";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ScatterChart, Scatter, ZAxis } from "recharts";
import { ChartBarBig, FileText, AlertTriangle, TableProperties, TrendingUp, Target, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatBytes } from "@/lib/format";
import { getCorrelationColor } from "@/lib/correlation-utils";

interface DataOverviewProps {
  dataset: DatasetType;
  onSelectColumn?: (columnName: string) => void;
}

export const DataOverview = ({ dataset, onSelectColumn }: DataOverviewProps) => {
  const dataTypeColors = {
    numeric: "#0EA5E9", // Blue
    categorical: "#10B981", // Green
    datetime: "#8B5CF6", // Purple
    text: "#F97316", // Orange
    boolean: "#EAB308", // Yellow
  };

  const dataTypeIcons = {
    numeric: <ChartBarBig className="h-5 w-5" />,
    categorical: <TableProperties className="h-5 w-5" />,
    datetime: <FileText className="h-5 w-5" />,
    text: <FileText className="h-5 w-5" />,
    boolean: <TableProperties className="h-5 w-5" />,
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
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Dataset Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-2 border-b">
              <span className="font-medium">Filename</span>
              <span className="text-gray-700">{dataset.filename}</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b">
              <span className="font-medium">Number of Rows</span>
              <span className="text-gray-700">{dataset.rows.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b">
              <span className="font-medium">Number of Columns</span>
              <span className="text-gray-700">{dataset.columns.length.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b">
              <span className="font-medium">Memory Usage (est.)</span>
              <span className="text-gray-700">
                {formatBytes(dataset.rows * dataset.columns.length * 8)}
              </span>
            </div>
            
            {dataset.missingValuesCount > 0 && (
              <div className="flex items-center mt-4 text-gray-700">
                <AlertTriangle className="h-5 w-5 mr-2 text-amber-500" />
                <span>
                  {((dataset.missingValuesCount / (dataset.rows * dataset.columns.length)) * 100).toFixed(2)}% of 
                  all values are missing
                </span>
              </div>
            )}
            
            {dataset.duplicateRowsCount > 0 && (
              <div className="flex items-center mt-2 text-gray-700">
                <AlertTriangle className="h-5 w-5 mr-2 text-amber-500" />
                <span>
                  {((dataset.duplicateRowsCount / dataset.rows) * 100).toFixed(2)}% of
                  rows are duplicates
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Column Types Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={dataTypeData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {dataTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={dataTypeColors[entry.name as keyof typeof dataTypeColors]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          
          <div className="flex flex-wrap gap-2 mt-4">
            {Object.entries(dataset.dataTypes)
              .filter(([_, count]) => count > 0)
              .map(([type, count]) => (
                <Badge
                  key={type}
                  variant="outline"
                  className="flex items-center gap-1 px-3 py-1"
                >
                  {dataTypeIcons[type as keyof typeof dataTypeIcons]}
                  <span className="capitalize">{type}:</span> {count}
                </Badge>
              ))}
          </div>
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="text-lg">Data Quality Issues</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dataQualityData}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value">
                  {dataQualityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <MissingValuesOverview dataset={dataset} onSelectColumn={onSelectColumn} />
      <OutlierSummary dataset={dataset} onSelectColumn={onSelectColumn} />
    </div>
  );
};

// 2. Top Correlations Preview
const MissingValuesOverview = ({ dataset, onSelectColumn }: { 
  dataset: DatasetType;
  onSelectColumn?: (columnName: string) => void;
}) => {
  // Get columns with missing values
  const columnsWithMissingValues = dataset.columns
    .filter(col => col.missingValues > 0)
    .sort((a, b) => b.missingValues - a.missingValues)
    .slice(0, 5);
  
  if (columnsWithMissingValues.length === 0) return null;
  
  const handleColumnClick = (columnName: string) => {
    if (onSelectColumn) {
      onSelectColumn(columnName);
      
      // Scroll to the data table
      const dataTableElement = document.getElementById('data-table-section');
      if (dataTableElement) {
        dataTableElement.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Top Columns with Missing Values</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {columnsWithMissingValues.map((column, index) => (
            <div 
              key={`missing-${index}`} 
              className="flex justify-between items-center p-2 rounded-md bg-amber-50 dark:bg-amber-950/20 cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-900/20 transition-colors"
              onClick={() => handleColumnClick(column.name)}
              title="Click to view this column in the data table"
            >
              <div className="flex items-center">
                <AlertTriangle className="h-4 w-4 mr-2 text-amber-500" />
                <span className="font-medium">{column.name}</span>
              </div>
              <Badge variant="outline" className="ml-auto">
                {column.missingValues.toLocaleString()} ({column.missingPercent.toFixed(1)}%)
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

// 4. Outlier Detection Summary
const OutlierSummary = ({ dataset, onSelectColumn }: { 
  dataset: DatasetType; 
  onSelectColumn?: (columnName: string) => void;
}) => {
  const columnsWithOutliers = dataset.columns
    .filter(col => col.outliers && col.outliers > 0)
    .sort((a, b) => (b.outliers || 0) - (a.outliers || 0))
    .slice(0, 5);
  
  if (columnsWithOutliers.length === 0) return null;
  
  const outlierData = columnsWithOutliers.map(col => ({
    name: col.name,
    value: col.outliers || 0,
    percent: ((col.outliers || 0) / dataset.rows * 100).toFixed(1)
  }));
  
  const handleColumnClick = (columnName: string) => {
    if (onSelectColumn) {
      onSelectColumn(columnName);
      
      // Scroll to the data table
      const dataTableElement = document.getElementById('data-table-section');
      if (dataTableElement) {
        dataTableElement.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Columns with Most Outliers</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {outlierData.map((item, index) => (
            <div 
              key={`outlier-${index}`} 
              className="flex items-center justify-between p-2 rounded-md bg-amber-50 dark:bg-amber-950/20 cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-900/20 transition-colors"
              onClick={() => handleColumnClick(item.name)}
              title="Click to view this column in the data table"
            >
              <div className="flex items-center">
                <AlertTriangle className="h-4 w-4 mr-2 text-amber-500" />
                <span className="font-medium">{item.name}</span>
              </div>
              <Badge variant="outline" className="ml-auto">
                {item.value} ({item.percent}%)
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
