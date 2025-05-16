
import { useState, useEffect } from "react";
import { AppSidebar } from "@/components/AppSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { PlusCircle, File, Loader2 } from "lucide-react";
import { DataTable } from "@/components/DataTable";
import { DataOverview } from "@/components/DataOverview";
import { DataQuality } from "@/components/DataQuality";
import { ColumnAnalysis } from "@/components/ColumnAnalysis";
import { CorrelationAnalysis } from "@/components/CorrelationAnalysis";
import { DataTypeManager } from "@/components/DataTypeManager";
import { supabase } from "@/integrations/supabase/client";
import { DatasetType } from "@/types/dataset";
import { CreateTaskDialog } from "@/components/CreateTaskDialog";

interface Task {
  id: number;
  name: string;
  created_at: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  user_id: string;
}

const Tasks = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [taskData, setTaskData] = useState<DatasetType | null>(null);
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [loadingTaskData, setLoadingTaskData] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  // Fetch tasks on component mount
  useEffect(() => {
    fetchTasks();
  }, [user]);

  const fetchTasks = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setTasks(data || []);
    } catch (error: any) {
      console.error("Error fetching tasks:", error);
      toast({
        title: "Error",
        description: "Failed to fetch tasks. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadTaskData = async (task: Task) => {
    if (!task.id) return;
    
    setLoadingTaskData(true);
    setSelectedTask(task);
    
    try {
      // Fetch the raw data for the task from Supabase Storage
      const { data: fileData, error: fileError } = await supabase.storage
        .from('task_data')
        .download(`${user?.id}/${task.id}/raw_data.csv`);
      
      if (fileError) throw fileError;
      
      // Parse the CSV data
      const text = await fileData.text();
      const lines = text.trim().split('\n');
      const headers = lines[0].split(',');
      const rowData = lines.slice(1).map(line => line.split(','));
      
      // Create a simplified dataset structure for the components
      const dataset: DatasetType = {
        filename: `Task ${task.id} - ${task.name}`,
        columns: headers.map((header, index) => {
          // Perform basic analysis on the column data
          const columnData = rowData.map(row => row[index]);
          const type = inferDataType(columnData);
          
          return {
            name: header,
            type: type,
            uniqueValues: new Set(columnData).size,
            missingValues: columnData.filter(v => !v || v === '').length,
            missingPercent: (columnData.filter(v => !v || v === '').length / rowData.length) * 100,
            distribution: {},
          };
        }),
        rows: rowData.length,
        rawData: rowData,
        columnNames: headers,
        missingValuesCount: 0, // Will be calculated below
        duplicateRowsCount: 0, // Will be calculated below
        dataTypes: {
          numeric: 0,
          categorical: 0,
          datetime: 0,
          text: 0,
          boolean: 0
        }
      };
      
      // Calculate missing values and data types
      dataset.missingValuesCount = dataset.columns.reduce((sum, col) => sum + col.missingValues, 0);
      dataset.columns.forEach(col => {
        dataset.dataTypes[col.type]++;
      });
      
      // Calculate duplicate rows (simplified version)
      const stringifiedRows = rowData.map(row => JSON.stringify(row));
      dataset.duplicateRowsCount = stringifiedRows.length - new Set(stringifiedRows).size;
      
      setTaskData(dataset);
    } catch (error: any) {
      console.error("Error loading task data:", error);
      toast({
        title: "Error",
        description: "Failed to load task data. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setLoadingTaskData(false);
    }
  };

  // Helper function to infer data types (simplified version)
  const inferDataType = (values: string[]): 'numeric' | 'categorical' | 'datetime' | 'text' | 'boolean' => {
    // Sample the first 100 non-empty values for type detection
    const sampleValues = values.filter(v => v && v !== '').slice(0, 100);
    
    if (sampleValues.length === 0) return 'text';
    
    // Check if all values are numbers
    const numericPattern = /^-?\d+(\.\d+)?$/;
    const allNumeric = sampleValues.every(v => numericPattern.test(v));
    if (allNumeric) return 'numeric';
    
    // Check if all values are dates
    const datePattern = /^\d{4}-\d{2}-\d{2}|^\d{2}\/\d{2}\/\d{4}/;
    const allDates = sampleValues.every(v => datePattern.test(v));
    if (allDates) return 'datetime';
    
    // Check if all values are booleans
    const boolValues = ['true', 'false', '0', '1', 'yes', 'no'];
    const allBooleans = sampleValues.every(v => 
      boolValues.includes(v.toLowerCase())
    );
    if (allBooleans) return 'boolean';
    
    // Check if it's likely categorical (few unique values)
    const uniqueRatio = new Set(sampleValues).size / sampleValues.length;
    if (uniqueRatio < 0.2) return 'categorical';
    
    // Default to text
    return 'text';
  };

  return (
    <AppSidebar>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Tasks</h1>
        <Button onClick={() => setIsTaskDialogOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" /> Create Task
        </Button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Task list */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Your Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : tasks.length > 0 ? (
              <div className="space-y-2">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    className={`p-3 rounded-lg cursor-pointer flex items-center border 
                      ${selectedTask?.id === task.id ? 'bg-primary/10 border-primary' : 'hover:bg-gray-100'}`}
                    onClick={() => loadTaskData(task)}
                  >
                    <File className="h-4 w-4 mr-2 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{task.name}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(task.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className={`px-2 py-1 text-xs rounded-full 
                      ${task.status === 'completed' ? 'bg-green-100 text-green-800' : 
                        task.status === 'failed' ? 'bg-red-100 text-red-800' : 
                        task.status === 'processing' ? 'bg-blue-100 text-blue-800' : 
                        'bg-gray-100 text-gray-800'}`}
                    >
                      {task.status === 'completed' ? 'Completed' : 
                       task.status === 'failed' ? 'Failed' : 
                       task.status === 'processing' ? 'Processing' : 'Pending'}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center">
                <p className="text-gray-500 mb-4">No tasks found</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setIsTaskDialogOpen(true)}
                >
                  Create your first task
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Task details and data visualization */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>
              {selectedTask ? selectedTask.name : "Task Details"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedTask ? (
              <div className="text-center py-12">
                <p className="text-gray-500 mb-4">Select a task to view its details</p>
              </div>
            ) : loadingTaskData ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin mb-4" />
                <p>Loading task data...</p>
              </div>
            ) : taskData ? (
              <Tabs defaultValue="overview">
                <TabsList className="grid grid-cols-5 mb-6">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="quality">Data Quality</TabsTrigger>
                  <TabsTrigger value="columns">Column Analysis</TabsTrigger>
                  <TabsTrigger value="datatypes">Data Types</TabsTrigger>
                  <TabsTrigger value="correlation">Correlation</TabsTrigger>
                </TabsList>
                
                <TabsContent value="overview">
                  <DataOverview dataset={taskData} />
                </TabsContent>
                
                <TabsContent value="quality">
                  <DataQuality dataset={taskData} />
                </TabsContent>
                
                <TabsContent value="columns">
                  <ColumnAnalysis dataset={taskData} />
                </TabsContent>
                
                <TabsContent value="datatypes">
                  <DataTypeManager 
                    dataset={taskData} 
                    onDatasetUpdate={(updatedDataset) => setTaskData(updatedDataset)} 
                  />
                </TabsContent>
                
                <TabsContent value="correlation">
                  <CorrelationAnalysis dataset={taskData} />
                </TabsContent>

                <div className="mt-6">
                  <DataTable dataset={taskData} />
                </div>
              </Tabs>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500">No data available for this task</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      <CreateTaskDialog 
        open={isTaskDialogOpen} 
        onOpenChange={setIsTaskDialogOpen}
        onTaskCreated={() => {
          fetchTasks();
          toast({
            title: "Task created",
            description: "Your task has been created successfully.",
          });
        }}
      />
    </AppSidebar>
  );
};

export default Tasks;
