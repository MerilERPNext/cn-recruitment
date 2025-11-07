import { format } from "date-fns";
import { MoreVertical, Repeat1, RotateCcw, SquarePen } from "lucide-react";
import { useRevokeEvent } from "../../hooks/userApprovalList";
import { useGlobalStore } from "../../hooks/useGlobalStore";
import Tooltip from "../shared/Tooltip";
import { useScreenSize } from "../../hooks/useScreenSize";
import Badge from "../shared/Badge";
import { LeaveCardProps } from "../../types/leaves";
import { useState, useRef, useEffect } from "react";
import { useRequestLeaveModal } from "./RequestLeaveModalContext";

// Update the interface to include the new prop
interface EmpLeaveRequestCardProps extends LeaveCardProps {
  onOpenReplaceModal?: () => void;
  onRevokeApproved?: () => void;
}

const EmpLeaveRequestCard = ({
  data,
  buttonStatus,
  onOpenReplaceModal,
  onRevokeApproved,
}: EmpLeaveRequestCardProps) => {
  const { isDesktop } = useScreenSize();

  const revokeEventMutation = useRevokeEvent();
  const { setRefetchAttendance } = useGlobalStore();

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { openModal } = useRequestLeaveModal();

  const leaveButtonConfig = buttonStatus?.leave_applications?.find(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (app: any) => app.name === data?.reference_name
  );

  const allowEdit = leaveButtonConfig?.show_edit_button;
  const allowRevoke = leaveButtonConfig?.show_revoke_button;
  const allowReplace = leaveButtonConfig?.show_replace_button;

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
            setRefetchAttendance(true);
            setMenuOpen(false);
          },
        }
      );
    }
  };

  const handleReplaceClick = () => {
    setMenuOpen(false);
    if (onOpenReplaceModal) {
      onOpenReplaceModal();
    }
  };

  const handleEditClick = () => {
    setMenuOpen(false);
    openModal({
      fromDate: data?.reference_document?.from_date,
      toDate: data?.reference_document?.to_date,
      leaveType: data?.reference_document?.leave_type,
      description: data?.reference_document?.description,
      custom_reason: data?.reference_document?.custom_reason,
      halfDay: data?.reference_document?.half_day,
      custom_attachment: data?.reference_document?.custom_attachment,
      half_day_date: data?.reference_document?.half_day_date,
      custom_second_half_day_date:
        data?.reference_document?.custom_second_half_day_date,
      source: "other",
      hideHalfDayToggle: false,
      isEdit: true,
      leave_application: data?.reference_document?.name,
    });
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getStatus = (rawStatus: string) => {
    const status = rawStatus?.toLowerCase().trim();
    if (status === "open")
      return { label: "Pending", statusColor: "bg-yellow-100 text-yellow-800" };
    if (status === "approved")
      return { label: "Approved", statusColor: "bg-green-100 text-green-800" };
    if (status === "cancelled")
      return { label: "Cancelled", statusColor: "bg-red-100 text-red-800" };
    return {
      label: rawStatus || "Unknown",
      statusColor: "bg-gray-100 text-gray-800",
    };
  };

  const status = getStatus(data?.reference_document?.status);
  const formattedFromDate = data?.reference_document?.from_date
    ? format(new Date(data?.reference_document.from_date), "dd/MM/yyyy")
    : "N/A";
  const formattedToDate = data?.reference_document?.to_date
    ? format(new Date(data?.reference_document.to_date), "dd/MM/yyyy")
    : "N/A";

  const ActionMenu = () => (
    <div
      ref={menuRef}
      className={`absolute right-0  ${
        !allowRevoke && !allowEdit && allowReplace ? "md:-top-10" : "md:-top-15"
      }  w-32 bg-white border border-gray-200 rounded-md shadow-md z-50`}
    >
      {data?.custom_allow_revoke &&
        data?.reference_document?.status === "Open" && (
          <button
            className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-2"
            onClick={handleRevokeClick}
            disabled={revokeEventMutation.isPending}
          >
            <RotateCcw className="w-3 h-3" />
            {revokeEventMutation.isPending ? "Revoking..." : "Revoke"}
          </button>
        )}
      {allowRevoke && (
        <button
          className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-2"
          onClick={onRevokeApproved}
        >
          <RotateCcw className="w-3 h-3" />
          Revoke
        </button>
      )}

      {allowEdit && (
        <button
          className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-2"
          onClick={handleEditClick}
        >
          <SquarePen className="w-3 h-3" />
          Edit
        </button>
      )}
      {allowReplace && (
        <button
          className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-2"
          onClick={handleReplaceClick}
        >
          <Repeat1 className="w-3 h-3" />
          Replace
        </button>
      )}
    </div>
  );

  return (
    <>
      {isDesktop ? (
        <div
          style={{ gridTemplateColumns: "1fr 1fr 1fr 1.5fr 1fr 1fr 0.5fr" }}
          className={`grid items-center gap-4 px-6 h-14 border-b border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer relative`}
        >
          <div className="text-sm font-medium text-gray-700 text-start truncate">
            {data?.reference_document?.leave_type}
          </div>
          <div className="text-sm text-gray-900">{formattedFromDate}</div>
          <div className="text-sm text-gray-900">{formattedToDate}</div>
          <div className="text-sm font-medium text-gray-700 text-start truncate">
            {data?.reference_document?.description || " - "}
          </div>
          <div className="text-sm font-medium text-gray-700 text-start truncate">
            {data?.reference_document?.total_leave_days}
          </div>
          <div className="flex justify-start">
            <Tooltip
              content={status?.label === "Pending" ? data?.allocated_to : ""}
            >
              <Badge
                size="sm"
                backgroundColor={status?.statusColor}
                label={status?.label || ""}
              />
            </Tooltip>
          </div>
          <div className="text-sm text-gray-900 text-start flex gap-2 items-center relative">
            {data?.custom_allow_revoke && (
              <div className="relative">
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="p-1 border border-gray-300 rounded-md hover:bg-gray-100 flex items-center justify-center"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>
                {menuOpen && <ActionMenu />}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="w-full px-2 flex border border-gray-200 items-center justify-between bg-white rounded-xl cursor-pointer hover:shadow-md transition-shadow relative">
          <div className="p-2 w-full flex justify-between">
            <div className="flex gap-1 flex-col">
              <div className="flex gap-2 items-center">
                <span>{data?.reference_document?.leave_type}</span>

                <span className="text-sm font-medium text-gray-700 bg-blue-100 px-2 py-0.5 rounded-full">
                  {data?.reference_document?.total_leave_days}
                </span>
              </div>

              <div className="text-sm text-gray-500">
                {formattedFromDate} - {formattedToDate}
              </div>
            </div>

            <div className="text-sm text-gray-900 text-start flex gap-2 items-center relative">
              <Badge
                size="sm"
                backgroundColor={status?.statusColor}
                label={status?.label || ""}
              />

              <div className="relative ml-2">
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="p-1 border border-gray-300 rounded-md hover:bg-gray-100 flex items-center justify-center"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>
                {menuOpen && <ActionMenu />}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default EmpLeaveRequestCard;
