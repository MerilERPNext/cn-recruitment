import {
  useCurrentEmployeeAllDetails,
  useGetEmployeeHierarchyHistory,
} from "../../hooks/useEmployee";
import useCurrentUser from "../../hooks/useCurrentUser";
import CircularLoader from "../shared/atoms/CircularLoader";
import Button from "../shared/atoms/Button";
import { EditIcon, PlusIcon } from "lucide-react";
import React from "react";
import { Building2 } from "lucide-react";
import { useState } from "react";
import ReportingDetailsForm from "../MyProfile/ReportingDetailsForm";
import { useGetUiPermission } from "../../hooks/userUiPermission";
import { isActionEnabled } from "../../utils/uiPermission";
import formatToIndianDate from "../../utils/formatToIndianDate";

const ReportingDetails = () => {
  const { data: currentUser } = useCurrentUser();
  const { data: currentEmployee } = useCurrentEmployeeAllDetails(
    currentUser?.name || "",
  );

  const { data: hierarchyData, isLoading: employeeHierarchyHistoryPending } =
    useGetEmployeeHierarchyHistory(currentEmployee?.employee || "");

  const { data: userUiPermission } = useGetUiPermission("Profile");
  const canEditReportingDetails = isActionEnabled(
    userUiPermission,
    "edit_reporting_details",
    "Employee Profile",
  );
  const canAddReportingDetails = isActionEnabled(
    userUiPermission,
    "add_reporting_details",
    "Employee Profile",
  );

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  const [isEditing, setIsEditing] = useState<boolean>(false);

  interface HierarchyCardProps {
    name: string;
    startDate: string;
    endDate: string | null;
  }

  const HierarchyCard: React.FC<HierarchyCardProps> = ({
    name,
    startDate,
    endDate,
  }) => {
    const isCurrent = !endDate;

    return (
      <div className="bg-white rounded-xl shadow-sm border p-6 relative hover-lift">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-blue-50 rounded-lg">
            <Building2 className="w-5 h-5 text-blue-600" />
          </div>
          <h3 className="font-medium text-gray-900 truncate">
            <span title={name}>{name}</span>
          </h3>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">Start Date</span>
            <span className="text-sm font-medium bg-gray-50 px-3 py-1 rounded-md">
              {formatToIndianDate(startDate)}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">End Date</span>
            <span
              style={{
                backgroundColor: isCurrent ? "#DCFCE7" : "#F9FAFB",
                color: isCurrent ? "#166534" : undefined,
              }}
              className="text-sm font-medium px-3 py-1 rounded-md"
            >
              {endDate ? formatToIndianDate(endDate) : "Present"}
            </span>
          </div>
        </div>
      </div>
    );
  };

  if (employeeHierarchyHistoryPending) {
    return <CircularLoader />;
  }

  const hierarchySections = hierarchyData?.data || {};

  const hasReportingHistory = Object.values(hierarchySections).some(
    (records: any) => Array.isArray(records) && records.length > 0,
  );

  const defaultStartDateForAdd = !hasReportingHistory
    ? currentEmployee?.date_of_joining
    : new Date().toISOString();
  return (
    <div className="address-form-container bg-white rounded-lg gray-200">
      <div className="p-4 md:p-8">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-gray-200 pb-4 mb-8">
          <div className="">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Reporting Details
            </h2>
            <p className="text-gray-600">
              Your reporting hierarchy information
            </p>
          </div>
          <div className="flex gap-2 ">
            {canEditReportingDetails && (
              <Button
                onClick={() => {
                  setIsModalOpen(true);
                  setIsEditing(true);
                }}
                icon={<EditIcon className="h-4 w-4" />}
                variant="subtle"
                size="md"
              >
                Edit
              </Button>
            )}
            {canAddReportingDetails && (
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

        {/* Hierarchy History Cards */}
        {Object.entries(hierarchySections).map(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ([sectionTitle, records]: any) => (
            <div key={sectionTitle} className="mb-10">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                {sectionTitle}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {records.map(
                  (item: {
                    records: string;
                    reporting_employee_name: string;
                    start_date: string;
                    end_date: string;
                  }) => (
                    <HierarchyCard
                      key={item.records}
                      name={item.reporting_employee_name}
                      startDate={item.start_date}
                      endDate={item.end_date}
                    />
                  ),
                )}
              </div>
            </div>
          ),
        )}
      </div>
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <ReportingDetailsForm
              onCancel={() => {
                setIsModalOpen(false);
                setIsEditing(false);
              }}
              isEdit={isEditing}
              defaultStartDate={defaultStartDateForAdd}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportingDetails;
