import { useState, useEffect, useMemo } from 'react';
import { ColumnInfo, DatasetType } from '@/types/dataset';
import { ColumnSelector } from './ColumnSelector';
import { useCombineFeaturesConfig } from '@/hooks/useCombineFeaturesConfig';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, Info, Calculator, Plus } from 'lucide-react';

interface CombineFeaturesHandlerProps {
  dataset: DatasetType | null;
  onSubmit: (payload: any) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function CombineFeaturesHandler({
  dataset,
  onSubmit,
  onCancel,
  isLoading = false
}: CombineFeaturesHandlerProps) {
  const [activeTab, setActiveTab] = useState<string>('column-selection');
  const [initialSelectionDone, setInitialSelectionDone] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [supportedColumns, setSupportedColumns] = useState<ColumnInfo[]>([]);
  
  const {
    selectedColumns,
    setSelectedColumns,
    operation,
    updateOperation,
    columnConfigurations,
    generatePayload
  } = useCombineFeaturesConfig({ dataset });

  // Available mathematical operations
  const operations = [
    { value: '+', label: 'Addition (+)', description: 'Add values together' },
    { value: '-', label: 'Subtraction (-)', description: 'Subtract values' },
    { value: '*', label: 'Multiplication (*)', description: 'Multiply values' },
    { value: '/', label: 'Division (/)', description: 'Divide values' },
    { value: '%/%', label: 'Integer Division (%/%)', description: 'Integer division (floor division)' },
    { value: '%%', label: 'Modulo (%%)', description: 'Remainder after division' },
    { value: '^', label: 'Power (^)', description: 'Raise to power' }
  ];

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

  // Get columns with supported types for combining features (only numeric)
  const columnsWithSupportedTypes = useMemo(() => {
    if (!dataset) {
      return [];
    }
    
    // Filter for columns that are numeric
    return dataset.columns
      .filter(column => column.type === 'numeric')
      .map(column => column.name);
  }, [dataset]);

  const hasSupportedColumns = columnsWithSupportedTypes.length > 0;
  const hasSelectedColumns = selectedColumns.length > 0;
  const hasMinimumColumns = selectedColumns.length >= 2;

  // Pre-select numeric columns on initial load (but don't select all, let user choose)
  useEffect(() => {
    if (hasSupportedColumns && !initialSelectionDone && isLoaded) {
      // Don't pre-select columns for this method, let user choose
      setInitialSelectionDone(true);
      setSupportedColumns(dataset.columns.filter(col => columnsWithSupportedTypes.includes(col.name)));
    }
  }, [hasSupportedColumns, columnsWithSupportedTypes, initialSelectionDone, isLoaded, dataset]);

  // Generate new column name preview
  const newColumnName = useMemo(() => {
    if (selectedColumns.length < 2) return '';
    
    const operationLabel = operations.find(op => op.value === operation)?.label.split(' ')[0] || operation;
    if (selectedColumns.length === 2) {
      return `Combined_${selectedColumns[0]}_${operationLabel}_${selectedColumns[1]}`;
    }
    return `Combined_Features_${operationLabel}`;
  }, [selectedColumns, operation]);

  if (!isLoaded) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Combine Features</CardTitle>
          <CardDescription>
            Create a new column by mathematically combining numeric columns.
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
          <p>Combine Features creates a new column by mathematically merging numeric columns:</p>
          <ul className="list-disc pl-5 mt-2">
            <li>Select 2 or more numeric columns to combine</li>
            <li>Choose a mathematical operation (+, -, *, /, etc.)</li>
            <li>The operation is applied row-by-row to create a new column</li>
            <li>Original columns are preserved alongside the new combined column</li>
          </ul>
        </AlertDescription>
      </Alert>

      <Alert className='mb-4 bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800'>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Note that only numeric columns can be combined. We found {columnsWithSupportedTypes.length} numeric columns in your dataset.
        </AlertDescription>
      </Alert>
        
      {!hasSupportedColumns ? (
        <div className="py-4">
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No numeric columns were found in this dataset. Feature combining requires numeric data.
            </AlertDescription>
          </Alert>
          <div className="flex justify-end mt-4">
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </div>
      ) : columnsWithSupportedTypes.length < 2 ? (
        <div className="py-4">
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              At least 2 numeric columns are required to combine features. Your dataset has only {columnsWithSupportedTypes.length} numeric column(s).
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
              value="operation-selection" 
              disabled={!hasMinimumColumns}
            >
              2. Choose Operation
            </TabsTrigger>
            <TabsTrigger 
              value="review" 
              disabled={!hasMinimumColumns}
            >
              3. Review & Confirm
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="column-selection">
            <Alert className='mb-4 bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800'>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Please select at least 2 numeric columns to combine. You have selected {selectedColumns.length} column(s).
              </AlertDescription>
            </Alert>

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
                onClick={() => handleTabChange('operation-selection')} 
                disabled={!hasMinimumColumns}
              >
                Next
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="operation-selection">
            <Card>
              <CardHeader>
                <CardTitle>Choose Mathematical Operation</CardTitle>
                <CardDescription>
                  Select the operation to apply to your {selectedColumns.length} selected columns
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <Label className="text-base font-medium">Mathematical Operation</Label>
                  <Select value={operation} onValueChange={updateOperation}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {operations.map((op) => (
                        <SelectItem key={op.value} value={op.value}>
                          <div className="flex flex-col">
                            <span className="font-medium">{op.label}</span>
                            <span className="text-sm text-muted-foreground">{op.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="p-4 bg-muted rounded-md">
                  <div className="font-medium mb-2 flex items-center gap-2">
                    <Calculator className="h-4 w-4" />
                    Preview
                  </div>
                  <div className="text-sm">
                    <div className="mb-2">Selected columns: {selectedColumns.join(', ')}</div>
                    <div className="mb-2">Operation: {operations.find(op => op.value === operation)?.label}</div>
                    <div className="font-medium">New column name: <span className="text-blue-600 dark:text-blue-400">{newColumnName}</span></div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <div className="flex justify-between mt-6">
              <Button variant="outline" onClick={() => handleTabChange('column-selection')}>
                Back
              </Button>
              <Button onClick={() => handleTabChange('review')}>
                Next
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="review">
            <Card>
              <CardHeader>
                <CardTitle>Review Feature Combination</CardTitle>
                <CardDescription>
                  Confirm your settings before creating the new combined feature
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium mb-3">Selected Columns ({selectedColumns.length})</h4>
                      <div className="space-y-2">
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
                    </div>

                    <div>
                      <h4 className="font-medium mb-3">Operation Details</h4>
                      <div className="p-4 bg-muted rounded-md">
                        <div className="mb-2">
                          <span className="font-medium">Operation: </span>
                          {operations.find(op => op.value === operation)?.label}
                        </div>
                        <div className="mb-2">
                          <span className="font-medium">New Column: </span>
                          <span className="text-blue-600 dark:text-blue-400">{newColumnName}</span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {operations.find(op => op.value === operation)?.description}
                        </div>
                      </div>
                    </div>
                  </div>

                  <Alert className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                    <Plus className="h-4 w-4" />
                    <AlertDescription>
                      <div className="font-medium mb-2">What will happen:</div>
                      <ul className="text-sm space-y-1">
                        <li>• A new column "{newColumnName}" will be created</li>
                        <li>• The {operation} operation will be applied row-by-row</li>
                        <li>• All {selectedColumns.length} original columns will be preserved</li>
                        <li>• Total columns will increase from {dataset?.columns.length} to {(dataset?.columns.length || 0) + 1}</li>
                      </ul>
                    </AlertDescription>
                  </Alert>

                  <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
                    <h4 className="font-medium mb-2">Important Notes:</h4>
                    <ul className="list-disc pl-6 text-sm space-y-1">
                      <li>Division by zero will result in NaN or Inf values</li>
                      <li>The operation is applied element-wise across all selected columns</li>
                      <li>Missing values in any column may affect the result</li>
                      <li>The new column will have the same number of rows as your dataset</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <div className="flex justify-between mt-6">
              <Button variant="outline" onClick={() => handleTabChange('operation-selection')}>
                Back
              </Button>
              <Button 
                onClick={handleSubmit} 
                disabled={!hasMinimumColumns || isLoading}
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