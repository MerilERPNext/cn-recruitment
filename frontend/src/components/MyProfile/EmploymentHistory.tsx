import React from "react";
import { Typography } from "../shared/atoms/Typography";
import Button from "../shared/atoms/Button";
import { PlusIcon } from "lucide-react";
import { useGetUiPermission } from "../../hooks/userUiPermission";
import { isActionEnabled } from "../../utils/uiPermission";
import { useDeleteEmpReportingDetailsRecordMutation, useDeleteEmployeeCostCenterRecordsMutation, useDeleteEmployeeHistoryRecordsMutation, useGetEmployeePreviousDetails, useGetEmploymentHistoryData } from "../../hooks/useEmployee";
import { EmployeeCostCenter, EmployeePreviousDetailNode, EmployeeRole, EmploymentTypes, WorkLocation, WorkRole } from "../../types/employee";
import EmployeePreviousJoiningCard from "./EmploymentHistoryCards/EmployeePreviousJoiningCard";
import EmploymentWorkLocationCard from "./EmploymentHistoryCards/EmploymentWorkLocationsCard";
import EmploymentHistoryCard from "./EmploymentHistoryCards/EmploymentHistoryCard";
import EmploymentTypesCard from "./EmploymentHistoryCards/EmploymentTypesCard";
import EmployeeRolesCard from "./EmploymentHistoryCards/EmployeeRolesCard";
import EmployeeCostCenterCard from "./EmploymentHistoryCards/EmployeeCostCenterCard";
import CostCenterForm from "./EmploymentHistoryForms/CostCenterForm";
import WorkLocationForm from "./EmploymentHistoryForms/WorkLocationForm";
import EmploymentHistoryForm from "./EmploymentHistoryForms/EmploymentHistorForm";
import EmploymentTypeForm from "./EmploymentHistoryForms/EmploymentTypeForm";
import EmployeeRoleForm from "./EmploymentHistoryForms/EmployeeRoleForm";
import EmploymentSegmentsCard from "./EmploymentHistoryCards/EmploymentSegmentsCard";
import NoDataFound from "../shared/atoms/NoDataFound";
import ConfirmationModal from "../shared/atoms/ConfirmationModal";
import { useLoadingOverlay } from "../../context/OverlayContext";
import toast from "react-hot-toast";

interface EmploymentHistoryProps {
  employeeId: string | undefined;
  onActionSuccess?: (subSectionId?: string) => void;
}

export interface CustomWorkHistory {
  doctype_name: string;
  field_label: string;
  records: string;
  start_date: string | null;
  end_date: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export interface Employee {
  name: string;
  date_of_joining?: string;
  custom_work_history?: CustomWorkHistory[];
  work_roles?: WorkRole[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

const EmploymentHistory: React.FC<EmploymentHistoryProps> = ({
  employeeId,
  onActionSuccess,
}) => {
  const { data, isLoading, error } = useGetEmploymentHistoryData(employeeId || "")
  const { data: employeePreviousDetails } = useGetEmployeePreviousDetails(employeeId || "")

  const flattenPreviousJoiningHistory = (
    node: EmployeePreviousDetailNode | null,
  ): EmployeePreviousDetailNode[] => {
    if (!node) return [];
    return [node, ...flattenPreviousJoiningHistory(node.previous)];
  };

  const previousJoiningHistory = flattenPreviousJoiningHistory(
    employeePreviousDetails?.tree || null,
  );

  const history = data?.work_roles || [];
  const workLocation = data?.work_locations || [];
  const employmentTypes = data?.employment_types || [];
  const employeeRoles = data?.employee_roles || [];
  const costCenters = data?.cost_centers || [];
  const segmentTotals = costCenters.map(item =>
    Object.fromEntries(
      Object.entries(item).filter(([key]) => key !== 'allocations')
    )
  );

  const hasEmploymentHistory = history.length > 0;

  const defaultStartDateForAdd = !hasEmploymentHistory
    ? data?.date_of_joining
    : new Date().toISOString();
  const { data: userUiPermission } = useGetUiPermission("Profile");
  const canEditEmploymentHistory = isActionEnabled(
    userUiPermission,
    "edit_employee_history",
    "Employee Profile",
  );
  const canDeleteEmploymentHistory = isActionEnabled(
    userUiPermission,
    "show_delete_employment_history",
    "Employee Profile",
  );
  const canAddEmploymentHistory = isActionEnabled(
    userUiPermission,
    "add_employee_history",
    "Employee Profile",
  );

  const { mutateAsync: deleteRecord, isPending: isDeleting } = useDeleteEmpReportingDetailsRecordMutation();
  const { mutateAsync: deleteHistoryRecords, isPending: isDeletingHistory } = useDeleteEmployeeHistoryRecordsMutation();
  const { mutateAsync: deleteCostCenterRecords, isPending: isDeletingCostCenter } = useDeleteEmployeeCostCenterRecordsMutation();
  const isProcessingHistoryDelete = isDeletingHistory || isDeletingCostCenter;
  const { wrap } = useLoadingOverlay();

  type PendingDelete =
    | { type: "history"; names: string[]; subSection: string }
    | { type: "cost_center"; names: string[]; subSection: string };

  const [pendingDelete, setPendingDelete] = React.useState<PendingDelete | null>(null);
  const [pendingDeleteName, setPendingDeleteName] = React.useState<string | null>(null);

  const handleDeleteConfirm = async () => {
    if (!pendingDeleteName) return;
    try {
      await wrap(() => deleteRecord(pendingDeleteName), "Deleting record...");
      setPendingDeleteName(null);
      onActionSuccess?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong. Please try again.";
      toast.error(message);
    }
  };

  const handleHistoryDeleteConfirm = async () => {
    if (!pendingDelete) return;
    try {
      if (pendingDelete.type === "cost_center") {
        await wrap(() => deleteCostCenterRecords(pendingDelete.names), "Deleting record...");
      } else {
        await wrap(() => deleteHistoryRecords(pendingDelete.names), "Deleting record...");
      }
      const subSection = pendingDelete.subSection;
      setPendingDelete(null);
      onActionSuccess?.(subSection);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong. Please try again.";
      toast.error(message);
    }
  };

  const collectRowNames = (obj: Record<string, unknown>): string[] =>
    Object.values(obj)
      .filter((v): v is { row_name: string } => !!v && typeof v === "object" && "row_name" in v && typeof (v as Record<string, unknown>).row_name === "string")
      .map((v) => v.row_name);

  const [isModalOpen, setIsModalOpen] = React.useState<boolean>(false);
  const [isEditing, setIsEditing] = React.useState<boolean>(false);
  const [editItem, setEditItem] = React.useState<WorkRole | WorkLocation | EmploymentTypes | EmployeeRole | EmployeeCostCenter | null>(null);
  const [editType, setEditType] = React.useState<"work_role" | "work_location" | "employment_type" | "employee_role" | "cost_center">("work_role");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleEditCard = (item: any, type: "work_role" | "work_location" | "employment_type" | "employee_role" | "cost_center" = "work_role") => {
    setEditItem(item);
    setEditType(type);
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const handleAddCard = (type: "work_role" | "work_location" | "employment_type" | "employee_role" | "cost_center") => {
    setEditItem(null);
    setEditType(type);
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setIsEditing(false);
    setEditItem(null);
  };

  const handleFormSuccess = () => {
    const subSection = editType;
    handleCloseModal();
    onActionSuccess?.(subSection);
  };

  return (
    <div className="address-form-container bg-white rounded-md">
      <div className="px-0 md:px-6 py-2 md:p-8">
        <div className="flex items-start justify-between border-b border-gray-200 pb-2 mb-4 md:pb-4 md:mb-8 rounded-md ">
          <div>
            <Typography variant="h4" className="font-bold text-gray-900 mb-2 text-xl sm:text-2xl">
              Employment History
            </Typography>
            <Typography variant="bodyMedium" color="body2" className="max-sm:text-sm">
              Your employment history and organizational information
            </Typography>
          </div>
          {/* <div className="flex">
            {canAddEmploymentHistory && (
              <Button
                onClick={() => setIsModalOpen(true)}
                icon={<PlusIcon className="h-4 w-4" />}
                variant="contain"
                size="md"
              >
                Add
              </Button>
            )}
          </div> */}
        </div>
        {!employeeId && (
          <p className="p-4 text-gray-500">No employee selected</p>
        )}

        {isLoading && (
          <div className="space-y-8">
            {[1, 2].map((section) => (
              <div key={section}>
                <div className="h-5 w-32 bg-gray-200 rounded mb-4 animate-pulse" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[1, 2, 3].map((card) => (
                    <div
                      key={card}
                      className="bg-white rounded-xl shadow-sm border p-6 animate-pulse"
                    >
                      <div className="h-5 w-24 bg-gray-200 rounded mb-4" />
                      <div className="h-4 w-20 bg-gray-100 rounded mb-2" />
                      <div className="h-4 w-28 bg-gray-100 rounded mb-2" />
                      <div className="h-4 w-24 bg-gray-100 rounded" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {error && (
          <p className="p-4 text-red-500">Failed to load employment history</p>
        )}
        {!isLoading && !error && employeeId && (
          <>
            <div className="flex flex-col gap-2" data-subsection="work_role">
              <div className="flex items-center justify-between">
                <Typography variant="h4" className="font-bold text-gray-900 text-lg">
                  Work History
                </Typography>
                {canAddEmploymentHistory && (
                  <Button onClick={() => handleAddCard("work_role")} icon={<PlusIcon className="h-4 w-4" />} variant="contain" size="md">
                    Add
                  </Button>
                )}
              </div>
              {history.length > 0 ? (
                <div className="flex gap-2 overflow-auto">
                  {history.map((item) => (
                    <div
                      key={item?.from_date + item?.designation?.id}
                      className={`${history.length === 1 ? "max-w-md w-full" : ""}`}
                    >
                      <EmploymentHistoryCard
                        company={item.company?.name || ""}
                        department={item.department?.name || ""}
                        band={item.band?.name || ""}
                        grade={item.grade?.name || ""}
                        start_date={item.from_date}
                        end_date={item.to_date}
                        isCurrent={item.is_current}
                        functionalArea={item?.functional_area?.name || ""}
                        is_promotion={item.is_promotion}
                        onEdit={canEditEmploymentHistory ? () => handleEditCard(item) : undefined}
                        onDelete={canDeleteEmploymentHistory && item.can_delete ? () => setPendingDelete({ type: "history", names: collectRowNames(item as unknown as Record<string, unknown>), subSection: "work_role" }) : undefined}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <NoDataFound title="No Work History" subtitle="No work history records have been added yet." />
              )}
            </div>

            <div className="flex flex-col gap-2 mt-6" data-subsection="work_location">
              <div className="flex items-center justify-between">
                <Typography variant="h4" className="font-bold text-gray-900 text-lg">
                  Work Locations
                </Typography>
                {canAddEmploymentHistory && (
                  <Button onClick={() => handleAddCard("work_location")} icon={<PlusIcon className="h-4 w-4" />} variant="contain" size="md">
                    Add
                  </Button>
                )}
              </div>
              {workLocation.length > 0 ? (
                <div className="flex gap-2 overflow-auto">
                  {workLocation.map((item) => (
                    <div
                      key={item.from_date + item?.to_date}
                      className={`${workLocation.length === 1 ? "max-w-md w-full" : ""}`}
                    >
                      <EmploymentWorkLocationCard
                        from_date={item.from_date}
                        to_date={item.to_date}
                        is_current={item.is_current}
                        work_location={item.work_location}
                        office_area={item.office_area}
                        country={item.country}
                        state={item.state}
                        city={item.city}
                        onEdit={canEditEmploymentHistory ? () => handleEditCard(item, "work_location") : undefined}
                        onDelete={canDeleteEmploymentHistory && item.can_delete ? () => {
                          const names = [item.work_location?.row_name].filter(Boolean) as string[];
                          setPendingDelete({ type: "history", names, subSection: "work_location" });
                        } : undefined}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <NoDataFound title="No Work Locations" subtitle="No work location records have been added yet." />
              )}
            </div>

            <div className="flex flex-col gap-2 mt-6" data-subsection="employment_type">
              <div className="flex items-center justify-between">
                <Typography variant="h4" className="font-bold text-gray-900 text-lg">
                  Employment Type
                </Typography>
                {canAddEmploymentHistory && (
                  <Button onClick={() => handleAddCard("employment_type")} icon={<PlusIcon className="h-4 w-4" />} variant="contain" size="md">
                    Add
                  </Button>
                )}
              </div>
              {employmentTypes.length > 0 ? (
                <div className="flex gap-2 overflow-auto">
                  {employmentTypes.map((item) => (
                    <div
                      key={item.from_date + item?.to_date}
                      className={`${employmentTypes.length === 1 ? "max-w-md w-full" : ""}`}
                    >
                      <EmploymentTypesCard
                        from_date={item.from_date}
                        to_date={item.to_date}
                        is_current={item.is_current}
                        is_promotion={item.is_promotion}
                        employment_type={item.employment_type}
                        employee_subtype={item.employee_subtype}
                        onEdit={canEditEmploymentHistory ? () => handleEditCard(item, "employment_type") : undefined}
                        onDelete={canDeleteEmploymentHistory && item.can_delete ? () => {
                          const names = [item.employment_type?.row_name, item.employee_subtype?.row_name].filter(Boolean) as string[];
                          setPendingDelete({ type: "history", names, subSection: "employment_type" });
                        } : undefined}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <NoDataFound title="No Employment Types" subtitle="No employment type records have been added yet." />
              )}
            </div>

            <div className="flex flex-col gap-2 mt-6" data-subsection="employee_role">
              <div className="flex items-center justify-between">
                <Typography variant="h4" className="font-bold text-gray-900 text-lg">
                  Employment Roles
                </Typography>
                {canAddEmploymentHistory && (
                  <Button onClick={() => handleAddCard("employee_role")} icon={<PlusIcon className="h-4 w-4" />} variant="contain" size="md">
                    Add
                  </Button>
                )}
              </div>
              {employeeRoles.length > 0 ? (
                <div className="flex gap-2 overflow-auto">
                  {employeeRoles.map((item) => (
                    <div
                      key={item.from_date + item?.to_date}
                      className={`${employeeRoles.length === 1 ? "max-w-md w-full" : ""}`}
                    >
                      <EmployeeRolesCard
                        from_date={item.from_date}
                        to_date={item.to_date}
                        is_current={item.is_current}
                        is_promotion={item.is_promotion}
                        employee_role={item.employee_role}
                        onEdit={canEditEmploymentHistory ? () => handleEditCard(item, "employee_role") : undefined}
                        onDelete={canDeleteEmploymentHistory && item.can_delete ? () => {
                          const names = [item.employee_role?.row_name].filter(Boolean) as string[];
                          setPendingDelete({ type: "history", names, subSection: "employee_role" });
                        } : undefined}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <NoDataFound title="No Employment Roles" subtitle="No employment role records have been added yet." />
              )}
            </div>

            <div className="flex flex-col gap-2 mt-6" data-subsection="cost_center">
              <div className="flex items-center justify-between">
                <Typography variant="h4" className="font-bold text-gray-900 text-lg">
                  Cost Center
                </Typography>
                {canAddEmploymentHistory && (
                  <Button onClick={() => handleAddCard("cost_center")} icon={<PlusIcon className="h-4 w-4" />} variant="contain" size="md">
                    Add
                  </Button>
                )}
              </div>
              {costCenters.length > 0 ? (
                <div className="flex gap-2 overflow-auto">
                  {costCenters.map((item) => (
                    <div
                      key={item.from_date}
                      className={`${costCenters.length === 1 ? "max-w-md w-full" : ""}`}
                    >
                      <EmployeeCostCenterCard
                        allocations={item.allocations}
                        from_date={item.from_date}
                        to_date={item.to_date}
                        is_current={item.is_current}
                        onEdit={canEditEmploymentHistory ? () => handleEditCard(item, "cost_center") : undefined}
                        onDelete={canDeleteEmploymentHistory && item.can_delete ? () => {
                          const names = item.allocations.map((a) => a.row_name).filter(Boolean) as string[];
                          setPendingDelete({ type: "cost_center", names, subSection: "cost_center" });
                        } : undefined}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <NoDataFound title="No Cost Centers" subtitle="No cost center records have been added yet." />
              )}
            </div>

            <div className="flex flex-col gap-2 mt-6">
              <div className="flex items-center justify-between">
                <Typography variant="h4" className="font-bold text-gray-900 text-lg">
                  Segments
                </Typography>
              </div>
              {segmentTotals.length > 0 ? (
                <div className="flex gap-2 overflow-auto">
                  {segmentTotals.map((item) => (
                    <div
                      key={item.from_date}
                      className={`${segmentTotals.length === 1 ? "max-w-md w-full" : ""}`}
                    >
                      <EmploymentSegmentsCard
                        from_date={item.from_date}
                        to_date={item.to_date}
                        is_current={item.is_current}
                        segment_totals={item.segment_totals}
                        total_percentage={item.total_percentage}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <NoDataFound title="No Segments" subtitle="No segment records have been added yet." />
              )}
            </div>

            {/* <div className="flex flex-col gap-2 mt-6">
              <div className="flex items-center justify-between">
                <Typography variant="h4" className="font-bold text-gray-900 text-lg">
                  Compensation Details
                </Typography>
              </div>
              {salaryStructureData?.assignments && salaryStructureData.assignments.length > 0 ? (
                <div className="flex gap-2 overflow-auto">
                  {salaryStructureData.assignments.map((item) => (
                    <div
                      key={item.name}
                      className={`${salaryStructureData.assignments.length === 1 ? "max-w-md w-full" : ""}`}
                    >
                      <CompensationDetailsCard assignment={{
                        name: item.name,
                        salary_structure: item.salary_structure,
                        from_date: item.from_date,
                        base: item.base,
                        currency: item.currency,
                        company: item.company,
                        docstatus: 0

                      }} />
                    </div>
                  ))}
                </div>
              ) : (
                <NoDataFound title="No Compensation Details" subtitle="No salary structure assignments found." />
              )}
            </div> */}

            <div className="flex flex-col gap-2 mt-6">
              <div className="flex items-center justify-between">
                <Typography variant="h4" className="font-bold text-gray-900 text-lg">
                  Employee Joining History
                </Typography>
              </div>
              {previousJoiningHistory.length > 0 ? (
                <div className="flex gap-2 overflow-auto">
                  {previousJoiningHistory.map((item) => (
                    <div
                      key={item.employee + item.date_of_joining}
                      className={`${previousJoiningHistory.length === 1 ? "max-w-md w-full" : ""}`}
                    >
                      <EmployeePreviousJoiningCard
                        employee={item.employee}
                        employee_name={item.employee_name}
                        designation={item.designation}
                        company_name={item.company_name}
                        department_name={item.department_name}
                        location_name={item.location_name}
                        date_of_joining={item.date_of_joining}
                        relieving_date={item.relieving_date}
                        current_employee_joining_date={data?.date_of_joining || null}
                        image={item?.image}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <NoDataFound title="No Employee Joining History" subtitle="No employee joining history records found." />
              )}
            </div>
          </>
        )}

      </div>
      {isModalOpen && editType === "work_location" && (
        <WorkLocationForm
          key={editItem ? `wl-${editItem.from_date}` : "add-wl"}
          onCancel={handleCloseModal}
          onSuccess={handleFormSuccess}
          isEdit={isEditing}
          defaultStartDate={defaultStartDateForAdd}
          initialEditData={editItem ? {
            work_location: (editItem as WorkLocation).work_location?.id || "",
            start_date: editItem.from_date,
            end_date: editItem.to_date,
          } : undefined}
        />
      )}
      {isModalOpen && editType === "work_role" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <EmploymentHistoryForm
              key={editItem ? `${editItem.from_date}-${(editItem as WorkRole).designation?.id}` : "add"}
              onCancel={handleCloseModal}
              onSuccess={handleFormSuccess}
              isEdit={isEditing}
              defaultStartDate={defaultStartDateForAdd}
              initialEditData={editItem ? {
                company: (editItem as WorkRole).company?.id || "",
                department: (editItem as WorkRole).department?.id || "",
                designation: (editItem as WorkRole).designation?.id || "",
                functional_area: (editItem as WorkRole).functional_area?.id || "",
                start_date: editItem.from_date,
                end_date: editItem.to_date,
                is_promotion: (editItem as WorkRole).is_promotion,
              } : undefined}
            />
          </div>
        </div>
      )}
      {isModalOpen && editType === "employment_type" && (
        <EmploymentTypeForm
          key={editItem ? `et-${editItem.from_date}` : "add-et"}
          onCancel={handleCloseModal}
          onSuccess={handleFormSuccess}
          isEdit={isEditing}
          defaultStartDate={defaultStartDateForAdd}
          initialEditData={editItem ? {
            employment_type: (editItem as unknown as EmploymentTypes).employment_type?.id || "",
            employee_subtype: (editItem as unknown as EmploymentTypes).employee_subtype?.id || "",
            start_date: editItem.from_date,
            end_date: editItem.to_date,
          } : undefined}
        />
      )}
      {isModalOpen && editType === "employee_role" && (
        <EmployeeRoleForm
          key={editItem ? `er-${editItem.from_date}` : "add-er"}
          onCancel={handleCloseModal}
          onSuccess={handleFormSuccess}
          isEdit={isEditing}
          defaultStartDate={defaultStartDateForAdd}
          initialEditData={editItem ? {
            employee_role: (editItem as unknown as EmployeeRole).employee_role?.id || "",
            start_date: editItem.from_date,
          } : undefined}
        />
      )}
      {isModalOpen && editType === "cost_center" && (
        <CostCenterForm
          key={editItem ? `cc-${editItem.from_date}` : "add-cc"}
          onCancel={handleCloseModal}
          onSuccess={handleFormSuccess}
          isEdit={isEditing}
          defaultStartDate={defaultStartDateForAdd}
          initialEditData={editItem ? {
            allocations: (editItem as unknown as EmployeeCostCenter).allocations.map((a) => ({
              cost_center_id: a.cost_center.id,
              percentage: a.percentage,
            })),
            start_date: editItem.from_date,
            end_date: (editItem as unknown as EmployeeCostCenter).to_date,
          } : undefined}
        />
      )}
      {pendingDeleteName && (
        <ConfirmationModal
          message="Are you sure you want to delete this work history record? This action cannot be undone."
          confirmLabel="Delete"
          cancelLabel="Cancel"
          isLoading={isDeleting}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setPendingDeleteName(null)}
        />
      )}
      {pendingDelete && (
        <ConfirmationModal
          message="Are you sure you want to delete this record? This action cannot be undone."
          confirmLabel="Delete"
          cancelLabel="Cancel"
          isLoading={isProcessingHistoryDelete}
          onConfirm={handleHistoryDeleteConfirm}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  );
};

export default EmploymentHistory;
