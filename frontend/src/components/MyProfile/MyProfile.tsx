import React, { useEffect, useMemo, useRef, useState } from "react";
import PersonalInfo from "./PersonalInfo";
import ContactInfo from "./ContactInfo";
import AddressInfo from "./AddressInfo";
import CompanyInfo from "./CompanyInfo";
import SalaryInfo from "./SalaryInfo";
// import HRLetters from "./HRLetters";
import HeaderBar from "../HeaderBar";
import { useNavigate } from "react-router-dom";
import {
  useCurrentEmployeeAddress,
  useCurrentEmployeeAllDetails,
} from "../../hooks/useEmployee";
import { Employee } from "../../types/employee";
import { Pencil } from "lucide-react";
import defaultProfile from "../../assets/user.png";
import NavigationTabs, { Tab } from "../NavigationTab";
import DesktopLayoutWrapper from "../DesktopLayoutWrapper";
import { useScreenSize } from "../../hooks/useScreenSize";
import EmploymentHistory from "./EmploymentHistory";
import TwoLevelOrgChart from "../ORGChart/OrgnazationChartForTwoLavel";
import DocumentLibrary from "../Library/Library";

export interface PersonalInfoProps {
  user: Pick<Employee, "date_of_birth" | "gender" | "marital_status" | "blood_group" | "employee_name" | "person_to_be_contacted" | "emergency_phone_number" | "employee"> | null | undefined;
  refetch?: () => void;
}

export interface ContactInfoProps {
  user: Pick<Employee, "cell_number" | "personal_email" | "company_email" | "employee"> | null | undefined;
  refetch?: () => void;
}

export interface CompanyInfoProps {
  user:
  | Pick<
    Employee,
    | "employee"
    | "department"
    | "designation"
    | "reports_to"
    | "date_of_joining"
    | "employment_type"
    | "branch"
    | "default_shift"
    | "company"
    | "status"
    | "final_confirmation_date"
    | "contract_end_date"
    | "grade"
    | "payroll_cost_center"
  >
  | null
  | undefined;
  refetch?: () => void;
}

export interface SalaryInfoProps {
  user:
  | Pick<
    Employee,
    | "ctc"
    | "salary_currency"
    | "provident_fund_account"
    | "pan_number"
    | "bank_name"
    | "bank_ac_no"
    | "ifsc_code"
  >
  | null
  | undefined;
  refetch?: () => void;
}

const MyProfile: React.FC = () => {
  const { isDesktop } = useScreenSize();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const tabs: Tab[] = useMemo(
    () => [
      { key: "personal-info", label: "Personal Info" },
      { key: "contact-info", label: "Contact Info" },
      { key: "address", label: "Address" },
      { key: "company-info", label: "Company Info" },
      { key: "salary-info", label: "Salary Info" },
      { key: "ORG-chart", label: "Organization Chart" },
      // { key: "hr-letters", label: "HR Letters" },
      { key: "employment-history", label: "Employment History" },
    ],
    []
  );
  const [activeTab, setActiveTab] = useState<string>(tabs[0].key);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);

  const { data: user } = useCurrentEmployeeAllDetails(undefined, undefined,
    ["user_id",
      "employee_name",
      "image",
      "designation",
      "department",
      "reports_to",
      "date_of_joining",
      "employment_type",
      "branch",
      "default_shift",
      "company",
      "status",
      "final_confirmation_date",
      "contract_end_date",
      "grade",
      "payroll_cost_center",
      "employee",
      "date_of_birth",
      "gender",
      "marital_status",
      "blood_group",
      "person_to_be_contacted",
      "emergency_phone_number",
      "ctc",
      "salary_currency",
      "provident_fund_account",
      "pan_number",
      "bank_name",
      "bank_ac_no",
      "ifsc_code"
    ]);

  const { data: userAddress } = useCurrentEmployeeAddress(user?.user_id || "");

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [activeTab]);

  const tabContent: Record<string, React.ReactNode> = useMemo(
    () => ({
      "personal-info": <PersonalInfo user={user} />,
      "contact-info": <ContactInfo user={user} />,
      address: <AddressInfo userAddress={userAddress?.data} user={user} />,
      "company-info": <CompanyInfo user={user} />,
      "salary-info": <SalaryInfo user={user} />,
      "ORG-chart": <TwoLevelOrgChart />,
      // "hr-letters": <HRLetters />,
      "employment-history": <EmploymentHistory employeeId={user?.employee} />,
      "document-library": <DocumentLibrary />,
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

  const mobileLayout = (
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
        <NavigationTabs
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
        <div className="flex-grow">{tabContent[activeTab]}</div>
      </div>
    </div>
  );

  const desktopLayout = (
    <DesktopLayoutWrapper title="My Profile">
      <div className="flex h-full bg-gray-50">
        {/* Profile Sidebar */}
        <div className="w-96 bg-white border-r border-gray-200 flex-shrink-0 shadow-sm overflow-y-auto scrollbar-hide">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            id="upload-image"
            className="hidden"
            onChange={handleFileChange}
          />
          <div className="p-8">
            {/* Profile Header */}
            <div className="flex flex-col items-center bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-8 mb-8 border border-blue-100">
              <div className="relative">
                <div className="w-32 h-32 rounded-2xl overflow-hidden ring-4 ring-white shadow-lg">
                  <img
                    src={uploadedImage || user?.image || defaultProfile}
                    alt="User avatar"
                    className="w-full h-full object-cover"
                  />
                </div>
                <button
                  onClick={handleImageClick}
                  className="absolute -bottom-2 -right-2 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  aria-label="Upload new avatar"
                >
                  <Pencil size={16} />
                </button>
              </div>
              <div className="text-center mt-6">
                <h1 className="text-2xl font-bold text-gray-900">
                  {user?.employee_name}
                </h1>
                <p className="text-blue-600 font-medium mt-1">
                  {user?.designation}
                </p>
                <p className="text-gray-500 text-sm mt-1">
                  ID: {user?.employee}
                </p>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">
                Profile Sections
              </h3>
              <nav className="space-y-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`w-full text-left px-5 py-4 rounded-xl text-sm font-medium transition-all duration-200 ${activeTab === tab.key
                      ? "bg-black text-white shadow-lg shadow-black/20"
                      : "text-gray-700 hover:bg-gray-100 hover:shadow-sm"
                      }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-8 max-w-4xl mx-auto">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 min-h-[600px]">
              {tabContent[activeTab]}
            </div>
          </div>
        </div>
      </div>
    </DesktopLayoutWrapper>
  );

  return isDesktop ? desktopLayout : mobileLayout;
};

export default MyProfile;
