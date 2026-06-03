/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  useCurrentEmployeeDetails,
  useDeleteEmpReportingDetailsRecordMutation,
  useGetEmployeeHierarchyHistory,
} from "../../hooks/useEmployee";
import CircularLoader from "../shared/atoms/CircularLoader";
import Button from "../shared/atoms/Button";
import { EditIcon, ExternalLink, IdCard, MapPin, PlusIcon, TrashIcon, Warehouse } from "lucide-react";
import React from "react";
import { Building2 } from "lucide-react";
import { useState } from "react";
import { useGetUiPermission } from "../../hooks/userUiPermission";
import { isActionEnabled } from "../../utils/uiPermission";
import formatToIndianDate from "../../utils/formatToIndianDate";
import { Typography } from "../shared/atoms/Typography";
import { Link } from "react-router-dom";
import IconButton from "../shared/atoms/IconButton";
import ReportingDetailsFormV2 from "./ReportingDetailsFormV2/ReportingDetailsFormV2";
import ConfirmationModal from "../shared/atoms/ConfirmationModal";

const CATEGORY_FIELD_MAP: Record<string, string> = {
  "Reports To": "reports_to",
  "Manager": "reports_to",
  "Dotted Line Manager": "custom_dotted_line_manager",
  "HOD": "custom_hod",
  "CXO": "custom_cxo",
  "HRBP": "custom_hrbp",
};

const ReportingDetails = () => {
  const { data: currentEmployee } = useCurrentEmployeeDetails({ logged_in_employee_details: true });

  const { data: hierarchyData, isLoading: employeeHierarchyHistoryPending } =
    useGetEmployeeHierarchyHistory(currentEmployee?.employee || "");
  const { data: userUiPermission } = useGetUiPermission("Profile");
  const canEditReportingDetails = isActionEnabled(
    userUiPermission,
    "edit_reporting_details",
    "Employee Profile"
  );
  const canAddReportingDetails = isActionEnabled(
    userUiPermission,
    "add_reporting_details",
    "Employee Profile"
  );

  const { mutateAsync: deleteEmpReportingDetailsRecord, isPending: isDeleting } =
    useDeleteEmpReportingDetailsRecordMutation();

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedCategoryField, setSelectedCategoryField] = useState<string>("");
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const openAddModal = (category: string) => {
    setSelectedCategory(category);
    setSelectedCategoryField(CATEGORY_FIELD_MAP[category] || "reports_to");
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const openEditModal = (category: string) => {
    setSelectedCategory(category);
    setSelectedCategoryField(CATEGORY_FIELD_MAP[category] || "reports_to");
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setIsEditing(false);
    setSelectedCategory("");
    setSelectedCategoryField("");
  };

  const handleDeleteConfirm = async () => {
    if (!pendingDeleteId) return;
    await deleteEmpReportingDetailsRecord(pendingDeleteId);
    setPendingDeleteId(null);
  };

  interface HierarchyCardProps {
    name: string;
    startDate: string;
    endDate: string | null;
    department: string;
    id: string;
    location: string;
    onEdit?: () => void;
  }

  const HierarchyCard: React.FC<HierarchyCardProps> = ({
    name,
    startDate,
    endDate,
    department,
    id,
    location,
    onEdit,
  }) => {
    const isCurrent = !endDate;

    return (
      <div className="bg-white rounded-xl shadow-sm border p-6 relative hover-lift  max-w-[90vw] min-w-[90vw]  md:min-w-[400px] md:max-w-[400px]">
        <div className="flex items-start gap-3 mb-3 md:mb-6">
          <div className="p-2 bg-blue-50 rounded-lg">
            <Building2 className="w-5 h-5 text-blue-600" />
          </div>
          <div className="flex flex-col gap-1 flex-1">
            <div className="flex justify-between items-center">
              <Link to={`/webapp/employee-profile?target_user=${id}`} target="_blank">
                <Typography variant="bodyMedium" className="font-bold text-gray-900 truncate flex gap-1 items-center hover:text-primary">
                  <span>{name}</span><ExternalLink className="h-4 w-4" />
                </Typography>
              </Link>

              <div className="flex gap-1">
                {id && canEditReportingDetails && (
                  <IconButton
                    onClick={() => onEdit?.()}
                    icon={<EditIcon className="h-4 w-4" />}
                    className="cursor-pointer"
                    color="primary"
                    variant="subtle"
                    size="xs"
                  />
                )}
                {id && endDate && (
                  <IconButton
                    onClick={() => setPendingDeleteId(id)}
                    icon={<TrashIcon className="h-4 w-4" />}
                    className="cursor-pointer"
                    color="error"
                    variant="subtle"
                    size="xs"
                  />
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-4">
              {id && (
                <Typography
                  variant="label"
                  color="secondary"
                  className="font-medium truncate flex items-center gap-1.5"
                >
                  <IdCard size={14} className="text-primary-500" />
                  <span>{id}</span>
                </Typography>
              )}
              {department && (
                <Typography
                  variant="label"
                  color="secondary"
                  className="font-medium truncate flex items-center gap-1.5"
                >
                  <Warehouse size={14} className="text-primary-500" />
                  <span>{department}</span>
                </Typography>
              )}
              {location && (
                <Typography
                  variant="label"
                  color="secondary"
                  className="font-medium truncate flex items-center gap-1.5"
                >
                  <MapPin size={14} className="text-primary-500" />
                  <span>{location}</span>
                </Typography>
              )}
            </div>
          </div>
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
  return (
    <div className="address-form-container bg-white rounded-lg gray-200">
      <div className="px-0 py-3 md:p-6">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-gray-200 pb-2 mb-4 md:pb-4 md:mb-8">
          <div className="">
            <Typography variant="h4" className="font-bold text-gray-900 mb-2 text-xl sm:text-2xl">
              Reporting Details
            </Typography>
            <Typography variant="bodyMedium" color="body2" className="max-sm:text-sm">
              Your reporting hierarchy information
            </Typography>
          </div>
        </div>

        {/* Hierarchy History Cards */}
        {(() => {
          const sortedCategories = Object.keys(hierarchySections).sort((a, b) =>
            a.localeCompare(b)
          );

          return sortedCategories.map((category) => {
            const items = hierarchySections[category];
            const sortedItems = [...items].sort((a, b) => {
              const aIsCurrent = !a.end_date;
              const bIsCurrent = !b.end_date;
              if (aIsCurrent && !bIsCurrent) return -1;
              if (!aIsCurrent && bIsCurrent) return 1;
              const aDate = a.start_date ? new Date(a.start_date).getTime() : 0;
              const bDate = b.start_date ? new Date(b.start_date).getTime() : 0;
              return bDate - aDate;
            });

            return (
              <div key={category} className="mb-5 md:mb-10">
                <div className="flex items-center justify-between mb-4">
                  <Typography variant="h4" className="font-bold text-gray-900 text-lg">
                    {category}
                  </Typography>
                  {canAddReportingDetails && (
                    <Button
                      onClick={() => openAddModal(category)}
                      icon={<PlusIcon className="h-4 w-4" />}
                      variant="subtle"
                      size="sm"
                    >
                      Add
                    </Button>
                  )}
                </div>

                <div className="flex gap-2 overflow-auto">
                  {sortedItems.map((item: any) => (
                    <div
                      key={item.records}
                      className={`${sortedItems.length === 1 ? "max-w-md w-full" : ""}`}
                    >
                      <HierarchyCard
                        name={item.reporting_employee_name}
                        startDate={item.start_date}
                        endDate={item.end_date}
                        department={item.department_name}
                        id={item.records}
                        location={item.branch_name}
                        onEdit={() => openEditModal(category)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            );
          });
        })()}
      </div>

      {isModalOpen && (
        <ReportingDetailsFormV2
          onCancel={closeModal}
          isEdit={isEditing}
          category={selectedCategory}
          categoryField={selectedCategoryField}
        />
      )}

      {pendingDeleteId && (
        <ConfirmationModal
          message="Are you sure you want to delete this reporting details record? This action cannot be undone."
          confirmLabel="Delete"
          cancelLabel="Cancel"
          isLoading={isDeleting}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setPendingDeleteId(null)}
        />
      )}
    </div>
  );
};

export default ReportingDetails;
