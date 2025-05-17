import { useState } from "react";
import { DatasetType } from "@/types/dataset";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCorrelationData } from "@/hooks/useCorrelationData";
import { CorrelationHeatmap } from "./correlation/CorrelationHeatmap";
import { FeatureCorrelationScatter } from "./correlation/FeatureCorrelationScatter";
import { TopCorrelationsList } from "./correlation/TopCorrelationsList";
import { CorrelationInfo } from "./correlation/CorrelationInfo";

interface CorrelationAnalysisProps {
  dataset: DatasetType;
}

export const CorrelationAnalysis = ({ dataset }: CorrelationAnalysisProps) => {
  const [isHeatmapOpen, setIsHeatmapOpen] = useState(false);
  
  const {
    numericColumns,
    correlatedNumericColumns,
    correlationMatrix,
    correlationLabels,
    scatterData,
    heatmapData,
    correlation,
    correlationMessage,
    
    xColumn,
    yColumn,
    targetColumn,
    filterByTargetColumn,
    
    setXColumn,
    setYColumn,
    setTargetColumn,
    handleFilterChange
  } = useCorrelationData(dataset);

  if (numericColumns.length < 2) {
    return (
      <div className="space-y-6 w-full overflow-hidden">
        <Card>
          <CardHeader>
            <CardTitle>Feature Correlation Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="py-10 text-center">
              <p className="text-muted-foreground">
                At least two numeric columns are required for correlation analysis
              </p>
            </div>
          </CardContent>
        </Card>
        <CorrelationInfo />
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full overflow-hidden">
      {/* Feature Correlation Analysis Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Feature Correlation Analysis</CardTitle>
          <CorrelationHeatmap
            matrix={correlationMatrix}
            labels={correlationLabels}
            isOpen={isHeatmapOpen}
            onOpenChange={setIsHeatmapOpen}
          />
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <FeatureCorrelationScatter
              xColumn={xColumn}
              yColumn={yColumn}
              numericColumns={numericColumns}
              correlation={correlation}
              scatterData={scatterData}
              onXColumnChange={setXColumn}
              onYColumnChange={setYColumn}
            />
            
            <TopCorrelationsList
              correlationMessage={correlationMessage}
              heatmapData={heatmapData}
              targetColumn={targetColumn}
              filterByTargetColumn={filterByTargetColumn}
              correlatedNumericColumns={correlatedNumericColumns}
              onTargetColumnChange={setTargetColumn}
              onFilterChange={handleFilterChange}
            />
          </div>
        </CardContent>
      </Card>

      {/* Understanding Correlations Card */}
      <CorrelationInfo />
    </div>
  );
};
