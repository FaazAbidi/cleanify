import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { TaskVersion } from "@/types/version";
import { formatDistance } from "date-fns";
import { StatusBadge } from "./ui/StatusBadge";
import { formatBytes } from "@/lib/format";
import { GitBranch, Calendar, FileText, HardDrive, Activity } from "lucide-react";

interface TaskVersionSelectorProps {
  versions: TaskVersion[];
  selectedVersion: TaskVersion | null;
  onSelectVersion: (versionId: number) => void;
  loading: boolean;
}

export function TaskVersionSelector({
  versions,
  selectedVersion,
  onSelectVersion,
  loading
}: TaskVersionSelectorProps) {
  // Format the date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return formatDistance(date, new Date(), { addSuffix: true });
  };

  return (
    <Card className="hover:shadow-lg transition-all duration-300">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GitBranch className="h-5 w-5" />
          Data Version
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Version Selection */}
        <div className="space-y-3">
          <Label htmlFor="version-select" className="text-sm font-medium text-foreground">
            Select a data version to view different preprocessing results
          </Label>
          <div className="relative">
            <Select
              disabled={loading || versions.length === 0}
              value={selectedVersion?.id?.toString() || ""}
              onValueChange={(value) => onSelectVersion(parseInt(value))}
            >
              <SelectTrigger id="version-select" className="h-12">
                <SelectValue placeholder="Select a version" />
              </SelectTrigger>
              <SelectContent>
                {versions.map((version) => (
                  <SelectItem key={version.id} value={version.id.toString()}>
                    <div className="flex items-center gap-2">
                      <GitBranch className="h-3 w-3" />
                      {version.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {selectedVersion && (
          <>
            {/* Version Header */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
              <GitBranch className="h-4 w-4 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Version</p>
                <p className="font-semibold text-foreground">{selectedVersion.name}</p>
              </div>
              <StatusBadge status={selectedVersion.status} />
            </div>

            {/* Status and File Name */}
            <div className="grid grid-cols-1 gap-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
                <Activity className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">Processing Status</p>
                  <StatusBadge status={selectedVersion.status} />
                </div>
              </div>

              {selectedVersion.file && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
                  <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">File Name</p>
                    <p className="text-sm font-medium text-foreground truncate" title={selectedVersion.file.file_name}>
                      {selectedVersion.file.file_name}
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-xs flex-shrink-0">
                    {selectedVersion.status === 'RAW' ? 'Original' : 'Processed'}
                  </Badge>
                </div>
              )}
            </div>

            {/* Date Information */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
                <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">Created</p>
                  <p className="text-sm font-medium text-foreground">{formatDate(selectedVersion.created_at)}</p>
                </div>
              </div>
              
              {selectedVersion.file?.file_size && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
                  <HardDrive className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">File Size</p>
                    <p className="text-sm font-medium text-foreground">{formatBytes(selectedVersion.file.file_size)}</p>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
              <p className="text-sm text-muted-foreground">Loading versions...</p>
            </div>
          </div>
        )}

        {!loading && versions.length === 0 && (
          <div className="text-center py-8">
            <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
              <GitBranch className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No versions available</p>
              <p className="text-xs text-muted-foreground mt-1">Process this task to create data versions</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 