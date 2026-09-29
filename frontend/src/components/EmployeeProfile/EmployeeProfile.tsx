// import HRLetters from "./HRLetters";
import { useNavigate } from "react-router-dom";
import defaultProfile from "../../assets/face-rec.png";
import {
  useCurrentEmployeeDetails,
  useFileUpload,
  useGetEmployeeDetailsByEmpIdForProfile,
  useGetFutureFieldTransactions,
} from "../../hooks/useEmployee";
import { Employee } from "../../types/employee";
import HeaderBar from "../HeaderBar";

import { Building, History, IdCard, Mail, MapPin, Network, Pencil, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useScreenSize } from "../../hooks/useScreenSize";
import DesktopLayoutWrapper from "../DesktopLayoutWrapper";
import EmploymentHistory from "../MyProfile/EmploymentHistory";
import { Tab } from "../NavigationTab";
import Button from "../shared/atoms/Button";
import SideDrawer from "../shared/SideDrawer";
import FutureTransactionsTable from "./FutureTransactionsTable";
import EmployeeProfileSearch from "./EmployeeProfileSearch";
// import AttendanceAssignments from "../Attendance/AttendanceAssignments";
// import ShowHolidays from "./ShowHolidays";

import toast from "react-hot-toast";
import { useTargetUser } from "../../context/ViewedUserContext";
import { useUpdateFrappeDocument } from "../../hooks/useFrappeQuery";
import DocumentLibrary from "../Library/Library";
import CircularLoader from "../shared/atoms/CircularLoader";
import Tooltip from "../shared/Tooltip";
// import { useQueryClient } from "@tanstack/react-query";
import { Card } from "../shared/atoms/Card";
import { Typography } from "../shared/atoms/Typography";
import Badge from "../shared/Badge";
import EmployeeProfileSections from "./EmployeeProfileSections";
import ReportingDetails from "./ReportingDetails";

import Appreciations from "./Appreciations";
import { AwardsSection } from "./EmployeeAwards";
import { useGetUiPermission } from "../../hooks/userUiPermission";
import { isActionEnabled, isPageEnabled } from "../../utils/uiPermission";
import Overview from "./Overview/Overview";
import { MobileProfileBreadcrumbs, TabOption } from "./MobileTabDropdown";
import { EMPLOYMENT_HISTORY_SUBSECTIONS } from "../MyProfile/EmploymentHistory";
import { getReportingDetailsSubsections } from "./ReportingDetails";
import { DOCUMENT_LIBRARY_SUBSECTIONS } from "../Library/Library";

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
  const { data: userUiPermission } = useGetUiPermission("Profile");
  // "Employee Profile" page permission is evaluated per target on the backend:
  // "Employee Self" enables your own profile; manager/HRBP/CXO/HOD queries enable
  // specific reports. Actions alone don't gate the page, so enforce the page flag
  // here to block viewing a profile you're not permitted to see.
  const canViewProfilePage = isPageEnabled(userUiPermission, "Employee Profile");
  const canShowEmployeeStatus = isActionEnabled(
    userUiPermission,
    "show_employee_status",
    "Employee Profile",
  );
  const canShowAssignmentDetailsButton = isActionEnabled(
    userUiPermission,
    "show_assignment_details_button",
    "Employee Profile",
  );
  const canAppreciate = isActionEnabled(
    userUiPermission,
    "can_appreciate",
    "Employee Profile",
  );

  const canShowFutureTransactions = isActionEnabled(
    userUiPermission,
    "show_future_transactions",
    "Employee Profile",
  );

  const { data: currentUser, isLoading: isCurrentUserLoading } =
    useCurrentEmployeeDetails({ logged_in_employee_details: true });

  // const queryClient = useQueryClient();

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

  const { data: futureTransactionsData } =
    useGetFutureFieldTransactions(employeeId);
  const hasFutureTransactions = (futureTransactionsData?.length ?? 0) > 0;

  // const [isAttendanceAssignmentsOpen, setIsAttendanceAssignmentsOpen] =
  //   useState(false);
  const navigate = useNavigate();
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isFutureTransactionsOpen, setIsFutureTransactionsOpen] =
    useState(false);
  const [imageLoadError, setImageLoadError] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const profileContentRef = useRef<HTMLDivElement | null>(null);

  // Global shortcut for Ctrl+F / Cmd+F to open profile search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f") {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    setImageLoadError(false);
  }, [uploadedImage, user?.image]);

  // Block viewing another employee's profile without permission. Own profile
  // ("Employee Self") is always allowed; a disallowed target resolves the
  // "Employee Profile" page to disabled, so bounce back to the user's own profile.
  useEffect(() => {
    if (!userUiPermission) return; // wait for the per-target permission to load
    if (isViewingOtherUser && !canViewProfilePage) {
      toast.error("You do not have permission to view this profile.");
      clearTargetEmployee();
    }
  }, [userUiPermission, isViewingOtherUser, canViewProfilePage, clearTargetEmployee]);

  const profileImageSrc = imageLoadError
    ? defaultProfile
    : uploadedImage || user?.image || defaultProfile;

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
      { key: "overview", label: "Overview", permissionKey: "show_overview" },
      {
        key: "personal-information",
        label: "Personal Information",
        permissionKey: "show_personal_information",
      },
      {
        key: "employment-history",
        label: "Employment History",
        permissionKey: "show_employment_history",
      },
      {
        key: "reporting-details",
        label: "Reporting Details",
        permissionKey: "show_reporting_details",
      },
      // { key: "employee-holidays", label: "Employee Holidays", permissionKey: "show_employee_holidays" },
      {
        key: "employee-documents",
        label: "Employee Documents",
        permissionKey: "show_employee_documents",
      },
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

  const profileTabs = useMemo(
    () => permittedTabs.filter((tab) => tab.key !== "overview"),
    [permittedTabs],
  );

  const [activeTab, setActiveTab] = useState<string>("");
  const [mobileMainTab, setMobileMainTab] = useState<"overview" | "profile-details">("overview");
  const [selectedProfileTab, setSelectedProfileTab] = useState<string>("");
  const [activeSubSection, setActiveSubSection] = useState<string>("");
  const [subSectionsByTab, setSubSectionsByTab] = useState<Record<string, TabOption[]>>({
    "employment-history": EMPLOYMENT_HISTORY_SUBSECTIONS,
    "reporting-details": getReportingDetailsSubsections(),
    "employee-documents": DOCUMENT_LIBRARY_SUBSECTIONS,
  });

  const handleSubTabsLoaded = useCallback((tabKey: string, options: TabOption[]) => {
    setSubSectionsByTab((prev) => {
      const current = prev[tabKey];
      if (
        current &&
        current.length === options.length &&
        current.every((opt, idx) => opt.key === options[idx]?.key && opt.label === options[idx]?.label)
      ) {
        return prev;
      }
      return {
        ...prev,
        [tabKey]: options,
      };
    });
  }, []);

  const handlePersonalInfoTabsLoaded = useCallback(
    (tabs: { key: string; label: string }[]) => {
      handleSubTabsLoaded("personal-information", tabs);
    },
    [handleSubTabsLoaded],
  );

  useEffect(() => {
    if (permittedTabs.length > 0 && !activeTab) {
      setActiveTab(permittedTabs[0].key);
    }
  }, [permittedTabs, activeTab]);

  useEffect(() => {
    if (
      profileTabs.length > 0 &&
      (!selectedProfileTab || !profileTabs.some((t) => t.key === selectedProfileTab))
    ) {
      setSelectedProfileTab(profileTabs[0].key);
    }
  }, [profileTabs, selectedProfileTab]);

  // When selectedProfileTab changes on mobile, initialize activeSubSection
  useEffect(() => {
    if (isDesktop) return;
    const currentSubSections = subSectionsByTab[selectedProfileTab] || [];
    if (currentSubSections.length > 0) {
      if (!currentSubSections.some((s) => s.key === activeSubSection)) {
        setActiveSubSection(currentSubSections[0].key);
      }
    } else {
      setActiveSubSection("");
    }
  }, [isDesktop, selectedProfileTab, subSectionsByTab, activeSubSection]);

  // Create refs for each section
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Create ref for the scrollable container (desktop layout)
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  // Scroll to section when tab is clicked
  const scrollToSection = useCallback((key: string) => {
    const section = sectionRefs.current[key];
    if (section) {
      section.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  const handleActionSuccess = useCallback((subSectionId?: string) => {
    const targetSection = activeTab;
    if (isDesktop && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    setTimeout(() => {
      const subSectionEl = subSectionId
        ? document.querySelector(`[data-subsection="${subSectionId}"]`)
        : null;
      if (subSectionEl) {
        subSectionEl.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
      scrollToSection(targetSection);
    }, 700);
  }, [activeTab, isDesktop, scrollToSection]);

  const tabContent: Record<string, React.ReactNode> = useMemo(
    () => ({
      overview: <Overview />,
      "personal-information": (
        <EmployeeProfileSections
          activeSubTab={!isDesktop ? activeSubSection : undefined}
          onActiveSubTabChange={!isDesktop ? setActiveSubSection : undefined}
          onSubTabsLoaded={handlePersonalInfoTabsLoaded}
        />
      ),
      "employment-history": (
        <EmploymentHistory
          employeeId={user?.employee}
          onActionSuccess={handleActionSuccess}
          activeSubSection={!isDesktop ? activeSubSection : undefined}
          onActiveSubSectionChange={!isDesktop ? setActiveSubSection : undefined}
        />
      ),
      // "employee-holidays": <ShowHolidays />,
      "employee-documents": (
        <DocumentLibrary
          activeSubTab={!isDesktop ? activeSubSection : undefined}
          onActiveSubTabChange={!isDesktop ? setActiveSubSection : undefined}
        />
      ),
      "reporting-details": (
        <ReportingDetails
          onActionSuccess={handleActionSuccess}
          activeCategory={!isDesktop ? activeSubSection : undefined}
          onActiveCategoryChange={!isDesktop ? setActiveSubSection : undefined}
        />
      ),
    }),
    [isDesktop, user, handleActionSuccess, activeSubSection, handlePersonalInfoTabsLoaded],
  );

  // //refetching of the ui permission
  // useEffect(() => {
  //   queryClient.invalidateQueries({
  //     queryKey: ["ui-permission"],
  //   });
  // }, [queryClient]);

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
    <div ref={profileContentRef} className="bg-white font-sans scroll-smooth">
      {/* Sticky Header - always on top */}
      <HeaderBar
        title="Profile"
        onBack={(navigateBack) => {
          if (isViewingOtherUser) {
            clearTargetEmployee();
          }
          navigateBack();
        }}
        rightSlot={
          <button
            onClick={() => setIsSearchOpen((prev) => !prev)}
            className={`p-2 rounded-full transition-all ${
              isSearchOpen
                ? "text-primary-600 bg-primary-50"
                : "text-gray-600 hover:text-primary-600 hover:bg-gray-100"
            }`}
            aria-label="Search in profile"
            title="Search profile"
          >
            <Search size={20} />
          </button>
        }
      />
      {/* Search Toolbar for Mobile */}
      <EmployeeProfileSearch
        containerRef={profileContentRef}
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        isMobile={true}
      />
      <div className="bg-white shadow">
        {userIsLoading ? (
          <HeaderInfoSkeleton />
        ) : (
          <div className="bg-white shadow">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              id="upload-image"
              className="hidden"
              onChange={handleFileChange}
            />
            <div className="flex flex-col items-center text-center px-6 py-6 border-b border-gray-50 bg-white">
              <div className="relative shrink-0 mb-3">
                <img
                  src={profileImageSrc}
                  alt="User avatar"
                  className="w-24 h-24 rounded-full object-cover ring-4 ring-blue-50/20 shadow-md"
                  onError={() => setImageLoadError(true)}
                />
                <button
                  onClick={handleImageClick}
                  className="absolute -bottom-1 -right-1 h-8 w-8 bg-white flex justify-center items-center p-1.5 rounded-full shadow-lg border border-gray-100 hover:bg-gray-50 transition-all active:scale-95 text-primary-600"
                  aria-label="Upload new avatar"
                >
                  {updateDocMutation.isPending || uploadMutation.isPending ? (
                    <CircularLoader size="sm" color="blue-500" />
                  ) : (
                    <Pencil size={14} />
                  )}
                </button>
              </div>
              <div className="flex flex-col items-center w-full min-w-0">
                <Typography
                  variant="h4"
                  className="font-bold truncate tracking-tight text-lg sm:text-xl text-center"
                >
                  {user?.employee_name}
                </Typography>
                {(user?.department_display || user?.branch_display) && (
                  <Typography
                    variant="bodySmall"
                    color="secondary"
                    className="font-medium text-center mt-1 text-xs text-gray-500 line-clamp-2 px-4"
                  >
                    {[user?.department_display, user?.branch_display].filter(Boolean).join(" - ")}
                  </Typography>
                )}
                {user?.employee && (
                  <Typography
                    variant="bodySmall"
                    color="disabled"
                    className="font-medium mt-1.5 flex gap-1.5 items-center justify-center uppercase tracking-wider text-xs"
                  >
                    <IdCard size={14} />
                    <span>{user?.employee}</span>
                  </Typography>
                )}
                {(user?.company_email || user?.personal_email) && (
                  <Typography
                    variant="bodySmall"
                    color="primary"
                    className="flex gap-1.5 items-center justify-center mt-1 text-xs"
                  >
                    <Mail size={12} className="text-primary-500" />
                    <span>{user?.company_email || user?.personal_email}</span>
                  </Typography>
                )}
                <div className="flex flex-wrap items-center justify-center gap-3 mt-3">
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
                {/* Action Icons Row (Email & Org Chart) */}
                <div className="flex items-center justify-center gap-6 mt-4 pt-1 text-gray-500">
                  {(user?.company_email || user?.personal_email) && (
                    <a
                      href={`mailto:${user?.company_email || user?.personal_email}`}
                      className="p-2 hover:text-primary-600 hover:bg-gray-50 rounded-full transition-colors"
                      title="Send Email"
                      aria-label="Send Email"
                    >
                      <Mail size={18} />
                    </a>
                  )}
                  {(user?.company_email || user?.personal_email) && (
                    <div className="h-4 w-px bg-gray-200" />
                  )}
                  <button
                    onClick={() =>
                      navigate(
                        user?.employee
                          ? `/webapp/organizational-chart?employee=${user?.employee}`
                          : "/webapp/organizational-chart",
                      )
                    }
                    className="p-2 hover:bg-gray-50 rounded-full transition-colors cursor-pointer text-gray-600 hover:text-primary-600"
                    title="Organizational Chart"
                    aria-label="Organizational Chart"
                  >
                    <Network size={18} />
                  </button>
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-4 mx-2">
              {canAppreciate && <Appreciations />}
              {canShowFutureTransactions && hasFutureTransactions && (
                <Button
                  icon={<History size={14} />}
                  size="sm"
                  variant="soft"
                  onClick={() => setIsFutureTransactionsOpen(true)}
                  className="text-[10px] font-bold uppercase tracking-wider h-full px-4 py-2"
                >
                  Future Transactions
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Two Main Tabs: Overview vs Profile Details */}
        <div className="bg-white border-b sticky top-[60px] z-30 h-[45px] flex">
          <div className="flex w-full h-full">
            <button
              onClick={() => setMobileMainTab("overview")}
              className={`flex-1 h-full text-center text-sm font-semibold transition-all duration-200 border-b-2 flex items-center justify-center ${
                mobileMainTab === "overview"
                  ? "border-primary-600 text-primary-600 font-bold"
                  : "border-transparent text-gray-500 hover:text-gray-900"
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setMobileMainTab("profile-details")}
              className={`flex-1 h-full text-center text-sm font-semibold transition-all duration-200 border-b-2 flex items-center justify-center ${
                mobileMainTab === "profile-details"
                  ? "border-primary-600 text-primary-600 font-bold"
                  : "border-transparent text-gray-500 hover:text-gray-900"
              }`}
            >
              Profile Details
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {mobileMainTab === "overview" ? (
          <div className="bg-white">
            <AwardsSection isDesktop={false} />
            <div className="border-b border-gray-50">
              {tabContent["overview"]}
            </div>
          </div>
        ) : (
          <div className="bg-white">
            {/* Breadcrumbs: Section Dropdown > Sub-Section Dropdown */}
            <MobileProfileBreadcrumbs
              sectionOptions={profileTabs}
              selectedSection={selectedProfileTab || profileTabs[0]?.key}
              onSectionChange={(key) => setSelectedProfileTab(key)}
              subSectionOptions={subSectionsByTab[selectedProfileTab || profileTabs[0]?.key] || []}
              selectedSubSection={activeSubSection}
              onSubSectionChange={(key) => setActiveSubSection(key)}
              stickyTopClass="top-[105px]"
              zIndex={25}
            />
            <div className="px-4 py-3">
              {tabContent[selectedProfileTab || profileTabs[0]?.key]}
            </div>
          </div>
        )}
      </div>
      {/* <AttendanceAssignments
        open={isAttendanceAssignmentsOpen}
        onClose={() => setIsAttendanceAssignmentsOpen(false)}
      /> */}
    </div>
  );

  const desktopLayout = (
    <DesktopLayoutWrapper title="Profile">
      <div
        ref={profileContentRef}
        className="flex flex-col h-full p-6 gap-4 w-full overflow-hidden relative"
      >
        {/* Floating Search Bar for Desktop */}
        <EmployeeProfileSearch
          containerRef={profileContentRef}
          scrollContainerRef={scrollContainerRef}
          isOpen={isSearchOpen}
          onClose={() => setIsSearchOpen(false)}
          isMobile={false}
        />
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
                        src={profileImageSrc}
                        alt="User avatar"
                        className="w-full h-full object-cover bg-gray-50 transition-transform duration-500 group-hover/avatar:scale-110"
                        onError={() => setImageLoadError(true)}
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
                        {canShowEmployeeStatus &&
                          user?.custom_employment_status && (
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
                        {user?.department_display && (
                          <Tooltip
                            content={"Department : " + user?.department_display}
                          >
                            <Typography
                              variant="bodySmall"
                              className="font-medium text-primary-600 flex gap-2 items-center"
                            >
                              <Building size={16} />
                              <span>{user?.department_display}</span>
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
                                <span className="line-clamp-1">
                                  {user?.branch_display}
                                </span>
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
                          {canAppreciate && <Appreciations />}
                          {canShowAssignmentDetailsButton &&
                            <Button
                              variant="soft"
                              size="sm"
                              icon={<History size={14} />}
                              onClick={() => navigate("/webapp/employee-profile/assignment-details")}
                            >
                              Assignment Details
                            </Button>}
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
              <div className="flex items-center justify-between overflow-x-auto scrollbar-hide px-6 py-2 tracking-wide">
                <div className="flex overflow-x-auto scrollbar-hide">
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
                <div className="flex items-center gap-2">
                  <Button
                    icon={<Search size={14} />}
                    size="sm"
                    variant={isSearchOpen ? "contain" : "subtle"}
                    onClick={() => setIsSearchOpen((prev) => !prev)}
                    className="text-xs font-semibold px-3 py-2"
                  >
                    Find in Profile
                  </Button>
                  {canShowFutureTransactions && hasFutureTransactions && (
                    <Button
                      icon={<History size={14} />}
                      size="sm"
                      variant="soft"
                      onClick={() => setIsFutureTransactionsOpen(true)}
                      className="uppercase tracking-wider shrink-0 px-4 py-2 font-medium"
                    >
                      Future Transactions
                    </Button>
                  )}
                </div>
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
      {/* <AttendanceAssignments
        open={isAttendanceAssignmentsOpen}
        onClose={() => setIsAttendanceAssignmentsOpen(false)}
      /> */}
    </DesktopLayoutWrapper>
  );

  // Don't render another employee's profile until the per-target permission
  // confirms access. While viewing someone else, the "Profile" permission query
  // is keyed by target, so `data` is undefined until it resolves — this also
  // prevents flashing another employee's data before the guard redirects back.
  if (isViewingOtherUser && !canViewProfilePage) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <CircularLoader size="sm" color="blue-500" />
      </div>
    );
  }

  return (
    <>
      {isDesktop ? desktopLayout : mobileLayout}
      {isFutureTransactionsOpen && (
        <SideDrawer
          open={isFutureTransactionsOpen}
          onClose={() => setIsFutureTransactionsOpen(false)}
          size={isDesktop ? "xxl" : "full"}
          title="Future Transactions"
          className="p-0"
        >
          <FutureTransactionsTable />
        </SideDrawer>
      )}
    </>
  );
};

export default EmployeeProfile;
