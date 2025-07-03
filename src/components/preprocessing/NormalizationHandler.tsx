import { useState, useEffect } from 'react';
import { ColumnInfo, DatasetType } from '@/types/dataset';
import { ColumnSelector } from './ColumnSelector';
import { useNormalizationConfig } from '@/hooks/useNormalizationConfig';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Info } from 'lucide-react';

interface NormalizationHandlerProps {
  dataset: DatasetType | null;
  onSubmit: (payload: any) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function NormalizationHandler({
  dataset,
  onSubmit,
  onCancel,
  isLoading = false
}: NormalizationHandlerProps) {
  const [activeTab, setActiveTab] = useState<string>('column-selection');
  const [initialSelectionDone, setInitialSelectionDone] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [supportedColumns, setSupportedColumns] = useState<ColumnInfo[]>([]);
  
  const {
    selectedColumns,
    setSelectedColumns,
    columnConfigurations,
    generatePayload
  } = useNormalizationConfig({ dataset });

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

  // Get columns with supported types for normalization (only numeric)
  const getColumnsWithSupportedTypes = () => {
    if (!dataset) {
      return [];
    }
    
    // Filter for columns that are numeric
    const supportedColumns = dataset.columns
      .filter(column => column.type === 'QUANTITATIVE')
      .map(column => column.name);
    
    return supportedColumns;
  };

  const columnsWithSupportedTypes = getColumnsWithSupportedTypes();
  const hasSupportedColumns = columnsWithSupportedTypes.length > 0;
  const hasSelectedColumns = selectedColumns.length > 0;

  // Pre-select all numeric columns on initial load
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
          <CardTitle>Normalize Data</CardTitle>
          <CardDescription>
            Scale numeric columns to a range between 0 and 1
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
          <p>Normalization scales your numeric data to a range between 0 and 1:</p>
          <ul className="list-disc pl-5 mt-2">
            <li>Each value is converted using the formula: (x - min) / (max - min)</li>
            <li>Minimum values become 0, maximum values become 1</li>
            <li>This helps when comparing features with different scales or ranges</li>
            <li>Commonly used for algorithms that require bounded input (like neural networks)</li>
          </ul>
        </AlertDescription>
      </Alert>

      <Alert className='mb-4 bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800'>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Note that only numeric columns can be normalized. We found {columnsWithSupportedTypes.length} numeric columns in your dataset.
        </AlertDescription>
      </Alert>
        
      {!hasSupportedColumns ? (
        <div className="py-4">
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No numeric columns were found in this dataset. Normalization requires numeric data.
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
              disabledColumns={[]} // All numeric columns can be selected
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
                <CardTitle>Review Columns to Normalize</CardTitle>
                <CardDescription>
                  The following {selectedColumns.length} columns will be scaled to a range of 0-1
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {selectedColumns.map(columnName => {
                      const columnInfo = dataset.columns.find(col => col.name === columnName);
                      return (
                        <div key={columnName} className="p-3 bg-muted rounded-md">
                          <div className="font-medium">{columnName}</div>
                          {columnInfo && (
                            <div className="text-xs text-muted-foreground">
                              Range: {columnInfo.min} to {columnInfo.max}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
                    <h4 className="font-medium mb-2">Important Notes:</h4>
                    <ul className="list-disc pl-6 text-sm space-y-1">
                      <li>All values will be compressed to a 0-1 scale</li>
                      <li>Normalization preserves the shape of the original distribution</li>
                      <li>Future values outside the original min-max range will result in values outside 0-1</li>
                      <li>This process is sensitive to outliers (they can compress most data to a narrow range)</li>
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