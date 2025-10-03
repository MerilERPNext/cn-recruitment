/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useState } from "react";
import {
  ReactFlow,
  type Node,
  type Edge,
  addEdge,
  type Connection,
  useNodesState,
  useEdgesState,
  Controls,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import PersonNode from "./PersonNode";
import { CollapsedState, NodeData } from "./type/type";
import { useLoggedInUser } from "../../hooks/useLoggedInUser";
import {
  useCurrentEmployeeAllDetails,
  useGetEmployeeHierarchy,
  useGetEmployeeSubordinateHierarchy,
} from "../../hooks/useEmployee";
import HeaderBar from "../HeaderBar";
import { useLocation, useNavigate } from "react-router";

const nodeTypes = {
  person: PersonNode,
};

/**
 * Recursively build nodes and edges from employeeHierarchy
 */
const buildHierarchy = (
  employee: any,
  parentId: string | null = null,
  level = 0,
  xOffset = 600
): { nodes: Node<NodeData>[]; edges: Edge[] } => {
  const nodes: Node<NodeData>[] = [];
  const edges: Edge[] = [];

  const nodeId = employee.id;
  const hasChildren = employee.children && employee.children.length > 0;

  nodes.push({
    id: nodeId,
    type: "person",
    position: { x: xOffset, y: 100 + level * 150 },
    data: {
      id: nodeId,
      name: employee.name,
      title: employee.title || "",
      childrens: employee?.children,
      hasChildren,
      isExpanded: true,
      onToggleExpand: () => {},
    },
  });

  if (parentId) {
    edges.push({
      id: `e${parentId}-${nodeId}`,
      source: parentId,
      target: nodeId,
      type: "step",
      style: { stroke: "#d1d5db", strokeWidth: 2 },
    });
  }

  if (hasChildren) {
    employee.children.forEach((child: any, index: number) => {
      const childX =
        xOffset - (employee.children.length - 1) * 200 + index * 400;
      const childHierarchy = buildHierarchy(child, nodeId, level + 1, childX);
      nodes.push(...childHierarchy.nodes);
      edges.push(...childHierarchy.edges);
    });
  }

  return { nodes, edges };
};

export default function OrganizationChart() {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<NodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [collapsedNodes, setCollapsedNodes] = useState<CollapsedState>({});
  const navigate = useNavigate();

  const { data: userId } = useLoggedInUser();
  const { data: user } = useCurrentEmployeeAllDetails(userId || "");
  const { data: employeeHierarchy } = useGetEmployeeHierarchy(
    user?.company ?? ""
  );
  const { search } = useLocation();
  const query = new URLSearchParams(search);
  const employeeId = query.get("employee");

  const {
    data: employeeSubordinateHierarchy,
    isLoading: employeeSubordinateHierarchyIsLoading,
  } = useGetEmployeeSubordinateHierarchy(employeeId ?? "");

  // Build nodes/edges when data comes
  useEffect(() => {
    if (
      employeeId &&
      employeeSubordinateHierarchy &&
      !employeeSubordinateHierarchyIsLoading
    ) {
      const hierarchyArray = Array.isArray(employeeSubordinateHierarchy)
        ? employeeSubordinateHierarchy
        : [employeeSubordinateHierarchy];

      let allNodes: Node<NodeData>[] = [];
      let allEdges: Edge[] = [];

      hierarchyArray.forEach((hierarchyData, index) => {
        const { nodes, edges } = buildHierarchy(
          hierarchyData,
          null,
          0,
          600 + index * 800
        );
        allNodes = [...allNodes, ...nodes];
        allEdges = [...allEdges, ...edges];
      });

      setNodes(allNodes);
      setEdges(allEdges);
      return;
    }

    // Otherwise, use the full company hierarchy
    if (employeeHierarchy) {
      const hierarchyArray = Array.isArray(employeeHierarchy)
        ? employeeHierarchy
        : [employeeHierarchy];

      let allNodes: Node<NodeData>[] = [];
      let allEdges: Edge[] = [];

      hierarchyArray.forEach((hierarchyData, index) => {
        const { nodes, edges } = buildHierarchy(
          hierarchyData,
          null,
          0,
          600 + index * 800
        );
        allNodes = [...allNodes, ...nodes];
        allEdges = [...allEdges, ...edges];
      });

      setNodes(allNodes);
      setEdges(allEdges);
    }
  }, [
    employeeId,
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
      onToggleExpand: node.data.hasChildren ? toggleNodeExpansion : () => {},
    },
  }));

  const proOptions = { hideAttribution: true };

  return (
    <div className="w-full h-screen  bg-gray-100">
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
        defaultViewport={{ x: 0, y: 0, zoom: 0.6 }}
      >
        <Controls
          position="top-right"
          showZoom={true}
          showFitView={true}
          showInteractive={false}
        />
      </ReactFlow>
    </div>
  );
}
