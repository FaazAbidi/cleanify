import { useState, useEffect } from 'react';
import { ColumnInfo } from '@/types/dataset';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, Eye, Info, ChartColumn, AlertTriangle } from 'lucide-react';
import { ColumnExploreDialog } from './ColumnExploreDialog';
import { DatasetType } from '@/types/dataset';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ColumnSelectorProps {
  columns: ColumnInfo[];
  selectedColumns: string[];
  onColumnSelectionChange: (selectedColumns: string[]) => void;
  disabledColumns?: string[];
  dataset?: DatasetType | null;
  highlightedColumns?: string[];
}

export function ColumnSelector({
  columns,
  selectedColumns,
  onColumnSelectionChange,
  disabledColumns = [],
  dataset = null,
  highlightedColumns = []
}: ColumnSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredColumns, setFilteredColumns] = useState<ColumnInfo[]>(columns);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedColumnForExplore, setSelectedColumnForExplore] = useState<ColumnInfo | null>(null);

  // Filter columns based on search term
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredColumns(columns);
    } else {
      const term = searchTerm.toLowerCase();
      setFilteredColumns(
        columns.filter(column => 
          column.name.toLowerCase().includes(term)
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
      const selectableColumns = columns
        .filter(col => !disabledColumns.includes(col.name))
        .map(col => col.name);
      onColumnSelectionChange(selectableColumns);
    } else {
      onColumnSelectionChange([]);
    }
  };

  // Check if all selectable columns are selected
  const selectableColumns = columns
    .filter(col => !disabledColumns.includes(col.name))
    .map(col => col.name);

  const allSelectableSelected = 
    selectableColumns.length > 0 && 
    selectableColumns.every(colName => selectedColumns.includes(colName)) &&
    selectedColumns.length === selectableColumns.length;
    
  // Handle exploring a column
  const handleExploreColumn = (column: ColumnInfo) => {
    setSelectedColumnForExplore(column);
    setDialogOpen(true);
  };

  return (
    <TooltipProvider>
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-lg">Select Columns</CardTitle>
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
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="select-all" 
                checked={allSelectableSelected && selectedColumns.length > 0}
                onCheckedChange={handleSelectAll}
              />
              <Label htmlFor="select-all">Select All</Label>
            </div>
          </div>
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {filteredColumns.map(column => {
              const isHighlighted = highlightedColumns.includes(column.name);
              
              return (
                <div 
                  key={column.name} 
                  className={`flex items-center justify-between p-2 hover:bg-accent rounded-md ${
                    isHighlighted ? 'bg-amber-50 dark:bg-amber-950/20 border-l-4 border-amber-400 dark:border-amber-500' : ''
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id={`col-${column.name}`}
                      checked={selectedColumns.includes(column.name)}
                      onCheckedChange={(checked) => handleColumnToggle(column.name, checked === true)}
                      disabled={disabledColumns.includes(column.name)}
                    />
                    <Label htmlFor={`col-${column.name}`} className="flex items-center space-x-1">
                      <span>{column.name}</span>
                      {isHighlighted && (
                        <Tooltip>
                          <TooltipTrigger>
                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                          </TooltipTrigger>
                          <TooltipContent>Skewed column</TooltipContent>
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
                      <TooltipContent>Explore {column.name}</TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              );
            })}
          </div>
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