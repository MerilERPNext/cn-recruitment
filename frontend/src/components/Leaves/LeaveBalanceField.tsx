import { useGetEmployeeLeaveBalance } from "../../hooks/useLeaves";
import { Typography } from "../shared/atoms/Typography";

type LeaveBalanceFieldProps = {
  /** Employee the request belongs to (Employee docname). */
  employee?: string;
  /** Leave Type docname on the request — matched against `leave_id`. */
  leaveTypeId?: string;
  /** Date the balance is reported as of — the request's from date. */
  asOfDate?: string;
};

const formatDays = (value: number) => {
  const days = parseFloat(value.toFixed(2));
  return `${days} ${days === 1 ? "Day" : "Days"}`;
};

/**
 * Applicant's leave balance for the applied leave type, shown as a field in the
 * request detail view so an approver can decide without leaving the request.
 */
const LeaveBalanceField = ({
  employee,
  leaveTypeId,
  asOfDate,
}: LeaveBalanceFieldProps) => {
  const { data, isLoading, isError } = useGetEmployeeLeaveBalance(
    employee,
    asOfDate,
  );

  const balance = data?.leave_balance?.find(
    (leave) => leave.leave_id === leaveTypeId,
  )?.balance;

  let value = "--";
  if (isLoading) {
    value = "Loading...";
  } else if (isError) {
    value = "Unavailable";
  } else if (typeof balance === "number") {
    value = formatDays(balance);
  } else if (data) {
    value = "No active allocation";
  }

  return (
    <div className="flex flex-col gap-2">
      <Typography variant="mobileCardLabel" className="block">
        Leave Balance
      </Typography>
      <Typography variant="mobileCardValue">{value}</Typography>
    </div>
  );
};

export default LeaveBalanceField;
