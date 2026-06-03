import { Outlet } from "react-router-dom";
import EmployeeSearch from "./EmployeeSearch";
import EmployeeTable from "./EmployeeTable";
import AttendanceAssignments from "../Attendance/AttendanceAssignments";
import Button from "../shared/atoms/Button";
import ContextualPopup from "../shared/molecules/ContextualPopup";
import { EllipsisVertical } from "lucide-react";
import ChangeHrbp from "./tools/ChangeHrbp/ChangeHrbp";
import { Employee } from "../../types/employee";

import { EmployeeDirectoryFilterData } from "./EmployeeSearch";
import { useState, useRef } from "react";
import ChangeDottedLineManager from "./tools/ChangeDottedLineManager/ChangeDottedLineManager";
import ChangeProbationPeriod from "./tools/ChangeProbationPeriod/ChangeProbationPeriod";
import DeactivateEmployee from "./tools/DeactivateEmployee/DeactivateEmployee";
import { useGetUiPermission } from "../../hooks/userUiPermission";
import { isActionEnabled } from "../../utils/uiPermission";

type Props = {
    activeTab: 'directory' | 'my_reportees';
};

type ToolType = 'hrbp' | 'dotted_line_manager' | 'attendance_assignments' | 'probation_period' | 'deactivate_employee' | null;

const EmployeeDirectoryContent = ({ activeTab }: Props) => {
    // STATE LIVES HERE
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [selectedEmployees, setSelectedEmployees] = useState<Employee[]>([]);
    const [isPopupOpen, setIsPopupOpen] = useState(false);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [pendingEmployees, setPendingEmployees] = useState<Employee[]>([]);
    const [appliedSearchEmployees, setAppliedSearchEmployees] = useState<Employee[]>([]);
    const [activeFilters, setActiveFilters] = useState<EmployeeDirectoryFilterData>({ status: "Active" });
    const [pendingFilters, setPendingFilters] = useState<EmployeeDirectoryFilterData>({ status: "Active" });

    const searchState = {
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
        activeTab,
        clearTableSelection: () => setSelectedEmployees([]),
    };
    const { data: userUiPermission } = useGetUiPermission("Employee Directory");
    const canChangeHrbp = isActionEnabled(
        userUiPermission,
        "change_hrbp",
        "Employee Directory"
    );
    const canChangeDottedLineManager = isActionEnabled(
        userUiPermission,
        "change_dotted_line_manager",
        "Employee Directory"
    );
    const canChangeProbationPeriod = isActionEnabled(
        userUiPermission,
        "change_probation_period",
        "Employee Directory"
    );
    const canDeactivateEmployee = isActionEnabled(
        userUiPermission,
        "deactivate_employee",
        "Employee Directory"
    );
    const canAttendanceAssignments = isActionEnabled(
        userUiPermission,
        "attendance_assignments",
        "Employee Directory"
    );
    const [activeTool, setActiveTool] = useState<ToolType>(null);

    const canPerformDropdownActions = canChangeHrbp || canChangeDottedLineManager || canChangeProbationPeriod || canDeactivateEmployee;
    return (
        <>
            <EmployeeSearch {...searchState} />

            <EmployeeTable
                employees={employees}
                selectedEmployees={selectedEmployees}
                setSelectedEmployees={setSelectedEmployees}
            />

            {selectedEmployees.length > 0 && canPerformDropdownActions && canAttendanceAssignments && (
                <div className="sticky bottom-1 flex justify-end bg-primary rounded-md p-2 gap-2">
                    {canAttendanceAssignments && <Button
                        variant="soft"
                        size="sm"
                        onClick={() => setActiveTool('attendance_assignments')}
                    >
                        Attendance Assignments
                    </Button>}

                    {canPerformDropdownActions && <Button
                        ref={buttonRef}
                        variant="soft"
                        size="sm"
                        onClick={() => setIsPopupOpen(!isPopupOpen)}
                        className="h-full px-2"
                    >
                        <EllipsisVertical size={18} />
                    </Button>}
                </div>
            )}

            <ContextualPopup
                isOpen={isPopupOpen}
                onClose={() => setIsPopupOpen(false)}
                triggerRef={buttonRef}
                className="mt-2"
            >
                <div className="flex flex-col p-2">

                    {canChangeHrbp && <Button
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
                    </Button>}
                    {canChangeDottedLineManager && <Button
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
                    </Button>}
                    {canChangeProbationPeriod && <Button
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
                    </Button>}
                    {canDeactivateEmployee && <Button
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
                    </Button>}
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
