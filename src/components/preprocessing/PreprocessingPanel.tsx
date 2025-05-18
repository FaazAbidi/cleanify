import { useState, memo } from 'react';
import { PreprocessingForm } from '@/components/preprocessing/PreprocessingForm';
import { TaskVersion } from '@/types/version';

interface PreprocessingPanelProps {
  taskId: number;
  versions: TaskVersion[];
  selectedVersion?: TaskVersion | null;
  onVersionCreated?: () => void;
}

export const PreprocessingPanel = memo(function PreprocessingPanel({ 
  taskId, 
  versions, 
  selectedVersion,
  onVersionCreated 
}: PreprocessingPanelProps) {
  return (
    <div className="space-y-6">
      <div>
        
        <PreprocessingForm 
          taskId={taskId} 
          versions={versions} 
          selectedVersion={selectedVersion}
          onSuccess={onVersionCreated} 
        />
      </div>
    </div>
  );
}); 