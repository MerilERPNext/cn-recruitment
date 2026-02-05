import {
  ArrowUpDown,
  Calendar,
  FileText,
  IndianRupee,
  ReceiptIndianRupeeIcon,
  Timer,
  Wallet,
  Workflow,
} from "lucide-react";
import { useState } from "react";
import AttendanceRequestFormV2 from "./Attendance/AttendanceRequest/AttendanceRequestFormV2";
import { LeaveRequestRefreshProvider } from "./Leaves/LeaveRequestRefreshContext";
import { RequestLeaveModalProvider } from "./Leaves/RequestLeaveModalContext";
import CreateOvertimeRequest from "./Attendance/OvertimeRequests/CreateOvertimeRequest";
import ExpenseFormModal from "./Expenses-App/ExpenseFormModal";
import ShiftRequestFormModal from "./ShiftRequest/ShiftRequestFormModal";
import { useScreenSize } from "../hooks/useScreenSize";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import DesktopLayoutWrapper from "./DesktopLayoutWrapper";
import CreateLoanDialog from "./Compansation/Loan/component/CreateLoanDailog";
import AdvanceForm from "./Compansation/Advances/AdvanceForm";
import Modal from "./Compansation/Advances/commonModal";
import { useLoggedInUser } from "../hooks/useLoggedInUser";
import { useCurrentEmployeeAllDetails } from "../hooks/useEmployee";
import InitiateFlow from "./Flows/Initiate/InitiateFlow";
import RequestLeave from "./Leaves/RequestLeave";
import HeaderBar from "./HeaderBar";

const Requests = () => {
  const { data: userId } = useLoggedInUser();
  const { data: user } = useCurrentEmployeeAllDetails(userId || "");

  const { isDesktop } = useScreenSize();
  const navigate = useNavigate();
  const [showLeaveRequest, setShowLeaveRequest] = useState(false);
  const [showAttendanceRequest, setShowAttendanceRequest] = useState(false);
  const [showOvertimeRequest, setShowOvertimeRequest] = useState(false);
  const [showShiftRequestModal, setShowShiftRequestModal] = useState(false);
  const [isLoanDialogOpen, setIsLoanDialogOpen] = useState(false);
  const [showAdvanceForm, setShowAdvanceForm] = useState(false);
  const [showInitiateModel, setShowInitiateModel] = useState<boolean>(false);

  const handleShiftForm = () => {
    setShowShiftRequestModal(true);
  };

  const handleCloseShiftModal = () => {
    setShowShiftRequestModal(false);
  };
  const handleCloseAdvanceModal = () => {
    setShowAdvanceForm(false);
  };

  const requestsCards = () => {
    return (
      <div className="bg-white rounded-lg md:p-6 shadow-sm h-full">
        <div className="grid grid-cols-4 md:grid-cols-4 gap-3 justify-center">
          {/* Apply Leave */}
          <div
            className="shadow-sm hover-lift rounded-lg cursor-pointer 
        h-28 w-full flex flex-col items-center justify-center p-2"
            onClick={() => setShowLeaveRequest(true)}
          >
            <div className="w-10 h-10 bg-blue-100 rounded-full md:rounded-lg flex items-center justify-center mb-2">
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-xs text-gray-600 font-medium text-center whitespace-wrap">
              Apply Leaves
            </p>
          </div>

          {/* Attendance Request */}
          <div
            className="shadow-sm hover-lift rounded-lg cursor-pointer 
        h-28 w-full flex flex-col items-center justify-center p-2"
            onClick={() => setShowAttendanceRequest(true)}
          >
            <div className="w-10 h-10 bg-blue-100 rounded-full md:rounded-lg flex items-center justify-center mb-2">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-xs text-gray-600 font-medium text-center">
              Attendance Request
            </p>
          </div>

          {/* Overtime */}
          <div
            className="shadow-sm hover-lift rounded-lg cursor-pointer 
        h-28 w-full flex flex-col items-center justify-center p-2"
            onClick={() => setShowOvertimeRequest(true)}
          >
            <div className="w-10 h-10 bg-purple-100 rounded-full md:rounded-lg flex items-center justify-center mb-2">
              <Timer className="w-5 h-5 text-purple-600" />
            </div>
            <p className="text-xs text-gray-600 font-medium text-center">
              Planned Overtime
            </p>
          </div>

          {/* Shift Change */}
          <div
            className="shadow-sm hover-lift rounded-lg cursor-pointer 
        h-28 w-full flex flex-col items-center justify-center p-2"
            onClick={handleShiftForm}
          >
            <div className="w-10 h-10 bg-green-100 rounded-full md:rounded-lg flex items-center justify-center mb-2">
              <ArrowUpDown className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-xs text-gray-600 font-medium text-center">
              Change Shifts
            </p>
          </div>

          {/* Create Loan */}
          <div
            className="shadow-sm hover-lift rounded-lg cursor-pointer 
        h-28 w-full flex flex-col items-center justify-center p-2"
            onClick={() => setIsLoanDialogOpen(true)}
          >
            <div className="w-10 h-10 bg-pink-100 rounded-full md:rounded-lg flex items-center justify-center mb-2">
              <Wallet className="w-5 h-5 text-pink-600" />
            </div>
            <p className="text-xs text-gray-600 font-medium text-center whitespace-wrap">
              Create Loan Request
            </p>
          </div>

          {/* Create Advance */}
          <div
            className="shadow-sm hover-lift rounded-lg cursor-pointer 
        h-28 w-full flex flex-col items-center justify-center p-2"
            onClick={() => setShowAdvanceForm(true)}
          >
            <div className="w-10 h-10 bg-orange-100 rounded-full md:rounded-lg flex items-center justify-center mb-2">
              <IndianRupee className="w-5 h-5 text-orange-600" />
            </div>
            <p className="text-xs text-gray-600 font-medium text-center">
              Create Advance
            </p>
          </div>

          {/* Create Expense */}
          <div
            className="shadow-sm hover-lift rounded-lg cursor-pointer 
        h-28 w-full flex flex-col items-center justify-center p-2"
            onClick={() => navigate("/webapp/expenses-app/add-expense")}
          >
            <div className="w-10 h-10 bg-green-100 rounded-full md:rounded-lg flex items-center justify-center mb-2">
              <ReceiptIndianRupeeIcon className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-xs text-gray-600 font-medium text-center">
              Create Expense
            </p>
          </div>

          {/* Create Flow Request */}
          <div
            className="shadow-sm hover-lift rounded-lg cursor-pointer 
        h-28 w-full flex flex-col items-center justify-center p-2"
            onClick={() => setShowInitiateModel(true)}
          >
            <div className="w-10 h-10 bg-purple-100 rounded-full md:rounded-lg flex items-center justify-center mb-2">
              <Workflow className="w-5 h-5 text-purple-600" />
            </div>
            <p className="text-xs text-gray-600 font-medium text-center">
              Create Flow Request
            </p>
          </div>
        </div>

        {showAttendanceRequest && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <AttendanceRequestFormV2
                onClose={() => setShowAttendanceRequest(false)}
              />
            </div>
          </div>
        )}
        {showLeaveRequest && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div
  className="
    bg-white
    rounded-lg
    w-full
    mx-0 sm:mx-4
    h-full sm:h-auto
    max-h-screen sm:max-h-[90vh]
    overflow-y-auto
    sm:max-w-2xl
  "
>
              {/* Ensure LeaveRequest is inside its providers */}
              <LeaveRequestRefreshProvider>
                <RequestLeaveModalProvider>
                  <RequestLeave
                    onCancel={() => setShowLeaveRequest(false)}
                    onSuccess={() => setShowLeaveRequest(false)}
                  />
                </RequestLeaveModalProvider>
              </LeaveRequestRefreshProvider>
            </div>
          </div>
        )}
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
          onClose={() => {
            try {
              setIsLoanDialogOpen(false);
            } catch (error) {
              console.error("Error closing loan dialog:", error);
            }
          }}
        />
        <ExpenseFormModal
          isOpen={showShiftRequestModal}
          onClose={handleCloseShiftModal}
          title="Request Shift Change"
        >
          <ShiftRequestFormModal onClose={handleCloseShiftModal} />
        </ExpenseFormModal>
        {showInitiateModel && (
          <InitiateFlow handleCloseModel={() => setShowInitiateModel(false)} />
        )}
        {showAdvanceForm && (
          <Modal onClose={handleCloseAdvanceModal}>
            <AdvanceForm user={user} onClose={handleCloseAdvanceModal} />
          </Modal>
        )}
      </div>
    );
  };
  const isRequestPage = useLocation().pathname === "/webapp/requests";
  const mobileLayout = (
    <div className="flex flex-col min-h-fit bg-white h-fit">
      {isRequestPage && <HeaderBar title={"Requests"} onBack={() => navigate(-1)} />}
      <div className="md:p-4 z-100 flex-grow overflow-y-auto h-fit">
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
