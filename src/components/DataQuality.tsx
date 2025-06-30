import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { DatasetType } from "@/types/dataset";
import { AlertCircle, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface DataQualityProps {
  dataset: DatasetType;
}

export const DataQuality: React.FC<DataQualityProps> = ({ dataset }) => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const columnsPerPage = 8;
  
  const completenessScore = calculateCompletenessScore(dataset);
  const uniquenessScore = calculateUniquenessScore(dataset);
  const consistencyScore = calculateConsistencyScore(dataset);
  const accuracyScore = calculateAccuracyScore(dataset);
  const overallScore = Math.round((completenessScore + uniquenessScore + consistencyScore + accuracyScore) / 4);

  // Filter columns based on search
  const filteredColumns = dataset.columns.filter((column) =>
    column.name.toLowerCase().includes(search.toLowerCase())
  );
  
  // Calculate pagination for the filtered columns
  const totalPages = Math.ceil(filteredColumns.length / columnsPerPage);
  const startIdx = (page - 1) * columnsPerPage;
  const displayedColumns = filteredColumns.slice(startIdx, startIdx + columnsPerPage);
  
  // Reset to first page when search changes
  React.useEffect(() => {
    setPage(1);
  }, [search]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        <QualityCard 
          title="Completeness" 
          score={completenessScore}
          description="Measures missing values"
        />
        <QualityCard 
          title="Uniqueness" 
          score={uniquenessScore}
          description="Evaluates data diversity appropriately per column type"
        />
        <QualityCard 
          title="Consistency" 
          score={consistencyScore}
          description="Measures data type consistency"
        />
        <QualityCard 
          title="Accuracy" 
          score={accuracyScore}
          description="Detects potential outliers"
        />
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Overall Data Quality</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-8">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Quality score: {overallScore}%</span>
                <span className="text-sm text-muted-foreground">
                  {getQualityLabel(overallScore)}
                </span>
              </div>
              <Progress value={overallScore} className="h-2" />
            </div>
            
            {overallScore < 70 && (
              <div className="rounded-md bg-yellow-50 dark:bg-yellow-950/20 p-4 border border-yellow-200 dark:border-yellow-800">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <AlertCircle className="h-5 w-5 text-yellow-400 dark:text-yellow-300" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                      Data quality issues detected
                    </h3>
                    <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-200">
                      <ul className="list-disc space-y-1 pl-5">
                        {completenessScore < 80 && (
                          <li>High percentage of missing values detected</li>
                        )}
                        {uniquenessScore < 80 && (
                          <li>Data diversity issues detected (duplicates in key columns or inappropriate uniqueness levels)</li>
                        )}
                        {consistencyScore < 80 && (
                          <li>Inconsistent data types or mixed data types within columns</li>
                        )}
                        {accuracyScore < 80 && (
                          <li>Potential outliers detected in numeric columns</li>
                        )}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div className="space-y-4">
              <h4 className="text-sm font-medium">Recommendations</h4>
              <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
                {completenessScore < 100 && (
                  <li>
                    Handle missing values through imputation or removal
                  </li>
                )}
                {uniquenessScore < 100 && (
                  <li>
                    Address data diversity issues: remove duplicates in identifier columns, verify categorical distributions
                  </li>
                )}
                {consistencyScore < 100 && (
                  <li>
                    Standardize data types and formats across columns, and resolve mixed data types within individual columns
                  </li>
                )}
                {accuracyScore < 100 && (
                  <li>
                    Investigate and handle outliers in the dataset
                  </li>
                )}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Data Quality Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative mb-4">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search columns..."
              className="pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          {displayedColumns.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              No columns found matching "{search}"
            </div>
          ) : (
            <div className="space-y-6">
              {displayedColumns.map((column) => (
                <div key={column.name} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-foreground">{column.name}</span>
                    <span className="text-xs text-muted-foreground">{column.type}</span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Completeness</span>
                      <span className="text-foreground">{100 - column.missingPercent}%</span>
                    </div>
                    <Progress 
                      value={100 - column.missingPercent} 
                      className="h-1"
                    />
                  </div>
                  {column.type === 'numeric' && column.skewness !== undefined && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Skewness</span>
                        <span className={column.isSkewed ? "text-amber-600 dark:text-amber-400 font-medium" : "text-foreground"}>
                          {column.skewness.toFixed(2)} {column.isSkewed && "(Significant)"}
                        </span>
                      </div>
                    </div>
                  )}
                  {column.hasMixedTypes && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Data Type Consistency</span>
                        <span className="text-red-600 dark:text-red-400 font-medium">
                          Mixed Types ({((column.inconsistencyRatio || 0) * 100).toFixed(1)}% inconsistent)
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          
          {totalPages > 1 && (
            <div className="flex justify-between items-center mt-6">
              <div className="text-sm text-muted-foreground">
                Showing {startIdx + 1} to {Math.min(startIdx + columnsPerPage, filteredColumns.length)} of{" "}
                {filteredColumns.length} columns
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 text-sm border border-border rounded-md hover:bg-accent hover:text-accent-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="px-3 py-1 text-sm text-muted-foreground">
                  {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1 text-sm border border-border rounded-md hover:bg-accent hover:text-accent-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Data Skewness</CardTitle>
        </CardHeader>
        <CardContent>
          {dataset.columns.some(col => col.type === 'numeric' && col.skewness !== undefined) ? (
            <div className="space-y-6">
              <div className="text-sm text-muted-foreground">
                <p>Skewness measures how asymmetrical the distribution of values is in your numeric columns. 
                   High skewness (above 1 or below -1) indicates that your data might benefit from transformation before analysis.</p>
              </div>
              
              <div className="space-y-4">
                <h4 className="text-sm font-medium">Skewed Columns</h4>
                <div className="grid gap-4 md:grid-cols-2">
                  {dataset.columns
                    .filter(col => col.type === 'numeric' && col.skewness !== undefined && col.isSkewed)
                    .map(col => (
                      <div key={col.name} className="flex items-center p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-md">
                        <div className="flex-1">
                          <div className="font-medium text-foreground">{col.name}</div>
                          <div className="text-xs text-muted-foreground">
                            Skewness: {col.skewness ? col.skewness.toFixed(2) : 'N/A'}
                            {' '}
                            ({col.skewness && col.skewness > 0 ? 'Right-skewed' : 'Left-skewed'})
                          </div>
                        </div>
                      </div>
                    )                  )}
                </div>
                
                {dataset.columns.filter(col => col.type === 'numeric' && col.skewness !== undefined && col.isSkewed).length === 0 && (
                  <div className="text-center py-4 text-muted-foreground">
                    No significantly skewed columns detected
                  </div>
                )}
              </div>
              
              <div className="space-y-4">
                <h4 className="text-sm font-medium">Recommendations</h4>
                <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
                  <li>
                    For right-skewed data (positive skewness), try log transformation: log(x)
                  </li>
                  <li>
                    For left-skewed data (negative skewness), try exponential transformation: exp(x)
                  </li>
                  <li>
                    Consider square root transformation for moderately right-skewed data
                  </li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              Skewness information not available. Run the data analysis again to calculate skewness.
            </div>
          )}
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Data Type Consistency</CardTitle>
        </CardHeader>
        <CardContent>
          {dataset.columns.some(col => col.hasMixedTypes) ? (
            <div className="space-y-6">
              <div className="text-sm text-muted-foreground">
                <p>Mixed data types within a column can cause issues during analysis and modeling. 
                   These columns contain different types of values (e.g., both numbers and text) that should be standardized.</p>
              </div>
              
              <div className="space-y-4">
                <h4 className="text-sm font-medium">Columns with Mixed Data Types</h4>
                <div className="grid gap-4 md:grid-cols-1">
                  {dataset.columns
                    .filter(col => col.hasMixedTypes && col.typeBreakdown)
                    .map(col => (
                      <div key={col.name} className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-md">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="font-medium text-foreground">{col.name}</div>
                            <div className="text-xs text-red-600 dark:text-red-400 font-medium">
                              {((col.inconsistencyRatio || 0) * 100).toFixed(1)}% inconsistent
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Classified as: <span className="font-medium">{col.type}</span>
                          </div>
                          {col.typeBreakdown && (
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              {col.typeBreakdown.numeric > 0 && (
                                <div className="flex justify-between">
                                  <span>Numeric values:</span>
                                  <span className="font-medium">{col.typeBreakdown.numeric}</span>
                                </div>
                              )}
                              {col.typeBreakdown.string > 0 && (
                                <div className="flex justify-between">
                                  <span>Text values:</span>
                                  <span className="font-medium">{col.typeBreakdown.string}</span>
                                </div>
                              )}
                              {col.typeBreakdown.boolean > 0 && (
                                <div className="flex justify-between">
                                  <span>Boolean values:</span>
                                  <span className="font-medium">{col.typeBreakdown.boolean}</span>
                                </div>
                              )}
                              {col.typeBreakdown.null > 0 && (
                                <div className="flex justify-between">
                                  <span>Missing values:</span>
                                  <span className="font-medium">{col.typeBreakdown.null}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
                
                {dataset.columns.filter(col => col.hasMixedTypes).length === 0 && (
                  <div className="text-center py-4 text-muted-foreground">
                    No mixed data type columns detected
                  </div>
                )}
              </div>
              
              <div className="space-y-4">
                <h4 className="text-sm font-medium">Recommendations</h4>
                <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
                  <li>
                    <strong>Convert inconsistent values:</strong> Standardize the data type by converting all values to the same format
                  </li>
                  <li>
                    <strong>Handle numeric-in-text:</strong> If a categorical column contains mostly text but some numbers, convert numbers to text or vice versa
                  </li>
                  <li>
                    <strong>Clean data entry errors:</strong> Check if mixed types are due to data entry mistakes (e.g., "N/A" instead of empty cells)
                  </li>
                  <li>
                    <strong>Split columns:</strong> Consider splitting columns with fundamentally different data types into separate columns
                  </li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              All columns have consistent data types
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

interface QualityCardProps {
  title: string;
  score: number;
  description: string;
}

const QualityCard: React.FC<QualityCardProps> = ({ title, score, description }) => {
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600 dark:text-green-400";
    if (score >= 60) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className={`text-2xl font-bold ${getScoreColor(score)}`}>
            {score}%
          </div>
          <Progress value={score} className="h-2" />
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
};

function calculateCompletenessScore(dataset: DatasetType): number {
  const totalCells = dataset.rows * dataset.columns.length;
  const missingCells = dataset.columns.reduce((sum, col) => sum + col.missingValues, 0);
  return Math.round(((totalCells - missingCells) / totalCells) * 100);
}

function calculateUniquenessScore(dataset: DatasetType): number {
  if (dataset.columns.length === 0 || dataset.rows === 0) return 100;
  
  let totalScore = 0;
  let evaluatedColumns = 0;
  
  dataset.columns.forEach(col => {
    const nonMissingValues = dataset.rows - col.missingValues;
    if (nonMissingValues === 0) return; // Skip empty columns
    
    const uniqueRatio = col.uniqueValues / nonMissingValues;
    let columnScore = 100;
    
    // Different scoring logic based on data type
    switch (col.type) {
      case 'categorical':
        // For categorical: Good if reasonable number of categories (not too few, not too many)
        if (uniqueRatio < 0.01) {
          // Too few categories (< 1% unique) - might be data entry error
          columnScore = 60;
        } else if (uniqueRatio > 0.8) {
          // Too many categories (> 80% unique) - might be misclassified as categorical
          columnScore = 70;
        } else {
          // Good categorical distribution
          columnScore = 100;
        }
        break;
        
      case 'numeric':
        // For numeric: Higher uniqueness is generally better
        if (uniqueRatio > 0.9) {
          columnScore = 100; // Excellent uniqueness
        } else if (uniqueRatio > 0.7) {
          columnScore = 90;  // Good uniqueness
        } else if (uniqueRatio > 0.5) {
          columnScore = 80;  // Moderate uniqueness
        } else if (uniqueRatio > 0.3) {
          columnScore = 70;  // Low uniqueness
        } else {
          columnScore = 50;  // Very low uniqueness - potential duplicate issue
        }
        break;
        
      case 'text':
        // For text: Check if it looks like an identifier or free text
        const avgLength = col.uniqueValues > 0 ? nonMissingValues / col.uniqueValues : 0;
        
        if (col.name.toLowerCase().includes('id') || col.name.toLowerCase().includes('key')) {
          // Looks like an identifier - should be highly unique
          if (uniqueRatio > 0.95) {
            columnScore = 100;
          } else if (uniqueRatio > 0.8) {
            columnScore = 80;
          } else {
            columnScore = 40; // Duplicate IDs are bad!
          }
        } else {
          // Regular text column - moderate uniqueness expected
          if (uniqueRatio > 0.8) {
            columnScore = 100;
          } else if (uniqueRatio > 0.5) {
            columnScore = 90;
          } else if (uniqueRatio > 0.2) {
            columnScore = 80;
          } else {
            columnScore = 70; // Low uniqueness might be okay for text
          }
        }
        break;
        
      case 'boolean':
        // For boolean: Should have very few unique values (ideally 2)
        if (col.uniqueValues <= 2) {
          columnScore = 100; // Perfect for boolean
        } else if (col.uniqueValues <= 5) {
          columnScore = 80;  // Might be okay (true/false/null/maybe some text)
        } else {
          columnScore = 60;  // Too many values for boolean
        }
        break;
        
      case 'datetime':
        // For datetime: Higher uniqueness usually better (unless it's date categories)
        if (uniqueRatio > 0.7) {
          columnScore = 100;
        } else if (uniqueRatio > 0.5) {
          columnScore = 90;
        } else if (uniqueRatio > 0.3) {
          columnScore = 80;
        } else {
          columnScore = 75; // Many repeated dates might be intentional
        }
        break;
    }
    
    totalScore += columnScore;
    evaluatedColumns++;
  });
  
  return evaluatedColumns > 0 ? Math.round(totalScore / evaluatedColumns) : 100;
}

function calculateConsistencyScore(dataset: DatasetType): number {
  if (dataset.columns.length === 0) return 100;
  
  let consistencyScore = 0;
  
  // Check data type consistency for each column
  dataset.columns.forEach(col => {
    let columnScore = 100; // Start with perfect score
    
    // Penalize high missing values (inconsistency in data presence)
    if (col.missingPercent > 50) {
      columnScore -= 30;
    } else if (col.missingPercent > 20) {
      columnScore -= 15;
    } else if (col.missingPercent > 10) {
      columnScore -= 5;
    }
    
    // **NEW**: Check for mixed data types within the column
    if (col.hasMixedTypes && col.inconsistencyRatio !== undefined) {
      // More aggressive penalty system to ensure visibility in overall score
      if (col.inconsistencyRatio > 0.3) {
        columnScore -= 50; // Severe inconsistency (>30% minority types)
      } else if (col.inconsistencyRatio > 0.2) {
        columnScore -= 35; // Major inconsistency (>20% minority types)  
      } else if (col.inconsistencyRatio > 0.1) {
        columnScore -= 25; // Moderate inconsistency (>10% minority types)
      } else if (col.inconsistencyRatio > 0.05) {
        columnScore -= 20; // Minor inconsistency (>5% minority types)
      } else if (col.inconsistencyRatio > 0.01) {
        columnScore -= 15; // Small inconsistency (>1% minority types)
      } else {
        columnScore -= 10; // Very minor inconsistency (any mixed types)
      }
    }
    
    // For categorical columns, check if they have reasonable number of categories
    if (col.type === 'categorical' && col.uniqueValues !== undefined) {
      const categoryRatio = col.uniqueValues / dataset.rows;
      if (categoryRatio > 0.8) {
        // Too many categories for a categorical column (might be misclassified)
        columnScore -= 20;
      }
    }
    
    // For numeric columns, check for reasonable distribution
    if (col.type === 'numeric' && col.outliers !== undefined) {
      const outlierRatio = col.outliers / dataset.rows;
      if (outlierRatio > 0.2) {
        // High outlier percentage suggests inconsistent data
        columnScore -= 15;
      }
    }
    
    // Ensure score doesn't go below 0
    columnScore = Math.max(0, columnScore);
    consistencyScore += columnScore;
  });
  
  // Return average consistency score across all columns
  return Math.round(consistencyScore / dataset.columns.length);
}

function calculateAccuracyScore(dataset: DatasetType): number {
  if (dataset.columns.length === 0 || dataset.rows === 0) return 100;
  
  let totalAccuracyScore = 0;
  let evaluatedColumns = 0;
  
  dataset.columns.forEach(col => {
    let columnAccuracy = 100; // Start with perfect accuracy
    
    // Check for outliers in numeric columns
    if (col.type === 'numeric' && col.outliers !== undefined) {
      const outlierRatio = col.outliers / dataset.rows;
      // Penalize based on outlier percentage
      if (outlierRatio > 0.15) {
        columnAccuracy -= 25; // Significant outlier presence
      } else if (outlierRatio > 0.1) {
        columnAccuracy -= 15;
      } else if (outlierRatio > 0.05) {
        columnAccuracy -= 8;
      }
      evaluatedColumns++;
    }
    
    // Check for extreme skewness in numeric columns (indicates potential data issues)
    if (col.type === 'numeric' && col.skewness !== undefined) {
      const absSkewness = Math.abs(col.skewness);
      if (absSkewness > 3) {
        columnAccuracy -= 15; // Very high skewness
      } else if (absSkewness > 2) {
        columnAccuracy -= 10;
      } else if (absSkewness > 1.5) {
        columnAccuracy -= 5;
      }
      evaluatedColumns++;
    }
    
    // Check for reasonable unique value ratios in categorical columns
    if (col.type === 'categorical' && col.uniqueValues !== undefined) {
      const uniqueRatio = col.uniqueValues / (dataset.rows - col.missingValues);
      // If almost every value is unique in a categorical column, it might indicate data issues
      if (uniqueRatio > 0.95) {
        columnAccuracy -= 20;
      } else if (uniqueRatio > 0.9) {
        columnAccuracy -= 10;
      }
      evaluatedColumns++;
    }
    
    // Penalize high missing values as they affect accuracy
    if (col.missingPercent > 30) {
      columnAccuracy -= 15;
    } else if (col.missingPercent > 15) {
      columnAccuracy -= 8;
    } else if (col.missingPercent > 5) {
      columnAccuracy -= 3;
    }
    
    // Ensure score doesn't go below 0
    columnAccuracy = Math.max(0, columnAccuracy);
    totalAccuracyScore += columnAccuracy;
  });
  
  // If no columns were evaluated for specific accuracy metrics, 
  // base score on general data completeness
  if (evaluatedColumns === 0) {
    const completenessScore = calculateCompletenessScore(dataset);
    return Math.max(85, completenessScore); // Assume good accuracy if data is complete
  }
  
  return Math.round(totalAccuracyScore / dataset.columns.length);
}

function getQualityLabel(score: number): string {
  if (score >= 90) return "Excellent";
  if (score >= 80) return "Good";
  if (score >= 70) return "Fair";
  if (score >= 60) return "Poor";
  return "Very Poor";
}
