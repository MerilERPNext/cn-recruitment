import React from "react";
import React from "react";
import clsx from "clsx";
import { ChevronRightIcon } from "lucide-react";
import { Employee } from "./SearchCard";

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
    <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 text-xl font-semibold overflow-hidden border">
      {src ? (
        <img src={src} alt={name} className="w-full h-full object-cover" />
      ) : (
        <span>{initials(name)}</span>
      )}
    </div>
  );
};

interface StatusBadgeProps {
  status?: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const isActive = status?.toLowerCase() === "active";
  return (
    <span
      className={clsx(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
        isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
      )}
    >
      {status || "—"}
    </span>
  );
};

interface EmployeeRowProps {
  emp: Employee;
  setSearchQuery: (value: string) => void;
}

const EmployeeRow: React.FC<EmployeeRowProps> = ({ emp, setSearchQuery }) => {
  const secondary = [emp.designation, emp.department]
    .filter(Boolean)
    .join(" · ");

  function recentSearch(emp: Employee): Employee[] {
    const searches: Employee[] = JSON.parse(
      localStorage.getItem("recentSearches") || "[]"
    );

    let filterData = searches.filter(
      (data) =>
        data.employee_name.toLowerCase() !== emp.employee_name.toLowerCase()
    );

    filterData.unshift(emp);
    filterData = filterData.slice(0, 7);

    localStorage.setItem("recentSearches", JSON.stringify(filterData));

    return filterData;
  }

  const handleonClick = (emp: Employee) => () => {
    setSearchQuery(emp.employee_name);
    recentSearch(emp);
  };

  return (
    <div className="w-full " onClick={handleonClick(emp)}>
      <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white px-4 py-4 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center gap-4 min-w-0">
          <Avatar name={emp.employee_name} src={emp.image} />

          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <p className="text-base font-semibold text-gray-900 truncate max-w-[60vw]">
                {emp.employee_name}
              </p>
              <StatusBadge status={emp.status} />
            </div>
            <p className="text-sm text-gray-500 mt-1 truncate">
              {secondary || "—"}
            </p>
          </div>
        </div>

        <ChevronRightIcon className="shrink-0 text-gray-400" />
      </div>
    </div>
  );
};

export default EmployeeRow;
