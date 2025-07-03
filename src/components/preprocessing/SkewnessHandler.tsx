import { useState, useEffect } from 'react';
import { ColumnInfo, DatasetType } from '@/types/dataset';
import { ColumnSelector } from './ColumnSelector';
import { SkewnessMethodSelector } from './SkewnessMethodSelector';
import { useSkewnessConfig } from '@/hooks/useSkewnessConfig';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Info } from 'lucide-react';

interface SkewnessHandlerProps {
  dataset: DatasetType | null;
  onSubmit: (payload: any) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function SkewnessHandler({
  dataset,
  onSubmit,
  onCancel,
  isLoading = false
}: SkewnessHandlerProps) {
  const [activeTab, setActiveTab] = useState<string>('column-selection');
  const [initialSelectionDone, setInitialSelectionDone] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [supportedColumns, setSupportedColumns] = useState<ColumnInfo[]>([]);
  const [skewedColumnNames, setSkewedColumnNames] = useState<string[]>([]);
  
  const {
    selectedColumns,
    setSelectedColumns,
    columnConfigurations,
    updateColumnConfiguration,
    generatePayload
  } = useSkewnessConfig({ dataset });

  // When dataset changes, set as loaded
  useEffect(() => {
    if (dataset) {
      setIsLoaded(true);
      // Find skewed columns
      if (dataset.columns) {
        // Find columns with significant skewness
        const skewedCols = dataset.columns
          .filter(col => col.isSkewed === true)
          .map(col => col.name);
        setSkewedColumnNames(skewedCols);
      }
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

  // Get columns with supported types for skewness transformation (only numeric)
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

  // Pre-select skewed columns on initial load, or all numeric columns if no skewed ones
  useEffect(() => {
    if (hasSupportedColumns && !initialSelectionDone && isLoaded) {
      // Prioritize columns that are skewed
      const columnsToSelect = skewedColumnNames.length > 0 
        ? skewedColumnNames 
        : columnsWithSupportedTypes;
        
      setSelectedColumns(columnsToSelect);
      setInitialSelectionDone(true);
      setSupportedColumns(dataset.columns.filter(col => columnsWithSupportedTypes.includes(col.name)));
    }
  }, [hasSupportedColumns, columnsWithSupportedTypes, skewedColumnNames, setSelectedColumns, initialSelectionDone, isLoaded]);

  if (!isLoaded) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Fix Skewed Data</CardTitle>
          <CardDescription>
            Transform skewed numeric columns to improve data distribution.
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
          <p>This method transforms skewed numeric data to improve normality:</p>
          <ul className="list-disc pl-5 mt-2">
            <li>Logarithmic transformation (log(x+1)): Best for strong positive skewness</li>
            <li>Square root (√x): Moderate transformation for positive skewness</li>
            <li>Reciprocal (1/x): Transforms data with positive skewness</li>
          </ul>
        </AlertDescription>
      </Alert>

      <Alert className='mb-4 bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800'>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Note that only numeric columns can be transformed for skewness correction.
          {skewedColumnNames.length > 0 && (
            <span> We detected {skewedColumnNames.length} significantly skewed column(s) in your data.</span>
          )}
        </AlertDescription>
      </Alert>
        
      {!hasSupportedColumns ? (
        <div className="py-4">
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No numeric columns were found in this dataset. Skewness transformation requires numeric data.
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
              2. Configure Transformations
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="column-selection">
            <ColumnSelector
              columns={supportedColumns || []}
              selectedColumns={selectedColumns}
              onColumnSelectionChange={setSelectedColumns}
              disabledColumns={[]} // All numeric columns can be selected
              dataset={dataset}
              highlightedColumns={skewedColumnNames} // Highlight skewed columns
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
            <SkewnessMethodSelector
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