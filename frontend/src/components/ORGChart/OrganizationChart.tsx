/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ReactFlow,
  type Node,
  type Edge,
  addEdge,
  type Connection,
  useNodesState,
  useEdgesState,
  Controls,
  useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import PersonNode from "./PersonNode";
import { CollapsedState, NodeData } from "./type/type";
import {
  useCurrentEmployeeAllDetails,
  useGetEmployeeHierarchy,
  useGetEmployeeSubordinateHierarchy,
} from "../../hooks/useEmployee";
import HeaderBar from "../HeaderBar";
import { useLocation, useNavigate } from "react-router";
import dagre from "dagre";
import { Position } from "@xyflow/react";
import OrgChartSkeleton from "../shared/molecules/Skeletons/OrgChartSkeleton";

const nodeTypes = {
  person: PersonNode,
};

const countTotalDescendants = (node: any): number => {
  let count = 0;
  if (node.children) {
    count += node.children.length;
    node.children.forEach((child: any) => {
      count += countTotalDescendants(child);
    });
  }
  return count;
};

const findNode = (
  hierarchy: any[] | any,
  id: string
): any | null => {
  const list = Array.isArray(hierarchy) ? hierarchy : [hierarchy];
  for (const node of list) {
    if (node.id === id) return node;
    if (node.children?.length) {
      const found = findNode(node.children, id);
      if (found) return found;
    }
  }
  return null;
};

const findParent = (
  root: any,
  employeeId: string
): any | null => {
  if (!employeeId) return null;
  for (const child of root.children || []) {
    if (child.id === employeeId) return root;
    const found = findParent(child, employeeId);
    if (found) return found;
  }
  return null;
};

/**
 * Build a 3-level hierarchy: Parent -> User -> Children
 */
const buildThreeLevelHierarchy = (
  user: any,
  parent: any | null,
): { nodes: Node<NodeData>[]; edges: Edge[] } => {
  const nodes: Node<NodeData>[] = [];
  const edges: Edge[] = [];

  // 1. Parent (top level if exists)
  if (parent) {
    const direct = parent.children?.length || 0;
    const total = countTotalDescendants(parent);
    nodes.push({
      id: parent.id,
      type: "person",
      position: { x: 0, y: 0 },
      data: {
        id: parent.id,
        name: parent.name,
        title: parent.title || "",
        hasChildren: true,
        isExpanded: true,
        onToggleExpand: () => { },
        totalChildren: total,
        directChildren: direct,
        indirectChildren: total - direct,
      },
    });

    edges.push({
      id: `e${parent.id}-${user.id}`,
      source: parent.id,
      target: user.id,
      type: "step",
      style: { stroke: "#d1d5db", strokeWidth: 2 },
    });
  }

  // 2. Main User (middle level)
  const directUser = user.children?.length || 0;
  const totalUser = countTotalDescendants(user);
  nodes.push({
    id: user.id,
    type: "person",
    position: { x: 0, y: 300 }, // Initial position, dagre will re-layout
    data: {
      id: user.id,
      name: user.name,
      title: user.title || "",
      hasChildren: directUser > 0,
      isExpanded: true,
      onToggleExpand: () => { },
      totalChildren: totalUser,
      directChildren: directUser,
      indirectChildren: totalUser - directUser,
    },
  });

  // 3. Children (bottom level)
  if (user.children && user.children.length > 0) {
    user.children.forEach((child: any) => {
      const childDirect = child.children?.length || 0;
      const childTotal = countTotalDescendants(child);
      nodes.push({
        id: child.id,
        type: "person",
        position: { x: 0, y: 600 },
        data: {
          id: child.id,
          name: child.name,
          title: child.title || "",
          hasChildren: childDirect > 0,
          isExpanded: false, // Don't show grandchildren
          onToggleExpand: () => { },
          totalChildren: childTotal,
          directChildren: childDirect,
          indirectChildren: childTotal - childDirect,
        },
      });

      edges.push({
        id: `e${user.id}-${child.id}`,
        source: user.id,
        target: child.id,
        type: "step",
        style: { stroke: "#d1d5db", strokeWidth: 2 },
      });
    });
  }

  return { nodes, edges };
};

export default function OrganizationChart() {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<NodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [collapsedNodes, setCollapsedNodes] = useState<CollapsedState>({});
  const navigate = useNavigate();
  const [layoutReady, setLayoutReady] = useState(false);

  const { search } = useLocation();
  const query = new URLSearchParams(search);
  const employeeIdFromQuery = query.get("employee");
  const { data: user } = useCurrentEmployeeAllDetails();

  const employeeId = employeeIdFromQuery || user?.employee || "";

  const { data: employeeHierarchy } = useGetEmployeeHierarchy(
    user?.company ?? "",
    employeeId || ""
  );

  const {
    data: employeeSubordinateHierarchy,
    isLoading: employeeSubordinateHierarchyIsLoading,
  } = useGetEmployeeSubordinateHierarchy(employeeId);
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  const NODE_WIDTH = 320;
  const NODE_HEIGHT = 120;

  const getLayoutedElements = (
    nodes: Node<NodeData>[],
    edges: Edge[],
    direction: "TB" | "LR" = "TB"
  ) => {
    dagreGraph.setGraph({
      rankdir: direction,
      nodesep: 80,
      ranksep: 100,
      marginx: 50,
      marginy: 50,
    });

    nodes.forEach((node) => {
      dagreGraph.setNode(node.id, {
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
      });
    });

    edges.forEach((edge) => {
      dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    const isHorizontal = direction === "LR";

    const layoutedNodes = nodes.map((node) => {
      const dagreNode = dagreGraph.node(node.id);

      return {
        ...node,
        targetPosition: isHorizontal ? Position.Left : Position.Top,
        sourcePosition: isHorizontal ? Position.Right : Position.Bottom,
        position: {
          x: dagreNode.x - NODE_WIDTH / 2,
          y: dagreNode.y - NODE_HEIGHT / 2,
        },
      };
    });

    return { nodes: layoutedNodes, edges };
  };

  // Build nodes/edges when data comes
  useEffect(() => {
    const activeHierarchy = employeeIdFromQuery ? employeeSubordinateHierarchy : employeeHierarchy;

    if (
      employeeId &&
      activeHierarchy &&
      !employeeSubordinateHierarchyIsLoading
    ) {
      const hierarchyArray = Array.isArray(activeHierarchy)
        ? activeHierarchy
        : [activeHierarchy];

      let currentUserNode: any | null = null;
      let parentNode: any | null = null;

      for (const hierarchyData of hierarchyArray) {
        currentUserNode = findNode(hierarchyData, employeeId);
        if (currentUserNode) {
          parentNode = findParent(hierarchyData, employeeId);
          break;
        }
      }

      if (currentUserNode) {
        const { nodes: initialNodes, edges: initialEdges } = buildThreeLevelHierarchy(
          currentUserNode,
          parentNode
        );

        const { nodes: layoutedNodes, edges: layoutedEdges } =
          getLayoutedElements(initialNodes, initialEdges);

        setNodes(layoutedNodes);
        setEdges(layoutedEdges);
        setLayoutReady(true);
      }
    }
  }, [
    employeeId,
    employeeIdFromQuery,
    employeeSubordinateHierarchy,
    employeeHierarchy,
    setNodes,
    setEdges,
    employeeSubordinateHierarchyIsLoading,
  ]);

  const onConnect = useCallback(
    (params: Edge | Connection) =>
      setEdges((eds: Edge[]) => addEdge(params, eds)),
    [setEdges]
  );

  const getDescendants = useCallback(
    (nodeId: string): string[] => {
      const descendants: string[] = [];
      edges.forEach((edge) => {
        if (edge.source === nodeId) {
          descendants.push(edge.target);
          descendants.push(...getDescendants(edge.target));
        }
      });
      return descendants;
    },
    [edges]
  );

  const toggleNodeExpansion = useCallback(
    (nodeId: string) => {
      setNodes((nds: any[]) =>
        nds.map((node) => {
          if (node.id === nodeId) {
            return {
              ...node,
              data: { ...node.data, isExpanded: !node.data.isExpanded },
            };
          }
          return node;
        })
      );

      setCollapsedNodes((prev) => {
        const newCollapsed = { ...prev };
        const descendants = getDescendants(nodeId);
        const nodeData = nodes.find((n) => n.id === nodeId)?.data;
        if (nodeData?.isExpanded) {
          descendants.forEach((desc) => (newCollapsed[desc] = true));
        } else {
          descendants.forEach((desc) => delete newCollapsed[desc]);
        }
        return newCollapsed;
      });
    },
    [nodes, getDescendants]
  );

  const visibleNodes = nodes.filter((node) => !collapsedNodes[node.id]);
  const visibleEdges = edges.filter(
    (edge) => !collapsedNodes[edge.source] && !collapsedNodes[edge.target]
  );

  const nodesWithToggle = visibleNodes.map((node) => ({
    ...node,
    data: {
      ...node.data,
      onToggleExpand: node.data.hasChildren ? toggleNodeExpansion : () => { },
    },
  }));

  const proOptions = { hideAttribution: true };

  if (!layoutReady) {
    return (
      <div className="w-full h-screen bg-white">
        <HeaderBar title="organizational chart" onBack={() => navigate(-1)} />
        {/* ---------------- Skeleton Loader ---------------- */}
        <OrgChartSkeleton />
        {/* ---------------- Skeleton Loader ---------------- */}
      </div>
    );
  }


  return (
    <div className="w-full h-screen  bg-white">
      <HeaderBar title="organizational chart" onBack={() => navigate(-1)} />
      <ReactFlow
        nodes={nodesWithToggle}
        edges={visibleEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="top-right"
        proOptions={proOptions}
        minZoom={0.1}
        maxZoom={2}
        zoomOnPinch={true}
        defaultViewport={{ x: 0, y: 0, zoom: 0.6 }}
      >
        <AutoFocusNode nodeId={employeeId} layoutReady={layoutReady} />

        <Controls
          position="top-right"
          showZoom
          showFitView
          showInteractive={false}
        />
      </ReactFlow>

    </div>
  );
}


function AutoFocusNode({
  nodeId,
  layoutReady,
}: {
  nodeId: string | null;
  layoutReady: boolean;
}) {
  const { fitView, getNodes } = useReactFlow();
  const hasFocused = useRef(false);

  useEffect(() => {
    if (!layoutReady || !nodeId || hasFocused.current) return;

    const node = getNodes().find((n) => n.id === nodeId);
    if (!node || node.position.x === 0 && node.position.y === 0) return;

    requestAnimationFrame(() => {
      fitView({
        nodes: [node],
        padding: 0.6,
        duration: 800,
        maxZoom: 1.2,
      });
      hasFocused.current = true;
    });
  }, [layoutReady, nodeId, fitView, getNodes]);

  return null;
}