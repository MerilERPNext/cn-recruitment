import {
  ArrowUpDown,
  Calendar,
  FileText,
  IndianRupee,
  ReceiptIndianRupeeIcon,
  Timer,
  Wallet,
} from "lucide-react";
import { useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useCurrentEmployeeAllDetails } from "../hooks/useEmployee";
import { useScreenSize } from "../hooks/useScreenSize";
import AttendanceRequestFormV2 from "./Attendance/AttendanceRequest/AttendanceRequestFormV2";
import CreateOvertimeRequest from "./Attendance/OvertimeRequests/CreateOvertimeRequest";
import AdvanceForm from "./Compansation/Advances/AdvanceForm";
import Modal from "./Compansation/Advances/commonModal";
import CreateLoanDialog from "./Compansation/Loan/component/CreateLoanDailog";
import DesktopLayoutWrapper from "./DesktopLayoutWrapper";
import HeaderBar from "./HeaderBar";
import { useRequestLeaveModal } from "./Leaves/RequestLeaveModalContext";
import ShiftRequestFormModal from "./ShiftRequest/ShiftRequestFormModal";
import { usePlannedOvertimeAllowed } from "../hooks/useAttendance";
import { isActionEnabled } from "../utils/uiPermission";
import { useGetUiPermission } from "../hooks/userUiPermission";
import { useTargetUser } from "../context/ViewedUserContext";
import { Typography } from "./shared/atoms/Typography";
import { useCheckAdvancePolicy } from "../hooks/useEmployeeAdvances";
import { useShiftRequestConfig } from "../hooks/useShift";

interface RequestsProps {
  limitCards?: number;
}

const Requests: React.FC<RequestsProps> = ({ limitCards }) => {
  const { targetEmployeeId } = useTargetUser();

  const { data: user } = useCurrentEmployeeAllDetails({
    fields: ["employee"]
  });
  const { data: userUiPermission } = useGetUiPermission();

  const effectiveEmployeeId = targetEmployeeId || user?.employee;

  const { data: plannedOvertimAllowed } = usePlannedOvertimeAllowed(
    effectiveEmployeeId || "",
  );

  const { data: ExpenseAdvanceAllowed } = useCheckAdvancePolicy(
    effectiveEmployeeId || ""
  );

  const canRequestOvertime = isActionEnabled(
    userUiPermission,
    "create_overtime_request",
    "Planned Overtime"
  );

  const canLeaveRequest = isActionEnabled(
    userUiPermission,
    "request_leave",
    "My Requests"
  );
  const canAttendaneRequest = isActionEnabled(
    userUiPermission,
    "create_attendance_request",
    "Attendance Summary"
  );
  const canShiftChangeRequest = isActionEnabled(
    userUiPermission,
    "request_shift_change",
    "All Shift"
  );
  const canLoanRequest = isActionEnabled(
    userUiPermission,
    "create_loan",
    "My Loan Requests"
  );
  const canEmployeeAdvanceRequest = isActionEnabled(
    userUiPermission,
    "create_advance",
    "My Advances"
  );
  const canExpenseRequest = isActionEnabled(
    userUiPermission,
    "expense_claim_request",
    "Expense Claims"
  );

  const canExpenseAdvanceRequest = isActionEnabled(
    userUiPermission,
    "request_expense_advance",
    "My Advances"
  );

  const { isDesktop } = useScreenSize();
  const navigate = useNavigate();
  const { openModal } = useRequestLeaveModal();

  const [showAttendanceRequest, setShowAttendanceRequest] = useState(false);
  const [showOvertimeRequest, setShowOvertimeRequest] = useState(false);
  const [showShiftRequestModal, setShowShiftRequestModal] = useState(false);
  const [isLoanDialogOpen, setIsLoanDialogOpen] = useState(false);
  const [showAdvanceForm, setShowAdvanceForm] = useState(false);

  const handleShiftForm = () => setShowShiftRequestModal(true);
  const handleCloseShiftModal = () => setShowShiftRequestModal(false);
  const handleCloseAdvanceModal = () => setShowAdvanceForm(false);
    const { data: shiftRequestConfig } = useShiftRequestConfig(
      effectiveEmployeeId || "");
  
    const isShiftConfigEnabled =
      shiftRequestConfig?.shift_change_requests ||
      shiftRequestConfig?.shift_change_and_attendance_requests;

  /* ---------- Cards Config ---------- */

  const actions = [
    {
      label: "Apply Leave",
      icon: Calendar,
      color: "primary",
      onClick: () => openModal(),
      permission: canLeaveRequest,
    },
    {
      label: "Attendance Request",
      icon: FileText,
      color: "secondary",
      onClick: () => setShowAttendanceRequest(true),
      permission: canAttendaneRequest,
    },
    {
      label: "Planned Overtime",
      icon: Timer,
      color: "purple",
      onClick: () => setShowOvertimeRequest(true),
      permission: canRequestOvertime && plannedOvertimAllowed,
    },
    {
      label: "Shift Change",
      icon: ArrowUpDown,
      color: "success",
      onClick: handleShiftForm,
      permission: canShiftChangeRequest, isShiftConfigEnabled,
    },
    {
      label: "Create Loan Request",
      icon: Wallet,
      bg: "bg-pink-100",
      onClick: () => setIsLoanDialogOpen(true),
      permission: canLoanRequest,
    },
    {
      label: "Create Advance",
      icon: IndianRupee,
      bg: "bg-orange-100",
      onClick: () => setShowAdvanceForm(true),
      permission: canEmployeeAdvanceRequest,
    },
    {
      label: "Create Expense",
      icon: ReceiptIndianRupeeIcon,
      bg: "bg-green-100",
      onClick: () => navigate("/webapp/expenses-app/add-expense"),
      permission: canExpenseRequest,
    },
    {
      label: "Expense Advance",
      icon: IndianRupee,
      bg: "bg-amber-100",
      onClick: () => navigate("/webapp/expenses-app/new-expense-advance"),
      permission: canExpenseAdvanceRequest && ExpenseAdvanceAllowed,
    },
  ];

  /* ---------- Requests Cards UI ---------- */

  const requestsCards = () => (
    <div className="bg-white rounded-lg md:p-6 shadow-sm h-full">
      <div className="grid grid-cols-4 gap-3 justify-center">
        {actions
          .filter((action) => action.permission)
          .slice(0, limitCards)
          .map((action, idx) => (
            <div
              key={idx}
              className="group flex flex-col items-center justify-center p-4 rounded-xl hover-lift transition-all cursor-pointer text-center"
              onClick={action.onClick}
            >
              <div
                className={`w-12 h-12 mb-3 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110
                ${
                  action.bg
                    ? `${action.bg} text-gray-700`
                    : action.color === "primary"
                    ? "bg-primary-100 text-primary-600"
                    : action.color === "secondary"
                    ? "bg-secondary-100 text-secondary-600"
                    : action.color === "purple"
                    ? "bg-purple-100 text-purple-600"
                    : action.color === "success"
                    ? "bg-success-100 text-success-600"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                <action.icon className="w-5 h-5 shadow-sm" />
              </div>

              <Typography
                variant="bodySmall"
                className="font-semibold leading-tight line-clamp-2"
              >
                {action.label}
              </Typography>
            </div>
          ))}
      </div>

      {/* Attendance Modal */}

      {showAttendanceRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <AttendanceRequestFormV2
              onClose={() => setShowAttendanceRequest(false)}
            />
          </div>
        </div>
      )}

      {/* Overtime Modal */}

      {showOvertimeRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <CreateOvertimeRequest
              onCancel={() => setShowOvertimeRequest(false)}
            />
          </div>
        </div>
      )}

      <CreateLoanDialog
        isOpen={isLoanDialogOpen}
        onClose={() => setIsLoanDialogOpen(false)}
      />

      <ShiftRequestFormModal
        className="h-full"
        isOpen={showShiftRequestModal}
        onClose={handleCloseShiftModal}
      />

      {showAdvanceForm && (
        <Modal onClose={handleCloseAdvanceModal}>
          <AdvanceForm user={user} onClose={handleCloseAdvanceModal} />
        </Modal>
      )}
    </div>
  );

  const isRequestPage = useLocation().pathname === "/webapp/requests";

  const mobileLayout = (
    <div className="flex flex-col min-h-fit bg-white">
      {isRequestPage && (
        <HeaderBar title={"Requests"} onBack={() => navigate(-1)} />
      )}

      <div className="md:p-4 flex-grow">
        {requestsCards()}
        <Outlet />
      </div>
    </div>
  );

  const desktopLayout = (
    <DesktopLayoutWrapper title="Requests">
      <div className="p-8 md:p-0 overflow-y-auto h-full">
        {requestsCards()}
        <Outlet />
      </div>
    </DesktopLayoutWrapper>
  );

  return isDesktop ? desktopLayout : mobileLayout;
};

export default Requests;