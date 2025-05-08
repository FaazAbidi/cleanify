
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileUploader } from "@/components/FileUploader";
import { DataOverview } from "@/components/DataOverview";
import { DataQuality } from "@/components/DataQuality";
import { ColumnAnalysis } from "@/components/ColumnAnalysis";
import { CorrelationAnalysis } from "@/components/CorrelationAnalysis";
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Data Canvas</h1>
        
        {!dataset ? (
          <div className="flex flex-col items-center justify-center py-16 bg-white rounded-lg shadow-sm">
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
            
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid grid-cols-4 mb-6">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="quality">Data Quality</TabsTrigger>
                <TabsTrigger value="columns">Column Analysis</TabsTrigger>
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
