import { useTargetUser } from "../../context/ViewedUserContext";
import {
    useCurrentEmployeeDetails,
    useGetEmployeeDetailsByEmpIdForProfile,
} from "../../hooks/useEmployee";

import defaultProfile from "../../assets/user.png";
import { Typography } from "../shared/atoms/Typography";
import Button from "../shared/atoms/Button";
import {
    ChevronRight,
    HelpCircle,
    CreditCard,
    ShieldCheck,
    LogOut,
    RotateCcwKey,
    Loader2,
    Building,
    MapPin,
    IdCard,
    Mail,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import useLogout from "../../hooks/useLogout";
import ChangePassword from "../ChangePassword/ChangePassword";
import { useState } from "react";


type QuickAction = {
    label: string;
    icon: React.ReactNode;
    href?: string;
    onClick?: () => void;
};


const MobileProfilePage = () => {
    const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
const handleReset = ()=>{
    setShowChangePasswordModal(true);
}

const quickActions: QuickAction[] = [
    {
        label: "Helpdesk",
        icon: <HelpCircle className="w-5 h-5" />,
        href: "/webapp/helpdesk",
    },
    {
        label: "Virtual ID Card",
        icon: <CreditCard className="w-5 h-5" />,
        href: "/webapp/id-card",
    },
    {
        label: "Policies",
        icon: <ShieldCheck className="w-5 h-5" />,
        href: "/webapp/policies-app",
    },{
        label: "Reset Password",
        icon: <RotateCcwKey className="w-5 h-5" />,
        onClick : handleReset
    }

];
    const navigate = useNavigate();
    const { targetEmployeeId } = useTargetUser();
    const { data: currentUser, isLoading: isCurrentUserLoading } =
        useCurrentEmployeeDetails({ logged_in_employee_details: true });

    const employeeId =
        targetEmployeeId ||
        (isCurrentUserLoading ? null : currentUser?.employee) ||
        "";

    const { data: empData } =
        useGetEmployeeDetailsByEmpIdForProfile(employeeId);

    const user = empData?.employee;
    const department = user?.department_display || user?.department_name || user?.department;
    const location = user?.branch_display || user?.branch_name || user?.branch;
    const empCode = user?.employee || user?.name || user?.employee_id;
    const email = user?.company_email || user?.personal_email || user?.email;
    
    const { mutateAsync: logout } = useLogout();
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const logoutHandler = async () => {
        if (isLoggingOut) return;
        setIsLoggingOut(true);
        try {
            if (window?.isApp && window?.nativeInterface?.execute) {
                await window.nativeInterface.execute("logout");
                alert("Logged out");
            } else {
                await logout();
            }
            sessionStorage.removeItem("viewed_employee_id");
        } catch (error) {
            console.error("Logout failed:", error);
            setIsLoggingOut(false);
        }
    };
    return (
        <div className="bg-white min-h-screen">
            {/* Profile Header */}
            <div className="flex items-start gap-4 border-b border-gray-200 px-4 py-4">
                <img
                    src={user?.image || defaultProfile}
                    alt="profile-pic"
                    className="w-16 h-16 rounded-full object-cover shrink-0"
                    onError={(e) => {
                        e.currentTarget.src = defaultProfile;
                    }}
                />

                <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                    <Typography variant="subheading" className="font-bold text-gray-900 leading-tight truncate">
                        {user?.employee_name}
                    </Typography>

                    <div className="flex flex-col gap-1 text-xs">
                        {department && (
                            <div className="flex items-center gap-1.5 text-primary-600 font-medium">
                                <Building size={14} className="text-primary-500 shrink-0" />
                                <span className="truncate">{department}</span>
                            </div>
                        )}

                        {location && (
                            <div className="flex items-center gap-1.5 text-primary-600 font-medium">
                                <MapPin size={14} className="text-primary-500 shrink-0" />
                                <span className="line-clamp-1">{location}</span>
                            </div>
                        )}

                        {empCode && (
                            <div className="flex items-center gap-1.5 text-gray-500">
                                <IdCard size={14} className="text-gray-400 shrink-0" />
                                <span className="truncate">{empCode}</span>
                            </div>
                        )}

                        {email && (
                            <div className="flex items-center gap-1.5 text-gray-500">
                                <Mail size={14} className="text-gray-400 shrink-0" />
                                <span className="truncate">{email}</span>
                            </div>
                        )}
                    </div>


                    <Button
                        variant="contain"
                        size="sm"
                        className="w-fit mt-1.5 px-3"
                        onClick={() => navigate("/webapp/employee-profile")}
                    >
                        View Profile
                    </Button>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="space-y-1 mt-4 px-2">
                {quickActions.map((action) => {

                    if(action?.href)
                        return (
                            <Link
                                key={action.label}
                                to={action.href}
                                className="w-full block"
                            >
                                <div className="flex items-center justify-between rounded-lg px-3 py-3 hover:bg-gray-50 active:bg-gray-100">
                                    <div className="flex items-center gap-3">
                                        <span className="text-gray-700">
                                            {action.icon}
                                        </span>
                                        <Typography variant="bodyMedium" color="body2">
                                            {action.label}
                                        </Typography>
                                    </div>

                                    <ChevronRight className="w-4 h-4 text-gray-400" />
                                </div>
                            </Link>
                        )
                        else{
                            return (
                                   <div 
                                onClick={action.onClick}
                                   className="flex items-center justify-between rounded-lg px-3 py-3 hover:bg-gray-50 active:bg-gray-100">
                                    <div className="flex items-center gap-3">
                                        <span className="text-gray-700">
                                            {action.icon}
                                        </span>
                                        <Typography variant="bodyMedium" color="body2">
                                            {action.label}
                                        </Typography>
                                    </div>

                                    <ChevronRight className="w-4 h-4 text-gray-400" />
                                </div>
                            )
                        }
                })}
            </div>
            <div
                onClick={logoutHandler}
                className={`w-full mt-0 px-2 cursor-pointer ${isLoggingOut ? "pointer-events-none opacity-50" : ""}`}
            >
                <div className={`flex items-center justify-between rounded-lg px-3 py-3 transition-colors ${
                    isLoggingOut ? "bg-error text-white" : "hover:bg-gray-50 active:bg-gray-100"
                }`}>
                    <div className="flex items-center gap-3">
                        <span className={isLoggingOut ? "text-white" : "text-gray-700"}>
                            {isLoggingOut ? (
                                <Loader2 className="w-5 h-5 animate-spin text-white" />
                            ) : (
                                <LogOut className="w-5 h-5 text-error" />
                            )}
                        </span>
                        <Typography variant="bodyMedium" color={isLoggingOut ? "white" : "error"}>
                            {isLoggingOut ? "Logging out..." : "Logout"}
                        </Typography>
                    </div>

                    <ChevronRight className={`w-4 h-4 ${isLoggingOut ? "text-white" : "text-gray-400"}`} />
                </div>
            </div>
            <ChangePassword
                    isOpen={showChangePasswordModal}
                    onClose={() => setShowChangePasswordModal(false)}
                  />
        </div>
    );
};

export default MobileProfilePage;
