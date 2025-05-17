import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer
} from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { getCorrelationColor, getCorrelationDescription } from "@/lib/correlation-utils";

interface FeatureCorrelationScatterProps {
  xColumn: string;
  yColumn: string;
  numericColumns: Array<{ name: string; type: string }>;
  correlation: number | null;
  scatterData: Array<{ x: number; y: number }>;
  onXColumnChange: (value: string) => void;
  onYColumnChange: (value: string) => void;
}

export function FeatureCorrelationScatter({
  xColumn,
  yColumn,
  numericColumns,
  correlation,
  scatterData,
  onXColumnChange,
  onYColumnChange,
}: FeatureCorrelationScatterProps) {
  return (
    <div className="space-y-6">
      {/* Column selection and correlation display */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Feature selection */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="x-column">X-Axis Feature</Label>
            <Select value={xColumn} onValueChange={onXColumnChange}>
              <SelectTrigger id="x-column">
                <SelectValue placeholder="Select column" />
              </SelectTrigger>
              <SelectContent>
                {numericColumns.map((col) => (
                  <SelectItem key={`x-${col.name}`} value={col.name}>
                    {col.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="y-column">Y-Axis Feature</Label>
            <Select value={yColumn} onValueChange={onYColumnChange}>
              <SelectTrigger id="y-column">
                <SelectValue placeholder="Select column" />
              </SelectTrigger>
              <SelectContent>
                {numericColumns.map((col) => (
                  <SelectItem key={`y-${col.name}`} value={col.name}>
                    {col.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Correlation information */}
        <div className="flex flex-col justify-center">
          <div className="text-center p-4 border rounded-lg">
            <h3 className="text-lg font-semibold mb-2">Correlation</h3>
            {correlation !== null ? (
              <>
                <div className="flex justify-center items-center gap-2 mb-2">
                  <Badge style={{ backgroundColor: getCorrelationColor(correlation) }}>
                    {correlation.toFixed(3)}
                  </Badge>
                  <span className="text-sm">{getCorrelationDescription(correlation)}</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {correlation > 0 
                    ? `As ${xColumn} increases, ${yColumn} tends to increase` 
                    : correlation < 0
                      ? `As ${xColumn} increases, ${yColumn} tends to decrease`
                      : `${xColumn} and ${yColumn} appear unrelated`}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Unable to calculate correlation for the selected columns
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Scatter plot visualization */}
      <div className="h-[300px] w-full">
        {scatterData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart
              margin={{ top: 20, right: 20, bottom: 30, left: 40 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                type="number" 
                dataKey="x" 
                name={xColumn} 
                label={{ value: xColumn, position: 'bottom' }} 
              />
              <YAxis 
                type="number" 
                dataKey="y" 
                name={yColumn} 
                label={{ value: yColumn, angle: -90, position: 'left' }} 
              />
              <Tooltip 
                cursor={{ strokeDasharray: '3 3' }}
                formatter={(value: any, name: any) => {
                  return [value.toFixed(2), name === 'x' ? xColumn : yColumn];
                }}
              />
              <Scatter 
                name="Data Points" 
                data={scatterData} 
                fill={correlation !== null ? getCorrelationColor(correlation) : "#9CA3AF"}
              />
            </ScatterChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center border rounded-lg">
            <p className="text-muted-foreground">
              No valid data points available for the selected columns
            </p>
          </div>
        )}
      </div>
    </div>
  );
} 