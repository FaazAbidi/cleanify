import { useState } from 'react';
import { ColumnInfo, DatasetType } from '@/types/dataset';
import { SkewnessMethod } from '@/types/methods';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Search, Edit3, CheckSquare, Square } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface ColumnConfigType {
  columnName: string;
  method: SkewnessMethod;
  value: string | null;
}

interface SkewnessMethodSelectorProps {
  dataset: DatasetType | null;
  selectedColumns: string[];
  columnDetails: ColumnInfo[];
  columnConfigurations: ColumnConfigType[];
  onConfigChange: (columnName: string, updates: Partial<ColumnConfigType>) => void;
}

export function SkewnessMethodSelector({
  dataset,
  selectedColumns,
  columnDetails,
  columnConfigurations,
  onConfigChange
}: SkewnessMethodSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredColumns, setFilteredColumns] = useState<string[]>(selectedColumns);
  
  // Bulk edit state
  const [showBulkEdit, setShowBulkEdit] = useState(false);
  const [selectedColumnsForBulk, setSelectedColumnsForBulk] = useState<Set<string>>(new Set());
  const [bulkMethod, setBulkMethod] = useState<SkewnessMethod>('log');
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
    columnsInRange.forEach(columnName => {
      onConfigChange(columnName, { method: bulkMethod });
    });

    toast({
      title: "Bulk Update Applied",
      description: `Updated ${columnsInRange.length} columns (${start}-${end}) to ${getMethodLabel(bulkMethod)}`,
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
    Array.from(selectedColumnsForBulk).forEach(columnName => {
      onConfigChange(columnName, { method: bulkMethod });
    });

    toast({
      title: "Bulk Update Applied",
      description: `Updated ${selectedColumnsForBulk.size} selected columns to ${getMethodLabel(bulkMethod)}`,
    });

    // Clear selection
    setSelectedColumnsForBulk(new Set());
  };

  if (!dataset || selectedColumns.length === 0) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        Please select at least one column to configure skewness transformation methods.
      </div>
    );
  }

  // Get the methods available for skewness transformation
  const getMethodOptions = (): { value: SkewnessMethod; label: string }[] => {
    return [
      { value: 'log', label: 'Logarithmic (log(x+1))' },
      { value: 'sqrt', label: 'Square Root (√x)' },
      { value: 'reciprocal', label: 'Reciprocal (1/x)' }
    ];
  };

  const getMethodLabel = (method: SkewnessMethod): string => {
    const option = getMethodOptions().find(opt => opt.value === method);
    return option?.label || method;
  };

  const getMethodDescription = (method: SkewnessMethod): string => {
    switch (method) {
      case 'log':
        return 'Applies logarithmic transformation log(x+1). Good for positively skewed data.';
      case 'sqrt':
        return 'Applies square root transformation. Moderate effect for positively skewed data.';
      case 'reciprocal':
        return 'Applies reciprocal transformation (1/x). Strong effect for positively skewed data.';
      default:
        return '';
    }
  };

  const getColumnInfo = (columnName: string) => {
    return columnDetails.find(col => col.name === columnName);
  };

  const methodOptions = getMethodOptions();

  return (
    <div className="space-y-6">
      {/* Header with Bulk Edit Toggle */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Configure Skewness Transformation</h3>
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
          <h4 className="text-sm font-medium mb-4">Bulk Transformation Configuration</h4>
          
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
                <Select value={bulkMethod} onValueChange={(value) => setBulkMethod(value as SkewnessMethod)}>
                  <SelectTrigger className="text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {methodOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
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
                <Select value={bulkMethod} onValueChange={(value) => setBulkMethod(value as SkewnessMethod)}>
                  <SelectTrigger className="text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {methodOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
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

      {/* Column Configuration Cards */}
      <div className="space-y-4">
        {filteredColumns.map(columnName => {
          const config = columnConfigurations.find(c => c.columnName === columnName) || {
            columnName,
            method: 'log' as SkewnessMethod,
            value: null
          };
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
                    <CardTitle className="text-base">{columnName}</CardTitle>
                    <Badge variant="outline" className="text-xs">
                      #{selectedColumns.indexOf(columnName) + 1}
                    </Badge>
                  </div>
                  {columnInfo && (
                    <div className="flex items-center space-x-2">
                      {columnInfo.isSkewed && (
                        <Badge variant="destructive" className="text-xs">
                          Skewed: {columnInfo.skewness?.toFixed(2)}
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-xs">
                        {columnInfo.type}
                      </Badge>
                    </div>
                  )}
                </div>
                {columnInfo && (
                  <CardDescription>
                    Range: {columnInfo.min} to {columnInfo.max} | 
                    Mean: {columnInfo.mean?.toFixed(2)} | 
                    Std: {columnInfo.std?.toFixed(2)}
                    {columnInfo.skewness !== undefined && (
                      <span> | Skewness: {columnInfo.skewness.toFixed(2)}</span>
                    )}
                  </CardDescription>
                )}
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor={`${columnName}-method`}>Transformation Method</Label>
                  <Select
                    value={config.method}
                    onValueChange={(value: SkewnessMethod) => onConfigChange(columnName, { method: value })}
                  >
                    <SelectTrigger id={`${columnName}-method`}>
                      <SelectValue placeholder="Select a method" />
                    </SelectTrigger>
                    <SelectContent>
                      {methodOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <p className="text-xs text-muted-foreground mt-2">
                    {getMethodDescription(config.method)}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
} 