import { Handle, Position, type NodeProps } from "@xyflow/react";
import { User, ChevronUp, ChevronDown } from "lucide-react";
import type { EmployeeNode } from "./type/type";
import { useNavigate } from "react-router";
import { useCurrentEmployee } from "../../hooks/useEmployee";
import { useTargetUser } from "../../context/ViewedUserContext";
import Tooltip from "../shared/Tooltip";

export default function PersonNode({ data }: NodeProps<EmployeeNode>) {
  const { data: employee } = useCurrentEmployee();
  const currentEmployeeId = employee?.name;
  const navigate = useNavigate();
  const { setTargetEmployee, clearTargetEmployee } = useTargetUser();

  const {
    id,
    name,
    title,
    hasChildren,
    isExpanded,
    onToggleExpand,
    totalChildren = 0,
    showExpand = true,
  } = data;

  const handleClick = () => {
    if (id) {
      if (id !== currentEmployeeId) {
        setTargetEmployee(String(id), `/webapp/employee-profile`, true);
      } else {
        clearTargetEmployee();
        navigate(`/webapp/employee-profile`);
      }
    }
  };

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
        className="min-w-[320px] px-5 py-4 bg-white border border-gray-300 shadow-md hover:shadow-lg transition-all duration-300 rounded-xl cursor-pointer"
        onClick={handleClick}
      >
        <div className="flex items-center space-x-4">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
            <User className="w-6 h-6 text-blue-600" />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 font-medium text-base truncate">
              {name}
            </h3>
            <div className="flex gap-2 items-center mt-1">
              {title && (
                <Tooltip content={title}>
                  <p className="text-gray-500 text-sm font-medium truncate line-clamp-1">{title}</p>
                </Tooltip>
              )}
              {totalChildren > 0 && (
                <p className="text-blue-600 bg-blue-50 border border-blue-100 rounded-md text-[10px] font-bold truncate px-1.5 py-0.5">
                  {totalChildren}
                </p>
              )}
            </div>
          </div>

          {hasChildren && showExpand && (
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
