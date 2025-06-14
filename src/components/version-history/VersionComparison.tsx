import { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TaskVersion } from "@/types/version";
import { DatasetType } from "@/types/dataset";
import { Tables } from "@/integrations/supabase/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info, Loader2 } from 'lucide-react';
import { StatusBadge } from "@/components/ui/StatusBadge";
import { VersionDiffTable } from "./VersionDiffTable";
import { VersionDiffVisualizations } from "./VersionDiffVisualizations";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTaskData } from '@/hooks/useTaskData';

interface VersionComparisonProps {
  versions: TaskVersion[];
  baseVersion: TaskVersion | undefined | null;
  dataset: DatasetType | null;
  task: Tables<'Tasks'> | null;
  isUnprocessedVersion: boolean;
}

export function VersionComparison({
  versions,
  baseVersion,
  dataset,
  task,
  isUnprocessedVersion
}: VersionComparisonProps) {
  const [compareVersion, setCompareVersion] = useState<TaskVersion | null>(null);
  const [activeDiffTab, setActiveDiffTab] = useState("table");
  const [compareVersionData, setCompareVersionData] = useState<DatasetType | null>(null);
  
  const { taskData, loadingTaskData, loadTaskData } = useTaskData();

  // Set initial comparison version to the previous version (if available)
  useEffect(() => {
    if (baseVersion && versions.length > 1) {
      // Find the index of the base version
      const baseIndex = versions.findIndex(v => v.id === baseVersion.id);
      
      // Select the previous version if available, or the next version if this is the oldest
      if (baseIndex > 0) {
        setCompareVersion(versions[baseIndex - 1]);
      } else if (baseIndex === 0 && versions.length > 1) {
        setCompareVersion(versions[1]);
      }
    }
  }, [baseVersion, versions]);

  // Load data for compare version when it changes
  useEffect(() => {
    if (compareVersion && compareVersion.processed_file && !loadingTaskData) {
      // Only load if we don't already have data for this version
      if (!compareVersionData || compareVersionData.filename !== compareVersion.file?.file_name) {
        loadTaskData(compareVersion);
      }
    }
  }, [compareVersion, loadTaskData, loadingTaskData, compareVersionData]);

  // Update compareVersionData when taskData changes
  useEffect(() => {
    if (taskData && compareVersion && !loadingTaskData) {
      console.log('Updating compareVersionData with taskData:', taskData);
      setCompareVersionData(taskData);
    }
  }, [taskData, compareVersion, loadingTaskData]);

  const otherVersions = versions.filter(v => !baseVersion || v.id !== baseVersion.id);

  // Log the current state for debugging
  console.log('Current state:', {
    baseVersion: baseVersion?.id,
    compareVersion: compareVersion?.id,
    dataset: dataset ? 'available' : 'not available',
    datasetRowCount: dataset?.rawData?.length || 0,
    compareVersionData: compareVersionData ? 'available' : 'not available',
    compareVersionDataRowCount: compareVersionData?.rawData?.length || 0,
  });

  if (!baseVersion) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Version Comparison</CardTitle>
          <CardDescription>Select a base version to compare</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No base version selected for comparison.</p>
        </CardContent>
      </Card>
    );
  }

  if (isUnprocessedVersion) {
    return (
      <Alert variant="default" className="mb-6">
        <Info className="h-5 w-5 mr-2" />
        <div>
          <AlertTitle className="font-medium">
            Processing Status: {StatusBadge({status: baseVersion?.status || 'pending'})}
          </AlertTitle>
          <AlertDescription>
            The base version hasn't been processed yet. No data available to display.
          </AlertDescription>
        </div>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Version Comparison</CardTitle>
          <CardDescription>Compare different versions of your dataset</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div>
              <p className="text-sm font-medium mb-2">Base Version:</p>
              <div className="px-4 py-2 border rounded-md bg-muted">
                <span className="font-medium">{baseVersion.name || `Version ${baseVersion.version_number}`}</span>
                <span className="ml-2 text-sm text-muted-foreground">(Created: {new Date(baseVersion.created_at).toLocaleDateString()})</span>
              </div>
            </div>
            
            <div className="flex items-center">
              <span className="mx-4">vs</span>
            </div>
            
            <div className="flex-1">
              <p className="text-sm font-medium mb-2">Compare With:</p>
              <Select 
                value={compareVersion?.id.toString() || ""}
                onValueChange={(value) => {
                  const selectedVersion = versions.find(v => v.id === parseInt(value));
                  if (selectedVersion) {
                    setCompareVersion(selectedVersion);
                    setCompareVersionData(null); // Reset data when version changes
                  }
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select version to compare" />
                </SelectTrigger>
                <SelectContent>
                  {otherVersions.map((version) => (
                    <SelectItem key={version.id} value={version.id.toString()}>
                      {version.name || `Version ${version.version_number}`} ({new Date(version.created_at).toLocaleDateString()})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {compareVersion && (
        <>
          {loadingTaskData ? (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-center p-6">
                  <Loader2 className="h-6 w-6 animate-spin mr-2" />
                  <p>Loading comparison data...</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Tabs value={activeDiffTab} onValueChange={setActiveDiffTab} className="w-full">
              <TabsList className="grid grid-cols-2 mb-6">
                <TabsTrigger value="table">Data Table Diff</TabsTrigger>
                <TabsTrigger value="visualizations">Visualizations</TabsTrigger>
              </TabsList>
              
              <TabsContent value="table" className="w-full">
                <VersionDiffTable 
                  baseVersion={baseVersion}
                  compareVersion={compareVersion}
                  dataset={dataset}
                  compareDataset={compareVersionData}
                />
              </TabsContent>
              
              <TabsContent value="visualizations" className="w-full">
                <VersionDiffVisualizations
                  baseVersion={baseVersion}
                  compareVersion={compareVersion}
                  dataset={dataset}
                  compareDataset={compareVersionData}
                  task={task}
                />
              </TabsContent>
            </Tabs>
          )}
        </>
      )}

      {!compareVersion && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">Please select a version to compare against the base version.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 