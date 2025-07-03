import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { DatasetType } from "@/types/dataset";
import { AlertCircle, Search, Filter, TrendingUp, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface DataQualityProps {
  dataset: DatasetType;
}

export const DataQuality: React.FC<DataQualityProps> = ({ dataset }) => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [skewnessPage, setSkewnessPage] = useState(1);
  const [skewnessSearch, setSkewnessSearch] = useState("");
  const [consistencyPage, setConsistencyPage] = useState(1);
  const [consistencySearch, setConsistencySearch] = useState("");
  const [skewnessFilter, setSkewnessFilter] = useState<string>("all"); // all, significant, moderate
  const [consistencyFilter, setConsistencyFilter] = useState<string>("all"); // all, high, moderate, low
  
  const columnsPerPage = 8;
  const itemsPerPage = 12; // For skewness and consistency sections
  
  const completenessScore = calculateCompletenessScore(dataset);
  const uniquenessScore = calculateUniquenessScore(dataset);
  const consistencyScore = calculateConsistencyScore(dataset);
  const accuracyScore = calculateAccuracyScore(dataset);
  const overallScore = Math.round((completenessScore + uniquenessScore + consistencyScore + accuracyScore) / 4);

  // Calculate summary statistics for large datasets
  const skewedColumns = dataset.columns.filter(col => 
    col.type === 'QUANTITATIVE' && col.skewness !== undefined && col.isSkewed
  );
  const highlySkewedColumns = skewedColumns.filter(col => 
    Math.abs(col.skewness || 0) > 2
  );
  const inconsistentColumns = dataset.columns.filter(col => col.hasMixedTypes);
  const highlyInconsistentColumns = inconsistentColumns.filter(col => 
    (col.inconsistencyRatio || 0) > 0.2
  );

  // Filter and paginate skewed columns
  const getFilteredSkewedColumns = () => {
    let filtered = skewedColumns.filter(col =>
      col.name.toLowerCase().includes(skewnessSearch.toLowerCase())
    );

    if (skewnessFilter === "significant") {
      filtered = filtered.filter(col => Math.abs(col.skewness || 0) > 2);
    } else if (skewnessFilter === "moderate") {
      filtered = filtered.filter(col => Math.abs(col.skewness || 0) > 1 && Math.abs(col.skewness || 0) <= 2);
    }

    return filtered;
  };

  // Filter and paginate inconsistent columns
  const getFilteredInconsistentColumns = () => {
    let filtered = inconsistentColumns.filter(col =>
      col.name.toLowerCase().includes(consistencySearch.toLowerCase())
    );

    if (consistencyFilter === "high") {
      filtered = filtered.filter(col => (col.inconsistencyRatio || 0) > 0.2);
    } else if (consistencyFilter === "moderate") {
      filtered = filtered.filter(col => (col.inconsistencyRatio || 0) > 0.1 && (col.inconsistencyRatio || 0) <= 0.2);
    } else if (consistencyFilter === "low") {
      filtered = filtered.filter(col => (col.inconsistencyRatio || 0) <= 0.1);
    }

    return filtered;
  };

  const filteredSkewedColumns = getFilteredSkewedColumns();
  const filteredInconsistentColumns = getFilteredInconsistentColumns();

  // Filter columns based on search
  const filteredColumns = dataset.columns.filter(column =>
    (column.originalName || column.name).toLowerCase().includes(search.toLowerCase())
  );
  
  // Calculate pagination for the filtered columns
  const totalPages = Math.ceil(filteredColumns.length / columnsPerPage);
  const startIdx = (page - 1) * columnsPerPage;
  const displayedColumns = filteredColumns.slice(startIdx, startIdx + columnsPerPage);
  
  // Pagination for skewness section
  const skewnessTotalPages = Math.ceil(filteredSkewedColumns.length / itemsPerPage);
  const skewnessStartIdx = (skewnessPage - 1) * itemsPerPage;
  const displayedSkewedColumns = filteredSkewedColumns.slice(skewnessStartIdx, skewnessStartIdx + itemsPerPage);

  // Pagination for consistency section
  const consistencyTotalPages = Math.ceil(filteredInconsistentColumns.length / itemsPerPage);
  const consistencyStartIdx = (consistencyPage - 1) * itemsPerPage;
  const displayedInconsistentColumns = filteredInconsistentColumns.slice(consistencyStartIdx, consistencyStartIdx + itemsPerPage);
  
  // Reset to first page when search changes
  React.useEffect(() => {
    setPage(1);
  }, [search]);

  React.useEffect(() => {
    setSkewnessPage(1);
  }, [skewnessSearch, skewnessFilter]);

  React.useEffect(() => {
    setConsistencyPage(1);
  }, [consistencySearch, consistencyFilter]);

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

      {/* Summary Statistics for Large Datasets */}
      {dataset.columns.length > 100 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Data Quality Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
                <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                  {skewedColumns.length}
                </div>
                <div className="text-xs text-muted-foreground">Skewed Columns</div>
                <div className="text-xs text-amber-600 dark:text-amber-400">
                  {highlySkewedColumns.length} highly skewed
                </div>
              </div>
              <div className="text-center p-3 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {inconsistentColumns.length}
                </div>
                <div className="text-xs text-muted-foreground">Mixed Type Columns</div>
                <div className="text-xs text-red-600 dark:text-red-400">
                  {highlyInconsistentColumns.length} highly inconsistent
                </div>
              </div>
              <div className="text-center p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {dataset.columns.filter(col => col.type === 'QUANTITATIVE').length}
                </div>
                <div className="text-xs text-muted-foreground">Quantitative Columns</div>
              </div>
              <div className="text-center p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {dataset.columns.filter(col => col.type === 'QUALITATIVE').length}
                </div>
                <div className="text-xs text-muted-foreground">Qualitative Columns</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
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
                          <li>Inconsistent data types or mixed data types within columns ({inconsistentColumns.length} columns affected)</li>
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
                    Standardize data types and formats across columns ({inconsistentColumns.length} columns need attention)
                  </li>
                )}
                {accuracyScore < 100 && (
                  <li>
                    Investigate and handle outliers in the dataset
                  </li>
                )}
                {skewedColumns.length > 0 && (
                  <li>
                    Consider applying skewness transformations to {skewedColumns.length} skewed columns
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
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground" title={column.name}>
                        {column.originalName || column.name}
                      </span>
                      {column.originalName && column.originalName !== column.name && (
                        <Badge variant="outline" className="text-xs">
                          ID: {column.name}
                        </Badge>
                      )}
                    </div>
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
                  {column.type === 'QUANTITATIVE' && column.skewness !== undefined && (
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
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Data Skewness
          </CardTitle>
        </CardHeader>
        <CardContent>
          {skewedColumns.length > 0 ? (
            <div className="space-y-6">
              <div className="text-sm text-muted-foreground">
                <p>Skewness measures how asymmetrical the distribution of values is in your quantitative columns. 
                   High skewness (above 1 or below -1) indicates that your data might benefit from transformation before analysis.</p>
              </div>

              {/* Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="text-center p-2 bg-amber-50 dark:bg-amber-950/20 rounded border border-amber-200 dark:border-amber-800">
                  <div className="text-lg font-bold text-amber-600 dark:text-amber-400">{skewedColumns.length}</div>
                  <div className="text-xs text-muted-foreground">Total Skewed</div>
                </div>
                <div className="text-center p-2 bg-orange-50 dark:bg-orange-950/20 rounded border border-orange-200 dark:border-orange-800">
                  <div className="text-lg font-bold text-orange-600 dark:text-orange-400">{highlySkewedColumns.length}</div>
                                     <div className="text-xs text-muted-foreground">Highly Skewed ({'>'}2)</div>
                </div>
                <div className="text-center p-2 bg-blue-50 dark:bg-blue-950/20 rounded border border-blue-200 dark:border-blue-800">
                  <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                    {skewedColumns.filter(col => (col.skewness || 0) > 0).length}
                  </div>
                  <div className="text-xs text-muted-foreground">Right Skewed</div>
                </div>
                <div className="text-center p-2 bg-purple-50 dark:bg-purple-950/20 rounded border border-purple-200 dark:border-purple-800">
                  <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
                    {skewedColumns.filter(col => (col.skewness || 0) < 0).length}
                  </div>
                  <div className="text-xs text-muted-foreground">Left Skewed</div>
                </div>
              </div>

              {/* Controls */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search skewed columns..."
                    className="pl-8"
                    value={skewnessSearch}
                    onChange={(e) => setSkewnessSearch(e.target.value)}
                  />
                </div>
                <Select value={skewnessFilter} onValueChange={setSkewnessFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by severity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Skewed ({skewedColumns.length})</SelectItem>
                    <SelectItem value="significant">Highly Skewed ({highlySkewedColumns.length})</SelectItem>
                    <SelectItem value="moderate">Moderately Skewed ({skewedColumns.filter(col => Math.abs(col.skewness || 0) > 1 && Math.abs(col.skewness || 0) <= 2).length})</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-4">
                <h4 className="text-sm font-medium">
                  Skewed Columns 
                  {filteredSkewedColumns.length !== skewedColumns.length && (
                    <span className="text-muted-foreground ml-2">
                      ({filteredSkewedColumns.length} of {skewedColumns.length})
                    </span>
                  )}
                </h4>
                
                {filteredSkewedColumns.length > 0 ? (
                  <>
                    <div className="grid gap-4 md:grid-cols-2">
                      {displayedSkewedColumns.map((col) => (
                        <div key={col.name} className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-md">
                          <div className="flex-1">
                            <div className="font-medium text-foreground">{col.name}</div>
                            <div className="text-xs text-muted-foreground">
                              Skewness: {col.skewness ? col.skewness.toFixed(2) : 'N/A'}
                              {' '}
                              ({col.skewness && col.skewness > 0 ? 'Right-skewed' : 'Left-skewed'})
                            </div>
                          </div>
                          <Badge variant={Math.abs(col.skewness || 0) > 2 ? "destructive" : "secondary"} className="text-xs">
                            {Math.abs(col.skewness || 0) > 2 ? "High" : "Moderate"}
                          </Badge>
                        </div>
                      ))}
                    </div>
                    
                    {/* Pagination for skewness */}
                    {skewnessTotalPages > 1 && (
                      <div className="flex justify-between items-center mt-4">
                        <div className="text-sm text-muted-foreground">
                          Showing {skewnessStartIdx + 1} to {Math.min(skewnessStartIdx + itemsPerPage, filteredSkewedColumns.length)} of {filteredSkewedColumns.length} columns
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSkewnessPage(p => Math.max(1, p - 1))}
                            disabled={skewnessPage === 1}
                          >
                            Previous
                          </Button>
                          <span className="px-3 py-1 text-sm text-muted-foreground">
                            {skewnessPage} of {skewnessTotalPages}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSkewnessPage(p => Math.min(skewnessTotalPages, p + 1))}
                            disabled={skewnessPage === skewnessTotalPages}
                          >
                            Next
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    No skewed columns found matching current filters
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
                  <li>
                    Use the Preprocessing tab to apply skewness transformations automatically
                  </li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              {dataset.columns.some(col => col.type === 'QUANTITATIVE' && col.skewness !== undefined) 
                ? "No significantly skewed columns detected" 
                : "Skewness information not available. Run the data analysis again to calculate skewness."
              }
            </div>
          )}
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Data Type Consistency
          </CardTitle>
        </CardHeader>
        <CardContent>
          {inconsistentColumns.length > 0 ? (
            <div className="space-y-6">
              <div className="text-sm text-muted-foreground">
                <p>Data type consistency measures how uniform the data types are within each column. 
                   Mixed data types can cause issues during analysis and modeling.</p>
              </div>

              {/* Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="text-center p-2 bg-red-50 dark:bg-red-950/20 rounded border border-red-200 dark:border-red-800">
                  <div className="text-lg font-bold text-red-600 dark:text-red-400">{inconsistentColumns.length}</div>
                  <div className="text-xs text-muted-foreground">Total Mixed</div>
                </div>
                <div className="text-center p-2 bg-orange-50 dark:bg-orange-950/20 rounded border border-orange-200 dark:border-orange-800">
                  <div className="text-lg font-bold text-orange-600 dark:text-orange-400">{highlyInconsistentColumns.length}</div>
                                     <div className="text-xs text-muted-foreground">Highly Mixed ({'>'}20%)</div>
                </div>
                <div className="text-center p-2 bg-yellow-50 dark:bg-yellow-950/20 rounded border border-yellow-200 dark:border-yellow-800">
                  <div className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
                    {inconsistentColumns.filter(col => (col.inconsistencyRatio || 0) > 0.1 && (col.inconsistencyRatio || 0) <= 0.2).length}
                  </div>
                  <div className="text-xs text-muted-foreground">Moderate (10-20%)</div>
                </div>
                <div className="text-center p-2 bg-blue-50 dark:bg-blue-950/20 rounded border border-blue-200 dark:border-blue-800">
                  <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                    {inconsistentColumns.filter(col => (col.inconsistencyRatio || 0) <= 0.1).length}
                  </div>
                  <div className="text-xs text-muted-foreground">Low (≤10%)</div>
                </div>
              </div>

              {/* Controls */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search inconsistent columns..."
                    className="pl-8"
                    value={consistencySearch}
                    onChange={(e) => setConsistencySearch(e.target.value)}
                  />
                </div>
                <Select value={consistencyFilter} onValueChange={setConsistencyFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by severity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Mixed ({inconsistentColumns.length})</SelectItem>
                    <SelectItem value="high">High {'>'}20% ({highlyInconsistentColumns.length})</SelectItem>
                    <SelectItem value="moderate">Moderate 10-20% ({inconsistentColumns.filter(col => (col.inconsistencyRatio || 0) > 0.1 && (col.inconsistencyRatio || 0) <= 0.2).length})</SelectItem>
                    <SelectItem value="low">Low ≤10% ({inconsistentColumns.filter(col => (col.inconsistencyRatio || 0) <= 0.1).length})</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-4">
                <h4 className="text-sm font-medium">
                  Columns with Mixed Data Types
                  {filteredInconsistentColumns.length !== inconsistentColumns.length && (
                    <span className="text-muted-foreground ml-2">
                      ({filteredInconsistentColumns.length} of {inconsistentColumns.length})
                    </span>
                  )}
                </h4>
                
                {filteredInconsistentColumns.length > 0 ? (
                  <>
                    <div className="space-y-3">
                      {displayedInconsistentColumns.map((col) => (
                        <div key={col.name} className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-md">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="font-medium text-foreground">{col.name}</div>
                              <div className="flex items-center gap-2">
                                <Badge 
                                  variant={
                                    (col.inconsistencyRatio || 0) > 0.2 ? "destructive" : 
                                    (col.inconsistencyRatio || 0) > 0.1 ? "secondary" : "outline"
                                  } 
                                  className="text-xs"
                                >
                                  {((col.inconsistencyRatio || 0) * 100).toFixed(1)}% inconsistent
                                </Badge>
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
                    
                    {/* Pagination for consistency */}
                    {consistencyTotalPages > 1 && (
                      <div className="flex justify-between items-center mt-4">
                        <div className="text-sm text-muted-foreground">
                          Showing {consistencyStartIdx + 1} to {Math.min(consistencyStartIdx + itemsPerPage, filteredInconsistentColumns.length)} of {filteredInconsistentColumns.length} columns
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setConsistencyPage(p => Math.max(1, p - 1))}
                            disabled={consistencyPage === 1}
                          >
                            Previous
                          </Button>
                          <span className="px-3 py-1 text-sm text-muted-foreground">
                            {consistencyPage} of {consistencyTotalPages}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setConsistencyPage(p => Math.min(consistencyTotalPages, p + 1))}
                            disabled={consistencyPage === consistencyTotalPages}
                          >
                            Next
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    No mixed type columns found matching current filters
                  </div>
                )}
              </div>
              
              <div className="space-y-4">
                <h4 className="text-sm font-medium">Recommendations</h4>
                <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
                  <li>
                                         Review columns with high inconsistency ratios ({'>'}20%) first
                  </li>
                  <li>
                    Consider data cleaning to standardize formats within columns
                  </li>
                  <li>
                    Use the Preprocessing tab to handle data type inconsistencies
                  </li>
                  <li>
                    For identifier columns, ensure all values follow the same format
                  </li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              No mixed data type columns detected. All columns have consistent data types.
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
      case 'QUALITATIVE':
        // For qualitative: Good if reasonable number of categories (not too few, not too many)
        if (uniqueRatio < 0.01) {
          // Too few categories (< 1% unique) - might be data entry error
          columnScore = 60;
        } else if (uniqueRatio > 0.8) {
          // Too many categories (> 80% unique) - might be misclassified as qualitative
          columnScore = 70;
        } else {
          // Good qualitative distribution
          columnScore = 100;
        }
        
        // Special handling for identifier-like columns
        if (col.name.toLowerCase().includes('id') || col.name.toLowerCase().includes('key')) {
          // Looks like an identifier - should be highly unique
          if (uniqueRatio > 0.95) {
            columnScore = 100;
          } else if (uniqueRatio > 0.8) {
            columnScore = 80;
          } else {
            columnScore = 40; // Duplicate IDs are bad!
          }
        }
        
        // Handle boolean-like qualitative columns
        if (col.uniqueValues <= 2) {
          columnScore = 100; // Perfect for boolean/binary qualitative
        } else if (col.uniqueValues <= 5) {
          columnScore = 90;  // Good for small categorical sets
        }
        break;
        
      case 'QUANTITATIVE':
        // For quantitative: Higher uniqueness is generally better
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
    
    // For qualitative columns, check if they have reasonable number of categories
    if (col.type === 'QUALITATIVE' && col.uniqueValues !== undefined) {
      const categoryRatio = col.uniqueValues / dataset.rows;
      if (categoryRatio > 0.8) {
        // Too many categories for a qualitative column (might be misclassified)
        columnScore -= 20;
      }
    }
    
    // For quantitative columns, check for reasonable distribution
    if (col.type === 'QUANTITATIVE' && col.outliers !== undefined) {
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
    
    // Check for outliers in quantitative columns
    if (col.type === 'QUANTITATIVE' && col.outliers !== undefined) {
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
    
    // Check for extreme skewness in quantitative columns (indicates potential data issues)
    if (col.type === 'QUANTITATIVE' && col.skewness !== undefined) {
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
    
    // Check for reasonable unique value ratios in qualitative columns
    if (col.type === 'QUALITATIVE' && col.uniqueValues !== undefined) {
      const uniqueRatio = col.uniqueValues / dataset.rows;
      
      // For qualitative data, very high uniqueness might indicate misclassification
      if (uniqueRatio > 0.9 && !col.name.toLowerCase().includes('id') && !col.name.toLowerCase().includes('key')) {
        columnAccuracy -= 10; // Might be misclassified as qualitative
      }
      evaluatedColumns++;
    }
    
    // Ensure accuracy doesn't go below 0
    columnAccuracy = Math.max(0, columnAccuracy);
    totalAccuracyScore += columnAccuracy;
  });
  
  // If no columns were evaluated for accuracy, assume perfect accuracy
  return evaluatedColumns > 0 ? Math.round(totalAccuracyScore / evaluatedColumns) : 100;
}

function getQualityLabel(score: number): string {
  if (score >= 90) return "Excellent";
  if (score >= 80) return "Good";
  if (score >= 70) return "Fair";
  if (score >= 60) return "Poor";
  return "Very Poor";
}
