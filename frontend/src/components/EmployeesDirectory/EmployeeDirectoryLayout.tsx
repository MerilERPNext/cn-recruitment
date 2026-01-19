import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import { useScreenSize } from "../../hooks/useScreenSize";
import DesktopLayoutWrapper from "../DesktopLayoutWrapper";
import HeaderBar from "../HeaderBar";
import EmployeeSearch from "./EmployeeSearch";
import { Employee } from "../../types/employee";
import EmployeeTable from "./EmployeeTable";
import AttendanceAssignments from "../Attendance/AttendanceAssignments";
import Button from "../shared/atoms/Button";
import DynamicEmployeeUpdateForm from "./DynamicEmployeeUpdateForm";


const EmployeeDirectoryLayout: React.FC = () => {
  const { isDesktop } = useScreenSize();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployees, setSelectedEmployees] = useState<Employee[]>([]);
  const [isAttendanceAssignmentsOpen, setIsAttendanceAssignmentsOpen] = useState(false);
  const [isUpdateFormOpen, setIsUpdateFormOpen] = useState(false);
  const mobileLayout = (
    <div className="flex flex-col min-h-screen bg-white">
      <header className="sticky top-0 z-50 bg-white shadow-sm">
        <>
          <HeaderBar title={"Employee Directory"} />

        </>
      </header>
      <main className="z-10 flex-grow flex flex-col gap-2 p-4">
        <EmployeeSearch setEmployees={setEmployees} />
        <EmployeeTable
          employees={employees}
          selectedEmployees={selectedEmployees}
          setSelectedEmployees={setSelectedEmployees}
        />
        {selectedEmployees.length > 0 && (
          <div className="flex gap-2">
            <Button variant="soft" size="sm" onClick={() => { setIsAttendanceAssignmentsOpen(true) }}>Attendance Assignments</Button>
            <Button variant="soft" size="sm" onClick={() => { setIsUpdateFormOpen(true) }}>Update Probation</Button>
          </div>
        )}
        <Outlet />
        <AttendanceAssignments
          open={isAttendanceAssignmentsOpen}
          onClose={() => { setIsAttendanceAssignmentsOpen(false) }}
          employees={selectedEmployees}
        />
        <DynamicEmployeeUpdateForm
          doctype="Probation Period"
          isOpen={isUpdateFormOpen}
          onClose={() => setIsUpdateFormOpen(false)}
        />
      </main>
    </div>
  );


  const desktopLayout = (
    <DesktopLayoutWrapper title="Employee Directory">
      <div className="flex justify-center h-full w-full">
        <div className="flex flex-col gap-2 w-full p-4">
          <EmployeeSearch setEmployees={setEmployees} />
          <EmployeeTable
            employees={employees}
            selectedEmployees={selectedEmployees}
            setSelectedEmployees={setSelectedEmployees}
          />
          {selectedEmployees.length > 0 && (
            <div className="flex justify-end bg-primary rounded-md p-2 gap-2">
              <Button variant="soft" size="sm" onClick={() => { setIsAttendanceAssignmentsOpen(true) }}>Attendance Assignments</Button>
              <Button variant="soft" size="sm" onClick={() => { setIsUpdateFormOpen(true) }}>Update Probation</Button>
            </div>
          )}
          <Outlet />
        </div>
      </div>
      <AttendanceAssignments
        open={isAttendanceAssignmentsOpen}
        onClose={() => { setIsAttendanceAssignmentsOpen(false) }}
        employees={selectedEmployees}
      />
      <DynamicEmployeeUpdateForm
        doctype="Probation Period"
        isOpen={isUpdateFormOpen}
        onClose={() => setIsUpdateFormOpen(false)}
      />
    </DesktopLayoutWrapper>
  );

  return isDesktop ? desktopLayout : mobileLayout;
};

export default EmployeeDirectoryLayout;
