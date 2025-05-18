import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { TaskVersion } from "@/types/version";
import { formatDistance } from "date-fns";
import { StatusBadge } from "./ui/StatusBadge";
import { formatBytes } from "@/lib/format";

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
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Data Version</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="version-select">Select a data version to view different preprocessing results</Label>
            <Select
              disabled={loading || versions.length === 0}
              value={selectedVersion?.id?.toString() || ""}
              onValueChange={(value) => onSelectVersion(parseInt(value))}
            >
              <SelectTrigger id="version-select">
                <SelectValue placeholder="Select a version" />
              </SelectTrigger>
              <SelectContent>
                {versions.map((version) => (
                  <SelectItem key={version.id} value={version.id.toString()}>
                    {version.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedVersion && (
            <div className="space-y-2 pt-4 border-t">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-muted-foreground">Version:</div>
                <div>{selectedVersion.name}</div>
                
                <div className="text-muted-foreground">Created:</div>
                <div>{formatDate(selectedVersion.created_at)}</div>
                
                <div className="text-muted-foreground">Status:</div>
                <div>
                  <StatusBadge status={selectedVersion.status} />
                </div>

                {selectedVersion.file && (
                  <>
                    <div className="text-muted-foreground">File:</div>
                    <div>{selectedVersion.file.file_name}</div>
                    
                    {selectedVersion.file.file_size && (
                      <>
                        <div className="text-muted-foreground">File Size:</div>
                        <div>{formatBytes(selectedVersion.file.file_size)}</div>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {loading && (
            <div className="text-center py-2">
              <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-primary mx-auto"></div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 