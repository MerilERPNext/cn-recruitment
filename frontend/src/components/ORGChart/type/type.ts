/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Node } from "@xyflow/react";

export type CollapsedState = Record<string, boolean>;

export type NodeData = {
  id: number | string;
  name: string;
  title?: string;
  hasChildren: boolean;
  isExpanded: boolean;
  childrens?: any;
  totalChildren?: number;
  onToggleExpand: (id: string) => void;
  showExpand?: boolean;
};

// ✅ Optional alias (safe version)
export type EmployeeNode = Node<NodeData, "person">;

export type EmployeeHierarchy = {
  name: string;
  id: string;
  lft: number;
  rgt: number;
  reports_to: string | null;
  image: string | null;
  title: string | null;
  connections: number;
  expandable: boolean;
  children: EmployeeHierarchy[];
};
