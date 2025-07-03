import { Tables } from "@/integrations/supabase/types";

export interface VersionNode {
  version: TaskVersion;
  children: VersionNode[];
}

export interface VersionTree {
  roots: VersionNode[];
} 

// Type for a task version from the TaskMethods table
export interface TaskVersion {
  // Base fields from TaskMethods
  created_at: string;
  id: number;
  method_id: number | null;
  name: string;
  prev_version: number | null;
  processed_file: number | null;
  status: "RUNNING" | "RAW" | "PROCESSED" | "FAILED";
  task_id: number | null;
  data_types: Record<string, 'QUANTITATIVE' | 'QUALITATIVE'> | null;
  
  // Extended fields for UI
  file?: Tables<'Files'> | null;
  data?: any[] | null; // Dataset data for this version
  version_number?: number;
}