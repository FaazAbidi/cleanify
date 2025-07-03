import { useState, useEffect, useMemo } from 'react';
import { ColumnInfo, DatasetType } from '@/types/dataset';
import { ColumnSelector } from './ColumnSelector';
import { useDropColumnsConfig } from '@/hooks/useDropColumnsConfig';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Info, Trash2 } from 'lucide-react';

interface DropColumnsHandlerProps {
  dataset: DatasetType | null;
  onSubmit: (payload: any) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function DropColumnsHandler({
  dataset,
  onSubmit,
  onCancel,
  isLoading = false
}: DropColumnsHandlerProps) {
  const [activeTab, setActiveTab] = useState<string>('column-selection');
  const [isLoaded, setIsLoaded] = useState(false);
  const [supportedColumns, setSupportedColumns] = useState<ColumnInfo[]>([]);
  
  const {
    selectedColumns,
    setSelectedColumns,
    columnConfigurations,
    generatePayload
  } = useDropColumnsConfig({ dataset });

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

  // Get all available columns (any type can be dropped)
  const availableColumns = useMemo(() => {
    if (!dataset) {
      return [];
    }
    
    // All columns can be dropped
    return dataset.columns.map(column => column.name);
  }, [dataset]);

  const hasAvailableColumns = availableColumns.length > 0;
  const hasSelectedColumns = selectedColumns.length > 0;

  // Calculate remaining columns after drop
  const remainingColumnsCount = useMemo(() => {
    if (!dataset) return 0;
    return dataset.columns.length - selectedColumns.length;
  }, [dataset, selectedColumns]);

  // Set all columns as supported on initial load
  useEffect(() => {
    if (hasAvailableColumns && isLoaded) {
      setSupportedColumns(dataset.columns || []);
    }
  }, [hasAvailableColumns, isLoaded, dataset]);

  if (!isLoaded) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Drop Columns</CardTitle>
          <CardDescription>
            Remove unwanted columns to reduce dataset size and focus on relevant features.
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
          <p>Drop Columns removes unwanted fields from your dataset:</p>
          <ul className="list-disc pl-5 mt-2">
            <li>Selected columns will be permanently removed from the dataset</li>
            <li>This reduces file size and processing time for subsequent operations</li>
            <li>Helps focus your analysis on relevant features only</li>
            <li>Any column type can be dropped (numeric, categorical, datetime, etc.)</li>
          </ul>
        </AlertDescription>
      </Alert>

      <Alert className='mb-4 bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800'>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Your dataset currently has <strong>{dataset?.columns.length || 0}</strong> columns. 
          You can select any columns to remove from the dataset.
        </AlertDescription>
      </Alert>

      {remainingColumnsCount <= 0 && hasSelectedColumns && (
        <Alert variant="destructive" className='mb-4'>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Warning: You have selected all columns for removal. At least one column must remain in the dataset.
          </AlertDescription>
        </Alert>
      )}
        
      {!hasAvailableColumns ? (
        <div className="py-4">
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No columns were found in this dataset.
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
            <TabsTrigger value="column-selection">Select Columns to Drop</TabsTrigger>
            <TabsTrigger 
              value="review" 
              disabled={!hasSelectedColumns}
            >
              Review & Confirm
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="column-selection">
            <ColumnSelector
              columns={supportedColumns || []}
              selectedColumns={selectedColumns}
              onColumnSelectionChange={setSelectedColumns}
              disabledColumns={[]} // All columns can be selected for dropping
              dataset={dataset}
            />
            
            <div className="flex justify-between mt-6">
              <Button variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button 
                onClick={() => handleTabChange('review')} 
                disabled={!hasSelectedColumns || remainingColumnsCount <= 0}
              >
                Next
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="review">
            <Card>
              <CardHeader>
                <CardTitle>Review Columns to Drop</CardTitle>
                <CardDescription>
                  The following {selectedColumns.length} columns will be permanently removed from your dataset
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedColumns.map(columnName => {
                      const columnInfo = dataset.columns.find(col => col.name === columnName);
                      return (
                        <div key={columnName} className="p-4 bg-muted rounded-md">
                          <div className="font-medium mb-2 flex items-center gap-2">
                            <Trash2 className="h-4 w-4 text-red-500" />
                            {columnName}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            <div className="mb-1">Type: {columnInfo?.type || 'unknown'}</div>
                            <div className="mb-1">Missing: {columnInfo?.missingValues || 0} values</div>
                            {columnInfo?.type === 'QUALITATIVE' && (
                              <div>Unique values: {columnInfo.uniqueValues}</div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <Alert className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      <div className="font-medium mb-2">Dataset Change Summary:</div>
                      <ul className="text-sm space-y-1">
                        <li>• {selectedColumns.length} columns will be removed</li>
                        <li>• {remainingColumnsCount} columns will remain</li>
                        <li>• Dataset size will be reduced by {((selectedColumns.length / (dataset?.columns.length || 1)) * 100).toFixed(1)}%</li>
                        <li>• All rows will be preserved</li>
                      </ul>
                    </AlertDescription>
                  </Alert>

                  <div className="mt-6 p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-md">
                    <h4 className="font-medium mb-2 text-red-800 dark:text-red-300">⚠️ Important Warnings:</h4>
                    <ul className="list-disc pl-6 text-sm space-y-1 text-red-700 dark:text-red-200">
                      <li>Dropped columns cannot be recovered once this operation is complete</li>
                      <li>Make sure you don't need these columns for your analysis</li>
                      <li>Consider the impact on downstream analysis and modeling</li>
                      <li>You can always return to previous dataset versions if needed</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <div className="flex justify-between mt-6">
              <Button variant="outline" onClick={() => handleTabChange('column-selection')}>
                Back
              </Button>
              <Button 
                onClick={handleSubmit} 
                disabled={!hasSelectedColumns || isLoading || remainingColumnsCount <= 0}
                variant="destructive"
              >
                {isLoading ? 'Processing...' : 'Drop Columns & Create New Version'}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
} 