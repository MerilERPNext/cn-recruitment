import React from "react";
import EmployeeRow from "./EmployeeRow";
import { Employee } from "../../types/employee";

interface SearchCardProps {
  employees?: Employee[];
  
  onRemove: (idx: number) => void;
  showRemove?: boolean;
}

const SearchCard: React.FC<SearchCardProps> = ({
  employees,
  
  onRemove,
  showRemove = false,
}) => {
  return (
    <div className="w-fit sm:w-full   max-w-3xl mx-auto space-y-3 sm:space-y-4 px-0 sm:px-0">
      {employees?.map((emp, idx) => (
        <EmployeeRow
          idx={idx}
          onRemove={onRemove}
          showRemove={showRemove}
         
          key={`${emp.name}-${idx}`}
          emp={emp}
        />
      ))}
    </div>
  );
};

export default SearchCard;
