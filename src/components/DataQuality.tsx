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
                <span className="text-sm text-gray-500">
                  {getQualityLabel(overallScore)}
                </span>
              </div>
              <Progress value={overallScore} className="h-2" />
            </div>
            
            {overallScore < 70 && (
              <div className="rounded-md bg-yellow-50 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <AlertCircle className="h-5 w-5 text-yellow-400" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800">
                      Data quality issues detected
                    </h3>
                    <div className="mt-2 text-sm text-yellow-700">
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
              <ul className="list-disc space-y-2 pl-5 text-sm">
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
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search columns..."
              className="pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          {displayedColumns.length === 0 ? (
            <div className="text-center py-4 text-gray-500">
              No columns found matching "{search}"
            </div>
          ) : (
            <div className="space-y-6">
              {displayedColumns.map((column) => (
                <div key={column.name} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{column.name}</span>
                    <span className="text-xs text-gray-500">{column.type}</span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span>Completeness</span>
                      <span>{100 - column.missingPercent}%</span>
                    </div>
                    <Progress 
                      value={100 - column.missingPercent} 
                      className="h-1"
                    />
                  </div>
                  {column.type === 'numeric' && column.skewness !== undefined && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span>Skewness</span>
                        <span className={column.isSkewed ? "text-amber-600 font-medium" : ""}>
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
              <div className="text-sm text-gray-500">
                Showing {startIdx + 1} to {Math.min(startIdx + columnsPerPage, filteredColumns.length)} of{" "}
                {filteredColumns.length} columns
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 text-sm rounded-md border disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1 text-sm rounded-md border disabled:opacity-50"
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
              <div className="text-sm text-gray-600">
                <p>Skewness measures how asymmetrical the distribution of values is in your numeric columns. 
                   High skewness (above 1 or below -1) indicates that your data might benefit from transformation before analysis.</p>
              </div>
              
              <div className="space-y-4">
                <h4 className="text-sm font-medium">Skewed Columns</h4>
                <div className="grid gap-4 md:grid-cols-2">
                  {dataset.columns
                    .filter(col => col.type === 'numeric' && col.skewness !== undefined && col.isSkewed)
                    .map(col => (
                      <div key={col.name} className="flex items-center p-3 bg-amber-50 rounded-md">
                        <div className="flex-1">
                          <div className="font-medium">{col.name}</div>
                          <div className="text-xs text-gray-500">
                            Skewness: {col.skewness ? col.skewness.toFixed(2) : 'N/A'}
                            {' '}
                            ({col.skewness && col.skewness > 0 ? 'Right-skewed' : 'Left-skewed'})
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
                
                {dataset.columns.filter(col => col.type === 'numeric' && col.skewness !== undefined && col.isSkewed).length === 0 && (
                  <div className="text-center py-4 text-gray-500">
                    No significantly skewed columns detected
                  </div>
                )}
              </div>
              
              <div className="space-y-4">
                <h4 className="text-sm font-medium">Recommendations</h4>
                <ul className="list-disc space-y-2 pl-5 text-sm">
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
            <div className="text-center py-4 text-gray-500">
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
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-center">
          <div className="text-2xl font-bold">{score}%</div>
          <div className="font-medium">{title}</div>
          <div className="mt-1 text-xs text-gray-500">{description}</div>
          <div className="mt-3">
            <Progress value={score} className="h-1" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

function calculateCompletenessScore(dataset: DatasetType): number {
  if (dataset.rows === 0) return 100;
  const totalCells = dataset.rows * dataset.columns.length;
  const missingCells = dataset.missingValuesCount;
  const score = Math.round(((totalCells - missingCells) / totalCells) * 100);
  return score;
}

function calculateUniquenessScore(dataset: DatasetType): number {
  if (dataset.rows === 0) return 100;
  const score = Math.round(((dataset.rows - dataset.duplicateRowsCount) / dataset.rows) * 100);
  return score;
}

function calculateConsistencyScore(dataset: DatasetType): number {
  // A simple consistency check - looking at mixed data types and potential conversion errors
  const columnTypeConsistency = dataset.columns.map((col) => {
    // If a column has mixed types (inferred as text), it might have consistency issues
    if (col.type === "text") {
      return 70; // Penalize slightly for text columns that could be more specific types
    }
    return 100;
  });
  
  const avgConsistency = columnTypeConsistency.reduce((sum, score) => sum + score, 0) / dataset.columns.length;
  return Math.round(avgConsistency);
}

function calculateAccuracyScore(dataset: DatasetType): number {
  const outlierScores = dataset.columns
    .filter((col) => col.type === "numeric" && col.outliers !== undefined)
    .map((col) => {
      const totalValues = dataset.rows - col.missingValues;
      if (totalValues === 0) return 100;
      const score = Math.round(((totalValues - (col.outliers || 0)) / totalValues) * 100);
      return score;
    });

  if (outlierScores.length === 0) return 90; // If no numeric columns, assume good accuracy
  
  const avgScore = outlierScores.reduce((sum, score) => sum + score, 0) / outlierScores.length;
  return Math.round(avgScore);
}

function getQualityLabel(score: number): string {
  if (score >= 90) return "Excellent";
  if (score >= 80) return "Good";
  if (score >= 70) return "Fair";
  if (score >= 50) return "Poor";
  return "Very Poor";
}
