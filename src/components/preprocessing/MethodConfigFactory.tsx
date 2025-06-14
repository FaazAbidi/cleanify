import { DatasetType } from '@/types/dataset';
import { MissingDataHandler } from './MissingDataHandler';
import { Loader2 } from 'lucide-react';

export type PreprocessingMethod = 'fix_missing' | 'normalize' | 'remove_outliers' | 'encode_categorical';

interface MethodConfigFactoryProps {
  method: PreprocessingMethod;
  dataset: DatasetType | null;
  onSubmit: (payload: any) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function MethodConfigFactory({
  method,
  dataset,
  onSubmit,
  onCancel,
  isLoading = false
}: MethodConfigFactoryProps) {
  // If dataset is not loaded yet, show loading message
  if (!dataset) {
    return (
      <div className="p-4 flex flex-col items-center justify-center">
        <Loader2 className="h-4 w-4 animate-spin" />
        <p className="text-center">Loading dataset information...</p>
      </div>
    );
  }
  
  // Normalize method name if needed
  const normalizedMethod = method?.toLowerCase?.() as PreprocessingMethod;

  const handleCancel = () => {
    onCancel();
  };

  // Render the appropriate configuration component based on the selected method
  switch (normalizedMethod) {
    case 'fix_missing':
      return (
        <MissingDataHandler
          dataset={dataset}
          onSubmit={onSubmit}
          onCancel={onCancel}
          isLoading={isLoading}
        />
      );
    // Add more methods here as they are implemented
    default:
      return (
        <div className="p-4 border rounded-md bg-muted">
          <h3 className="font-medium mb-2">Method Configuration</h3>
          <p className="text-muted-foreground mb-4">
            Configuration for method "{method}" is not implemented yet.
          </p>
          <div className="flex justify-end">
            <button 
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
              onClick={onCancel}
            >
              Cancel
            </button>
          </div>
        </div>
      );
  }
} 