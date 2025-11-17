// import HRLetters from "./HRLetters";
import HeaderBar from "../HeaderBar";
import { useNavigate, useParams } from "react-router-dom";
import {
  useCurrentEmployeeAllDetails,
  useGetEmployeeDetailsByEmpId,
  useShowAttendanaceAssignmentButton,
  useFileUpload,
} from "../../hooks/useEmployee";
import { Employee } from "../../types/employee";
import defaultProfile from "../../assets/user.png";

import DesktopLayoutWrapper from "../DesktopLayoutWrapper";
import { useScreenSize } from "../../hooks/useScreenSize";
import { useMemo, useRef, useState } from "react";
import { NotebookPen, Pencil } from "lucide-react";
import EmployeeProfileForm from "./EmployeeProfileForm";
import NavigationTabs, { Tab } from "../NavigationTab";
import TwoLevelOrgChart from "../ORGChart/OrgnazationChartForTwoLavel";
import EmploymentHistory from "../MyProfile/EmploymentHistory";
import Button from "../shared/atoms/Button";
import AttendanceAssignments from "../Attendance/AttendanceAssignments";
import ShowHolidays from "./ShowHolidays";
import { useLoggedInUser } from "../../hooks/useLoggedInUser";
import { useUpdateFrappeDocument } from "../../hooks/useFrappeQuery";
import toast from "react-hot-toast";
import CircularLoader from "../shared/atoms/CircularLoader";
import DocumentLibrary from "../Library/Library";

export interface PersonalInfoProps {
  user: Employee | null | undefined;
  refetch?: () => void;
}

const EmployeeProfile: React.FC = () => {
  const { isDesktop } = useScreenSize();
  const { id: employeeId } = useParams<{ id: string }>();
  const { data: user, refetch: userRefetch } = useGetEmployeeDetailsByEmpId(
    employeeId || ""
  );
  const { data: userId } = useLoggedInUser();

  const { data: currentUser, refetch: currentUserRefetch } =
    useCurrentEmployeeAllDetails(userId || "");

  const { data: showAttendanceAssignment } = useShowAttendanaceAssignmentButton(
    employeeId || "",
    currentUser?.employee || ""
  );
  const [isAttendanceAssignmentsOpen, setIsAttendanceAssignmentsOpen] =
    useState(false);
  const navigate = useNavigate();
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const uploadMutation = useFileUpload();
  const updateDocMutation = useUpdateFrappeDocument();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageClick = () => fileInputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedImage(URL.createObjectURL(file));
      uploadMutation.mutate(file, {
        onSuccess(data) {
          updateDocMutation.mutate(
            {
              doctype: "Employee",
              name: employeeId || "",
              data: {
                image: data?.file_url,
              },
            },
            {
              onSuccess() {
                currentUserRefetch();
                userRefetch();
                toast.success("Updated data successfully.");
              },
              onError(err) {
                toast.error("Failed to update data.");
                console.warn("Form submission error -", err);
              },
            }
          );
        },
        onError(e) {
          setUploadedImage(null);
          toast.error("File upload failed.");
          console.error("File upload error -", e);
        },
      });
    }
  };

  const tabs: Tab[] = useMemo(
    () => [
      { key: "personal-info", label: "Personal Info" },
      { key: "ORG-chart", label: "Organization Chart" },
      { key: "employment-history", label: "Employment History" },
      { key: "employee-holidays", label: "Employee Holidays" },
      { key: "employee-documents", label: "Employee Documents" },
    ],
    []
  );
  const [activeTab, setActiveTab] = useState<string>(tabs[0].key);

  const tabContent: Record<string, React.ReactNode> = useMemo(
    () => ({
      "personal-info": <EmployeeProfileForm />,
      "ORG-chart": <TwoLevelOrgChart />,
      "employment-history": <EmploymentHistory employeeId={user?.employee} />,
      "employee-holidays": <ShowHolidays />,
      "employee-documents": <DocumentLibrary />,
    }),
    [user]
  );

  const mobileLayout = (
    <div className="bg-white font-sans scroll-smooth">
      <div className="bg-white shadow">
        <div className="bg-white shadow">
          <HeaderBar title="Profile" onBack={() => navigate(-1)} />
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
                className="w-24 h-24 rounded-xl object-contain"
              />
              <button
                onClick={handleImageClick}
                className="absolute bottom-0 right-0 h-7 w-7 bg-white flex justify-center items-center p-1 rounded-full shadow focus:outline-none"
                aria-label="Upload new avatar"
              >
                {updateDocMutation.isPending || uploadMutation.isPending ? (
                  <CircularLoader size="sm" />
                ) : (
                  <Pencil size={16} />
                )}{" "}
              </button>
            </div>
            <h1 className="mt-4 text-xl font-semibold">
              {user?.employee_name}
            </h1>
            <p className="text-gray-500 mt-1">{user?.designation}</p>
            <p className="text-gray-400 text-sm">
              Employee ID: {user?.employee}
            </p>
          </div>
          <div className="px-4 w-full flex justify-center">
            {showAttendanceAssignment ? (
              <Button
                icon={<NotebookPen size={"1rem"} />}
                size="md"
                bgColor="blue-50"
                variant="contain"
                textColor="blue-600"
                onClick={() => setIsAttendanceAssignmentsOpen(true)}
              >
                Attendance Assignment
              </Button>
            ) : (
              <></>
            )}
          </div>
        </div>{" "}
        <div className="bg-gray-100">
          <NavigationTabs
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
          <div className="flex-grow">{tabContent[activeTab]}</div>
        </div>
      </div>
      <AttendanceAssignments
        open={isAttendanceAssignmentsOpen}
        onClose={() => setIsAttendanceAssignmentsOpen(false)}
      />
    </div>
  );

  const desktopLayout = (
    <DesktopLayoutWrapper title="Profile">
      <div className="grid grid-cols-1 md:grid-cols-[1fr_3fr] h-full bg-gray-50 p-6 gap-2">
        {/* Profile Sidebar */}
        <div className="overflow-y-auto scrollbar-hide bg-white border rounded-xl">
          <div className=" h-full px-8">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              id="upload-image"
              className="hidden"
              onChange={handleFileChange}
            />
            <div className="py-8 flex flex-col gap-2">
              {/* Profile Header */}
              <div className="flex flex-col items-center pb-6 bg-white shadow-sm rounded-xl">
                <div className="relative">
                  <div className="w-32 rounded-full ring-4 ring-white overflow-hidden">
                    <img
                      src={uploadedImage || user?.image || defaultProfile}
                      alt="User avatar"
                      className="w-full h-full object-contain"
                    />
                  </div>

                  <button
                    onClick={handleImageClick}
                    className="absolute bottom-2 -right-2 bg-blue-600 h-10 w-10 flex justify-center items-center p-1 hover:bg-blue-700 text-white rounded-full shadow-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    aria-label="Upload new avatar"
                  >
                    {updateDocMutation.isPending || uploadMutation.isPending ? (
                      <CircularLoader size="sm" color="white" />
                    ) : (
                      <Pencil size={16} />
                    )}
                  </button>
                </div>
                <div className="text-center mt-6">
                  <h1 className="text-2xl font-bold text-gray-900 truncate">
                    {user?.employee_name}
                  </h1>
                  <p className="text-blue-600 font-medium mt-1 truncate">
                    {user?.designation}
                  </p>
                  <p className="text-gray-500 text-sm mt-1 truncate">
                    ID: {user?.employee}
                  </p>
                </div>
                <div className="mt-2">
                  {showAttendanceAssignment ? (
                    <Button
                      icon={<NotebookPen size={"1rem"} />}
                      size="md"
                      bgColor="blue-50"
                      variant="contain"
                      textColor="blue-600"
                      fullWidth
                      onClick={() => setIsAttendanceAssignmentsOpen(true)}
                    >
                      Attendance Assignment
                    </Button>
                  ) : (
                    <></>
                  )}
                </div>
              </div>
              <div className="mt-2 bg-white rounded-xl shadow-sm py-6">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">
                  Profile Sections
                </h3>
                <nav className="space-y-2">
                  {tabs.map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={`w-full text-left px-5 py-4 rounded-xl text-sm font-medium transition-all duration-200 ${
                        activeTab === tab.key
                          ? "bg-blue-600 text-white "
                          : "text-gray-700 hover:bg-blue-50 hover:text-blue-600"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </nav>
              </div>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="overflow-y-auto max-w-full border rounded-xl bg-white">
          <div className="mx-auto">
            <div className="min-h-[600px]">{tabContent[activeTab]}</div>
          </div>
        </div>
      </div>
      <AttendanceAssignments
        open={isAttendanceAssignmentsOpen}
        onClose={() => setIsAttendanceAssignmentsOpen(false)}
      />
    </DesktopLayoutWrapper>
  );

  return isDesktop ? desktopLayout : mobileLayout;
};

export default EmployeeProfile;
