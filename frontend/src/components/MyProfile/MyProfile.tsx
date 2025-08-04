import React, { useEffect, useMemo, useRef, useState } from "react";
import PersonalInfo from "./PersonalInfo";
import ContactInfo from "./ContactInfo";
import AddressInfo from "./AddressInfo";
import CompanyInfo from "./CompanyInfo";
import SalaryInfo from "./SalaryInfo";
import HRLetters from "./HRLetters";
import HeaderBar from "../HeaderBar";
import { useNavigate } from "react-router-dom";
import { useLoggedInUser } from "../../hooks/useLoggedInUser";
import {
  useCurrentEmployeeAddress,
  useCurrentEmployeeAllDetails,
} from "../../hooks/useEmployee";
import { Employee } from "../../types/employee";
import { Pencil } from "lucide-react";
import defaultProfile from "../../assets/user.png";
import { Toaster } from "react-hot-toast";

type TabKey =
  | "personal-info"
  | "contact-info"
  | "address"
  | "company-info"
  | "salary-info"
  | "hr-letters";

export interface PersonalInfoProps {
  user: Employee | null | undefined;
  refetch?: () => void;
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
const NavTab: React.FC<NavTabProps> = ({
  label,
  isActive,
  hasNotification,
  onClick,
}) => (
  <button
    className={`flex flex-col items-center justify-center border-b-4 pb-3 pt-3 flex-1 outline-none focus:outline-none relative cursor-pointer min-w-[7rem] ${
      isActive
        ? "border-b-blue-500 text-blue-500"
        : "border-b-transparent text-gray-600 hover:text-gray-800"
    }`}
    onClick={onClick}
  >
    <span className="text-sm font-semibold">{label}</span>
    {hasNotification && (
      <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
    )}
  </button>
);

const Navigation: React.FC<NavigationProps> = ({
  tabs,
  activeTab,
  onTabChange,
}) => (
  <nav className="sticky top-0 z-10 bg-white">
    <div className="flex overflow-x-auto border-b border-gray-200 px-4 hide-scrollbar">
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

const MyProfile: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const tabs: Tab[] = useMemo(
    () => [
      { key: "personal-info", label: "Personal Info" },
      { key: "contact-info", label: "Contact Info" },
      { key: "address", label: "Address" },
      { key: "company-info", label: "Company Info" },
      { key: "salary-info", label: "Salary Info" },
      { key: "hr-letters", label: "HR Letters" },
    ],
    []
  );
  const [activeTab, setActiveTab] = useState<TabKey>(tabs[0].key);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);

  const { data: userId } = useLoggedInUser();
  const { data: user, refetch } = useCurrentEmployeeAllDetails(userId || "");
  const { data: userAddress, refetch: refetchAddress } =
    useCurrentEmployeeAddress(userId || "");

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [activeTab]);

  const tabContent: Record<TabKey, React.ReactNode> = useMemo(
    () => ({
      "personal-info": <PersonalInfo user={user} refetch={refetch} />,
      "contact-info": <ContactInfo user={user} refetch={refetch} />,
      address: <AddressInfo user={userAddress} refetch={refetchAddress} />,
      "company-info": <CompanyInfo user={user} />,
      "salary-info": <SalaryInfo user={user} />,
      "hr-letters": <HRLetters />,
    }),
    [user, userAddress]
  );

  const handleImageClick = () => fileInputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedImage(URL.createObjectURL(file));
    }
  };

  return (
    <div className="bg-white font-sans scroll-smooth">
      <div className="bg-white shadow">
        <HeaderBar title="My Profile" onBack={() => navigate(-1)} />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          id="upload-image"
          className="hidden"
          onChange={handleFileChange}
        />
        <div className="flex flex-col items-center py-6">
          <div className="relative">
            <img
              src={uploadedImage || user?.image || defaultProfile}
              alt="User avatar"
              className="w-24 h-24 rounded-xl object-cover"
            />
            <button
              onClick={handleImageClick}
              className="absolute bottom-0 right-0 bg-white p-1 rounded-full shadow focus:outline-none"
              aria-label="Upload new avatar"
            >
              <Pencil size={16} />
            </button>
          </div>
          <h1 className="mt-4 text-xl font-semibold">{user?.employee_name}</h1>
          <p className="text-gray-500 mt-1">{user?.designation}</p>
          <p className="text-gray-400 text-sm">Employee ID: {user?.employee}</p>
        </div>
      </div>
      <div className="bg-gray-100">
        <Navigation
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
        <div className="flex-grow">{tabContent[activeTab]}</div>
      </div>
      <Toaster position="top-center" containerClassName="z-50" />
    </div>
  );
};

export default MyProfile;
