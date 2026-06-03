import { useState } from "react";
import { useScreenSize } from "../../hooks/useScreenSize";
import useDebounce from "../../hooks/useDebounce";
import { useGetEmployeesForDirectory, useCurrentEmployeeDetails } from "../../hooks/useEmployee";
import MultiSelect from "../shared/molecules/MultiSelect";
import { Employee } from "../../types/employee";
import { Filter, X, Check, RefreshCw } from "lucide-react";
import Button from "../shared/atoms/Button";
import SideDrawer from "../shared/SideDrawer";
import EmployeeDirectoryFilters from "./EmployeeDirectoryFilters";
import { useTargetUser } from "../../context/ViewedUserContext";

import { FilterCondition } from "../../types/frappe";
import { Typography } from "../shared/atoms/Typography";
import formatToIndianDate from "../../utils/formatToIndianDate";

export interface EmployeeDirectoryFilterData {
  employee_status?: string;
  company?: string | string[];
  departments?: string;
  [key: string]: string | string[] | number | boolean | undefined;
}

// custom dropdown option UI
const EmployeeOption = ({ employee }: { employee: Employee }) => {
  return (
    <div className="flex items-center gap-3">
      {/* Avatar */}
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary-700">
        {employee.employee_name?.charAt(0)}
      </div>

      {/* Details */}
      <div className="flex flex-col">
        <span className="text-sm font-medium text-gray-900">
          {employee.employee_name}
        </span>
        <div className="flex gap-2">
          {employee.designation && (
            <span className="text-xs text-gray-500">{employee.designation},</span>
          )}
          {employee.department && (
            <span className="text-xs text-gray-500">{employee.department},</span>
          )}
          {employee.branch && (
            <span className="text-xs text-gray-500">{employee.branch}</span>
          )}

        </div>
      </div>
    </div>
  );
};
export interface EmployeeSearchProps {
  setEmployees: React.Dispatch<React.SetStateAction<Employee[]>>;
  searchQuery: string;
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  pendingEmployees: Employee[];
  setPendingEmployees: React.Dispatch<React.SetStateAction<Employee[]>>;
  appliedSearchEmployees: Employee[];
  setAppliedSearchEmployees: React.Dispatch<React.SetStateAction<Employee[]>>;
  activeFilters: EmployeeDirectoryFilterData;
  setActiveFilters: React.Dispatch<React.SetStateAction<EmployeeDirectoryFilterData>>;
  pendingFilters: EmployeeDirectoryFilterData;
  setPendingFilters: React.Dispatch<React.SetStateAction<EmployeeDirectoryFilterData>>;
  clearTableSelection: () => void;
  activeTab: 'directory' | 'my_reportees';
}

const EmployeeSearch = ({
  setEmployees,
  searchQuery,
  setSearchQuery,
  pendingEmployees,
  setPendingEmployees,
  appliedSearchEmployees,
  setAppliedSearchEmployees,
  activeFilters,
  setActiveFilters,
  pendingFilters,
  setPendingFilters,
  clearTableSelection,
  activeTab,
}: EmployeeSearchProps) => {
  const { isDesktop } = useScreenSize();
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const debouncedQuery = useDebounce(searchQuery, 350);
  const { data: currentEmployee } = useCurrentEmployeeDetails({ logged_in_employee_details: true });
  const { targetEmployeeId } = useTargetUser();
  const effectiveEmployeeId = targetEmployeeId || currentEmployee?.name;

  const filters: FilterCondition[] = [];
  if (debouncedQuery) {
    filters.push(["employee_name", "like", `%${debouncedQuery}%`]);
  }

  let employeeSelfService: 1 | 0 | undefined = undefined;

  Object.entries(activeFilters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      if (key === "employee_self_service") {
        employeeSelfService = (value === 1 || value === "1" || value === true || value === "Yes") ? 1 : 0;
      } else if (key === "doj_from") {
        const dateStr = typeof value === 'string' ? value.split('T')[0] : String(value);
        filters.push(["date_of_joining", ">=", dateStr]);
      } else if (key === "doj_to") {
        const dateStr = typeof value === 'string' ? value.split('T')[0] : String(value);
        filters.push(["date_of_joining", "<=", dateStr]);
      } else if (Array.isArray(value) && value.length > 0) {
        filters.push([key, "in", value]);
      } else if (!Array.isArray(value)) {
        filters.push([key, "=", value]);
      }
    }
  });

  if (activeTab === 'my_reportees') {
    if (effectiveEmployeeId) {
      filters.push(["reports_to", "=", effectiveEmployeeId]);
    } else {
      filters.push(["name", "=", "__NONE__"]);
    }
  }

  const { data = [], isLoading } = useGetEmployeesForDirectory(
    filters.length > 0 ? filters : undefined,
    employeeSelfService,
    [
      "name",
      "employee",
      "employee_name",
      "status",
      "image",
      "custom_weekly_off",
      "user_id",
      "custom_designation_name",
      "designation",
      "department",
      "branch",
      "company",
      "employment_type",
      "date_of_joining",
      "custom_business_unit",
    ],
  );

  const employeeOptions: Employee[] = data.map((emp: Employee) => ({
    ...emp,
    name: emp.employee_name, // labelKey
    id: emp.name, // valueKey
  }));

  const handleFilterUpdate = (data: EmployeeDirectoryFilterData) => {
    setActiveFilters(data);
    setPendingFilters(data);
    setIsFilterOpen(false);
    clearTableSelection();
  };

  const clearFilter = (key: string) => {
    const newFilters = { ...activeFilters };
    delete newFilters[key];
    setActiveFilters(newFilters);
    setPendingFilters(newFilters);
    clearTableSelection();
  };

  const clearAllFilters = () => {
    setActiveFilters({ status: "Active" });
    setPendingFilters({ status: "Active" });
    clearTableSelection();
  };

  const handleApplyEmployeeSelection = () => {
    setAppliedSearchEmployees(pendingEmployees);
    setEmployees(pendingEmployees);
    clearTableSelection();
  };

  const handleSyncEmployeeSelection = () => {
    setPendingEmployees(appliedSearchEmployees);
  };

  const hasPendingChanges = JSON.stringify(pendingEmployees.map(e => e.name).sort()) !== JSON.stringify(appliedSearchEmployees.map(e => e.name).sort());

  const activeFilterCount = Object.keys(activeFilters).filter(
    (key) => activeFilters[key] !== undefined && activeFilters[key] !== null && activeFilters[key] !== "" && (!Array.isArray(activeFilters[key]) || (activeFilters[key] as string[]).length > 0),
  ).length;

  return (
    <div className="flex flex-col gap-2">
      {/* Search and buttons row */}
      <div className={`flex gap-2 items-start ${!isDesktop ? 'flex-wrap' : ''}`}>
        {/* MultiSelect */}
        <div className={isDesktop ? 'flex-1' : 'w-full'}>
          <MultiSelect
            options={employeeOptions}
            selected={pendingEmployees}
            onChange={(selected) => {
              setPendingEmployees(selected);
            }}
            labelKey="name"
            valueKey="name"
            placeholder="Search employees"
            searchValue={searchQuery}
            isLoading={isLoading}
            onSearchChange={setSearchQuery}
            renderOption={(emp) => <EmployeeOption employee={emp} />}
          />
        </div>

        {/* Action buttons */}
        <div className={`flex gap-2 items-start h-full ${!isDesktop ? 'w-full' : ''}`}>
          {hasPendingChanges && (
            <>
              <Button
                variant="contain"
                size="sm"
                className="h-full"
                onClick={handleApplyEmployeeSelection}
              >
                <Check size={12} />
                {isDesktop && <Typography variant="bodySmall">Apply</Typography>}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-full"
                onClick={handleSyncEmployeeSelection}
              >
                <RefreshCw size={12} />
                {isDesktop && <Typography variant="bodySmall">Sync</Typography>}
              </Button>
            </>
          )}
          <div className="relative h-full">
            <Button
              variant="soft"
              size="sm"
              className="h-full"
              onClick={() => {
                setIsFilterOpen(true);
              }}
            >
              <Filter size={16} />
              {activeFilterCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white shadow-sm ring-1 ring-white">
                  {activeFilterCount}
                </span>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Active Filter Chips */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap items-center gap-2 mt-1">
          <span className="text-xs font-medium text-gray-500 mr-1">
            Active Filters:
          </span>
          {Object.entries(activeFilters).map(([key, value]) => {
            if (value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0)) return null;
            const label = key
              .replace(/_/g, " ")
              .replace(/\b\w/g, (l) => l.toUpperCase());
            return (
              <Button key={key} variant="soft" size="sm">
                <span className="font-medium text-gray-500">{label}:</span>
                <span>
                  {Array.isArray(value) 
                    ? value.join(", ") 
                    : (key === "doj_from" || key === "doj_to"
                        ? formatToIndianDate(String(value))
                        : key === "employee_self_service"
                            ? (value === 1 || value === "1" || value === true || value === "Yes" ? "Yes" : "No")
                            : String(value))}
                </span>
                <span
                  role="button"
                  onClick={() => clearFilter(key)}
                  className="ml-0.5 hover:text-red-600 transition-colors cursor-pointer"
                >
                  <X size={12} />
                </span>
              </Button>
            );
          })}
          <span
            role="button"
            onClick={clearAllFilters}
            className="text-xs font-medium text-primary-600 hover:text-primary-700 ml-1 underline-offset-2 hover:underline cursor-pointer"
          >
            Clear All
          </span>
        </div>
      )}

      <SideDrawer
        open={isFilterOpen}
        onClose={() => {
          setIsFilterOpen(false);
          setPendingFilters(activeFilters); // Reset pending filters to active filters when closing without applying
        }}
        title="Filter"
        size="xl"
        className="p-0 flex flex-col h-full !overflow-hidden"
      >
        <EmployeeDirectoryFilters
          onUpdate={handleFilterUpdate}
          data={pendingFilters}
          onCancel={() => {
            setIsFilterOpen(false);
            setPendingFilters(activeFilters);
          }}
          onReset={() => {
            setPendingFilters({ status: "Active" });
          }}
        />
      </SideDrawer>
    </div>
  );
};

export default EmployeeSearch;
