import React, { useRef, useState } from "react";
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
import ContextualPopup from "../shared/molecules/ContextualPopup";
import { EllipsisVertical } from "lucide-react";


const EmployeeDirectoryLayout: React.FC = () => {
  const { isDesktop } = useScreenSize();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployees, setSelectedEmployees] = useState<Employee[]>([]);
  const [isAttendanceAssignmentsOpen, setIsAttendanceAssignmentsOpen] = useState(false);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [updateDetails, setUpdateDetails] = useState({
    doctype: "", // Doctype we want to update
    fieldDoctype: "", // field's data that we want to fetch
    updateValue: "",// field key we want to update
    fieldName: ""
  })

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
          <div className="flex gap-2 bg-primary rounded-md p-2 justify-end">
            <Button variant="soft" size="sm" onClick={() => { setIsAttendanceAssignmentsOpen(true) }}>Attendance Assignments</Button>
            <Button variant="soft" size="sm" onClick={() => { setUpdateDetails({ doctype: "Employee", updateValue: "probation_period", fieldDoctype: "Probation Period", fieldName: 'Probation Period' }) }}>Update Probation</Button>
            <Button
              ref={buttonRef}
              variant="soft"
              size="sm"
              onClick={() => setIsPopupOpen(!isPopupOpen)}
              className="self-center  h-full px-2"
            >
              <EllipsisVertical size={18} />
            </Button>
          </div>
        )}
        <ContextualPopup
          isOpen={isPopupOpen}
          onClose={() => setIsPopupOpen(false)}
          triggerRef={buttonRef}
          className="mt-4"
        >
          <div className="flex flex-col gap-2">
            <Button
              variant="subtle"
              fullWidth
              size="sm"
              contentAlign="start"
              className="text-sm px-4 py-2"
              onClick={() => { setUpdateDetails({ doctype: "Employee", updateValue: "custom_dotted_line_manager", fieldDoctype: "Employee", fieldName: "Dotted Line Manager" }) }}
            >
              Change Dottend Line Manager
            </Button>
            <Button
              variant="subtle"
              fullWidth
              contentAlign="start"
              size="sm"
              className="text-sm px-4 py-2"
              onClick={() => { setUpdateDetails({ doctype: "Employee", updateValue: "custom_hrbp", fieldDoctype: "Employee", fieldName: "HRBP" }) }}
            >
              Change HRBP
            </Button>
            <Button
              variant="subtle"
              fullWidth
              contentAlign="start"
              size="sm"
              className="text-sm px-4 py-2"
              onClick={() => { setUpdateDetails({ doctype: "Employee", updateValue: "custom_weekly_off", fieldDoctype: "Week Off", fieldName: "Week Off" }) }}
            >
              Change Weekly Off
            </Button>
          </div>
        </ContextualPopup>
        <Outlet />
        <AttendanceAssignments
          open={isAttendanceAssignmentsOpen}
          onClose={() => { setIsAttendanceAssignmentsOpen(false) }}
          employees={selectedEmployees}
        />
        <DynamicEmployeeUpdateForm
          doctype={
            updateDetails.doctype
          }
          fieldDoctype={
            updateDetails.fieldDoctype
          }
          fieldName={
            updateDetails.fieldName
          }
          updateValue={updateDetails.updateValue}
          isOpen={!!updateDetails.doctype}
          onClose={() => setUpdateDetails({ doctype: "", updateValue: "", fieldDoctype: "", fieldName: "" })}
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
              <Button variant="soft" size="sm" onClick={() => { setUpdateDetails({ doctype: "Employee", updateValue: "probation_period", fieldDoctype: "Probation Period", fieldName: 'Probation Period' }) }}>Update Probation</Button>
              <Button
                ref={buttonRef}
                variant="soft"
                size="sm"
                onClick={() => setIsPopupOpen(!isPopupOpen)}
                className="self-center  h-full px-2"
              >
                <EllipsisVertical size={18} />
              </Button>
            </div>
          )}
          <Outlet />
        </div>
      </div>
      <ContextualPopup
        isOpen={isPopupOpen}
        onClose={() => setIsPopupOpen(false)}
        triggerRef={buttonRef}
        className="mt-4"
      >
        <div className="flex flex-col gap-2">
          <Button
            variant="subtle"
            fullWidth
            size="sm"
            contentAlign="start"
            className="text-sm px-4 py-2"
            onClick={() => { setUpdateDetails({ doctype: "Employee", updateValue: "custom_dotted_line_manager", fieldDoctype: "Employee", fieldName: "Dotted Line Manager" }) }}
          >
            Change Dottend Line Manager
          </Button>
          <Button
            variant="subtle"
            fullWidth
            contentAlign="start"
            size="sm"
            className="text-sm px-4 py-2"
            onClick={() => { setUpdateDetails({ doctype: "Employee", updateValue: "custom_hrbp", fieldDoctype: "Employee", fieldName: "HRBP" }) }}
          >
            Change HRBP
          </Button>
          <Button
            variant="subtle"
            fullWidth
            contentAlign="start"
            size="sm"
            className="text-sm px-4 py-2"
            onClick={() => { setUpdateDetails({ doctype: "Employee", updateValue: "custom_weekly_off", fieldDoctype: "Week Off", fieldName: "Week Off" }) }}
          >
            Change Weekly Off
          </Button>
        </div>
      </ContextualPopup>
      <AttendanceAssignments
        open={isAttendanceAssignmentsOpen}
        onClose={() => { setIsAttendanceAssignmentsOpen(false) }}
        employees={selectedEmployees}
      />
      <DynamicEmployeeUpdateForm
        doctype={
          updateDetails.doctype
        }
        fieldDoctype={
          updateDetails.fieldDoctype
        }
        fieldName={
          updateDetails.fieldName
        }
        updateValue={updateDetails.updateValue}
        isOpen={!!updateDetails.doctype}
        onClose={() => setUpdateDetails({ doctype: "", updateValue: "", fieldDoctype: "", fieldName: "" })}
      />
    </DesktopLayoutWrapper>
  );

  return isDesktop ? desktopLayout : mobileLayout;
};

export default EmployeeDirectoryLayout;
