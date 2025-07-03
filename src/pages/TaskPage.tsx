import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppSidebar } from "@/components/AppSidebar";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/ui/use-toast";
import { ArrowLeft, Loader2, FileText } from "lucide-react";
import { useTask } from "@/hooks/useTask";
import { useTaskData } from "@/hooks/useTaskData";
import { useTaskVersions } from "@/hooks/useTaskVersions";
import { usePreprocessingStatus } from "@/hooks/usePreprocessingStatus";
import { TaskMetadata } from "@/components/TaskMetadata";
import { TaskVersionSelector } from "@/components/TaskVersionSelector";
import { TaskVersionTabs, TaskVersionTabsRef } from "@/components/TaskVersionTabs";
import { DownloadButton } from "@/components/DownloadButton";
import { useOptimizedTaskData } from "@/hooks/useOptimizedTaskData";

// Create a context to expose the tab functions to deeply nested components
import { createContext } from "react";
import { TaskVersion } from "@/types/version";

export interface TaskPageContextType {
  tabsRef: React.RefObject<TaskVersionTabsRef> | null;
  selectVersionAndExplore: (version: TaskVersion) => void;
  selectVersionAndPreprocess: (version: TaskVersion) => void;
}

export const TaskPageContext = createContext<TaskPageContextType>({
  tabsRef: null,
  selectVersionAndExplore: () => {},
  selectVersionAndPreprocess: () => {}
});

const TaskPage = () => {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [versionChanged, setVersionChanged] = useState(false);
  const dataLoadedRef = useRef(false);
  const tabsRef = useRef<TaskVersionTabsRef>(null);
  const [isUnprocessedVersion, setIsUnprocessedVersion] = useState(false);

  // Fetch the specific task
  const { task, loading: taskLoading, error } = useTask(taskId as string);

  // Fetch task versions
  const { 
    versions, 
    selectedVersion, 
    selectVersion, 
    loading: versionLoading,
    refreshVersions 
  } = useTaskVersions(taskId);
  
  const {
    taskData,
    loadingTaskData,
    processingProgress,
    processingStage,
    selectedTask,
    loadTaskData,
    setTaskData,
    fileData,
    setFileData
  } = useOptimizedTaskData();

  // Use the preprocessing status hook and pass refreshVersions to update versions when status changes
  const { isProcessing, processingVersion, currentStatus } = usePreprocessingStatus(
    selectedVersion,
    refreshVersions
  );

  // Function to select a version and navigate to exploration tab
  const selectVersionAndExplore = useCallback((version: TaskVersion) => {
    // First select the version
    selectVersion(version.id);
    setVersionChanged(true);
    
    // Then select the exploration tab
    if (tabsRef.current) {
      tabsRef.current.selectTab('exploration');
    }
  }, [selectVersion]);

  const selectVersionAndPreprocess = useCallback((version: TaskVersion) => {
    // First select the version
    selectVersion(version.id);
    setVersionChanged(true);

    if (tabsRef.current) {
      tabsRef.current.selectTab('preprocessing');
    }
  }, [selectVersion]);

  // Handle loading task data - wrapped in useCallback to avoid dependency issues
  const handleLoadTaskData = useCallback(() => {
    if (taskId && task && !loadingTaskData) {
      // Check if the version is in a RUNNING state or doesn't have file data
      if (selectedVersion && 
          selectedVersion.status !== 'RUNNING' && 
          selectedVersion.file && 
          selectedVersion.processed_file) {
        // Pass the file object from the selected version if available
        setIsUnprocessedVersion(false);
        loadTaskData(selectedVersion);
      } else {
        setIsUnprocessedVersion(true); 
      }
      setVersionChanged(false);
    }
  }, [taskId, task, selectedVersion, loadTaskData, loadingTaskData]);

  // When currentStatus changes to PROCESSED, reload the data
  useEffect(() => {
    if (currentStatus === 'PROCESSED' && selectedVersion) {
      console.log('Status changed to PROCESSED, reloading data');
      setVersionChanged(true);
      // Trigger data reload on next render cycle
      setTimeout(() => {
        handleLoadTaskData();
      }, 0);
    }
  }, [currentStatus, selectedVersion, handleLoadTaskData]);

  // Initial data loading or when task/version changes
  useEffect(() => {
    // Skip if still loading task or versions
    if (taskLoading || versionLoading) {
      return;
    }

    // Only load data if we haven't loaded it yet or if version has changed
    if ((!dataLoadedRef.current || versionChanged) && !loadingTaskData) {
      handleLoadTaskData();
      dataLoadedRef.current = true;
    }
  }, [
    taskId, 
    task,
    selectedVersion, 
    taskLoading, 
    versionLoading,
    versionChanged,
    handleLoadTaskData,
    loadingTaskData
  ]);

  // Handle errors
  useEffect(() => {
    if (error) {
      toast({
        title: "Error",
        description: "Failed to load task. Please try again later.",
        variant: "destructive",
      });
      navigate("/tasks");
    }
  }, [error, toast, navigate]);

  // Handle version selection
  const handleVersionSelect = useCallback((versionId: number) => {
    // Only mark as changed if selecting a different version
    if (selectedVersion?.id !== versionId) {
      selectVersion(versionId);
      setVersionChanged(true);
    }
  }, [selectedVersion, selectVersion]);

  const breadcrumbItems = useMemo(() => [
    { label: "Tasks", href: "/tasks" },
    { label: task?.name || "Task Details", href: `/tasks/${taskId}` }
  ], [task, taskId]);

  // Memoize props for TaskVersionTabs to prevent unnecessary re-renders
  const versionTabsProps = useMemo(() => ({
    task: selectedTask || task,
    dataset: taskData,
    loadingData: loadingTaskData,
    progress: processingProgress,
    onDatasetUpdate: setTaskData,
    versions,
    refreshVersions,
    onVersionSelect: handleVersionSelect,
    selectedVersion,
    isUnprocessedVersion,
    isProcessing,
    currentStatus
  }), [
    selectedTask, 
    task, 
    taskData, 
    loadingTaskData, 
    processingProgress, 
    setTaskData, 
    versions, 
    refreshVersions,
    handleVersionSelect,
    selectedVersion,
    isUnprocessedVersion,
    isProcessing,
    currentStatus
  ]);

  // Create context value
  const contextValue = useMemo(() => ({
    tabsRef,
    selectVersionAndExplore,
    selectVersionAndPreprocess
  }), [selectVersionAndExplore, selectVersionAndPreprocess]);

  return (
    <TaskPageContext.Provider value={contextValue}>
      <AppSidebar>
        <div className="w-full">
          <Breadcrumbs items={breadcrumbItems} />
          
          <div className="flex flex-col gap-4 mb-8 lg:flex-row lg:justify-between lg:items-center">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground truncate">{task?.name || "Task Details"}</h1>
              <p className="text-muted-foreground mt-1 text-sm sm:text-base">Manage and analyze your data preprocessing task</p>
            </div>
            
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              {/* Download section for selected version */}
              {selectedVersion && (
                <div className="flex items-center gap-3 px-3 sm:px-4 py-3 rounded-lg bg-muted/30 border border-border/50 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">
                        {selectedVersion.name}
                      </p>
                      {selectedVersion.file && (
                        <p className="text-xs text-muted-foreground truncate">
                          {selectedVersion.file.file_name}
                        </p>
                      )}
                    </div>
                  </div>
                  <DownloadButton 
                    version={selectedVersion}
                    variant="default"
                    size="sm"
                    className="flex-shrink-0"
                  />
                </div>
              )}
              
              {/* Add preprocessing status indicator */}
              {isProcessing && (
                <div className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                  <Loader2 className="h-4 w-4 text-amber-600 dark:text-amber-400 animate-spin flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Processing in progress</p>
                    <p className="text-xs text-amber-600 dark:text-amber-400 truncate">
                      {processingVersion?.name}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="w-full space-y-6">
            {taskLoading ? (
              <div className="flex justify-center items-center h-64">
                <div className="flex items-center gap-3">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
                  <p className="text-muted-foreground">Loading task details...</p>
                </div>
              </div>
            ) : task ? (
              <div className="space-y-8">
                {/* Task Overview Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <TaskMetadata task={task} file={fileData} />
                  
                  <TaskVersionSelector 
                    versions={versions}
                    selectedVersion={selectedVersion}
                    onSelectVersion={handleVersionSelect}
                    loading={versionLoading}
                  />
                </div>
                
                {/* Main Content Tabs */}
                <div className="w-full">
                  <TaskVersionTabs ref={tabsRef} {...versionTabsProps} />
                </div>
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="p-6 rounded-lg bg-muted/30 border border-border/50 max-w-md mx-auto">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Task Not Found</h3>
                  <p className="text-muted-foreground">The requested task could not be found or you don't have permission to access it.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </AppSidebar>
    </TaskPageContext.Provider>
  );
};

export default TaskPage; 