import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { DatasetType, ColumnInfo } from '@/types/dataset';
import { OutlierMethod } from '@/types/methods';
import { ColumnOutlierConfig } from '@/hooks/useOutlierConfig';
import { Search, Edit3, AlertTriangle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface OutlierMethodSelectorProps {
  dataset: DatasetType | null;
  selectedColumns: string[];
  columnDetails: ColumnInfo[];
  columnConfigurations: ColumnOutlierConfig[];
  onConfigChange: (configurations: ColumnOutlierConfig[]) => void;
  getOutlierIndicesForColumn: (columnName: string) => boolean[];
}

export function OutlierMethodSelector({
  dataset,
  selectedColumns,
  columnDetails,
  columnConfigurations,
  onConfigChange,
  getOutlierIndicesForColumn
}: OutlierMethodSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredColumns, setFilteredColumns] = useState<string[]>(selectedColumns);
  
  // Bulk edit state
  const [showBulkEdit, setShowBulkEdit] = useState(false);
  const [selectedColumnsForBulk, setSelectedColumnsForBulk] = useState<Set<string>>(new Set());
  const [bulkMethod, setBulkMethod] = useState<OutlierMethod>('impute_mean');
  const [rangeStart, setRangeStart] = useState<string>('');
  const [rangeEnd, setRangeEnd] = useState<string>('');
  
  const { toast } = useToast();
  
  // Filter columns based on search term
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredColumns(selectedColumns);
    } else {
      const term = searchTerm.toLowerCase();
      setFilteredColumns(
        selectedColumns.filter(columnName => 
          columnName.toLowerCase().includes(term)
        )
      );
    }
  }, [searchTerm, selectedColumns]);

  // Get column details by name
  const getColumnInfo = (columnName: string): ColumnInfo | undefined => {
    return columnDetails.find(col => col.name === columnName);
  };

  // Get available methods for outlier handling
  const getAvailableMethods = (): OutlierMethod[] => {
    return ['impute_mean', 'impute_median', 'impute_random', 'remove'] as OutlierMethod[];
  };

  // Handle method change for a column
  const handleMethodChange = (columnName: string, method: OutlierMethod) => {
    const updatedConfigs = columnConfigurations.map(config => {
      if (config.columnName === columnName) {
        return { ...config, method };
      }
      return config;
    });
    onConfigChange(updatedConfigs);
  };

  // Handle bulk column selection toggle
  const handleBulkColumnSelection = (columnName: string, checked: boolean) => {
    const newSelection = new Set(selectedColumnsForBulk);
    if (checked) {
      newSelection.add(columnName);
    } else {
      newSelection.delete(columnName);
    }
    setSelectedColumnsForBulk(newSelection);
  };

  // Handle select all toggle for bulk operations
  const handleSelectAllForBulk = () => {
    if (selectedColumnsForBulk.size === filteredColumns.length) {
      setSelectedColumnsForBulk(new Set());
    } else {
      setSelectedColumnsForBulk(new Set(filteredColumns));
    }
  };

  // Handle bulk method change by range
  const handleBulkChangeByRange = () => {
    const start = parseInt(rangeStart);
    const end = parseInt(rangeEnd);
    
    if (isNaN(start) || isNaN(end) || start < 1 || end < 1 || start > selectedColumns.length || end > selectedColumns.length || start > end) {
      toast({
        title: "Invalid Range",
        description: `Please enter a valid range between 1 and ${selectedColumns.length}`,
        variant: "destructive",
      });
      return;
    }

    // Get column names in the range
    const columnsInRange = selectedColumns.slice(start - 1, end);
    
    // Apply bulk method to all columns in range
    const updatedConfigs = columnConfigurations.map(config => {
      if (columnsInRange.includes(config.columnName)) {
        return { ...config, method: bulkMethod };
      }
      return config;
    });
    onConfigChange(updatedConfigs);

    toast({
      title: "Bulk Update Applied",
      description: `Updated ${columnsInRange.length} columns (${start}-${end}) to ${getMethodDisplayName(bulkMethod)}`,
    });

    // Clear range inputs
    setRangeStart('');
    setRangeEnd('');
  };

  // Handle bulk method change by selection
  const handleBulkChangeBySelection = () => {
    if (selectedColumnsForBulk.size === 0) {
      toast({
        title: "No Columns Selected",
        description: "Please select at least one column to apply bulk changes",
        variant: "destructive",
      });
      return;
    }

    // Apply bulk method to all selected columns
    const updatedConfigs = columnConfigurations.map(config => {
      if (selectedColumnsForBulk.has(config.columnName)) {
        return { ...config, method: bulkMethod };
      }
      return config;
    });
    onConfigChange(updatedConfigs);

    toast({
      title: "Bulk Update Applied",
      description: `Updated ${selectedColumnsForBulk.size} selected columns to ${getMethodDisplayName(bulkMethod)}`,
    });

    // Clear selection
    setSelectedColumnsForBulk(new Set());
  };

  // Get method display name for better readability
  const getMethodDisplayName = (method: OutlierMethod): string => {
    switch (method) {
      case 'impute_mean':
        return 'Replace with Mean';
      case 'impute_median':
        return 'Replace with Median';
      case 'impute_random':
        return 'Replace with Random Value';
      case 'remove':
        return 'Remove Outlier Values';
      default:
        return method;
    }
  };

  // Get outlier preview for a column
  const getOutlierPreview = (columnName: string) => {
    try {
      const outlierIndices = getOutlierIndicesForColumn(columnName);
      const outlierCount = outlierIndices.filter(Boolean).length;
      const totalRows = outlierIndices.length;
      const outlierPercentage = totalRows > 0 ? (outlierCount / totalRows) * 100 : 0;
      
      return {
        count: outlierCount,
        percentage: outlierPercentage,
        total: totalRows
      };
    } catch (error) {
      console.error(`Error getting outlier preview for ${columnName}:`, error);
      return { count: 0, percentage: 0, total: 0 };
    }
  };

  if (!dataset || selectedColumns.length === 0) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        No columns selected for outlier handling. Please select columns to configure outlier detection methods.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Bulk Edit Toggle */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Configure Outlier Handling</h3>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => setShowBulkEdit(!showBulkEdit)}
        >
          <Edit3 className="h-4 w-4 mr-2" />
          {showBulkEdit ? 'Hide' : 'Show'} Bulk Edit
        </Button>
      </div>

      {/* Bulk Edit Section */}
      {showBulkEdit && (
        <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border">
          <h4 className="text-sm font-medium mb-4">Bulk Outlier Handling Configuration</h4>
          
          {/* Range Selection */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
              <div>
                <label className="text-xs text-muted-foreground">From Column #</label>
                <Input
                  type="number"
                  placeholder="1"
                  min="1"
                  max={selectedColumns.length}
                  value={rangeStart}
                  onChange={(e) => setRangeStart(e.target.value)}
                  className="text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">To Column #</label>
                <Input
                  type="number"
                  placeholder={selectedColumns.length.toString()}
                  min="1"
                  max={selectedColumns.length}
                  value={rangeEnd}
                  onChange={(e) => setRangeEnd(e.target.value)}
                  className="text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Method</label>
                <Select value={bulkMethod} onValueChange={(value) => setBulkMethod(value as OutlierMethod)}>
                  <SelectTrigger className="text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableMethods().map((method) => (
                      <SelectItem key={method} value={method}>
                        {getMethodDisplayName(method)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button 
                onClick={handleBulkChangeByRange}
                size="sm"
              >
                Apply Range
              </Button>
            </div>

            <Separator />

            {/* Selection Based Bulk Edit */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
              <div>
                <label className="text-xs text-muted-foreground">Selected Columns</label>
                <div className="text-sm text-muted-foreground">
                  {selectedColumnsForBulk.size} column(s) selected
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Method</label>
                <Select value={bulkMethod} onValueChange={(value) => setBulkMethod(value as OutlierMethod)}>
                  <SelectTrigger className="text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableMethods().map((method) => (
                      <SelectItem key={method} value={method}>
                        {getMethodDisplayName(method)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button 
                onClick={handleBulkChangeBySelection}
                disabled={selectedColumnsForBulk.size === 0}
                size="sm"
              >
                Apply to Selected
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search columns..."
          className="pl-8"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Select All for Bulk Operations */}
      {showBulkEdit && (
        <div className="flex items-center space-x-2">
          <Checkbox
            id="select-all-bulk"
            checked={selectedColumnsForBulk.size === filteredColumns.length && filteredColumns.length > 0}
            onCheckedChange={handleSelectAllForBulk}
          />
          <Label htmlFor="select-all-bulk">Select All for Bulk Edit</Label>
        </div>
      )}
      
      {/* Column Configuration Cards */}
      <div className="space-y-4">
        {filteredColumns.map((columnName) => {
          const columnInfo = getColumnInfo(columnName);
          const config = columnConfigurations.find(c => c.columnName === columnName);
          const availableMethods = getAvailableMethods();
          const outlierStats = getOutlierPreview(columnName);
          
          if (!columnInfo || !config) return null;
          
          return (
            <Card key={columnName}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {showBulkEdit && (
                      <Checkbox
                        checked={selectedColumnsForBulk.has(columnName)}
                        onCheckedChange={(checked) => handleBulkColumnSelection(columnName, !!checked)}
                      />
                    )}
                    <CardTitle className="text-base flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                      {columnName}
                    </CardTitle>
                    <Badge variant="outline" className="text-xs">
                      #{selectedColumns.indexOf(columnName) + 1}
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-2">
                    {outlierStats.count > 0 && (
                      <Badge variant="destructive" className="text-xs">
                        {outlierStats.count} outliers ({outlierStats.percentage.toFixed(1)}%)
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-xs">
                      {columnInfo.type}
                    </Badge>
                  </div>
                </div>
                <CardDescription>
                  Range: {columnInfo.min} to {columnInfo.max} | 
                  Mean: {columnInfo.mean?.toFixed(2)} | 
                  Std: {columnInfo.std?.toFixed(2)}
                  {outlierStats.count > 0 && (
                    <span className="text-amber-600 dark:text-amber-400"> | {outlierStats.count} outliers detected</span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor={`method-${columnName}`}>Outlier Handling Method</Label>
                  <Select 
                    value={config.method} 
                    onValueChange={(value) => handleMethodChange(columnName, value as OutlierMethod)}
                  >
                    <SelectTrigger id={`method-${columnName}`}>
                      <SelectValue placeholder="Select method" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableMethods.map((method) => (
                        <SelectItem key={`${columnName}-${method}`} value={method}>
                          {getMethodDisplayName(method)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  {/* Method Description */}
                  <div className="text-xs text-muted-foreground mt-2">
                    {config.method === 'impute_mean' && 'Replace outliers with the column mean'}
                    {config.method === 'impute_median' && 'Replace outliers with the column median (recommended for robustness)'}
                    {config.method === 'impute_random' && 'Replace outliers with random values from the non-outlier range'}
                    {config.method === 'remove' && 'Remove rows containing outliers in this column'}
                  </div>
                  
                  {/* Outlier Statistics */}
                  {outlierStats.count > 0 && (
                    <div className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-md border border-amber-200 dark:border-amber-800 mt-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-amber-800 dark:text-amber-200">
                          Outliers detected: {outlierStats.count} of {outlierStats.total} values
                        </span>
                        <span className="text-amber-600 dark:text-amber-400">
                          {outlierStats.percentage.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
} 