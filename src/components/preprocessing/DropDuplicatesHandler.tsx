import { useState, useEffect } from 'react';
import { DatasetType } from '@/types/dataset';
import { useDropDuplicatesConfig } from '@/hooks/useDropDuplicatesConfig';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { AlertCircle, Info, Copy, Database, Columns } from 'lucide-react';

interface DropDuplicatesHandlerProps {
  dataset: DatasetType | null;
  onSubmit: (payload: any) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function DropDuplicatesHandler({
  dataset,
  onSubmit,
  onCancel,
  isLoading = false
}: DropDuplicatesHandlerProps) {
  const [activeTab, setActiveTab] = useState<string>('configuration');
  const [isLoaded, setIsLoaded] = useState(false);
  
  const {
    dropDuplicatesConfig,
    updateDropDuplicatesConfig,
    generatePayload
  } = useDropDuplicatesConfig({ dataset });

  // When dataset changes, set as loaded and auto-select valid option
  useEffect(() => {
    if (dataset) {
      setIsLoaded(true);
      
      // Auto-select the option that has duplicates
      const hasDuplicateRows = dataset.duplicateRowsCount > 0;
      const hasDuplicateColumns = dataset.duplicateColumnsCount > 0;
      
      if (hasDuplicateRows && !hasDuplicateColumns) {
        updateDropDuplicatesConfig({ value: 'row' });
      } else if (hasDuplicateColumns && !hasDuplicateRows) {
        updateDropDuplicatesConfig({ value: 'column' });
      } else if (hasDuplicateRows && hasDuplicateColumns) {
        // Both have duplicates, default to rows
        updateDropDuplicatesConfig({ value: 'row' });
      }
    }
  }, [dataset, updateDropDuplicatesConfig]);

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

  if (!isLoaded) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Drop Duplicates</CardTitle>
          <CardDescription>
            Remove duplicate data to ensure data uniqueness in your dataset.
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

  if (!dataset) {
    return (
      <div className="w-full">
        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No dataset found.
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

  // Check if there are any duplicates
  const hasDuplicateRows = dataset.duplicateRowsCount > 0;
  const hasDuplicateColumns = dataset.duplicateColumnsCount > 0;
  const hasAnyDuplicates = hasDuplicateRows || hasDuplicateColumns;

  // If no duplicates exist, show info and don't allow method execution
  if (!hasAnyDuplicates) {
    return (
      <div className="w-full">
        <Alert className="mb-4 bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
          <Info className="h-4 w-4" />
          <AlertDescription>
            <div className="font-medium mb-2">No Duplicates Found</div>
            <p>Your dataset doesn't contain any duplicate rows or columns. No action is needed.</p>
            <div className="mt-2 text-sm">
              <div>• Duplicate rows: {dataset.duplicateRowsCount}</div>
              <div>• Duplicate columns: {dataset.duplicateColumnsCount}</div>
            </div>
          </AlertDescription>
        </Alert>
        
        <div className="flex justify-end mt-4">
          <Button variant="outline" onClick={onCancel}>
            Back
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
          <p>This method automatically purges duplicates to ensure data uniqueness:</p>
          <ul className="list-disc pl-5 mt-2">
            <li><strong>Row duplicates:</strong> Removes records that are identical across all columns</li>
            <li><strong>Column duplicates:</strong> Removes columns that share the same name (keeps first occurrence)</li>
            <li>The result is a clean, duplicate-free dataset ready for subsequent analysis</li>
          </ul>
        </AlertDescription>
      </Alert>

      <Alert className='mb-4 bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800'>
        <Database className="h-4 w-4" />
        <AlertDescription>
          <div className="space-y-2">
            <div>Your dataset currently has <strong>{dataset.rows.toLocaleString()}</strong> rows and <strong>{dataset.columns.length}</strong> columns.</div>
            <div className="text-sm">
              <div>• Duplicate rows found: <strong>{dataset.duplicateRowsCount}</strong></div>
              <div>• Duplicate columns found: <strong>{dataset.duplicateColumnsCount}</strong></div>
            </div>
          </div>
        </AlertDescription>
      </Alert>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="mb-4">
          <TabsTrigger value="configuration">Configure Method</TabsTrigger>
          <TabsTrigger value="review">Review & Confirm</TabsTrigger>
        </TabsList>
        
        <TabsContent value="configuration">
          <Card>
            <CardHeader>
              <CardTitle>Drop Duplicates Configuration</CardTitle>
              <CardDescription>
                Choose whether to remove duplicate rows or duplicate columns.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <Label className="text-base font-medium">Duplicate Type</Label>
                <RadioGroup
                  value={dropDuplicatesConfig.value}
                  onValueChange={(value: 'row' | 'column') => 
                    updateDropDuplicatesConfig({ value })
                  }
                  className="space-y-3"
                >
                  <div className={`flex items-start space-x-3 p-4 border rounded-lg ${hasDuplicateRows ? 'hover:bg-muted/50' : 'opacity-50 bg-muted/20'}`}>
                    <RadioGroupItem 
                      value="row" 
                      id="row" 
                      className="mt-1" 
                      disabled={!hasDuplicateRows}
                    />
                    <div className="space-y-1 flex-1">
                      <Label htmlFor="row" className={`flex items-center gap-2 ${hasDuplicateRows ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
                        <Copy className="h-4 w-4" />
                        Remove Duplicate Rows
                        <span className={`text-sm font-medium px-2 py-1 rounded ${hasDuplicateRows ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}>
                          {dataset.duplicateRowsCount} found
                        </span>
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        {hasDuplicateRows 
                          ? "Identifies and removes records that are identical across all columns. Only the first occurrence of each unique row is kept."
                          : "No duplicate rows found in your dataset."
                        }
                      </p>
                    </div>
                  </div>
                  
                  <div className={`flex items-start space-x-3 p-4 border rounded-lg ${hasDuplicateColumns ? 'hover:bg-muted/50' : 'opacity-50 bg-muted/20'}`}>
                    <RadioGroupItem 
                      value="column" 
                      id="column" 
                      className="mt-1" 
                      disabled={!hasDuplicateColumns}
                    />
                    <div className="space-y-1 flex-1">
                      <Label htmlFor="column" className={`flex items-center gap-2 ${hasDuplicateColumns ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
                        <Columns className="h-4 w-4" />
                        Remove Duplicate Columns
                        <span className={`text-sm font-medium px-2 py-1 rounded ${hasDuplicateColumns ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}>
                          {dataset.duplicateColumnsCount} found
                        </span>
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        {hasDuplicateColumns 
                          ? "Identifies and removes columns that share the same name. Only the first occurrence of each unique column name is kept."
                          : "No duplicate column names found in your dataset."
                        }
                      </p>
                    </div>
                  </div>
                </RadioGroup>
              </div>
            </CardContent>
          </Card>
          
          <div className="flex justify-between mt-6">
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button onClick={() => handleTabChange('review')}>
              Next
            </Button>
          </div>
        </TabsContent>
        
        <TabsContent value="review">
          <Card>
            <CardHeader>
              <CardTitle>Review Drop Duplicates Configuration</CardTitle>
              <CardDescription>
                Confirm your settings before removing duplicates from your dataset.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-muted rounded-md">
                    <div className="font-medium mb-2">Current Dataset</div>
                    <div className="text-sm space-y-1">
                      <div>Rows: {dataset.rows.toLocaleString()}</div>
                      <div>Columns: {dataset.columns.length}</div>
                      <div className="pt-2 border-t mt-2">
                        <div>Duplicate rows: {dataset.duplicateRowsCount}</div>
                        <div>Duplicate columns: {dataset.duplicateColumnsCount}</div>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-muted rounded-md">
                    <div className="font-medium mb-2">Operation</div>
                    <div className="text-sm space-y-1">
                      <div className="flex items-center gap-2">
                        {dropDuplicatesConfig.value === 'row' ? (
                          <>
                            <Copy className="h-4 w-4" />
                            Remove {dataset.duplicateRowsCount} Duplicate Rows
                          </>
                        ) : (
                          <>
                            <Columns className="h-4 w-4" />
                            Remove {dataset.duplicateColumnsCount} Duplicate Columns
                          </>
                        )}
                      </div>
                      <div className="text-muted-foreground">
                        {dropDuplicatesConfig.value === 'row' 
                          ? `New dataset will have ${dataset.rows - dataset.duplicateRowsCount} rows`
                          : `New dataset will have ${dataset.columns.length - dataset.duplicateColumnsCount} columns`
                        }
                      </div>
                    </div>
                  </div>
                </div>

                <Alert className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    <div className="font-medium mb-2">What will happen:</div>
                    <ul className="text-sm space-y-1">
                      {dropDuplicatesConfig.value === 'row' ? (
                        <>
                          <li>• System will identify rows that are identical across all columns</li>
                          <li>• Duplicate rows will be removed, keeping only the first occurrence</li>
                          <li>• Row count may decrease if duplicates are found</li>
                          <li>• Column structure remains unchanged</li>
                        </>
                      ) : (
                        <>
                          <li>• System will identify columns that share the same name</li>
                          <li>• Duplicate columns will be removed, keeping only the first occurrence</li>
                          <li>• Column count may decrease if duplicates are found</li>
                          <li>• Row count remains unchanged</li>
                        </>
                      )}
                    </ul>
                  </AlertDescription>
                </Alert>

                <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
                  <h4 className="font-medium mb-2">Important Notes:</h4>
                  <ul className="list-disc pl-6 text-sm space-y-1">
                    <li>This operation cannot be undone, but you can always return to previous versions</li>
                    <li>The system preserves the first occurrence and removes subsequent duplicates</li>
                    <li>If no duplicates are found, your dataset will remain unchanged</li>
                    <li>Consider reviewing your data to understand why duplicates exist</li>
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