
import { useState } from "react";
import { DatasetType } from "@/types/dataset";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface DataQualityProps {
  dataset: DatasetType;
}

export const DataQuality = ({ dataset }: DataQualityProps) => {
  const [search, setSearch] = useState("");

  // Sort columns by missing values percentage (desc)
  const sortedColumns = [...dataset.columns]
    .sort((a, b) => b.missingPercent - a.missingPercent)
    .filter((col) => 
      col.name.toLowerCase().includes(search.toLowerCase())
    );

  // Top missing values columns for chart
  const topMissingColumns = sortedColumns
    .slice(0, 10)
    .map((col) => ({
      name: col.name,
      value: col.missingValues,
      percent: col.missingPercent,
    }));

  // Columns with outliers
  const columnsWithOutliers = dataset.columns
    .filter((col) => col.outliers && col.outliers > 0)
    .sort((a, b) => (b.outliers || 0) - (a.outliers || 0))
    .slice(0, 10)
    .map((col) => ({
      name: col.name,
      value: col.outliers || 0,
    }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Missing Values by Column</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topMissingColumns}>
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 10 }}
                    tickFormatter={(value) => value.length > 10 ? `${value.substring(0, 10)}...` : value}
                  />
                  <YAxis />
                  <Tooltip 
                    formatter={(value, name, props) => [`${value} (${props.payload.percent.toFixed(2)}%)`, "Missing Values"]}
                    labelFormatter={(label) => `Column: ${label}`}
                  />
                  <Bar dataKey="value" fill="#EF4444" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Columns with Outliers</CardTitle>
          </CardHeader>
          <CardContent>
            {columnsWithOutliers.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={columnsWithOutliers}>
                    <XAxis 
                      dataKey="name" 
                      tick={{ fontSize: 10 }}
                      tickFormatter={(value) => value.length > 10 ? `${value.substring(0, 10)}...` : value}
                    />
                    <YAxis />
                    <Tooltip 
                      formatter={(value) => [`${value}`, "Outliers"]}
                      labelFormatter={(label) => `Column: ${label}`}
                    />
                    <Bar dataKey="value">
                      {columnsWithOutliers.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill="#8B5CF6" />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-500">
                No outliers detected in numeric columns
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col space-y-4">
          <CardTitle className="text-lg">Missing Values by Column</CardTitle>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search columns..."
              className="pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {sortedColumns.map((column) => (
              <div key={column.name} className="space-y-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{column.name}</span>
                    <Badge variant="outline" className="capitalize">{column.type}</Badge>
                  </div>
                  <span className="text-sm text-gray-500">
                    {column.missingValues} missing ({column.missingPercent.toFixed(2)}%)
                  </span>
                </div>
                <Progress 
                  value={column.missingPercent} 
                  className={`h-2 ${column.missingPercent > 20 ? 'bg-red-100' : 'bg-gray-100'}`}
                  indicatorClassName={column.missingPercent > 20 ? 'bg-red-500' : ''}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
