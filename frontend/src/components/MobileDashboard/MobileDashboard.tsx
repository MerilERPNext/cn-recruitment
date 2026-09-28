import { Calendar, CheckCircle, RotateCcw, Search, Timer, XCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  useCheckInOutService,
  useGetEmployeeShift,
  useGetQuickAttendanceSummary,
  useTodayAttendanceSummary,
} from "../../hooks/useAttendance";
import { useCompanyLogo } from "../../hooks/useCompanyLogo";
import { useGetUserNotices } from "../../hooks/useNotices";


import { endOfMonth, format, startOfMonth } from "date-fns";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useCurrentEmployeeDetails } from "../../hooks/useEmployee";
import { useEmployeeWithFallback } from "../../hooks/useEmployeeWithFallback";
import {
  Coordinates,
  formatTimeSafe,
  formatTo24HourTime,
  getDeviceLocation,
  getDeviceLocationWeb,
  getLocationPermissionState,
  LOCATION_BLOCKED_MESSAGE,
} from "../../utils/helperUtils";
import TasksAwaiting from "../../components/DashboardComponent/TasksAwaiting";
import EmployeeFallback from "../../components/EmployeeFallback";
import NotificationBell from "../../components/Notification/NotificationBell";
import RedeemablePointsBadge from "../../components/Notification/RedeemablePointsBadge";
import Requests from "../../components/Requests";
import Button from "../../components/shared/atoms/Button";
import { Typography } from "../../components/shared/atoms/Typography";
import { ViewAll } from "../../components/shared/atoms/ViewAll";
import Badge from "../../components/shared/Badge";
import Carousel, { CarouselSlide } from "../../components/shared/molecules/Carousel";
import { NoticeSlide } from "../../components/shared/molecules/NoticeSlide";
import MobileDashboardSkeleton from "../../components/shared/molecules/Skeletons/MobileDashboardSkeletom";
import CommandSearchBar from "../../components/shared/CommandSearchBar";
import SideDrawer from "../../components/shared/SideDrawer";
import ViewingAsBanner from "../../components/ViewingAsBanner";
import MicroAppInDashboard from "../../components/DashboardComponent/MicroAppInDashboard";
import GeoLocationModal from "./GeoLocationModal";
import RequestIssueModal from "../../components/HelpDesk/RequestIssueModal";
import { RecommendationsForYou } from "../../components/DashboardComponent/RecommendationsForYou";

const MobileDashboard: React.FC = () => {
  const [location, setLocation] = useState<Coordinates | null>(null);
  // Location is requested only when the user taps Check In / Check Out, never
  // on mount, so the browser's permission prompt is tied to that action.
  const [isLocationLoading, setIsLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [geoLocationModal, setGeoLocationModal] = useState(false);
  const [isRequestIssueModalOpen, setIsRequestIssueModalOpen] = useState(false);
  const navigate = useNavigate();
  const fetchLocation = async () => {
    setIsLocationLoading(true);
    setLocationError(null);
    try {
      const coords = window.isApp
        ? await getDeviceLocation()
        : await getDeviceLocationWeb();
      setLocation(coords);
      return coords;
    } catch (err) {
      console.error("Failed to get location:", err);
      setLocationError(
        (err as Error)?.message ||
          "Location access is required for Check In. Please enable location services and try again.",
      );
      return null;
    } finally {
      setIsLocationLoading(false);
    }
  };

  const handleGeoButtonClick = async () => {
    // Check In / Check Out tap - the ONLY place location is requested.
    // 1. Read the browser / device permission state (never prompts).
    if (!window.isApp) {
      const permission = await getLocationPermissionState();
      if (permission === "denied") {
        // Blocked: the platform will not prompt again, so do not open the
        // modal - show the settings guidance instead.
        setLocationError(LOCATION_BLOCKED_MESSAGE);
        return;
      }
    }
    // 2. Get the position. "granted" resolves silently; "prompt" makes the
    //    OS / browser show its native dialog right now, because of this tap.
    //    In the native app the bridge's own permission handling runs here.
    const coords = await fetchLocation();
    if (!coords) {
      return;
    }
    // 3. Continue the existing Check In flow (map, current location, Submit).
    setGeoLocationModal(true);
  };

  useEffect(() => {
    if (location) {
      setLocationError(null);
    }
  }, [location]);

  const { data: currentEmployee } =
    useCurrentEmployeeDetails({ logged_in_employee_details: true });

  const employeeState = useEmployeeWithFallback();

  const { data: employeeAttendanceSummary } = useGetQuickAttendanceSummary(
    currentEmployee?.employee || "",
    format(startOfMonth(new Date()), "yyyy-MM-dd"),
    format(endOfMonth(new Date()), "yyyy-MM-dd"),
  );

  const { mutate: checkInCheckOutMutation, isPending: checkInCheckOutPending } =
    useCheckInOutService();

  const { data: CompanyLogo } = useCompanyLogo();
  const currentEmployeeCompany = currentEmployee?.company;
  const matchedCompany =
    Array.isArray(CompanyLogo) &&
      CompanyLogo.length > 0 &&
      currentEmployeeCompany
      ? CompanyLogo.find(
        (company) => company.name === currentEmployeeCompany,
      )
      : CompanyLogo?.[0];

  const logoToShow = matchedCompany?.company_logo || "logo not found";
  const { data: employeeShift } = useGetEmployeeShift(
    currentEmployee?.user_id || "",
  );
  const {
    homeSummary,
    refetch: refetchHomeSummary,
    isRefetching,
    isLoading: homeSummaryLoading,
    firstCheckIn,
    lastCheckOut,
    isCurrentlyCheckedIn,
    totalWorkingHours,
    workPercentage,
  } = useTodayAttendanceSummary(
    currentEmployee?.user_id,
    employeeShift?.custom_standard_working_hrs,
  );
  const [isSearchDrawerOpen, setIsSearchDrawerOpen] = useState(false);
  type CustomError = Error & {
    response?: { data?: { message?: { error: string } } };
  };

  const handleCheckInOut = (type: string) => {
    // Validate location before proceeding
    if (!location?.latitude || !location?.longitude) {
      toast.error(
        "Location not available. Please wait for location to load or enable location services.",
      );
      return;
    }

    if (type === "checkIn") {
      checkInCheckOutMutation(
        {
          employee: currentEmployee?.employee,
          shift: employeeShift?.shift,
          action: "Check In",
          latitude: location.latitude,
          longitude: location.longitude,
        },
        {
          onSuccess: (res: { warning?: string }) => {
            refetchHomeSummary();
            setGeoLocationModal(false)
            if (res && res.warning) {
              toast.custom(
                () => (
                  <div
                    className="bg-yellow-500 p-4 rounded-lg shadow-lg"
                    role="status"
                  >
                    <p>{res?.warning}</p>
                  </div>
                )
              )
            }
            toast.success("Check In successful");
          },
          onError: (e: CustomError) => {
            toast.error(
              e?.response?.data?.message?.error || "Error while Checking In",
            );
          },
        },
      );
    } else {
      checkInCheckOutMutation(
        {
          employee: currentEmployee?.employee,
          shift: employeeShift?.shift,
          action: "Check Out",
          latitude: location.latitude,
          longitude: location.longitude,
        },
        {
          onSuccess: () => {
            refetchHomeSummary();
            setGeoLocationModal(false)
            toast.success("Check Out successful");
          },
          onError: (e: CustomError) => {
            toast.error(
              e?.response?.data?.message?.error || "Error while Checking out",
            );
          },
        },
      );
    }
  };


  const getTotalTime = () => {
    return totalWorkingHours;
  };

  const getWorkPercentage = () => {
    return workPercentage;
  };

  const { data: userNotices, isLoading: userNoticeIsLoading } =
    useGetUserNotices();

  if (userNoticeIsLoading || employeeState.isLoading || homeSummaryLoading) {
    return <MobileDashboardSkeleton />;
  }
  return (
    <div className="h-screen font-sans flex flex-col">
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-md border-b border-gray-100 px-4 py-2.5 sm:py-3 shadow-xs sticky top-0 z-20 flex-shrink-0">
        <div className="flex items-center justify-between gap-2.5 min-w-0">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-11 h-11 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center bg-gray-50 border border-gray-200/80 shadow-2xs">
              <img
                src={typeof logoToShow === "string" ? logoToShow : ""}
                alt="Company Logo"
                className="w-full h-full object-contain rounded-full"
              />
            </div>
            <div className="flex flex-col justify-center min-w-0 leading-tight">
              <Typography
                variant="bodySmall"
                component="span"
                className="text-gray-900 font-bold leading-tight"
              >
                Welcome,
              </Typography>
              <Typography
                variant="bodySmall"
                component="span"
                className="text-primary-900 font-bold leading-tight truncate"
              >
                {currentEmployee?.employee_name?.split(" ")[0] || ""}!
              </Typography>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            <RedeemablePointsBadge variant="light" className="h-9" />

            <button
              onClick={() => navigate("/webapp/notification-log")}
              aria-label="Notifications"
              className="relative w-9 h-9 flex items-center justify-center hover:bg-primary-50 active:bg-primary-100 rounded-xl transition-colors text-gray-600 hover:text-primary-700"
            >
              <NotificationBell className="text-gray-600 hover:text-gray-800" />
            </button>

            <button
              aria-label="Search"
              className="relative w-9 h-9 flex items-center justify-center hover:bg-primary-50 active:bg-primary-100 rounded-xl transition-colors text-gray-600 hover:text-primary-700"
              onClick={() => setIsSearchDrawerOpen(true)}
            >
              <Search className="w-5 h-5 text-gray-600 hover:text-gray-800" />
            </button>
          </div>
        </div>
      </div>

      {/* Viewing As Banner */}
      <ViewingAsBanner />

      <div className="flex-1 overflow-y-auto gap-2">
        {/* ------------------------ User Notice Banner ------------------------ */}
        {!userNoticeIsLoading && userNotices && userNotices?.length > 0 ? (
          <div className=" w-full max-w-full overflow-hidden mb-4">
            <Carousel
              className="w-full h-full max-h-[150px] sm:rounded-none"
              showNavigation={false}
            >
              {userNotices?.map((item) => (
                <CarouselSlide
                  key={item.name}
                  autoScrollDelay={item.auto_scroll_frequency * 1000}
                >
                  <NoticeSlide data={item} fullWidthBackground />
                </CarouselSlide>
              ))}
            </Carousel>
          </div>
        ) : null}
        {!employeeState.isLoading && !employeeState.hasValidData && (
          <EmployeeFallback
            message={
              employeeState.hasEmployeeRecord
                ? "Employee data is incomplete. Please contact HR."
                : "No employee record found. Please contact HR to set up your profile."
            }
            variant="banner"
            showRetry={employeeState.canRetry}
            onRetry={employeeState.retry}
          />
        )}

        <div className="h-fit flex flex-col px-4 mb-2 bg-white">
          <div className="w-full">
            <Typography variant="subheading" className="mb-4 mt-4 text-left block">
              Attendance Tracker
            </Typography>
            <div>
              <div className="flex items-start justify-between w-full mb-2">
                <div>
                  <Typography
                    variant="subheading"
                    className="flex items-center gap-1.5"
                  >
                    {employeeShift?.start_time
                      ? formatTimeSafe(employeeShift.start_time)
                      : "--:--"}{" "}
                    -{" "}
                    {employeeShift?.end_time
                      ? formatTimeSafe(employeeShift.end_time)
                      : "--:--"}
                  </Typography>
                  <Typography variant="bodySmall" color="body2">
                    Shift Timings
                  </Typography>
                </div>

                {homeSummary && homeSummary.length > 0 && (
                  <Badge
                    label={isCurrentlyCheckedIn ? "Checked In" : "Checked Out"}
                    size="md"
                    pulse={{
                      show: true,
                      color: isCurrentlyCheckedIn ? "bg-success" : "bg-error",
                    }}
                    backgroundColor={
                      isCurrentlyCheckedIn
                        ? "bg-success-100 border-success-100"
                        : "bg-error-50 border-error-100"
                    }
                    textColor={
                      isCurrentlyCheckedIn ? "text-success" : "text-error"
                    }
                  />
                )}
              </div>
            </div>
            <div className="flex items-center justify-between w-full mb-3">
              <Typography
                variant="bodySmall"
                color="primary"
                className="font-semibold uppercase tracking-wider"
              >
                8h 30m target
              </Typography>
              <div className="flex items-center gap-3">
                <Typography variant="bodyMedium" className="font-bold">
                  {getTotalTime()}
                </Typography>
                <div className="h-4 w-px bg-gray-200" />
                <Typography variant="bodySmall" className="font-bold">
                  {getWorkPercentage()}%
                </Typography>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="relative mb-2">
              <div className="bg-primary-50 h-3 rounded-lg overflow-hidden p-[1px]">
                <div
                  className="bg-primary-700 h-full rounded-lg transition-all duration-700 ease-out shadow-sm"
                  style={{
                    width: `${Math.min(getWorkPercentage(), 100)}%`,
                  }}
                />
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <div className="grid grid-cols-2 gap-4">
              {/* IN TIME */}
              <div className="p-2 rounded-xl border border-primary">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <Typography
                      variant="label"
                      color="disabled"
                      className="font-bold text-[10px] text-primary"
                    >
                      IN TIME
                    </Typography>
                    <Typography
                      variant="bodyMedium"
                      className="font-bold text-primary"
                    >
                      {firstCheckIn?.time
                        ? formatTo24HourTime(firstCheckIn.time)
                        : "--:--"}
                    </Typography>
                  </div>
                </div>
              </div>

              {/* OUT TIME */}
              <div className="p-2 rounded-xl border border-purple-400">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                    <XCircle className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <Typography
                      variant="label"
                      color="disabled"
                      className="font-bold text-[10px] text-purple-400"
                    >
                      OUT TIME
                    </Typography>
                    <Typography
                      variant="bodyMedium"
                      className="font-bold text-purple-400"
                    >
                      {lastCheckOut?.time
                        ? formatTo24HourTime(lastCheckOut.time)
                        : "--:--"}
                    </Typography>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 my-4">
            {currentEmployee?.custom_allow_mobile_checkin ? (
              <div className="w-full">
                <Button
                  variant="contain"
                  fullWidth
                  size="lg"
                  onClick={handleGeoButtonClick}
                  disabled={
                    checkInCheckOutPending ||
                    !employeeShift?.shift ||
                    isLocationLoading
                  }
                  className="font-medium"
                >
                  {checkInCheckOutPending || isRefetching ? (
                    <span className="animate-spin border-2 border-white border-t-transparent rounded-full w-5 h-5"></span>
                  ) : isLocationLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="animate-spin border-2 border-white border-t-transparent rounded-full w-4 h-4"></span>
                      Getting location...
                    </span>
                  ) : isCurrentlyCheckedIn ? (
                    "Check Out"
                  ) : (
                    "Check In"
                  )}
                </Button>
                {locationError && !isLocationLoading && (
                  <div className="flex items-center justify-center gap-2 mt-3">
                    <Typography
                      variant="bodySmall"
                      color="error"
                      className="font-medium"
                    >
                      {locationError}
                    </Typography>
                    <Button
                      variant="soft"
                      bgColor="error"
                      size="sm"
                      onClick={fetchLocation}
                      className="p-1.5 rounded-full border border-red-200"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            ) : null}

          </div>
        </div>
        {/* ---------------------------------Tasks Awaiting--------------------------------- */}
        <div className="mb-2 bg-white px-2 pt-4 pb-2">
          <TasksAwaiting />
        </div>
        <div className="mb-2 bg-white px-4 pt-4 pb-2">
          <div className="flex justify-between items-center mb-3">
            <Typography variant="subheading" className="block">
              Attendance
            </Typography>

            <ViewAll
              title="View Details"
              onClick={() => navigate("/webapp/attendance")}
            />
          </div>

          <div className="grid grid-cols-4 gap-2">
            {/* Present */}
            <div
              className="bg-green-50 border border-green-100 
               rounded-xl py-3 px-1 
               flex flex-col items-center justify-center 
               min-h-[90px] active:scale-95 transition"
            >
              <CheckCircle className="w-4 h-4 text-green-600 mb-1" />

              <p className="text-base font-semibold text-green-800 leading-none">
                {employeeAttendanceSummary?.present || 0}
              </p>

              <p className="text-[10px] font-medium text-green-700 mt-1 text-center leading-tight">
                Present
              </p>
            </div>

            {/* Absent */}
            <div
              className="bg-red-50 border border-red-100 
               rounded-xl py-3 px-1 
               flex flex-col items-center justify-center 
               min-h-[90px] active:scale-95 transition"
            >
              <XCircle className="w-4 h-4 text-red-600 mb-1" />

              <p className="text-base font-semibold text-red-800 leading-none">
                {employeeAttendanceSummary?.absent || 0}
              </p>

              <p className="text-[10px] font-medium text-red-700 mt-1 text-center leading-tight">
                Absent
              </p>
            </div>

            {/* Leaves */}
            <div
              className="bg-orange-50 border border-orange-100 
               rounded-xl py-3 px-1 
               flex flex-col items-center justify-center 
               min-h-[90px] active:scale-95 transition"
            >
              <Calendar className="w-4 h-4 text-orange-600 mb-1" />

              <p className="text-base font-semibold text-orange-800 leading-none">
                {employeeAttendanceSummary?.leaves || 0}
              </p>

              <p className="text-[10px] font-medium text-orange-700 mt-1 text-center leading-tight">
                Leaves
              </p>
            </div>

            {/* Weekoffs */}
            <div
              className="bg-pink-50 border border-pink-100 
               rounded-xl py-3 px-1 
               flex flex-col items-center justify-center 
               min-h-[90px] active:scale-95 transition"
            >
              <Timer className="w-4 h-4 text-pink-600 mb-1" />

              <p className="text-base font-semibold text-pink-800 leading-none">
                {employeeAttendanceSummary?.week_offs || 0}
              </p>

              <p className="text-[10px] font-medium text-pink-700 mt-1 text-center leading-tight">
                Week Offs
              </p>
            </div>
          </div>
        </div>
        {/* --------------------------------- Requests --------------------------------- */}
        <div className="mb-2 bg-white px-4 pt-4 pb-2">
          <div className="flex justify-between items-center mb-3">
            <Typography variant="subheading" className="block">
              Requests
            </Typography>
            <ViewAll
              title="All Requests"
              onClick={() => navigate("/webapp/requests")}
            />
          </div>
          <Requests limitCards={8} />
        </div>
        {!window.isApp && (
          <div className="mb-2 bg-white">
            <MicroAppInDashboard />
          </div>
        )}
        <RecommendationsForYou isMobile={true} />
      </div>
      <SideDrawer
        open={isSearchDrawerOpen}
        onClose={() => setIsSearchDrawerOpen(false)}
        title="Search Members"
        showBackButton
        className="px-0"
      >
        <div className="py-4 px-3 w-full flex justify-center">
          <CommandSearchBar />
        </div>
      </SideDrawer>
      <GeoLocationModal
        label={isCurrentlyCheckedIn ? "Check Out" : "Check In"}
        open={geoLocationModal}
        onClose={() => setGeoLocationModal(false)}
        location={location}
        isLoading={checkInCheckOutPending}
        onSubmit={() => {
          handleCheckInOut(
            isCurrentlyCheckedIn ? "checkOut" : "checkIn",
          )
        }
        }
      />
      <RequestIssueModal
        isOpen={isRequestIssueModalOpen}
        onClose={() => setIsRequestIssueModalOpen(false)}
      />
    </div>
  );
};

export default MobileDashboard;