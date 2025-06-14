export interface Task {
  id: string;
  name: string;
  description?: string;
  status: 'RAW' | 'PROCESSED' | 'FAILED' | 'RUNNING';
  created_at: string;
  updated_at: string;
  user_id: string;
  dataset_size?: number;
  dataset_id?: string;
}

export interface TaskData {
  id: string;
  task_id: string;
  data: any;
} 