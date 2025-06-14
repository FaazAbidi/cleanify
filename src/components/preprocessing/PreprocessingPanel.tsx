import { memo } from 'react';
import { TaskVersion } from '@/types/version';
import { PreprocessingForm } from './PreprocessingForm';
import { Tables } from '@/integrations/supabase/types';
import { DatasetType } from '@/types/dataset';

interface PreprocessingPanelProps {
  task: Tables<'Tasks'>;
  versions: TaskVersion[];
  dataset: DatasetType;
  onDatasetUpdate: (dataset: DatasetType) => void;
  progress: number;
  loadingData: boolean;
  selectedVersion?: TaskVersion | null;
  isProcessing?: boolean;
  onVersionCreated?: (newVersionId: number) => void;
}

export const PreprocessingPanel = memo(function PreprocessingPanel({ 
  task,
  dataset,
  versions, 
  onDatasetUpdate,
  progress,
  loadingData,
  selectedVersion,
  isProcessing = false,
  onVersionCreated
}: PreprocessingPanelProps) {
  return (
    <div className="space-y-6">
      <div>
        <PreprocessingForm 
          task={task}
          dataset={dataset}
          versions={versions}
          selectedVersion={selectedVersion}
          progress={progress}
          loadingData={loadingData}
          isProcessing={isProcessing}
          onSuccess={onVersionCreated}
          onDatasetUpdate={onDatasetUpdate}
        />
      </div>
    </div>
  );
}); 