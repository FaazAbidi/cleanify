import { Tables } from "@/integrations/supabase/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DatasetType } from "@/types/dataset";
import { DataOverview } from "@/components/DataOverview";
import { DataQuality } from "@/components/DataQuality";
import { ColumnAnalysis } from "@/components/ColumnAnalysis";
import { CorrelationAnalysis } from "@/components/CorrelationAnalysis";
import { DataTypeManager } from "@/components/DataTypeManager";
import { DataTable } from "@/components/DataTable";
import { TaskLoadingIndicator } from "./TaskLoadingIndicator";

interface TaskDetailsProps {
  task: Tables<'Tasks'> | null;
  dataset: DatasetType | null;
  loadingData: boolean;
  progress: number;
  onDatasetUpdate: (dataset: DatasetType) => void;
}

export function TaskDetails({ 
  task, 
  dataset, 
  loadingData, 
  progress, 
  onDatasetUpdate 
}: TaskDetailsProps) {
  if (!task) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Task Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">Select a task to view its details</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Data Exploration</CardTitle>
      </CardHeader>
      <CardContent className="w-full">
        {loadingData ? (
          <TaskLoadingIndicator progress={progress} />
        ) : dataset ? (
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 mb-6">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="quality">Data Quality</TabsTrigger>
              <TabsTrigger value="columns">Column Analysis</TabsTrigger>
              <TabsTrigger value="datatypes">Data Types</TabsTrigger>
              <TabsTrigger value="correlation">Correlation</TabsTrigger>
            </TabsList>
            
            <div className="w-full">
              <TabsContent value="overview" className="w-full">
                <DataOverview dataset={dataset} />
              </TabsContent>
              
              <TabsContent value="quality" className="w-full">
                <DataQuality dataset={dataset} />
              </TabsContent>
              
              <TabsContent value="columns" className="w-full">
                <ColumnAnalysis dataset={dataset} />
              </TabsContent>
              
              <TabsContent value="datatypes" className="w-full">
                <DataTypeManager 
                  dataset={dataset} 
                  onDatasetUpdate={onDatasetUpdate} 
                />
              </TabsContent>
              
              <TabsContent value="correlation" className="w-full">
                <CorrelationAnalysis dataset={dataset} />
              </TabsContent>

              <div className="bg-card rounded-lg border p-6 shadow-sm mt-6 w-full">
                <h2 className="text-lg font-semibold mb-4">Data Table</h2>
                <DataTable dataset={dataset} />
              </div>
            </div>
          </Tabs>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500">No data available for this task</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 