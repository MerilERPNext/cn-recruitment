import { Calendar, CheckCircle, RotateCcw, Timer, XCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  useCanShowClockIn,
  useCheckInOutService,
  useClockInOutService,
  useGetEmployeeShift,
  useGetQuickAttendanceSummary,
  useHomeSummaryDetails,
} from "../../hooks/useAttendance";
import { useCompanyLogo } from "../../hooks/useCompanyLogo";
import { useGetUserNotices } from "../../hooks/useNotices";

import {
  compareAsc,
  compareDesc,
  differenceInMinutes,
  endOfDay,
  endOfMonth,
  format,
  parseISO,
  startOfDay,
  startOfMonth,
} from "date-fns";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import defaultProfile from "../../assets/face-rec.png";
import { useCurrentEmployeeAllDetails } from "../../hooks/useEmployee";
import { useEmployeeWithFallback } from "../../hooks/useEmployeeWithFallback";
import {
  Coordinates,
  formatTimeSafe,
  formatTo24HourTime,
  getDeviceLocation,
} from "../../utils/helperUtils";
import TasksAwaiting from "../../components/DashboardComponent/TasksAwaiting";
import EmployeeFallback from "../../components/EmployeeFallback";
import MobileProfileDrawer from "../../components/EmployeeProfile/MobileProfileDrawer";
import NotificationBell from "../../components/Notification/NotificationBell";
import Requests from "../../components/Requests";
import Button from "../../components/shared/atoms/Button";
import { Typography } from "../../components/shared/atoms/Typography";
import { ViewAll } from "../../components/shared/atoms/ViewAll";
import Badge from "../../components/shared/Badge";
import Carousel, { CarouselSlide } from "../../components/shared/molecules/Carousel";
import { NoticeSlide } from "../../components/shared/molecules/NoticeSlide";
import MobileDashboardSkeleton from "../../components/shared/molecules/Skeletons/MobileDashboardSkeletom";
import SearchMembers from "../../components/shared/SearchMembers";
import SideDrawer from "../../components/shared/SideDrawer";
import ViewingAsBanner from "../../components/ViewingAsBanner";
import MicroAppInDashboard from "../../components/DashboardComponent/MicroAppInDashboard";
import GeoLocationModal from "./GeoLocationModal";

const MobileDashboard: React.FC = () => {
  const [location, setLocation] = useState<Coordinates | null>(null);
  const [isLocationLoading, setIsLocationLoading] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [geoLocationModal, setGeoLocationModal] = useState(false);
  const navigate = useNavigate();
  const fetchLocation = async () => {
    setIsLocationLoading(true);
    setLocationError(null);
    try {
      const coords = await getDeviceLocation();
      setLocation(coords);
      return coords;
    } catch (err) {
      console.error("Failed to get location:", err);
      setLocationError(
        "Please refresh to get your current location.",
      );
      return null;
    } finally {
      setIsLocationLoading(false);
    }
  };

  useEffect(() => {
    // Initial fetch with a fallback retry to handle potential native interface delay
    fetchLocation().then((coords) => {
      if (!coords) {
        // If initial fetch fails, try again after a short delay
        setTimeout(() => {
          fetchLocation();
        }, 1000);
      }
    });
  }, []);

  useEffect(() => {
    if (location) {
      setLocationError(null);
    }
  }, [location]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  const { data: currentEmployee } = useCurrentEmployeeAllDetails({
    fields: [
      "user_id",
      "employee_name",
      "company",
      "custom_allow_mobile_checkin",
      "employee",
      "image"
    ]
  });

  const employeeState = useEmployeeWithFallback();
  const { data: canShowClockIn } = useCanShowClockIn(
    currentEmployee?.user_id ? { user: currentEmployee.user_id } : {},
  );
  const { data: employeeAttendanceSummary } = useGetQuickAttendanceSummary(
    currentEmployee?.employee || "",
    format(startOfMonth(new Date()), "yyyy-MM-dd"),
    format(endOfMonth(new Date()), "yyyy-MM-dd"),
  );

  const { mutate: checkInCheckOutMutation, isPending: checkInCheckOutPending } =
    useCheckInOutService();
  const { mutate: clockInCheckOutMutation, isPending: clockInCheckOutPending } =
    useClockInOutService();
  const start = format(startOfDay(new Date()), "yyyy-MM-dd HH:mm:ss");
  const end = format(endOfDay(new Date()), "yyyy-MM-dd HH:mm:ss");

  const filters = {
    time: ["between", [start, end]],
  };

  const { data: CompanyLogo } = useCompanyLogo();
  const currentEmployeeCompany = currentEmployee?.company;
  const matchedCompany =
    Array.isArray(CompanyLogo) &&
      CompanyLogo.length > 0 &&
      currentEmployeeCompany
      ? CompanyLogo.find(
        (company) => company.company_name === currentEmployeeCompany,
      )
      : CompanyLogo?.[0];

  const logoToShow = matchedCompany?.company_logo || "logo not found";
  const encodedFilters = encodeURIComponent(JSON.stringify(filters));
  const {
    data: homeSummary,
    refetch: refetchHomeSummary,
    isRefetching,
    isLoading: homeSummaryLoading,
  } = useHomeSummaryDetails(currentEmployee?.user_id || "", encodedFilters);
  const { data: employeeShift } = useGetEmployeeShift(
    currentEmployee?.user_id || "",
  );
  const checkIns = homeSummary?.filter((log) => log.log_type === "IN") ?? [];
  const checkOuts = homeSummary?.filter((log) => log.log_type === "OUT") ?? [];
  const [profileDrawer, setProfileDrawer] = useState(false);
  const firstCheckIn = checkIns.length
    ? checkIns.sort((a, b) =>
      compareAsc(
        parseISO(a.time.replace(" ", "T")),
        parseISO(b.time.replace(" ", "T")),
      ),
    )[0]
    : undefined;

  const lastCheckOut = checkOuts.length
    ? checkOuts.sort((a, b) =>
      compareDesc(
        parseISO(a.time.replace(" ", "T")),
        parseISO(b.time.replace(" ", "T")),
      ),
    )[0]
    : undefined;

  const lastLog =
    homeSummary && homeSummary.length > 0
      ? [...homeSummary].sort((a, b) =>
        compareDesc(
          parseISO(a.time.replace(" ", "T")),
          parseISO(b.time.replace(" ", "T")),
        ),
      )[0]
      : undefined;

  const isCurrentlyCheckedIn = lastLog?.log_type === "IN";
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

  const handleClockInOut = (type: string) => {
    if (type === "clockIn") {
      clockInCheckOutMutation(
        {
          employee: currentEmployee?.employee,
          shift: employeeShift?.shift,
          action: "Clock In",
        },
        {
          onSuccess: () => {
            refetchHomeSummary();
            toast.success("Clock In successful");
          },
          onError: (e: CustomError) => {
            toast.error(
              e?.response?.data?.message?.error || "Error while Clocking out",
            );
          },
        },
      );
    } else {
      clockInCheckOutMutation(
        {
          employee: currentEmployee?.employee,
          shift: employeeShift?.shift,
          action: "Clock Out",
        },
        {
          onSuccess: () => {
            refetchHomeSummary();
            toast.success("Clock Out successful");
          },
          onError: (e: CustomError) => {
            toast.error(
              e?.response?.data?.message?.error || "Error while Clocking out",
            );
          },
        },
      );
    }
  };

  const getTotalTime = () => {
    if (!homeSummary || homeSummary.length === 0) {
      return "--:--";
    }

    let totalMinutes = 0;
    const sortedLogs = [...homeSummary].sort((a, b) =>
      compareAsc(
        parseISO(a.time.replace(" ", "T")),
        parseISO(b.time.replace(" ", "T")),
      ),
    );

    let currentCheckIn: (typeof sortedLogs)[0] | null = null;

    for (const log of sortedLogs) {
      if (log.log_type === "IN") {
        currentCheckIn = log;
      } else if (log.log_type === "OUT" && currentCheckIn) {
        const checkInTime = parseISO(currentCheckIn.time.replace(" ", "T"));
        const checkOutTime = parseISO(log.time.replace(" ", "T"));
        totalMinutes += differenceInMinutes(checkOutTime, checkInTime);
        currentCheckIn = null;
      }
    }

    if (currentCheckIn && isCurrentlyCheckedIn) {
      const checkInTime = parseISO(currentCheckIn.time.replace(" ", "T"));
      totalMinutes += differenceInMinutes(currentTime, checkInTime);
    }

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}`;
  };

  const getWorkPercentage = () => {
    if (!firstCheckIn || !firstCheckIn.shift_start || !firstCheckIn.shift_end) {
      return 0;
    }

    let totalWorkedMinutes = 0;

    if (homeSummary && homeSummary.length > 0) {
      const sortedLogs = [...homeSummary].sort((a, b) =>
        compareAsc(
          parseISO(a.time.replace(" ", "T")),
          parseISO(b.time.replace(" ", "T")),
        ),
      );

      let currentCheckIn: (typeof sortedLogs)[0] | null = null;

      for (const log of sortedLogs) {
        if (log.log_type === "IN") {
          currentCheckIn = log;
        } else if (log.log_type === "OUT" && currentCheckIn) {
          const checkInTime = parseISO(currentCheckIn.time.replace(" ", "T"));
          const checkOutTime = parseISO(log.time.replace(" ", "T"));
          totalWorkedMinutes += differenceInMinutes(checkOutTime, checkInTime);
          currentCheckIn = null;
        }
      }

      if (currentCheckIn && isCurrentlyCheckedIn) {
        const checkInTime = parseISO(currentCheckIn.time.replace(" ", "T"));
        totalWorkedMinutes += differenceInMinutes(currentTime, checkInTime);
      }
    }

    const shiftStart = parseISO(firstCheckIn.shift_start.replace(" ", "T"));
    const shiftEnd = parseISO(firstCheckIn.shift_end.replace(" ", "T"));
    const totalShiftMinutes = differenceInMinutes(shiftEnd, shiftStart);

    if (totalShiftMinutes <= 0) {
      return 0;
    }

    const percentage = Math.round(
      (totalWorkedMinutes / totalShiftMinutes) * 100,
    );
    return Math.min(percentage, 100);
  };

  const { data: userNotices, isLoading: userNoticeIsLoading } =
    useGetUserNotices();

  if (userNoticeIsLoading || employeeState.isLoading || homeSummaryLoading) {
    return <MobileDashboardSkeleton />;
  }
  return (
    <div className="h-screen font-sans flex flex-col">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-lg border-b border-white/20 px-2 py-3 shadow-sm sticky top-0 z-10 flex-shrink-0">
        <div className="flex items-center justify-between">
          <Button
            variant="subtle"
            className="w-12 h-12 p-0 rounded-xl overflow-hidden hover:bg-black/5"
          >
            <img
              src={typeof logoToShow === "string" ? logoToShow : ""}
              alt="CompnayLogo"
              className="w-12 h-12 p-1 rounded-full flex-shrink-0"
            />
            <Typography variant="subheading">
              Welcome,{" "}
              <span className="text-primary-900 whitespace-nowrap">
                {currentEmployee?.employee_name?.split(" ")[0] || ""}!
              </span>
            </Typography>
          </Button>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/webapp/notification-log")}
              className="relative p-2 hover:bg-primary-400/20 rounded-lg transition-colors"
            >
              <NotificationBell />
            </button>

            <div
              className="w-9 h-9 rounded-xl overflow-hidden cursor-pointer border border-gray-400"
              onClick={() => {
                setProfileDrawer(true);
                // navigate(`/webapp/employee-profile`);
              }}
            >
              <img
                src={currentEmployee?.image || defaultProfile}
                alt="User avatar"
                className="w-full h-full object-cover bg-gray-400"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Viewing As Banner */}
      <ViewingAsBanner />

      {/* Search Bar */}
      <div className="py-2 bg-white border-b border-gray-100 flex-shrink-0">
        <SearchMembers />
      </div>

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
                  <NoticeSlide data={item} />
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
                  onClick={() =>
                    setGeoLocationModal(true)
                  }
                  disabled={
                    checkInCheckOutPending ||
                    !employeeShift?.shift ||
                    isLocationLoading ||
                    !location
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
            {canShowClockIn?.can_show ? (
              <Button
                variant="contain"
                fullWidth
                size="lg"
                onClick={() =>
                  handleClockInOut(
                    isCurrentlyCheckedIn ? "clockOut" : "clockIn",
                  )
                }
                disabled={clockInCheckOutPending || !employeeShift?.shift}
                className="font-medium"
              >
                {clockInCheckOutPending || isRefetching ? (
                  <span className="animate-spin border-2 border-white border-t-transparent rounded-full w-5 h-5"></span>
                ) : isCurrentlyCheckedIn ? (
                  "Clock Out"
                ) : (
                  "Clock In"
                )}
              </Button>
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
              onClick={() => navigate("/webapp/attendance/emp-attendance")}
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
              onClick={() => navigate("/webapp/attendance/emp-attendance")}
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
              onClick={() => navigate("/webapp/leave-app/leaves/leave-balance")}
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
              onClick={() => navigate("/webapp/attendance/emp-attendance")}
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
      </div>
      <SideDrawer
        open={profileDrawer}
        onClose={() => setProfileDrawer(false)}
        title="My Profile"
        showBackButton
        className="px-0"
      >
        <MobileProfileDrawer />
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
    </div>
  );
};

export default MobileDashboard;
