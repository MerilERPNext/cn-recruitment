"use client";

import { useMemo } from "react";
import { Typography } from "../../../shared/atoms/Typography";

import formatToIndianDate from "../../../../utils/formatToIndianDate";
import { useTargetUser } from "../../../../context/ViewedUserContext";
import { useEmployee, useEmployeeByUserId } from "../../../../hooks/useEmployee";
import { useLoggedInUser } from "../../../../hooks/useLoggedInUser";
import { useScreenSize } from "../../../../hooks/useScreenSize";
import Tooltip from "../../../shared/Tooltip";

interface ApprovalDetailsProps {
  title: "Employee Separation";
}

export default function ApprovalDetails({
  title,
}: ApprovalDetailsProps) {
  const { data: userId } = useLoggedInUser();
  const { data: currentEmployeeId } = useEmployeeByUserId(userId || "");

  const { targetEmployeeId, isViewingOtherUser } = useTargetUser();
  const { data: activeEmployee, isPending: isLoading } =
    useEmployee(isViewingOtherUser ? targetEmployeeId : currentEmployeeId?.name || "");

  const isDesktop = useScreenSize();
  const detailsFields = useMemo(() => {
    const fields = [
      { label: "Employee ID", value: activeEmployee?.name },
      { label: "Employee Name", value: activeEmployee?.employee_name },
      { label: "Designation", value: activeEmployee?.designation },
      { label: "Department", value: activeEmployee?.department },
    ];
    if (title === "Employee Separation") {
      fields.splice(
        4,
        0,
        {
          label: "Date of Joining",
          value: formatToIndianDate(activeEmployee?.date_of_joining || ""),
        },
        { label: "Status", value: activeEmployee?.custom_employment_status || "N/A" },
      );
    }

    return fields;
  }, [title, activeEmployee]);

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="md:bg-white bg-blue-50 border border-slate-200 rounded-lg p-6">
          <div className="h-5 w-40 bg-gray-200 rounded mb-4" />

          <div className="grid grid-cols-2 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="space-y-2">
                <div className="h-3 w-20 bg-gray-200 rounded" />
                <div className="h-4 w-32 bg-gray-200 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="md:bg-white bg-blue-50 border border-slate-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">{title}</h3>

        <div className="grid grid-cols-2 gap-6">
          {detailsFields.map((field, index) => (
            <div key={index} className="space-y-1">
              <Typography variant={isDesktop ? "bodySmall" : "mobileCardLabel"}>{field.label}</Typography>
              <Typography
                variant={isDesktop ? "bodyMedium" : "mobileCardValue"}
                className="truncate text-ellipsis"
              >
                <Tooltip content={field.value} position="top" className="truncate text-ellipsis">
                  {field.value}
                </Tooltip>
              </Typography>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
