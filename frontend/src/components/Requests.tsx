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
import { useLoggedInUser } from "../hooks/useLoggedInUser";
import { useScreenSize } from "../hooks/useScreenSize";
import AttendanceRequestFormV2 from "./Attendance/AttendanceRequest/AttendanceRequestFormV2";
import CreateOvertimeRequest from "./Attendance/OvertimeRequests/CreateOvertimeRequest";
import AdvanceForm from "./Compansation/Advances/AdvanceForm";
import Modal from "./Compansation/Advances/commonModal";
import CreateLoanDialog from "./Compansation/Loan/component/CreateLoanDailog";
import DesktopLayoutWrapper from "./DesktopLayoutWrapper";
import ExpenseFormModal from "./Expenses-App/ExpenseFormModal";
import HeaderBar from "./HeaderBar";
import { useRequestLeaveModal } from "./Leaves/RequestLeaveModalContext";
import ShiftRequestFormModal from "./ShiftRequest/ShiftRequestFormModal";

interface RequestsProps {
  limitCards?: number;
}

const Requests: React.FC<RequestsProps> = ({ limitCards }) => {
  const { data: userId } = useLoggedInUser();
  const { data: user } = useCurrentEmployeeAllDetails(userId || "");

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

  /* ---------- Cards Config ---------- */

  const cards = [
    {
      label: "Apply Leaves",
      icon: <Calendar className="w-5 h-5 text-blue-600" />,
      bg: "bg-blue-100",
      onClick: () => openModal(),
    },
    {
      label: "Attendance Request",
      icon: <FileText className="w-5 h-5 text-blue-600" />,
      bg: "bg-blue-100",
      onClick: () => setShowAttendanceRequest(true),
    },
    {
      label: "Planned Overtime",
      icon: <Timer className="w-5 h-5 text-purple-600" />,
      bg: "bg-purple-100",
      onClick: () => setShowOvertimeRequest(true),
    },
    {
      label: "Change Shifts",
      icon: <ArrowUpDown className="w-5 h-5 text-green-600" />,
      bg: "bg-green-100",
      onClick: handleShiftForm,
    },
    {
      label: "Create Loan Request",
      icon: <Wallet className="w-5 h-5 text-pink-600" />,
      bg: "bg-pink-100",
      onClick: () => setIsLoanDialogOpen(true),
    },
    {
      label: "Create Advance",
      icon: <IndianRupee className="w-5 h-5 text-orange-600" />,
      bg: "bg-orange-100",
      onClick: () => setShowAdvanceForm(true),
    },
    {
      label: "Create Expense",
      icon: <ReceiptIndianRupeeIcon className="w-5 h-5 text-green-600" />,
      bg: "bg-green-100",
      onClick: () => navigate("/webapp/expenses-app/add-expense"),
    },
    {
      label: "Expense Advance",
      icon: <IndianRupee className="w-5 h-5 text-amber-600" />,
      bg: "bg-amber-100",
      onClick: () => navigate("/webapp/expenses-app/new-expense-advance"),
    },

  ];

  /* ---------- Requests Cards UI ---------- */

  const requestsCards = () => (
    <div className="bg-white rounded-lg md:p-6 shadow-sm h-full">
      <div className="grid grid-cols-4 gap-3 justify-center">
        {(limitCards ? cards.slice(0, limitCards) : cards).map(
          (card, index) => (
            <div
              key={index}
              className="shadow-sm hover-lift rounded-lg cursor-pointer
              h-28 w-full flex flex-col items-center justify-center p-2"
              onClick={card.onClick}
            >
              <div
                className={`w-10 h-10 ${card.bg}
                rounded-full md:rounded-lg
                flex items-center justify-center mb-2`}
              >
                {card.icon}
              </div>

              <p className="text-xs text-gray-600 font-medium text-center">
                {card.label}
              </p>
            </div>
          ),
        )}
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

      <ExpenseFormModal
        forMbileScreen={true}
        isOpen={showShiftRequestModal}
        onClose={handleCloseShiftModal}
        title="Request Shift Change"
      >
        <ShiftRequestFormModal
          className="h-full"
          onClose={handleCloseShiftModal}
        />
      </ExpenseFormModal>

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
