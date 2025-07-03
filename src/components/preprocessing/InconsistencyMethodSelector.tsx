import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { DatasetType, ColumnInfo } from '@/types/dataset';
import { InconsistencyMethod } from '@/types/methods';
import { ColumnInconsistencyConfig } from '@/hooks/useInconsistencyConfig';
import { Search, Edit3 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface InconsistencyMethodSelectorProps {
  dataset: DatasetType | null;
  selectedColumns: string[];
  columnDetails: ColumnInfo[];
  columnConfigurations: ColumnInconsistencyConfig[];
  onConfigChange: (configurations: ColumnInconsistencyConfig[]) => void;
}

export function InconsistencyMethodSelector({
  dataset,
  selectedColumns,
  columnDetails,
  columnConfigurations,
  onConfigChange
}: InconsistencyMethodSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredColumns, setFilteredColumns] = useState<string[]>(selectedColumns);
  
  // Bulk edit state
  const [showBulkEdit, setShowBulkEdit] = useState(false);
  const [selectedColumnsForBulk, setSelectedColumnsForBulk] = useState<Set<string>>(new Set());
  const [bulkMethod, setBulkMethod] = useState<InconsistencyMethod>('impute_mean');
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

  // Check if a column is categorical
  const isCategorical = (column: ColumnInfo | undefined) => {
    return column?.type === 'QUALITATIVE';
  };

  // Get available methods for a column based on its type
  const getAvailableMethods = (columnName: string): InconsistencyMethod[] => {
    if (isCategorical(getColumnInfo(columnName))) {
      return ['impute_mode', 'impute_random', 'remove'] as InconsistencyMethod[];
    }
    return ['impute_mean', 'impute_median', 'impute_random', 'remove'] as InconsistencyMethod[];
  };

  // Get all methods for bulk operations
  const getAllMethodsForBulk = (): InconsistencyMethod[] => {
    return ['impute_mean', 'impute_median', 'impute_mode', 'impute_random', 'remove'];
  };

  // Handle method change for a column
  const handleMethodChange = (columnName: string, method: InconsistencyMethod) => {
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
    
    // Filter columns by method compatibility
    const compatibleColumns = columnsInRange.filter(columnName => {
      const availableMethods = getAvailableMethods(columnName);
      return availableMethods.includes(bulkMethod);
    });

    if (compatibleColumns.length === 0) {
      toast({
        title: "No Compatible Columns",
        description: `No columns in the range support the selected method: ${getMethodDisplayName(bulkMethod)}`,
        variant: "destructive",
      });
      return;
    }
    
    // Apply bulk method to all compatible columns in range
    const updatedConfigs = columnConfigurations.map(config => {
      if (compatibleColumns.includes(config.columnName)) {
        return { ...config, method: bulkMethod };
      }
      return config;
    });
    onConfigChange(updatedConfigs);

    toast({
      title: "Bulk Update Applied",
      description: `Updated ${compatibleColumns.length} compatible columns (${start}-${end}) to ${getMethodDisplayName(bulkMethod)}`,
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

    // Filter selected columns by method compatibility
    const compatibleColumns = Array.from(selectedColumnsForBulk).filter(columnName => {
      const availableMethods = getAvailableMethods(columnName);
      return availableMethods.includes(bulkMethod);
    });

    if (compatibleColumns.length === 0) {
      toast({
        title: "No Compatible Columns",
        description: `None of the selected columns support the method: ${getMethodDisplayName(bulkMethod)}`,
        variant: "destructive",
      });
      return;
    }

    // Apply bulk method to all compatible selected columns
    const updatedConfigs = columnConfigurations.map(config => {
      if (compatibleColumns.includes(config.columnName)) {
        return { ...config, method: bulkMethod };
      }
      return config;
    });
    onConfigChange(updatedConfigs);

    toast({
      title: "Bulk Update Applied",
      description: `Updated ${compatibleColumns.length} compatible columns to ${getMethodDisplayName(bulkMethod)}`,
    });

    // Clear selection
    setSelectedColumnsForBulk(new Set());
  };

  // Get method display name for better readability
  const getMethodDisplayName = (method: InconsistencyMethod): string => {
    switch (method) {
      case 'impute_mean':
        return 'Replace with Mean';
      case 'impute_median':
        return 'Replace with Median';
      case 'impute_mode':
        return 'Replace with Mode';
      case 'impute_random':
        return 'Replace with Random Value';
      case 'remove':
        return 'Remove Inconsistent Values';
      default:
        return method;
    }
  };

  if (!dataset || selectedColumns.length === 0) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        No columns with inconsistencies selected. Please select columns to configure inconsistency handling methods.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Bulk Edit Toggle */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Configure Inconsistency Handling</h3>
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
          <h4 className="text-sm font-medium mb-4">Bulk Inconsistency Configuration</h4>
          
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
                <Select value={bulkMethod} onValueChange={(value) => setBulkMethod(value as InconsistencyMethod)}>
                  <SelectTrigger className="text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {getAllMethodsForBulk().map((method) => (
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
                <Select value={bulkMethod} onValueChange={(value) => setBulkMethod(value as InconsistencyMethod)}>
                  <SelectTrigger className="text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {getAllMethodsForBulk().map((method) => (
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
          const availableMethods = getAvailableMethods(columnName);
          
          if (!columnInfo || !config) return null;
          
          return (
            <Card key={columnName}>
              <CardContent className="p-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {showBulkEdit && (
                        <Checkbox
                          checked={selectedColumnsForBulk.has(columnName)}
                          onCheckedChange={(checked) => handleBulkColumnSelection(columnName, !!checked)}
                        />
                      )}
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="font-medium text-sm">{columnName}</h3>
                          <Badge variant="outline" className="text-xs">
                            #{selectedColumns.indexOf(columnName) + 1}
                          </Badge>
                          <Badge variant={columnInfo.type === 'QUANTITATIVE' ? 'default' : 'secondary'} className="text-xs">
                            {columnInfo.type}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Missing: {columnInfo.missingValues} ({columnInfo.missingPercent.toFixed(1)}%)
                          {columnInfo.hasMixedTypes && (
                            <span className="text-amber-600 dark:text-amber-400 ml-2">
                              • Mixed types detected ({(columnInfo.inconsistencyRatio * 100).toFixed(1)}% inconsistent)
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor={`method-${columnName}`}>Inconsistency Handling Method</Label>
                    <Select 
                      value={config.method} 
                      onValueChange={(value) => handleMethodChange(columnName, value as InconsistencyMethod)}
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
                      {config.method === 'impute_mean' && 'Replace inconsistent values with the column mean (numeric only)'}
                      {config.method === 'impute_median' && 'Replace inconsistent values with the column median (numeric only)'}
                      {config.method === 'impute_mode' && 'Replace inconsistent values with the most frequent value'}
                      {config.method === 'impute_random' && 'Replace inconsistent values with random valid values from the column'}
                      {config.method === 'remove' && 'Remove rows containing inconsistent values in this column'}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
} 