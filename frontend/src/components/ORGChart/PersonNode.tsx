import { Handle, Position, type NodeProps } from "@xyflow/react";
import { User, ChevronUp, ChevronDown } from "lucide-react";
import type { EmployeeNode } from "./type/type";
import { useNavigate } from "react-router";

export default function PersonNode({ data }: NodeProps<EmployeeNode>) {
  const {
    id,
    name,
    title,
    hasChildren,
    isExpanded,
    onToggleExpand,
    childrens,
  } = data;
  const navigate = useNavigate();
  return (
    <div className="relative">
      <Handle
        type="target"
        position={Position.Top}
        style={{
          background: "transparent",
          border: "none",
          width: "1px",
          height: "1px",
        }}
      />

      <div
        className="min-w-[160px] px-4 py-3 bg-white border border-gray-300 shadow-sm hover:shadow-md transition-shadow duration-200 rounded-lg"
        onClick={() => {
          navigate(`/webapp/organizational-chart?employee=${id}`);
        }}
      >
        <div className="flex items-center space-x-3">
          <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
            <User className="w-4 h-4 text-blue-600" />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-gray-900 text-sm truncate">
              {name}
            </h3>
            <div className="flex gap-2">
              {title && (
                <p className="text-gray-500 text-xs truncate mt-0.5">{title}</p>
              )}
              {!isExpanded ? (
                <p className="text-green-500 bg-green-100 rounded-sm text-xs truncate mt-0.5 px-1">
                  {childrens?.length || ""}
                </p>
              ) : (
                ""
              )}
            </div>
          </div>

          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand(String(id));
              }}
              className="flex-shrink-0 p-1 hover:bg-gray-100 rounded transition-colors duration-200"
              aria-label={isExpanded ? "Collapse" : "Expand"}
            >
              {isExpanded ? (
                <ChevronUp className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              )}
            </button>
          )}
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        style={{
          background: "transparent",
          border: "none",
          width: "1px",
          height: "1px",
        }}
      />
    </div>
  );
}
