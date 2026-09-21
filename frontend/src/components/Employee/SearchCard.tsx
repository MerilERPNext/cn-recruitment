import React from "react";
import EmployeeRow from "./EmployeeRow";
import { Employee } from "../../types/employee";

interface SearchCardProps {
  employees?: Employee[];
  onRemove: (idx: number) => void;
  showRemove?: boolean;
  activeIdx?: number;
}

const SearchCard: React.FC<SearchCardProps> = ({
  employees,
  onRemove,
  showRemove = false,
  activeIdx,
}) => {
  return (
    <div className="w-full min-w-0 mx-auto px-0">
      {employees?.map((emp, idx) => (
        <EmployeeRow
          idx={idx}
          onRemove={onRemove}
          showRemove={showRemove}
          isActive={activeIdx === idx}
          key={emp.name || emp.employee_id || idx}
          emp={emp}
        />
      ))}
    </div>
  );
};

export default SearchCard;