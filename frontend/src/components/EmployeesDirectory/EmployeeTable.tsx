import { Link } from "react-router-dom";
import { Employee } from "../../types/employee";
import WrapperHoverCard from "../shared/WrapperHoverCard";
import { useScreenSize } from "../../hooks/useScreenSize";
import Avatar from "../shared/Avatar";
import { Copy, CopyCheck, EllipsisVertical, ChevronDown, ChevronRight } from "lucide-react";
import SeparationDetailsView from "./SeparationDetailsView";
import React, { useState, useRef } from "react";
import ContextualPopup from "../shared/molecules/ContextualPopup";
import Button from "../shared/atoms/Button";
import ChangeSelfServiceStatus from "./tools/ChangeSelfServiceStatus/ChangeSelfServiceStatus";
import ChangeWeekOff from "./tools/ChangeWeekOff/ChangeWeekOff";
import ResetPassword from "./tools/ResetPassword/ResetPassword";
import ResetOtpLimit from "./tools/ResetOtpLimit/ResetOtpLimit";
import PlatformAccessControls from "./tools/PlatformAccessControls/PlatformAccessControls";
import UndoDeactivation from "./tools/UndoDeactivation/UndoDeactivation";
import ActivateEmployee from "./tools/ActivateEmployee/ActivateEmployee";
import { useGetUiPermission } from "../../hooks/userUiPermission";
import { isActionEnabled } from "../../utils/uiPermission";
const EmployeeTable = ({
  employees,
  selectedEmployees = [],
  setSelectedEmployees,
  activeTab,
}: {
  employees: Employee[];
  selectedEmployees: Employee[];
  setSelectedEmployees: React.Dispatch<React.SetStateAction<Employee[]>>;
  activeTab?: 'directory' | 'my_reportees';
}) => {

  const { data: userUiPermission } = useGetUiPermission("Employee Directory");
  const canChangeSelfServiceStatus = isActionEnabled(
    userUiPermission,
    "change_self_service_status",
    "Employee Directory"
  );
  const canChangeWeeklyOff = isActionEnabled(
    userUiPermission,
    "change_week_off",
    "Employee Directory"
  );
  const canResetPassword = isActionEnabled(
    userUiPermission,
    "reset_password",
    "Employee Directory"
  );

  const canResetOtpAuthLimit = isActionEnabled(
    userUiPermission,
    "reset_otp_auth_limit",
    "Employee Directory"
  );
  const canChangePlatformAccess = isActionEnabled(
    userUiPermission,
    "change_platform_access",
    "Employee Directory"
  );
  const canUndoDeactivation = isActionEnabled(
    userUiPermission,
    "undo_deactivation",
    "Employee Directory"
  );
  const canActivateEmployee = isActionEnabled(
    userUiPermission,
    "activate_employee",
    "Employee Directory"
  );

  const { isDesktop } = useScreenSize();
  const [activeTool, setActiveTool] = useState<'week_off' | 'self_service' | 'password' | 'otp_limit' | 'platform_access' | 'undo_deactivation' | 'activate' | null>(null);
  const [selectedRowEmployee, setSelectedRowEmployee] = useState<Employee | null>(null);
  const [openPopupId, setOpenPopupId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<string[]>([]);
  const actionButtonRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});

  const toggleRow = (employeeName: string) => {
    setExpandedRows(prev => 
      prev.includes(employeeName) 
        ? prev.filter(name => name !== employeeName) 
        : [...prev, employeeName]
    );
  };

  const isSelectableStatus = (status: string) => status === "Active" || status === "Pending";
  const selectableEmployees = employees.filter(emp => isSelectableStatus(emp.status));
  const showCheckboxColumn = selectableEmployees.length > 0;
  const hasCheckboxesOrChevrons = employees.some(emp => isSelectableStatus(emp.status) || emp.status === "Inactive");
  
  const isAllSelected =
    selectableEmployees.length > 0 && selectedEmployees.length === selectableEmployees.length;
  const isSomeSelected =
    selectedEmployees.length > 0 && selectedEmployees.length < selectableEmployees.length;

  const handleSelectAll = () => {
    if (isAllSelected) {
      setSelectedEmployees([]);
    } else {
      setSelectedEmployees(selectableEmployees);
    }
  };

  const handleSelectOne = (employee: Employee) => {
    const isSelected = selectedEmployees.some(
      (emp) => emp.name === employee.name,
    );
    if (isSelected) {
      setSelectedEmployees((prev) =>
        prev.filter((emp) => emp.name !== employee.name),
      );
    } else {
      setSelectedEmployees((prev) => [...prev, employee]);
    }
  };
  return (
    <>
      {isDesktop ? (
        <div className="overflow-x-auto rounded-xl border border-gray-100 bg-white shadow-sm scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
          <table className="min-w-full border-separate border-spacing-0">
        <thead className="bg-gray-50/80 backdrop-blur-sm">
          <tr className="sticky top-0 z-10">
            {hasCheckboxesOrChevrons && (
              <th className="whitespace-nowrap sticky top-0 bg-transparent border-b border-r border-gray-100 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 group first:rounded-tl-xl transition-colors hover:bg-gray-100/50 w-[48px]">
                {showCheckboxColumn ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      ref={(el: HTMLInputElement | null) => {
                        if (el) el.indeterminate = isSomeSelected;
                      }}
                      onChange={handleSelectAll}
                      className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer shadow-sm"
                    />
                  </div>
                ) : <div className="w-4 h-4" />}
              </th>
            )}
            <th className="whitespace-nowrap sticky top-0 bg-transparent border-b border-r border-gray-100 px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 transition-colors hover:bg-gray-100/50">
              Employee
            </th>
            <th className="whitespace-nowrap sticky top-0 bg-transparent border-b border-r border-gray-100 px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 transition-colors hover:bg-gray-100/50">
              Employee ID
            </th>
            <th className="whitespace-nowrap sticky top-0 bg-transparent border-b border-r border-gray-100 px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 transition-colors hover:bg-gray-100/50">
              Designation
            </th>
            <th className="whitespace-nowrap sticky top-0 bg-transparent border-b border-r border-gray-100 px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 transition-colors hover:bg-gray-100/50">
              Department
            </th>
            <th className="whitespace-nowrap sticky top-0 bg-transparent border-b border-r border-gray-100 px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 transition-colors hover:bg-gray-100/50">
              Email
            </th>
            <th className="whitespace-nowrap sticky top-0 bg-transparent border-b border-gray-100 px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 transition-colors hover:bg-gray-100/50">
              Office Location
            </th>
          </tr>
        </thead>

        <tbody className="bg-white">
          {employees.map((item: Employee) => {
            const isItemSelected = selectedEmployees.some(
              (emp) => emp.name === item.name,
            );
            return (
              <React.Fragment key={item.name}>
              <tr
                className={`group transition-all duration-200 ${isItemSelected ? "bg-primary-50/70" : "hover:bg-primary-50/40"}`}
              >
                {hasCheckboxesOrChevrons && (
                  <td className="whitespace-nowrap border-r border-gray-100 px-4 py-4 text-sm font-medium border-b">
                    {isSelectableStatus(item.status) ? (
                      <input
                        type="checkbox"
                        checked={isItemSelected}
                        onChange={() => handleSelectOne(item)}
                        className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer shadow-sm"
                      />
                    ) : (
                      item.status === "Inactive" ? (
                        <button
                          onClick={() => toggleRow(item.name)}
                          className="p-1 text-gray-500 hover:text-primary-600 transition-colors rounded-full hover:bg-primary-50"
                          aria-label={expandedRows.includes(item.name) ? "Hide separation details" : "Show separation details"}
                          title={expandedRows.includes(item.name) ? "Hide separation details" : "Show separation details"}
                        >
                          {expandedRows.includes(item.name) ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </button>
                      ) : (
                        <div className="w-4 h-4" />
                      )
                    )}
                  </td>
                )}
                <td className="whitespace-nowrap border-r px-5 py-2.5 text-sm border-b border-gray-100">
                  <div className="flex items-center gap-3 justify-between w-full">
                    <Link
                      to={`/webapp/employee-profile?target_user=${item?.employee}`}
                      target="_blank"
                      className="group/link"
                    >
                      <div className="font-semibold text-gray-700 group-hover/link:text-primary-600 transition-colors flex gap-2 justify-between w-full">
                        <WrapperHoverCard employeeId={item.employee}>
                          {item.employee_name}
                        </WrapperHoverCard>
                      </div>
                    </Link>

                    <div>
                      {activeTab !== 'my_reportees' && (canChangeWeeklyOff || canChangeSelfServiceStatus || canResetPassword || canResetOtpAuthLimit || canChangePlatformAccess) && <Button
                        ref={(el) => { actionButtonRefs.current[item.name] = el; }}
                        variant="subtle"
                        size="sm"
                        disabled={selectedEmployees.length > 0}
                        onClick={() => setOpenPopupId(openPopupId === item.name ? null : item.name)}
                        className="p-1"
                      >
                        <EllipsisVertical size={16} />
                      </Button>}

                      <ContextualPopup
                        isOpen={openPopupId === item.name}
                        onClose={() => setOpenPopupId(null)}
                        triggerRef={{ current: actionButtonRefs.current[item.name] }}
                        className="mt-1"
                      >
                        <div className="flex flex-col p-1 min-w-[160px]">
                          {canChangeWeeklyOff && (item.status === "Active" || item.status === "Pending") && <Button
                            variant="subtle"
                            contentAlign="start"
                            fullWidth
                            disabled={!item.custom_weekly_off}
                            size="md"
                            onClick={() => {
                              setSelectedRowEmployee(item);
                              setActiveTool('week_off');
                              setOpenPopupId(null);
                            }}
                          >
                            Assign Weekly Off
                          </Button>}
                          {canChangeSelfServiceStatus && item.status === "Active" && <Button
                            variant="subtle"
                            contentAlign="start"
                            fullWidth
                            size="md"
                            onClick={() => {
                              setSelectedRowEmployee(item);
                              setActiveTool('self_service');
                              setOpenPopupId(null);
                            }}
                          >
                            Self Service
                          </Button>}
                          {canResetPassword && item.status === "Active" && <Button
                            variant="subtle"
                            size="md"
                            contentAlign="start"
                            fullWidth
                            onClick={() => {
                              setSelectedRowEmployee(item);
                              setActiveTool('password');
                              setOpenPopupId(null);
                            }}
                          >
                            Reset Password
                          </Button>}
                          {canResetOtpAuthLimit && <Button
                            variant="subtle"
                            size="md"
                            contentAlign="start"
                            fullWidth
                            disabled={!item.user_id}
                            onClick={() => {
                              setSelectedRowEmployee(item);
                              setActiveTool('otp_limit');
                              setOpenPopupId(null);
                            }}
                          >
                            Reset OTP Auth Limits
                          </Button>}
                          {canChangePlatformAccess && (item.status === "Active" || item.status === "Pending") && <Button
                            variant="subtle"
                            size="md"
                            contentAlign="start"
                            fullWidth
                            onClick={() => {
                              setSelectedRowEmployee(item);
                              setActiveTool('platform_access');
                              setOpenPopupId(null);
                            }}
                          >
                            Platform Access Controls
                          </Button>}
                          {canUndoDeactivation && item.status === "Inactive" && <Button
                            variant="subtle"
                            size="md"
                            contentAlign="start"
                            fullWidth
                            onClick={() => {
                              setSelectedRowEmployee(item);
                              setActiveTool('undo_deactivation');
                              setOpenPopupId(null);
                            }}
                          >
                            Undo Deactivation
                          </Button>}
                          {canActivateEmployee && item.status === "Pending" && <Button
                            variant="subtle"
                            size="md"
                            contentAlign="start"
                            fullWidth
                            onClick={() => {
                              setSelectedRowEmployee(item);
                              setActiveTool('activate');
                              setOpenPopupId(null);
                            }}
                          >
                            Activate
                          </Button>}
                        </div>
                      </ContextualPopup>
                    </div>
                  </div>
                </td>
                <td className="whitespace-nowrap border-r px-5 py-2.5 text-sm text-gray-500 border-b border-gray-100">
                  <span className="font-mono text-[11px] opacity-60">#</span>{item.employee}
                </td>
                <td className="whitespace-nowrap border-r px-5 py-2.5 text-sm border-b border-gray-100">
                  <div className="flex flex-col">
                    <span className="font-medium text-gray-700">{item.custom_designation_name || "-"}</span>
                  </div>
                </td>
                <td className="whitespace-nowrap border-r px-5 py-2.5 text-sm border-b border-gray-100">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-gray-50 text-gray-600 border border-gray-100">
                    {item.department || "-"}
                  </span>
                </td>
                <td className="whitespace-nowrap border-r px-5 py-2.5 text-sm text-gray-500 border-b border-gray-100 font-brand">
                  <div className="flex items-center gap-2 group/copy">
                    <span className="truncate max-w-[150px]">{item.user_id || "-"}</span>
                    {item.user_id && (
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(item.user_id || "");
                          setCopiedId(item.name);
                          setTimeout(() => setCopiedId(null), 2000);
                        }}
                        className={`p-1 rounded flex items-center justify-center transition-colors ${copiedId === item.name ? "text-success-600 bg-success-50" : "text-gray-400 hover:text-primary-600 hover:bg-primary-50 opacity-0 group-hover/copy:opacity-100"}`}
                      >
                        {copiedId === item.name ? <CopyCheck size={14} /> : <Copy size={14} />}
                      </button>
                    )}
                  </div>
                </td>
                <td className="whitespace-nowrap px-5 py-2.5 text-sm text-gray-500 border-b border-gray-100">
                  {item.branch || "-"}
                </td>

              </tr>
              {item.status === "Inactive" && expandedRows.includes(item.name) && (
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <td colSpan={7} className="p-0">
                    <div className="border-l-4 border-l-primary-500">
                      <SeparationDetailsView employeeId={item.employee} />
                    </div>
                  </td>
                </tr>
              )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  ) : (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {employees.map((item) => {
        const isItemSelected = selectedEmployees.some(
          (emp) => emp.name === item.name
        );

        return (
          <div
            key={item.name}
            className={`group relative rounded-2xl border bg-white p-5 transition-all duration-300 shadow-sm hover:shadow-md
              ${isItemSelected ? "border-primary-400 ring-2 ring-primary-50 bg-primary-50/10" : "border-gray-200 hover:border-primary-200"}
            `}
          >
            {/* Top Selection + Avatar Section */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                {hasCheckboxesOrChevrons && (
                  isSelectableStatus(item.status) ? (
                    <input
                      type="checkbox"
                      checked={isItemSelected}
                      onChange={() => handleSelectOne(item)}
                      className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer shadow-sm shrink-0"
                    />
                  ) : (
                    item.status === "Inactive" ? (
                      <button
                        onClick={() => toggleRow(item.name)}
                        className="p-1 text-gray-500 hover:text-primary-600 transition-colors rounded-full hover:bg-primary-50 shrink-0"
                        aria-label={expandedRows.includes(item.name) ? "Hide separation details" : "Show separation details"}
                        title={expandedRows.includes(item.name) ? "Hide separation details" : "Show separation details"}
                      >
                        {expandedRows.includes(item.name) ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </button>
                    ) : (
                      <div className="w-4 h-4 shrink-0" />
                    )
                  )
                )}
                <Avatar name={item.employee_name} src={item.image} />
                <div>
                  <Link
                    to={`/webapp/employee-profile?target_user=${item?.employee}`}
                    target="_blank"
                    className="block"
                  >
                    <div className="text-sm font-bold text-gray-800 group-hover:text-primary-600 transition-colors">
                      <WrapperHoverCard employeeId={item.employee}>
                        {item.employee_name}
                      </WrapperHoverCard>
                    </div>
                  </Link>
                  <p className="text-[10px] font-mono text-gray-400 mt-0.5">#{item.employee}</p>
                </div>
              </div>

              <div className="relative">
                {activeTab !== 'my_reportees' && (canChangeWeeklyOff || canChangeSelfServiceStatus || canResetPassword || canResetOtpAuthLimit || canChangePlatformAccess) && <Button
                  ref={(el) => { actionButtonRefs.current[item.name] = el; }}
                  variant="soft"
                  size="sm"
                  disabled={selectedEmployees.length > 0}
                  onClick={() => setOpenPopupId(openPopupId === item.name ? null : item.name)}
                  className="p-1.5 rounded-lg hover:bg-gray-100"
                >
                  <EllipsisVertical size={18} className="text-gray-500" />
                </Button>}

                <ContextualPopup
                  isOpen={openPopupId === item.name}
                  onClose={() => setOpenPopupId(null)}
                  triggerRef={{ current: actionButtonRefs.current[item.name] }}
                  className="mt-1 right-0"
                >
                  <div className="flex flex-col p-1.5 min-w-[170px]">
                    {canChangeWeeklyOff && (item.status === "Active" || item.status === "Pending") && <Button
                      variant="subtle"
                      size="sm"
                      contentAlign="start"
                      fullWidth
                      disabled={!item.custom_weekly_off}
                      onClick={() => {
                        setSelectedRowEmployee(item);
                        setActiveTool('week_off');
                        setOpenPopupId(null);
                      }}
                      className="text-xs py-2 px-3 hover:bg-primary-50"
                    >
                      Assign Weekly Off
                    </Button>}
                    {canChangeSelfServiceStatus && item.status === "Active" && <Button
                      variant="subtle"
                      size="sm"
                      contentAlign="start"
                      fullWidth
                      onClick={() => {
                        setSelectedRowEmployee(item);
                        setActiveTool('self_service');
                        setOpenPopupId(null);
                      }}
                      className="text-xs py-2 px-3 hover:bg-primary-50"
                    >
                      Self Service
                    </Button>}
                    {canResetPassword && item.status === "Active" && <Button
                      variant="subtle"
                      size="sm"
                      contentAlign="start"
                      fullWidth
                      onClick={() => {
                        setSelectedRowEmployee(item);
                        setActiveTool('password');
                        setOpenPopupId(null);
                      }}
                      className="text-xs py-2 px-3 hover:bg-primary-50"
                    >
                      Reset Password
                    </Button>}
                    {canResetOtpAuthLimit && <Button
                      variant="subtle"
                      size="sm"
                      contentAlign="start"
                      fullWidth
                      disabled={!item.user_id}
                      onClick={() => {
                        setSelectedRowEmployee(item);
                        setActiveTool('otp_limit');
                        setOpenPopupId(null);
                      }}
                      className="text-xs py-2 px-3 hover:bg-primary-50"
                    >
                      Reset OTP Auth Limits
                    </Button>}
                    {canChangePlatformAccess && (item.status === "Active" || item.status === "Pending") && <Button
                      variant="subtle"
                      size="sm"
                      contentAlign="start"
                      fullWidth
                      onClick={() => {
                        setSelectedRowEmployee(item);
                        setActiveTool('platform_access');
                        setOpenPopupId(null);
                      }}
                      className="text-xs py-2 px-3 hover:bg-primary-50"
                    >
                      Platform Access Controls
                    </Button>}
                    {canUndoDeactivation && item.status === "Inactive" && <Button
                      variant="subtle"
                      size="sm"
                      contentAlign="start"
                      fullWidth
                      onClick={() => {
                        setSelectedRowEmployee(item);
                        setActiveTool('undo_deactivation');
                        setOpenPopupId(null);
                      }}
                      className="text-xs py-2 px-3 hover:bg-primary-50"
                    >
                      Undo Deactivation
                    </Button>}
                    {canActivateEmployee && item.status === "Pending" && <Button
                      variant="subtle"
                      size="sm"
                      contentAlign="start"
                      fullWidth
                      onClick={() => {
                        setSelectedRowEmployee(item);
                        setActiveTool('activate');
                        setOpenPopupId(null);
                      }}
                      className="text-xs py-2 px-3 hover:bg-primary-50"
                    >
                      Activate
                    </Button>}
                  </div>
                </ContextualPopup>
              </div>
            </div>

            {/* Info Grid with Icons */}
            <div className="space-y-3 pt-3 border-t border-gray-100">


              {item.user_id && <div className="flex flex-col gap-1">
                <span className="text-gray-400 text-xs uppercase tracking-wider font-semibold">Email</span>
                <span className="text-sm font-medium text-gray-700 truncate">{item.user_id || "-"}</span>
              </div>}
              <div className="flex flex-col gap-1 items-start justify-start">
                <span className="text-gray-400 text-xs uppercase tracking-wider font-semibold">Department</span>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-gray-100 text-gray-600">
                  {item.department || "-"}
                </span>
              </div>
              {item.branch && <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400 text-xs uppercase tracking-wider font-semibold">Location</span>
                <div className="flex items-center gap-1.5 font-medium text-gray-700">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary-400"></div>
                  {item.branch || "-"}
                </div>
              </div>}
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400 text-xs uppercase tracking-wider font-semibold">Designation</span>
                <span className="font-medium text-gray-700">{item.custom_designation_name || "-"}</span>
              </div>

            </div>

            {item.status === "Inactive" && expandedRows.includes(item.name) && (
              <div className="mt-4 border-t border-gray-100 pt-4">
                <SeparationDetailsView employeeId={item.employee} />
              </div>
            )}
          </div>

        );
      })}
    </div>
    )}

      {selectedRowEmployee && (
        <>
          <ChangeWeekOff
            isOpen={activeTool === 'week_off'}
            onClose={() => {
              setActiveTool(null);
              setSelectedRowEmployee(null);
            }}
            current_week_off={selectedRowEmployee.custom_weekly_off as string}
            employee_id={selectedRowEmployee.employee}
          />
          <ChangeSelfServiceStatus
            isOpen={activeTool === 'self_service'}
            onClose={() => {
              setActiveTool(null);
              setSelectedRowEmployee(null);
            }}
            employeeId={selectedRowEmployee.employee}
          />
          <ResetPassword
            isOpen={activeTool === 'password'}
            onClose={() => {
              setActiveTool(null);
              setSelectedRowEmployee(null);
            }}
            employeeId={selectedRowEmployee.employee}
          />
          <ResetOtpLimit
            isOpen={activeTool === 'otp_limit'}
            onClose={() => {
              setActiveTool(null);
              setSelectedRowEmployee(null);
            }}
            userId={selectedRowEmployee.user_id!}
          />
          <PlatformAccessControls
            isOpen={activeTool === 'platform_access'}
            onClose={() => {
              setActiveTool(null);
              setSelectedRowEmployee(null);
            }}
            employeeId={selectedRowEmployee.employee}
          />
          <UndoDeactivation
            isOpen={activeTool === 'undo_deactivation'}
            onClose={() => {
              setActiveTool(null);
              setSelectedRowEmployee(null);
            }}
            employeeId={selectedRowEmployee.employee}
          />
          <ActivateEmployee
            isOpen={activeTool === 'activate'}
            onClose={() => {
              setActiveTool(null);
              setSelectedRowEmployee(null);
            }}
            employeeId={selectedRowEmployee.employee}
            employeeName={selectedRowEmployee.employee_name}
          />
        </>
      )}
    </>
  );
};

export default EmployeeTable;
