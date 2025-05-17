import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Upload } from "lucide-react";

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
      setFile(e.target.files[0]);
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
      // 1. Upload the raw data file to Supabase Storage
      const filePath = `${user.id}/${Date.now()}/${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('raw-data')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });
      
      if (uploadError) throw uploadError;
      
      // 2. Create a file record in the Files table
      const { data: fileData, error: fileError } = await supabase
        .from('Files')
        .insert([{
          created_at: new Date().toISOString(),
          modified_at: new Date().toISOString(),
          path: filePath,
          file_name: file.name,
          file_size: parseFloat((file.size / 1048576).toFixed(2)) // Size in MB
        }])
        .select('id')
        .single();
      
      if (fileError) throw fileError;
      
      if (!fileData || !fileData.id) {
        throw new Error("Failed to create file record");
      }
      
      // 3. Create the task in the database with the file reference
      const { data: taskData, error: taskError } = await supabase
        .from('Tasks')
        .insert([
          { 
            name: taskName, 
            user_id: user.id,
            status: 'RAW',
            raw_data: fileData.id // Use the file ID as the reference
          }
        ])
        .select('id')
        .single();
      
      if (taskError) throw taskError;
      
      if (!taskData || !taskData.id) {
        throw new Error("Failed to create task");
      }
      
      // 4. Update the task status to completed
      const { error: updateError } = await supabase
        .from('Tasks')
        .update({ status: 'PROCESSED' })
        .eq('id', taskData.id);
      
      if (updateError) throw updateError;
      
      // Success
      toast({
        title: "Success",
        description: "Task created successfully.",
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
            Create a new data preprocessing task by uploading your CSV file.
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
