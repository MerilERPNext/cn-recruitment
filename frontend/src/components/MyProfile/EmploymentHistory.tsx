import React from "react";
import { Typography } from "../shared/atoms/Typography";
import EmploymentHistoryCard from "./EmploymentHistoryCard";
import Button from "../shared/atoms/Button";
import { PlusIcon } from "lucide-react";
import EmploymentHistoryForm from "./EmploymentHistorForm";
import { useGetUiPermission } from "../../hooks/userUiPermission";
import { isActionEnabled } from "../../utils/uiPermission";
import { useGetEmploymentHistoryData } from "../../hooks/useEmployee";
import { WorkRole } from "../../types/employee";

interface EmploymentHistoryProps {
  employeeId: string | undefined;
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
}) => {
  const { data, isLoading, error } = useGetEmploymentHistoryData(employeeId || "")
  const history = data?.work_roles || [];
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
  const canAddEmploymentHistory = isActionEnabled(
    userUiPermission,
    "add_employee_history",
    "Employee Profile",
  );

  const [isModalOpen, setIsModalOpen] = React.useState<boolean>(false);
  const [isEditing, setIsEditing] = React.useState<boolean>(false);
  const [editItem, setEditItem] = React.useState<WorkRole | null>(null);

  const handleEditCard = (item: WorkRole) => {
    setEditItem(item);
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setIsEditing(false);
    setEditItem(null);
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
          <div className="flex">
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
          </div>
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

        <div className="flex gap-2 overflow-auto">
          {history.map((item) => (
            <div
              key={item.from_date + item.designation}
              className={`${history.length === 1 ? "max-w-md w-full" : ""
                }`}
            >
              <EmploymentHistoryCard
                company={item.company?.name}
                department={item.department?.name}
                band={item.band?.name}
                grade={item.grade?.name}
                start_date={item.from_date}
                end_date={item.to_date}
                isCurrent={item.is_current}
                functionalArea={item.functional_area?.name}
                is_promotion={item.is_promotion}
                onEdit={canEditEmploymentHistory ? () => handleEditCard(item) : undefined}
              />
            </div>
          ))}
        </div>
      </div>
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <EmploymentHistoryForm
              key={editItem ? `${editItem.from_date}-${editItem.designation?.id}` : "add"}
              onCancel={handleCloseModal}
              isEdit={isEditing}
              defaultStartDate={defaultStartDateForAdd}
              initialEditData={editItem ? {
                company: editItem.company?.id,
                department: editItem.department?.id,
                designation: editItem.designation?.id,
                functional_area: editItem.functional_area?.id,
                start_date: editItem.from_date,
                is_promotion: editItem.is_promotion,
              } : undefined}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default EmploymentHistory;
