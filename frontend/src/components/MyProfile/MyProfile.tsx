import React, { useMemo, useState } from "react";
import PersonalInfo from "./PersonalInfo";
import ContactInfo from "./ContactInfo";
import AddressInfo from "./AddressInfo";
import CompanyInfo from "./CompanyInfo";
import SalaryInfo from "./SalaryInfo";
import HeaderBar from "../HeaderBar";
import { useNavigate } from "react-router";
import { useLoggedInUser } from "../../hooks/useLoggedInUser";
import { useCurrentEmployeeAllDetails } from "../../hooks/useEmployee";
import { Employee } from "../../types/employee";
import HRPolicies from "./HRPolicies";
import { Pencil } from "lucide-react";
import defaultProfile from "../../assets/user.png";

type TabKey =
  | "personal-info"
  | "contact-info"
  | "address"
  | "company-info"
  | "salary-info"
  | "hr-letters";

export interface PersonalInfoProps {
  user: Employee | null | undefined;
}

interface Tab {
  key: TabKey;
  label: string;
  hasNotification?: boolean;
}

// Props for each navigation tab
interface NavTabProps {
  label: string;
  isActive: boolean;
  hasNotification?: boolean;
  onClick: () => void;
}

// Props for Navigation container
interface NavigationProps {
  tabs: Tab[];
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
}

// Navigation Tab Component
const NavTab = ({ label, isActive, hasNotification, onClick }: NavTabProps) => (
  <button
    className={`flex flex-col items-center justify-center border-b-[3px] pb-3 pt-3 flex-1 relative cursor-pointer min-w-28 ${
      isActive
        ? "border-b-blue-500 text-blue-500"
        : "border-b-transparent text-gray-600 hover:text-gray-800"
    }`}
    onClick={onClick}
  >
    <p className="text-sm font-semibold">{label}</p>
    {hasNotification && (
      <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
    )}
  </button>
);

// Navigation Component
const Navigation: React.FC<NavigationProps> = ({
  tabs,
  activeTab,
  onTabChange,
}) => (
  <nav className="sticky top-0 z-10 bg-white pb-0">
    <div className="flex overflow-x-auto flex-nowrap border-b border-gray-200 px-4 space-x-4 hide-scrollbar">
      {tabs.map((tab) => (
        <NavTab
          key={tab.key}
          label={tab.label}
          isActive={activeTab === tab.key}
          hasNotification={tab.hasNotification}
          onClick={() => onTabChange(tab.key)}
        />
      ))}
    </div>
  </nav>
);

// Main component
const MyProfile: React.FC = () => {
  const tabs: Tab[] = [
    { key: "personal-info", label: "Personal Info" },
    { key: "contact-info", label: "Contact Info" },
    { key: "address", label: "Address" },
    { key: "company-info", label: "Company Info" },
    { key: "salary-info", label: "Salary Info" },
    { key: "hr-letters", label: "HR letters" },
  ];
  const navigate = useNavigate();

  const { data: user_id } = useLoggedInUser();

  const { data: user } = useCurrentEmployeeAllDetails(user_id || "");

  // State to track active tab
  const [activeTab, setActiveTab] = useState<TabKey>(tabs[0].key);

  const tabContent: Record<TabKey, React.ReactNode> = useMemo(
    () => ({
      "personal-info": <PersonalInfo user={user} />,
      "contact-info": <ContactInfo user={user} />,
      address: <AddressInfo user={user} />,
      "company-info": <CompanyInfo user={user} />,
      "salary-info": <SalaryInfo user={user} />,
      "hr-letters": <HRPolicies />,
    }),
    [user]
  );

  return (
    <div className="bg-white font-sans">
      {/* User Info Header */}
      <div className="bg-white shadow">
        <HeaderBar title="My Profile" onBack={() => navigate(-1)} />
        <div className="flex flex-col items-center py-6">
          <div className="relative">
            <img
              src={user?.image || defaultProfile}
              alt="User avatar"
              className="w-24 h-24 rounded-full object-cover"
            />
            <button className="absolute bottom-0 right-0 bg-white p-1 rounded-full shadow">
              <Pencil />
            </button>
          </div>
          <h1 className="mt-4 text-xl font-semibold">{user?.employee_name}</h1>
          <p className="text-gray-500 mt-1">{user?.designation}</p>
          <p className="text-gray-400 text-sm">Employee ID: {user?.employee}</p>
        </div>
      </div>
      <div className="min-h-screen bg-gray-100">
        {/* Sticky Tabs */}
        <Navigation
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        {/* Tab Content */}
        <div className="flex-grow p-4">{tabContent[activeTab]}</div>
      </div>
    </div>
  );
};

export default MyProfile;
