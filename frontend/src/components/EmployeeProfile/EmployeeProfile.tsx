// import HRLetters from "./HRLetters";
import HeaderBar from "../HeaderBar";
import { useNavigate } from "react-router-dom";
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
import { useMemo, useRef, useState, useEffect, useCallback } from "react";
import { NotebookPen, Pencil } from "lucide-react";
import { Tab } from "../NavigationTab";
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
import Tooltip from "../shared/Tooltip";
import { useTargetUser } from "../../context/ViewedUserContext";
import { useQueryClient } from "@tanstack/react-query";
import EmployeeProfileSections from "./EmployeeProfileSections";
// import ReportingDetails from "./ReportingDetails";

export interface PersonalInfoProps {
  user: Employee | null | undefined;
  refetch?: () => void;
}

const EmployeeProfile: React.FC = () => {
  const { isDesktop } = useScreenSize();
  const { targetEmployeeId } = useTargetUser();
  const { data: userId } = useLoggedInUser();
  const { data: currentUser, isLoading: isCurrentUserLoading } =
    useCurrentEmployeeAllDetails(userId || "");

  const queryClient = useQueryClient();

  // Use targetEmployeeId if viewing another user, otherwise use current user's employee ID
  // Don't default to empty string until we know currentUser has loaded
  const employeeId =
    targetEmployeeId ||
    (isCurrentUserLoading ? null : currentUser?.employee) ||
    "";

  const {
    data: user,
    refetch: userRefetch,
    isLoading: userIsLoading,
  } = useGetEmployeeDetailsByEmpId(employeeId);

  const { data: showAttendanceAssignment } = useShowAttendanaceAssignmentButton(
    employeeId,
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
              name: employeeId,
              data: {
                image: data?.file_url,
              },
            },
            {
              onSuccess() {
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
      { key: "personal-information", label: "Personal Information" },
      { key: "ORG-chart", label: "Organization Chart" },
      { key: "employment-history", label: "Employment History" },
      // { key: "reporting-details", label: "Reporting Details" },
      { key: "employee-holidays", label: "Employee Holidays" },
      { key: "employee-documents", label: "Employee Documents" },
    ],
    []
  );
  const [activeTab, setActiveTab] = useState<string>(tabs[0].key);

  // Create refs for each section
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Create ref for the scrollable container (desktop layout)
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const tabContent: Record<string, React.ReactNode> = useMemo(
    () => ({
      "personal-information": <EmployeeProfileSections />,
      "ORG-chart": <TwoLevelOrgChart />,
      "employment-history": <EmploymentHistory employeeId={user?.employee} />,
      "employee-holidays": <ShowHolidays />,
      "employee-documents": <DocumentLibrary />,
      // "reporting-details": <ReportingDetails />,
    }),
    [user]
  );

  // Scroll to section when tab is clicked
  const scrollToSection = useCallback((key: string) => {
    const section = sectionRefs.current[key];
    if (section) {
      section.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  //refetching of the ui permission
  useEffect(() => {
    queryClient.invalidateQueries({
      queryKey: ["ui-permission"],
    });
  }, [queryClient]);

  // Intersection Observer for scroll-spy
  useEffect(() => {
    const observerOptions = {
      root: scrollContainerRef.current, // Use scroll container for desktop, null for mobile
      rootMargin: "-100px 0px -66% 0px",
      threshold: [0, 0.25, 0.5, 0.75, 1],
    };

    let currentIntersecting: { id: string; ratio: number }[] = [];

    const observerCallback = (entries: IntersectionObserverEntry[]) => {
      // Update the list of intersecting sections
      entries.forEach((entry) => {
        const sectionId = entry.target.getAttribute("data-section");
        if (!sectionId) return;

        if (entry.isIntersecting) {
          // Add or update the section
          const existingIndex = currentIntersecting.findIndex(
            (item) => item.id === sectionId
          );
          if (existingIndex >= 0) {
            currentIntersecting[existingIndex].ratio = entry.intersectionRatio;
          } else {
            currentIntersecting.push({
              id: sectionId,
              ratio: entry.intersectionRatio,
            });
          }
        } else {
          // Remove the section
          currentIntersecting = currentIntersecting.filter(
            (item) => item.id !== sectionId
          );
        }
      });

      // Find the section with the highest intersection ratio
      if (currentIntersecting.length > 0) {
        const mostVisible = currentIntersecting.reduce((prev, current) =>
          current.ratio > prev.ratio ? current : prev
        );
        setActiveTab(mostVisible.id);
      }
    };

    const observer = new IntersectionObserver(
      observerCallback,
      observerOptions
    );

    // Observe all sections
    Object.values(sectionRefs.current).forEach((section) => {
      if (section) {
        observer.observe(section);
      }
    });

    return () => {
      observer.disconnect();
    };
  }, [isDesktop]); // Re-run when layout changes

  const HeaderInfoSkeleton = () => {
    return (
      <div className="border rounded-tl-lg rounded-tr-lg p-6">
        <div className="flex flex-col md:flex-row md:items-center gap-6 animate-pulse">
          {/* Avatar Skeleton */}
          <div className="relative self-center md:self-center">
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-gray-200"></div>
            <div className="absolute bottom-0 -right-2 h-8 w-8 md:h-10 md:w-10 rounded-full bg-gray-300"></div>
          </div>

          <div className="flex flex-col items-center gap-2">
            {/* User Info Skeleton */}
            <div className="flex flex-col w-full space-y-1 justify-center items-center  md:justify-start md:items-start">
              <div className="h-5 w-24 bg-gray-200 rounded"></div>
              <div className="h-4 w-1/3 bg-gray-200 rounded"></div>
              <div className="h-3 w-1/2 bg-gray-200 rounded"></div>
            </div>

            {/* Button Skeleton */}
            <div className="w-1/4 md:w-auto">
              <div className="h-6 w-full md:w-40 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const mobileLayout = (
    <div className="bg-white font-sans scroll-smooth">
      <div className="bg-white shadow">
        {userIsLoading ? (
          <HeaderInfoSkeleton />
        ) : (
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
                  className="w-24 h-24 rounded-full object-contain"
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
              <Tooltip content={user?.designation}>
                <p className="text-gray-500 mt-1">
                  {user?.designation?.slice(0, 20)}
                </p>
              </Tooltip>
              <p className="text-gray-400 text-sm">
                Employee ID: {user?.employee}
              </p>
              {user?.custom_employment_status && (
                <span className="inline-block mt-2 px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded-[1000px]">
                  {user?.custom_employment_status}
                </span>
              )}
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
          </div>
        )}
        {/* Horizontal Tabs */}
        <div className="bg-white border-b sticky top-0 z-10">
          <div className="flex overflow-x-auto scrollbar-hide px-4 py-2">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => scrollToSection(tab.key)}
                className={`whitespace-nowrap px-4 py-2 text-sm font-medium transition-all duration-200 border-b-2 ${
                  activeTab === tab.key
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-600 hover:text-blue-600"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        {/* All Sections Rendered */}
        <div className="bg-white-100">
          {tabs.map((tab) => (
            <div
              key={tab.key}
              ref={(el) => {
                sectionRefs.current[tab.key] = el;
              }}
              data-section={tab.key}
              className="p-4"
            >
              {tabContent[tab.key]}
            </div>
          ))}
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
      <div className="flex flex-col h-full bg-gray-50 p-6 gap-4 w-full overflow-hidden">
        {/* Profile Header */}

        {/* All Sections Rendered */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide"
        >
          {userIsLoading ? (
            <HeaderInfoSkeleton />
          ) : (
            <div className="bg-white border rounded-tl-lg rounded-tr-lg p-6">
              <div className="flex items-center gap-6">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  id="upload-image"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <div className="relative">
                  <div className="w-24 h-24 rounded-full ring-4 ring-white overflow-hidden">
                    <img
                      src={uploadedImage || user?.image || defaultProfile}
                      alt="User avatar"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <button
                    onClick={handleImageClick}
                    className="absolute bottom-0 -right-2 bg-blue-600 h-10 w-10 flex justify-center items-center p-1 hover:bg-blue-700 text-white rounded-full shadow-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    aria-label="Upload new avatar"
                  >
                    {updateDocMutation.isPending || uploadMutation.isPending ? (
                      <CircularLoader size="sm" color="white" />
                    ) : (
                      <Pencil size={16} />
                    )}
                  </button>
                </div>
                <div className="flex-1">
                  <h1 className="text-2xl font-bold text-gray-900">
                    {user?.employee_name}
                  </h1>
                  <Tooltip content={user?.designation}>
                    <p className="text-blue-600 font-medium mt-1">
                      {user?.designation?.slice(0, 40)}
                    </p>
                  </Tooltip>
                  <p className="text-gray-500 text-sm mt-1">
                    ID: {user?.employee}
                  </p>
                  {user?.custom_employment_status && (
                    <span className="inline-block mt-2 px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded-[1000px]">
                      {user?.custom_employment_status}
                    </span>
                  )}
                </div>
                {showAttendanceAssignment && (
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
                )}
              </div>
            </div>
          )}
          {/* Horizontal Tabs - Sticky inside scroll container */}
          <div className="bg-white border-b sticky top-0 z-10">
            <div className="flex overflow-x-auto scrollbar-hide px-6 py-3 tracking-wide">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => scrollToSection(tab.key)}
                  className={`whitespace-nowrap px-6 py-3 text-sm font-medium transition-all duration-200 border-b-2 ${
                    activeTab === tab.key
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-gray-600 hover:text-blue-600"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {tabs.map((tab) => (
            <div
              key={tab.key}
              ref={(el) => {
                sectionRefs.current[tab.key] = el;
              }}
              data-section={tab.key}
              className="bg-white mb-4  w-full max-w-full"
            >
              {tabContent[tab.key]}
            </div>
          ))}
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
