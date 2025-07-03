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
import { VirtualDataTable } from "@/components/VirtualDataTable";
import { TaskLoadingIndicator } from "./TaskLoadingIndicator";
import { TaskVersion } from "@/types/version";
import { Badge } from "./ui/badge";
import { formatBytes } from "@/lib/format";
import { useState } from "react";
import { useTabState } from "@/hooks/useTabState";

interface TaskDetailsProps {
  task: Tables<'Tasks'> | null;
  dataset: DatasetType | null;
  loadingData: boolean;
  progress: number;
  processingStage?: string;
  onDatasetUpdate: (dataset: DatasetType) => void;
  selectedVersion?: TaskVersion | null;
}

export function TaskDetails({ 
  task, 
  dataset, 
  loadingData, 
  progress, 
  processingStage,
  onDatasetUpdate,
  selectedVersion
}: TaskDetailsProps) {
  const [selectedColumn, setSelectedColumn] = useState<string | null>(null);
  
  // Use URL-based subtab state for exploration
  const { tabState, setExplorationSubTab } = useTabState();
  const activeSubTab = tabState.explorationSubTab || 'overview';

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
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <CardTitle>Data Exploration</CardTitle>
          {selectedVersion?.file && (
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="px-2 py-1">
                {selectedVersion.file.file_name}
              </Badge>
              {selectedVersion.file.file_size && (
                <Badge variant="secondary" className="px-2 py-1">
                  {formatBytes(selectedVersion.file.file_size)}
                </Badge>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="w-full">
        {loadingData ? (
          <TaskLoadingIndicator 
            progress={progress} 
            stage={processingStage}
            showDetails={true}
          />
        ) : dataset ? (
          <Tabs value={activeSubTab} onValueChange={setExplorationSubTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 mb-6 h-auto">
              <TabsTrigger value="overview" className="text-xs sm:text-sm py-2 px-2 sm:px-4">
                Overview
              </TabsTrigger>
              <TabsTrigger value="quality" className="text-xs sm:text-sm py-2 px-2 sm:px-4">
                Data Quality
              </TabsTrigger>
              <TabsTrigger value="columns" className="text-xs sm:text-sm py-2 px-2 sm:px-4">
                Column Analysis
              </TabsTrigger>
              <TabsTrigger value="datatypes" className="text-xs sm:text-sm py-2 px-2 sm:px-4">
                Data Types
              </TabsTrigger>
              <TabsTrigger value="correlation" className="text-xs sm:text-sm py-2 px-2 sm:px-4">
                Correlation
              </TabsTrigger>
            </TabsList>
            
            <div className="w-full">
              <TabsContent value="overview" className="w-full">
                <DataOverview dataset={dataset} onSelectColumn={setSelectedColumn} />
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
                  versionId={selectedVersion?.id}
                />
              </TabsContent>
              
              <TabsContent value="correlation" className="w-full">
                <CorrelationAnalysis dataset={dataset} />
              </TabsContent>

              <div id="data-table-section" className="bg-card rounded-lg border p-6 shadow-sm mt-6 w-full">
                <h2 className="text-lg font-semibold mb-4">Data Table</h2>
                {dataset.columnNames.length > 500 ? (
                  <VirtualDataTable 
                    dataset={dataset} 
                    highlightColumn={selectedColumn}
                    maxVisibleColumns={25}
                    maxVisibleRows={50}
                  />
                ) : (
                  <DataTable dataset={dataset} highlightColumn={selectedColumn} />
                )}
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