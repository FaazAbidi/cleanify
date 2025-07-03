import { useState, useEffect } from 'react';
import { ColumnInfo, DatasetType } from '@/types/dataset';
import { ColumnSelector } from './ColumnSelector';
import { ImputationMethodSelector } from './ImputationMethodSelector';
import { useImputationConfig } from '@/hooks/useImputationConfig';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, AlertCircle } from 'lucide-react';

interface MissingDataHandlerProps {
  dataset: DatasetType | null;
  onSubmit: (payload: any) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function MissingDataHandler({
  dataset,
  onSubmit,
  onCancel,
  isLoading = false
}: MissingDataHandlerProps) {
  const [activeTab, setActiveTab] = useState<string>('column-selection');
  const [initialSelectionDone, setInitialSelectionDone] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  
  const {
    selectedColumns,
    setSelectedColumns,
    columnConfigurations,
    updateColumnConfiguration,
    generatePayload
  } = useImputationConfig({ dataset });

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

  // Validate configurations
  const validateConfigurations = () => {
    // Check if there are any columns using impute_constant method without a value
    const invalidConfigs = columnConfigurations.filter(
      config => config.method === 'impute_constant' && (!config.value || config.value.trim() === '')
    );
    
    if (invalidConfigs.length > 0) {
      const columnNames = invalidConfigs.map(config => config.columnName).join(', ');
      setValidationError(`Please provide constant values for the following columns: ${columnNames}`);
      return false;
    }
    
    return true;
  };

  // Handle form submission
  const handleSubmit = () => {
    if (!validateConfigurations()) {
      return;
    }
    
    const payload = generatePayload();
    if (payload) {
      console.log(payload);
      onSubmit(payload);
    }
  };

  // Get columns with missing values
  const getColumnsWithMissingValuesAndSupportedTypes = () => {
    if (!dataset) {
      return [];
    }
    
    
    const columnsWithMissing = dataset.columns
      .filter(column => column.missingValues > 0)
      .map(column => column.name);

    // filter columns that are supported by the method
    const supportedColumns = columnsWithMissing.filter(column => {
      const columnInfo = dataset?.columns.find(col => col.name === column);
      return columnInfo?.type === 'QUANTITATIVE' || columnInfo?.type === 'QUALITATIVE';
    });
    
    return supportedColumns;
  };

  const columnsWithMissingValues = getColumnsWithMissingValuesAndSupportedTypes();
  const hasColumnsWithMissingValues = columnsWithMissingValues.length > 0;
  const hasSelectedColumns = selectedColumns.length > 0;
  const [supportedColumns, setSupportedColumns] = useState<ColumnInfo[]>([]);

  // Pre-select columns with missing values only on initial load
  useEffect(() => {
    if (hasColumnsWithMissingValues && !initialSelectionDone && isLoaded) {
      setSelectedColumns(columnsWithMissingValues);
      setInitialSelectionDone(true);
      setSupportedColumns(dataset.columns.filter(col => columnsWithMissingValues.includes(col.name)));
    }
  }, [hasColumnsWithMissingValues, columnsWithMissingValues, setSelectedColumns, initialSelectionDone, isLoaded]);

  // Helper function to check if column supports imputation
  const supportsImputation = (columnInfo: ColumnInfo | undefined): boolean => {
    return columnInfo?.type === 'QUANTITATIVE' || columnInfo?.type === 'QUALITATIVE';
  };

  if (!isLoaded) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Handling Missing Data</CardTitle>
          <CardDescription>
            Select columns with missing values and choose imputation methods for each. 
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

  return (
    <div className="w-full">

      <Alert className='mb-4 bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800'>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Note that only columns with missing values and supported types will be shown. Supported types are <strong>numeric</strong> and <strong>categorical</strong>.
        </AlertDescription>
      </Alert>
        
        {!hasColumnsWithMissingValues ? (
          <div className="py-4">
            <Alert className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No columns with missing values were found in this dataset.
              </AlertDescription>
            </Alert>
            <div className="flex justify-end mt-4">
              <Button variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsList className="mb-4">
              <TabsTrigger value="column-selection">1. Select Columns</TabsTrigger>
              <TabsTrigger 
                value="method-configuration" 
                disabled={!hasSelectedColumns}
              >
                2. Configure Methods
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="column-selection">
                
                <ColumnSelector
                  columns={supportedColumns || []}
                  selectedColumns={selectedColumns}
                  onColumnSelectionChange={setSelectedColumns}
                  disabledColumns={supportedColumns.filter(col => col.missingValues === 0).map(col => col.name) || []}
                  dataset={dataset}
                />
              
              <div className="flex justify-between mt-6">
                <Button variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
                <Button 
                  onClick={() => handleTabChange('method-configuration')} 
                  disabled={!hasSelectedColumns}
                >
                  Next
                </Button>
              </div>
            </TabsContent>
            
            <TabsContent value="method-configuration">
              {validationError && (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{validationError}</AlertDescription>
                </Alert>
              )}
              
              <ImputationMethodSelector
                dataset={dataset}
                selectedColumns={selectedColumns}
                columnDetails={dataset?.columns || []}
                columnConfigurations={columnConfigurations}
                onConfigChange={updateColumnConfiguration}
              />
              
              <div className="flex justify-between mt-6">
                <Button variant="outline" onClick={() => handleTabChange('column-selection')}>
                  Back
                </Button>
                <Button 
                  onClick={handleSubmit} 
                  disabled={!hasSelectedColumns || isLoading}
                >
                  {isLoading ? 'Processing...' : 'Create a new version'}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        )}
    </div>
  );
} 