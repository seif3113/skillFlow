import type { Node, Edge } from "@xyflow/react";
import dagre from "dagre";

export interface LayoutNode {
  id: string;
  label: string;
  description: string;
  resources: { title: string; url: string }[];
}

export interface LayoutEdge {
  source: string;
  target: string;
}

/**
 * Apply dagre auto-layout to nodes and edges
 * Returns nodes with calculated positions
 */
export function getLayoutedElements(
  nodes: LayoutNode[],
  edges: LayoutEdge[],
  direction: "TB" | "LR" = "TB",
): { nodes: Node[]; edges: Edge[] } {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  const nodeWidth = 250;
  const nodeHeight = 80;

  dagreGraph.setGraph({
    rankdir: direction,
    nodesep: 50,
    ranksep: 80,
    marginx: 50,
    marginy: 50,
  });

  // Add nodes to dagre
  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  // Add edges to dagre
  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  // Calculate layout
  dagre.layout(dagreGraph);

  // Convert to React Flow format
  const layoutedNodes: Node[] = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      id: node.id,
      type: "roadmapNode",
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      },
      data: {
        label: node.label,
        description: node.description,
        resources: node.resources,
        completed: false,
      },
    };
  });

  const layoutedEdges: Edge[] = edges.map((edge) => ({
    id: `e${edge.source}-${edge.target}`,
    source: edge.source,
    target: edge.target,
    type: "smoothstep",
    animated: false,
  }));

  return { nodes: layoutedNodes, edges: layoutedEdges };
}
