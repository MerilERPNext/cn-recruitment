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
import ReportingDetails from "./ReportingDetails";
// import DOMPurify from "dompurify";
// import ContextualPopup from "../shared/molecules/ContextualPopup";

export interface PersonalInfoProps {
  user: Employee | null | undefined;
  refetch?: () => void;
}

// const AwardBadge: React.FC<{ award: Award }> = ({ award }) => {
//   const [isOpen, setIsOpen] = useState(false);
//   const triggerRef = useRef<HTMLDivElement>(null);

//   return (
//     <div className="group flex flex-col items-center gap-2 min-w-[48px] relative">
//       <div
//         ref={triggerRef}
//         onClick={() => setIsOpen(!isOpen)}
//         className="relative w-14 h-14 rounded-full bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200/60 flex items-center justify-center shadow-sm cursor-pointer transition-all duration-300 hover:shadow-lg hover:border-blue-300 overflow-hidden"
//       >
//         {award.icon ? (
//           <img
//             src={award.icon}
//             alt={award.award_name}
//             className="relative z-10 w-14 h-14 object-cover"
//           />
//         ) : (
//           <span className="relative z-10 text-2xl drop-shadow-sm">🏆</span>
//         )}
//       </div>
//       <span className="text-[10px] font-semibold text-gray-700 truncate w-full text-center leading-tight px-1">
//         {award.award_name}
//       </span>

//       <ContextualPopup
//         isOpen={isOpen}
//         onClose={() => setIsOpen(false)}
//         triggerRef={triggerRef}
//         className="!min-w-[280px] !max-w-[320px] p-5 !rounded-2xl !border-blue-200 !shadow-2xl !bg-white backdrop-blur-sm"
//       >
//         <div className="flex flex-col gap-4">
//           {/* Header */}
//           <div className="flex items-start gap-3 pb-3 border-b border-gray-200">
//             <div className="relative w-14 h-14 rounded-full overflow-hidden bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center shadow-sm flex-shrink-0">
//               {award.icon ? (
//                 <img src={award.icon} alt="appreciation-badge" className="relative z-10 w-14 h-14 object-cover drop-shadow-sm" />
//               ) : (
//                 <span className="relative z-10 text-2xl drop-shadow-sm">🏆</span>
//               )}
//             </div>
//             <div className="flex-1 min-w-0">
//               <p className="font-bold text-gray-900 leading-tight text-base mb-1">
//                 {award.award_name}
//               </p>
//               <p className="text-[11px] text-blue-700 font-bold tracking-wider uppercase bg-blue-50 px-2 py-0.5 rounded-md inline-block">
//                 {award.award_category}
//               </p>
//             </div>
//           </div>

//           {/* Description */}
//           <div className="text-sm text-gray-700 leading-relaxed max-h-[180px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-blue-200 scrollbar-track-transparent">
//             {award.description ? (
//               <div
//                 dangerouslySetInnerHTML={{
//                   __html: DOMPurify.sanitize(award.description),
//                 }}
//                 className="prose prose-sm prose-blue max-w-none"
//               />
//             ) : (
//               <span className="italic text-gray-400 text-xs">No description available</span>
//             )}
//           </div>

//           {/* Footer Details */}
//           <div className="pt-3 border-t border-gray-200 flex flex-col gap-2 text-xs">
//             <div className="flex justify-between items-center">
//               <span className="text-gray-500 font-medium">Recognition Period</span>
//               <span className="font-bold text-gray-800 bg-blue-50 px-2 py-1 rounded-md">{award.award_period}</span>
//             </div>
//             {award.period_start_date && award.period_end_date && (
//               <div className="flex justify-between items-center">
//                 <span className="text-gray-500 font-medium">Award Dates</span>
//                 <span className="font-semibold text-gray-700 text-[11px]">
//                   {award.period_start_date} → {award.period_end_date}
//                 </span>
//               </div>
//             )}
//           </div>
//         </div>
//       </ContextualPopup>
//     </div>
//   );
// };

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
  // const { data: employeeAppreciations } =
  //   useGetEmployeeAppreciations();
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
      { key: "reporting-details", label: "Reporting Details" },
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
      "reporting-details": <ReportingDetails />,
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
            <div className="flex items-start gap-5 px-6 py-4 border-b border-gray-50 bg-white">
              <div className="relative shrink-0">
                <img
                  src={uploadedImage || user?.image || defaultProfile}
                  alt="User avatar"
                  className="w-20 h-20 rounded-2xl object-cover ring-4 ring-blue-50/10 shadow-sm"
                />
                <button
                  onClick={handleImageClick}
                  className="absolute -bottom-1.5 -right-1.5 h-8 w-8 bg-white flex justify-center items-center p-1.5 rounded-xl shadow-lg border border-gray-100 hover:bg-gray-50 transition-all active:scale-95"
                  aria-label="Upload new avatar"
                >
                  {updateDocMutation.isPending || uploadMutation.isPending ? (
                    <CircularLoader size="sm" />
                  ) : (
                    <Pencil size={14} className="text-blue-600" />
                  )}
                </button>
              </div>

              <div className="flex flex-col flex-1 min-w-0 pt-0.5">
                <h1 className="text-xl font-extrabold text-gray-900 truncate tracking-tight">
                  {user?.employee_name}
                </h1>
                <Tooltip content={user?.designation}>
                  <p className="text-sm font-medium text-gray-500 truncate mt-0.5">
                    {user?.designation}
                  </p>
                </Tooltip>
                <p className="text-gray-400 text-xs mt-1 font-medium">
                  ID: {user?.employee}
                </p>

                <div className="flex flex-wrap items-center gap-2 mt-3">
                  {user?.custom_employment_status && (
                    <span
                      className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${user?.status === "Active"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                        : "bg-gray-50 text-gray-600 border-gray-100"
                        }`}
                    >
                      {user?.custom_employment_status}
                    </span>
                  )}
                  {showAttendanceAssignment && (
                    <button
                      onClick={() => setIsAttendanceAssignmentsOpen(true)}
                      className="flex items-center gap-1.5 text-[10px] font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100 hover:bg-blue-100 transition-colors uppercase tracking-wider"
                    >
                      <NotebookPen size={12} />
                      Attendance
                    </button>
                  )}
                </div>
              </div>
            </div>
            {/* Awards Section with Divider */}
            {/* <div className="w-full border-t border-gray-200 mt-6 pt-6 px-6">
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-base font-bold text-gray-900">
                  Appreciations
                </h2>
              </div>
              <div className="flex gap-5 overflow-x-auto py-3 scrollbar-hide">
                {employeeAppreciations?.map((award: Award) => (
                  <AwardBadge key={award.name} award={award} />
                ))}
              </div>
              {(!employeeAppreciations || employeeAppreciations.length === 0) && (
                <div className="flex flex-col items-center justify-center py-8 px-4 bg-gray-50 rounded-xl border border-gray-200">
                  <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mb-3">
                    <span className="text-3xl opacity-40">🏆</span>
                  </div>
                  <p className="text-sm text-gray-600 font-medium">
                    No awards yet
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Recognition coming soon!
                  </p>
                </div>
              )}
            </div> */}
          </div>
        )}
        {/* Horizontal Tabs */}
        <div className="bg-white border-b sticky top-0 z-10">
          <div className="flex overflow-x-auto scrollbar-hide px-4 py-2">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => scrollToSection(tab.key)}
                className={`whitespace-nowrap px-4 py-2 text-sm font-medium transition-all duration-200 border-b-2 ${activeTab === tab.key
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
              <div className="flex items-start justify-between gap-6 w-full">
                <div className="flex items-center gap-6 w-1/2 p-1">

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    id="upload-image"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <div className="relative">
                    <div className="w-30 h-30 rounded-full ring-4 ring-white overflow-hidden">
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
                  <div className="flex flex-col pt-3">
                    <div>
                      <h1 className="text-xl font-bold text-gray-900 leading-tight">
                        {user?.employee_name}
                      </h1>
                      <Tooltip content={user?.designation}>
                        <p className="text-blue-600 font-semibold text-sm mt-0.5">
                          {user?.designation?.slice(0, 40)}
                        </p>
                      </Tooltip>
                      <p className="text-gray-500 text-xs mt-1">
                        ID: {user?.employee}
                      </p>
                      {user?.custom_employment_status && (
                        <span className="inline-block mt-2 px-3 py-0.5 bg-yellow-100 text-yellow-800 text-[10px] font-bold rounded-lg uppercase tracking-wider">
                          {user?.custom_employment_status}
                        </span>
                      )}
                    </div>
                    {showAttendanceAssignment && (
                      <div className="mt-2">
                        <Button
                          icon={<NotebookPen size={"14px"} />}
                          size="sm"
                          bgColor="blue-50"
                          variant="contain"
                          textColor="blue-600"
                          onClick={() => setIsAttendanceAssignmentsOpen(true)}
                        >
                          Attendance Assignment
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
                {/* Awards Section with Divider */}
                {/* <div className="border-l border-gray-200 pl-8 pt-3 w-1/2 h-full p-2">
                  <div className="flex items-center gap-2 mb-2">
                    <h2 className="text-lg font-bold text-gray-900">
                      Appreciations
                    </h2>
                  </div>
                  <div className="p-2 bg-gray-50 rounded-2xl border border-gray-200">
                    <div className="flex gap-2 flex-wrap">
                      {employeeAppreciations?.map((award: Award) => (
                        <AwardBadge key={award.name} award={award} />
                      ))}
                    </div>
                  </div>

                  {(!employeeAppreciations ||
                    employeeAppreciations?.length === 0) && (
                      <div className="flex items-center p-3 gap-3 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
                        <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                          <span className="text-2xl opacity-40">🏆</span>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-700">
                            No awards yet
                          </p>
                          <p className="text-xs text-gray-400">
                            Recognition waiting to happen...
                          </p>
                        </div>
                      </div>
                    )}
                </div> */}

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
                  className={`whitespace-nowrap px-6 py-3 text-sm font-medium transition-all duration-200 border-b-2 ${activeTab === tab.key
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
