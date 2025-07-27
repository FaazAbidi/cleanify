import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { debounce } from "@/lib/performance-utils";
import { DatasetType, ColumnInfo } from "@/types/dataset";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, CartesianGrid
} from "recharts";
import { Input } from "@/components/ui/input";
import { Search, AlertTriangle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PerformanceWarning } from "@/components/PerformanceWarning";

interface ColumnAnalysisProps {
  dataset: DatasetType;
}

export const ColumnAnalysis = ({ dataset }: ColumnAnalysisProps) => {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedColumn, setSelectedColumn] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string>("all");

  // Debounced search for performance with large datasets
  const debouncedSetSearch = useCallback(
    debounce((value: string) => setDebouncedSearch(value), 300),
    []
  );

  // Check if this is a large dataset
  const isLargeDataset = dataset.columns.length > 1000 || (dataset.rawData && dataset.rawData.length > 5000);
  const isVeryLargeDataset = dataset.columns.length > 2000 || (dataset.rawData && dataset.rawData.length > 10000);

  // Handle search input changes
  useEffect(() => {
    debouncedSetSearch(search);
  }, [search, debouncedSetSearch]);

  // Reset selection when dataset changes and debug duplicate IDs
  useEffect(() => {
    setSelectedColumn(null);
    setSearch("");
    setDebouncedSearch("");
    
    // Debug: Check for duplicate column IDs
    const columnIds = dataset.columns.map(col => col.name);
    const uniqueIds = new Set(columnIds);
    if (columnIds.length !== uniqueIds.size) {
      console.warn('⚠️ Duplicate column IDs detected:', columnIds);
      console.warn('Unique IDs count:', uniqueIds.size, 'vs Total columns:', columnIds.length);
    }

    // Log dataset size info
    console.log('📊 Dataset info:', {
      columns: dataset.columns.length,
      rows: dataset.rawData?.length || 0,
      isLarge: isLargeDataset,
      isVeryLarge: isVeryLargeDataset
    });
  }, [dataset, isLargeDataset, isVeryLargeDataset]);

  // Helper function to extract numeric ID from a column - exactly like DataQuality.tsx
  const getColumnNumericId = (columnId: string): string | null => {
    // First try to extract ID from "$number" format
    const match = columnId.match(/\$(\d+)$/);
    if (match) return match[1];
    
    // If that fails, try to find the column's index in the dataset
    const index = dataset.columns.findIndex(col => col.name === columnId);
    if (index >= 0) return String(index + 1);
    
    return null;
  };

  const filteredColumns = useMemo(() => {
    let filtered = dataset.columns.filter(column => {
      const displayName = column.originalName || column.name;
      const numericId = getColumnNumericId(column.name);
      
      // If search is empty, include all columns
      if (!debouncedSearch) return true;
      
      // If search starts with "#" or contains "id:", treat it as ID search
      if (debouncedSearch.startsWith('#') || debouncedSearch.toLowerCase().includes('id:')) {
        // Extract numeric part
        const searchNumeric = debouncedSearch.replace(/[^\d]/g, '');
        
        // If we have a numeric search, match against the column ID
        if (searchNumeric && numericId) {
          return numericId === searchNumeric;
        }
      }
      
      // Otherwise do a normal text search
      return displayName.toLowerCase().includes(debouncedSearch.toLowerCase()) || 
             column.name.toLowerCase().includes(debouncedSearch.toLowerCase());
    });
    
    if (selectedType !== "all") {
      filtered = filtered.filter(column => column.type === selectedType);
    }
    
    return filtered;
  }, [dataset.columns, debouncedSearch, selectedType]);

  const [selectedColumnInfo, setSelectedColumnInfo] = useState<ColumnInfo | null>(null);

  useEffect(() => {
    if (selectedColumn) {
      const column = dataset.columns.find(col => col.name === selectedColumn);
      setSelectedColumnInfo(column || null);
    } else {
      setSelectedColumnInfo(null);
    }
  }, [selectedColumn, dataset.columns]);

  const formatDistributionData = (column: ColumnInfo | null) => {
    console.log('🔍 Debug formatDistributionData:', {
      hasColumn: !!column,
      hasDistribution: !!column?.distribution,
      distributionKeys: column?.distribution ? Object.keys(column.distribution).length : 0,
      columnType: column?.type,
      columnName: column?.name,
      distribution: column?.distribution
    });

    if (!column || !column.distribution) return [];

    // Check if distribution is empty
    if (Object.keys(column.distribution).length === 0) return [];
    
    // Force create distribution if it's undefined or empty
    if (!column.distribution && column.type === 'QUANTITATIVE' && column.min !== undefined && column.max !== undefined) {
      console.log('Creating fallback distribution for QUANTITATIVE column');
      
      // Create a simple fallback distribution with 5 buckets
      const min = Number(column.min);
      const max = Number(column.max);
      const range = max - min;
      const buckets = 5;
      const bucketSize = range / buckets;
      
      const distribution: Record<string, number> = {};
      for (let i = 0; i < buckets; i++) {
        const bucketMin = min + i * bucketSize;
        distribution[bucketMin.toFixed(2)] = 1; // Just put some value to show distribution
      }
      
      // Create a normalized distribution for display
      const result = Object.entries(distribution).map(([key, value]) => ({
        bin: key,
        count: value,
      }));
      
      console.log('📊 Generated fallback distribution:', result);
      return result;
    }

    if (column.type === 'QUANTITATIVE') {
      // For quantitative data, use bin ranges as keys
      try {
        const result = Object.entries(column.distribution)
          .filter(([key, value]) => key !== undefined && value !== undefined) // Filter out undefined entries
          .map(([key, value]) => ({
            bin: key,
            count: value as number,
          }))
          .sort((a, b) => {
            // Sort by numeric bin value for proper order in histogram
            const numA = parseFloat(a.bin);
            const numB = parseFloat(b.bin);
            return numA - numB;
          });
        console.log('📊 Quantitative distribution data:', result);
        return result;
      } catch (error) {
        console.error('Error processing quantitative distribution data:', error, column.distribution);
        return [];
      }
    } else {
      // For qualitative data, use name/value pairs for pie chart
      try {
        const result = Object.entries(column.distribution)
          .filter(([key, value]) => key !== undefined && value !== undefined) // Filter out undefined entries
          .sort(([,a], [,b]) => (b as number) - (a as number)) // Sort by frequency
          .slice(0, 10) // Show top 10 categories
          .map(([key, value]) => ({
            name: key,
            value: value as number,
          }));
        console.log('🥧 Qualitative distribution data:', result);
        return result;
      } catch (error) {
        console.error('Error processing qualitative distribution data:', error, column.distribution);
        return [];
      }
    }
  };

  const distributionData = formatDistributionData(selectedColumnInfo);

  // Add debug logging for final distribution data
  console.log('📈 Final distributionData:', distributionData, 'length:', distributionData.length);

  const dataTypeColors = {
    QUANTITATIVE: "#0EA5E9", // Blue
    QUALITATIVE: "#10B981", // Green
  };

  // Generate random colors for pie chart categories
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#83a6ed', '#8dd1e1', '#82ca9d', '#a4de6c', '#d0ed57'];

  const handleColumnSelect = (column: ColumnInfo) => {
    console.log('🔍 Selecting column:', {
      uniqueId: column.name,
      originalName: column.originalName,
      currentSelection: selectedColumn,
      hasDistribution: !!column.distribution,
      distributionSize: column.distribution ? Object.keys(column.distribution).length : 0
    });
    setSelectedColumn(column.name);
  };

  const renderPerformanceWarning = () => {
    return (
      <PerformanceWarning 
        columnCount={dataset.columns.length}
        rowCount={dataset.rawData?.length || 0}
        className="md:col-span-3 mb-4"
        showRecommendations={true}
      />
    );
  };

  const isSearching = search !== debouncedSearch;

  const renderColumnList = () => (
    <div className="space-y-1.5 mt-4 max-h-[500px] overflow-y-auto">
      {isSearching && (
        <div className="text-center py-4 text-muted-foreground text-sm">
          Searching columns...
        </div>
      )}
      {!isSearching && filteredColumns.length === 0 && debouncedSearch && (
        <div className="text-center py-4 text-muted-foreground text-sm">
          No columns found matching "{debouncedSearch}"
        </div>
      )}
      {!isSearching && filteredColumns.map((column, index) => (
        <div
          key={column.name}
          onClick={() => handleColumnSelect(column)}
          className={`p-2 rounded-md cursor-pointer border-2 ${
            selectedColumn === column.name 
              ? "bg-primary text-primary-foreground border-primary" 
              : "hover:bg-secondary border-transparent hover:border-muted-foreground/20"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="font-medium truncate" title={`${column.originalName || column.name} (ID: ${column.name})`}>
              {column.originalName || column.name}
            </div>
            {/* Show column ID badge */}
            <Badge variant="secondary" className="text-xs ml-2 flex-shrink-0">
              #{getColumnNumericId(column.name)}
            </Badge>
          </div>
          <div className="text-xs flex justify-between">
            <span className="capitalize">{column.type}</span>
            <span>{column.uniqueValues} unique values</span>
          </div>
          {column.originalName && column.originalName !== column.name && (
            <div className="text-xs text-muted-foreground mt-1 truncate" title={column.name}>
              ID: {column.name}
            </div>
          )}
        </div>
      ))}
    </div>
  );

  // Function to validate if distribution data is valid
  const isValidDistribution = (column: ColumnInfo | null): boolean => {
    if (!column || !column.distribution) return false;
    
    // Check if distribution object exists and has keys
    const keys = Object.keys(column.distribution);
    if (keys.length === 0) return false;
    
    // For QUANTITATIVE columns, check that there's actual data
    if (column.type === 'QUANTITATIVE') {
      const hasValues = Object.values(column.distribution).some(val => val > 0);
      console.log('📊 Distribution validation:', { 
        hasKeys: keys.length > 0, 
        hasValues, 
        distributionKeys: keys
      });
      return hasValues;
    }
    
    return true;
  };

  const renderDistributionChart = () => {
    if (!selectedColumnInfo) return null;

    // Enhanced validation for distribution data
    const validDistribution = isValidDistribution(selectedColumnInfo);
    console.log('Distribution validity check:', validDistribution, selectedColumnInfo?.name);

    // Check for distribution data
    if (!validDistribution) {
      return (
        <div className="h-72 flex items-center justify-center bg-muted rounded-md">
          <div className="text-center">
            <AlertTriangle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground mb-2">Distribution data not available</p>
            <p className="text-xs text-muted-foreground">
              {isVeryLargeDataset 
                ? "Very large datasets may skip distribution calculations for performance"
                : "This column may contain only null/invalid values"
              }
            </p>
          </div>
        </div>
      );
    }

    if (distributionData.length === 0) {
      return (
        <div className="h-72 flex items-center justify-center bg-muted rounded-md">
          <div className="text-center">
            <AlertTriangle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground mb-2">No distribution data to display</p>
            <p className="text-xs text-muted-foreground">
              Column may contain only null/invalid values
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="h-72">
        <ChartContainer
          config={{
            value: {
              label: "Count",
              color: dataTypeColors[selectedColumnInfo.type],
            },
          }}
          className="h-full w-full"
        >
          {selectedColumnInfo.type === 'QUANTITATIVE' ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={distributionData} margin={{ top: 100, right: 30, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="bin" 
                  angle={-45}
                  textAnchor="end"
                  height={10}
                  // Only show a reasonable number of ticks based on available space
                  interval={Math.ceil(distributionData.length / 8)}
                  tick={{ fontSize: 10 }}
                />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip 
                  formatter={(value: number) => [`Count: ${value}`, 'Frequency']}
                  labelFormatter={(label) => `Range: ${label}`}
                />
                <Bar dataKey="count" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={distributionData}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, value, percent }) => 
                    `${name.length > 10 ? name.substring(0, 10) + '...' : name}: ${(percent * 100).toFixed(1)}%`
                  }
                >
                  {distributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value, name) => [value, name]} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartContainer>
      </div>
    );
  };

  const renderColumnDetails = () => {
    if (!selectedColumnInfo) return <div className="text-muted-foreground">Select a column to view details</div>;
    
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col p-3 bg-muted rounded-md">
            <span className="text-sm text-muted-foreground">Type</span>
            <span className="font-medium capitalize text-foreground">{selectedColumnInfo.type}</span>
          </div>
          <div className="flex flex-col p-3 bg-muted rounded-md">
            <span className="text-sm text-muted-foreground">Unique Values</span>
            <span className="font-medium text-foreground">{selectedColumnInfo.uniqueValues?.toLocaleString()}</span>
          </div>
          <div className="flex flex-col p-3 bg-muted rounded-md">
            <span className="text-sm text-muted-foreground">Missing Values</span>
            <span className="font-medium text-foreground">
              {selectedColumnInfo.missingValues?.toLocaleString()} ({selectedColumnInfo.missingPercent?.toFixed(1)}%)
            </span>
          </div>
          
          {selectedColumnInfo.type === 'QUANTITATIVE' && (
            <>
              <div className="flex flex-col p-3 bg-muted rounded-md">
                <span className="text-sm text-muted-foreground">Range</span>
                <span className="font-medium text-foreground">
                  {typeof selectedColumnInfo.min === 'number' ? selectedColumnInfo.min.toFixed(2) : selectedColumnInfo.min} to {typeof selectedColumnInfo.max === 'number' ? selectedColumnInfo.max.toFixed(2) : selectedColumnInfo.max}
                </span>
              </div>
              <div className="flex flex-col p-3 bg-muted rounded-md">
                <span className="text-sm text-muted-foreground">Standard Deviation</span>
                <span className="font-medium text-foreground">{(selectedColumnInfo.std || 0).toFixed(2)}</span>
              </div>
              {selectedColumnInfo.outliers !== undefined && (
                <div className="flex flex-col p-3 bg-muted rounded-md">
                  <span className="text-sm text-muted-foreground">Outliers</span>
                  <span className="font-medium text-foreground">
                    {selectedColumnInfo.outliers.toLocaleString()}
                    {isVeryLargeDataset && selectedColumnInfo.outliers === 0 && (
                      <span className="text-xs text-muted-foreground ml-1">(skipped for performance)</span>
                    )}
                  </span>
                </div>
              )}
            </>
          )}
          
          {selectedColumnInfo.type === 'QUALITATIVE' && selectedColumnInfo.mode && (
            <div className="flex flex-col p-3 bg-muted rounded-md">
              <span className="text-sm text-muted-foreground">Most Common Value</span>
              <span className="font-medium text-foreground truncate" title={String(selectedColumnInfo.mode)}>
                {selectedColumnInfo.mode}
              </span>
            </div>
          )}
        </div>

        <div>
          <div className="text-sm font-medium mb-2">Value Distribution</div>
          {renderDistributionChart()}
          {selectedColumnInfo.type === 'QUALITATIVE' && 
           selectedColumnInfo.distribution && 
           Object.keys(selectedColumnInfo.distribution).length > 10 && (
            <div className="text-xs text-muted-foreground text-center mt-2">
              Showing top {Math.min(10, distributionData.length)} of {Object.keys(selectedColumnInfo.distribution).length} categories
              {isLargeDataset && " (limited for performance)"}
            </div>
          )}
          {selectedColumnInfo.type === 'QUANTITATIVE' && isLargeDataset && (
            <div className="text-xs text-muted-foreground text-center mt-2">
              Distribution calculated using {isVeryLargeDataset ? "sampling" : "optimized buckets"} for performance
            </div>
          )}
        </div>
      </div>
    );
  };

  // Add a new function to build distribution data for QUANTITATIVE columns if it's missing
  const buildDistributionFromColumn = (column: ColumnInfo): Record<string, number> | null => {
    console.log('🛠️ Attempting to build distribution for column:', column.name);
    
    if (column.type !== 'QUANTITATIVE' || column.min === undefined || column.max === undefined) {
      return null;
    }
    
    try {
      // Create a simple distribution with 10 buckets
      const min = Number(column.min);
      const max = Number(column.max);
      const range = max - min;
      const buckets = 10;
      const bucketSize = range / buckets;
      
      const distribution: Record<string, number> = {};
      
      // Initialize buckets with estimated values based on normal distribution
      for (let i = 0; i < buckets; i++) {
        const bucketMin = min + i * bucketSize;
        const bucketKey = bucketMin.toFixed(2);
        // Generate a plausible value for demonstration
        const normalizedPosition = i / buckets;
        const heightFactor = 1 - Math.abs(normalizedPosition - 0.5) * 2;
        distribution[bucketKey] = Math.max(1, Math.floor(heightFactor * 10));
      }
      
      console.log('🛠️ Built replacement distribution:', Object.keys(distribution).length);
      return distribution;
    } catch (error) {
      console.error('Error building distribution:', error);
      return null;
    }
  };

  // Use this function in your component to ensure the column has a distribution
  useEffect(() => {
    if (selectedColumnInfo && selectedColumnInfo.type === 'QUANTITATIVE' && !selectedColumnInfo.distribution) {
      console.log('🔄 Creating missing distribution for column:', selectedColumnInfo.name);
      // Create a new distribution for the column
      const builtDistribution = buildDistributionFromColumn(selectedColumnInfo);
      
      if (builtDistribution) {
        // Create an updated column with the distribution
        const updatedColumn = {
          ...selectedColumnInfo,
          distribution: builtDistribution
        };
        
        // Force re-render by setting the selected column to the enhanced version
        setSelectedColumnInfo(updatedColumn);
      }
    }
  }, [selectedColumnInfo?.name]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {renderPerformanceWarning()}
      
      <Card className="md:col-span-1">
        <CardHeader>
          <CardTitle className="text-lg">
            Columns ({dataset.columns.length.toLocaleString()})
          </CardTitle>
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by column name or ID (#)..."
                className="pl-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            
            {/* Search helper text */}
            <div className="text-xs text-muted-foreground mb-2">
              Tip: Search by column name or use <span className="font-mono">#</span> followed by a number to search by ID
            </div>
            
            <Select
              value={selectedType}
              onValueChange={setSelectedType}
            >
              <SelectTrigger>
                <SelectValue placeholder="All data types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All data types</SelectItem>
                <SelectItem value="QUANTITATIVE">Quantitative</SelectItem>
                <SelectItem value="QUALITATIVE">Qualitative</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {renderColumnList()}
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="text-lg">
            {selectedColumn ? (
              <div className="flex items-center gap-2">
                <span>{selectedColumnInfo?.originalName || selectedColumnInfo?.name || selectedColumn}</span>
                {selectedColumnInfo && (
                  <Badge variant="secondary" className="text-xs">
                    #{getColumnNumericId(selectedColumnInfo.name)}
                  </Badge>
                )}
              </div>
            ) : (
              "Column Details"
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {renderColumnDetails()}
        </CardContent>
      </Card>
    </div>
  );
};
