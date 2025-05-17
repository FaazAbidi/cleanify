import { Loader2 } from "lucide-react";

interface TaskLoadingIndicatorProps {
  progress: number;
}

export function TaskLoadingIndicator({ progress }: TaskLoadingIndicatorProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <Loader2 className="h-8 w-8 animate-spin mb-4" />
      <p>Loading task data... {progress}%</p>
      <div className="w-2/3 h-2 bg-gray-200 rounded-full mt-2">
        <div 
          className="h-full bg-primary rounded-full transition-all duration-300 ease-in-out" 
          style={{ width: `${progress}%` }}
        ></div>
      </div>
    </div>
  );
} 