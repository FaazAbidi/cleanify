import React, { useState, useRef, useContext } from "react";
import { VersionNode } from "@/types/version";
import { TaskVersion } from "@/types/version";
import { ReactFlowTree } from "@/components/ui/version-tree/ReactFlowTree";
import { useVersionTree } from "@/hooks/useVersionTree";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { 
  ChevronRight,
  ChevronLeft,
  Link,
  GalleryHorizontalEnd,
  BarChart2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TaskPageContext } from "@/pages/TaskPage";
import { StatusBadge } from "../ui/StatusBadge";

interface VersionHistoryProps {
  versions: TaskVersion[];
  onSelectVersion?: (version: TaskVersion) => void;
  selectedVersionId?: number;
}

export function VersionHistory({ 
  versions, 
  onSelectVersion, 
  selectedVersionId 
}: VersionHistoryProps) {
  const tree = useVersionTree(versions);
  const [selectedNode, setSelectedNode] = useState<VersionNode | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { selectVersionAndExplore, selectVersionAndPreprocess } = useContext(TaskPageContext);

  const handleSelectNode = (node: VersionNode) => {
    setSelectedNode(node);
    setSidebarOpen(true);
    // if (onSelectVersion) {
    //   onSelectVersion(node.version);
    // }
  };

  const toggleSidebar = () => {
    setSidebarOpen(prev => !prev);
  };

  const handleExploreData = (version: TaskVersion) => {
    // Use the context function to select version and navigate to exploration
    selectVersionAndExplore(version);
  };

  const handleCreateNewVersion = (version: TaskVersion) => {
    // Use the context function to select version and navigate to preprocessing
    selectVersionAndPreprocess(version);
  };

  return (
    <Card className="w-full border shadow-sm">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Version History</CardTitle>
            <CardDescription className="mt-2">
              Tree visualization of task version history and branches
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex h-[600px]">
          <div 
            className={cn(
              "flex-1 transition-all duration-300 ease-in-out",
              sidebarOpen && selectedNode ? "pr-4" : ""
            )}
          >
            <div className="h-full w-full border rounded-md overflow-hidden bg-background">
              <ReactFlowTree 
                tree={tree}
                onSelectVersion={handleSelectNode}
                selectedVersionId={selectedVersionId}
              />
            </div>
          </div>
          
          {selectedNode && (
            <div className={cn(
              "transition-all duration-300 ease-in-out border rounded-md p-4 overflow-hidden bg-background",
              sidebarOpen ? "w-[300px] opacity-100 pl-4" : "w-0 opacity-0"
            )}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-base font-semibold">Version Details</h3>
                <Button variant="ghost" size="icon" onClick={toggleSidebar} className="-mr-2">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              
              <ScrollArea className="h-[calc(100%-2rem)] pr-2">
                <div className="flex flex-col justify-between h-full pb-6">
                <dl className="space-y-2">
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">Name</dt>
                    <dd className="text-sm font-medium">{selectedNode.version.name}</dd>
                  </div>
                  <div className="mb-2">
                    <dt className="text-sm font-medium text-muted-foreground">Status</dt>
                    <dd className="text-sm">
                      <StatusBadge status={selectedNode.version.status} />
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">ID</dt>
                    <dd className="text-sm">{selectedNode.version.id}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">Method ID</dt>
                    <dd className="text-sm">{selectedNode.version.method_id || 'None'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">Created</dt>
                    <dd className="text-sm">
                      {selectedNode.version.created_at && new Date(selectedNode.version.created_at).toLocaleString()}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">Children</dt>
                    <dd className="text-sm mt-1">{selectedNode.children.length}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">Parent Version</dt>
                    <dd className="text-sm mt-1">{selectedNode.version.prev_version || 'None (Root)'}</dd>
                  </div>
                </dl>
                <div className="flex flex-col justify-center">
                  <Button 
                    variant="default" 
                    size="lg" 
                    className="mt-2"
                    onClick={() => handleExploreData(selectedNode.version)}
                  >
                    <BarChart2 className="h-4 w-4 mr-1" />
                    Explore this version
                  </Button>
                  <Button 
                    variant="outline" 
                    size="lg" 
                    className="mt-2"
                    onClick={() => handleCreateNewVersion(selectedNode.version)}
                  >
                    <GalleryHorizontalEnd className="h-4 w-4 mr-1" />
                    Create a new version
                  </Button>
                </div>
                </div>
              </ScrollArea>
            </div>
          )}
          
          {!sidebarOpen && selectedNode && (
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              className="ml-2 self-start"
              title="Open Details Sidebar"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 