import { useMemo } from "react";
import { TaskVersion } from "@/types/version";
import { VersionNode, VersionTree } from "@/types/version";

export function useVersionTree(versions: TaskVersion[]): VersionTree {
  return useMemo(() => {
    // Create a map for quick access to versions by ID
    const versionMap = new Map<number, TaskVersion>();
    versions.forEach(version => {
      versionMap.set(version.id, version);
    });

    // Map to store nodes with their children
    const nodeMap = new Map<number, VersionNode>();
    
    // Create nodes for each version
    versions.forEach(version => {
      nodeMap.set(version.id, {
        version,
        children: []
      });
    });

    // Build the tree by connecting parents and children
    const roots: VersionNode[] = [];
    
    versions.forEach(version => {
      const node = nodeMap.get(version.id)!;
      
      if (version.prev_version === null) {
        // This is a root node
        roots.push(node);
      } else {
        // Add this node as a child of its parent
        const parentNode = nodeMap.get(version.prev_version);
        if (parentNode) {
          parentNode.children.push(node);
        } else {
          // If parent is not found (could be filtered out), treat as root
          roots.push(node);
        }
      }
    });

    return { roots };
  }, [versions]);
} 