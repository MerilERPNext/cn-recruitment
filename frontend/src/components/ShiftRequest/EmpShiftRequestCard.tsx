import Button from "../shared/atoms/Button";
import { RotateCcw, Pencil } from "lucide-react";
import Badge from "../shared/Badge";
import Tooltip from "../shared/Tooltip";
import { useScreenSize } from "../../hooks/useScreenSize";
import { useRevokeEvent } from "../../hooks/userApprovalList";
import { useGlobalStore } from "../../hooks/useGlobalStore";
import { MyShiftRequest } from "../../types/shift";
import { useState } from "react";
import { createPortal } from "react-dom";
import ShiftRequestFormModal from "./ShiftRequestFormModal";
import ExpenseFormModal from "../Expenses-App/ExpenseFormModal";
import { useNavigate } from "react-router-dom";
import { useShiftTypes } from "../../hooks/useShift";
import formatToIndianDate from "../../utils/formatToIndianDate";

const EmpShiftRequestCard = ({ data }: { data: MyShiftRequest }) => {
  const { isDesktop } = useScreenSize();
  const revokeEventMutation = useRevokeEvent();
  const { setRefetchAttendance } = useGlobalStore();

  const navigate = useNavigate();
  const [edit, setEdit] = useState(false);
  const {
    data: shiftTypes,
    isLoading: shiftTypesLoading,
    error: shiftTypesError,
  } = useShiftTypes();

  const handleEditClick = () => {
    navigate(
      `/webapp/shift-request/shift-change-form/${data?.reference_document?.name}`,
    );
  };

  const handleRevokeClick = () => {
    if (data?.todo_id) {
      revokeEventMutation.mutate(
        {
          docname: data?.reference_name,
          doctype: data?.reference_type,
          todo: data?.todo_id,
        },
        {
          onSuccess: () => {
            setTimeout(() => {
              setRefetchAttendance(true);
            }, 1000);
          },
        },
      );
    }
  };

  const getStatus = (rawStatus: string) => {
    const status = rawStatus?.toLowerCase().trim();

    if (status === "draft") {
      return {
        label: "Pending",
        statusColor: "bg-yellow-100 text-yellow-800",
      };
    } else if (status === "approved") {
      return {
        label: "Approved",
        statusColor: "bg-success-200 text-success",
      };
    } else if (status === "rejected") {
      return {
        label: "Rejected",
        statusColor: "bg-error-50 text-error",
      };
    } else {
      return {
        label: rawStatus || "Unknown",
        statusColor: "bg-gray-100 text-gray-800",
      };
    }
  };
  const status = getStatus(data?.reference_document?.status);

  const getShiftTimeline = (shiftTypeName: string) => {
    if (shiftTypes && !shiftTypesLoading && !shiftTypesError) {
      const shiftType = shiftTypes.data.find(
        (type) => type.name === shiftTypeName,
      );

      if (shiftType) {
        return `${shiftType.start_time || "--"} - ${
          shiftType.end_time || "--"
        }`;
      }
    }

    return "";
  };

  return (
    <>
      {isDesktop ? (
        <div
          className={`grid grid-cols-5 items-center gap-4 px-6 h-14 border-b border-gray-200 hover:bg-primary/20 transition-colors cursor-pointer`}
        >
          {/* Request Type */}
          <div className="text-sm font-medium text-gray-700 text-start truncate flex flex-col">
            <div>{data?.reference_document?.shift_type}</div>
            <div className="text-xs">
              {getShiftTimeline(data?.reference_document?.shift_type || "")}
            </div>
          </div>

          {/* From Date */}
          <div className="text-sm text-gray-900 text-start">
            {formatToIndianDate(data?.reference_document?.from_date || "")}
          </div>

          {/* To Date */}
          <div className="text-sm text-gray-900 text-start">
            {formatToIndianDate(data?.reference_document?.to_date || "")}
          </div>

          {/* Status */}
          <div className="flex justify-start">
            <Tooltip
              content={status?.label === "Draft" ? data?.allocated_to : ""}
            >
              <Badge
                size="sm"
                backgroundColor={status?.statusColor}
                label={status?.label || ""}
              />
            </Tooltip>
          </div>
          {data?.custom_allow_revoke &&
          data?.can_edit &&
          data?.reference_document?.status === "Draft" ? (
            <div className="text-sm text-gray-900 text-start flex gap-5 items-center">
              {/* ✨ ADD THE EDIT BUTTON HERE */}
              <Button
                icon={<Pencil className="h-3 w-3" />}
                variant="outline"
                size="sm"
                onClick={() => setEdit(true)}
              >
                Edit
              </Button>
              {/* REVOKE BUTTON */}
              <Button
                icon={<RotateCcw className="h-3 w-3" />}
                variant="contain"
                size="sm"
                onClick={handleRevokeClick}
                disabled={revokeEventMutation.isPending}
              >
                {revokeEventMutation.isPending ? "Revoking..." : "Revoke"}
              </Button>
            </div>
          ) : (
            <></>
          )}
        </div>
      ) : (
        <div className="w-full bg-app rounded-xl shadow-sm border border-gray-200 p-4 mb-4 hover:shadow-md transition cursor-pointer">
          {/* Top Section: Shift Type + Status */}
          <div className="flex justify-between items-start mb-3">
            <h3 className="base-title truncate">
              {data?.reference_document?.shift_type || "--"}
            </h3>
            <Badge
              size="sm"
              backgroundColor={status?.statusColor}
              label={status?.label || ""}
            />
          </div>

          {/* Two-column Info Layout */}
          <div className="flex justify-between gap-6">
            {/* Left Column */}
            <div>
              <div className="flex flex-col gap-1">
                <div className="card-title">Employee</div>
                <div className="card-subtitle">
                  {data?.reference_document?.employee_name || "--"}
                </div>
              </div>
              <div className="flex flex-col gap-1 mt-1">
                <div className="card-title">Shift Type</div>
                <div className="card-subtitle">
                  {data?.reference_document?.shift_type || "--"}
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="text-right">
              <div className="flex flex-col gap-1">
                <div className="card-title">From</div>
                <div className="card-subtitle">
                  {formatToIndianDate(
                    data?.reference_document?.from_date || "",
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-1 mt-1">
                <div className="card-title">To</div>
                <div className="font-medium text-sm text-gray-800">
                  {formatToIndianDate(data?.reference_document?.to_date || "")}
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          {data?.custom_allow_revoke &&
          data?.can_edit &&
          data?.reference_document?.status === "Draft" ? (
            <div className="flex flex-wrap justify-start gap-2 mt-4">
              <Button
                icon={<Pencil className="h-3 w-3" />}
                variant="outline"
                size="sm"
                onClick={handleEditClick}
              >
                Edit
              </Button>
              <Button
                icon={<RotateCcw className="h-3 w-3" />}
                variant="contain"
                size="sm"
                onClick={handleRevokeClick}
                disabled={revokeEventMutation.isPending}
              >
                {revokeEventMutation.isPending ? "Revoking..." : "Revoke"}
              </Button>
            </div>
          ) : null}
        </div>
      )}
      {edit &&
        isDesktop &&
        createPortal(
          <ExpenseFormModal
            isOpen={edit}
            onClose={() => setEdit(false)}
            title="Request Shift Change"
          >
            <ShiftRequestFormModal
              onClose={() => setEdit(false)}
              defaultShiftRequestData={data?.reference_document}
              forActionType="edit"
            />
          </ExpenseFormModal>,
          document.body,
        )}
    </>
  );
};

export default EmpShiftRequestCard;
