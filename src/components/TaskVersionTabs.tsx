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
import { VersionComparison } from "./version-history/VersionComparison";
import { usePreprocessingPipeline } from '@/hooks/usePreprocessingPipeline';
import { toast } from '@/components/ui/sonner';
import { useTabState } from '@/hooks/useTabState';

export interface TaskVersionTabsRef {
  selectTab: (tab: 'exploration' | 'preprocessing' | 'history' | 'compare') => void;
  selectVersion: (version: TaskVersion) => void;
}

interface TaskVersionTabsProps {
  task: Tables<'Tasks'> | null;
  dataset: DatasetType | null;
  loadingData: boolean;
  progress: number;
  onDatasetUpdate: (dataset: DatasetType) => void;
  versions: TaskVersion[];
  refreshVersions: (versionId?: number) => void;
  onVersionSelect?: (versionId: number) => void;
  selectedVersion?: TaskVersion | null;
  isUnprocessedVersion: boolean;
  isProcessing?: boolean;
  currentStatus?: string | null;
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
  isUnprocessedVersion,
  isProcessing = false,
  currentStatus = null
}: TaskVersionTabsProps, ref) {
  // Use URL-based tab state
  const { tabState, setMainTab } = useTabState();
  const activeTab = tabState.mainTab;
  
  const [selectedVersionId, setSelectedVersionId] = useState<number | undefined>(
    selectedVersion?.id || (versions.length > 0 ? versions[0].id : undefined)
  );
  
  // Track local unprocessed state for UI consistency
  const [localIsUnprocessedVersion, setLocalIsUnprocessedVersion] = useState(isUnprocessedVersion);
  
  // Auto-start preprocessing hook
  const { startPreprocessing, startPolling } = usePreprocessingPipeline();
  
  // Sync selectedVersionId when selectedVersion from parent changes
  useEffect(() => {
    if (selectedVersion?.id && selectedVersion.id !== selectedVersionId) {
      setSelectedVersionId(selectedVersion.id);
    }
  }, [selectedVersion, selectedVersionId]);
  
  // Sync local unprocessed state with prop
  useEffect(() => {
    setLocalIsUnprocessedVersion(isUnprocessedVersion);
  }, [isUnprocessedVersion]);
  
  // Check status when active tab changes or version changes
  useEffect(() => {
    // When switching to exploration tab, check if current version is running
    if (activeTab === 'exploration' && selectedVersion) {
      const isRunning = selectedVersion.status === 'RUNNING' || currentStatus === 'RUNNING';
      setLocalIsUnprocessedVersion(isRunning || !selectedVersion.processed_file);
    }
  }, [activeTab, selectedVersion, currentStatus]);
  
  // Get effective status - use currentStatus if available and if it's for the selected version
  const effectiveStatus = (currentStatus && selectedVersion) ? currentStatus : selectedVersion?.status;
  
  const handleSelectVersion = (version: TaskVersion) => {
    setSelectedVersionId(version.id);
    if (onVersionSelect) {
      onVersionSelect(version.id);
    }
  };
  
  // Handle tab change
  const handleTabChange = (value: string) => {
    setMainTab(value as 'exploration' | 'preprocessing' | 'history' | 'compare');
    
    // Refresh data when switching to exploration tab
    if (value === 'exploration' && selectedVersion) {
      // Check if version is running
      const isRunning = selectedVersion.status === 'RUNNING' || currentStatus === 'RUNNING';
      setLocalIsUnprocessedVersion(isRunning || !selectedVersion.processed_file);
    }
  };
  
  // Expose functions to parent components via ref
  useImperativeHandle(ref, () => ({
    selectTab: (tab: 'exploration' | 'preprocessing' | 'history' | 'compare') => {
      setMainTab(tab);
    },
    selectVersion: (version: TaskVersion) => {
      handleSelectVersion(version);
    }
  }));
  
  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
      <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 mb-6 h-auto">
        <TabsTrigger value="exploration" className="text-xs sm:text-sm py-2 px-2 sm:px-4">
          <span className="hidden sm:inline">Data </span>Exploration
        </TabsTrigger>
        <TabsTrigger value="preprocessing" className="text-xs sm:text-sm py-2 px-2 sm:px-4">
          Preprocessing
        </TabsTrigger>
        <TabsTrigger value="history" className="text-xs sm:text-sm py-2 px-2 sm:px-4">
          History
        </TabsTrigger>
        <TabsTrigger value="compare" className="text-xs sm:text-sm py-2 px-2 sm:px-4">
          Compare
        </TabsTrigger>
      </TabsList>
      
      <TabsContent value="exploration" className="w-full">
        {localIsUnprocessedVersion ? (  
            <Alert variant="default" className="mb-6">
              <Info className="h-5 w-5 mr-2" />
              <div>
                <AlertTitle className="font-medium">
                  Processing Status: {StatusBadge({status: effectiveStatus || 'pending'})}
                </AlertTitle>
                <AlertDescription>
                  {selectedVersion?.status === 'RUNNING' ? (
                    <>This version is currently being processed. Data will be available once processing is complete.</>
                  ) : (
                    <>This version hasn't been processed yet. No data available to display. 
                    The pipeline may still be running or has encountered an error.</>
                  )}
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
            task={task}
            dataset={dataset}
            onDatasetUpdate={onDatasetUpdate}
            progress={progress}
            loadingData={loadingData}
            versions={versions}
            selectedVersion={versions.find(v => v.id === selectedVersionId) || null}
            isProcessing={isProcessing}
            onVersionCreated={(newVersionId) => {
              // Use the improved refreshVersions to refresh and select the new version in one call
              refreshVersions(newVersionId);
              
              // Automatically start preprocessing for the new version
              if (newVersionId) {
                console.log(`Starting preprocessing for new version: ${newVersionId}`);
                
                // Start the preprocessing pipeline
                startPreprocessing({ versionId: newVersionId })
                  .then(result => {
                    if (result?.success) {
                      refreshVersions(newVersionId);
                      // Immediately mark as unprocessed for UI consistency
                      setLocalIsUnprocessedVersion(true);
                    } else {
                      toast.error('Error starting preprocessing', {
                        description: result?.error || 'Unknown error occurred'
                      });
                    }
                  })
                  .catch(error => {
                    console.error('Error starting preprocessing:', error);
                    toast.error('Failed to start preprocessing', {
                      description: 'An unexpected error occurred.'
                    });
                  });
              }
            }}
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
      
      <TabsContent value="compare" className="w-full">
        {versions.length > 1 ? (
          <VersionComparison 
            versions={versions} 
            baseVersion={versions.find(v => v.id === selectedVersionId) || selectedVersion}
            dataset={dataset}
            task={task}
            isUnprocessedVersion={localIsUnprocessedVersion}
          />
        ) : (
            <Alert variant="default" className="mb-6">
              <Info className="h-5 w-5 mr-2" />
                <AlertTitle className="font-medium">
                  Version Comparison
                </AlertTitle>
                <AlertDescription>At least two versions are needed for comparison. Please create a new version.</AlertDescription>
            </Alert>
        )}
      </TabsContent>
    </Tabs>
  );
})); 