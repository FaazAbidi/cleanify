import { ColumnInfo, DatasetType } from '@/types/dataset';
import { useState, useEffect } from 'react';
import { 
  Select,
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ChartColumn, Info, Search, Edit3 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Button } from '../ui/button';
import { ColumnExploreDialog } from './ColumnExploreDialog';
import { ImputationMethod, ImputationMethodCategorical, ImputationMethodNumeric } from '@/types/methods';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';

// Define imputation methods
// export type ImputationMethod = 'impute_mean' | 'impute_mode' | 'impute_median' | 'impute_random' | 'remove';

// Define column configuration
export interface ColumnImputationConfig {
  columnName: string;
  method: ImputationMethod;
  value?: string | null;
}

interface ImputationMethodSelectorProps {
  dataset: DatasetType;
  selectedColumns: string[];
  columnDetails: ColumnInfo[];
  columnConfigurations: ColumnImputationConfig[];
  onConfigChange: (configurations: ColumnImputationConfig[]) => void;
}

export function ImputationMethodSelector({
  dataset,
  selectedColumns,
  columnDetails,
  columnConfigurations,
  onConfigChange
}: ImputationMethodSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredColumns, setFilteredColumns] = useState<string[]>(selectedColumns);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedColumnForExplore, setSelectedColumnForExplore] = useState<ColumnInfo | null>(null);
  
  // Bulk edit state
  const [showBulkEdit, setShowBulkEdit] = useState(false);
  const [selectedColumnsForBulk, setSelectedColumnsForBulk] = useState<Set<string>>(new Set());
  const [bulkMethod, setBulkMethod] = useState<ImputationMethod>('impute_mean');
  const [bulkConstantValue, setBulkConstantValue] = useState<string>('');
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

  // Helper function to check if column is qualitative
  const isQualitativeColumn = (column: ColumnInfo | undefined): boolean => {
    return column?.type === 'QUALITATIVE';
  };

  // Get available methods for a column based on its type
  const getAvailableMethods = (columnName: string): ImputationMethod[] => {
    if (isCategorical(getColumnInfo(columnName))) {
      return ['impute_mode', 'impute_random', 'remove'] as ImputationMethodCategorical[];
    }
    return ['impute_mean', 'impute_median', 'impute_random', 'remove', 'impute_constant'] as ImputationMethodNumeric[];
  };

  // Get all methods for bulk operations
  const getAllMethodsForBulk = (): ImputationMethod[] => {
    return ['impute_mean', 'impute_median', 'impute_mode', 'impute_random', 'remove', 'impute_constant'];
  };

  // Handle method change for a column
  const handleMethodChange = (columnName: string, method: ImputationMethod, value?: string) => {
    const updatedConfigs = columnConfigurations.map(config => {
      if (config.columnName === columnName) {
        return { ...config, method, value: value || config.value };
      }
      return config;
    });
    onConfigChange(updatedConfigs);
  };

  // Handle constant value change for a column
  const handleConstantValueChange = (columnName: string, value: string) => {
    const updatedConfigs = columnConfigurations.map(config => {
      if (config.columnName === columnName) {
        return { ...config, value };
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
        return { 
          ...config, 
          method: bulkMethod,
          value: bulkMethod === 'impute_constant' ? bulkConstantValue : config.value
        };
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
        return { 
          ...config, 
          method: bulkMethod,
          value: bulkMethod === 'impute_constant' ? bulkConstantValue : config.value
        };
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
  const getMethodDisplayName = (method: ImputationMethod): string => {
    switch (method) {
      case 'impute_mean':
        return 'Replace with Mean';
      case 'impute_median':
        return 'Replace with Median';
      case 'impute_mode':
        return 'Replace with Mode';
      case 'impute_random':
        return 'Replace with Random Value';
      case 'impute_constant':
        return 'Replace with Constant';
      case 'remove':
        return 'Remove Missing Values';
      default:
        return method;
    }
  };

  // Handle exploring a column
  const handleExploreColumn = (column: ColumnInfo) => {
    setSelectedColumnForExplore(column);
    setDialogOpen(true);
  };

  if (!dataset || selectedColumns.length === 0) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        No columns with missing values selected. Please select columns to configure imputation methods.
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header with Bulk Edit Toggle */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">Configure Imputation Methods</h3>
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
            <h4 className="text-sm font-medium mb-4">Bulk Imputation Configuration</h4>
            
            {/* Range Selection */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
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
                  <Select value={bulkMethod} onValueChange={(value) => setBulkMethod(value as ImputationMethod)}>
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
                {bulkMethod === 'impute_constant' && (
                  <div>
                    <label className="text-xs text-muted-foreground">Constant Value</label>
                    <Input
                      placeholder="Enter value"
                      value={bulkConstantValue}
                      onChange={(e) => setBulkConstantValue(e.target.value)}
                      className="text-sm"
                    />
                  </div>
                )}
                <Button 
                  onClick={handleBulkChangeByRange}
                  size="sm"
                >
                  Apply Range
                </Button>
              </div>

              <Separator />

              {/* Selection Based Bulk Edit */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                <div>
                  <label className="text-xs text-muted-foreground">Selected Columns</label>
                  <div className="text-sm text-muted-foreground">
                    {selectedColumnsForBulk.size} column(s) selected
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Method</label>
                  <Select value={bulkMethod} onValueChange={(value) => setBulkMethod(value as ImputationMethod)}>
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
                {bulkMethod === 'impute_constant' && (
                  <div>
                    <label className="text-xs text-muted-foreground">Constant Value</label>
                    <Input
                      placeholder="Enter value"
                      value={bulkConstantValue}
                      onChange={(e) => setBulkConstantValue(e.target.value)}
                      className="text-sm"
                    />
                  </div>
                )}
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

        {/* Configuration Table */}
        <div className="max-h-[300px] overflow-y-auto border-t">
          <Table>
            <TableHeader>
              <TableRow>
                {showBulkEdit && (
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedColumnsForBulk.size === filteredColumns.length && filteredColumns.length > 0}
                      onCheckedChange={handleSelectAllForBulk}
                    />
                  </TableHead>
                )}
                <TableHead>Column</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Missing</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Value</TableHead>
                <TableHead className="w-12">Explore</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="overflow-y-auto">
              {filteredColumns.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={showBulkEdit ? 7 : 6} className="text-center py-6 text-muted-foreground">
                    No columns found matching your search
                  </TableCell>
                </TableRow>
              ) : (
                filteredColumns.map(columnName => {
                  const columnInfo = getColumnInfo(columnName);
                  const config = columnConfigurations.find(c => c.columnName === columnName);
                  const availableMethods = getAvailableMethods(columnName);
                  
                  return (
                    <TableRow key={columnName}>
                      {showBulkEdit && (
                        <TableCell>
                          <Checkbox
                            checked={selectedColumnsForBulk.has(columnName)}
                            onCheckedChange={(checked) => handleBulkColumnSelection(columnName, !!checked)}
                          />
                        </TableCell>
                      )}
                      <TableCell className="font-medium">
                        <div className="flex items-center space-x-2">
                          <span>{columnName}</span>
                          <Badge variant="outline" className="text-xs">
                            #{selectedColumns.indexOf(columnName) + 1}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={columnInfo?.type === 'QUANTITATIVE' ? 'default' : 'secondary'}>
                          {columnInfo?.type || 'Unknown'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm">{columnInfo?.missingValues || 0}</span>
                          <span className="text-xs text-muted-foreground">
                            ({columnInfo?.missingPercent.toFixed(1) || 0}%)
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={config?.method || 'impute_mean'}
                          onValueChange={(value) => handleMethodChange(columnName, value as ImputationMethod)}
                        >
                          <SelectTrigger className="w-[180px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {availableMethods.map((method) => (
                              <SelectItem key={method} value={method}>
                                {getMethodDisplayName(method)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        {config?.method === 'impute_constant' ? (
                          <Input
                            placeholder="Constant value"
                            value={config?.value || ''}
                            onChange={(e) => handleConstantValueChange(columnName, e.target.value)}
                            className="w-32"
                          />
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {columnInfo && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="icon" 
                                className="h-8 w-8 text-primary"
                                onClick={() => handleExploreColumn(columnInfo)}
                              >
                                <ChartColumn className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Explore {columnName}</TooltipContent>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        <ColumnExploreDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          column={selectedColumnForExplore}
          dataset={dataset}
        />
      </div>
    </TooltipProvider>
  );
} 