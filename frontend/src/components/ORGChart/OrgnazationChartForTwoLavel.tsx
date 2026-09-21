/* eslint-disable react-refresh/only-export-components */
"use client";

import { useEffect, useCallback, useState, useRef } from "react";
import {
  ReactFlow,
  Node,
  Edge,
  ReactFlowInstance,
  useNodesState,
  useEdgesState,
  Position,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import PersonNode from "./PersonNode";
import DottedLineChipNode from "./DottedLineChipNode";
import { EmployeeHierarchy, NodeData } from "./type/type";
import { useGetEmployeeSubordinateHierarchy, useCurrentEmployeeDetails, useGetEmployeeDetailsByEmpId } from "../../hooks/useEmployee";
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

// ✅ Show grandparent → parent → current user → children (only current branch).
// Any node whose id is in `expandedIds` additionally reveals its own direct
// children (and so on, recursively), so clicking a card's badge drills down.
const buildHierarchyWithGrandparent = (
  user: EmployeeHierarchy,
  parent: EmployeeHierarchy | null,
  grandParent: EmployeeHierarchy | null,
  expandedIds: Set<string>
): { nodes: Node<NodeData>[]; edges: Edge[] } => {
  const nodeMap = new Map<string, Node<NodeData>>();
  const edgeMap = new Map<string, Edge>();

  const addNode = (n: EmployeeHierarchy) => {
    if (nodeMap.has(n.id)) return;
    const direct = n.children?.length || 0;
    const total = countTotalDescendants(n);
    nodeMap.set(n.id, {
      id: n.id,
      type: "person",
      position: { x: 0, y: 0 },
      data: {
        id: n.id,
        name: n.name,
        image: n.image,
        title: n.title || "",
        hasChildren: total > 0,
        totalChildren: total,
        directChildren: direct,
        indirectChildren: total - direct,
        showExpand: false,
        isExpanded: expandedIds.has(n.id),
        onToggleExpand: () => { },
      },
    });
  };

  const addEdge = (sourceId: string, targetId: string) => {
    const id = `e${sourceId}-${targetId}`;
    if (edgeMap.has(id)) return;
    edgeMap.set(id, {
      id,
      source: sourceId,
      target: targetId,
      type: "smoothstep",
      style: { stroke: "#d1d5db", strokeWidth: 2 },
    });
  };

  // Reveal a node's children (optionally capped), and recurse into any
  // child that has itself been expanded by the user.
  const revealChildren = (n: EmployeeHierarchy, limit?: number) => {
    const children = limit !== undefined ? (n.children || []).slice(0, limit) : n.children || [];
    children.forEach((child) => {
      addNode(child);
      addEdge(n.id, child.id);
      if (expandedIds.has(child.id)) {
        revealChildren(child);
      }
    });
  };

  // 🧓 Grandparent (top)
  if (grandParent) {
    addNode(grandParent);
    if (parent) addEdge(grandParent.id, parent.id);
    if (expandedIds.has(grandParent.id)) {
      revealChildren(grandParent);
    }
  }

  // 👨 Parent (middle)
  if (parent) {
    addNode(parent);
    addEdge(parent.id, user.id);
    if (expandedIds.has(parent.id)) {
      revealChildren(parent);
    }
  }

  // 👤 Current user — children shown by default, capped at 5
  addNode(user);
  revealChildren(user, 5);

  return { nodes: Array.from(nodeMap.values()), edges: Array.from(edgeMap.values()) };
};

export default function ThreeLevelOrgChart() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<any>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [showDottedManager, setShowDottedManager] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const navigate = useNavigate();
  const { targetEmployeeId } = useTargetUser();
  const { data: currentUser, isLoading: isCurrentUserLoading } = useCurrentEmployeeDetails({ logged_in_employee_details: true });
  const { data: targetEmployeeDetails, isLoading: isTargetEmployeeDetailsLoading } = useGetEmployeeDetailsByEmpId(targetEmployeeId || "", ["employee", "custom_dotted_line_manager", "dotted_manager_member_id"]);
  const dottedManagerSource = targetEmployeeId ? targetEmployeeDetails : currentUser;
  const dottedManagerId = dottedManagerSource?.custom_dotted_line_manager || dottedManagerSource?.dotted_manager_member_id;
  const { data: dottedLineManagerDetails } = useGetEmployeeDetailsByEmpId(dottedManagerId || "", ["employee", "employee_name"]);
  const dottedManagerName = dottedLineManagerDetails?.employee_name;
  // Use targetEmployeeId if viewing another user, otherwise use current user's employee ID
  const employeeId = targetEmployeeId || (isCurrentUserLoading ? null : currentUser?.employee) || "";
  const { data: employeeHierarchy } = useGetEmployeeSubordinateHierarchy(
    employeeId
  );
  // Whether we yet know for certain if this employee has a dotted line manager —
  // until this settles, fitView must not lock in, or the dotted node can end up
  // added outside the already-fitted viewport (timing-dependent, varies by network speed).
  const isDottedManagerSourceLoading = targetEmployeeId
    ? isTargetEmployeeDetailsLoading
    : isCurrentUserLoading;
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);
  const hasFitRef = useRef(false);

  // Reset dotted manager visibility and any drilled-down nodes when the viewed employee changes
  useEffect(() => {
    setShowDottedManager(false);
    setExpandedIds(new Set());
    hasFitRef.current = false;
  }, [employeeId]);

  const handleShowDottedManager = useCallback(() => setShowDottedManager((prev) => !prev), []);

  const handleExpandChildren = useCallback((nodeId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);

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
      const { nodes: builtNodes, edges: initialEdges } = buildHierarchyWithGrandparent(
        currentUserNode,
        parent,
        grandParent,
        expandedIds
      );

      const initialNodes = builtNodes.map((n) => ({
        ...n,
        data: {
          ...n.data,
          onExpandChildren: n.data.hasChildren ? handleExpandChildren : undefined,
        },
      }));

      // Build the dotted manager node separately — excluded from dagre so we can
      // manually position it to the right of the employee node.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let dottedNode: Node<any> | null = null;
      let dottedEdge: Edge | null = null;

      if (dottedManagerId && !initialNodes.find((n) => n.id === dottedManagerId)) {
        if (showDottedManager) {
          dottedNode = {
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
          };
        } else {
          dottedNode = {
            id: dottedManagerId,
            type: "dottedLineChip",
            position: { x: 0, y: 0 },
            data: { onToggle: handleShowDottedManager },
          };
        }

        dottedEdge = {
          id: `e-dotted-${employeeId}-${dottedManagerId}`,
          source: employeeId,
          sourceHandle: "right",
          target: dottedManagerId,
          // PersonNode has multiple target handles; explicitly pick the left one
          ...(showDottedManager ? { targetHandle: "left" } : {}),
          type: "smoothstep",
          style: { stroke: "#6172F3", strokeWidth: 2, strokeDasharray: "6 3" },
        };
      }

      // Layout only the main hierarchy nodes (no dotted manager)
      const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
        initialNodes,
        initialEdges
      );

      const allNodesForFit = dottedNode ? [...layoutedNodes, dottedNode] : layoutedNodes;

      if (dottedNode && dottedEdge) {
        const empNode = layoutedNodes.find((n) => n.id === employeeId);
        if (empNode) {
          const nodeH = dottedNode.type === "dottedLineChip" ? CHIP_H : PERSON_H;
          const nodeW = dottedNode.type === "dottedLineChip" ? CHIP_W : PERSON_W;
          // Expanding a parent/grandparent can reveal siblings on the same
          // rank as the employee node, to its right. Since this node is
          // positioned manually (outside dagre), find the rightmost edge of
          // anything sharing that rank so we never land on top of it.
          const sameRankRightEdge = layoutedNodes.reduce((maxX, n) => {
            if (n.id === employeeId) return maxX;
            const sameRank = Math.abs(n.position.y - empNode.position.y) < PERSON_H / 2;
            if (!sameRank) return maxX;
            const { w } = getNodeDims(n);
            return Math.max(maxX, n.position.x + w);
          }, empNode.position.x + PERSON_W);

          dottedNode.position = {
            x: sameRankRightEdge + 60,
            y: empNode.position.y + (PERSON_H - nodeH) / 2,
          };
          dottedNode.sourcePosition = Position.Right;
          dottedNode.targetPosition = Position.Left;
          // Shrink to fit so dagre's bounding box isn't thrown off in re-renders
          dottedNode.style = { opacity: 1, width: nodeW };
        }
        setNodes([...layoutedNodes, dottedNode]);
        setEdges([...layoutedEdges, dottedEdge]);
      } else {
        setNodes([...layoutedNodes]);
        setEdges([...layoutedEdges]);
      }

      // Fit the viewport once we know for sure whether a dotted line manager
      // exists, so a slow-to-resolve dotted manager isn't left outside the
      // already-fitted view (this is what made it invisible on dev but not
      // locally — the API responses there resolved in a different order).
      if (!hasFitRef.current && !isDottedManagerSourceLoading) {
        hasFitRef.current = true;
        requestAnimationFrame(() => rfInstance?.fitView({ nodes: allNodesForFit, padding: 0.1 }));
      }
    }
  }, [employeeHierarchy, employeeId, currentUser, dottedManagerId, dottedManagerName, showDottedManager, handleShowDottedManager, expandedIds, handleExpandChildren, isDottedManagerSourceLoading, rfInstance]);

  return (
    <div className="w-full rounded-md bg-white h-[60vh]">
      <div className="mx-0 md:mx-6 flex items-center justify-between rounded-xl mb-6 py-2 max-sm:px-4 px-6 bg-gray-50/50 border border-gray-100/50">

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
          onInit={setRfInstance}
          attributionPosition="top-right"
          proOptions={{ hideAttribution: true }}
          minZoom={0.2}
          maxZoom={0.7}
          defaultViewport={{ x: 0, y: 0, zoom: 0.7 }}
          zoomOnScroll={false}
          zoomOnPinch={false}
          panOnScroll={true}
          panOnDrag={true}
          nodesDraggable={false}
          preventScrolling={true}
        >
          {/* <Controls position="top-right" showZoom showFitView /> */}
        </ReactFlow>
      </div>
    </div>
  );
}
