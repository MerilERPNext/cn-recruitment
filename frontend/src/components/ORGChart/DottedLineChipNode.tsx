import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { DottedLineChipNodeType } from "./type/type";

export default function DottedLineChipNode({ data }: NodeProps<DottedLineChipNodeType>) {
  return (
    <div className="relative flex justify-center items-center">
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: "transparent", border: "none", width: "1px", height: "1px" }}
      />
      <button
        onClick={data.onToggle}
        className="text-xs font-semibold text-primary-600 bg-primary-50 border border-primary-200 rounded-md px-4 py-1.5 hover:bg-primary-100 transition-colors shadow-sm whitespace-nowrap cursor-pointer"
      >
        {data.isExpanded ? "Hide Dotted Line Manager ↙" : "Dotted Line Manager ↗"}
      </button>
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: "transparent", border: "none", width: "1px", height: "1px" }}
      />
    </div>
  );
}
