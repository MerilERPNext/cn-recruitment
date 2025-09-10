import type { Node } from "@xyflow/react"

// Collapsed state keeps track of which nodes are collapsed
export type CollapsedState = Record<string, boolean>

// Data stored inside each ReactFlow node
export type NodeData = {
    id: number
    name: string
    title?: string
    hasChildren: boolean
    isExpanded: boolean
    onToggleExpand: (id: string) => void
  }

// A strongly typed Node with your NodeData
export type EmployeeNode = Node<NodeData>

// Employee hierarchy coming from backend (Frappe API)
export type EmployeeHierarchy = {
  name: string
  id: string
  lft: number
  rgt: number
  reports_to: string | null
  image: string | null
  title: string | null
  connections: number
  expandable: boolean
  children: EmployeeHierarchy[]
}
