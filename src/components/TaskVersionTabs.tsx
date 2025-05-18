import { memo, useState, useRef, useImperativeHandle, forwardRef, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tables } from "@/integrations/supabase/types";
import { DatasetType } from "@/types/dataset";
import { TaskDetails } from "@/components/TaskDetails";
import { TaskVersion } from "@/types/version";
import { PreprocessingPanel } from "@/components/preprocessing/PreprocessingPanel";
import { VersionHistory } from "@/components/version-history/VersionHistory";
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Info } from 'lucide-react';
import { StatusBadge } from './ui/StatusBadge';

export interface TaskVersionTabsRef {
  selectTab: (tab: 'exploration' | 'preprocessing' | 'history') => void;
  selectVersion: (version: TaskVersion) => void;
}

interface TaskVersionTabsProps {
  task: Tables<'Tasks'> | null;
  dataset: DatasetType | null;
  loadingData: boolean;
  progress: number;
  onDatasetUpdate: (dataset: DatasetType) => void;
  versions: TaskVersion[];
  refreshVersions: () => void;
  onVersionSelect?: (versionId: number) => void;
  selectedVersion?: TaskVersion | null;
  isUnprocessedVersion: boolean;
}

export const TaskVersionTabs = memo(forwardRef<TaskVersionTabsRef, TaskVersionTabsProps>(function TaskVersionTabs({
  task,
  dataset,
  loadingData,
  progress,
  onDatasetUpdate,
  versions,
  refreshVersions,
  onVersionSelect,
  selectedVersion,
  isUnprocessedVersion
}: TaskVersionTabsProps, ref) {
  const [activeTab, setActiveTab] = useState<string>('exploration');
  const [selectedVersionId, setSelectedVersionId] = useState<number | undefined>(
    selectedVersion?.id || (versions.length > 0 ? versions[0].id : undefined)
  );
  
  // Sync selectedVersionId when selectedVersion from parent changes
  useEffect(() => {
    if (selectedVersion?.id && selectedVersion.id !== selectedVersionId) {
      setSelectedVersionId(selectedVersion.id);
    }
  }, [selectedVersion, selectedVersionId]);
  
  const handleSelectVersion = (version: TaskVersion) => {
    setSelectedVersionId(version.id);
    if (onVersionSelect) {
      onVersionSelect(version.id);
    }
  };
  
  // Expose functions to parent components via ref
  useImperativeHandle(ref, () => ({
    selectTab: (tab: 'exploration' | 'preprocessing' | 'history') => {
      setActiveTab(tab);
    },
    selectVersion: (version: TaskVersion) => {
      handleSelectVersion(version);
    }
  }));
  
  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid grid-cols-3 mb-6">
        <TabsTrigger value="exploration">Data Exploration</TabsTrigger>
        <TabsTrigger value="preprocessing">Preprocessing</TabsTrigger>
        <TabsTrigger value="history">History</TabsTrigger>
      </TabsList>
      
      <TabsContent value="exploration" className="w-full">
        {isUnprocessedVersion ? (  
            <Alert variant="default" className="mb-6">
              <Info className="h-5 w-5 mr-2" />
              <div>
                <AlertTitle className="font-medium">
                  Processing Status: {StatusBadge({status: selectedVersion?.status || 'pending'})}
                </AlertTitle>
                <AlertDescription>
                  This version hasn't been processed yet. No data available to display. 
                  The pipeline may still be running or has encountered an error.
                </AlertDescription>
              </div>
            </Alert>
        ) : (
        <TaskDetails
          task={task}
          dataset={dataset}
          loadingData={loadingData}
          progress={progress}
          onDatasetUpdate={onDatasetUpdate}
          selectedVersion={versions.find(v => v.id === selectedVersionId) || selectedVersion}
        />
        )}
      </TabsContent>    
      
      <TabsContent value="preprocessing" className="w-full">
        {task ? (
          <PreprocessingPanel
            taskId={task.id}
            versions={versions}
            selectedVersion={versions.find(v => v.id === selectedVersionId) || null}
            onVersionCreated={refreshVersions}
          />
        ) : (
          <div className="bg-card rounded-lg border p-6 shadow-sm">
            <p className="text-muted-foreground">Select a task to access preprocessing options.</p>
          </div>
        )}
      </TabsContent>
      
      <TabsContent value="history" className="w-full">
        {versions.length > 0 ? (
          <VersionHistory 
            versions={versions} 
            onSelectVersion={handleSelectVersion}
            selectedVersionId={selectedVersionId}
          />
        ) : (
          <div className="bg-card rounded-lg border p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4">Version History</h2>
            <p className="text-muted-foreground">No version history available for this task.</p>
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
})); 