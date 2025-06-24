import { supabase } from "@/integrations/supabase/client";
import { TaskVersion } from "@/types/version";

export const downloadVersionFile = async (
  version: TaskVersion,
  onProgress?: (progress: number) => void
): Promise<void> => {
  if (!version.file) {
    throw new Error("No file found for this version");
  }

  const { file } = version;
  
  // Determine bucket based on version type
  const bucket = version.prev_version === null ? 'raw-data' : 'processed-data';
  
  try {
    onProgress?.(10);
    
    // Download the file from Supabase storage
    const { data: fileData, error } = await supabase.storage
      .from(bucket)
      .download(file.path);
    
    if (error) {
      throw error;
    }
    
    onProgress?.(50);
    
    // Create blob URL and trigger download
    const blob = new Blob([fileData], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    
    onProgress?.(80);
    
    // Create download link
    const link = document.createElement('a');
    link.href = url;
    link.download = file.file_name || `${version.name}.csv`;
    link.style.display = 'none';
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up
    URL.revokeObjectURL(url);
    
    onProgress?.(100);
  } catch (error) {
    console.error('Download failed:', error);
    throw error;
  }
}; 