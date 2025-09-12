"use client";

import { useEffect } from "react";
import {
  ReactFlow,
  Node,
  Edge,
  useNodesState,
  useEdgesState,
  Controls,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import PersonNode from "./PersonNode";
import { EmployeeHierarchy, NodeData } from "./type/type";
import { useLoggedInUser } from "../../hooks/useLoggedInUser";
import {
  useCurrentEmployeeAllDetails,
  useGetEmployeeHierarchy,
} from "../../hooks/useEmployee";
import { useNavigate } from "react-router";
import { IoChevronForwardOutline } from "react-icons/io5";

// ✅ Normalize IDs to string for reliable comparison
const normalizeId = (id: unknown): string | null => {
  if (!id) return null;
  return String(id);
};

// ✅ Safe match helper
const isMatch = (nodeId: string, userId: unknown) => {
  const normNodeId = normalizeId(nodeId);
  const normUserId = normalizeId(userId);
  return (
    normNodeId !== null && normUserId !== null && normNodeId === normUserId
  );
};

// ✅ Recursive: find node in tree
// eslint-disable-next-line react-refresh/only-export-components
export function findNode(
  hierarchy: EmployeeHierarchy[] | EmployeeHierarchy,
  id: string
): EmployeeHierarchy | null {
  const list = Array.isArray(hierarchy) ? hierarchy : [hierarchy];
  for (const node of list) {
    if (node.id === id) return node;
    if (node.children?.length) {
      const found = findNode(node.children, id);
      if (found) return found;
    }
  }
  return null;
}

// ✅ Recursive: find parent of a node
// eslint-disable-next-line react-refresh/only-export-components
export const findParent = (
  root: EmployeeHierarchy,
  employeeId: unknown
): EmployeeHierarchy | null => {
  for (const child of root.children) {
    if (isMatch(child.id, employeeId)) return root;
    const found = findParent(child, employeeId);
    if (found) return found;
  }
  return null;
};

// ✅ Build nodes/edges for only parent + current user + children
const buildTwoLevelHierarchy = (
  user: EmployeeHierarchy,
  parent: EmployeeHierarchy | null
): { nodes: Node<NodeData>[]; edges: Edge[] } => {
  const nodes: Node<NodeData>[] = [];
  const edges: Edge[] = [];
  const baseY = 100;

  // Parent node
  if (parent) {
    nodes.push({
      id: parent.id,
      type: "person",
      position: { x: 400, y: baseY },
      data: {
        id: parent.id,
        name: parent.name,
        title: parent.title || "",
        hasChildren: true,
        isExpanded: true,
        onToggleExpand: () => {},
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

  // Current user
  nodes.push({
    id: user.id,
    type: "person",
    position: { x: 400, y: baseY + 150 },
    data: {
      id: user.id,
      name: user.name,
      title: user.title || "",
      hasChildren: user.children.length > 0,
      isExpanded: true,
      onToggleExpand: () => {},
    },
  });

  // Children
  user.children.forEach((child, index) => {
    const childX = 400 - (user.children.length - 1) * 200 + index * 400;
    nodes.push({
      id: child.id,
      type: "person",
      position: { x: childX, y: baseY + 300 },
      data: {
        id: child.id,
        name: child.name,
        title: child.title || "",
        hasChildren: child.children.length > 0,
        isExpanded: true,
        onToggleExpand: () => {},
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

  return { nodes, edges };
};

export default function TwoLevelOrgChart() {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<NodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const navigatorate = useNavigate();

  const { data: userId } = useLoggedInUser();
  const { data: user } = useCurrentEmployeeAllDetails(userId || "");
  const { data: employeeHierarchy } = useGetEmployeeHierarchy(
    user?.company ?? ""
  );
  const employeeId = user?.employee ?? "";
  useEffect(() => {
    if (!employeeHierarchy || !employeeId) {
      console.log("⏳ Waiting for data...", { employeeHierarchy, employeeId });
      return;
    }
    const currentUser = findNode(
      employeeHierarchy as unknown as EmployeeHierarchy,
      employeeId
    );
    const parent = findParent(
      employeeHierarchy as unknown as EmployeeHierarchy,
      employeeId
    );
    if (currentUser) {
      const { nodes, edges } = buildTwoLevelHierarchy(currentUser, parent);
      setNodes(nodes);
      setEdges(edges);
    }
  }, [employeeHierarchy, employeeId, setNodes, setEdges]);

  const proOptions = { hideAttribution: true };

  return (
    <div className="w-full h-screen bg-gray-100">
      <div className=" bg-white shadow-sm px-4 py-3 flex items-center justify-between">
        <h1></h1>
        {/* Title */}
        <h1 className="text-lg font-semibold text-gray-900">
          Organizational Chart
        </h1>

        {/* Right side */}
        <button
          onClick={() => navigatorate("/webapp/organizational-chart")}
          className="flex items-center space-x-1 text-gray-700 hover:text-black focus:outline-none"
        >
          <span className="text-sm font-medium text-blue-600">View All</span>
          <IoChevronForwardOutline size={18} />
        </button>
      </div>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={{ person: PersonNode }}
        fitView
        attributionPosition="top-right"
        proOptions={proOptions}
        minZoom={0.1}
        maxZoom={2}
        defaultViewport={{ x: 0, y: 0, zoom: 0.7 }}
      >
        <Controls position="top-right" showZoom={true} showFitView={true} />
      </ReactFlow>
    </div>
  );
}
