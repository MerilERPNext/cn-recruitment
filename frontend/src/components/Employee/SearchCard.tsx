import React from "react";
import EmployeeRow from "./EmployeeRow";

// Types
export interface Employee {
  name: string;
  employee_name: string;
  designation?: string;
  date_of_joining?: string;
  status?: string;
  image?: string;
  department?: string;
}

interface SearchCardProps {
  employees?: Employee[];
  setSearchQuery: (value: string) => void;
}

const SearchCard: React.FC<SearchCardProps> = ({
  employees,
  setSearchQuery,
}) => {
  return (
    <div className="w-full max-w-3xl mx-auto space-y-4">
      {employees?.map((emp, idx) => (
        <EmployeeRow
          setSearchQuery={setSearchQuery}
          key={`${emp.name}-${idx}`}
          emp={emp}
        />
      ))}
    </div>
  );
};

export default SearchCard;
