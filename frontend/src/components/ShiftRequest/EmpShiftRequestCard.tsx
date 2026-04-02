import { useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useGlobalStore } from "../../hooks/useGlobalStore";
import { useScreenSize } from "../../hooks/useScreenSize";
import { useShiftTypes } from "../../hooks/useShift";
import { useRevokeEvent } from "../../hooks/userApprovalList";
import { MyShiftRequest } from "../../types/shift";
import formatToIndianDate from "../../utils/formatToIndianDate";
import ExpenseFormModal from "../Expenses-App/ExpenseFormModal";
import AllocatedToTooltip from "../shared/AllocatedToTooltip";
import MobileAllocatedTo from "../shared/MobileAllocatedTo";
import MyApprovalActionPill from "../shared/atoms/MyApprovalActionPill";
import { Typography } from "../shared/atoms/Typography";
import StatusBadge from "../shared/atoms/statusBadge";
import ShiftRequestFormModal from "./ShiftRequestFormModal";

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

  const getShiftTimeline = (shiftTypeName: string) => {
    if (shiftTypes && !shiftTypesLoading && !shiftTypesError) {
      const shiftType = shiftTypes.data.find(
        (type) => type.name === shiftTypeName,
      );

      if (shiftType) {
        return `${shiftType.start_time || "--"} - ${shiftType.end_time || "--"
          }`;
      }
    }

    return "";
  };

  const gridTemplateColumns = "1fr 1fr 1fr 1fr 1fr";
  const isDraft = data?.reference_document?.status === "Draft";

  const canEdit = Boolean(data?.can_edit && isDraft);
  const canRevoke = Boolean(data?.custom_allow_revoke && isDraft);

  return (
    <>
      {isDesktop ? (
        <div
          className="grid max-w-screen items-center gap-4 px-6 h-16 border-b border-gray-50 transition-colors cursor-pointer hover:bg-primary/10"
          style={{ gridTemplateColumns }}
        >
          {/* Request Type */}
          <Typography variant="bodySmall" className="font-medium text-center">
            {data?.reference_document?.shift_name}
            <Typography variant="bodySmall" className="font-medium text-center">
              {getShiftTimeline(data?.reference_document?.shift_type || "")}
            </Typography>
          </Typography>

          {/* From Date */}
          <Typography variant="bodySmall" className="font-medium text-center">
            {formatToIndianDate(data?.reference_document?.from_date || "")}
          </Typography>

          {/* To Date */}
          <Typography variant="bodySmall" className="font-medium text-center">
            {formatToIndianDate(data?.reference_document?.to_date || "")}
          </Typography>

          {/* Status */}

          <div className="flex items-center justify-center">
            <AllocatedToTooltip
              users={data?.allocated_to}
              roles={data?.allocated_roles}
              allocated_to_user={data?.username}
              position="left"
            >
              <StatusBadge status={data?.reference_document?.status} />
            </AllocatedToTooltip>
          </div>
          <div className="flex items-center justify-center">
            <MyApprovalActionPill
              canEdit={canEdit}
              canRevoke={canRevoke}
              isPending={false}
              revokeLoading={revokeEventMutation.isPending}
              onEdit={handleEditClick}
              onRevoke={handleRevokeClick}
            />
          </div>
        </div>
      ) : (
        <div
          className="cursor-pointer border-t-4 border-x border-b 
      border-x-primary/20 border-b-primary/20 
      shadow-sm border-primary bg-white rounded-xl mb-4"
        >
          <div className="p-4 flex flex-col gap-4 w-full">
            {/* Header */}
            <div className="flex items-start justify-between">
              <MobileAllocatedTo
                users={data?.allocated_to}
                roles={data?.allocated_roles}
                username={data?.username}
              />

              <StatusBadge status={data?.reference_document?.status} />
            </div>

            <div className="flex justify-between w-full">
              <div className="flex flex-col gap-1">
                <Typography variant="mobileCardLabel">Shift Type</Typography>
                <Typography variant="mobileCardValue">
                  {data?.reference_document?.shift_name || "--"}
                </Typography>
              </div>

              <div className="flex flex-col gap-1 text-right">
                <Typography variant="mobileCardLabel">Shift Time</Typography>
                <Typography variant="mobileCardValue">
                  {getShiftTimeline(data?.reference_document?.shift_type || "")}
                </Typography>
              </div>
            </div>

            {/* Dates */}
            <div className="flex justify-between w-full">
              <div className="flex flex-col gap-1">
                <Typography variant="mobileCardLabel">From</Typography>
                <Typography variant="mobileCardValue">
                  {formatToIndianDate(
                    data?.reference_document?.from_date || "",
                  )}
                </Typography>
              </div>

              <div className="flex flex-col gap-1 text-right">
                <Typography variant="mobileCardLabel">To</Typography>
                <Typography variant="mobileCardValue">
                  {formatToIndianDate(data?.reference_document?.to_date || "")}
                </Typography>
              </div>
            </div>

            {/* Actions */}
            <MyApprovalActionPill
              variant="buttons"
              canEdit={canEdit}
              canRevoke={canRevoke}
              isPending={false}
              revokeLoading={revokeEventMutation.isPending}
              onEdit={handleEditClick}
              onRevoke={handleRevokeClick}
            />
          </div>
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
