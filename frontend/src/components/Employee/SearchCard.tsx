import React from "react";
import EmployeeRow from "./EmployeeRow";
import { Employee } from "../../types/employee";




interface SearchCardProps {
  employees?: Employee[];
  setSearchQuery: (value: string) => void;
  onRemove: (idx: number) => void;
  showRemove?: boolean;
}

const SearchCard: React.FC<SearchCardProps> = ({
  employees,
  setSearchQuery,
  onRemove,
  showRemove = false,

}) => {
  return (
    <div className="w-full max-w-3xl mx-auto space-y-3 sm:space-y-4 px-0 sm:px-0">
      {employees?.map((emp, idx) => (
        <EmployeeRow
          idx={idx}
          onRemove={onRemove}
          showRemove={showRemove}
          setSearchQuery={setSearchQuery}
          key={`${emp.name}-${idx}`}
          emp={emp}
        />
      ))}
    </div>
  );
};

export default SearchCard;
