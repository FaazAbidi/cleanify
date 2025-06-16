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
import { ChartColumn, Info, Search } from 'lucide-react';
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
  const isCategorical = (columnName: string): boolean => {
    const column = getColumnInfo(columnName);
    return column?.type === 'categorical' || column?.type === 'text' || column?.type === 'boolean';
  };

  // Get available methods for a column based on its type
  const getAvailableMethods = (columnName: string): ImputationMethod[] => {
    if (isCategorical(columnName)) {
      return ['impute_mode', 'impute_random', 'remove'] as ImputationMethodCategorical[];
    }
    return ['impute_mean', 'impute_median', 'impute_random', 'remove', 'impute_constant'] as ImputationMethodNumeric[];
  };

  // Handle method change for a column
  const handleMethodChange = (columnName: string, method: ImputationMethod) => {
    const updatedConfigs = columnConfigurations.map(config => {
      if (config.columnName === columnName) {
        return { ...config, method };
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

  const handleExploreColumn = (column: ColumnInfo) => {
    setSelectedColumnForExplore(column);
    setDialogOpen(true);
  };

  // Get method display name
  const getMethodDisplayName = (method: ImputationMethod): string => {
    switch (method) {
      case 'impute_mean': return 'Mean';
      case 'impute_mode': return 'Mode';
      case 'impute_median': return 'Median';
      case 'impute_random': return 'Random';
      case 'remove': return 'Remove';
      case 'impute_constant': return 'Constant';
      default: return method;
    }
  };

  // Get tooltip description for method
  const getMethodDescription = (method: ImputationMethod): string => {
    switch (method) {
      case 'impute_mean': 
        return 'Replace missing values with the mean of the column. Only applicable for numerical data.';
      case 'impute_mode': 
        return 'Replace missing values with the most frequent value in the column.';
      case 'impute_median': 
        return 'Replace missing values with the median of the column. Only applicable for numerical data.';
      case 'impute_random': 
        return 'Replace missing values with a random value from the column.';
      case 'remove': 
        return 'Remove rows with missing values in this column.';
      case 'impute_constant': 
        return 'Replace missing values with a user-specified constant value. Enter the desired value in the input field.';
      default: 
        return '';
    }
  };

  return (
    <Card className="w-full mt-4">
      <CardHeader>
        <CardTitle className="text-lg">Configure Imputation Methods</CardTitle>
        <p className="text-sm text-muted-foreground">
          Select an imputation method for each column. Available methods depend on the column type.
        </p>
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
        <div className="w-full border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[30%]">Column</TableHead>
                <TableHead className="w-[20%]">Type</TableHead>
                <TableHead>Method</TableHead>
              </TableRow>
            </TableHeader>
          </Table>
          <div className="max-h-[300px] overflow-y-auto border-t">
            <Table>
              <TableBody className="overflow-y-auto">
                {filteredColumns.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-6 text-muted-foreground">
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
                        <TableCell className="w-[30%]">{columnName}</TableCell>
                        <TableCell className="w-[20%]">
                          <Badge variant="outline">{columnInfo?.type || 'unknown'}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-4">
                            <Select
                              value={config?.method || availableMethods[0]}
                              onValueChange={(value) => handleMethodChange(columnName, value as ImputationMethod)}
                            >
                              <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Select method" />
                              </SelectTrigger>
                              <SelectContent>
                                {availableMethods.map(method => (
                                  <SelectItem key={method} value={method}>
                                    {getMethodDisplayName(method)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            
                            {config?.method === 'impute_constant' && (
                              <Input
                                type={columnInfo?.type === 'numeric' ? 'number' : 'text'}
                                placeholder="Enter constant value"
                                className="w-[150px]"
                                value={config.value || ''}
                                onChange={(e) => handleConstantValueChange(columnName, e.target.value)}
                              />
                            )}
                            
                            {/* explore button */}
                            <Button 
                              variant="outline" 
                              size="icon" 
                              className="h-8 w-8 text-primary"
                              onClick={() => handleExploreColumn(columnInfo)}
                            >
                              <ChartColumn className="h-4 w-4" />
                            </Button>
                              
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  {getMethodDescription(config?.method || availableMethods[0])}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>

                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <ColumnExploreDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        column={selectedColumnForExplore}
        dataset={dataset}
      />
      </CardContent>
    </Card>
  );
} 