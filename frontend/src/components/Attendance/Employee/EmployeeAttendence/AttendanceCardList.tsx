import {
  format,
  isSameDay,
  isValid as isValidDate,
  parse,
} from "date-fns";
import { useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import {
  useCanShowClockIn,
  useCheckInOutService,
  useClockInOutService,
  useGetEmployeeShift,
  useTodayAttendanceSummary,
} from "../../../../hooks/useAttendance";
import { useCurrentEmployeeDetails } from "../../../../hooks/useEmployee";
import { AttendanceRecord, CustomError } from "../../../../types/attendance";
import Button from "../../../shared/atoms/Button";
import { Typography } from "../../../shared/atoms/Typography";
import { useTargetUser } from "../../../../context/ViewedUserContext";
import GeoLocationModal from "../../../MobileDashboard/GeoLocationModal";
import {
  Coordinates,
  getDeviceLocation,
  getDeviceLocationWeb,
  getLocationPermissionState,
  LOCATION_BLOCKED_MESSAGE,
} from "../../../../utils/helperUtils";

const formatTimeSafe = (timeStr?: string) => {
  if (!timeStr) return "--:--";
  try {
    const parsed = parse(timeStr, "HH:mm:ss", new Date());
    if (!isValidDate(parsed)) return "--:--";
    return format(parsed, "HH:mm");
  } catch {
    return "--:--";
  }
};

const getTotalHours = (inTime?: string, outTime?: string): string => {
  if (!inTime || !outTime) return "--";
  try {
    const start = parse(inTime, "HH:mm:ss", new Date());
    const end = parse(outTime, "HH:mm:ss", new Date());
    if (!isValidDate(start) || !isValidDate(end) || end <= start) return "--";
    const totalMinutes = Math.round((end.getTime() - start.getTime()) / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  } catch {
    return "--";
  }
};

const getStatusLabel = (status: string): string => {
  switch (status) {
    case "present": return "Present";
    case "absent": return "Absent";
    case "on-leave": return "On Leave";
    case "half-day": return "Half Day";
    case "work-from-home": return "Work From Home";
    case "holiday": return "Holiday";
    case "week-off": return "Weekly Off";
    case "unpaid": return "On Leave";
    case "default": return "Not Marked";
    default: return status;
  }
};

export type AttendanceCardStatusInfo = {
  status: string;
  events: AttendanceRecord[];
  record?: AttendanceRecord;
  isWeeklyOff?: boolean;
};

export type AttendanceCardItem = {
  date: Date;
  statusInfo: AttendanceCardStatusInfo;
};

interface AttendanceCardListProps {
  completeMonthData: AttendanceCardItem[];
  onCardClick: (item: AttendanceCardItem) => void;
  defaultVisibleCount?: number;
}

const AttendanceCardList = ({
  completeMonthData,
  onCardClick,
  defaultVisibleCount = 5,
}: AttendanceCardListProps) => {
  const [showAll, setShowAll] = useState(false);
  const [location, setLocation] = useState<Coordinates | null>(null);
  const [isLocationLoading, setIsLocationLoading] = useState(false);
  const [geoLocationModal, setGeoLocationModal] = useState(false);

  const { targetEmployeeId } = useTargetUser();

  const { data: currentEmployee } = useCurrentEmployeeDetails({
    logged_in_employee_details: true,
  });
  const { data: employeeShift } = useGetEmployeeShift(
    currentEmployee?.user_id || "",
  );
  const { data: canShowClockIn } = useCanShowClockIn(
    currentEmployee?.user_id ? { user: currentEmployee.user_id } : {},
  );

  const {
    refetch: refetchHomeSummary,
    isCurrentlyCheckedIn,
    inTime: todayInTime,
    outTime: todayOutTime,
    totalWorkingHours: todayTotalWorkingHours,
  } = useTodayAttendanceSummary(currentEmployee?.user_id);

  const { mutate: checkInCheckOutMutation, isPending: checkInCheckOutPending } =
    useCheckInOutService();
  const { mutate: clockInCheckOutMutation, isPending: clockInCheckOutPending } =
    useClockInOutService();

  const fetchLocation = async () => {
    setIsLocationLoading(true);
    try {
      const coords = window.isApp
        ? await getDeviceLocation()
        : await getDeviceLocationWeb();
      setLocation(coords);
      return coords;
    } catch (err) {
      toast.error(
        (err as Error)?.message ||
          "Could not get location. Please enable location services and try again.",
      );
      return null;
    } finally {
      setIsLocationLoading(false);
    }
  };

  const handleGeoButtonClick = async () => {
    // Check In / Check Out tap - the ONLY place location is requested.
    if (!window.isApp && (await getLocationPermissionState()) === "denied") {
      toast.error(LOCATION_BLOCKED_MESSAGE);
      return;
    }
    // "granted" resolves silently; "prompt" shows the native dialog now.
    const coords = await fetchLocation();
    if (!coords) {
      return;
    }
    setGeoLocationModal(true);
  };

  const handleGeoCheckInOut = () => {
    if (!location?.latitude || !location?.longitude) {
      toast.error("Location not available. Please enable location services.");
      return;
    }
    checkInCheckOutMutation(
      {
        employee: currentEmployee?.employee,
        shift: employeeShift?.shift,
        action: isCurrentlyCheckedIn ? "Check Out" : "Check In",
        latitude: location.latitude,
        longitude: location.longitude,
      },
      {
        onSuccess: (res: { warning?: string }) => {
          refetchHomeSummary();
          setGeoLocationModal(false);
          if (res?.warning) {
            toast.custom(() => (
              <div className="bg-yellow-500 p-4 rounded-lg shadow-lg" role="status">
                <p>{res.warning}</p>
              </div>
            ));
          }
          toast.success(
            isCurrentlyCheckedIn ? "Check Out successful" : "Check In successful",
          );
        },
        onError: (e: CustomError) => {
          toast.error(
            e?.response?.data?.message?.error ||
            (isCurrentlyCheckedIn ? "Error while Checking out" : "Error while Checking in"),
          );
        },
      },
    );
  };

  const handleClockInOut = () => {
    clockInCheckOutMutation(
      {
        employee: currentEmployee?.employee,
        shift: employeeShift?.shift,
        action: isCurrentlyCheckedIn ? "Clock Out" : "Clock In",
      },
      {
        onSuccess: () => {
          refetchHomeSummary();
          toast.success(
            isCurrentlyCheckedIn ? "Successfully clocked out!" : "Successfully clocked in!",
          );
        },
        onError: (e: CustomError) => {
          toast.error(
            e?.response?.data?.message?.error ||
            (isCurrentlyCheckedIn ? "Error while Clocking out" : "Error while Clocking in"),
          );
        },
      },
    );
  };

  const sortedData = useMemo(
    () =>
      [...completeMonthData]
        .filter((item) => item.date <= new Date())
        .sort((a, b) => b.date.getTime() - a.date.getTime()),
    [completeMonthData],
  );

  const visibleData = showAll
    ? sortedData
    : sortedData.slice(0, defaultVisibleCount);

  const actionLabel = isCurrentlyCheckedIn ? "Check Out" : "Check In";

  return (
    <div>
      <div className="flex justify-between items-center w-full pb-2">
        <Typography variant="subheading">Your Attendance</Typography>
        {sortedData.length > defaultVisibleCount && (
          <button
            onClick={() => setShowAll((prev) => !prev)}
            className="text-sm font-medium text-primary-600 hover:text-primary-700"
          >
            {showAll ? "View less" : "View all"}
          </button>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {visibleData.map((item, index) => {
          const { date, statusInfo } = item;
          const record = statusInfo.record;
          const today = isSameDay(date, new Date());

          return (
            <div
              key={`card-${format(date, "yyyy-MM-dd")}-${index}`}
              onClick={() => onCardClick(item)}
              className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors border shadow-sm ${today ? "bg-primary-500 text-white border-primary-600" : "bg-white text-gray-900 border-gray-200"
                }`}
            >
              {/* Date badge */}
              <div
                className={`flex flex-col items-center justify-center rounded-lg w-12 h-14 shrink-0 ${today ? "bg-white text-primary-600" : "bg-primary-500 text-white"
                  }`}
              >
                <span className="text-lg font-bold leading-tight">{format(date, "d")}</span>
                <span className="text-xs leading-tight">{format(date, "EEE")}</span>
              </div>

              {/* Details */}
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center gap-2">
                  <div>
                    <p className={`text-xs ${today ? "text-primary-100" : "text-gray-500"}`}>Check In</p>
                    <p className="text-sm font-semibold">
                      {today && todayInTime !== "--:--"
                        ? todayInTime
                        : formatTimeSafe(record?.in_time)}
                    </p>
                  </div>
                  <div>
                    <p className={`text-xs ${today ? "text-primary-100" : "text-gray-500"}`}>Check Out</p>
                    <p className="text-sm font-semibold">
                      {today && todayOutTime !== "--:--"
                        ? todayOutTime
                        : formatTimeSafe(record?.out_time)}
                    </p>
                  </div>
                  <div>
                    <p className={`text-xs ${today ? "text-primary-100" : "text-gray-500"}`}>Total hours</p>
                    <p className="text-sm font-semibold">
                      {today && todayTotalWorkingHours !== "--:--"
                        ? todayTotalWorkingHours
                        : getTotalHours(record?.in_time, record?.out_time)}
                    </p>
                  </div>
                </div>
                <div
                  className={`mt-2 pt-2 text-xs border-t flex items-center justify-between gap-2 ${today ? "border-primary-400 text-primary-100" : "border-gray-200 text-gray-500"
                    }`}
                >
                  <span>| {getStatusLabel(statusInfo.status)}</span>
                  {today && !targetEmployeeId && (
                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                      {currentEmployee?.custom_allow_mobile_checkin && (
                        <Button
                          size="sm"
                          bgColor="white"
                          className="text-primary"
                          disabled={checkInCheckOutPending || isLocationLoading}
                          onClick={handleGeoButtonClick}
                        >
                          {isLocationLoading ? (
                            <span className="animate-spin border-2 border-primary border-t-transparent rounded-full w-3 h-3 inline-block" />
                          ) : checkInCheckOutPending ? "Processing…" : actionLabel}
                        </Button>
                      )}
                      {canShowClockIn?.can_show && (
                        <Button
                          size="sm"
                          bgColor="white"
                          className="text-primary"
                          disabled={clockInCheckOutPending}
                          onClick={handleClockInOut}
                        >
                          {clockInCheckOutPending
                            ? "Processing…"
                            : isCurrentlyCheckedIn
                              ? "Clock Out"
                              : "Clock In"}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <GeoLocationModal
        label={actionLabel}
        open={geoLocationModal}
        onClose={() => setGeoLocationModal(false)}
        location={location}
        isLoading={checkInCheckOutPending}
        onSubmit={handleGeoCheckInOut}
      />
    </div>
  );
};

export default AttendanceCardList;
