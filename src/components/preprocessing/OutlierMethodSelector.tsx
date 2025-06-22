import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatasetType, ColumnInfo } from '@/types/dataset';
import { OutlierMethod } from '@/types/methods';
import { ColumnOutlierConfig } from '@/hooks/useOutlierConfig';
import { Search, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface OutlierMethodSelectorProps {
  dataset: DatasetType | null;
  selectedColumns: string[];
  columnDetails: ColumnInfo[];
  columnConfigurations: ColumnOutlierConfig[];
  onConfigChange: (configurations: ColumnOutlierConfig[]) => void;
  getOutlierIndicesForColumn?: (columnName: string) => boolean[] | null;
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

  // Get outlier statistics for a column
  const getOutlierStats = (columnName: string): string => {
    // Try to use the new function if available
    if (getOutlierIndicesForColumn) {
      const outlierIndices = getOutlierIndicesForColumn(columnName);
      if (outlierIndices) {
        const outlierCount = outlierIndices.filter(Boolean).length;
        return `${outlierCount} outliers detected`;
      }
    }
    
    // Fall back to the column metadata if function not available
    const column = getColumnInfo(columnName);
    if (column && column.outliers !== undefined) {
      return `${column.outliers} outliers detected`;
    }
    
    return 'Outlier detection in progress...';
  };

  // Get outlier preview for a column
  const getOutlierPreview = (columnName: string): { count: number, total: number } => {
    if (getOutlierIndicesForColumn) {
      const outlierIndices = getOutlierIndicesForColumn(columnName);
      if (outlierIndices) {
        const outlierCount = outlierIndices.filter(Boolean).length;
        return { count: outlierCount, total: outlierIndices.length };
      }
    }
    
    const column = getColumnInfo(columnName);
    if (column && column.outliers !== undefined) {
      return { count: column.outliers, total: dataset?.rows || 0 };
    }
    
    return { count: 0, total: 0 };
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
          const availableMethods = getAvailableMethods();
          const outlierStats = getOutlierPreview(columnName);
          
          if (!columnInfo || !config) return null;
          
          return (
            <Card key={columnName}>
              <CardContent className="p-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <div>
                      <h3 className="font-medium text-sm">{columnName}</h3>
                      <p className="text-xs text-muted-foreground">
                        Type: {columnInfo.type}, {getOutlierStats(columnName)}
                      </p>
                    </div>
                    {outlierStats.count > 0 && (
                      <Badge variant="outline" className="bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        {outlierStats.count} outliers
                      </Badge>
                    )}
                  </div>
                  
                  <div className="grid gap-2">
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