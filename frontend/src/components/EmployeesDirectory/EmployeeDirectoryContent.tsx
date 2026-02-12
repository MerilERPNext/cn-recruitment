import { Outlet } from "react-router-dom";
import EmployeeSearch from "./EmployeeSearch";
import EmployeeTable from "./EmployeeTable";
import AttendanceAssignments from "../Attendance/AttendanceAssignments";
import Button from "../shared/atoms/Button";
import ContextualPopup from "../shared/molecules/ContextualPopup";
import { EllipsisVertical } from "lucide-react";
import ChangeHrbp from "./tools/ChangeHrbp/ChangeHrbp";
import { Employee } from "../../types/employee";

import { EmployeeSearchProps } from "./EmployeeSearch";
import { useState } from "react";
import ChangeDottedLineManager from "./tools/ChangeDottedLineManager/ChangeDottedLineManager";
import ChangeProbationPeriod from "./tools/ChangeProbationPeriod/ChangeProbationPeriod";
import DeactivateEmployee from "./tools/DeactivateEmployee/DeactivateEmployee";

type Props = {
    employees: Employee[];
    selectedEmployees: Employee[];
    setSelectedEmployees: React.Dispatch<React.SetStateAction<Employee[]>>;
    searchState: EmployeeSearchProps;
    uiState: {
        isPopupOpen: boolean;
        setIsPopupOpen: React.Dispatch<React.SetStateAction<boolean>>;
        buttonRef: React.RefObject<HTMLButtonElement>;
    };
};

type ToolType = 'hrbp' | 'dotted_line_manager' | 'attendance_assignments' | 'probation_period' | 'deactivate_employee' | null;

const EmployeeDirectoryContent = ({
    employees,
    selectedEmployees,
    setSelectedEmployees,
    searchState,
    uiState,
}: Props) => {
    const {
        isPopupOpen,
        setIsPopupOpen,
        buttonRef,
    } = uiState;

    const [activeTool, setActiveTool] = useState<ToolType>(null);
    return (
        <>
            <EmployeeSearch {...searchState} />

            <EmployeeTable
                employees={employees}
                selectedEmployees={selectedEmployees}
                setSelectedEmployees={setSelectedEmployees}
            />

            {selectedEmployees.length > 0 && (
                <div className="sticky bottom-1 flex justify-end bg-primary rounded-md p-2 gap-2">
                    <Button
                        variant="soft"
                        size="sm"
                        onClick={() => setActiveTool('attendance_assignments')}
                    >
                        Attendance Assignments
                    </Button>

                    <Button
                        ref={buttonRef}
                        variant="soft"
                        size="sm"
                        onClick={() => setIsPopupOpen(!isPopupOpen)}
                        className="h-full px-2"
                    >
                        <EllipsisVertical size={18} />
                    </Button>
                </div>
            )}

            <ContextualPopup
                isOpen={isPopupOpen}
                onClose={() => setIsPopupOpen(false)}
                triggerRef={buttonRef}
                className="mt-2"
            >
                <div className="flex flex-col p-2">

                    <Button
                        variant="subtle"
                        contentAlign="start"
                        size="sm"
                        fullWidth
                        className="text-sm px-4 py-2"
                        onClick={() => {
                            setActiveTool('hrbp');
                            setIsPopupOpen(false);
                        }}
                    >
                        Change HRBP
                    </Button>
                    <Button
                        variant="subtle"
                        contentAlign="start"
                        size="sm"
                        fullWidth
                        className="text-sm px-4 py-2"
                        onClick={() => {
                            setActiveTool('dotted_line_manager');
                            setIsPopupOpen(false);
                        }}
                    >
                        Change Dotted Line Manager
                    </Button>
                    <Button
                        variant="subtle"
                        contentAlign="start"
                        size="sm"
                        fullWidth
                        className="text-sm px-4 py-2"
                        onClick={() => {
                            setActiveTool('probation_period');
                            setIsPopupOpen(false);
                        }}
                    >
                        Change Probation Period
                    </Button>
                    <Button
                        variant="subtle"
                        contentAlign="start"
                        size="sm"
                        fullWidth
                        className="text-sm px-4 py-2"
                        onClick={() => {
                            setActiveTool('deactivate_employee');
                            setIsPopupOpen(false);
                        }}
                    >
                        Deactivate Employee
                    </Button>
                </div>
            </ContextualPopup>

            <AttendanceAssignments
                open={activeTool === 'attendance_assignments'}
                onClose={() => setActiveTool(null)}
                employees={selectedEmployees}
            />

            <ChangeHrbp
                isOpen={activeTool === 'hrbp'}
                onClose={() => setActiveTool(null)}
                employees={selectedEmployees.map((employee) => employee.employee)}
            />
            <ChangeDottedLineManager
                isOpen={activeTool === 'dotted_line_manager'}
                onClose={() => setActiveTool(null)}
                employees={selectedEmployees.map((employee) => employee.employee)}
            />
            <ChangeProbationPeriod
                isOpen={activeTool === 'probation_period'}
                onClose={() => setActiveTool(null)}
                employees={selectedEmployees.map((employee) => employee.employee)}
            />
            <DeactivateEmployee
                isOpen={activeTool === 'deactivate_employee'}
                onClose={() => setActiveTool(null)}
                employees={selectedEmployees.map((employee) => employee.employee)}
            />
            <Outlet />
        </>
    );
};

export default EmployeeDirectoryContent;
