import { useMemo, useState } from 'react';
import { TaskVersion } from "@/types/version";
import { DatasetType, ColumnInfo } from "@/types/dataset";
import { Tables } from "@/integrations/supabase/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, BarChart2, PieChart, LineChart, BrainCircuit, AlertTriangle, Database, ArrowDownUp, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

interface VersionDiffVisualizationsProps {
  baseVersion: TaskVersion;
  compareVersion: TaskVersion;
  dataset: DatasetType | null;
  compareDataset: DatasetType | null;
  task: Tables<'Tasks'> | null;
}

// Type definitions for dataset comparison
interface CategoryChange {
  category: string;
  basePct: string;
  comparePct: string;
  diff: string;
}

interface NumericChanges {
  mean: number | null;
  median: number | null;
  std: number | null;
  min: number | null;
  max: number | null;
}

interface ColumnComparison {
  name: string;
  type: string;
  missingValuesChange: number;
  outliersChange: number | null;
  distributionSimilarity: number | null;
  significantValueChanges: CategoryChange[] | null;
  numericChanges: NumericChanges | null;
}

interface CorrelationChange {
  col1: string;
  col2: string;
  baseCor: string;
  compareCor: string;
  diff: string;
}

// Maximum number of rows to use for statistical calculations
const MAX_SAMPLE_SIZE = 10000;

export function VersionDiffVisualizations({
  baseVersion,
  compareVersion,
  dataset,
  compareDataset,
  task
}: VersionDiffVisualizationsProps) {
  const [isCalculating, setIsCalculating] = useState(false);
  const [calculationProgress, setCalculationProgress] = useState(0);
  
  // Calculate statistics between versions using data sampling for efficiency
  const diffStats = useMemo(() => {
    if (!dataset?.rawData || !compareDataset?.rawData) {
      return null;
    }

    setIsCalculating(true);
    setCalculationProgress(5);

    try {
      // Sample data for efficient processing of large datasets
      const baseData = sampleData(dataset.rawData, MAX_SAMPLE_SIZE);
      const compareData = sampleData(compareDataset.rawData, MAX_SAMPLE_SIZE);
      
      setCalculationProgress(20);
      
      // Get dataset-level statistics
      const baseRowCount = dataset.rawData.length;
      const compareRowCount = compareDataset.rawData.length;
      const rowCountDiff = compareRowCount - baseRowCount;
      const rowCountPercent = baseRowCount ? ((compareRowCount - baseRowCount) / baseRowCount * 100).toFixed(1) : "N/A";
      
      // Missing values comparison
      const baseMissingRate = dataset.missingValuesCount / (baseRowCount * dataset.columns.length);
      const compareMissingRate = compareDataset.missingValuesCount / (compareRowCount * compareDataset.columns.length);
      const missingValuesDiff = (compareMissingRate - baseMissingRate) * 100;
      
      // Duplicate rows comparison
      const baseDuplicateRate = dataset.duplicateRowsCount / baseRowCount;
      const compareDuplicateRate = compareDataset.duplicateRowsCount / compareRowCount;
      const duplicateRowsDiff = (compareDuplicateRate - baseDuplicateRate) * 100;

      setCalculationProgress(30);
      
      // Column-level comparisons - clean column names to handle carriage returns
      const baseColumns = new Map(dataset.columns.map(col => [col.name.trim(), col]));
      const compareColumns = new Map(compareDataset.columns.map(col => [col.name.trim(), col]));
      
      // All column names from both datasets
      const allColumnNames = new Set([
        ...baseColumns.keys(),
        ...compareColumns.keys()
      ]);
      
      setCalculationProgress(40);
      
      // Column changes
      const addedColumns = [...allColumnNames].filter(name => !baseColumns.has(name));
      const removedColumns = [...allColumnNames].filter(name => !compareColumns.has(name));
      const commonColumns = [...allColumnNames].filter(name => baseColumns.has(name) && compareColumns.has(name));

      setCalculationProgress(50);
      
      // Analyze column-level changes for common columns
      const columnComparisons = commonColumns.map(colName => {
        const baseCol = baseColumns.get(colName);
        const compareCol = compareColumns.get(colName);
        
        if (!baseCol || !compareCol) return null;
        
        // Missing values change
        const missingValuesChange = compareCol.missingPercent - baseCol.missingPercent;
        
        // Outliers change
        const outliersChange = (compareCol.outliers || 0) - (baseCol.outliers || 0);
        
        // Calculate distribution similarity for categorical columns
        let distributionSimilarity = 1;
        let significantValueChanges = [];

        if (baseCol.type === 'categorical' && compareCol.type === 'categorical' && 
            baseCol.distribution && compareCol.distribution) {
          
          // Get all unique categories
          const allCategories = new Set([
            ...Object.keys(baseCol.distribution),
            ...Object.keys(compareCol.distribution)
          ]);
          
          // Calculate distribution similarity using a simple metric
          let totalDiff = 0;
          const significantChanges = [];
          
          allCategories.forEach(category => {
            const baseValue = (baseCol.distribution?.[category] || 0);
            const compareValue = (compareCol.distribution?.[category] || 0);
            
            // Calculate percentage difference
            const basePct = baseValue / baseRowCount * 100;
            const comparePct = compareValue / compareRowCount * 100;
            const diff = Math.abs(comparePct - basePct);
            
            totalDiff += diff;
            
            // Capture significant changes (more than 5% difference)
            if (diff > 5) {
              significantChanges.push({
                category,
                basePct: basePct.toFixed(1),
                comparePct: comparePct.toFixed(1),
                diff: (comparePct - basePct).toFixed(1)
              });
            }
          });
          
          // Normalize the difference (0 = identical, 1 = completely different)
          distributionSimilarity = Math.max(0, 1 - (totalDiff / 100));
          significantValueChanges = significantChanges.sort((a, b) => 
            Math.abs(parseFloat(b.diff)) - Math.abs(parseFloat(a.diff))
          ).slice(0, 3); // Top 3 most significant changes
        }
        
        // Calculate numeric statistic changes
        let numericChanges = null;
        if (baseCol.type === 'numeric' && compareCol.type === 'numeric') {
          numericChanges = {
            mean: compareCol.mean !== undefined && baseCol.mean !== undefined ? 
              compareCol.mean - baseCol.mean : null,
            median: compareCol.median !== undefined && baseCol.median !== undefined ? 
              compareCol.median - baseCol.median : null,
            std: compareCol.std !== undefined && baseCol.std !== undefined ? 
              compareCol.std - baseCol.std : null,
            min: compareCol.min !== undefined && baseCol.min !== undefined && 
              typeof compareCol.min === 'number' && typeof baseCol.min === 'number' ? 
              compareCol.min - baseCol.min : null,
            max: compareCol.max !== undefined && baseCol.max !== undefined && 
              typeof compareCol.max === 'number' && typeof baseCol.max === 'number' ? 
              compareCol.max - baseCol.max : null
          };
        }
        
        return {
          name: colName,
          type: baseCol.type,
          missingValuesChange,
          outliersChange,
          distributionSimilarity: baseCol.type === 'categorical' ? distributionSimilarity : null,
          significantValueChanges: baseCol.type === 'categorical' ? significantValueChanges : null,
          numericChanges: baseCol.type === 'numeric' ? numericChanges : null
        };
      }).filter(Boolean);

      setCalculationProgress(80);
      
      // Correlation changes for numeric columns
      let correlationChanges = null;
      if (dataset.correlationData && compareDataset.correlationData) {
        const baseCorr = dataset.correlationData;
        const compareCorr = compareDataset.correlationData;
        
        // Find common columns in correlation matrices
        const commonLabels = baseCorr.labels.filter(label => 
          compareCorr.labels.includes(label)
        );
        
        // For each common pair, calculate correlation difference
        const pairs = [];
        for (let i = 0; i < commonLabels.length; i++) {
          for (let j = i + 1; j < commonLabels.length; j++) {
            const col1 = commonLabels[i];
            const col2 = commonLabels[j];
            
            const baseIdx1 = baseCorr.labels.indexOf(col1);
            const baseIdx2 = baseCorr.labels.indexOf(col2);
            const compareIdx1 = compareCorr.labels.indexOf(col1);
            const compareIdx2 = compareCorr.labels.indexOf(col2);
            
            if (baseIdx1 >= 0 && baseIdx2 >= 0 && compareIdx1 >= 0 && compareIdx2 >= 0) {
              const baseValue = baseCorr.matrix[baseIdx1][baseIdx2];
              const compareValue = compareCorr.matrix[compareIdx1][compareIdx2];
              const diff = compareValue - baseValue;
              
              // Only include significant changes
              if (Math.abs(diff) > 0.1) {
                pairs.push({
                  col1,
                  col2,
                  baseCor: baseValue.toFixed(2),
                  compareCor: compareValue.toFixed(2),
                  diff: diff.toFixed(2)
                });
              }
            }
          }
        }
        
        // Sort by absolute difference
        correlationChanges = pairs.sort((a, b) => 
          Math.abs(parseFloat(b.diff)) - Math.abs(parseFloat(a.diff))
        ).slice(0, 5); // Top 5 most significant correlation changes
      }

      setCalculationProgress(100);
      setIsCalculating(false);

      // Return comprehensive comparison stats
      return {
        // Dataset level stats
        baseRowCount,
        compareRowCount,
        rowCountDiff,
        rowCountPercent,
        baseMissingRate: (baseMissingRate * 100).toFixed(2),
        compareMissingRate: (compareMissingRate * 100).toFixed(2),
        missingValuesDiff: missingValuesDiff.toFixed(2),
        baseDuplicateRate: (baseDuplicateRate * 100).toFixed(2),
        compareDuplicateRate: (compareDuplicateRate * 100).toFixed(2),
        duplicateRowsDiff: duplicateRowsDiff.toFixed(2),
        
        // Column level changes
        addedColumns,
        removedColumns,
        commonColumnCount: commonColumns.length,
        columnComparisons,
        
        // Correlation changes
        correlationChanges
      };
    } catch (error) {
      console.error('Error calculating visualization stats:', error);
      setIsCalculating(false);
      return null;
    }
  }, [dataset, compareDataset]);

  if (!dataset || !compareDataset) {
    return <EmptyState message="No dataset available for visualization" />;
  }
  
  if (isCalculating) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Processing Dataset Comparison</CardTitle>
          <CardDescription>Analyzing dataset quality metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center p-8 space-y-4">
            <Loader2 className="h-8 w-8 animate-spin" />
            <Progress value={calculationProgress} className="w-[60%]" />
            <p className="text-sm text-muted-foreground">
              Analyzing data ({calculationProgress}% complete)
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (!diffStats) {
    return <EmptyState message="Unable to generate dataset comparisons" error />;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Dataset Quality Comparison</CardTitle>
          <CardDescription>
            Comparing versions "{baseVersion.name || `#${baseVersion.version_number}`}" and 
            "{compareVersion.name || `#${compareVersion.version_number}`}"
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <MetricCard 
              title="Rows" 
              baseValue={diffStats.baseRowCount.toLocaleString()} 
              compareValue={diffStats.compareRowCount.toLocaleString()}
              changePct={diffStats.rowCountPercent}
              icon={<Database className="h-4 w-4" />}
            />
            <MetricCard 
              title="Missing Values" 
              baseValue={`${diffStats.baseMissingRate}%`} 
              compareValue={`${diffStats.compareMissingRate}%`}
              changePct={diffStats.missingValuesDiff}
              icon={<AlertCircle className="h-4 w-4" />}
              higherIsBetter={false}
            />
            <MetricCard 
              title="Duplicate Rows" 
              baseValue={`${diffStats.baseDuplicateRate}%`} 
              compareValue={`${diffStats.compareDuplicateRate}%`}
              changePct={diffStats.duplicateRowsDiff}
              icon={<ArrowDownUp className="h-4 w-4" />}
              higherIsBetter={false}
            />
          </div>
          
          <div className="mt-6 p-4 border rounded-md bg-muted/30">
            <h4 className="text-sm font-medium mb-2">Column Changes</h4>
            <div className="flex flex-wrap gap-2">
              {diffStats.addedColumns.length > 0 && (
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400">
                  {diffStats.addedColumns.length} added columns
                </Badge>
              )}
              {diffStats.removedColumns.length > 0 && (
                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400">
                  {diffStats.removedColumns.length} removed columns
                </Badge>
              )}
              <Badge variant="outline">
                {diffStats.commonColumnCount} common columns
              </Badge>
            </div>
            
            {diffStats.addedColumns.length > 0 && (
              <div className="mt-2">
                <span className="text-xs font-medium">Added:</span>
                <span className="text-xs ml-2">{diffStats.addedColumns.join(', ')}</span>
              </div>
            )}
            
            {diffStats.removedColumns.length > 0 && (
              <div className="mt-1">
                <span className="text-xs font-medium">Removed:</span>
                <span className="text-xs ml-2">{diffStats.removedColumns.join(', ')}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="distributions" className="w-full">
        <TabsList className="grid grid-cols-3 mb-4">
          <TabsTrigger value="distributions">
            <BarChart2 className="h-4 w-4 mr-2" />
            Distribution Changes
          </TabsTrigger>
          <TabsTrigger value="outliers">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Outliers & Missing Values
          </TabsTrigger>
          <TabsTrigger value="correlations">
            <BrainCircuit className="h-4 w-4 mr-2" />
            Correlation Changes
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="distributions">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart2 className="h-5 w-5 mr-2" />
                Distribution Changes
              </CardTitle>
              <CardDescription>
                Comparing how data distributions have changed between versions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[450px] pr-4">
                {diffStats.columnComparisons
                  .filter(col => col.type === 'categorical' && col.significantValueChanges?.length > 0)
                  .map(col => (
                    <CategoryDistributionCard
                      key={col.name}
                      columnName={col.name}
                      similarity={(col.distributionSimilarity ? (col.distributionSimilarity * 100).toFixed(0) : "0")}
                      changes={col.significantValueChanges || []}
                    />
                  ))}
                
                {diffStats.columnComparisons
                  .filter(col => col.type === 'numeric' && col.numericChanges)
                  .map(col => (
                    <NumericDistributionCard
                      key={col.name}
                      columnName={col.name}
                      changes={col.numericChanges || {}}
                    />
                  ))}
                
                {diffStats.columnComparisons.filter(
                  col => (col.type === 'categorical' && col.significantValueChanges?.length > 0) || 
                        (col.type === 'numeric' && col.numericChanges)
                ).length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No significant distribution changes found
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="outliers">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2" />
                Outliers & Missing Values
              </CardTitle>
              <CardDescription>
                Comparing outliers and missing values between versions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[450px] pr-4">
                {diffStats.columnComparisons
                  .filter(col => 
                    Math.abs(col.missingValuesChange) > 0.5 || 
                    (col.outliersChange !== null && Math.abs(col.outliersChange) > 0)
                  )
                  .sort((a, b) => 
                    Math.abs(b.missingValuesChange) - Math.abs(a.missingValuesChange)
                  )
                  .map(col => (
                    <OutlierMissingCard
                      key={col.name}
                      columnName={col.name}
                      columnType={col.type}
                      missingChange={col.missingValuesChange}
                      outliersChange={col.outliersChange}
                    />
                  ))}
                
                {diffStats.columnComparisons.filter(
                  col => Math.abs(col.missingValuesChange) > 0.5 || 
                       (col.outliersChange !== null && Math.abs(col.outliersChange) > 0)
                ).length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No significant changes in outliers or missing values
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="correlations">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BrainCircuit className="h-5 w-5 mr-2" />
                Correlation Changes
              </CardTitle>
              <CardDescription>
                Comparing how relationships between variables have changed
              </CardDescription>
            </CardHeader>
            <CardContent>
              {diffStats.correlationChanges && diffStats.correlationChanges.length > 0 ? (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground mb-4">
                    The following pairs of variables have shown significant changes in their correlation:
                  </p>
                  
                  <div className="border rounded-md overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="px-4 py-2 text-left text-sm font-medium">Variables</th>
                          <th className="px-4 py-2 text-center text-sm font-medium">Base Correlation</th>
                          <th className="px-4 py-2 text-center text-sm font-medium">New Correlation</th>
                          <th className="px-4 py-2 text-right text-sm font-medium">Change</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {diffStats.correlationChanges.map((corr, idx) => (
                          <tr key={idx} className="hover:bg-muted/30">
                            <td className="px-4 py-2 text-sm">
                              {corr.col1} & {corr.col2}
                            </td>
                            <td className="px-4 py-2 text-center text-sm">
                              {corr.baseCor}
                            </td>
                            <td className="px-4 py-2 text-center text-sm">
                              {corr.compareCor}
                            </td>
                            <td className={`px-4 py-2 text-right text-sm font-medium ${
                              parseFloat(corr.diff) > 0 
                                ? 'text-green-600 dark:text-green-400' 
                                : 'text-red-600 dark:text-red-400'
                            }`}>
                              {parseFloat(corr.diff) > 0 ? '+' : ''}{corr.diff}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  <p className="text-xs text-muted-foreground mt-2">
                    Correlation range is from -1 (perfect negative correlation) to 1 (perfect positive correlation)
                  </p>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No significant correlation changes found between versions
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function EmptyState({ message, error = false }: {
  message: string;
  error?: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Dataset Comparison</CardTitle>
      </CardHeader>
      <CardContent>
        {error ? (
          <div className="flex items-center gap-2 text-amber-500">
            <AlertCircle className="h-5 w-5" />
            <p>{message}</p>
          </div>
        ) : (
          <p className="text-muted-foreground">{message}</p>
        )}
      </CardContent>
    </Card>
  );
}

function MetricCard({ title, baseValue, compareValue, changePct, icon, higherIsBetter = true }: {
  title: string;
  baseValue: string;
  compareValue: string;
  changePct: string;
  icon: React.ReactNode;
  higherIsBetter?: boolean;
}) {
  const changeValue = parseFloat(changePct);
  const isPositiveChange = !isNaN(changeValue) && changeValue > 0;
  const isNegativeChange = !isNaN(changeValue) && changeValue < 0;
  
  // For some metrics (like missing values), a decrease is actually better
  const isImprovement = higherIsBetter ? isPositiveChange : isNegativeChange;
  const isWorse = higherIsBetter ? isNegativeChange : isPositiveChange;

  return (
    <div className="rounded-lg border bg-card p-4 text-card-foreground shadow-sm">
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center">
          {icon}
          <p className="text-sm font-medium ml-1.5">{title}</p>
        </div>
        {!isNaN(changeValue) && (
          <Badge variant="outline" className={`
            ${isImprovement ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400' : ''}
            ${isWorse ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400' : ''}
            ${!isImprovement && !isWorse ? 'bg-slate-50 border-slate-200 dark:bg-slate-950/30' : ''}
          `}>
            {isPositiveChange ? '+' : ''}{changePct}%
          </Badge>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2 mt-2">
        <div className="rounded-md bg-muted/40 p-2">
          <p className="text-xs text-muted-foreground mb-1">Base</p>
          <p className="text-sm font-medium">{baseValue}</p>
        </div>
        <div className="rounded-md bg-muted/40 p-2">
          <p className="text-xs text-muted-foreground mb-1">New</p>
          <p className="text-sm font-medium">{compareValue}</p>
        </div>
      </div>
    </div>
  );
}

function CategoryDistributionCard({ columnName, similarity, changes }: { 
  columnName: string; 
  similarity: string; 
  changes: CategoryChange[] 
}) {
  return (
    <div className="mb-4 rounded-lg border bg-card p-4 text-card-foreground shadow-sm">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-medium">{columnName}</h3>
        <Badge variant={parseInt(similarity) > 80 ? 'outline' : 'destructive'} className="text-xs">
          {similarity}% similar
        </Badge>
      </div>
      
      <div className="space-y-2">
        {changes.map((change, idx) => (
          <div key={idx} className="grid grid-cols-3 gap-1 text-sm">
            <div className="truncate" title={change.category}>
              {change.category}
            </div>
            <div className="text-center">
              {change.basePct}% → {change.comparePct}%
            </div>
            <div className={`text-right font-medium ${
              parseFloat(change.diff) > 0 
                ? 'text-green-600 dark:text-green-400' 
                : 'text-red-600 dark:text-red-400'
            }`}>
              {parseFloat(change.diff) > 0 ? '+' : ''}{change.diff}%
            </div>
          </div>
        ))}
      </div>
      
      {changes.length === 0 && (
        <p className="text-xs text-muted-foreground">No significant distribution changes</p>
      )}
    </div>
  );
}

function NumericDistributionCard({ columnName, changes }: {
  columnName: string;
  changes: NumericChanges;
}) {
  const hasChanges = Object.values(changes).some(val => val !== null && Math.abs(val as number) > 0.001);
  
  if (!hasChanges) return null;
  
  return (
    <div className="mb-4 rounded-lg border bg-card p-4 text-card-foreground shadow-sm">
      <h3 className="text-sm font-medium mb-3">{columnName}</h3>
      
      <div className="space-y-1">
        {changes.mean !== null && (
          <div className="flex justify-between text-sm">
            <span>Mean</span>
            <span className={`font-medium ${
              changes.mean > 0 
                ? 'text-green-600 dark:text-green-400' 
                : changes.mean < 0 
                  ? 'text-red-600 dark:text-red-400' 
                  : ''
            }`}>
              {changes.mean > 0 ? '+' : ''}{changes.mean.toFixed(2)}
            </span>
          </div>
        )}
        
        {changes.median !== null && (
          <div className="flex justify-between text-sm">
            <span>Median</span>
            <span className={`font-medium ${
              changes.median > 0 
                ? 'text-green-600 dark:text-green-400' 
                : changes.median < 0 
                  ? 'text-red-600 dark:text-red-400' 
                  : ''
            }`}>
              {changes.median > 0 ? '+' : ''}{changes.median.toFixed(2)}
            </span>
          </div>
        )}
        
        {changes.std !== null && (
          <div className="flex justify-between text-sm">
            <span>Standard Deviation</span>
            <span className={`font-medium ${
              changes.std > 0 
                ? 'text-amber-600 dark:text-amber-400' 
                : changes.std < 0 
                  ? 'text-blue-600 dark:text-blue-400' 
                  : ''
            }`}>
              {changes.std > 0 ? '+' : ''}{changes.std.toFixed(2)}
            </span>
          </div>
        )}
        
        {changes.min !== null && (
          <div className="flex justify-between text-sm">
            <span>Min</span>
            <span className={`font-medium ${
              changes.min > 0 
                ? 'text-green-600 dark:text-green-400' 
                : changes.min < 0 
                  ? 'text-red-600 dark:text-red-400' 
                  : ''
            }`}>
              {changes.min > 0 ? '+' : ''}{changes.min.toFixed(2)}
            </span>
          </div>
        )}
        
        {changes.max !== null && (
          <div className="flex justify-between text-sm">
            <span>Max</span>
            <span className={`font-medium ${
              changes.max > 0 
                ? 'text-green-600 dark:text-green-400' 
                : changes.max < 0 
                  ? 'text-red-600 dark:text-red-400' 
                  : ''
            }`}>
              {changes.max > 0 ? '+' : ''}{changes.max.toFixed(2)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function OutlierMissingCard({ columnName, columnType, missingChange, outliersChange }: {
  columnName: string;
  columnType: string;
  missingChange: number;
  outliersChange: number | null;
}) {
  return (
    <div className="mb-4 rounded-lg border bg-card p-4 text-card-foreground shadow-sm">
      <div className="flex justify-between items-center mb-3">
        <div>
          <h3 className="text-sm font-medium">{columnName}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{columnType} column</p>
        </div>
      </div>
      
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm">Missing Values:</span>
          <Badge variant={missingChange > 0 ? "destructive" : (missingChange < 0 ? "outline" : "secondary")} className={
            missingChange < 0 ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400" : ""
          }>
            {missingChange > 0 ? '+' : ''}{missingChange.toFixed(2)}%
          </Badge>
        </div>
        
        {outliersChange !== null && (
          <div className="flex items-center justify-between">
            <span className="text-sm">Outliers:</span>
            <Badge variant={outliersChange > 0 ? "destructive" : (outliersChange < 0 ? "outline" : "secondary")} className={
              outliersChange < 0 ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400" : ""
            }>
              {outliersChange > 0 ? '+' : ''}{outliersChange}
            </Badge>
          </div>
        )}
      </div>
    </div>
  );
}

// Sample a subset of data for large datasets
function sampleData(data: any[], maxSamples: number): any[] {
  if (data.length <= maxSamples) return data;
  
  const result = [];
  const step = Math.ceil(data.length / maxSamples);
  
  // Take evenly distributed samples
  for (let i = 0; i < data.length; i += step) {
    result.push(data[i]);
    if (result.length >= maxSamples) break;
  }
  
  return result;
} 