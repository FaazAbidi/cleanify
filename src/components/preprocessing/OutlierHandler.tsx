import { useState, useEffect } from 'react';
import { ColumnInfo, DatasetType } from '@/types/dataset';
import { ColumnSelector } from './ColumnSelector';
import { OutlierMethodSelector } from './OutlierMethodSelector';
import { useOutlierConfig } from '@/hooks/useOutlierConfig';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Info } from 'lucide-react';

interface OutlierHandlerProps {
  dataset: DatasetType | null;
  onSubmit: (payload: any) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function OutlierHandler({
  dataset,
  onSubmit,
  onCancel,
  isLoading = false
}: OutlierHandlerProps) {
  const [activeTab, setActiveTab] = useState<string>('column-selection');
  const [initialSelectionDone, setInitialSelectionDone] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [supportedColumns, setSupportedColumns] = useState<ColumnInfo[]>([]);
  
  const {
    selectedColumns,
    setSelectedColumns,
    columnConfigurations,
    updateColumnConfiguration,
    generatePayload,
    getOutlierIndicesForColumn
  } = useOutlierConfig({ dataset });

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

  // Get columns with supported types (numeric only)
  const getColumnsWithSupportedTypes = () => {
    if (!dataset) {
      return [];
    }
    
    // Outliers only apply to numeric columns
    const supportedColumns = dataset.columns
      .filter(column => column.type === 'QUANTITATIVE')
      .map(column => column.name);
    
    return supportedColumns;
  };

  const columnsWithSupportedTypes = getColumnsWithSupportedTypes();
  const hasSupportedColumns = columnsWithSupportedTypes.length > 0;
  const hasSelectedColumns = selectedColumns.length > 0;

  // Pre-select numeric columns on initial load
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
          <CardTitle>Fix Outliers</CardTitle>
          <CardDescription>
            Select numeric columns and choose outlier handling methods for each.
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
          <p>This method identifies and fixes outliers in your numeric data:</p>
          <ul className="list-disc pl-5 mt-2">
            <li>Outliers are values that deviate significantly from the normal range</li>
            <li>Detection uses standard statistical methods (IQR method or Z-score)</li>
            <li>You can choose how to handle outliers for each column</li>
          </ul>
        </AlertDescription>
      </Alert>

      <Alert className='mb-4 bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800'>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Note that only columns with numeric data types are supported for outlier detection and handling.
        </AlertDescription>
      </Alert>
        
      {!hasSupportedColumns ? (
        <div className="py-4">
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No numeric columns were found in this dataset. Outlier detection requires numeric data.
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
              disabledColumns={[]} // All numeric columns can be selected
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
            <OutlierMethodSelector
              dataset={dataset}
              selectedColumns={selectedColumns}
              columnDetails={dataset?.columns || []}
              columnConfigurations={columnConfigurations}
              onConfigChange={updateColumnConfiguration}
              getOutlierIndicesForColumn={getOutlierIndicesForColumn}
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