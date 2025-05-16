import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileUploader } from "@/components/FileUploader";
import { DataOverview } from "@/components/DataOverview";
import { DataQuality } from "@/components/DataQuality";
import { ColumnAnalysis } from "@/components/ColumnAnalysis";
import { CorrelationAnalysis } from "@/components/CorrelationAnalysis";
import { DataTypeManager } from "@/components/DataTypeManager";
import { Navbar } from "@/components/Navbar";
import { DataTable } from "@/components/DataTable";
import { useToast } from "@/components/ui/use-toast";
import { DatasetType } from "@/types/dataset";

const Index = () => {
  const [dataset, setDataset] = useState<DatasetType | null>(null);
  const { toast } = useToast();

  const handleDataLoaded = (loadedData: DatasetType) => {
    setDataset(loadedData);
    toast({
      title: "Data loaded successfully",
      description: `Loaded ${loadedData.columns.length} columns and ${loadedData.rows} rows.`,
    });
  };

  const handleDatasetUpdate = async (updatedDataset: DatasetType) => {
    // Check if we need to recalculate correlations based on type changes
    const hasTypeChanges = dataset?.columns.some(
      (col, idx) => col.type !== updatedDataset.columns[idx]?.type
    );

    // If numeric columns changed, we need to recalculate correlations
    if (hasTypeChanges) {
      toast({
        title: "Updating dataset",
        description: "Recalculating correlations based on new data types...",
      });

      try {
        // Need to recalculate correlations if numeric columns changed
        // This would ideally call the same correlation calculation logic from FileUploader
        // For now, we'll use a simplified version
        const numericColumnIndices = updatedDataset.columnNames
          .map((name, idx) => ({ name, idx }))
          .filter(col => updatedDataset.columns.find(c => c.name === col.name)?.type === 'numeric');
        
        const numericColumnNames = numericColumnIndices.map(col => col.name);
        
        if (numericColumnNames.length > 1) {
          // Use raw data to recalculate correlations
          // This is simplified and doesn't handle all edge cases
          const columnTypes: Record<string, string> = {};
          updatedDataset.columns.forEach(col => {
            columnTypes[col.name] = col.type;
          });
          
          const recalculatedCorrelations = await calculatePerformanceCorrelation(
            updatedDataset.rawData,
            updatedDataset.columnNames,
            columnTypes
          );
          
          updatedDataset.correlationData = recalculatedCorrelations;
        } else {
          // Not enough numeric columns for correlation
          updatedDataset.correlationData = { matrix: [], labels: [] };
        }
      } catch (error) {
        console.error("Error recalculating correlations:", error);
        toast({
          title: "Warning",
          description: "Could not recalculate correlations with new data types",
          variant: "destructive",
        });
      }
    }

    setDataset(updatedDataset);
    toast({
      title: "Dataset updated",
      description: "Data types have been updated successfully",
    });
  };

  // Simple correlation calculation for performance
  // This is a simplified version of the one in FileUploader
  const calculatePerformanceCorrelation = async (
    data: any[][],
    columnNames: string[],
    columnTypes: Record<string, string>
  ): Promise<{ matrix: number[][], labels: string[] }> => {
    // Only include numeric columns
    const numericColumnIndices = columnNames
      .map((name, idx) => ({ name, idx }))
      .filter(col => columnTypes[col.name] === 'numeric');
    
    const labels = numericColumnIndices.map(col => col.name);
    const indices = numericColumnIndices.map(col => col.idx);
    
    // Create correlation matrix
    const matrix: number[][] = Array(indices.length).fill(0)
      .map(() => Array(indices.length).fill(0));
    
    // Fill diagonal with 1's (self-correlation)
    for (let i = 0; i < indices.length; i++) {
      matrix[i][i] = 1;
    }
    
    // Calculate correlations
    for (let i = 0; i < indices.length; i++) {
      for (let j = i + 1; j < indices.length; j++) {
        const colData1: number[] = [];
        const colData2: number[] = [];
        
        for (let k = 0; k < data.length; k++) {
          const val1 = parseFloat(data[k][indices[i]]);
          const val2 = parseFloat(data[k][indices[j]]);
          
          if (!isNaN(val1) && !isNaN(val2)) {
            colData1.push(val1);
            colData2.push(val2);
          }
        }
        
        if (colData1.length > 1) {
          // Calculate Pearson correlation
          const meanX = colData1.reduce((sum, val) => sum + val, 0) / colData1.length;
          const meanY = colData2.reduce((sum, val) => sum + val, 0) / colData2.length;
          
          let covariance = 0;
          let varX = 0;
          let varY = 0;
          
          for (let k = 0; k < colData1.length; k++) {
            const xDiff = colData1[k] - meanX;
            const yDiff = colData2[k] - meanY;
            covariance += xDiff * yDiff;
            varX += xDiff * xDiff;
            varY += yDiff * yDiff;
          }
          
          if (varX > 0 && varY > 0) {
            const correlation = covariance / (Math.sqrt(varX) * Math.sqrt(varY));
            matrix[i][j] = correlation;
            matrix[j][i] = correlation; // Correlation matrix is symmetric
          }
        }
      }
    }
    
    return { matrix, labels };
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        
        {!dataset ? (
          <div className="flex flex-col items-center justify-center py-16 bg-white rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold mb-6">Upload your dataset to begin</h2>
            <p className="text-gray-500 mb-8 max-w-md text-center">
              Upload a CSV file to visualize insights about your data quality and preprocessing needs
            </p>
            <FileUploader onDataLoaded={handleDataLoaded} />
          </div>
        ) : (
          <>
            <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
              <h2 className="text-xl font-semibold mb-4">Dataset Preview</h2>
              <DataTable dataset={dataset} />
              <div className="mt-4">
                <FileUploader onDataLoaded={handleDataLoaded} label="Upload a different dataset" />
              </div>
            </div>
            
            <Tabs defaultValue="overview" className="w-full bg-white rounded-lg shadow-sm p-6 mb-8">
              <TabsList className="grid grid-cols-5 mb-6">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="quality">Data Quality</TabsTrigger>
                <TabsTrigger value="columns">Column Analysis</TabsTrigger>
                <TabsTrigger value="datatypes">Data Types</TabsTrigger>
                <TabsTrigger value="correlation">Correlation</TabsTrigger>
              </TabsList>
              
              <TabsContent value="overview">
                <DataOverview dataset={dataset} />
              </TabsContent>
              
              <TabsContent value="quality">
                <DataQuality dataset={dataset} />
              </TabsContent>
              
              <TabsContent value="columns">
                <ColumnAnalysis dataset={dataset} />
              </TabsContent>
              
              <TabsContent value="datatypes">
                <DataTypeManager dataset={dataset} onDatasetUpdate={handleDatasetUpdate} />
              </TabsContent>
              
              <TabsContent value="correlation">
                <CorrelationAnalysis dataset={dataset} />
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </div>
  );
};

export default Index;
