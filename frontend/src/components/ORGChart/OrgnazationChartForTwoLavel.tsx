/* eslint-disable react-refresh/only-export-components */
"use client";

import { useEffect, useCallback, useState } from "react";
import {
  ReactFlow,
  Node,
  Edge,
  useNodesState,
  useEdgesState,
  Controls,
  Position,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import PersonNode from "./PersonNode";
import DottedLineChipNode from "./DottedLineChipNode";
import { EmployeeHierarchy, NodeData } from "./type/type";
import { useGetEmployeeSubordinateHierarchy, useCurrentEmployeeAllDetails, useGetEmployeeDetailsByEmpId } from "../../hooks/useEmployee";
import { useNavigate } from "react-router";
import { IoChevronForwardOutline } from "react-icons/io5";
import { useTargetUser } from "../../context/ViewedUserContext";
import dagre from "dagre";
import { Typography } from "../shared/atoms/Typography";
import Button from "../shared/atoms/Button";

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

const PERSON_W = 320;
const PERSON_H = 120;
const CHIP_W = 200;
const CHIP_H = 36;

const getNodeDims = (node: Node) =>
  node.type === "dottedLineChip"
    ? { w: CHIP_W, h: CHIP_H }
    : { w: PERSON_W, h: PERSON_H };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getLayoutedElements = (nodes: Node<any>[], edges: Edge[], options = { direction: "TB" }) => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  dagreGraph.setGraph({
    rankdir: options.direction,
    nodesep: 80,
    ranksep: 80,
    marginx: 50,
    marginy: 50,
  });

  nodes.forEach((node) => {
    const { w, h } = getNodeDims(node);
    dagreGraph.setNode(node.id, { width: w, height: h });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const newNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    const { w, h } = getNodeDims(node);
    return {
      ...node,
      targetPosition: Position.Top,
      sourcePosition: Position.Bottom,
      position: {
        x: nodeWithPosition.x - w / 2,
        y: nodeWithPosition.y - h / 2,
      },
      style: { opacity: 1 },
    };
  });

  return { nodes: newNodes, edges };
};

const countTotalDescendants = (node: EmployeeHierarchy): number => {
  let count = 0;
  if (node.children) {
    count += node.children.length;
    node.children.forEach((child) => {
      count += countTotalDescendants(child);
    });
  }
  return count;
};

// ✅ Show grandparent → parent → current user → children (only current branch)
const buildHierarchyWithGrandparent = (
  user: EmployeeHierarchy,
  parent: EmployeeHierarchy | null,
  grandParent: EmployeeHierarchy | null
): { nodes: Node<NodeData>[]; edges: Edge[] } => {
  const nodes: Node<NodeData>[] = [];
  const edges: Edge[] = [];

  // 🧓 Grandparent (top)
  if (grandParent) {
    const direct = grandParent.children?.length || 0;
    const total = countTotalDescendants(grandParent);
    nodes.push({
      id: grandParent.id,
      type: "person",
      position: { x: 0, y: 0 },
      data: {
        id: grandParent.id,
        name: grandParent.name,
        title: grandParent.title || "",
        image: grandParent.image,
        hasChildren: true,
        isExpanded: true,
        onToggleExpand: () => { },
        showExpand: false,
        totalChildren: total,
        directChildren: direct,
        indirectChildren: total - direct,
      },
    });

    if (parent) {
      edges.push({
        id: `e${grandParent.id}-${parent.id}`,
        source: grandParent.id,
        target: parent.id,
        type: "smoothstep",
        style: { stroke: "#d1d5db", strokeWidth: 2 },
      });
    }
  }

  // 👨 Parent (middle)
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
        image: parent.image,
        title: parent.title || "",
        hasChildren: true,
        isExpanded: true,
        onToggleExpand: () => { },
        showExpand: false,
        totalChildren: total,
        directChildren: direct,
        indirectChildren: total - direct,
      },
    });

    edges.push({
      id: `e${parent.id}-${user.id}`,
      source: parent.id,
      target: user.id,
      type: "smoothstep",
      style: { stroke: "#d1d5db", strokeWidth: 2 },
    });
  }

  // 👤 Current user
  const visibleChildren = (user.children || []).slice(0, 5);
  const direct = user.children?.length || 0;
  const total = countTotalDescendants(user);

  nodes.push({
    id: user.id,
    type: "person",
    position: { x: 0, y: 0 },
    data: {
      id: user.id,
      name: user.name,
      image: user.image,
      title: user.title || "",
      hasChildren: total > 0,
      childrens: visibleChildren,
      totalChildren: total,
      directChildren: direct,
      indirectChildren: total - direct,
      showExpand: false,
      isExpanded: true,
      onToggleExpand: () => { },
    },
  });

  // 👶 Children (limit 5)
  if (visibleChildren.length > 0) {
    visibleChildren.forEach((child) => {
      const childDirect = child.children?.length || 0;
      const childTotal = countTotalDescendants(child);
      nodes.push({
        id: child.id,
        type: "person",
        position: { x: 0, y: 0 },
        data: {
          id: child.id,
          name: child.name,
          image: child.image,
          title: child.title || "",
          hasChildren: childTotal > 0,
          childrens: child.children || [],
          totalChildren: childTotal,
          directChildren: childDirect,
          indirectChildren: childTotal - childDirect,
          showExpand: false,
          isExpanded: false,
          onToggleExpand: () => { },
        },
      });

      edges.push({
        id: `e${user.id}-${child.id}`,
        source: user.id,
        target: child.id,
        type: "smoothstep",
        style: { stroke: "#d1d5db", strokeWidth: 2 },
      });
    });
  }

  return { nodes, edges };
};

export default function ThreeLevelOrgChart() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<any>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [showDottedManager, setShowDottedManager] = useState(false);
  const navigate = useNavigate();
  const { targetEmployeeId } = useTargetUser();
  const { data: currentUser, isLoading: isCurrentUserLoading } = useCurrentEmployeeAllDetails({
    fields: ["employee", "custom_dotted_line_manager"]
  });
  const { data: targetEmployeeDetails } = useGetEmployeeDetailsByEmpId(targetEmployeeId || "", ["employee", "custom_dotted_line_manager"]);
  const dottedManagerId = targetEmployeeId ? targetEmployeeDetails?.custom_dotted_line_manager : currentUser?.custom_dotted_line_manager;
  const { data: dottedLineManagerDetails } = useGetEmployeeDetailsByEmpId(dottedManagerId || "", ["employee", "employee_name"]);
  const dottedManagerName = dottedLineManagerDetails?.employee_name;
  // Use targetEmployeeId if viewing another user, otherwise use current user's employee ID
  const employeeId = targetEmployeeId || (isCurrentUserLoading ? null : currentUser?.employee) || "";

  const { data: employeeHierarchy } = useGetEmployeeSubordinateHierarchy(
    employeeId
  );

  // Reset dotted manager visibility when the viewed employee changes
  useEffect(() => {
    setShowDottedManager(false);
  }, [employeeId, dottedManagerId]);

  const handleShowDottedManager = useCallback(() => setShowDottedManager((prev) => !prev), []);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const calculateLayout = useCallback((nodes: Node<any>[], edges: Edge[]) => {
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      nodes,
      edges
    );
    setNodes([...layoutedNodes]);
    setEdges([...layoutedEdges]);
  }, [setNodes, setEdges]);

  useEffect(() => {
    if (!employeeHierarchy || !employeeId) return;

    const hierarchyArray = Array.isArray(employeeHierarchy)
      ? employeeHierarchy
      : [employeeHierarchy];

    let currentUserNode: EmployeeHierarchy | null = null;
    let parent: EmployeeHierarchy | null = null;
    let grandParent: EmployeeHierarchy | null = null;

    for (const hierarchyData of hierarchyArray) {
      currentUserNode = findNode(hierarchyData, employeeId);
      if (currentUserNode) {
        parent = findParent(hierarchyData, employeeId);
        grandParent = findGrandParent(hierarchyData, employeeId);
        break;
      }
    }

    if (currentUserNode) {
      const { nodes: initialNodes, edges: initialEdges } = buildHierarchyWithGrandparent(
        currentUserNode,
        parent,
        grandParent
      );

      if (dottedManagerId && !initialNodes.find((n) => n.id === dottedManagerId)) {
        if (showDottedManager) {
          // Full person card — badge acts as the collapse toggle
          initialNodes.push({
            id: dottedManagerId,
            type: "person",
            position: { x: 0, y: 0 },
            data: {
              id: dottedManagerId,
              name: dottedManagerName || dottedManagerId,
              title: "",
              hasChildren: false,
              isExpanded: false,
              onToggleExpand: () => { },
              showExpand: false,
              totalChildren: 0,
              directChildren: 0,
              indirectChildren: 0,
              isDottedLine: true,
              onCollapse: handleShowDottedManager,
            },
          });
        } else {
          // Chip node
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (initialNodes as Node<any>[]).push({
            id: dottedManagerId,
            type: "dottedLineChip",
            position: { x: 0, y: 0 },
            data: { onToggle: handleShowDottedManager },
          });
        }

        initialEdges.push({
          id: `e-dotted-${dottedManagerId}-${employeeId}`,
          source: dottedManagerId,
          target: employeeId,
          type: "smoothstep",
          style: { stroke: "#6172F3", strokeWidth: 2, strokeDasharray: "6 3" },
        });
      }

      calculateLayout(initialNodes, initialEdges);
    }
  }, [employeeHierarchy, employeeId, currentUser, dottedManagerId, dottedManagerName, showDottedManager, handleShowDottedManager, calculateLayout]);

  return (
    <div className="w-full rounded-md bg-white">
      <div className="py-2 mx-0 md:mx-6 rounded-md flex items-center justify-between rounded-xl justify-between mb-6 py-2 max-sm:px-4 px-6 bg-gray-50/50 border border-gray-100/50">

        <div className="flex items-center ">
          <Typography variant="subheading" className="font-bold text-gray-800 max-sm:text-md">
            Organizational Chart
          </Typography>
        </div>

        <Button
          variant="subtle"
          size="sm"
          onClick={() => navigate(`/webapp/organizational-chart?employee=${employeeId}`)}
        >
          <span className="text-sm font-medium text-blue-600">View All</span>
          <IoChevronForwardOutline size={18} />
        </Button>
      </div>

      <div className="h-[400px] px-2 bg-white rounded-md">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={{ person: PersonNode, dottedLineChip: DottedLineChipNode }}
          fitView
          attributionPosition="top-right"
          proOptions={{ hideAttribution: true }}
          minZoom={0.2}
          maxZoom={0.7}
          defaultViewport={{ x: 0, y: 0, zoom: 0.7 }}
          // zoomOnScroll={false}
          // zoomOnPinch={false}
          preventScrolling={false}
        // nodesDraggable={false}
        // draggable={false} // Allow panning
        // panOnDrag={false} // Allow panning
        >
          <Controls position="top-right" showZoom showFitView />
        </ReactFlow>
      </div>
    </div>
  );
}
