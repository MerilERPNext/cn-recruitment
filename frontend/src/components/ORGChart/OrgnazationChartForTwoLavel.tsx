/* eslint-disable react-refresh/only-export-components */
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
import { useGetEmployeeSubordinateHierarchy } from "../../hooks/useEmployee";
import { useNavigate, useParams } from "react-router";
import { IoChevronForwardOutline } from "react-icons/io5";

const normalizeId = (id: unknown): string | null => {
  if (!id) return null;
  return String(id);
};

const isMatch = (nodeId: string, userId: unknown) => {
  const normNodeId = normalizeId(nodeId);
  const normUserId = normalizeId(userId);
  return (
    normNodeId !== null && normUserId !== null && normNodeId === normUserId
  );
};

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

// Find immediate parent
export const findParent = (
  root: EmployeeHierarchy,
  employeeId: unknown
): EmployeeHierarchy | null => {
  const empId = normalizeId(employeeId);
  if (!empId) return null;
  for (const child of root.children || []) {
    if (isMatch(child.id, empId)) return root;
    const found = findParent(child, empId);
    if (found) return found;
  }
  return null;
};

// ✅ New: Find grandparent
export const findGrandParent = (
  root: EmployeeHierarchy,
  employeeId: unknown
): EmployeeHierarchy | null => {
  const parent = findParent(root, employeeId);
  if (parent) {
    return findParent(root, parent.id);
  }
  return null;
};

// ✅ Show grandparent → parent → current user → children (only current branch)
const buildHierarchyWithGrandparent = (
  user: EmployeeHierarchy,
  parent: EmployeeHierarchy | null,
  grandParent: EmployeeHierarchy | null
): { nodes: Node<NodeData>[]; edges: Edge[] } => {
  const nodes: Node<NodeData>[] = [];
  const edges: Edge[] = [];
  const baseY = 100;

  // 🧓 Grandparent (top)
  if (grandParent) {
    nodes.push({
      id: grandParent.id,
      type: "person",
      position: { x: 400, y: baseY },
      data: {
        id: grandParent.id,
        name: grandParent.name,
        title: grandParent.title || "",
        hasChildren: true,
        isExpanded: true,
        onToggleExpand: () => { },
        showExpand: false,
        totalChildren: grandParent.children?.length || 0,
      },
    });

    if (parent) {
      edges.push({
        id: `e${grandParent.id}-${parent.id}`,
        source: grandParent.id,
        target: parent.id,
        type: "step",
        style: { stroke: "#d1d5db", strokeWidth: 2 },
      });
    }
  }

  // 👨 Parent (middle)
  if (parent) {
    nodes.push({
      id: parent.id,
      type: "person",
      position: { x: 400, y: baseY + 150 },
      data: {
        id: parent.id,
        name: parent.name,
        title: parent.title || "",
        hasChildren: true,
        isExpanded: true,
        onToggleExpand: () => { },
        showExpand: false,
        totalChildren: parent.children?.length || 0,
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

  // 👤 Current user
  const visibleChildren = (user.children || []).slice(0, 5);
  const totalChildren = user.children?.length || 0;

  nodes.push({
    id: user.id,
    type: "person",
    position: { x: 400, y: baseY + 300 },
    data: {
      id: user.id,
      name: user.name,
      title: user.title || "",
      hasChildren: totalChildren > 0,
      childrens: visibleChildren,
      totalChildren,
      showExpand: false,
      isExpanded: true,
      onToggleExpand: () => { },
    },
  });

  // 👶 Children (limit 5)
  if (visibleChildren.length > 0) {
    const childSpacing = 250;
    const totalWidth = (visibleChildren.length - 1) * childSpacing;
    const startX = 400 - totalWidth / 2;

    visibleChildren.forEach((child, index) => {
      const childX = startX + index * childSpacing;
      const childY = baseY + 450;

      nodes.push({
        id: child.id,
        type: "person",
        position: { x: childX, y: childY },
        data: {
          id: child.id,
          name: child.name,
          title: child.title || "",
          hasChildren: (child.children || []).length > 0,
          childrens: child.children || [],
          totalChildren: child.children?.length || 0,
          showExpand: false,
          isExpanded: false,
          onToggleExpand: () => { },
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

export default function ThreeLevelOrgChart() {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<NodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const navigate = useNavigate();
  const { id: employeeId } = useParams<{ id: string }>();
  const { data: employeeHierarchy } = useGetEmployeeSubordinateHierarchy(
    employeeId || ""
  );

  useEffect(() => {
    if (!employeeHierarchy || !employeeId) return;

    const hierarchyArray = Array.isArray(employeeHierarchy)
      ? employeeHierarchy
      : [employeeHierarchy];

    let currentUser: EmployeeHierarchy | null = null;
    let parent: EmployeeHierarchy | null = null;
    let grandParent: EmployeeHierarchy | null = null;

    for (const hierarchyData of hierarchyArray) {
      currentUser = findNode(hierarchyData, employeeId);
      if (currentUser) {
        parent = findParent(hierarchyData, employeeId);
        grandParent = findGrandParent(hierarchyData, employeeId);
        break;
      }
    }

    if (currentUser) {
      const { nodes, edges } = buildHierarchyWithGrandparent(
        currentUser,
        parent,
        grandParent
      );
      setNodes(nodes);
      setEdges(edges);
    }
  }, [employeeHierarchy, employeeId, setNodes, setEdges]);

  return (
    <div className="w-full bg-gray-100">
      <div className=" bg-white shadow-sm px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900">
          Organizational Chart
        </h1>

        <button
          onClick={() => navigate("/webapp/organizational-chart")}
          className="flex items-center space-x-1 text-gray-700 hover:text-black"
        >
          <span className="text-sm font-medium text-blue-600">View All</span>
          <IoChevronForwardOutline size={18} />
        </button>
      </div>

      <div className="h-[400px]">

        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={{ person: PersonNode }}
          fitView
          attributionPosition="top-right"
          proOptions={{ hideAttribution: true }}
          minZoom={0.1}
          maxZoom={2}
          defaultViewport={{ x: 0, y: 0, zoom: 0.7 }}
          zoomOnScroll={false}
        >
          <Controls position="top-right" showZoom showFitView />
        </ReactFlow>
      </div>
    </div>
  );
}
