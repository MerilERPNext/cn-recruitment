import React, { useState } from "react";
import { useGetAllEmployees } from "../../hooks/useEmployee";
import { Employee } from "../../types/employee";
import Avatar from "../shared/Avatar";
import CircularLoader from "../shared/atoms/CircularLoader";
import { Typography } from "../shared/atoms/Typography";
import { Search, X } from "lucide-react";
import useDebounce from "../../hooks/useDebounce";
import { FilterCondition } from "../../types/frappe";

interface EmployeeSearchListProps {
  selectedEmployeeId?: string;
  onSelect: (employeeId: string, employeeName?: string) => void;
  onCancel?: () => void;
}

export const EmployeeSearchList: React.FC<EmployeeSearchListProps> = ({
  selectedEmployeeId,
  onSelect,
  onCancel,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Build filters for employee search
  const filters: FilterCondition[] = [];
  if (debouncedSearchTerm && debouncedSearchTerm.length >= 2) {
    filters.push(["employee_name", "like", `%${debouncedSearchTerm}%`]);
  }

  const { data: employees, isLoading } = useGetAllEmployees(
    ["name", "employee_name", "designation", "department", "image"],
    50,
    filters.length > 0 ? filters : undefined
  );

  const handleEmployeeClick = (employee: Employee) => {
    onSelect(employee.name || employee.employee, employee.employee_name);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Search Bar */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 size-5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name..."
            className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all text-sm"
            autoFocus
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              aria-label="Clear search"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
      </div>

      {/* Employee List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <CircularLoader size="md" />
            <Typography variant="bodySmall" color="body2" className="ml-3">
              Loading employees...
            </Typography>
          </div>
        ) : !employees || employees.length === 0 ? (
          <div className="text-center py-8">
            <Typography variant="bodyMedium" color="body2">
              {debouncedSearchTerm && debouncedSearchTerm.length >= 2
                ? "No employees found"
                : "Start typing to search for employees"}
            </Typography>
          </div>
        ) : (
          <div className="space-y-2">
            {employees.map((employee: Employee) => {
              const isSelected = selectedEmployeeId === (employee.name || employee.employee);
              return (
                <button
                  key={employee.name || employee.employee}
                  onClick={() => handleEmployeeClick(employee)}
                  className={`
                    w-full flex items-center gap-3 p-3 rounded-lg border transition-all
                    hover:shadow-sm
                    ${
                      isSelected
                        ? "border-primary-500 bg-primary-50"
                        : "border-gray-200 bg-white hover:border-gray-300"
                    }
                  `}
                  type="button"
                >
                  <Avatar
                    src={employee.image}
                    name={employee.employee_name || employee.name || ""}
                    size="h-10 w-10"
                  />
                  <div className="flex-1 text-left min-w-0">
                    <Typography
                      variant="bodyMedium"
                      className="font-medium text-gray-900 truncate"
                    >
                      {employee.employee_name || employee.name}
                    </Typography>
                    {employee.designation && (
                      <Typography
                        variant="bodySmall"
                        color="body2"
                        className="truncate"
                      >
                        {employee.designation}
                        {employee.department
                          ? ` • ${employee.department}`
                          : ""}
                      </Typography>
                    )}
                  </div>
                  {isSelected && (
                    <div className="flex-shrink-0">
                      <div className="size-5 rounded-full bg-primary-500 flex items-center justify-center">
                        <svg
                          className="size-3 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Cancel Button */}
      {onCancel && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <button
            onClick={onCancel}
            className="w-full py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
            type="button"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
};
