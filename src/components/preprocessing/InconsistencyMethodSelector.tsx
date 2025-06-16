import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatasetType, ColumnInfo } from '@/types/dataset';
import { InconsistencyMethod } from '@/types/methods';
import { ColumnInconsistencyConfig } from '@/hooks/useInconsistencyConfig';
import { Search } from 'lucide-react';

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
  const getAvailableMethods = (columnName: string): InconsistencyMethod[] => {
    if (isCategorical(columnName)) {
      return ['impute_mode', 'impute_random', 'remove'] as InconsistencyMethod[];
    }
    return ['impute_mean', 'impute_median', 'impute_random', 'remove'] as InconsistencyMethod[];
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

  // Get method display name for better readability
  const getMethodDisplayName = (method: InconsistencyMethod): string => {
    switch (method) {
      case 'impute_mean':
        return 'Replace with Mean';
      case 'impute_median':
        return 'Replace with Median';
      case 'impute_mode':
        return 'Replace with Most Common Value';
      case 'impute_random':
        return 'Replace with Random Value';
      case 'remove':
        return 'Remove Inconsistent Values';
      default:
        return method;
    }
  };

  return (
    <div className="space-y-6">
      <div className="relative">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search columns..."
          className="pl-8"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      
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
                  <div className="flex justify-between">
                    <div>
                      <h3 className="font-medium text-sm">{columnName}</h3>
                      <p className="text-xs text-muted-foreground">
                        Type: {columnInfo.type}, Missing: {columnInfo.missingValues} ({columnInfo.missingPercent.toFixed(1)}%)
                      </p>
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