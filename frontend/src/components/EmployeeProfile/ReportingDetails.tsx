/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  useCurrentEmployeeAllDetails,
  useGetEmployeeHierarchyHistory,
} from "../../hooks/useEmployee";
import useCurrentUser from "../../hooks/useCurrentUser";
import CircularLoader from "../shared/atoms/CircularLoader";
import Button from "../shared/atoms/Button";
import { EditIcon, ExternalLink, IdCard, MapPin, PlusIcon, Warehouse } from "lucide-react";
import React from "react";
import { Building2 } from "lucide-react";
import { useState } from "react";
import ReportingDetailsForm from "../MyProfile/ReportingDetailsForm";
import { useGetUiPermission } from "../../hooks/userUiPermission";
import { isActionEnabled } from "../../utils/uiPermission";
import formatToIndianDate from "../../utils/formatToIndianDate";
import { Typography } from "../shared/atoms/Typography";
import { Link } from "react-router-dom";

const ReportingDetails = () => {
  const { data: currentUser } = useCurrentUser();
  const { data: currentEmployee } = useCurrentEmployeeAllDetails({
    user_id: currentUser?.name || "",
    fields: ["employee", "date_of_joining"]
  });

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


  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  const [isEditing, setIsEditing] = useState<boolean>(false);


  interface HierarchyCardProps {
    name: string;
    startDate: string;
    endDate: string | null;
    department: string;
    id: string;
    location: string;
  }

  const HierarchyCard: React.FC<HierarchyCardProps> = ({
    name,
    startDate,
    endDate,
    department,
    id,
    location,
  }) => {

    const isCurrent = !endDate;

    return (
      <div className="bg-white rounded-xl shadow-sm border p-6 relative min-w-[450px] hover-lift">
        <div className="flex items-center gap-3 mb-3 md:mb-6">
          <div className="p-2 bg-blue-50 rounded-lg">
            <Building2 className="w-5 h-5 text-blue-600" />
          </div>
          <div className="flex flex-col gap-1">
            <Link to={`/webapp/employee-profile?target_user=${id}`} target="_blank">
              <Typography variant="bodyMedium" className="font-bold text-gray-900 truncate flex gap-1 items-center hover:text-primary">
                <span>{name}</span><ExternalLink className="h-4 w-4" />
              </Typography>
            </Link>
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
          <div className="flex gap-2 ">
            {canEditReportingDetails && <Button
              onClick={() => {
                setIsModalOpen(true)
                setIsEditing(true)
              }}
              icon={<EditIcon className="h-4 w-4" />}
              variant="subtle"
              size="md"
            >
              Edit
            </Button>}
            {canAddReportingDetails && <Button
              onClick={() => setIsModalOpen(true)}
              icon={<PlusIcon className="h-4 w-4" />}
              variant="contain"
              size="md"
            >
              Add
            </Button>}
          </div>
        </div>



        {/* Hierarchy History Cards */}
        {(() => {
          const joinDate = currentEmployee?.date_of_joining ? new Date(currentEmployee.date_of_joining).getTime() : null;

          const allRecords: any[] = [];
          Object.entries(hierarchySections).forEach(([category, records]: [string, any]) => {
            records.forEach((record: any) => {
              allRecords.push({ ...record, category });
            });
          });

          let overallClosestItem: any = null;
          let overallClosestCategory: string | null = null;
          let minDiff = Infinity;

          if (joinDate && allRecords.length > 0) {
            allRecords.forEach((item) => {
              const itemDate = item.start_date ? new Date(item.start_date).getTime() : 0;
              const diff = Math.abs(itemDate - joinDate);
              if (diff < minDiff) {
                minDiff = diff;
                overallClosestItem = item;
                overallClosestCategory = item.category;
              }
            });
          }

          const sortedCategories = Object.keys(hierarchySections).sort((a, b) => {
            if (a === overallClosestCategory) return -1;
            if (b === overallClosestCategory) return 1;
            return a.localeCompare(b);
          });

          return sortedCategories.map((category) => {
            const items = hierarchySections[category];
            const sortedItems = [...items].sort((a, b) => {
              if (joinDate && category === overallClosestCategory) {
                if (a.records === overallClosestItem?.records) return -1;
                if (b.records === overallClosestItem?.records) return 1;
              }
              const aDate = a.start_date ? new Date(a.start_date).getTime() : 0;
              const bDate = b.start_date ? new Date(b.start_date).getTime() : 0;
              return bDate - aDate;
            });

            return (
              <div key={category} className="mb-5 md:mb-10">
                <Typography variant="h4" className="font-bold text-gray-900 mb-4 text-lg">
                  {category}
                </Typography>

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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">

            <ReportingDetailsForm onCancel={() => { setIsModalOpen(false); setIsEditing(false) }} isEdit={isEditing} />
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportingDetails;