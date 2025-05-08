
import { DatasetType } from "@/types/dataset";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { ChartBarBig, FileText, AlertTriangle, TableProperties } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface DataOverviewProps {
  dataset: DatasetType;
}

export const DataOverview = ({ dataset }: DataOverviewProps) => {
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
                {Math.round(dataset.rows * dataset.columns.length * 8 / 1024 / 1024)} MB
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
    </div>
  );
};
