import { useState } from 'react';
import { ColumnInfo, DatasetType } from '@/types/dataset';
import { BinningColumnConfig } from '@/hooks/useBinningConfig';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, BarChart3, Edit3, Search } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface BinningMethodSelectorProps {
  dataset: DatasetType | null;
  selectedColumns: string[];
  columnDetails: ColumnInfo[];
  columnConfigurations: BinningColumnConfig[];
  onConfigChange: (columnName: string, strategy: 'equal_width' | 'equal_depth', binCount: number) => void;
}

export function BinningMethodSelector({
  dataset,
  selectedColumns,
  columnDetails,
  columnConfigurations,
  onConfigChange
}: BinningMethodSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredColumns, setFilteredColumns] = useState<string[]>(selectedColumns);
  
  // Bulk edit state
  const [showBulkEdit, setShowBulkEdit] = useState(false);
  const [selectedColumnsForBulk, setSelectedColumnsForBulk] = useState<Set<string>>(new Set());
  const [bulkStrategy, setBulkStrategy] = useState<'equal_width' | 'equal_depth'>('equal_width');
  const [bulkBinCount, setBulkBinCount] = useState<number>(3);
  const [rangeStart, setRangeStart] = useState<string>('');
  const [rangeEnd, setRangeEnd] = useState<string>('');
  
  const { toast } = useToast();

  // Filter columns based on search term
  const handleSearch = (term: string) => {
    setSearchTerm(term);
    if (term.trim() === '') {
      setFilteredColumns(selectedColumns);
    } else {
      const filtered = selectedColumns.filter(col => 
        col.toLowerCase().includes(term.toLowerCase())
      );
      setFilteredColumns(filtered);
    }
  };

  const getColumnConfig = (columnName: string): BinningColumnConfig => {
    return columnConfigurations.find(config => config.columnName === columnName) || {
      columnName,
      strategy: 'equal_width',
      binCount: 3
    };
  };

  const getColumnInfo = (columnName: string): ColumnInfo | undefined => {
    return columnDetails.find(col => col.name === columnName);
  };

  const handleStrategyChange = (columnName: string, strategy: 'equal_width' | 'equal_depth') => {
    const config = getColumnConfig(columnName);
    onConfigChange(columnName, strategy, config.binCount);
  };

  const handleBinCountChange = (columnName: string, binCount: number) => {
    const config = getColumnConfig(columnName);
    onConfigChange(columnName, config.strategy, binCount);
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

  // Handle bulk configuration change by range
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
    
    // Apply bulk configuration to all columns in range
    columnsInRange.forEach(columnName => {
      onConfigChange(columnName, bulkStrategy, bulkBinCount);
    });

    toast({
      title: "Bulk Update Applied",
      description: `Updated ${columnsInRange.length} columns (${start}-${end}) with ${bulkStrategy} strategy and ${bulkBinCount} bins`,
    });

    // Clear range inputs
    setRangeStart('');
    setRangeEnd('');
  };

  // Handle bulk configuration change by selection
  const handleBulkChangeBySelection = () => {
    if (selectedColumnsForBulk.size === 0) {
      toast({
        title: "No Columns Selected",
        description: "Please select at least one column to apply bulk changes",
        variant: "destructive",
      });
      return;
    }

    // Apply bulk configuration to all selected columns
    Array.from(selectedColumnsForBulk).forEach(columnName => {
      onConfigChange(columnName, bulkStrategy, bulkBinCount);
    });

    toast({
      title: "Bulk Update Applied",
      description: `Updated ${selectedColumnsForBulk.size} selected columns with ${bulkStrategy} strategy and ${bulkBinCount} bins`,
    });

    // Clear selection
    setSelectedColumnsForBulk(new Set());
  };

  // Get strategy display name
  const getStrategyDisplayName = (strategy: 'equal_width' | 'equal_depth'): string => {
    return strategy === 'equal_width' ? 'Equal Width' : 'Equal Depth';
  };

  if (!dataset || selectedColumns.length === 0) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        No columns selected for binning. Please select numeric columns to configure binning methods.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Bulk Edit Toggle */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Configure Binning Methods</h3>
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
          <h4 className="text-sm font-medium mb-4">Bulk Binning Configuration</h4>
          
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
                <label className="text-xs text-muted-foreground">Strategy</label>
                <Select value={bulkStrategy} onValueChange={(value) => setBulkStrategy(value as 'equal_width' | 'equal_depth')}>
                  <SelectTrigger className="text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="equal_width">
                      <div className="flex flex-col">
                        <span className="font-medium">Equal Width</span>
                        <span className="text-xs text-muted-foreground">Fixed range bins</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="equal_depth">
                      <div className="flex flex-col">
                        <span className="font-medium">Equal Depth</span>
                        <span className="text-xs text-muted-foreground">Equal frequency bins</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Bin Count</label>
                <Input
                  type="number"
                  placeholder="3"
                  min="2"
                  max="20"
                  value={bulkBinCount}
                  onChange={(e) => setBulkBinCount(parseInt(e.target.value) || 3)}
                  className="text-sm"
                />
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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
              <div>
                <label className="text-xs text-muted-foreground">Selected Columns</label>
                <div className="text-sm text-muted-foreground">
                  {selectedColumnsForBulk.size} column(s) selected
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Strategy</label>
                <Select value={bulkStrategy} onValueChange={(value) => setBulkStrategy(value as 'equal_width' | 'equal_depth')}>
                  <SelectTrigger className="text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="equal_width">Equal Width</SelectItem>
                    <SelectItem value="equal_depth">Equal Depth</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Bin Count</label>
                <Input
                  type="number"
                  placeholder="3"
                  min="2"
                  max="20"
                  value={bulkBinCount}
                  onChange={(e) => setBulkBinCount(parseInt(e.target.value) || 3)}
                  className="text-sm"
                />
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
          onChange={(e) => handleSearch(e.target.value)}
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

      {/* Information Alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Binning converts continuous numeric values into discrete groups. Equal width creates bins with the same range, 
          while equal depth creates bins with approximately the same number of values.
        </AlertDescription>
      </Alert>

      {/* Column Configuration Cards */}
      <div className="space-y-4">
        {filteredColumns.map(columnName => {
          const config = getColumnConfig(columnName);
          const columnInfo = getColumnInfo(columnName);
          
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
                      <BarChart3 className="h-4 w-4" />
                      {columnName}
                    </CardTitle>
                    <Badge variant="outline" className="text-xs">
                      #{selectedColumns.indexOf(columnName) + 1}
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className="text-xs">
                      {config.strategy === 'equal_width' ? 'Equal Width' : 'Equal Depth'}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {config.binCount} bins
                    </Badge>
                  </div>
                </div>
                {columnInfo && (
                  <CardDescription>
                    Range: {columnInfo.min} to {columnInfo.max} | 
                    Mean: {columnInfo.mean?.toFixed(2)} | 
                    Std: {columnInfo.std?.toFixed(2)}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`strategy-${columnName}`}>Binning Strategy</Label>
                    <Select
                      value={config.strategy}
                      onValueChange={(value: 'equal_width' | 'equal_depth') => 
                        handleStrategyChange(columnName, value)
                      }
                    >
                      <SelectTrigger id={`strategy-${columnName}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="equal_width">
                          <div className="flex flex-col">
                            <span className="font-medium">Equal Width</span>
                            <span className="text-xs text-muted-foreground">Fixed range bins</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="equal_depth">
                          <div className="flex flex-col">
                            <span className="font-medium">Equal Depth</span>
                            <span className="text-xs text-muted-foreground">Equal frequency bins</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`bins-${columnName}`}>Number of Bins</Label>
                    <Input
                      id={`bins-${columnName}`}
                      type="number"
                      min="2"
                      max="20"
                      value={config.binCount}
                      onChange={(e) => {
                        const value = parseInt(e.target.value);
                        if (!isNaN(value) && value >= 2 && value <= 20) {
                          handleBinCountChange(columnName, value);
                        }
                      }}
                      placeholder="Number of bins"
                    />
                  </div>
                </div>

                {/* Strategy Description */}
                <div className="text-xs text-muted-foreground mt-3 p-3 bg-muted/50 rounded-md">
                  {config.strategy === 'equal_width' && (
                    <span>
                      <strong>Equal Width:</strong> Creates bins with the same range size. 
                      Range per bin: {columnInfo && columnInfo.min !== undefined && columnInfo.max !== undefined 
                        ? ((columnInfo.max - columnInfo.min) / config.binCount).toFixed(2) 
                        : 'N/A'}
                    </span>
                  )}
                  {config.strategy === 'equal_depth' && (
                    <span>
                      <strong>Equal Depth:</strong> Creates bins with approximately the same number of values. 
                      Each bin will contain roughly {Math.floor(100 / config.binCount)}% of the data.
                    </span>
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