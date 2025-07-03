import { useState, useEffect, useMemo } from 'react';
import { ColumnInfo, DatasetType } from '@/types/dataset';
import { ColumnSelector } from './ColumnSelector';
import { useOneHotEncodingConfig } from '@/hooks/useOneHotEncodingConfig';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Info, Binary } from 'lucide-react';

interface OneHotEncodingHandlerProps {
  dataset: DatasetType | null;
  onSubmit: (payload: any) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function OneHotEncodingHandler({
  dataset,
  onSubmit,
  onCancel,
  isLoading = false
}: OneHotEncodingHandlerProps) {
  const [activeTab, setActiveTab] = useState<string>('column-selection');
  const [initialSelectionDone, setInitialSelectionDone] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [supportedColumns, setSupportedColumns] = useState<ColumnInfo[]>([]);
  
  const {
    selectedColumns,
    setSelectedColumns,
    columnConfigurations,
    generatePayload
  } = useOneHotEncodingConfig({ dataset });

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

  // Get columns with supported types for one-hot encoding (only categorical)
  const columnsWithSupportedTypes = useMemo(() => {
    if (!dataset) {
      return [];
    }
    
    // Filter for columns that are categorical
    return dataset.columns
      .filter(column => column.type === 'QUALITATIVE')
      .map(column => column.name);
  }, [dataset]);

  const hasSupportedColumns = columnsWithSupportedTypes.length > 0;
  const hasSelectedColumns = selectedColumns.length > 0;

  // Calculate total new columns that will be created
  const totalNewColumns = useMemo(() => {
    if (!dataset) return 0;
    
    return selectedColumns.reduce((total, columnName) => {
      const column = dataset.columns.find(col => col.name === columnName);
      return total + (column?.uniqueValues || 0);
    }, 0);
  }, [selectedColumns, dataset]);

  // Pre-select all categorical columns on initial load
  useEffect(() => {
    if (hasSupportedColumns && !initialSelectionDone && isLoaded) {
      setSelectedColumns(columnsWithSupportedTypes);
      setInitialSelectionDone(true);
      setSupportedColumns(dataset.columns.filter(col => columnsWithSupportedTypes.includes(col.name)));
    }
  }, [hasSupportedColumns, columnsWithSupportedTypes, setSelectedColumns, initialSelectionDone, isLoaded, dataset]);

  if (!isLoaded) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>One-Hot Encoding</CardTitle>
          <CardDescription>
            Convert categorical columns into binary columns for machine learning algorithms.
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
          <p>One-Hot Encoding transforms categorical data into a binary format:</p>
          <ul className="list-disc pl-5 mt-2">
            <li>Each unique value in a categorical column becomes a new binary column</li>
            <li>Binary columns contain 1 if the row matches that value, 0 otherwise</li>
            <li>Original categorical columns are removed after encoding</li>
            <li>This is essential for most machine learning algorithms that require numeric input</li>
          </ul>
        </AlertDescription>
      </Alert>

      <Alert className='mb-4 bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800'>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Note that only categorical columns can be one-hot encoded. We found {columnsWithSupportedTypes.length} categorical columns in your dataset.
        </AlertDescription>
      </Alert>
        
      {!hasSupportedColumns ? (
        <div className="py-4">
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No categorical columns were found in this dataset. One-hot encoding requires categorical data.
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
            <TabsTrigger value="column-selection">Select Columns</TabsTrigger>
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
              disabledColumns={[]} // All categorical columns can be selected
              dataset={dataset}
            />
            
            <div className="flex justify-between mt-6">
              <Button variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button 
                onClick={() => handleTabChange('review')} 
                disabled={!hasSelectedColumns}
              >
                Next
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="review">
            <Card>
              <CardHeader>
                <CardTitle>Review Columns for One-Hot Encoding</CardTitle>
                <CardDescription>
                  The following {selectedColumns.length} categorical columns will be converted to binary columns
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedColumns.map(columnName => {
                      const columnInfo = dataset.columns.find(col => col.name === columnName);
                      return (
                        <div key={columnName} className="p-4 bg-muted rounded-md">
                          <div className="font-medium mb-2">{columnName}</div>
                          <div className="text-sm text-muted-foreground">
                            <div className="flex items-center gap-2 mb-1">
                              <Binary className="h-3 w-3" />
                              {columnInfo?.uniqueValues || 0} unique values
                            </div>
                            <div>Will create {columnInfo?.uniqueValues || 0} new binary columns</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <Alert className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      <div className="font-medium mb-2">Encoding Summary:</div>
                      <ul className="text-sm space-y-1">
                        <li>• {selectedColumns.length} original categorical columns will be removed</li>
                        <li>• {totalNewColumns} new binary columns will be created</li>
                        <li>• Net change: {totalNewColumns - selectedColumns.length > 0 ? '+' : ''}{totalNewColumns - selectedColumns.length} columns</li>
                      </ul>
                    </AlertDescription>
                  </Alert>

                  <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
                    <h4 className="font-medium mb-2">Important Notes:</h4>
                    <ul className="list-disc pl-6 text-sm space-y-1">
                      <li>This process significantly increases the number of columns in your dataset</li>
                      <li>High-cardinality categorical columns (many unique values) will create many new columns</li>
                      <li>Consider the impact on dataset size and processing time</li>
                      <li>Original categorical columns cannot be recovered after encoding</li>
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