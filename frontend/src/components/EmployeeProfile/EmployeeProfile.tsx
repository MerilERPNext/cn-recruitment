// import HRLetters from "./HRLetters";
import HeaderBar from "../HeaderBar";
import { useNavigate } from "react-router-dom";
import {
  useCurrentEmployeeAllDetails,
  useFileUpload,
  useGetEmployeeDetailsByEmpIdForProfile,
} from "../../hooks/useEmployee";
import { Employee } from "../../types/employee";
import defaultProfile from "../../assets/face-rec.png";

import DesktopLayoutWrapper from "../DesktopLayoutWrapper";
import { useScreenSize } from "../../hooks/useScreenSize";
import { useMemo, useRef, useState, useEffect, useCallback } from "react";
import { Award, IdCard, Mail, MapPin, NotebookPen, Pencil } from "lucide-react";
import { Tab } from "../NavigationTab";
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
import ReportingDetails from "./ReportingDetails";
import { Typography } from "../shared/atoms/Typography";
import { Card } from "../shared/atoms/Card";
import Badge from "../shared/Badge";

import { AwardsSection } from "./EmployeeAwards";
import Appreciations from "./Appreciations";

import { useGetUiPermission } from "../../hooks/userUiPermission";
import { isActionEnabled } from "../../utils/uiPermission";
import Overview from "./Overview/Overview";

export interface PersonalInfoProps {
  user: Employee | null | undefined;
  refetch?: () => void;
}

const EMPLOYEMENT_STATUS = {
  "on probation": "On Probation",
  "probation extended": "On Probation",
  confirm: "Active",
  "on notice period": "On Notice",
};

const EmployeeProfile: React.FC = () => {
  const { isDesktop } = useScreenSize();
  const { targetEmployeeId, isViewingOtherUser, clearTargetEmployee } =
    useTargetUser();
  const { data: userId } = useLoggedInUser();
  const { data: userUiPermission } = useGetUiPermission("Profile");
  const canAttendanceAssignments = isActionEnabled(
    userUiPermission,
    "attendance_assignments",
    "Employee Profile",
  );
  const canShowEmployeeStatus = isActionEnabled(
    userUiPermission,
    "show_employee_status",
    "Employee Profile",
  );
  const canAppreciate = isActionEnabled(
    userUiPermission,
    "can_appreciate",
    "Employee Profile",
  );
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
    data: empData,
    refetch: userRefetch,
    isLoading: userIsLoading,
  } = useGetEmployeeDetailsByEmpIdForProfile(employeeId);
  const user = empData?.employee;

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
            },
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
      { key: "overview", label: "Overview", permissionKey: 'show_overview' },
      { key: "personal-information", label: "Personal Information", permissionKey: "show_personal_information" },
      { key: "employment-history", label: "Employment History", permissionKey: "show_employment_history" },
      { key: "reporting-details", label: "Reporting Details", permissionKey: "show_reporting_details" },
      { key: "employee-holidays", label: "Employee Holidays", permissionKey: "show_employee_holidays" },
      { key: "employee-documents", label: "Employee Documents", permissionKey: "show_employee_documents" },
    ],
    [],
  );
  const permittedTabs = useMemo(() => {
    return tabs.filter((tab) => {
      if (!tab.permissionKey) return true;
      return isActionEnabled(
        userUiPermission,
        tab.permissionKey,
        "Employee Profile",
      );
    });
  }, [tabs, userUiPermission]);

  const [activeTab, setActiveTab] = useState<string>("");

  useEffect(() => {
    if (permittedTabs.length > 0 && !activeTab) {
      setActiveTab(permittedTabs[0].key);
    }
  }, [permittedTabs, activeTab]);

  // Create refs for each section
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Create ref for the scrollable container (desktop layout)
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const tabContent: Record<string, React.ReactNode> = useMemo(
    () => ({
      "overview": <Overview />,
      "personal-information": <EmployeeProfileSections />,
      "employment-history": <EmploymentHistory employeeId={user?.employee} />,
      "employee-holidays": <ShowHolidays />,
      "employee-documents": <DocumentLibrary />,
      "reporting-details": <ReportingDetails />,
    }),
    [user],
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
            (item) => item.id === sectionId,
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
            (item) => item.id !== sectionId,
          );
        }
      });

      // Find the section with the highest intersection ratio
      if (currentIntersecting.length > 0) {
        const mostVisible = currentIntersecting.reduce((prev, current) =>
          current.ratio > prev.ratio ? current : prev,
        );
        setActiveTab(mostVisible.id);
      }
    };

    const observer = new IntersectionObserver(
      observerCallback,
      observerOptions,
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
  }, [isDesktop, permittedTabs]); // Re-run when layout OR tabs change
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
            <HeaderBar
              title="Profile"
              onBack={() => {
                if (isViewingOtherUser) {
                  clearTargetEmployee();
                }
                navigate("/webapp/");
              }}
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              id="upload-image"
              className="hidden"
              onChange={handleFileChange}
            />
            <div className="flex items-start gap-5 px-6 py-6 border-b border-gray-50 bg-white">
              <div className="relative shrink-0">
                <img
                  src={uploadedImage || user?.image || defaultProfile}
                  alt="User avatar"
                  className="w-24 h-24 rounded-2xl object-cover ring-4 ring-blue-50/10 shadow-sm"
                />
                <button
                  onClick={handleImageClick}
                  className="absolute -bottom-1.5 -right-1.5 h-8 w-8 bg-white flex justify-center items-center p-1.5 rounded-xl shadow-lg border border-gray-100 hover:bg-gray-50 transition-all active:scale-95 text-primary-600"
                  aria-label="Upload new avatar"
                >
                  {updateDocMutation.isPending || uploadMutation.isPending ? (
                    <CircularLoader size="sm" color="blue-500" />
                  ) : (
                    <Pencil size={14} />
                  )}
                </button>
              </div>
              <div className="flex flex-col flex-1 min-w-0">
                <Typography
                  variant="h4"
                  className="font-bold truncate tracking-tight text-lg sm:text-xl"
                >
                  {user?.employee_name}
                </Typography>
                {user?.designation_display && (
                  <Tooltip content={user?.designation_display}>
                    <Typography
                      variant="bodySmall"
                      color="secondary"
                      className="font-medium truncate mt-1 flex gap-1.5 items-center"
                    >
                      <Award size={14} className="text-primary-500" />
                      <span>{user?.designation_display}</span>
                    </Typography>
                  </Tooltip>
                )}
                {user?.branch_display && (
                  <Typography
                    variant="bodySmall"
                    color="secondary"
                    className="font-medium truncate mt-1 flex gap-1.5 items-center"
                  >
                    <MapPin size={14} className="text-primary-500" />
                    <Tooltip content={user?.branch_display}>
                      <span className="line-clamp-1">{user?.branch_display}</span>
                    </Tooltip>

                  </Typography>
                )}
                {user?.employee && (
                  <Typography
                    variant="bodySmall"
                    color="disabled"
                    className="font-medium mt-1.5 flex gap-1.5 items-center uppercase tracking-wider"
                  >
                    <IdCard size={16} />
                    <span>{user?.employee}</span>
                  </Typography>
                )}
                {(user?.company_email || user?.personal_email) && (
                  <Typography
                    variant="bodySmall"
                    color="primary"
                    className="flex gap-1.5 items-center"
                  >
                    <Mail size={14} className="text-primary-500" />
                    <span>{user?.company_email || user?.personal_email}</span>
                  </Typography>
                )}
                <div className="flex flex-wrap items-center gap-3 mt-4">
                  {user?.custom_employment_status && canShowEmployeeStatus && (
                    <Badge
                      label={
                        EMPLOYEMENT_STATUS[
                        user?.custom_employment_status.toLowerCase() as keyof typeof EMPLOYEMENT_STATUS
                        ] || user?.custom_employment_status
                      }
                      size="sm"
                      backgroundColor={
                        user?.status === "Active"
                          ? "bg-success-50/50"
                          : "bg-gray-50"
                      }
                      textColor={
                        user?.status === "Active"
                          ? "text-success"
                          : "text-gray-600"
                      }
                      pulse={
                        user?.status === "Active"
                          ? { show: true, color: "bg-success" }
                          : undefined
                      }
                    />
                  )}

                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-4 mx-2">
              {canAppreciate && <Appreciations />}
              {
                canAttendanceAssignments && (
                  <Button
                    icon={<NotebookPen size={14} />}
                    size="sm"
                    variant="soft"
                    onClick={() =>
                      setIsAttendanceAssignmentsOpen(true)
                    }
                    className="text-[10px] font-bold uppercase tracking-wider"
                  >
                    Attendance Assignment
                  </Button>
                )}
            </div>
            <AwardsSection isDesktop={false} />
          </div>
        )}
        {/* Horizontal Tabs */}
        <div className="bg-white border-b sticky top-0 z-10">
          <div className="flex overflow-x-auto scrollbar-hide px-4 py-2">
            {permittedTabs?.map((tab) => (
              <Button
                key={tab.key}
                variant="subtle"
                onClick={() => scrollToSection(tab.key)}
                className={`whitespace-nowrap px-4 py-2 rounded-none text-sm font-medium transition-all duration-200 border-b-2 ${activeTab === tab.key
                  ? "border-primary-600 text-primary-600"
                  : "border-transparent text-gray-600 hover:text-primary-600"
                  }`}
              >
                {tab.label}
              </Button>
            ))}
          </div>
        </div>
        {/* All Sections Rendered */}
        <div className="bg-white-100">
          {permittedTabs?.map((tab) => (
            <div
              key={tab.key}
              ref={(el) => {
                sectionRefs.current[tab.key] = el;
              }}
              data-section={tab.key}
              className="px-4 py-3 md:py-6 scroll-mt-40 border-b border-gray-50 last:border-0"
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
      <div className="flex flex-col h-full p-6 gap-4 w-full overflow-hidden">
        {/* Profile Header */}

        {/* All Sections Rendered */}
        <div
          ref={scrollContainerRef}
          className="flex-1 rounded-md overflow-y-auto overflow-x-hidden scrollbar-hide"
        >
          {userIsLoading ? (
            <HeaderInfoSkeleton />
          ) : (
            <div>
              <div className="flex items-stretch justify-between gap-4 mb-4 w-full">
                <Card className="flex items-center gap-8 flex-1" shadow="none">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    id="upload-image-desktop"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <div className="relative group/avatar shrink-0">
                    <div className="w-[120px] h-[120px] rounded-full ring-4 ring-white shadow-md overflow-hidden ">
                      <img
                        src={uploadedImage || user?.image || defaultProfile}
                        alt="User avatar"
                        className="w-full h-full object-cover bg-gray-50 transition-transform duration-500 group-hover/avatar:scale-110"
                      />
                    </div>
                    <button
                      onClick={handleImageClick}
                      className="absolute bottom-[-10px] right-[-10px] bg-primary-500 h-10 w-10 flex justify-center items-center text-white rounded-2xl shadow-lg hover:bg-primary-700 transition-all hover:scale-110 active:scale-95 z-10"
                      aria-label="Upload new avatar"
                    >
                      {updateDocMutation.isPending ||
                        uploadMutation.isPending ? (
                        <CircularLoader size="sm" color="white" />
                      ) : (
                        <Pencil size={18} />
                      )}
                    </button>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <div className="space-y-1">
                      <Typography
                        variant="h4"
                        className="font-bold text-gray-900 tracking-tight"
                      >
                        {user?.employee_name}
                      </Typography>
                      <div className="flex flex-wrap items-center gap-4">
                        {user?.employee && (
                          <Typography
                            variant="bodySmall"
                            color="disabled"
                            className="text-primary-500 font-medium flex gap-2 items-center uppercase tracking-widest"
                          >
                            <IdCard size={16} />
                            <span>{user?.employee}</span>
                          </Typography>
                        )}
                      </div>
                      <div className="flex flex-col justify-start items-start gap-2 mt-4">
                        {canShowEmployeeStatus && user?.custom_employment_status && (
                          <Badge
                            label={
                              EMPLOYEMENT_STATUS[
                              user?.custom_employment_status.toLowerCase() as keyof typeof EMPLOYEMENT_STATUS
                              ] || user?.custom_employment_status
                            }
                            size="md"
                            backgroundColor={
                              user?.status === "Active"
                                ? "bg-success-100/50"
                                : "bg-gray-100"
                            }
                            textColor={
                              user?.status === "Active"
                                ? "text-success"
                                : "text-gray-600"
                            }
                            pulse={
                              user?.status === "Active"
                                ? { show: true, color: "bg-success" }
                                : undefined
                            }
                          />
                        )}
                      </div>
                      <div className="flex flex-col justify-start items-start gap-2 mt-4">
                        {user?.designation_display && (
                          <Tooltip content={user?.designation_display}>
                            <Typography
                              variant="bodyMedium"
                              className="font-semibold text-primary-600 flex gap-2 items-center"
                            >
                              <Award size={16} />
                              <span>{user?.designation_display}</span>
                            </Typography>
                          </Tooltip>
                        )}
                        <div className="flex gap-2 justify-start items-start">
                          {user?.branch_display && (
                            <Typography
                              variant="bodySmall"
                              color="disabled"
                              className="text-primary-500 flex items-center gap-2 line-clamp-1"
                            >
                              <MapPin size={16} />
                              <Tooltip content={user?.branch_display}>
                                <span className="line-clamp-1">{user?.branch_display}</span>
                              </Tooltip>

                            </Typography>
                          )}

                          {(user?.company_email || user?.personal_email) && (
                            <Typography
                              variant="bodySmall"
                              color="disabled"
                              className="text-primary-500 flex items-center gap-2"
                            >
                              <Mail size={16} />
                              <span>
                                {user?.company_email || user?.personal_email}
                              </span>
                            </Typography>
                          )}
                        </div>

                        <div className="flex items-center gap-2 mt-2">
                          {
                            canAttendanceAssignments && (
                              <Button
                                icon={<NotebookPen size={14} />}
                                size="sm"
                                variant="soft"
                                onClick={() =>
                                  setIsAttendanceAssignmentsOpen(true)
                                }
                                className="uppercase tracking-wider h-full  px-4 py-2 font-medium "
                              >
                                Attendance Assignment
                              </Button>
                            )}
                          {canAppreciate && <Appreciations />}
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
                <Card className="flex items-center gap-8  flex-1" shadow="none">
                  <AwardsSection isDesktop={true} />
                </Card>
              </div>
            </div>
          )}
          {/* Horizontal Tabs - Sticky inside scroll container */}
          <div className="rounded-md">
            <div className="bg-white sticky top-0 rounded-t-md z-10">
              <div className="flex overflow-x-auto scrollbar-hide px-6 py-2 tracking-wide">
                {permittedTabs?.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => scrollToSection(tab.key)}
                    className={`whitespace-nowrap rounded-[0px] px-6 py-3 text-sm font-medium transition-all duration-200 border-b-2 ${activeTab === tab.key
                      ? "border-primary text-primary"
                      : "border-transparent text-gray-600 hover:text-primary"
                      }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {permittedTabs?.map((tab) => (
              <div
                key={tab.key}
                ref={(el) => {
                  sectionRefs.current[tab.key] = el;
                }}
                data-section={tab.key}
                className="bg-white mb-4 w-full max-w-full scroll-mt-8 rounded-md"
              >
                {tabContent[tab.key]}
              </div>
            ))}
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
