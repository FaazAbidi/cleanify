import { DatasetType } from "@/types/dataset";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Cell, Legend
} from "recharts";
import { useState, useEffect, useMemo } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

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

  const [targetColumn, setTargetColumn] = useState<string>("");
  const [filterByTargetColumn, setFilterByTargetColumn] = useState(false);

  // Get correlation matrix (if available)
  const correlationMatrix = dataset.correlationData?.matrix || [];
  const correlationLabels = dataset.correlationData?.labels || [];
  
  // Get only numeric columns that exist in correlation data
  const correlatedNumericColumns = useMemo(() => {
    return numericColumns.filter(col => 
      correlationLabels.includes(col.name)
    );
  }, [numericColumns, correlationLabels]);
  
  // Ensure target column exists in correlation data
  useEffect(() => {
    if (filterByTargetColumn && targetColumn && !correlationLabels.includes(targetColumn)) {
      // If current target isn't in correlation data, select first available column
      if (correlatedNumericColumns.length > 0) {
        console.log(`Selected target ${targetColumn} not in correlation data, selecting ${correlatedNumericColumns[0].name} instead`);
        setTargetColumn(correlatedNumericColumns[0].name);
      } else {
        // If no valid targets, disable filtering
        console.log("No valid targets in correlation data, disabling filter");
        setFilterByTargetColumn(false);
      }
    }
  }, [filterByTargetColumn, targetColumn, correlationLabels, correlatedNumericColumns]);
  
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

  // Determine whether we should show zero or very weak correlations
  const shouldShowAllCorrelations = filterByTargetColumn;

  // Generate correlation heatmap data with proper filtering
  const heatmapData = useMemo(() => {
    if (correlationLabels.length === 0 || correlationMatrix.length === 0) {
      console.log("No correlation data available:", { correlationLabels, correlationMatrix });
      return [];
    }
    
    let data: { x: string; y: string; value: number }[] = [];
    
    // Filter by target column if enabled
    if (filterByTargetColumn && targetColumn) {
      const targetIndex = correlationLabels.indexOf(targetColumn);
      console.log("Target column filtering:", { targetColumn, targetIndex, correlationLabels });
      
      if (targetIndex === -1) {
        console.log("Target column not found in correlation labels");
        return []; // Target not found in correlation data
      }
      
      // Only add correlations that involve the target column
      for (let i = 0; i < correlationLabels.length; i++) {
        if (i !== targetIndex) {
          // Log the correlation value to check if it's not a number or null
          const corrValue = correlationMatrix[targetIndex][i];
          console.log(`Correlation between ${targetColumn} and ${correlationLabels[i]}: ${corrValue}`);
          
          data.push({
            x: targetColumn,
            y: correlationLabels[i],
            value: isNaN(corrValue) ? 0 : corrValue, // Handle NaN values
          });
        }
      }
      
      console.log(`Found ${data.length} correlations for target column ${targetColumn}`);
      
      // Sort by absolute correlation value for target column correlations
      data = data.sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
      
      // Always return all correlations for target column, even if they're weak or 0
      return data;
    } else {
      // Show all correlations when not filtering by target
      const limit = Math.min(10, correlationLabels.length);
      
      for (let i = 0; i < limit; i++) {
        for (let j = i + 1; j < limit; j++) { // Only show upper triangle
          if (i !== j) {
            const corrValue = correlationMatrix[i][j];
            data.push({
              x: correlationLabels[i],
              y: correlationLabels[j],
              value: isNaN(corrValue) ? 0 : corrValue, // Handle NaN values
            });
          }
        }
      }
      
      // For general correlation view, sort by absolute correlation value
      // and only show top correlations (stronger first)
      return data.sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
    }
  }, [correlationMatrix, correlationLabels, filterByTargetColumn, targetColumn]);

  // Output correlation message based on current state
  const correlationMessage = useMemo(() => {
    if (numericColumns.length < 2) {
      return "Insufficient numeric columns for correlation analysis";
    }
    
    if (filterByTargetColumn && (!targetColumn || targetColumn === "")) {
      return "Select a target column to view correlations";
    }
    
    if (correlationLabels.length === 0) {
      return "No correlation data available";
    }
    
    if (heatmapData.length === 0) {
      if (filterByTargetColumn && targetColumn) {
        return `No correlations found for ${targetColumn}. The column may not be included in correlation calculations.`;
      }
      return "Unable to calculate correlations for the selected options";
    }
    
    return "";
  }, [numericColumns.length, filterByTargetColumn, targetColumn, correlationLabels.length, heatmapData.length]);

  // Debug information for troubleshooting
  console.log("Correlation state:", {
    numericColumns: numericColumns.map(c => c.name),
    targetColumn,
    filterByTargetColumn,
    correlationLabelsLength: correlationLabels.length,
    correlationLabels: correlationLabels.slice(0, 5), // Show first 5 to avoid console clutter
    heatmapDataLength: heatmapData.length
  });

  // Effect to log correlation info when target changes
  useEffect(() => {
    if (filterByTargetColumn && targetColumn) {
      console.log(`Selected target column: ${targetColumn}`);
      const targetIndex = correlationLabels.indexOf(targetColumn);
      console.log(`Target index in correlation labels: ${targetIndex}`);
      
      if (targetIndex !== -1 && correlationMatrix.length > 0) {
        // Log a few sample correlation values
        const sampleCorrelations = correlationLabels.slice(0, 3).map((label, idx) => {
          if (idx === targetIndex) return null;
          return {
            column: label,
            correlation: correlationMatrix[targetIndex][idx]
          };
        }).filter(Boolean);
        
        console.log("Sample correlations:", sampleCorrelations);
      }
    }
  }, [filterByTargetColumn, targetColumn, correlationLabels, correlationMatrix]);

  // Check if correlationLabels includes the target column
  const targetInLabels = targetColumn ? correlationLabels.includes(targetColumn) : false;

  // Handler for when filter switch changes
  const handleFilterChange = (checked: boolean) => {
    setFilterByTargetColumn(checked);
    // If turning on filter but no target selected, default to first column
    if (checked && (!targetColumn || targetColumn === "" || !correlationLabels.includes(targetColumn))) {
      if (correlatedNumericColumns.length > 0) {
        setTargetColumn(correlatedNumericColumns[0].name);
      } else if (numericColumns.length > 0) {
        setTargetColumn(numericColumns[0].name);
      }
    }
  };

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
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Top Correlations</CardTitle>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Switch 
                id="target-filter"
                checked={filterByTargetColumn}
                onCheckedChange={handleFilterChange}
                disabled={!numericColumns.length}
              />
              <Label htmlFor="target-filter">Filter by target</Label>
            </div>
            
            {filterByTargetColumn && (
              <Select
                value={targetColumn}
                onValueChange={setTargetColumn}
                disabled={correlatedNumericColumns.length === 0}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select target column" />
                </SelectTrigger>
                <SelectContent>
                  {correlatedNumericColumns.map((col) => (
                    <SelectItem key={`target-${col.name}`} value={col.name}>
                      {col.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {heatmapData.length > 0 ? (
            <div className="space-y-4">
              {filterByTargetColumn && targetColumn && (
                <div className="text-sm text-gray-500 italic">
                  Showing all correlations for {targetColumn}, sorted by strength.
                </div>
              )}
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
            </div>
          ) : (
            <div className="h-40 flex flex-col items-center justify-center text-gray-500 space-y-2">
              <div>{correlationMessage}</div>
              
              {filterByTargetColumn && targetColumn && !targetInLabels && (
                <div className="text-sm text-amber-600">
                  The column "{targetColumn}" may not be included in correlation calculations.
                  Check console for debugging information.
                </div>
              )}
              
              {filterByTargetColumn && targetColumn && (
                <button 
                  className="mt-2 px-4 py-2 text-sm bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100"
                  onClick={() => setFilterByTargetColumn(false)}
                >
                  Show all correlations instead
                </button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
