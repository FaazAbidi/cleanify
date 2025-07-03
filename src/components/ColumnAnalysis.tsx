import { useState, useMemo, useEffect, useCallback } from "react";
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

  const filteredColumns = useMemo(() => {
    let filtered = dataset.columns.filter(column => 
      (column.originalName || column.name).toLowerCase().includes(debouncedSearch.toLowerCase())
    );
    
    if (selectedType !== "all") {
      filtered = filtered.filter(column => column.type === selectedType);
    }
    
    return filtered;
  }, [dataset.columns, debouncedSearch, selectedType]);

  const selectedColumnInfo = selectedColumn 
    ? dataset.columns.find(col => col.name === selectedColumn) 
    : null;

  const formatDistributionData = (column: ColumnInfo | null) => {
    console.log('🔍 Debug formatDistributionData:', {
      hasColumn: !!column,
      hasDistribution: !!column?.distribution,
      distributionKeys: column?.distribution ? Object.keys(column.distribution).length : 0,
      columnType: column?.type,
      distribution: column?.distribution
    });

    if (!column || !column.distribution) return [];

    if (column.type === 'QUANTITATIVE') {
      // For quantitative data, use bin ranges as keys
      const result = Object.entries(column.distribution).map(([key, value]) => ({
        bin: key,
        count: value,
      }));
      console.log('📊 Quantitative distribution data:', result);
      return result;
    } else {
      // For qualitative data, use name/value pairs for pie chart
      const result = Object.entries(column.distribution)
        .sort(([,a], [,b]) => b - a) // Sort by frequency
        .slice(0, 10) // Show top 10 categories
        .map(([key, value]) => ({
          name: key,
          value: value,
        }));
      console.log('🥧 Qualitative distribution data:', result);
      return result;
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
              {column.originalName && column.originalName !== column.name && (
                <span className="text-xs text-muted-foreground ml-1">
                  (#{filteredColumns.filter(c => (c.originalName || c.name) === (column.originalName || column.name)).findIndex(c => c.name === column.name) + 1})
                </span>
              )}
            </div>
            {column.originalName && column.originalName !== column.name && (
              <Badge variant="secondary" className="text-xs ml-2 flex-shrink-0">
                Col {index + 1}
              </Badge>
            )}
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

  const renderDistributionChart = () => {
    if (!selectedColumnInfo) return null;

    // Check for distribution data
    if (!selectedColumnInfo.distribution) {
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
              <BarChart data={distributionData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="bin" 
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  interval={0}
                  tick={{ fontSize: 10 }}
                />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
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
                placeholder="Search columns..."
                className="pl-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
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
            {selectedColumn ? `Column: ${selectedColumnInfo?.originalName || selectedColumnInfo?.name || selectedColumn}` : "Column Details"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {renderColumnDetails()}
        </CardContent>
      </Card>
    </div>
  );
};
