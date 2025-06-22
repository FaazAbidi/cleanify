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
          description="Measures duplicate records"
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
                          <li>Duplicate records found in the dataset</li>
                        )}
                        {consistencyScore < 80 && (
                          <li>Inconsistent data types across columns</li>
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
                    Remove or merge duplicate records
                  </li>
                )}
                {consistencyScore < 100 && (
                  <li>
                    Standardize data types and formats across columns
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
                    ))}
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
  // Calculate uniqueness based on the ratio of unique values to total values
  const totalCells = dataset.rows * dataset.columns.length;
  if (totalCells === 0) return 100;
  
  // Sum up unique values across all columns
  const totalUniqueValues = dataset.columns.reduce((sum, col) => {
    // For columns with unique values data, use that
    if (col.uniqueValues !== undefined) {
      return sum + col.uniqueValues;
    }
    // Otherwise estimate based on column type and missing values
    const nonMissingValues = dataset.rows - col.missingValues;
    if (col.type === 'categorical') {
      // Assume categorical columns have fewer unique values
      return sum + Math.min(nonMissingValues, Math.ceil(nonMissingValues * 0.8));
    } else if (col.type === 'numeric') {
      // Numeric columns typically have more unique values
      return sum + Math.min(nonMissingValues, Math.ceil(nonMissingValues * 0.95));
    } else {
      // Default assumption for other types
      return sum + Math.min(nonMissingValues, Math.ceil(nonMissingValues * 0.9));
    }
  }, 0);
  
  // Calculate uniqueness percentage
  return Math.round((totalUniqueValues / totalCells) * 100);
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
