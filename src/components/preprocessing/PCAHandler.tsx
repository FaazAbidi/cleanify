import { useState, useEffect, useMemo } from 'react';
import { DatasetType } from '@/types/dataset';
import { usePCAConfig } from '@/hooks/usePCAConfig';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { AlertCircle, Info, TrendingUp, Target } from 'lucide-react';

interface PCAHandlerProps {
  dataset: DatasetType | null;
  onSubmit: (payload: any) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function PCAHandler({
  dataset,
  onSubmit,
  onCancel,
  isLoading = false
}: PCAHandlerProps) {
  const [activeTab, setActiveTab] = useState<string>('configuration');
  const [isLoaded, setIsLoaded] = useState(false);
  
  const {
    pcaConfig,
    updatePCAConfig,
    availableNumericColumns,
    pcaColumns,
    generatePayload
  } = usePCAConfig({ dataset });

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

  const hasSufficientColumns = pcaColumns.length >= 2;
  const hasNumericColumns = availableNumericColumns.length > 0;
  const hasTargetColumn = pcaConfig.targetColumn !== null;
  const canProceed = hasTargetColumn && hasSufficientColumns;

  if (!isLoaded) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Principal Component Analysis (PCA)</CardTitle>
          <CardDescription>
            Reduce dataset dimensionality while preserving the most important patterns in your data.
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
          <p>PCA intelligently reduces dataset dimensions while preserving essential patterns:</p>
          <ul className="list-disc pl-5 mt-2">
            <li>Automatically standardizes all numeric columns before analysis</li>
            <li>Identifies principal components that capture maximum variance</li>
            <li>Creates new "PC1", "PC2", etc. columns with reduced dimensionality</li>
            <li>Preserves your target variable (if specified) without transformation</li>
          </ul>
        </AlertDescription>
      </Alert>

             <Alert className='mb-4 bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800'>
         <AlertCircle className="h-4 w-4" />
         <AlertDescription>
           Found {availableNumericColumns.length} numeric columns in your dataset. 
           {pcaConfig.targetColumn 
             ? ` "${pcaConfig.targetColumn}" will be preserved as target variable. ${pcaColumns.length} columns will be used for PCA transformation.`
             : ' Please select a target variable to continue.'
           }
         </AlertDescription>
       </Alert>
        
      {!hasNumericColumns ? (
        <div className="py-4">
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No numeric columns were found in this dataset. PCA requires numeric data.
            </AlertDescription>
          </Alert>
          <div className="flex justify-end mt-4">
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </div>
      ) : !hasSufficientColumns ? (
        <div className="py-4">
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              At least 2 numeric columns are required for PCA analysis. 
              {pcaConfig.targetColumn 
                ? `You have ${availableNumericColumns.length} numeric columns, but "${pcaConfig.targetColumn}" is set as target, leaving only ${pcaColumns.length} for PCA.`
                : `Your dataset has only ${availableNumericColumns.length} numeric column(s).`
              }
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
            <TabsTrigger value="configuration">Configure PCA</TabsTrigger>
            <TabsTrigger value="review">Review & Confirm</TabsTrigger>
          </TabsList>
          
          <TabsContent value="configuration">
            <div className="space-y-6">
              {/* Target Variable Selection */}
              <Card>
                                 <CardHeader>
                   <CardTitle className="flex items-center gap-2">
                     <Target className="h-5 w-5" />
                     Target Variable (Required)
                   </CardTitle>
                   <CardDescription>
                     Select a target variable to preserve during PCA transformation. This column will not be included in the dimensionality reduction and is required for PCA analysis.
                   </CardDescription>
                 </CardHeader>
                <CardContent>
                                     <div className="space-y-3">
                     <Label htmlFor="target-select">Target Column *</Label>
                     <Select
                       value={pcaConfig.targetColumn || ''}
                       onValueChange={(value) => 
                         updatePCAConfig({ targetColumn: value || null })
                       }
                     >
                       <SelectTrigger id="target-select">
                         <SelectValue placeholder="Select a target column..." />
                       </SelectTrigger>
                       <SelectContent>
                         {availableNumericColumns.map((column) => (
                           <SelectItem key={column} value={column}>
                             {column}
                           </SelectItem>
                         ))}
                       </SelectContent>
                     </Select>
                     <p className="text-sm text-muted-foreground">
                       {pcaConfig.targetColumn 
                         ? `"${pcaConfig.targetColumn}" will be preserved as-is and excluded from PCA transformation`
                         : 'Please select a target column to proceed'
                       }
                     </p>
                     {!pcaConfig.targetColumn && (
                       <p className="text-sm text-red-600">
                         * Target column selection is required
                       </p>
                     )}
                   </div>
                </CardContent>
              </Card>

              {/* PCA Configuration */}
                             <Card>
                 <CardHeader>
                   <CardTitle className="flex items-center gap-2">
                     <TrendingUp className="h-5 w-5" />
                     Variance Threshold
                   </CardTitle>
                   <CardDescription>
                     Specify the percentage of total variance to preserve. PCA will automatically select enough components to meet this threshold.
                   </CardDescription>
                 </CardHeader>
                 <CardContent className="space-y-4">
                   <div className="space-y-3">
                     <Label htmlFor="variance-threshold">Variance Threshold</Label>
                     <div className="flex items-center space-x-2">
                       <Input
                         id="variance-threshold"
                         type="number"
                         min="0.5"
                         max="0.99"
                         step="0.01"
                         value={pcaConfig.varianceThreshold}
                         onChange={(e) => {
                           const value = parseFloat(e.target.value) || 0.95;
                           updatePCAConfig({ 
                             varianceThreshold: Math.max(0.5, Math.min(0.99, value))
                           });
                         }}
                         className="w-32"
                       />
                       <span className="text-sm text-muted-foreground">
                         ({(pcaConfig.varianceThreshold * 100).toFixed(0)}% of variance)
                       </span>
                     </div>
                     <p className="text-sm text-muted-foreground">
                       Higher values preserve more information but may keep more dimensions. Range: 50% - 99%
                     </p>
                   </div>

                   <Alert className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                     <Info className="h-4 w-4" />
                     <AlertDescription>
                       <div className="font-medium mb-2">How it works:</div>
                       <ul className="text-sm space-y-1">
                         <li>• PCA will calculate all possible principal components</li>
                         <li>• Components are ranked by variance explained (PC1 &gt; PC2 &gt; PC3...)</li>
                         <li>• The system keeps adding components until {(pcaConfig.varianceThreshold * 100).toFixed(0)}% of variance is explained</li>
                         <li>• The exact number of components depends on your data's structure</li>
                       </ul>
                     </AlertDescription>
                   </Alert>
                 </CardContent>
               </Card>
            </div>
            
                         <div className="flex justify-between mt-6">
               <Button variant="outline" onClick={onCancel}>
                 Cancel
               </Button>
               <Button 
                 onClick={() => handleTabChange('review')}
                 disabled={!hasTargetColumn}
               >
                 Next
               </Button>
             </div>
          </TabsContent>
          
          <TabsContent value="review">
            <Card>
              <CardHeader>
                <CardTitle>Review PCA Configuration</CardTitle>
                <CardDescription>
                  Confirm your settings before applying Principal Component Analysis
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-muted rounded-md">
                      <div className="font-medium mb-2">Input Data</div>
                      <div className="text-sm space-y-1">
                                                 <div>Total numeric columns: {availableNumericColumns.length}</div>
                         <div>Columns for PCA: {pcaColumns.length}</div>
                         <div>Target variable: {pcaConfig.targetColumn}</div>
                      </div>
                    </div>

                                         <div className="p-4 bg-muted rounded-md">
                       <div className="font-medium mb-2">Reduction Settings</div>
                       <div className="text-sm space-y-1">
                         <div>Method: Variance Threshold</div>
                         <div>Threshold: {(pcaConfig.varianceThreshold * 100).toFixed(0)}%</div>
                         <div>Components: Determined automatically</div>
                       </div>
                     </div>
                  </div>

                  <Alert className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                    <TrendingUp className="h-4 w-4" />
                    <AlertDescription>
                      <div className="font-medium mb-2">What will happen:</div>
                      <ul className="text-sm space-y-1">
                                                 <li>• All {pcaColumns.length} numeric columns will be standardized automatically</li>
                         <li>• PCA will identify the most important patterns in your data</li>
                         <li>• New principal component columns (PC1, PC2, etc.) will be created</li>
                         <li>• "{pcaConfig.targetColumn}" will be preserved unchanged</li>
                         <li>• Original columns will be replaced with principal components</li>
                      </ul>
                    </AlertDescription>
                  </Alert>

                  <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
                    <h4 className="font-medium mb-2">Important Notes:</h4>
                    <ul className="list-disc pl-6 text-sm space-y-1">
                      <li>PCA creates new features that are linear combinations of original features</li>
                      <li>Principal components are ordered by variance explained (PC1 &gt; PC2 &gt; PC3...)</li>
                      <li>Original column names and meanings will be lost</li>
                      <li>This transformation cannot be easily reversed</li>
                      <li>Results work best when original features are on similar scales</li>
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
                 disabled={!canProceed || isLoading}
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