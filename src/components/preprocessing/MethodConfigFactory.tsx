import { DatasetType } from '@/types/dataset';
import { MissingDataHandler } from './MissingDataHandler';
import { InconsistencyHandler } from './InconsistencyHandler';
import { OutlierHandler } from './OutlierHandler';
import { SkewnessHandler } from './SkewnessHandler';
import { StandardizationHandler } from './StandardizationHandler';
import { NormalizationHandler } from './NormalizationHandler';
import { SamplingHandler } from './SamplingHandler';
import { OneHotEncodingHandler } from './OneHotEncodingHandler';
import { LabelEncodingHandler } from './LabelEncodingHandler';
import { DropColumnsHandler } from './DropColumnsHandler';
import { DropDuplicatesHandler } from './DropDuplicatesHandler';
import { CombineFeaturesHandler } from './CombineFeaturesHandler';
import { BinningHandler } from './BinningHandler';
import { PCAHandler } from './PCAHandler';
import { Loader2 } from 'lucide-react';
import { Method } from '@/types/methods';

interface MethodConfigFactoryProps {
  method: Method;
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
  const normalizedMethod = method?.toLowerCase?.() as Method;

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
    case 'fix_inconsistencies':
      return (
        <InconsistencyHandler
          dataset={dataset}
          onSubmit={onSubmit}
          onCancel={onCancel}
          isLoading={isLoading}
        />
      );
    case 'fix_outliers':
      return (
        <OutlierHandler
          dataset={dataset}
          onSubmit={onSubmit}
          onCancel={onCancel}
          isLoading={isLoading}
        />
      );
    case 'fix_skewness':
      return (
        <SkewnessHandler
          dataset={dataset}
          onSubmit={onSubmit}
          onCancel={onCancel}
          isLoading={isLoading}
        />
      );
    case 'perform_standarization':
      return (
        <StandardizationHandler
          dataset={dataset}
          onSubmit={onSubmit}
          onCancel={onCancel}
          isLoading={isLoading}
        />
      );
    case 'perform_normalization':
      return (
        <NormalizationHandler
          dataset={dataset}
          onSubmit={onSubmit}
          onCancel={onCancel}
          isLoading={isLoading}
        />
      );
    case 'perform_sampling':
      return (
        <SamplingHandler
          dataset={dataset}
          onSubmit={onSubmit}
          onCancel={onCancel}
          isLoading={isLoading}
        />
      );
    case 'perform_one_hot_encoding':
      return (
        <OneHotEncodingHandler
          dataset={dataset}
          onSubmit={onSubmit}
          onCancel={onCancel}
          isLoading={isLoading}
        />
      );
    case 'perform_label_encoding':
      return (
        <LabelEncodingHandler
          dataset={dataset}
          onSubmit={onSubmit}
          onCancel={onCancel}
          isLoading={isLoading}
        />
      );
    case 'perform_drop_columns':
      return (
        <DropColumnsHandler
          dataset={dataset}
          onSubmit={onSubmit}
          onCancel={onCancel}
          isLoading={isLoading}
        />
      );
    case 'perform_drop_duplicates':
      return (
        <DropDuplicatesHandler
          dataset={dataset}
          onSubmit={onSubmit}
          onCancel={onCancel}
          isLoading={isLoading}
        />
      );
    case 'perform_combine_features':
      return (
        <CombineFeaturesHandler
          dataset={dataset}
          onSubmit={onSubmit}
          onCancel={onCancel}
          isLoading={isLoading}
        />
      );
    case 'perform_binning':
      return (
        <BinningHandler
          dataset={dataset}
          onSubmit={onSubmit}
          onCancel={onCancel}
          isLoading={isLoading}
        />
      );
    case 'perform_pca_reduction':
      return (
        <PCAHandler
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