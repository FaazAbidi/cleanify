import { Progress } from "@/components/ui/progress";
import { Loader2, Clock, Database, Cpu } from "lucide-react";

interface TaskLoadingIndicatorProps {
  progress: number;
  stage?: string;
  showDetails?: boolean;
}

export function TaskLoadingIndicator({ 
  progress, 
  stage = "Loading task data...", 
  showDetails = false 
}: TaskLoadingIndicatorProps) {
  // Get stage icon based on the current stage
  const getStageIcon = (currentStage: string) => {
    if (currentStage.includes('Downloading') || currentStage.includes('Loading file')) {
      return <Database className="h-4 w-4" />;
    } else if (currentStage.includes('Processing') || currentStage.includes('Calculating')) {
      return <Cpu className="h-4 w-4" />;
    } else if (currentStage.includes('Parsing')) {
      return <Clock className="h-4 w-4" />;
    }
    return <Loader2 className="h-4 w-4 animate-spin" />;
  };

  return (
    <div className="py-8 text-center space-y-4">
      <div className="flex items-center justify-center gap-3">
        {getStageIcon(stage)}
        <span className="text-lg font-medium">
          {showDetails && stage ? stage : "Loading task data..."}
        </span>
      </div>
      
      <div className="max-w-md mx-auto space-y-2">
        <Progress value={progress} className="w-full" />
        <p className="text-sm text-muted-foreground">
          {progress.toFixed(0)}% complete
        </p>
        
        {showDetails && stage && (
          <p className="text-xs text-muted-foreground bg-muted rounded-md px-3 py-2">
            {stage}
          </p>
        )}
        
        {progress > 0 && progress < 30 && (
          <p className="text-xs text-blue-600 animate-pulse">
            💡 Large datasets may take a moment to process...
          </p>
        )}
        
        {progress >= 30 && progress < 80 && (
          <p className="text-xs text-green-600 animate-pulse">
            ⚡ Processing columns and calculating statistics...
          </p>
        )}
      </div>
      
      {progress > 80 && (
        <p className="text-xs text-muted-foreground animate-pulse">
          Almost ready... Finalizing dataset processing
        </p>
      )}
      
      {progress === 0 && (
        <div className="text-xs text-muted-foreground space-y-1">
          <p>🔄 Initializing data processing...</p>
          <p>Large datasets with 1000+ columns may take 30-60 seconds</p>
        </div>
      )}
    </div>
  );
} 