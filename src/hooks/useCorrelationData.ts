import { useState, useMemo, useEffect } from 'react';
import { DatasetType } from '@/types/dataset';

interface CorrelationData {
  x: string;
  y: string;
  value: number;
}

export function useCorrelationData(dataset: DatasetType) {
  const { correlationData, columns, columnNames, rawData } = dataset;
  const { matrix, labels } = correlationData;

  const numericColumns = useMemo(() => 
    columns.filter((col) => col.type === "QUANTITATIVE"), 
  [columns]);
  
  const [xColumn, setXColumn] = useState<string>(
    numericColumns.length > 0 ? numericColumns[0].name : ""
  );
  
  const [yColumn, setYColumn] = useState<string>(
    numericColumns.length > 1 ? numericColumns[1].name : numericColumns.length > 0 ? numericColumns[0].name : ""
  );

  const [targetColumn, setTargetColumn] = useState<string>("");
  const [filterByTargetColumn, setFilterByTargetColumn] = useState(false);

  // Get correlation matrix (if available)
  const correlationMatrix = correlationData?.matrix || [];
  const correlationLabels = correlationData?.labels || [];
  
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
        setTargetColumn(correlatedNumericColumns[0].name);
      } else {
        // If no valid targets, disable filtering
        setFilterByTargetColumn(false);
      }
    }
  }, [filterByTargetColumn, targetColumn, correlationLabels, correlatedNumericColumns]);

  // Generate scatter plot data for selected columns
  const scatterData = useMemo(() => {
    if (!xColumn || !yColumn) return [];
    
    const xIndex = columnNames.indexOf(xColumn);
    const yIndex = columnNames.indexOf(yColumn);
    
    if (xIndex === -1 || yIndex === -1) return [];
    
    return rawData.map((row) => {
      const x = parseFloat(row[xIndex]);
      const y = parseFloat(row[yIndex]);
      
      if (isNaN(x) || isNaN(y)) return null;
      
      return { x, y };
    }).filter(Boolean);
  }, [xColumn, yColumn, columnNames, rawData]);

  // Find correlation between selected columns
  const correlation = useMemo(() => {
    if (!xColumn || !yColumn || correlationLabels.length === 0) return null;
    
    const xIndex = correlationLabels.indexOf(xColumn);
    const yIndex = correlationLabels.indexOf(yColumn);
    
    if (xIndex === -1 || yIndex === -1) return null;
    
    return correlationMatrix[xIndex][yIndex];
  }, [xColumn, yColumn, correlationLabels, correlationMatrix]);

  // Generate correlation heatmap data with proper filtering
  const heatmapData = useMemo(() => {
    if (correlationLabels.length === 0 || correlationMatrix.length === 0) {
      return [];
    }
    
    let data: CorrelationData[] = [];
    
    // Filter by target column if enabled
    if (filterByTargetColumn && targetColumn) {
      const targetIndex = correlationLabels.indexOf(targetColumn);
      
      if (targetIndex === -1) {
        return []; // Target not found in correlation data
      }
      
      // Only add correlations that involve the target column
      for (let i = 0; i < correlationLabels.length; i++) {
        if (i !== targetIndex) {
          const corrValue = correlationMatrix[targetIndex][i];
          
          data.push({
            x: targetColumn,
            y: correlationLabels[i],
            value: isNaN(corrValue) ? 0 : corrValue, // Handle NaN values
          });
        }
      }
      
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

  // Check if correlationLabels includes the target column
  const targetInLabels = useMemo(() => 
    targetColumn ? correlationLabels.includes(targetColumn) : false,
  [targetColumn, correlationLabels]);

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

  return {
    // Data
    numericColumns,
    correlatedNumericColumns,
    correlationMatrix,
    correlationLabels, 
    scatterData,
    heatmapData,
    correlation,
    correlationMessage,
    targetInLabels,
    
    // State
    xColumn,
    yColumn,
    targetColumn,
    filterByTargetColumn,
    
    // Actions
    setXColumn,
    setYColumn,
    setTargetColumn,
    handleFilterChange
  };
} 