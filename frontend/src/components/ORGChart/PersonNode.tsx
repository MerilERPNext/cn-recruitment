import { Handle, Position, type NodeProps } from "@xyflow/react";
import { ChevronUp, ChevronDown } from "lucide-react";
import type { EmployeeNode } from "./type/type";
import { useNavigate } from "react-router";
import { useCurrentEmployee } from "../../hooks/useEmployee";
import { useTargetUser } from "../../context/ViewedUserContext";
import Tooltip from "../shared/Tooltip";
import Avatar from "../shared/Avatar";
import { Typography } from "../shared/atoms/Typography";

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
        className="relative min-w-[320px] px-5 py-4 bg-white border-t-4 border-x-1 border-b-1 border-x-primary/20 border-b-primary/20  shadow-sm border-primary shadow-md hover:shadow-lg transition-all duration-300 rounded-xl cursor-pointer"
        onClick={handleClick}
      >
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <Avatar name={name} src={data?.image || ""} />
        </div>
        <div className="flex flex-col gap-2 text-center mt-2">
          <h3 className="font-semibold text-gray-900 font-medium text-base text-center truncate">
            {name}
          </h3>
          <div className="flex gap-2 items-center text-center justify-center">
            {title && (
              <Tooltip content={title}>
                <p className="text-gray-500 text-sm font-medium truncate line-clamp-1 mb-1">
                  {title}
                </p>
              </Tooltip>
            )}
          </div>
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-4 p-1">
            {totalChildren > 0 && (
              <div className="flex gap-1.5 items-center">
                <Tooltip
                  content={`Direct: ${data.directChildren || 0}, Indirect: ${data.indirectChildren || 0}`}
                >
                  <div className="flex items-center bg-blue-50 border border-blue-100 rounded-md overflow-hidden">
                    <Typography
                      variant="bodySmall"
                      color="primary"
                      className="text-blue-600 flex gap-2 px-1.5 py-0.5  text-nowrap"
                    >
                      Direct {data.directChildren || 0}
                    </Typography>
                    <Typography
                      variant="bodySmall"
                      color="primary"
                      className="text-blue-400 flex gap-2  px-1.5 py-0.5 border-x border-blue-100 text-nowrap"
                    >
                      Indirect {data.indirectChildren || 0}
                    </Typography>
                    <Typography
                      variant="bodySmall"
                      color="primary"
                      className="text-blue-400 flex gap-2 px-1.5 py-0.5 text-nowrap"
                    >
                      Total {totalChildren}
                    </Typography>
                  </div>
                </Tooltip>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-4">
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
