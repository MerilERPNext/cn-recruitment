import React from "react";
import { ChevronRightIcon } from "lucide-react";

import Tooltip from "../shared/Tooltip";
import Badge from "../shared/Badge";
import { Employee } from "../../types/employee";
import { useTargetUser } from "../../context/ViewedUserContext";
import { useCurrentEmployeeDetails } from "../../hooks/useEmployee";
import { useNavigate } from "react-router-dom";
import { useScreenSize } from "../../hooks/useScreenSize";

function initials(name = ""): string {
  const parts = name.trim().split(/\s+/);
  return (
    parts
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() || "")
      .join("") || "--"
  );
}

interface AvatarProps {
  name: string;
  src?: string;
}

const Avatar: React.FC<AvatarProps> = ({ name, src }) => {
  return (
    <div
      className="h-9 w-9  shrink-0 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 text-xs font-semibold overflow-hidden border"
      aria-hidden
    >
      {src ? (
        <img
          loading="lazy"
          src={src}
          alt={name}
          className="h-full w-full object-cover"
        />
      ) : (
        <span>{initials(name)}</span>
      )}
    </div>
  );
};

interface EmployeeRowProps {
  emp: Employee;

  onRemove: (id: number) => void;
  showRemove?: boolean;
  idx: number;
}

const EmployeeRow: React.FC<EmployeeRowProps> = ({
  emp,
  onRemove,
  showRemove,
  idx,
}) => {
  const { setTargetEmployee } = useTargetUser();

  function recentSearch(emp: Employee): void {
    const searches: Employee[] = JSON.parse(
      localStorage.getItem("recentSearches") || "[]",
    );

    let filterData = searches.filter(
      (data) =>
        data.employee_name.toLowerCase() !== emp.employee_name.toLowerCase(),
    );

    filterData.unshift(emp);
    filterData = filterData.slice(0, 7);

    localStorage.setItem("recentSearches", JSON.stringify(filterData));
    return;
  }

  const { data: currentEmployee } = useCurrentEmployeeDetails({ logged_in_employee_details: true });
  const navigate = useNavigate();
  const { isDesktop } = useScreenSize();

  const handleonClick = (emp: Employee) => () => {
    recentSearch(emp);

    if (currentEmployee?.name === emp.employee_id) {
      navigate("/webapp/employee-profile");
      return;
    }

    // ✅ Other user's profile
    setTargetEmployee(
      emp.employee_id ?? emp.employee ?? null,
      "/webapp/employee-profile",
      isDesktop,
    );
  };

  return (
    <div
      className="w-full"
      onClick={handleonClick(emp)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") handleonClick(emp)();
      }}
    >
      <div className="flex items-center sm:items-center justify-between gap-3 rounded-md  px-4 py-3 bg-white hover:bg-primary-100 border-b ">
        <Avatar name={emp.employee_name} src={emp.image} />
        <div className="flex items-start sm:items-center gap-3 sm:gap-4 min-w-0 w-full">
          <div className="flex flex-col min-w-0 w-full">
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 min-w-0">
              <div className="flex flex-row">

                <p className="text-sm mr-2 font-semibold text-gray-900 truncate">
                  {emp.employee_name}
                </p>
                <Badge
                  label={emp.employee_id || "—"}
                  backgroundColor="bg-gray-50/70"
                  textColor="text-black"
                  size="sm"
                />
              </div>

            </div>

            <div className="mt-1 flex flex-wrap items-center gap-x-2 sm:gap-y-2 text-xs text-gray-600 min-w-0">
              <span className="sm:inline min-w-0">
                <Tooltip
                  content={emp.branch_display || "—"}
                  position="top"
                >
                  <span className="inline-block text-xs  max-w-[20ch] truncate align-bottom">
                    {emp.branch_display || "—"}
                  </span>
                </Tooltip>
              </span>

              {emp.branch_display && emp.department_display && (
                <span className="sm:mx-3  hidden   mx-1 sm:block text-md text-gray-300">
                  •
                </span>
              )}

              <span className="sm:inline min-w-0">
                <Tooltip content={emp.department_display || "—"} position="top">
                  <span className="inline-block text-xs  max-w-[20ch] truncate align-bottom">
                    {emp.department_display || "—"}
                  </span>
                </Tooltip>
              </span>
            </div>
          </div>
        </div>

        {!showRemove ? (
          <ChevronRightIcon
            className="shrink-0 text-gray-400 mt-1 sm:mt-0"
            aria-hidden
          />
        ) : (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemove(idx);
            }}
            aria-label={`Remove ${emp.employee_name} from recent searches`}
            className="ml-0 sm:ml-2 rounded-full p-2 h-10 w-10 flex justify-center items-center text-xl hover:bg-gray-100 active:bg-gray-200 cursor-pointer mt-1 sm:mt-0"
          >
            <span aria-hidden>&times;</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default EmployeeRow;
