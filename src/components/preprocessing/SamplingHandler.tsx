import { useState, useEffect, useCallback, useMemo } from 'react';
import { DatasetType } from '@/types/dataset';
import { useSamplingConfig } from '@/hooks/useSamplingConfig';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, Info, Database } from 'lucide-react';

interface SamplingHandlerProps {
  dataset: DatasetType | null;
  onSubmit: (payload: any) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function SamplingHandler({
  dataset,
  onSubmit,
  onCancel,
  isLoading = false
}: SamplingHandlerProps) {
  const [activeTab, setActiveTab] = useState<string>('configuration');
  const [isLoaded, setIsLoaded] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  
  const {
    samplingConfig,
    updateSamplingConfig,
    generatePayload
  } = useSamplingConfig({ dataset });

  // When dataset changes, set as loaded
  useEffect(() => {
    if (dataset) {
      setIsLoaded(true);
    }
  }, [dataset]);

  // Handle tab change
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setValidationError(null);
  };

  // Validate sampling configuration
  const validateConfiguration = useCallback(() => {
    if (samplingConfig.value <= 0) {
      setValidationError('Sample size must be greater than 0');
      return false;
    }

    if (samplingConfig.unit === 'percentage' && samplingConfig.value > 100) {
      setValidationError('Percentage cannot exceed 100%');
      return false;
    }

    if (samplingConfig.unit === 'count' && dataset && samplingConfig.value >= dataset.rows) {
      setValidationError('Sample count cannot exceed the total number of rows');
      return false;
    }

    setValidationError(null);
    return true;
  }, [samplingConfig.value, samplingConfig.unit, dataset?.rows]);

  // Memoize validation result to prevent unnecessary re-renders
  const isValid = useMemo(() => {
    if (samplingConfig.value <= 0) return false;
    if (samplingConfig.unit === 'percentage' && samplingConfig.value > 100) return false;
    if (samplingConfig.unit === 'count' && dataset && samplingConfig.value >= dataset.rows) return false;
    return true;
  }, [samplingConfig.value, samplingConfig.unit, dataset?.rows]);

  // Handle form submission
  const handleSubmit = () => {
    if (!validateConfiguration()) {
      return;
    }
    
    const payload = generatePayload();
    if (payload) {
      console.log(payload);
      onSubmit(payload);
    }
  };

  // Calculate effective sample size for display
  const effectiveSampleSize = useMemo(() => {
    if (!dataset) return 0;
    
    if (samplingConfig.unit === 'percentage') {
      return Math.round((dataset.rows * samplingConfig.value) / 100);
    }
    return samplingConfig.value;
  }, [dataset?.rows, samplingConfig.value, samplingConfig.unit]);

  if (!isLoaded) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Sample Data</CardTitle>
          <CardDescription>
            Reduce dataset size by selecting a representative sample of rows.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="py-8 text-center">
            <p>Loading dataset information...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!dataset || dataset.rows <= 100) {
    return (
      <div className="w-full">
        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {!dataset 
              ? "No dataset found." 
              : "Sampling is typically used for datasets with more than 100 rows. Your dataset has only " + dataset.rows + " rows."
            }
          </AlertDescription>
        </Alert>
        <div className="flex justify-end mt-4">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <Alert className='mb-4 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800'>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <p>Random sampling reduces your dataset size while preserving its main characteristics:</p>
          <ul className="list-disc pl-5 mt-2">
            <li>Each row has an equal chance of being selected</li>
            <li>The sample maintains the statistical properties of the original dataset</li>
            <li>This helps speed up processing without losing data quality</li>
          </ul>
        </AlertDescription>
      </Alert>

      <Alert className='mb-4 bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800'>
        <Database className="h-4 w-4" />
        <AlertDescription>
          Your dataset currently has <strong>{dataset.rows.toLocaleString()}</strong> rows.
          Sampling can help speed up processing while maintaining data quality.
        </AlertDescription>
      </Alert>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="mb-4">
          <TabsTrigger value="configuration">Configure Sampling</TabsTrigger>
          <TabsTrigger value="review">Review & Confirm</TabsTrigger>
        </TabsList>
        
        <TabsContent value="configuration">
          {validationError && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{validationError}</AlertDescription>
            </Alert>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Sampling Configuration</CardTitle>
              <CardDescription>
                Choose how to sample your data and specify the sample size.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Sample Size Configuration */}
              <div className="space-y-3">
                <Label className="text-base font-medium">Sample Size</Label>
                <div className="flex space-x-4">
                  <div className="flex-1">
                    <Label htmlFor="sample-value" className="text-sm">Value</Label>
                    <Input
                      id="sample-value"
                      type="number"
                      min="1"
                      max={samplingConfig.unit === 'percentage' ? 100 : dataset.rows - 1}
                      value={samplingConfig.value}
                      onChange={(e) => updateSamplingConfig({ value: parseInt(e.target.value) || 0 })}
                      className="mt-1"
                    />
                  </div>
                  <div className="w-32">
                    <Label htmlFor="sample-unit" className="text-sm">Unit</Label>
                    <Select
                      value={samplingConfig.unit}
                      onValueChange={(value: 'percentage' | 'count') => 
                        updateSamplingConfig({ unit: value })
                      }
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">Percentage</SelectItem>
                        <SelectItem value="count">Row Count</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  This will result in approximately <strong>{effectiveSampleSize.toLocaleString()}</strong> rows
                  ({((effectiveSampleSize / dataset.rows) * 100).toFixed(1)}% of original data)
                </p>
              </div>
            </CardContent>
          </Card>
          
          <div className="flex justify-between mt-6">
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button 
              onClick={() => handleTabChange('review')}
              disabled={!isValid}
            >
              Next
            </Button>
          </div>
        </TabsContent>
        
        <TabsContent value="review">
          <Card>
            <CardHeader>
              <CardTitle>Review Sampling Configuration</CardTitle>
              <CardDescription>
                Confirm your sampling settings before creating a new dataset version.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-muted rounded-md">
                    <div className="font-medium">Original Dataset</div>
                    <div className="text-2xl font-bold">{dataset.rows.toLocaleString()}</div>
                    <div className="text-sm text-muted-foreground">rows</div>
                  </div>
                  <div className="p-4 bg-muted rounded-md">
                    <div className="font-medium">Sample Size</div>
                    <div className="text-2xl font-bold">{effectiveSampleSize.toLocaleString()}</div>
                    <div className="text-sm text-muted-foreground">
                      rows ({((effectiveSampleSize / dataset.rows) * 100).toFixed(1)}%)
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-md">
                  <div className="font-medium mb-2">Sampling Method</div>
                  <div>Random Sampling</div>
                </div>

                <div className="p-4 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
                  <h4 className="font-medium mb-2">Important Notes:</h4>
                  <ul className="list-disc pl-6 text-sm space-y-1">
                    <li>Sampling will create a new dataset version with fewer rows</li>
                    <li>The sample should maintain the statistical properties of the original data</li>
                    <li>This operation cannot be undone, but you can always return to previous versions</li>
                    <li>Processing time for future operations will be significantly reduced</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <div className="flex justify-between mt-6">
            <Button variant="outline" onClick={() => handleTabChange('configuration')}>
              Back
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={isLoading}
            >
              {isLoading ? 'Processing...' : 'Create a new version'}
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
} 