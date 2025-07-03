import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Upload } from "lucide-react";
import { detectCSVSeparator, inferDataTypesForOriginalData } from "@/lib/data-utils";

interface CreateTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTaskCreated: () => void;
}

export const CreateTaskDialog = ({ open, onOpenChange, onTaskCreated }: CreateTaskDialogProps) => {
  const [taskName, setTaskName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      
      // Check file size - 50MB = 50 * 1024 * 1024 bytes = 52,428,800 bytes
      const maxSizeInBytes = 50 * 1024 * 1024;
      
      if (selectedFile.size >= maxSizeInBytes) {
        toast({
          title: "File Too Large",
          description: `File size must be less than 50MB. Your file is ${(selectedFile.size / 1048576).toFixed(2)} MB.`,
          variant: "destructive",
        });
        // Clear the file input
        e.target.value = '';
        setFile(null);
        return;
      }
      
      setFile(selectedFile);
    }
  };

  const createTask = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!taskName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a task name.",
        variant: "destructive",
      });
      return;
    }
    
    if (!file) {
      toast({
        title: "Error",
        description: "Please select a file to upload.",
        variant: "destructive",
      });
      return;
    }
    
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to create a task.",
        variant: "destructive",
      });
      return;
    }
    
    setUploading(true);
    
    try {
      // 1. Read and parse CSV file to infer data types
      const fileContent = await file.text();
      const separator = detectCSVSeparator(fileContent);
      const lines = fileContent.trim().split('\n');
      const headers = lines[0].split(separator).map(h => h.trim().replace(/^["']|["']$/g, ''));
      
      // Parse a sample of data rows for type inference
      const sampleSize = Math.min(1000, lines.length - 1); // Use first 1000 rows for inference
      const sampleData: any[][] = [];
      
      for (let i = 1; i <= sampleSize; i++) {
        if (i < lines.length) {
          const values = lines[i].split(separator).map(v => {
            let cleaned = v.trim().replace(/^["']|["']$/g, '');
            if (cleaned === '' || cleaned.toLowerCase() === 'na' || cleaned.toLowerCase() === 'null') {
              return null;
            }
            const num = parseFloat(cleaned);
            if (!isNaN(num) && isFinite(num)) {
              return num;
            }
            return cleaned;
          });
          
          if (values.length === headers.length) {
            sampleData.push(values);
          }
        }
      }
      
      // Infer data types from the sample data
      const inferredDataTypes = inferDataTypesForOriginalData(sampleData, headers);
      console.log('Inferred data types for original data:', inferredDataTypes);

      // 2. Upload the raw data file to Supabase Storage
      const filePath = `${user.id}/${Date.now()}/${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('raw-data')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });
      
      if (uploadError) throw uploadError;
      
      // 3. Create a file record in the Files table
      const { data: fileData, error: fileError } = await supabase
        .from('Files')
        .insert([{
          created_at: new Date().toISOString(),
          modified_at: new Date().toISOString(),
          path: filePath,
          file_name: file.name,
          file_size: file.size // Size in bytes
        }])
        .select('id')
        .single();
      
      if (fileError) throw fileError;
      
      if (!fileData || !fileData.id) {
        throw new Error("Failed to create file record");
      }
      
      // 4. Create the task in the database with the file reference
      const { data: taskData, error: taskError } = await supabase
        .from('Tasks')
        .insert([
          { 
            name: taskName, 
            user_id: user.id,
            status: 'RAW',
            raw_data: fileData.id, // Use the file ID as the reference
          }
        ])
        .select('id')
        .single();
      
      if (taskError) throw taskError;
      
      if (!taskData || !taskData.id) {
        throw new Error("Failed to create task");
      }

      // 5. Get Original Data Method ID
      const { data: methodData, error: methodError } = await supabase
        .from('Methods')
        .select('id')
        .eq('label', 'Original data')
        .single();

      if (methodError || !methodData.id) throw methodError;

      // 6. Create an entry in the TaskMethods table with inferred data types
      const { data: taskMethodData, error: taskMethodError } = await supabase
        .from('TaskMethods')
        .insert([
          {
            name: `Original data`,
            status: 'RAW',
            task_id: taskData.id,
            method_id: methodData.id,
            created_at: new Date().toISOString(),
            processed_file: fileData.id,
            data_types: inferredDataTypes // Store the inferred data types
          }
        ])
        .select('id')
        .single();
      
      if (!taskMethodData || !taskMethodData.id) throw taskMethodError;
      
      // 7. Update the task status to completed
      const { error: updateError } = await supabase
        .from('Tasks')
        .update({ status: 'PROCESSED' })
        .eq('id', taskData.id);
      
      if (updateError) throw updateError;
      
      // Success
      toast({
        title: "Success",
        description: "Task created successfully with inferred data types.",
      });
      
      onOpenChange(false);
      setTaskName("");
      setFile(null);
      onTaskCreated();
      
    } catch (error: any) {
      console.error("Error creating task:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create task. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Task</DialogTitle>
          <DialogDescription>
            Create a new data preprocessing task by uploading your CSV file. Supports both comma (,) and semicolon (;) separated values.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={createTask}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="task-name" className="text-right">
                Task Name
              </Label>
              <Input
                id="task-name"
                value={taskName}
                onChange={(e) => setTaskName(e.target.value)}
                className="col-span-3"
                placeholder="Enter task name"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="file" className="text-right">
                CSV File
              </Label>
              <div className="col-span-3">
                <div className="flex items-center gap-2">
                  <Input
                    id="file"
                    type="file"
                    onChange={handleFileChange}
                    accept=".csv"
                    className="flex-1"
                  />
                </div>
                {file && (
                  <p className="text-sm text-gray-500 mt-1">
                    Selected: {file.name} ({(file.size / 1048576).toFixed(2)} MB)
                  </p>
                )}
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button type="submit" disabled={uploading}>
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Create Task
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
