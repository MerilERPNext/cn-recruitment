import { useState } from "react";
import { useScreenSize } from "../../hooks/useScreenSize";
import useDebounce from "../../hooks/useDebounce";
import { useGetAllEmployees } from "../../hooks/useEmployee";
import MultiSelect from "../shared/molecules/MultiSelect";
import { Employee } from "../../types/employee";
import { Filter, X, Check, RefreshCw } from "lucide-react";
import Button from "../shared/atoms/Button";
import SideDrawer from "../shared/SideDrawer";
import EmployeeDirectoryFilters from "./EmployeeDirectoryFilters";

import { FilterCondition } from "../../types/frappe";
import { Typography } from "../shared/atoms/Typography";

export interface EmployeeDirectoryFilterData {
  employee_status?: string;
  company?: string;
  departments?: string;
  [key: string]: string | undefined;
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

        {employee.designation && (
          <span className="text-xs text-gray-500">{employee.designation}</span>
        )}
      </div>
    </div>
  );
};

const EmployeeSearch = ({
  setEmployees,
}: {
  setEmployees: React.Dispatch<React.SetStateAction<Employee[]>>;
}) => {
  const { isDesktop } = useScreenSize();
  const [pendingEmployees, setPendingEmployees] = useState<Employee[]>([]);
  const [selectedEmployees, setSelectedEmployees] = useState<Employee[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [activeFilters, setActiveFilters] =
    useState<EmployeeDirectoryFilterData>({ status: "Active" });
  const [pendingFilters, setPendingFilters] =
    useState<EmployeeDirectoryFilterData>({ status: "Active" });
  const debouncedQuery = useDebounce(searchQuery, 350);

  const filters: FilterCondition[] = [];
  if (debouncedQuery) {
    filters.push(["employee_name", "like", `%${debouncedQuery}%`]);
  }

  Object.entries(activeFilters).forEach(([key, value]) => {
    if (value) {
      filters.push([key, "=", value]);
    }
  });

  const { data = [], isLoading } = useGetAllEmployees(
    ["*"],
    50,
    filters.length > 0 ? filters : undefined,
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
  };

  const clearFilter = (key: string) => {
    const newFilters = { ...activeFilters };
    delete newFilters[key];
    setActiveFilters(newFilters);
    setPendingFilters(newFilters);
  };

  const clearAllFilters = () => {
    setActiveFilters({});
    setPendingFilters({});
  };

  const handleApplyEmployeeSelection = () => {
    setSelectedEmployees(pendingEmployees);
    setEmployees(pendingEmployees);
  };

  const handleSyncEmployeeSelection = () => {
    setPendingEmployees(selectedEmployees);
  };

  const hasPendingChanges = JSON.stringify(pendingEmployees.map(e => e.name).sort()) !== JSON.stringify(selectedEmployees.map(e => e.name).sort());

  const activeFilterCount = Object.keys(activeFilters).filter(
    (key) => activeFilters[key],
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
        <div className={`flex gap-2 items-start ${!isDesktop ? 'w-full' : ''}`}>
          {hasPendingChanges && (
            <>
              <Button
                variant="contain"
                size="sm"
                onClick={handleApplyEmployeeSelection}
              >
                <Check size={12} />
                {isDesktop && <Typography variant="bodySmall">Apply</Typography>}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSyncEmployeeSelection}
              >
                <RefreshCw size={12} />
                {isDesktop && <Typography variant="bodySmall">Sync</Typography>}
              </Button>
            </>
          )}
          <div className="relative">
            <Button
              variant="soft"
              size="sm"
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
            if (!value) return null;
            const label = key
              .replace(/_/g, " ")
              .replace(/\b\w/g, (l) => l.toUpperCase());
            return (
              <Button key={key} variant="soft" size="sm">
                <span className="font-medium text-gray-500">{label}:</span>
                <span>{String(value)}</span>
                <button
                  onClick={() => clearFilter(key)}
                  className="ml-0.5 hover:text-red-600 transition-colors"
                >
                  <X size={12} />
                </button>
              </Button>
            );
          })}
          <button
            onClick={clearAllFilters}
            className="text-xs font-medium text-primary-600 hover:text-primary-700 ml-1 underline-offset-2 hover:underline"
          >
            Clear All
          </button>
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
      >
        <EmployeeDirectoryFilters
          onUpdate={handleFilterUpdate}
          data={pendingFilters}
        />
      </SideDrawer>
    </div>
  );
};

export default EmployeeSearch;
