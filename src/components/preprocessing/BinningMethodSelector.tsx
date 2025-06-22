import { ColumnInfo, DatasetType } from '@/types/dataset';
import { BinningColumnConfig } from '@/hooks/useBinningConfig';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, BarChart3 } from 'lucide-react';

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

  return (
    <div className="space-y-6">
      <Alert className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
        <Info className="h-4 w-4" />
        <AlertDescription>
          <p className="font-medium mb-2">Binning Strategies:</p>
          <ul className="text-sm space-y-1">
            <li><strong>Equal Width:</strong> Splits the numeric range into bins of identical width</li>
            <li><strong>Equal Depth:</strong> Splits so each bin holds roughly the same number of rows</li>
          </ul>
        </AlertDescription>
      </Alert>

      <div className="grid gap-4">
        {selectedColumns.map(columnName => {
          const config = getColumnConfig(columnName);
          const columnInfo = getColumnInfo(columnName);
          
          return (
            <Card key={columnName}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  {columnName}
                </CardTitle>
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
                        const value = parseInt(e.target.value) || 3;
                        handleBinCountChange(columnName, Math.max(2, Math.min(20, value)));
                      }}
                      className="w-full"
                    />
                    <p className="text-xs text-muted-foreground">
                      Between 2 and 20 bins
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-muted rounded-md">
                  <div className="text-sm">
                    <div className="font-medium mb-1">Preview:</div>
                    <div>
                      Strategy: <span className="font-medium">{config.strategy === 'equal_width' ? 'Equal Width' : 'Equal Depth'}</span>
                    </div>
                    <div>
                      Bins: <span className="font-medium">{config.binCount}</span>
                    </div>
                    <div className="text-muted-foreground mt-1">
                      New column: <span className="text-blue-600 dark:text-blue-400">Bin_{columnName}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Alert className="bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800">
        <Info className="h-4 w-4" />
        <AlertDescription>
          <div className="font-medium mb-2">Important Notes:</div>
          <ul className="text-sm space-y-1">
            <li>• Each selected column will get a new binned version (e.g., "Bin_Age")</li>
            <li>• Original numeric columns will be preserved</li>
            <li>• Bin labels will show the range (e.g., "20 ≤ Age &lt; 30")</li>
            <li>• Equal depth binning may result in slightly uneven bin sizes due to duplicate values</li>
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  );
} 