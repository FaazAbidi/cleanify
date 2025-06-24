import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Download, Loader2 } from "lucide-react";
import { TaskVersion } from "@/types/version";
import { downloadVersionFile } from "@/lib/download-utils";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent, 
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface DownloadButtonProps {
  version: TaskVersion | null;
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  showProgress?: boolean;
}

export function DownloadButton({
  version,
  variant = "outline",
  size = "default",
  className,
  showProgress = false
}: DownloadButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  const handleDownload = async () => {
    if (!version || !version.file) {
      toast({
        title: "Download Error",
        description: "No file available for download",
        variant: "destructive",
      });
      return;
    }

    setIsDownloading(true);
    setProgress(0);

    try {
      await downloadVersionFile(version, (progressValue) => {
        setProgress(progressValue);
      });

      toast({
        title: "Download Complete",
        description: `${version.file.file_name} has been downloaded successfully`,
      });
    } catch (error) {
      console.error("Download failed:", error);
      toast({
        title: "Download Failed",
        description: "An error occurred while downloading the file. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
      setProgress(0);
    }
  };

  const isDisabled = !version || !version.file || isDownloading;

  return (
    <div className="space-y-2">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={handleDownload}
              disabled={isDisabled}
              variant={variant}
              size={size}
              className={cn("gap-2", className)}
            >
              {isDownloading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {size !== "icon" && (
                <span>{isDownloading ? "Downloading..." : "Download"}</span>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>
              {!version 
                ? "No version selected" 
                : !version.file 
                  ? "No file available" 
                  : `Download ${version.file.file_name}`
              }
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      
      {showProgress && isDownloading && (
        <div className="w-full">
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-muted-foreground mt-1 text-center">
            {progress}% complete
          </p>
        </div>
      )}
    </div>
  );
} 