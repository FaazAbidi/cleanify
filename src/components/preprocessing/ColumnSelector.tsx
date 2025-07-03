import { useState, useEffect } from 'react';
import { ColumnInfo } from '@/types/dataset';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Search, Eye, Info, ChartColumn, AlertTriangle, Edit3, CheckSquare, Square } from 'lucide-react';
import { ColumnExploreDialog } from './ColumnExploreDialog';
import { DatasetType } from '@/types/dataset';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/components/ui/use-toast';

interface ColumnSelectorProps {
  columns: ColumnInfo[];
  selectedColumns: string[];
  onColumnSelectionChange: (selectedColumns: string[]) => void;
  disabledColumns?: string[];
  dataset?: DatasetType | null;
  highlightedColumns?: string[];
  showBulkSelection?: boolean;
  title?: string;
}

export function ColumnSelector({
  columns,
  selectedColumns,
  onColumnSelectionChange,
  disabledColumns = [],
  dataset = null,
  highlightedColumns = [],
  showBulkSelection = true,
  title = "Select Columns"
}: ColumnSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredColumns, setFilteredColumns] = useState<ColumnInfo[]>(columns);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedColumnForExplore, setSelectedColumnForExplore] = useState<ColumnInfo | null>(null);
  
  // Bulk selection state
  const [showBulkEdit, setShowBulkEdit] = useState(false);
  const [rangeStart, setRangeStart] = useState<string>('');
  const [rangeEnd, setRangeEnd] = useState<string>('');
  
  const { toast } = useToast();

  // Filter columns based on search term
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredColumns(columns);
    } else {
      const term = searchTerm.toLowerCase();
      setFilteredColumns(
        columns.filter(column => 
          (column.originalName || column.name).toLowerCase().includes(term)
        )
      );
    }
  }, [searchTerm, columns]);

  // Handle checkbox change
  const handleColumnToggle = (columnName: string, checked: boolean) => {
    if (checked) {
      onColumnSelectionChange([...selectedColumns, columnName]);
    } else {
      onColumnSelectionChange(selectedColumns.filter(name => name !== columnName));
    }
  };

  // Handle "Select All" checkbox
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const selectableColumns = filteredColumns
        .filter(col => !disabledColumns.includes(col.name))
        .map(col => col.name);
      onColumnSelectionChange([...new Set([...selectedColumns, ...selectableColumns])]);
    } else {
      // Only deselect columns that are in the current filtered view
      const columnsToDeselect = filteredColumns.map(col => col.name);
      onColumnSelectionChange(selectedColumns.filter(col => !columnsToDeselect.includes(col)));
    }
  };

  // Handle bulk selection by range
  const handleBulkSelectionByRange = () => {
    const start = parseInt(rangeStart);
    const end = parseInt(rangeEnd);
    
    if (isNaN(start) || isNaN(end) || start < 1 || end < 1 || start > columns.length || end > columns.length || start > end) {
      toast({
        title: "Invalid Range",
        description: `Please enter a valid range between 1 and ${columns.length}`,
        variant: "destructive",
      });
      return;
    }

    // Get column names in the range (excluding disabled columns)
    const columnsInRange = columns
      .slice(start - 1, end)
      .filter(col => !disabledColumns.includes(col.name))
      .map(col => col.name);
    
    // Add to existing selection
    const newSelection = [...new Set([...selectedColumns, ...columnsInRange])];
    onColumnSelectionChange(newSelection);

    toast({
      title: "Bulk Selection Applied",
      description: `Selected ${columnsInRange.length} columns (${start}-${end})`,
    });

    // Clear range inputs
    setRangeStart('');
    setRangeEnd('');
  };

  // Handle deselect all
  const handleDeselectAll = () => {
    onColumnSelectionChange([]);
    toast({
      title: "Selection Cleared",
      description: "All columns have been deselected",
    });
  };

  // Check if all selectable columns are selected
  const selectableColumns = filteredColumns
    .filter(col => !disabledColumns.includes(col.name))
    .map(col => col.name);

  const allSelectableSelected = 
    selectableColumns.length > 0 && 
    selectableColumns.every(colName => selectedColumns.includes(colName));
    
  // Handle exploring a column
  const handleExploreColumn = (column: ColumnInfo) => {
    setSelectedColumnForExplore(column);
    setDialogOpen(true);
  };

  return (
    <TooltipProvider>
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{title}</CardTitle>
            {showBulkSelection && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowBulkEdit(!showBulkEdit)}
              >
                <Edit3 className="h-4 w-4 mr-2" />
                {showBulkEdit ? 'Hide' : 'Show'} Bulk Selection
              </Button>
            )}
          </div>
          
          {showBulkSelection && showBulkEdit && (
            <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border">
              <h3 className="text-sm font-medium mb-4">Bulk Column Selection</h3>
              
              {/* Range Selection */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                  <div>
                    <label className="text-xs text-muted-foreground">From Column #</label>
                    <Input
                      type="number"
                      placeholder="1"
                      min="1"
                      max={columns.length}
                      value={rangeStart}
                      onChange={(e) => setRangeStart(e.target.value)}
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">To Column #</label>
                    <Input
                      type="number"
                      placeholder={columns.length.toString()}
                      min="1"
                      max={columns.length}
                      value={rangeEnd}
                      onChange={(e) => setRangeEnd(e.target.value)}
                      className="text-sm"
                    />
                  </div>
                  <Button 
                    onClick={handleBulkSelectionByRange}
                    size="sm"
                    className="col-span-2 md:col-span-1"
                  >
                    Select Range
                  </Button>
                  <Button 
                    onClick={handleDeselectAll}
                    variant="outline"
                    size="sm"
                    className="col-span-2 md:col-span-1"
                  >
                    Deselect All
                  </Button>
                </div>

                <div className="text-xs text-muted-foreground">
                  Selected: <strong>{selectedColumns.length}</strong> of {columns.length} columns
                  {disabledColumns.length > 0 && (
                    <span className="ml-2">({disabledColumns.length} disabled)</span>
                  )}
                </div>
              </div>
            </div>
          )}
          
          <div className="relative w-full mt-2">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search columns..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="select-all" 
                  checked={allSelectableSelected && selectedColumns.length > 0}
                  onCheckedChange={handleSelectAll}
                />
                <Label htmlFor="select-all">
                  Select All {filteredColumns.length !== columns.length ? `Filtered (${filteredColumns.length})` : `(${selectableColumns.length})`}
                </Label>
              </div>
              <div className="text-sm text-muted-foreground">
                {selectedColumns.length} selected
              </div>
            </div>
          </div>
          
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {filteredColumns.map((column, index) => {
              const isHighlighted = highlightedColumns.includes(column.name);
              const isSelected = selectedColumns.includes(column.name);
              const isDisabled = disabledColumns.includes(column.name);
              const originalIndex = columns.findIndex(col => col.name === column.name) + 1;
              
              return (
                <div 
                  key={column.name} 
                  className={`flex items-center justify-between p-2 hover:bg-accent rounded-md ${
                    isHighlighted ? 'bg-amber-50 dark:bg-amber-950/20 border-l-4 border-amber-400 dark:border-amber-500' : ''
                  } ${isSelected ? 'bg-blue-50 dark:bg-blue-950/20' : ''}`}
                >
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id={`col-${column.name}`}
                      checked={isSelected}
                      onCheckedChange={(checked) => handleColumnToggle(column.name, checked === true)}
                      disabled={isDisabled}
                    />
                    <Label htmlFor={`col-${column.name}`} className="flex items-center space-x-1">
                      <span className="font-medium">
                        {column.originalName || column.name}
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        #{originalIndex}
                      </Badge>
                      {isHighlighted && (
                        <Tooltip>
                          <TooltipTrigger>
                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                          </TooltipTrigger>
                          <TooltipContent>Highlighted column</TooltipContent>
                        </Tooltip>
                      )}
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline">{column.type}</Badge>
                    {column.skewness !== undefined && (
                      <Badge variant={column.isSkewed ? "destructive" : "secondary"}>
                        Skew: {column.skewness.toFixed(2)}
                      </Badge>
                    )}
                    {column.missingValues > 0 && (
                      <Badge variant="outline" className="text-xs">
                        {column.missingPercent.toFixed(1)}% missing
                      </Badge>
                    )}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="icon" 
                          className="h-8 w-8 text-primary"
                          onClick={() => handleExploreColumn(column)}
                        >
                          <ChartColumn className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Explore {column.originalName || column.name}</TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              );
            })}
          </div>
          
          {filteredColumns.length === 0 && searchTerm && (
            <div className="text-center py-4 text-muted-foreground">
              No columns found matching "{searchTerm}"
            </div>
          )}
        </CardContent>
      </Card>

      <ColumnExploreDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        column={selectedColumnForExplore}
        dataset={dataset}
      />
    </TooltipProvider>
  );
} 