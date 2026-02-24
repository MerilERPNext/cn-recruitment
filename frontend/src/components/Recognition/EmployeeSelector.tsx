import React from "react";
import SearchableSelect from "../shared/SearchableSelect";
import { searchEmployeesByQuery } from "../../utils/searchEmployees";

interface EmployeeSelectorProps {
  value?: string;
  onChange: (employeeId: string, employeeName?: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export const EmployeeSelector: React.FC<EmployeeSelectorProps> = ({
  value,
  onChange,
  placeholder = "Search employee...",
  disabled = false,
}) => {
  const handleSearch = async (query: string) => {
    return await searchEmployeesByQuery(query);
  };

  return (
    <SearchableSelect
      options={[]}
      value={value || ""}
      onChange={(val, label) => onChange(val, label)}
      placeholder={placeholder}
      disabled={disabled}
      onSearch={handleSearch}
    />
  );
};
