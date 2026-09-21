import React, { useState, useMemo, useEffect } from "react";
import { Sparkles } from "lucide-react";

import {
  useCurrentEmployeeDetails,
  useEmployee,
} from "../../../../hooks/useEmployee";
import { useCurrentUser, isAdminUser } from "../../../../hooks/useCurrentUser";
import { useTargetUser } from "../../../../context/ViewedUserContext";
import { useGetUiPermission } from "../../../../hooks/userUiPermission";
import { isActionEnabled } from "../../../../utils/uiPermission";
import type { ActiveRepotreeTypes } from "../../../../services/pipService";

import { Typography } from "../../../shared/atoms/Typography";
import Avatar from "../../../shared/Avatar";
import NoDataFound from "../../../shared/atoms/NoDataFound";
import WrapperHoverCard from "../../../shared/WrapperHoverCard";
import { PipSerachEmployeeSection } from "./components/PipSerachEmployeeSection";
import { PIPCardsSection } from "./components/PIPCardsSection";

const PerformanceImprovementPlan: React.FC = () => {
  // Current user & admin check
  const { data: currentUser } = useCurrentUser();
  const isAdmin = isAdminUser(currentUser ?? null);

  // UI Permission check for HR Process -> Performance Improvement
  const { data: userUiPermission } = useGetUiPermission("HR Process");
  const canAdminAdminView = isActionEnabled(
    userUiPermission,
    "admin_admin_view",
    "Performance Improvement"
  );
  const canAdminManagerView = isActionEnabled(
    userUiPermission,
    "admin_manager_view",
    "Performance Improvement"
  );

  // Current user & target user context
  const { isViewingOtherUser, targetEmployeeId } = useTargetUser();
  const { data: currentEmployee, isLoading: isEmployeeLoading } =
    useCurrentEmployeeDetails({ logged_in_employee_details: true });
  const { data: targetEmployee } = useEmployee(
    isViewingOtherUser ? targetEmployeeId : null
  );

  const effectiveEmployee = isViewingOtherUser ? targetEmployee : currentEmployee;
  const effectiveEmployeeId = isViewingOtherUser
    ? targetEmployeeId || ""
    : currentEmployee?.name || "";
  const effectiveEmployeeName =
    effectiveEmployee?.employee_name || effectiveEmployee?.name || "You";

  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [employeeList, setEmployeeList] = useState<ActiveRepotreeTypes[]>([]);
  const [viewMode, setViewMode] = useState<"admin" | "manager">("admin");

  // Keep viewMode synced with available permissions
  useEffect(() => {
    if (isAdmin && !isViewingOtherUser) {
      if (canAdminAdminView && !canAdminManagerView) {
        setViewMode("admin");
      } else if (!canAdminAdminView && canAdminManagerView) {
        setViewMode("manager");
      }
    }
  }, [isAdmin, isViewingOtherUser, canAdminAdminView, canAdminManagerView]);

  const isAllEmployeesMode =
    isAdmin &&
    !isViewingOtherUser &&
    canAdminAdminView &&
    (viewMode === "admin" || !canAdminManagerView);

  // Derive active selected employee
  const selectedEmployee: ActiveRepotreeTypes | undefined = useMemo(() => {
    if (!employeeList || employeeList.length === 0) return undefined;
    if (selectedEmployeeId) {
      const found = employeeList.find((emp) => emp.name === selectedEmployeeId);
      if (found) return found;
    }
    return employeeList[0];
  }, [employeeList, selectedEmployeeId]);

  return (
    <div className="w-full p-4 md:p-6 space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-200 pb-4">
        <div className="flex flex-col">
          <Typography variant="h4">Performance Improvement (PIP)</Typography>
          <Typography variant="bodySmall" color="body2">
            Track, initiate, and monitor Performance Improvement Plans for{" "}
            {isAllEmployeesMode ? "active employees" : "your active reportees"}.
          </Typography>
        </div>
        <div className="flex items-center gap-2">
          <Typography
            variant="caption"
            className="inline-flex items-center gap-1.5 font-semibold px-3 py-1.5 rounded-xl bg-primary-50 text-primary-700 border border-primary-200 shadow-2xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-primary-600" />
            {isAllEmployeesMode ? "All Active Employees" : "Active Reportees Only"}
          </Typography>
        </div>
      </div>

      {/* Main Layout: Left Sidebar + Right Details Panel */}
      <div className="w-full flex flex-col lg:flex-row gap-6 items-start">
        {/* Left Column: Searchable & Scrollable Employees Sidebar */}
        <PipSerachEmployeeSection
          selectedEmployeeId={selectedEmployee?.name || selectedEmployeeId}
          onSelectEmployeeId={setSelectedEmployeeId}
          isAdmin={isAdmin}
          isViewingOtherUser={isViewingOtherUser}
          targetEmployeeId={targetEmployeeId}
          currentEmployeeId={currentEmployee?.name}
          isEmployeeLoading={isEmployeeLoading}
          onEmployeesLoaded={setEmployeeList}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          canAdminAdminView={canAdminAdminView}
          canAdminManagerView={canAdminManagerView}
        />

        {/* Right Column: Selected Employee Details & PIP Cards */}
        <main className="flex-1 w-full space-y-6">
          {!selectedEmployee ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-12 shadow-xs flex flex-col items-center justify-center text-center min-h-[350px]">
              <NoDataFound
                title="No Employee Selected"
                subtitle={
                  isAllEmployeesMode
                    ? "Select an active employee from the left list to view or initiate their Performance Improvement Plan."
                    : "Select an active reportee from the left list to view or initiate their Performance Improvement Plan."
                }
              />
            </div>
          ) : (
            <>
              {/* Selected Employee Info Banner */}
              <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <Avatar
                    src={selectedEmployee.image || undefined}
                    name={selectedEmployee.employee_name || selectedEmployee.name}
                    size="h-14 w-14"
                    fontSize="text-xl"
                  />
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <WrapperHoverCard employeeId={selectedEmployee.name}>
                        <div className="cursor-pointer hover:opacity-80 transition-opacity">
                          <Typography variant="h4" className="text-gray-900">
                            {selectedEmployee.employee_name || selectedEmployee.name}
                          </Typography>
                        </div>
                      </WrapperHoverCard>
                      <Typography
                        variant="caption"
                        className="px-2.5 py-0.5 text-[11px] font-semibold rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200"
                      >
                        {selectedEmployee.status || "Active"}
                      </Typography>
                    </div>
                    <Typography
                      variant="caption"
                      className="text-gray-600 mt-1 flex items-center gap-2 flex-wrap"
                    >
                      <Typography variant="caption" className="font-semibold text-gray-800">
                        {selectedEmployee.custom_designation_title ||
                          selectedEmployee.designation_name ||
                          selectedEmployee.designation ||
                          "—"}
                      </Typography>
                      {selectedEmployee.department_name && (
                        <>
                          <Typography variant="caption">&bull;</Typography>
                          <Typography variant="caption">
                            {selectedEmployee.department_name}
                          </Typography>
                        </>
                      )}
                      {selectedEmployee.company_name && (
                        <>
                          <Typography variant="caption">&bull;</Typography>
                          <Typography variant="caption">
                            {selectedEmployee.company_name}
                          </Typography>
                        </>
                      )}
                      <Typography variant="caption">&bull;</Typography>
                      <WrapperHoverCard employeeId={selectedEmployee.name}>
                        <Typography
                          variant="caption"
                          className="text-gray-500 cursor-pointer hover:underline"
                        >
                          {selectedEmployee.name}
                        </Typography>
                      </WrapperHoverCard>
                    </Typography>
                  </div>
                </div>

                <div className="font-medium text-gray-600 bg-gray-50/80 px-3.5 py-2 rounded-xl border border-gray-200 self-start sm:self-center flex items-center gap-1.5 text-xs flex-wrap">
                  <Typography variant="caption" className="font-medium text-gray-600">
                    Reporting To:
                  </Typography>
                  {isAllEmployeesMode ? (
                    selectedEmployee.reports_to ? (
                      <WrapperHoverCard employeeId={selectedEmployee.reports_to}>
                        <span className="cursor-pointer hover:opacity-80 transition-opacity inline-flex items-center gap-1">
                          <strong className="text-gray-900 font-bold">
                            {selectedEmployee.reports_to}
                          </strong>
                        </span>
                      </WrapperHoverCard>
                    ) : (
                      <strong className="text-gray-900 font-bold">—</strong>
                    )
                  ) : effectiveEmployeeId ? (
                    <WrapperHoverCard employeeId={effectiveEmployeeId}>
                      <span className="cursor-pointer hover:opacity-80 transition-opacity inline-flex items-center gap-1">
                        <strong className="text-gray-900 font-bold">
                          {effectiveEmployeeName}
                        </strong>
                        <span className="text-gray-500 font-semibold text-[11px]">
                          ({effectiveEmployeeId})
                        </span>
                      </span>
                    </WrapperHoverCard>
                  ) : (
                    <strong className="text-gray-900 font-bold">You</strong>
                  )}
                </div>
              </div>

              {/* PIP Cards Section */}
              <PIPCardsSection
                employeeId={selectedEmployee.name}
                employeeName={
                  selectedEmployee.employee_name || selectedEmployee.name
                }
              />
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default PerformanceImprovementPlan;
