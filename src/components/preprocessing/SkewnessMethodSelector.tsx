import { useState } from 'react';
import { ColumnInfo, DatasetType } from '@/types/dataset';
import { SkewnessMethod } from '@/types/methods';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

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

  const getColumnConfig = (columnName: string): ColumnConfigType | undefined => {
    return columnConfigurations.find(config => config.columnName === columnName);
  };

  return (
    <div className="space-y-4">
      <Card className="mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Configure Skewness Transformation Methods</CardTitle>
          <CardDescription>
            Select transformation methods for each column to reduce skewness
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Choose the appropriate transformation method for each column based on the direction and magnitude of skewness.
            For positively skewed data (skewness {'>'} 0), logarithmic or square root transformations are recommended.
          </p>
          
          <div className="relative w-full mt-4">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search columns..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {filteredColumns.map(columnName => {
          const config = getColumnConfig(columnName);
          const columnInfo = getColumnInfo(columnName);
          const methodOptions = getMethodOptions();
          
          if (!config) return null;

          return (
            <Card key={columnName} className={columnInfo?.isSkewed ? "border-amber-300" : ""}>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center justify-between">
                  <span>{columnName}</span>
                  {columnInfo?.skewness !== undefined && (
                    <span className={`text-sm px-2 py-1 rounded ${columnInfo.isSkewed ? 'bg-amber-100 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300' : 'bg-muted text-muted-foreground'}`}>
                      Skewness: {columnInfo.skewness.toFixed(2)}
                      {columnInfo.isSkewed && <span className="ml-1">(Significant)</span>}
                    </span>
                  )}
                </CardTitle>
                <CardDescription>
                  {columnInfo?.type === 'numeric' 
                    ? 'Numeric column' 
                    : 'Non-numeric column'}
                </CardDescription>
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