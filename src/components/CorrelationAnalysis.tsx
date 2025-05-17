import { DatasetType } from "@/types/dataset";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Cell, Legend
} from "recharts";
import { useState, useEffect, useMemo, useRef } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { select } from "d3-selection";
import { scaleLinear, scaleBand } from "d3-scale";
import { axisBottom, axisLeft } from "d3-axis";
import { interpolateRdBu } from "d3-scale-chromatic";

interface CorrelationAnalysisProps {
  dataset: DatasetType;
}

export const CorrelationAnalysis = ({ dataset }: CorrelationAnalysisProps) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const { matrix, labels } = dataset.correlationData;

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

  useEffect(() => {
    if (!svgRef.current || !matrix.length || !labels.length) return;

    // Clear previous visualization
    select(svgRef.current).selectAll("*").remove();

    const margin = { top: 50, right: 30, bottom: 120, left: 120 };
    // Make the dimensions responsive - calculate based on container width
    const containerWidth = svgRef.current.parentElement?.clientWidth || 600;
    // Ensure width is not more than container width
    const width = Math.min(containerWidth - margin.left - margin.right, 800);
    // Make height proportional to width
    const height = Math.min(width, 800);

    // Create scales
    const x = scaleBand()
      .domain(labels)
      .range([0, width])
      .padding(0.05);

    const y = scaleBand()
      .domain(labels)
      .range([0, height])
      .padding(0.05);

    const color = scaleLinear<string>()
      .domain([-1, 0, 1])
      .range([interpolateRdBu(0), interpolateRdBu(0.5), interpolateRdBu(1)]);

    // Create SVG
    const svg = select(svgRef.current)
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Add X axis
    svg.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(axisBottom(x))
      .selectAll("text")
      .attr("transform", "rotate(-45)")
      .style("text-anchor", "end")
      .attr("dx", "-.8em")
      .attr("dy", ".15em");

    // Add Y axis
    svg.append("g")
      .call(axisLeft(y));

    // Add correlation matrix cells
    for (let i = 0; i < labels.length; i++) {
      for (let j = 0; j < labels.length; j++) {
        svg.append("rect")
          .attr("x", x(labels[j]) || 0)
          .attr("y", y(labels[i]) || 0)
          .attr("width", x.bandwidth())
          .attr("height", y.bandwidth())
          .style("fill", color(matrix[i][j]));

        // Only add text if the rectangle is big enough
        if (x.bandwidth() > 25 && y.bandwidth() > 25) {
          svg.append("text")
            .attr("x", (x(labels[j]) || 0) + x.bandwidth() / 2)
            .attr("y", (y(labels[i]) || 0) + y.bandwidth() / 2)
            .attr("text-anchor", "middle")
            .attr("dominant-baseline", "middle")
            .style("font-size", "10px")
            .style("fill", Math.abs(matrix[i][j]) > 0.5 ? "#ffffff" : "#000000")
            .text(matrix[i][j].toFixed(2));
        }
      }
    }

    // Add title
    svg.append("text")
      .attr("x", width / 2)
      .attr("y", -20)
      .attr("text-anchor", "middle")
      .style("font-size", "16px")
      .style("font-weight", "bold")
      .text("Correlation Heatmap");

  }, [matrix, labels]);

  return (
    <div className="space-y-6 w-full overflow-hidden">
      <Card>
        <CardHeader>
          <CardTitle>Correlation Analysis</CardTitle>
        </CardHeader>
        <CardContent className="overflow-auto w-full">
          {matrix.length > 0 ? (
            <div className="flex justify-center w-full overflow-auto">
              <svg ref={svgRef} className="w-full" preserveAspectRatio="xMinYMin meet"></svg>
            </div>
          ) : (
            <div className="py-10 text-center">
              <p className="text-muted-foreground">No numeric data available for correlation analysis</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Understanding Correlations</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4">
            Correlation values range from -1 to 1:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>1.0:</strong> Perfect positive correlation (as one variable increases, the other increases proportionally)</li>
            <li><strong>0.0:</strong> No correlation (variables appear unrelated)</li>
            <li><strong>-1.0:</strong> Perfect negative correlation (as one variable increases, the other decreases proportionally)</li>
          </ul>
          <p className="mt-4">
            Generally, correlation values above 0.7 or below -0.7 indicate strong relationships, while values between -0.3 and 0.3 suggest weak or no relationship.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
