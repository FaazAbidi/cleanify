import React, { useState } from 'react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Zap, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  analyzeDatasetPerformance, 
  getPerformanceRecommendations,
  type DatasetPerformanceInfo 
} from "@/lib/performance-utils";

interface PerformanceWarningProps {
  columnCount: number;
  rowCount: number;
  className?: string;
  showRecommendations?: boolean;
  onOptimize?: () => void;
}

export const PerformanceWarning = ({ 
  columnCount, 
  rowCount, 
  className = "",
  showRecommendations = true,
  onOptimize
}: PerformanceWarningProps) => {
  const [showDetails, setShowDetails] = useState(false);
  
  const performanceInfo = analyzeDatasetPerformance(columnCount, rowCount);
  const recommendations = showRecommendations ? getPerformanceRecommendations(performanceInfo) : [];

  // Don't render if dataset is not large
  if (!performanceInfo.isLarge) {
    return null;
  }

  const getAlertVariant = () => {
    if (performanceInfo.isVeryLarge) return "destructive";
    return "default";
  };

  const getAlertIcon = () => {
    if (performanceInfo.isVeryLarge) {
      return <AlertTriangle className="h-4 w-4" />;
    }
    return <Info className="h-4 w-4" />;
  };

  const formatMemoryUsage = (mb: number) => {
    if (mb < 1) return `${(mb * 1024).toFixed(0)} KB`;
    if (mb < 1024) return `${mb.toFixed(1)} MB`;
    return `${(mb / 1024).toFixed(1)} GB`;
  };

  return (
    <div className={className}>
      <Alert className={`border-2 ${performanceInfo.isVeryLarge ? 'border-red-200 bg-red-50' : 'border-yellow-200 bg-yellow-50'}`}>
        {getAlertIcon()}
        <AlertDescription>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="font-semibold mb-1">
                {performanceInfo.isVeryLarge ? '⚠️ Very Large Dataset Detected' : '📊 Large Dataset Detected'}
              </div>
              <div className="text-sm mb-2">
                <strong>{columnCount.toLocaleString()}</strong> columns × <strong>{rowCount.toLocaleString()}</strong> rows
                {performanceInfo.estimatedMemoryUsage > 0 && (
                  <span className="ml-2">
                    (Est. memory: <strong>{formatMemoryUsage(performanceInfo.estimatedMemoryUsage)}</strong>)
                  </span>
                )}
              </div>
              
              <div className="flex items-center gap-2 mb-2">
                {performanceInfo.shouldUseSampling && (
                  <Badge variant="secondary" className="text-xs">
                    <Zap className="h-3 w-3 mr-1" />
                    Sampling Mode
                  </Badge>
                )}
                {performanceInfo.isVeryLarge && (
                  <Badge variant="destructive" className="text-xs">
                    Performance Impact
                  </Badge>
                )}
              </div>

              <div className="text-sm">
                {performanceInfo.isVeryLarge 
                  ? "Some visualizations may be simplified or disabled for optimal performance."
                  : "Distribution calculations may use sampling for better performance."
                }
              </div>
            </div>

            <div className="flex items-center gap-2 ml-4">
              {onOptimize && (
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={onOptimize}
                  className="text-xs"
                >
                  Optimize
                </Button>
              )}
              {recommendations.length > 0 && (
                <Collapsible open={showDetails} onOpenChange={setShowDetails}>
                  <CollapsibleTrigger asChild>
                    <Button size="sm" variant="ghost" className="text-xs">
                      {showDetails ? 'Hide' : 'Show'} Tips
                    </Button>
                  </CollapsibleTrigger>
                </Collapsible>
              )}
            </div>
          </div>

          {recommendations.length > 0 && (
            <Collapsible open={showDetails} onOpenChange={setShowDetails}>
              <CollapsibleContent className="mt-3 pt-3 border-t border-current/20">
                <div className="text-sm">
                  <div className="font-medium mb-2">Performance Recommendations:</div>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    {recommendations.map((recommendation, index) => (
                      <li key={index}>{recommendation}</li>
                    ))}
                  </ul>
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}
        </AlertDescription>
      </Alert>
    </div>
  );
}; 