import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppSidebar } from "@/components/AppSidebar";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/ui/use-toast";
import { ArrowLeft } from "lucide-react";
import { useTask } from "@/hooks/useTask";
import { useTaskData } from "@/hooks/useTaskData";
import { useTaskVersions } from "@/hooks/useTaskVersions";
import { TaskMetadata } from "@/components/TaskMetadata";
import { TaskVersionSelector } from "@/components/TaskVersionSelector";
import { TaskVersionTabs, TaskVersionTabsRef } from "@/components/TaskVersionTabs";

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
    selectedTask,
    setTaskData,
    loadTaskData,
    fileData
  } = useTaskData();

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
      if (selectedVersion && selectedVersion.file && selectedVersion.processed_file) {
        // Pass the file object from the selected version if available
        setIsUnprocessedVersion(false);
        loadTaskData(selectedVersion);
      } else {
        setIsUnprocessedVersion(true); 
      }
      setVersionChanged(false);
    }
  }, [taskId, task, selectedVersion, loadTaskData, loadingTaskData]);

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
    selectedVersion
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
    selectedVersion
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
          
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => navigate("/tasks")}
                className="mr-2"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-2xl font-bold">{task?.name || "Task Details"}</h1>
            </div>
          </div>
          
          <div className="w-full">
            {taskLoading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
              </div>
            ) : task ? (
              <div className="grid grid-cols-1 gap-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <TaskMetadata task={task} file={fileData} />
                  
                  <TaskVersionSelector 
                    versions={versions}
                    selectedVersion={selectedVersion}
                    onSelectVersion={handleVersionSelect}
                    loading={versionLoading}
                  />
                </div>
                
                <TaskVersionTabs ref={tabsRef} {...versionTabsProps} isUnprocessedVersion={isUnprocessedVersion} />
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Task not found</p>
              </div>
            )}
          </div>
        </div>
      </AppSidebar>
    </TaskPageContext.Provider>
  );
};

export default TaskPage; 