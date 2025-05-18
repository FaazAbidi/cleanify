import { Tables } from "@/integrations/supabase/types";

export interface VersionNode {
  version: TaskVersion;
  children: VersionNode[];
}

export interface VersionTree {
  roots: VersionNode[];
} 

// Type for a task version from the TaskMethods table
export interface TaskVersion extends Tables<'TaskMethods'> {
  file?: Tables<'Files'> | null;
}