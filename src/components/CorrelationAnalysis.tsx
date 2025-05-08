
import { DatasetType } from "@/types/dataset";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Cell, Legend
} from "recharts";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface CorrelationAnalysisProps {
  dataset: DatasetType;
}

export const CorrelationAnalysis = ({ dataset }: CorrelationAnalysisProps) => {
  const numericColumns = dataset.columns.filter((col) => col.type === "numeric");
  
  const [xColumn, setXColumn] = useState<string>(
    numericColumns.length > 0 ? numericColumns[0].name : ""
  );
  
  const [yColumn, setYColumn] = useState<string>(
    numericColumns.length > 1 ? numericColumns[1].name : numericColumns.length > 0 ? numericColumns[0].name : ""
  );

  // Get correlation matrix (if available)
  const correlationMatrix = dataset.correlationData?.matrix || [];
  const correlationLabels = dataset.correlationData?.labels || [];

  // Generate scatter plot data for selected columns
  const generateScatterData = () => {
    if (!xColumn || !yColumn) return [];
    
    const xIndex = dataset.columnNames.indexOf(xColumn);
    const yIndex = dataset.columnNames.indexOf(yColumn);
    
    if (xIndex === -1 || yIndex === -1) return [];
    
    return dataset.rawData.map((row) => {
      const x = parseFloat(row[xIndex]);
      const y = parseFloat(row[yIndex]);
      
      if (isNaN(x) || isNaN(y)) return null;
      
      return { x, y };
    }).filter(Boolean);
  };

  const scatterData = generateScatterData();

  // Find correlation between selected columns
  const getCorrelation = () => {
    if (!xColumn || !yColumn || correlationLabels.length === 0) return null;
    
    const xIndex = correlationLabels.indexOf(xColumn);
    const yIndex = correlationLabels.indexOf(yColumn);
    
    if (xIndex === -1 || yIndex === -1) return null;
    
    return correlationMatrix[xIndex][yIndex];
  };
  
  const correlation = getCorrelation();
  
  // Helper function to get color based on correlation strength
  const getCorrelationColor = (value: number | null) => {
    if (value === null) return "#9CA3AF";
    const absValue = Math.abs(value);
    
    if (absValue >= 0.7) return value > 0 ? "#10B981" : "#EF4444"; // Strong (positive: green, negative: red)
    if (absValue >= 0.5) return value > 0 ? "#34D399" : "#F87171"; // Moderate
    if (absValue >= 0.3) return value > 0 ? "#6EE7B7" : "#FCA5A5"; // Weak
    return "#9CA3AF"; // Very weak (gray)
  };
  
  // Helper function to describe correlation strength
  const getCorrelationDescription = (value: number | null) => {
    if (value === null) return "Unknown";
    const absValue = Math.abs(value);
    const direction = value > 0 ? "positive" : "negative";
    
    if (absValue >= 0.7) return `Strong ${direction}`;
    if (absValue >= 0.5) return `Moderate ${direction}`;
    if (absValue >= 0.3) return `Weak ${direction}`;
    return "Very weak";
  };

  // Generate correlation heatmap data
  const generateHeatmapData = () => {
    if (correlationLabels.length === 0 || correlationMatrix.length === 0) return [];
    
    const data: { x: string; y: string; value: number }[] = [];
    
    // Limit to top 10 columns to avoid overcrowding
    const limit = Math.min(10, correlationLabels.length);
    
    for (let i = 0; i < limit; i++) {
      for (let j = i + 1; j < limit; j++) { // Only show upper triangle
        if (i !== j) {
          data.push({
            x: correlationLabels[i],
            y: correlationLabels[j],
            value: correlationMatrix[i][j],
          });
        }
      }
    }
    
    // Sort by absolute correlation value
    return data.sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
  };

  const heatmapData = generateHeatmapData();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="text-lg">Scatter Plot Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row md:items-end gap-4 mb-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">X Axis</label>
              <Select
                value={xColumn}
                onValueChange={setXColumn}
                disabled={numericColumns.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select X column" />
                </SelectTrigger>
                <SelectContent>
                  {numericColumns.map((col) => (
                    <SelectItem key={`x-${col.name}`} value={col.name}>
                      {col.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Y Axis</label>
              <Select
                value={yColumn}
                onValueChange={setYColumn}
                disabled={numericColumns.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Y column" />
                </SelectTrigger>
                <SelectContent>
                  {numericColumns.map((col) => (
                    <SelectItem key={`y-${col.name}`} value={col.name}>
                      {col.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {correlation !== null && (
              <div className="px-4 py-2">
                <Badge 
                  className="text-white" 
                  style={{ backgroundColor: getCorrelationColor(correlation) }}
                >
                  Correlation: {correlation.toFixed(2)} ({getCorrelationDescription(correlation)})
                </Badge>
              </div>
            )}
          </div>
          
          <div className="h-80">
            {scatterData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    type="number" 
                    dataKey="x" 
                    name={xColumn} 
                    label={{ value: xColumn, position: 'bottom', offset: 5 }} 
                  />
                  <YAxis 
                    type="number" 
                    dataKey="y" 
                    name={yColumn} 
                    label={{ value: yColumn, angle: -90, position: 'left', offset: 10 }} 
                  />
                  <Tooltip 
                    cursor={{ strokeDasharray: '3 3' }}
                    formatter={(value, name) => [value, name === 'x' ? xColumn : yColumn]}
                  />
                  <Scatter name="Values" data={scatterData} fill="#0EA5E9">
                    <Cell fill={correlation ? getCorrelationColor(correlation) : "#0EA5E9"} />
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500">
                {numericColumns.length < 2
                  ? "Insufficient numeric columns for scatter plot"
                  : "Select two columns to visualize correlation"}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="text-lg">Top Correlations</CardTitle>
        </CardHeader>
        <CardContent>
          {heatmapData.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {heatmapData.slice(0, 10).map((item, index) => (
                <div 
                  key={`heatmap-${index}`} 
                  className="flex items-center justify-between p-3 rounded-md"
                  style={{ backgroundColor: `${getCorrelationColor(item.value)}20` }}
                >
                  <div>
                    <div className="font-medium">
                      {item.x} vs {item.y}
                    </div>
                    <div className="text-sm text-gray-600">
                      {getCorrelationDescription(item.value)}
                    </div>
                  </div>
                  <Badge 
                    className="text-white" 
                    style={{ backgroundColor: getCorrelationColor(item.value) }}
                  >
                    {item.value.toFixed(2)}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-40 flex items-center justify-center text-gray-500">
              {numericColumns.length < 2
                ? "Insufficient numeric columns for correlation analysis"
                : "No significant correlations found"}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
