import { memo, useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Loader2, Play, CheckCircle, AlertCircle, Info, ChevronDown, ChevronUp, Settings } from 'lucide-react';
import { Tables } from '@/integrations/supabase/types';
import { DatasetType } from '@/types/dataset';
import { TaskVersion } from '@/types/version';
import { PreAnalysisModel, PreAnalysisResult, PreAnalysisColumnConfig } from '@/types/methods';
import { usePreAnalysisConfig } from '@/hooks/usePreAnalysisConfig';
import { usePreAnalysisPipeline } from '@/hooks/usePreAnalysisPipeline';
import { PreAnalysisResults } from './pre-analysis/PreAnalysisResults';
import { toast } from '@/components/ui/sonner';

interface PreAnalysisProps {
  task: Tables<'Tasks'> | null;
  dataset: DatasetType | null;
  selectedVersion: TaskVersion | null;
  isUnprocessedVersion: boolean;
}

const modelOptions: PreAnalysisModel[] = [
  'Linear Regression',
  'Logistic Regression',
  'Decision Trees',
  'Support Vector Machines',
  'K-Nearest Neighbors',
  'Random Forests',
  'Gradient Boosting',
  'Neural Networks',
  'Linear Discriminant Analysis'
];

export const PreAnalysis = memo(function PreAnalysis({
  task,
  dataset,
  selectedVersion,
  isUnprocessedVersion
}: PreAnalysisProps) {
  const [analysisResult, setAnalysisResult] = useState<PreAnalysisResult | null>(null);
  const [useSelectedColumns, setUseSelectedColumns] = useState(false);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [taskMethodId, setTaskMethodId] = useState<number | null>(null);
  const [isConfigCollapsed, setIsConfigCollapsed] = useState(false);

  const {
    config,
    setModel,
    setTarget,
    setThresholds,
    setColumns,
    getFullConfig,
    resetConfig,
    isConfigValid
  } = usePreAnalysisConfig(dataset);

  const {
    isSubmitting,
    isPolling,
    submitPreAnalysis,
    pollPreAnalysisResult,
    startPolling,
    stopPolling,
    getOrCreatePreAnalysisTaskMethod
  } = usePreAnalysisPipeline();

  // Reset state and check for existing pre-analysis result when version changes
  useEffect(() => {
    let isMounted = true; // Prevent state updates on unmounted component
    
    const handleVersionChange = async () => {
      // First, clear all version-specific state when switching versions
      if (isMounted) {
        setAnalysisResult(null);
        setTaskMethodId(null);
        setUseSelectedColumns(false);
        setSelectedColumns([]);
        stopPolling(); // Stop any ongoing polling
        resetConfig(); // Reset configuration to defaults
      }
      
      // Then check for existing results for the new version
      if (selectedVersion?.id && isMounted) {
        const { taskMethodId: tmId, result } = await getOrCreatePreAnalysisTaskMethod(selectedVersion.id);
        if (isMounted) {
          if (tmId) {
            setTaskMethodId(tmId);
          }
          if (result) {
            setAnalysisResult(result);
            setIsConfigCollapsed(true); // Collapse form if results exist
          } else {
            setIsConfigCollapsed(false); // Expand form if no results
          }
        }
      } else if (isMounted) {
        // Clear state when no version is selected
        setIsConfigCollapsed(false);
      }
    };

    handleVersionChange();
    
    return () => {
      isMounted = false;
    };
  }, [selectedVersion?.id]); // Simplified dependencies to prevent excessive calls

  // Handle column selection changes
  useEffect(() => {
    if (useSelectedColumns && selectedColumns.length > 0 && dataset) {
      const columnConfigs: Record<string, PreAnalysisColumnConfig> = {};
      
      selectedColumns.forEach(columnName => {
        const column = dataset.columns.find(col => col.name === columnName);
        if (column) {
          columnConfigs[columnName] = {
            type: column.type,
            step: null,
            value: null
          };
        }
      });
      
      setColumns(columnConfigs);
    } else {
      setColumns(null);
    }
  }, [useSelectedColumns, selectedColumns, dataset, setColumns]);

  const handleSubmit = async () => {
    if (!task || !isConfigValid || !selectedVersion?.id) {
      toast.error('Invalid configuration', {
        description: 'Please ensure all required fields are filled and a version is selected.'
      });
      return;
    }

    const fullConfig = getFullConfig(selectedVersion.id.toString());
    const result = await submitPreAnalysis(fullConfig, selectedVersion.id);

    if (result.success && result.taskMethodId) {
      setTaskMethodId(result.taskMethodId);
      // Start polling for results
      startPolling(result.taskMethodId, (result) => {
        setAnalysisResult(result);
        setIsConfigCollapsed(true); // Collapse form when new results arrive
      });
    }
  };

  const handleReset = () => {
    resetConfig();
    setUseSelectedColumns(false);
    setSelectedColumns([]);
    setAnalysisResult(null);
    setTaskMethodId(null);
    stopPolling();
    setIsConfigCollapsed(false); // Ensure form is expanded after reset
  };

  const availableColumns = dataset?.columns?.map(col => col.name) || [];
  // Ensure unique columns to prevent React key conflicts
  const uniqueAvailableColumns = [...new Set(availableColumns)];
  const targetColumns = useSelectedColumns ? [...new Set(selectedColumns)] : uniqueAvailableColumns;

  if (!task) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground">Select a task to access pre-analysis options.</p>
        </CardContent>
      </Card>
    );
  }

  if (isUnprocessedVersion) {
    return (
      <Alert variant="default" className="mb-6">
        <Info className="h-5 w-5" />
        <AlertTitle className="font-medium">Processing Required</AlertTitle>
        <AlertDescription>
          This version hasn't been processed yet. Pre-analysis is only available for processed versions.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Configuration Card */}
      <Card>
        <Collapsible open={!isConfigCollapsed} onOpenChange={(open) => setIsConfigCollapsed(!open)}>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                {analysisResult 
                  ? 'Start Another Pre-Analysis' 
                  : 'Pre-Analysis Configuration'
                }
                {isConfigCollapsed ? <ChevronDown className="h-4 w-4 ml-auto" /> : <ChevronUp className="h-4 w-4 ml-auto" />}
              </CardTitle>
              <CardDescription>
                {analysisResult 
                  ? 'Run a new pre-analysis with different settings or target variables.'
                  : 'Configure and run pre-analysis to identify data preprocessing recommendations.'
                }
              </CardDescription>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-6 pt-0">
          {/* Model Selection */}
          <div className="space-y-2">
            <Label htmlFor="model">Machine Learning Model</Label>
            <Select value={config.model} onValueChange={(value) => setModel(value as PreAnalysisModel)}>
              <SelectTrigger>
                <SelectValue placeholder="Select a model" />
              </SelectTrigger>
              <SelectContent>
                {modelOptions.map((model, index) => (
                  <SelectItem key={`model-${index}-${model}`} value={model}>
                    {model}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Column Selection Toggle */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="use-selected-columns"
              checked={useSelectedColumns}
              onCheckedChange={(checked) => setUseSelectedColumns(!!checked)}
            />
            <Label htmlFor="use-selected-columns">
              Use specific columns (default: all columns)
            </Label>
          </div>

          {/* Column Selection */}
          {useSelectedColumns && (
            <div className="space-y-2">
              <Label>Select Columns</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto border rounded-md p-3">
                {uniqueAvailableColumns.map((column, index) => (
                  <div key={`column-${index}-${column}`} className="flex items-center space-x-2">
                    <Checkbox
                      id={`column-${column}`}
                      checked={selectedColumns.includes(column)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedColumns(prev => [...prev, column]);
                        } else {
                          setSelectedColumns(prev => prev.filter(col => col !== column));
                        }
                      }}
                    />
                    <Label htmlFor={`column-${column}`} className="text-sm">
                      {column}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Target Selection */}
          <div className="space-y-2">
            <Label htmlFor="target">Target Column (Optional)</Label>
            <Select 
              value={config.target || 'none'} 
              onValueChange={(value) => setTarget(value === 'none' ? null : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select target column (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem key="none-target" value="none">No target</SelectItem>
                {targetColumns.map((column, index) => (
                  <SelectItem key={`target-${index}-${column}`} value={column}>
                    {column}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Threshold Configuration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="categorical-threshold">Categorical Threshold</Label>
              <Input
                id="categorical-threshold"
                type="number"
                step="0.1"
                min="0"
                max="1"
                value={config.threshold_check_categorical}
                onChange={(e) => setThresholds({ threshold_check_categorical: parseFloat(e.target.value) || 0.3 })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="skewness-threshold">Skewness Threshold</Label>
              <Input
                id="skewness-threshold"
                type="number"
                step="0.1"
                value={config.threshold_check_skewness}
                onChange={(e) => setThresholds({ threshold_check_skewness: parseFloat(e.target.value) || 1 })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sampling-threshold">Sampling Threshold</Label>
              <Input
                id="sampling-threshold"
                type="number"
                min="1"
                value={config.threshold_sampling}
                onChange={(e) => setThresholds({ threshold_sampling: parseInt(e.target.value) || 100 })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dimensionality-threshold">Dimensionality Threshold</Label>
              <Input
                id="dimensionality-threshold"
                type="number"
                step="0.1"
                min="0"
                max="1"
                value={config.threshold_check_dimensionality}
                onChange={(e) => setThresholds({ threshold_check_dimensionality: parseFloat(e.target.value) || 0.5 })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="multicollinearity-threshold">Multicollinearity Threshold</Label>
              <Input
                id="multicollinearity-threshold"
                type="number"
                step="0.1"
                min="0"
                max="1"
                value={config.threshold_check_multicollinearity}
                onChange={(e) => setThresholds({ threshold_check_multicollinearity: parseFloat(e.target.value) || 0.8 })}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              onClick={handleSubmit}
              disabled={!isConfigValid || isSubmitting || isPolling}
              className="flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : isPolling ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Start Pre-Analysis
                </>
              )}
            </Button>
            <Button variant="outline" onClick={handleReset}>
              Reset
            </Button>
          </div>

          {/* Status Indicator */}
          {(isSubmitting || isPolling) && (
            <Alert>
              <Loader2 className="h-4 w-4 animate-spin" />
              <AlertTitle>
                {isSubmitting ? 'Submitting Analysis' : 'Running Analysis'}
              </AlertTitle>
              <AlertDescription>
                {isSubmitting 
                  ? 'Submitting your pre-analysis configuration to the backend...'
                  : 'Your pre-analysis is running. This may take a few minutes...'
                }
              </AlertDescription>
            </Alert>
          )}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Results */}
      {analysisResult && (
        <PreAnalysisResults result={analysisResult} />
      )}
    </div>
  );
}); 