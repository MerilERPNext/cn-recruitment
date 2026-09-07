import React, { useEffect, useState } from "react";
import { ChevronRightIcon } from "lucide-react";

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
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [src]);

  return (
    <div
      className="h-9 w-9  shrink-0 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 text-xs font-semibold overflow-hidden border"
      aria-hidden
    >
      {src && !imgError ? (
        <img
          loading="lazy"
          src={src}
          alt={name}
          className="h-full w-full object-cover"
          onError={() => setImgError(true)}
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
  isActive?: boolean;
}

const EmployeeRow: React.FC<EmployeeRowProps> = ({
  emp,
  onRemove,
  showRemove,
  idx,
  isActive = false,
}) => {
  const { setTargetEmployee } = useTargetUser();

  function recentSearch(emp: Employee): void {
    let searches: Employee[] = [];
    try {
      const parsed = JSON.parse(sessionStorage.getItem("recentSearches") || "[]");
      if (Array.isArray(parsed)) {
        searches = parsed;
      }
    } catch (e) {
      console.error("Failed to parse recentSearches from sessionStorage", e);
    }

    let filterData = searches.filter(
      (data) =>
        data.employee_name?.toLowerCase() !== emp.employee_name?.toLowerCase(),
    );

    filterData.unshift(emp);
    filterData = filterData.slice(0, 7);

    sessionStorage.setItem("recentSearches", JSON.stringify(filterData));
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
      className="w-full min-w-0 cursor-pointer"
      style={{ touchAction: "manipulation" }}
      onClick={handleonClick(emp)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") handleonClick(emp)();
      }}
    >
      <div
        className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2 transition-colors border-b border-gray-100 last:border-b-0 ${
          isActive ? "bg-primary-50 text-primary-700" : "bg-white hover:bg-primary-50"
        }`}
      >
        <Avatar name={emp.employee_name} src={emp.image} />
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="flex flex-col min-w-0 flex-1">
            <div className="flex items-center gap-2 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {emp.employee_name}
              </p>
              {emp.employee_id && (
                <span className="text-[11px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 font-mono flex-shrink-0">
                  {emp.employee_id}
                </span>
              )}
            </div>
            {(emp.branch_display || emp.department_display || emp.designation) && (
              <p className="text-xs text-gray-500 truncate mt-0.5">
                {[emp.designation, emp.department_display, emp.branch_display]
                  .filter(Boolean)
                  .join(" • ")}
              </p>
            )}
          </div>
        </div>

        {!showRemove ? (
          <ChevronRightIcon
            className="shrink-0 text-gray-400 w-4 h-4"
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
            className="shrink-0 rounded-full p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <span aria-hidden className="text-sm font-semibold">&times;</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default EmployeeRow;