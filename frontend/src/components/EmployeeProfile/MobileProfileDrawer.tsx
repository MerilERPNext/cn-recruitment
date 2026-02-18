import { useTargetUser } from "../../context/ViewedUserContext";
import {
    useCurrentEmployeeAllDetails,
    useGetEmployeeDetailsByEmpIdForProfile,
} from "../../hooks/useEmployee";
import { useLoggedInUser } from "../../hooks/useLoggedInUser";
import defaultProfile from "../../assets/user.png";
import { Typography } from "../shared/atoms/Typography";
import Button from "../shared/atoms/Button";
import { ChevronRight } from "lucide-react";
import {
    HelpCircle,
    CreditCard,
    ShieldCheck,
    LogOut,
} from "lucide-react";
import { Link } from "react-router-dom";
import useLogout from "../../hooks/useLogout";

type QuickAction = {
    label: string;
    icon: React.ReactNode;
    href: string;
    onClick?: () => void;
};

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
    },

];


const MobileProfileDrawer = () => {
    const { targetEmployeeId } = useTargetUser();
    const { data: userId } = useLoggedInUser();
    const { data: currentUser, isLoading: isCurrentUserLoading } =
        useCurrentEmployeeAllDetails(userId || "");

    const employeeId =
        targetEmployeeId ||
        (isCurrentUserLoading ? null : currentUser?.employee) ||
        "";

    const { data: empData } =
        useGetEmployeeDetailsByEmpIdForProfile(employeeId);

    const user = empData?.employee;
    const { mutateAsync: logout } = useLogout();
    const logoutHandler = async () => {
        try {
             if (window.isApp) {
                window.nativeInterface.execute("logout").then(() => {
                    alert("Logged out");
                })
            } else {
                await logout();
            }
        } catch (error) {
            console.error("Logout failed:", error);
        }
    };
    return (
        <div>
            {/* Profile Header */}
            <div className="flex items-start gap-4 border-b border-gray-200 px-4 py-4">
                <img
                    src={user?.image || defaultProfile}
                    alt="profile-pic"
                    className="w-14 h-14 rounded-full object-cover"
                    onError={(e) => {
                        e.currentTarget.src = defaultProfile;
                    }}
                />

                <div className="flex flex-col gap-1 flex-1">
                    <Typography variant="subheading" className="leading-tight">
                        {user?.employee_name}
                    </Typography>

                    <div className="flex flex-wrap items-center gap-1 text-gray-500">
                        <Typography variant="bodySmall">
                            {user?.designation_display}
                        </Typography>
                        <span className="text-xs">|</span>
                        <Typography variant="bodySmall">
                            {user?.name}
                        </Typography>
                    </div>

                    <Button
                        variant="contain"
                        size="sm"
                        className="w-fit mt-2 px-3"
                    >
                        <Link to="/webapp/employee-profile">
                            View Profile
                        </Link>
                    </Button>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="space-y-1 mt-4">
                {quickActions.map((action) => {

                    return (
                        <Link
                            key={action.label}
                            to={action.href}
                            className="w-full"
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
                    );
                })}
            </div>
            <div

                onClick={logoutHandler}
                className="w-full mt-0"
            >
                <div className="flex items-center justify-between rounded-lg px-3 py-3 hover:bg-gray-50 active:bg-gray-100">
                    <div className="flex items-center gap-3">
                        <span className="text-gray-700">
                            <LogOut className="w-5 h-5 text-error" />
                        </span>
                        <Typography variant="bodyMedium" color="error">
                            Logout
                        </Typography>
                    </div>

                    <ChevronRight className="w-4 h-4 text-gray-400" />
                </div>
            </div>
        </div>
    );
};

export default MobileProfileDrawer;
