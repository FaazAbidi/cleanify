import { useState, useEffect } from 'react';
import { ColumnInfo, DatasetType } from '@/types/dataset';
import { ColumnSelector } from './ColumnSelector';
import { InconsistencyMethodSelector } from './InconsistencyMethodSelector';
import { useInconsistencyConfig } from '@/hooks/useInconsistencyConfig';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Info } from 'lucide-react';

interface InconsistencyHandlerProps {
  dataset: DatasetType | null;
  onSubmit: (payload: any) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function InconsistencyHandler({
  dataset,
  onSubmit,
  onCancel,
  isLoading = false
}: InconsistencyHandlerProps) {
  const [activeTab, setActiveTab] = useState<string>('column-selection');
  const [initialSelectionDone, setInitialSelectionDone] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [supportedColumns, setSupportedColumns] = useState<ColumnInfo[]>([]);
  
  const {
    selectedColumns,
    setSelectedColumns,
    columnConfigurations,
    updateColumnConfiguration,
    generatePayload
  } = useInconsistencyConfig({ dataset });

  // When dataset changes, set as loaded
  useEffect(() => {
    if (dataset) {
      setIsLoaded(true);
    }
  }, [dataset]);

  // Handle tab change
  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  // Handle form submission
  const handleSubmit = () => {
    const payload = generatePayload();
    if (payload) {
      console.log(payload);
      onSubmit(payload);
    }
  };

  // Get columns with supported types
  const getColumnsWithSupportedTypes = () => {
    if (!dataset) {
      return [];
    }
    
    // Filter for columns that are numeric or categorical
    const supportedColumns = dataset.columns
      .filter(column => column.type === 'numeric' || column.type === 'categorical')
      .map(column => column.name);
    
    return supportedColumns;
  };

  const columnsWithSupportedTypes = getColumnsWithSupportedTypes();
  const hasSupportedColumns = columnsWithSupportedTypes.length > 0;
  const hasSelectedColumns = selectedColumns.length > 0;

  // Pre-select supported columns on initial load
  useEffect(() => {
    if (hasSupportedColumns && !initialSelectionDone && isLoaded) {
      setSelectedColumns(columnsWithSupportedTypes);
      setInitialSelectionDone(true);
      setSupportedColumns(dataset.columns.filter(col => columnsWithSupportedTypes.includes(col.name)));
    }
  }, [hasSupportedColumns, columnsWithSupportedTypes, setSelectedColumns, initialSelectionDone, isLoaded]);

  if (!isLoaded) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Fix Inconsistent Data</CardTitle>
          <CardDescription>
            Select columns with inconsistencies to fix and choose handling methods for each.
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
      <Alert className='mb-4 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800'>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <p>This method identifies and fixes inconsistent values in your data:</p>
          <ul className="list-disc pl-5 mt-2">
            <li><strong>For text/categorical columns:</strong> Removes numeric-like values that don't match the column's type</li>
            <li><strong>For numeric columns:</strong> Removes text values like "N/A", "unknown", etc. that don't match the numeric type</li>
          </ul>
        </AlertDescription>
      </Alert>

      <Alert className='mb-4 bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800'>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Note that only columns with numeric or categorical data types are supported for inconsistency fixing.
        </AlertDescription>
      </Alert>
        
      {!hasSupportedColumns ? (
        <div className="py-4">
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No columns with supported data types were found in this dataset.
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
              disabledColumns={[]} // All supported columns can be selected
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
            <InconsistencyMethodSelector
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