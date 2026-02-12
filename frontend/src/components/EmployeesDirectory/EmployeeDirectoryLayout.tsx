import React, { useRef, useState } from "react";
import { useScreenSize } from "../../hooks/useScreenSize";
import DesktopLayoutWrapper from "../DesktopLayoutWrapper";
import HeaderBar from "../HeaderBar";
import { Employee } from "../../types/employee";
import EmployeeDirectoryContent from "./EmployeeDirectoryContent";
import { EmployeeDirectoryFilterData, EmployeeSearchProps } from "./EmployeeSearch";

const EmployeeDirectoryLayout: React.FC = () => {
  const { isDesktop } = useScreenSize();

  // STATE LIVES HERE
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedTableEmployees, setSelectedTableEmployees] = useState<Employee[]>([]);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  // Search related state lifted from EmployeeSearch
  const [searchQuery, setSearchQuery] = useState("");
  const [pendingEmployees, setPendingEmployees] = useState<Employee[]>([]);
  const [appliedSearchEmployees, setAppliedSearchEmployees] = useState<Employee[]>([]);
  const [activeFilters, setActiveFilters] =
    useState<EmployeeDirectoryFilterData>({ status: "Active" });
  const [pendingFilters, setPendingFilters] =
    useState<EmployeeDirectoryFilterData>({ status: "Active" });

  const buttonRef = useRef<HTMLButtonElement>(null);

  const searchState: EmployeeSearchProps = {
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
    clearTableSelection: () => setSelectedTableEmployees([]),
  };

  const content = (
    <EmployeeDirectoryContent
      employees={employees}
      selectedEmployees={selectedTableEmployees}
      setSelectedEmployees={setSelectedTableEmployees}
      searchState={searchState}
      uiState={{
        isPopupOpen,
        setIsPopupOpen,
        buttonRef: buttonRef as React.RefObject<HTMLButtonElement>,
      }}
    />
  );

  if (isDesktop) {
    return (
      <DesktopLayoutWrapper title="Employee Directory">
        <div className="flex justify-center h-full w-full">
          <div className="flex flex-col gap-2 w-full p-4">
            {content}
          </div>
        </div>
      </DesktopLayoutWrapper>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <header className="sticky top-0 z-50 bg-white shadow-sm">
        <HeaderBar title="Employee Directory" />
      </header>

      <main className="flex-grow flex flex-col gap-2 p-4">
        {content}
      </main>
    </div>
  );
};

export default EmployeeDirectoryLayout;
