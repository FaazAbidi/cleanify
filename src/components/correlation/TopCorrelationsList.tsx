import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { getCorrelationColor, getCorrelationDescription } from "@/lib/correlation-utils";
import { useDarkMode } from "@/hooks/useDarkMode";

interface TopCorrelationsListProps {
  correlationMessage: string;
  heatmapData: Array<{ x: string; y: string; value: number }>;
  targetColumn: string;
  filterByTargetColumn: boolean;
  correlatedNumericColumns: Array<{ name: string; type: string }>;
  onTargetColumnChange: (value: string) => void;
  onFilterChange: (checked: boolean) => void;
}

export function TopCorrelationsList({
  correlationMessage,
  heatmapData,
  targetColumn,
  filterByTargetColumn,
  correlatedNumericColumns,
  onTargetColumnChange,
  onFilterChange,
}: TopCorrelationsListProps) {
  const { isDarkMode } = useDarkMode();
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-row justify-between items-center">
          <CardTitle className="text-lg">Top Correlations</CardTitle>
          <div className="flex items-center gap-2">
            <Switch 
              id="filter-target" 
              checked={filterByTargetColumn} 
              onCheckedChange={onFilterChange}
            />
            <Label htmlFor="filter-target" className="cursor-pointer">
              Filter by target
            </Label>
          </div>
        </div>
        {filterByTargetColumn && (
          <div className="mt-2">
            <Select value={targetColumn} onValueChange={onTargetColumnChange}>
              <SelectTrigger id="target-column">
                <SelectValue placeholder="Select target column" />
              </SelectTrigger>
              <SelectContent>
                {correlatedNumericColumns.map((col) => (
                  <SelectItem key={`target-${col.name}`} value={col.name}>
                    {col.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {correlationMessage ? (
          <div className="text-center py-4">
            <p className="text-muted-foreground">{correlationMessage}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {heatmapData.slice(0, 10).map((item, index) => {
              const backgroundColor = getCorrelationColor(item.value, isDarkMode);
              const description = getCorrelationDescription(item.value);
              
              return (
                <Card 
                  key={`corr-${index}`}
                  className="overflow-hidden"
                  style={{ backgroundColor: `${backgroundColor}15` }} // Light background based on correlation
                >
                  <CardContent className="p-4">
                    <div className="font-medium mb-1">
                      {item.x} vs {item.y}
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">
                        {description}
                      </span>
                      <Badge 
                        className="text-white font-medium"
                        style={{ backgroundColor }}
                      >
                        {item.value.toFixed(2)}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
} 