import { ArrowUpDown, Calendar, FileText, IndianRupee, ReceiptIndianRupeeIcon, Timer, Wallet, Workflow } from "lucide-react";
import { useState } from "react";
import AttendanceRequestFormV2 from "./Attendance/AttendanceRequest/AttendanceRequestFormV2";
import { LeaveRequestRefreshProvider } from "./Leaves/LeaveRequestRefreshContext";
import { RequestLeaveModalProvider } from "./Leaves/RequestLeaveModalContext";
import LeaveRequest from "./Attendance/LeaveRequest";
import CreateOvertimeRequest from "./Attendance/OvertimeRequests/CreateOvertimeRequest";
import ExpenseFormModal from "./Expenses-App/ExpenseFormModal";
import ShiftRequestFormModal from "./ShiftRequest/ShiftRequestFormModal";
import { useScreenSize } from "../hooks/useScreenSize";
import HeaderBar from "./HeaderBar";
import { Outlet, useNavigate } from "react-router-dom";
import DesktopLayoutWrapper from "./DesktopLayoutWrapper";
import CreateLoanDialog from "./SalarySlip/Loan/component/CreateLoanDailog";
import AdvanceForm from "./SalarySlip/Advances/AdvanceForm";
import Modal from "./SalarySlip/Advances/commonModal";
import { useLoggedInUser } from "../hooks/useLoggedInUser";
import { useCurrentEmployeeAllDetails } from "../hooks/useEmployee";
import InitiateFlow from "./Flows/Initiate/InitiateFlow";

const Requests = () => {
    const { data: userId } = useLoggedInUser();
    const { data: user } = useCurrentEmployeeAllDetails(userId || "");

    const { isDesktop } = useScreenSize();
    const navigate = useNavigate()
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
        return <div className="bg-white rounded-lg p-6 shadow-sm h-full">

            <div className="grid grid-cols-2 sm:grid-cols-[repeat(auto-fill,250px)] gap-3 justify-center">
                {/* Apply Leave */}
                <div
                    className="bg-gray-100 rounded-lg hover:bg-gray-200 cursor-pointer 
        h-28 w-full flex flex-col items-center justify-center p-2"
                    onClick={() => setShowLeaveRequest(true)}
                >
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-2">
                        <Calendar className="w-5 h-5 text-blue-600" />
                    </div>
                    <p className="text-xs text-gray-600 font-medium text-center">Apply Leave</p>
                </div>

                {/* Attendance Request */}
                <div
                    className="bg-gray-100 rounded-lg hover:bg-gray-200 cursor-pointer 
        h-28 w-full flex flex-col items-center justify-center p-2"
                    onClick={() => setShowAttendanceRequest(true)}
                >
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-2">
                        <FileText className="w-5 h-5 text-blue-600" />
                    </div>
                    <p className="text-xs text-gray-600 font-medium text-center">Attendance Request</p>
                </div>

                {/* Overtime */}
                <div
                    className="bg-gray-100 rounded-lg hover:bg-gray-200 cursor-pointer 
        h-28 w-full flex flex-col items-center justify-center p-2"
                    onClick={() => setShowOvertimeRequest(true)}
                >
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mb-2">
                        <Timer className="w-5 h-5 text-purple-600" />
                    </div>
                    <p className="text-xs text-gray-600 font-medium text-center">Planned Overtime</p>
                </div>

                {/* Shift Change */}
                <div
                    className="bg-gray-100 rounded-lg hover:bg-gray-200 cursor-pointer 
        h-28 w-full flex flex-col items-center justify-center p-2"
                    onClick={handleShiftForm}
                >
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mb-2">
                        <ArrowUpDown className="w-5 h-5 text-green-600" />
                    </div>
                    <p className="text-xs text-gray-600 font-medium text-center">Shift Change</p>
                </div>

                {/* Create Loan */}
                <div
                    className="bg-gray-100 rounded-lg hover:bg-gray-200 cursor-pointer 
        h-28 w-full flex flex-col items-center justify-center p-2"
                    onClick={() => setIsLoanDialogOpen(true)}
                >
                    <div className="w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center mb-2">
                        <Wallet className="w-5 h-5 text-pink-600" />
                    </div>
                    <p className="text-xs text-gray-600 font-medium text-center">Create Loan</p>
                </div>

                {/* Create Advance */}
                <div
                    className="bg-gray-100 rounded-lg hover:bg-gray-200 cursor-pointer 
        h-28 w-full flex flex-col items-center justify-center p-2"
                    onClick={() => setShowAdvanceForm(true)}
                >
                    <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center mb-2">
                        <IndianRupee className="w-5 h-5 text-orange-600" />
                    </div>
                    <p className="text-xs text-gray-600 font-medium text-center">Create Advance</p>
                </div>

                {/* Create Expense */}
                <div
                    className="bg-gray-100 rounded-lg hover:bg-gray-200 cursor-pointer 
        h-28 w-full flex flex-col items-center justify-center p-2"
                    onClick={() => navigate("/webapp/expenses-app/add-expense")}
                >
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mb-2">
                        <ReceiptIndianRupeeIcon className="w-5 h-5 text-green-600" />
                    </div>
                    <p className="text-xs text-gray-600 font-medium text-center">Create Expense</p>
                </div>

                {/* Create Flow Request */}
                <div
                    className="bg-gray-100 rounded-lg hover:bg-gray-200 cursor-pointer 
        h-28 w-full flex flex-col items-center justify-center p-2"
                    onClick={() => setShowInitiateModel(true)}
                >
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mb-2">
                        <Workflow className="w-5 h-5 text-purple-600" />
                    </div>
                    <p className="text-xs text-gray-600 font-medium text-center">Create Flow Request</p>
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
                    <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                        {/* Ensure LeaveRequest is inside its providers */}
                        <LeaveRequestRefreshProvider>
                            <RequestLeaveModalProvider>
                                <LeaveRequest
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
                <InitiateFlow
                    handleCloseModel={() => setShowInitiateModel(false)}
                />
            )}
            {showAdvanceForm && (
                <Modal onClose={handleCloseAdvanceModal}>
                    <AdvanceForm user={user} onClose={handleCloseAdvanceModal} />
                </Modal>
            )}
        </div>
    }

    const mobileLayout = (
        <div className="flex flex-col min-h-screen bg-white">
            <HeaderBar title={"Requests"} onBack={() => navigate(-1)} />
            <main className="md:p-4 z-100 flex-grow overflow-y-auto">
                {requestsCards()}
                <Outlet />
            </main>
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


}




export default Requests;