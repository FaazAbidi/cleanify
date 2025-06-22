import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  MiniMap,
  NodeProps,
  NodeChange,
  EdgeChange,
  applyNodeChanges,
  applyEdgeChanges,
  ConnectionLineType,
  Panel,
  useReactFlow,
  ReactFlowProvider,
  MarkerType,
  EdgeTypes,
  BezierEdge,
  Handle,
  Position,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { VersionNode as VersionNodeType, VersionTree as VersionTreeType } from "@/types/version";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { RefreshCcw, ZoomIn, ZoomOut, GripVertical } from 'lucide-react';
import { TaskVersion } from "@/types/version";

// Custom node component
function VersionNodeComponent({ data }: NodeProps) {
  const { node, onClick, isSelected, isLocallySelected } = data;
  const { version } = node;
  
  // Status color mapping
  const getStatusColor = (status: string | null) => {
    const statusColors: Record<string, string> = {
      RAW: "bg-yellow-100 text-yellow-800 dark:bg-yellow-950/20 dark:text-yellow-300",
      PROCESSED: "bg-blue-100 text-blue-800 dark:bg-blue-950/20 dark:text-blue-300",
      COMPLETED: "bg-green-100 text-green-800 dark:bg-green-950/20 dark:text-green-300",
      ERROR: "bg-red-100 text-red-800 dark:bg-red-950/20 dark:text-red-300",
      RUNNING: "bg-purple-100 text-purple-800 dark:bg-purple-950/20 dark:text-purple-300",
      FAILED: "bg-red-100 text-red-800 dark:bg-red-950/20 dark:text-red-300"
    };
    return status ? statusColors[status] || "" : "";
  };

  // Determine border styling based on selection type
  const getBorderStyle = () => {
    if (isSelected) {
      return 'ring-2 ring-green-500 dark:ring-green-400'; // Green border for global selection (version selector)
    } else if (isLocallySelected) {
      return 'ring-2 ring-purple-500 dark:ring-purple-400'; // Purple border for local selection (clicked in tree)
    }
    return '';
  };
  
  return (
    <div style={{ width: 240 }}>
      <Handle
        type="target"
        position={Position.Top}
        id="target"
        style={{ background: '#555', width: 10, height: 10, opacity: 0 }}
      />
      <Card 
        className={`shadow-md transition-shadow hover:shadow-lg ${getBorderStyle()}`}
      >
        <div className="flex justify-center py-1 cursor-grab border-b border-muted bg-muted/30">
          <GripVertical className="h-4 w-4 text-muted-foreground rotate-90" />
        </div>
        
        <div className="nodrag" onClick={onClick}>
          <CardHeader className="p-3 pb-2">
            <div className="flex justify-between items-start">
              <CardTitle className="text-sm font-medium truncate">
                {version.name}
              </CardTitle>
              <Badge className={`text-xs ${getStatusColor(version.status)} ml-2`}>
                {version.status || "Unknown"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {version.created_at && 
                formatDistanceToNow(new Date(version.created_at), { addSuffix: true })}
            </p>
          </CardHeader>
          <CardContent className="p-3 pt-0 text-xs">
            <p className="truncate">ID: {version.id}</p>
          </CardContent>
        </div>
      </Card>
      <Handle
        type="source"
        position={Position.Bottom}
        id="source"
        style={{ background: '#555', width: 10, height: 1, opacity: 0 }}
      />
    </div>
  );
}

// Custom edge style
const edgeStyle = {
  stroke: '#6366f1', // Indigo color for better visibility
  strokeWidth: 2.5,
  strokeOpacity: 0.8
};

// Custom node types
const nodeTypes = {
  versionNode: VersionNodeComponent,
};

// Define edge types
const edgeTypes = {
  default: BezierEdge,
};

interface ReactFlowTreeProps {
  tree: VersionTreeType;
  onSelectVersion?: (node: VersionNodeType) => void;
  selectedVersionId?: number;
}

// Main component wrapped with provider
export function ReactFlowTree(props: ReactFlowTreeProps) {
  return (
    <ReactFlowProvider>
      <ReactFlowTreeInner {...props} />
    </ReactFlowProvider>
  );
}

// Inner component with access to ReactFlow context
function ReactFlowTreeInner({ 
  tree, 
  onSelectVersion,
  selectedVersionId 
}: ReactFlowTreeProps) {
  const reactFlowInstance = useReactFlow();
  const [viewport, setViewport] = useState({ x: 0, y: 0, zoom: 0.5 });
  const initialFitDoneRef = useRef(false);
  const [locallySelectedNodeId, setLocallySelectedNodeId] = useState<string | null>(null);
  
  // First initialize with initialNodes, but keep positions when selection changes
  const [firstRender, setFirstRender] = useState(true);
  
  // Handler for local node selection
  const handleNodeClick = useCallback((node: VersionNodeType) => {
    setLocallySelectedNodeId(node.version.id.toString());
    if (onSelectVersion) {
      onSelectVersion(node);
    }
  }, [onSelectVersion]);
  
  // Convert the version tree to ReactFlow nodes and edges
  const { initialNodes, initialEdges } = useMemo(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    
    // Track processed nodes to avoid duplicates in case of a complex tree
    const processedNodeIds = new Set<number>();
    
    // Collect all parent-child relationships
    const relationships: {parent: number, child: number}[] = [];
    
    // Helper function to process nodes recursively with automatic layout
    const processNode = (node: VersionNodeType, depth: number, index: number, siblingCount: number, parentX?: number) => {
      if (processedNodeIds.has(node.version.id)) return;
      processedNodeIds.add(node.version.id);
      
      // Calculate position (basic tree layout)
      // For a simple tree layout, we position nodes in a grid
      // with children below their parents
      const siblingWidth = 300; // Width between siblings
      const levelHeight = 200;   // Height between levels
      
      let xPos = 0;
      // If it's the first node (root), place it in the middle
      if (depth === 0 && siblingCount === 1) {
        xPos = 0; // Center the only root
      } else if (parentX !== undefined) {
        // Position based on parent X + offset based on index
        const totalWidth = (siblingCount - 1) * siblingWidth;
        const startX = parentX - totalWidth / 2;
        xPos = startX + index * siblingWidth;
      } else {
        // Multiple roots at level 0
        const totalWidth = (siblingCount - 1) * siblingWidth;
        const startX = -totalWidth / 2;
        xPos = startX + index * siblingWidth;
      }
      
      // Create the node
      const newNode: Node = {
        id: node.version.id.toString(),
        type: 'versionNode',
        data: { 
          node, 
          onClick: () => handleNodeClick(node),
          isSelected: node.version.id === selectedVersionId,
          isLocallySelected: node.version.id.toString() === locallySelectedNodeId
        },
        position: { x: xPos, y: depth * levelHeight },
        draggable: true,
      };
      
      nodes.push(newNode);
      
      // Process children
      if (node.children.length > 0) {
        // Process all children with their new parent coordinates
        node.children.forEach((child, childIndex) => {
          // Add relationship to collect all parent-child connections
          relationships.push({
            parent: node.version.id,
            child: child.version.id
          });
          
          processNode(child, depth + 1, childIndex, node.children.length, xPos);
        });
      }
    };
    
    // Process the tree starting with root nodes
    if (tree.roots.length > 0) {
      tree.roots.forEach((root, index) => {
        processNode(root, 0, index, tree.roots.length);
      });
    }
    
    // Create all the edges after all nodes have been processed
    relationships.forEach(({ parent, child }) => {
      edges.push({
        id: `edge-${parent}-${child}`,
        source: parent.toString(),
        target: child.toString(),
        sourceHandle: 'source',
        targetHandle: 'target',
        style: edgeStyle,
        type: 'default',
        animated: true, 
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 20, 
          height: 20,
          color: '#6366f1',
        },
      });
    });
    
    return { initialNodes: nodes, initialEdges: edges };
  }, [tree, selectedVersionId, handleNodeClick, locallySelectedNodeId]);
  
  // State for nodes and edges
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);
  
  // Modify the useEffect that updates nodes
  useEffect(() => {
    if (firstRender) {
      // On first render, use the initial layout
      setNodes(initialNodes);
      setEdges(initialEdges);
      setFirstRender(false);
    } else {
      // For subsequent renders, only update the isSelected property
      setNodes(currentNodes => {
        return currentNodes.map(node => {
          const nodeId = node.id;
          // Find the matching node in initialNodes to get latest data
          const updatedNode = initialNodes.find(n => n.id === nodeId);
          if (updatedNode) {
            // Keep position but update data with selection state
            return {
              ...node,
              data: {
                ...node.data,
                isSelected: nodeId === selectedVersionId?.toString(),
                isLocallySelected: nodeId === locallySelectedNodeId
              }
            };
          }
          return node;
        });
      });
    }
  }, [initialNodes, initialEdges, selectedVersionId, locallySelectedNodeId]);
  
  // Handle node drag and changes
  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );
  
  // Handle edge changes
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );
  
  // Reset layout
  const resetLayout = useCallback(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
    
    setTimeout(() => {
      reactFlowInstance.fitView({ padding: 0.5 });
    }, 50);
  }, [initialNodes, initialEdges, reactFlowInstance]);

  // Zoom functions
  const zoomIn = () => {
    reactFlowInstance.zoomIn();
  };

  const zoomOut = () => {
    reactFlowInstance.zoomOut();
  };

  const fitView = () => {
    reactFlowInstance.fitView({ padding: 0.5 });
  };

  const onMoveEnd = useCallback((viewport) => {
    setViewport(viewport);
  }, []);

  useEffect(() => {
    if (reactFlowInstance && !initialFitDoneRef.current && nodes.length > 0) {
      // Small delay to ensure all nodes are rendered
      setTimeout(() => {
        reactFlowInstance.fitView({ padding: 0.5 });
        initialFitDoneRef.current = true;
      }, 100);
    }
  }, [reactFlowInstance, nodes]);

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        // fitView
        fitViewOptions={{ padding: 1 }}
        minZoom={0.1}
        maxZoom={2}
        defaultViewport={viewport}
        onMoveEnd={onMoveEnd}
        connectionLineType={ConnectionLineType.Bezier}
        deleteKeyCode={null}
        nodesDraggable={true}
        elementsSelectable={true}
        onSelectionChange={() => {}}
        panOnScroll
        selectionOnDrag={false}
        zoomOnScroll
        proOptions={{ hideAttribution: true }}
        className="react-flow-tree-container"
      >
        <Background color="#09956e" gap={16} />
        <MiniMap 
          nodeStrokeWidth={3}
          nodeColor="#3ec49e"
          nodeBorderRadius={2}
          maskColor="rgba(0, 0, 0, 0.1)"
        />
        <Panel position="top-right" className="p-2 bg-background/90 rounded-md shadow-md">
          <div className="flex flex-col gap-2">
            <Button size="sm" variant="outline" onClick={resetLayout}>
              <RefreshCcw className="h-4 w-4 mr-1" />
              Reset
            </Button>
            <div className="flex gap-1">
              <Button size="sm" variant="outline" onClick={zoomIn}>
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="outline" onClick={fitView}>
                Fit
              </Button>
              <Button size="sm" variant="outline" onClick={zoomOut}>
                <ZoomOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
} 