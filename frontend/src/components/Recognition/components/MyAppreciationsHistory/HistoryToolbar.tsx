import { ExternalLink, Filter } from "lucide-react";
import EmployeeMultiSelect from "./EmployeeMultiSelect";

type HistoryToolbarProps = {
  employeeOptions: { label: string; value: string }[];
  selectedEmployees: string[];
  onSelectedEmployeesChange: (value: string[]) => void;
  onFilterClick?: () => void;
};

const HistoryToolbar = ({
  employeeOptions,
  selectedEmployees,
  onSelectedEmployeesChange,
  onFilterClick,
}: HistoryToolbarProps) => (
  <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
    <EmployeeMultiSelect
      options={employeeOptions}
      selected={selectedEmployees}
      onChange={onSelectedEmployeesChange}
    />

    <div className="flex items-center justify-end gap-2">
      <button
        type="button"
        onClick={onFilterClick}
        className="flex h-10 w-10 items-center justify-center rounded-md border border-gray-300 bg-white text-gray-600 transition hover:bg-gray-50"
        aria-label="Filter appreciations"
      >
        <Filter className="h-4 w-4" />
      </button>
      <button
        type="button"
        className="flex h-10 w-10 items-center justify-center rounded-md border border-gray-300 bg-white text-gray-600 transition hover:bg-gray-50"
        aria-label="Open export options"
      >
        <ExternalLink className="h-4 w-4" />
      </button>
    </div>
  </div>
);

export default HistoryToolbar;
