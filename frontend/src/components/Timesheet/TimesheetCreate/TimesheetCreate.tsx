import type React from "react";
import { useState, useEffect, useMemo, useCallback } from "react";
import {
  startOfWeek,
  addDays,
  subDays,
  format,
  parseISO
} from "date-fns";
import { toast } from "react-hot-toast";

import { useCurrentUser } from "../../../hooks/useCurrentUser";
import { useCurrentEmployeeDetails } from "../../../hooks/useEmployee";
import { useGetAllEventsAndAttendance } from "../../../hooks/useAttendance";
import { useCreateOrUpdateTimesheetEntries, useWeeklyTimesheetData, useTimesheetSettings } from "../../../hooks/useTimesheet";
import { getWeeklyTimesheetData } from "../../../services/timesheetService";
import type { TimesheetApprovalStatus } from "../../../types/timesheet";
import { useGetUiPermission } from "../../../hooks/userUiPermission";
import { isActionEnabled } from "../../../utils/uiPermission";
import { useScreenSize } from "../../../hooks/useScreenSize";
import { useFileUploader } from "../../../hooks/useFileUploader";

import { Typography } from "../../shared/atoms/Typography";
import TableSkeleton from "../../shared/molecules/Skeletons/TableSkeleton";
import { NoDataFound } from "../../shared/atoms/NoDataFound";

import { addTimeEntrySchema } from "./addTimeEntrySchema";
import { errorResponseFormater } from "../../../utils/errorResponseFormater";
import { useLoadingOverlay } from "../../../context/OverlayContext";
import { TimesheetRow } from "./components/TimesheetRow";
import { AttachmentCard } from "../../shared/molecules/AttachmentCard";
import { CommentModal } from "./components/CommentModal";
import { downloadTimesheetTemplate, parseTimesheetExcelFile } from "./utils/timesheetExcelUtils";


export interface TimesheetRow {
  id: string; // key: project_task_activity_billable
  project: string;
  projectName: string;
  task: string;
  taskSubject: string;
  parentTask?: string;
  parentTaskSubject?: string;
  activityType: string;
  isBillable: boolean;
  days: Record<string, { hours: number; description: string }>;
}

interface RowItemType {
  project: string;
  task?: string;
  custom_parent_task?: string;
  comment: string;
  hrs: number;
}

import { TimesheetHeader } from "./components/TimesheetHeader";
import { TimesheetTopBar } from "./components/TimesheetTopBar";
import { TimesheetMetrics } from "./components/TimesheetMetrics";
import { TimesheetActionFooter } from "./components/TimesheetActionFooter";
import { AddTimeEntryButton } from "./components/AddTimeEntryButton";
import { useTargetUser } from "../../../context/ViewedUserContext";


const TimesheetCreate: React.FC = () => {
  const loadingOverlay = useLoadingOverlay();
  const { isDesktop } = useScreenSize();

  // Date states
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [isSavingLocally, setIsSavingLocally] = useState<boolean>(false);
  const currentWeekStart = useMemo(() => startOfWeek(currentDate, { weekStartsOn: 1 }), [currentDate]);
  const currentWeekEnd = useMemo(() => addDays(currentWeekStart, 6), [currentWeekStart]);

  const realToday = useMemo(() => new Date(), []);
  const realCurrentWeekStart = useMemo(() => startOfWeek(realToday, { weekStartsOn: 1 }), [realToday]);

  const disableNextWeek = currentWeekStart.getTime() >= realCurrentWeekStart.getTime();

  const startOfWeekStr = useMemo(() => format(currentWeekStart, "yyyy-MM-dd"), [currentWeekStart]);

  // Employee details
  const { data: user } = useCurrentUser();
  const { data: employeeDetails, isLoading: isEmployeeLoading } = useCurrentEmployeeDetails({
    logged_in_employee_details: true,
  });
  const employeeId = employeeDetails?.employee || "";
  const company = employeeDetails?.company_name || "";
  const { targetEmployeeId, isViewingOtherUser } =
    useTargetUser();
  // Weekly Timesheet Data Hook
  const { data: weeklyData, isLoading: isWeeklyLoading } = useWeeklyTimesheetData({
    employee_id: (isViewingOtherUser ? targetEmployeeId : employeeId) || "",
    week_start_date: startOfWeekStr
  }, !!employeeId);

  const { data: timesheetSettingsData, isLoading: isSettingsLoading } = useTimesheetSettings();
  const showSubtask = timesheetSettingsData ? (Number(timesheetSettingsData.show_subtask) === 1 || timesheetSettingsData.show_subtask === true) : true;
  const hideHolidayTimesheet = timesheetSettingsData ? (Number(timesheetSettingsData.hide_holiday_timesheet) === 1 || timesheetSettingsData.hide_holiday_timesheet === true) : false;
  const allowWeekoffTimesheet = timesheetSettingsData ? (Number(timesheetSettingsData.allow_weekoff_timesheet) === 1 || timesheetSettingsData.allow_weekoff_timesheet === true) : false;
  const showSelectDaysToSubmit = timesheetSettingsData ? (Number(timesheetSettingsData.show_select_days_to_submit) === 1 || timesheetSettingsData.show_select_days_to_submit === true) : false;

  const isDetailLoading = isWeeklyLoading || isEmployeeLoading || isSettingsLoading;

  // Attendance Working Hours Map from weekly timesheet data
  const attendanceHoursMap = useMemo(() => {
    const map: Record<string, string> = {};
    if (weeklyData?.days) {
      weeklyData.days.forEach(day => {
        if ((day.attendance_hours || 0) > 0) {
          const totalMinutes = Math.round((day.attendance_hours || 0) * 60);
          const hrs = Math.floor(totalMinutes / 60);
          const mins = totalMinutes % 60;
          map[day.date] = `${hrs}h ${mins}m`;
        }
      });
    }
    return map;
  }, [weeklyData]);

  // Extract all unique file attachments from the response
  const attachedFilesList = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const files = new Map<string, any>();
    if (weeklyData?.file_info) {
      files.set(weeklyData.file_info.file_url, weeklyData.file_info);
    }
    if (weeklyData?.days) {
      weeklyData.days.forEach(day => {
        if (day.timesheet_records) {
          day.timesheet_records.forEach(record => {
            if (record.file_info) {
              files.set(record.file_info.file_url, record.file_info);
            }
          });
        }
      });
    }
    return Array.from(files.values());
  }, [weeklyData]);

  const { data: attendanceEvents } = useGetAllEventsAndAttendance({
    start: startOfWeekStr,
    end: format(currentWeekEnd, "yyyy-MM-dd"),
  });

  const weekOffDates = useMemo(() => {
    const dates = new Set<string>();
    (attendanceEvents || []).forEach((event) => {
      const isWeeklyOff =
        event.status === "Weekly Off" ||
        event.custom_status === "Weekly Off" ||
        event.title === "Weekly Off" ||
        (["Holiday", "Holidays"].includes(event.doctype || "") && event.weekly_off === 1);
      if (isWeeklyOff) {
        const d = event.start?.split(" ")[0];
        if (d) dates.add(d);
      }
    });
    (weeklyData?.days || []).forEach((day) => {
      if (day.attendance_status?.toLowerCase() === "weekly off" || day.attendance_status?.toLowerCase() === "week off") {
        dates.add(day.date);
      }
    });
    return Array.from(dates);
  }, [attendanceEvents, weeklyData]);

  const holidayDates = useMemo(() => {
    const dates = new Set<string>();
    (attendanceEvents || []).forEach((event) => {
      const isHolidayDoc = ["Holiday", "Holidays"].includes(event.doctype || "");
      const isHolidayStatus =
        event.status?.toLowerCase() === "holiday" ||
        event.custom_status?.toLowerCase() === "holiday" ||
        event.title?.toLowerCase() === "holiday";
      const isWeeklyOff =
        event.weekly_off === 1 ||
        event.status === "Weekly Off" ||
        event.custom_status === "Weekly Off" ||
        event.title === "Weekly Off";
      if ((isHolidayDoc || isHolidayStatus) && !isWeeklyOff) {
        const d = event.start?.split(" ")[0];
        if (d) dates.add(d);
      }
    });
    (weeklyData?.days || []).forEach((day) => {
      if (day.attendance_status?.toLowerCase() === "holiday" && !weekOffDates.includes(day.date)) {
        dates.add(day.date);
      }
    });
    return Array.from(dates);
  }, [attendanceEvents, weeklyData, weekOffDates]);

  // Map date -> holiday title for tooltip display
  const holidayTitleMap = useMemo(() => {
    const map: Record<string, string> = {};
    (attendanceEvents || []).forEach((event) => {
      const isHolidayDoc = ["Holiday", "Holidays"].includes(event.doctype || "");
      const isHolidayStatus =
        event.status?.toLowerCase() === "holiday" ||
        event.custom_status?.toLowerCase() === "holiday";
      const isWeeklyOff =
        event.weekly_off === 1 ||
        event.status === "Weekly Off" ||
        event.custom_status === "Weekly Off" ||
        event.title === "Weekly Off";
      if ((isHolidayDoc || isHolidayStatus) && !isWeeklyOff) {
        const d = event.start?.split(" ")[0];
        if (d && event.title) {
          map[d] = event.title;
        }
      }
    });
    return map;
  }, [attendanceEvents]);

  const daysOfWeek = useMemo(() => {
    return Array.from({ length: 7 }).map((_, idx) => addDays(currentWeekStart, idx));
  }, [currentWeekStart]);

  // Project & Task names are now provided directly in the API response
  // No need for separate projectsList / tasksList fetches

  // Timesheet Fetching
  const [timesheetStatus, setTimesheetStatus] = useState<string>("Draft");
  const [nonEditableDays, setNonEditableDays] = useState<string[]>([]);

  // Grid/Rows data
  const [projectsData, setProjectsData] = useState<TimesheetRow[]>([]);
  const [initialProjectsData, setInitialProjectsData] = useState<TimesheetRow[]>([]);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [lastSavedTime, setLastSavedTime] = useState<string>("");
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [isFileModified, setIsFileModified] = useState<boolean>(false);
  const [submittedDatesList, setSubmittedDatesList] = useState<string[]>([]);
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [activeHolidayTooltipDate, setActiveHolidayTooltipDate] = useState<string | null>(null);

  const allDisabledDays = useMemo(() => {
    const disabledWeekOffs = allowWeekoffTimesheet ? [] : weekOffDates;
    const disabledHolidays = hideHolidayTimesheet ? holidayDates : [];
    return Array.from(new Set([...disabledWeekOffs, ...disabledHolidays, ...submittedDatesList, ...nonEditableDays]));
  }, [allowWeekoffTimesheet, weekOffDates, hideHolidayTimesheet, holidayDates, submittedDatesList, nonEditableDays]);

  const dayStatusMap = useMemo(() => {
    const map: Record<string, "Week Off" | "Holiday" | "Draft" | "Submitted" | "Approved" | "Rejected"> = {};
    daysOfWeek.forEach(day => {
      const dateKey = format(day, "yyyy-MM-dd");
      if (submittedDatesList.includes(dateKey)) {
        map[dateKey] = "Submitted";
        return;
      }
      const dayData = weeklyData?.days?.find(d => d.date === dateKey);
      const records = dayData?.timesheet_records || [];

      if (records.length > 0) {
        const hasRejected = records.some(r => r.custom_timesheet_status === "Rejected");
        const hasDraft = records.some(r => r.custom_timesheet_status === "Draft");
        const hasApproved = records.some(r => r.custom_timesheet_status === "Approved");
        const hasSubmitted = records.some(
          r => r.custom_timesheet_status === "Pending for Approval" || (r.custom_timesheet_status as string) === "Submitted"
        );

        if (hasRejected) {
          map[dateKey] = "Rejected";
          return;
        } else if (hasDraft) {
          map[dateKey] = "Draft";
          return;
        } else if (hasApproved) {
          map[dateKey] = "Approved";
          return;
        } else if (hasSubmitted) {
          map[dateKey] = "Submitted";
          return;
        } else {
          map[dateKey] = "Draft";
          return;
        }
      }

      if (weekOffDates.includes(dateKey)) {
        map[dateKey] = "Week Off";
        return;
      }

      if (holidayDates.includes(dateKey)) {
        map[dateKey] = "Holiday";
        return;
      }
    });
    return map;
  }, [daysOfWeek, weekOffDates, holidayDates, weeklyData, submittedDatesList]);

  const { uploadFiles } = useFileUploader();

  const hasChanges = useMemo(() => {
    return JSON.stringify(projectsData) !== JSON.stringify(initialProjectsData) || isFileModified;
  }, [projectsData, initialProjectsData, isFileModified]);

  const { data: uiPermission } = useGetUiPermission("Timesheet");
  const hasSavePermission = isActionEnabled(uiPermission, "save", "Timesheet");
  const hasSubmitPermission = isActionEnabled(uiPermission, "submit", "Timesheet");
  const hasCancelPermission = isActionEnabled(uiPermission, "cancel", "Timesheet");

  // Read-only only when ALL days are disabled (all approved/submitted/week-off/holiday) or timesheet is Cancelled
  const isReadOnly = useMemo(() => {
    if (timesheetStatus === "Cancelled") return true;
    const allDaysDisabled = daysOfWeek.every(day => {
      const dateKey = format(day, "yyyy-MM-dd");
      return allDisabledDays.includes(dateKey);
    });
    return allDaysDisabled;
  }, [timesheetStatus, daysOfWeek, allDisabledDays]);

  const isGridEditable = !isReadOnly && (hasSavePermission || hasSubmitPermission);

  // Single Day Selection handlers
  const handleToggleDateSelection = (dateKey: string) => {
    if (!showSelectDaysToSubmit || allDisabledDays.includes(dateKey) || !isGridEditable || isReadOnly) return;
    setSelectedDates(prev =>
      prev.includes(dateKey) ? prev.filter(d => d !== dateKey) : [...prev, dateKey]
    );
  };

  const handleSelectAllDays = () => {
    if (!showSelectDaysToSubmit) return;
    const selectableDays = daysOfWeek
      .map(day => format(day, "yyyy-MM-dd"))
      .filter(dateKey => !allDisabledDays.includes(dateKey));

    if (selectableDays.length === 0) return;

    if (selectedDates.length === selectableDays.length) {
      setSelectedDates([]);
    } else {
      setSelectedDates(selectableDays);
    }
  };

  // Modal States
  const [commentModalConfig, setCommentModalConfig] = useState<{
    isOpen: boolean;
    rowId: string;
    dateKey: string;
    projectName: string;
    dayLabel: string;
    comment: string;
  } | null>(null);
  const [modalCommentText, setModalCommentText] = useState("");



  // Mutation hooks
  const { mutate: createOrUpdateEntries, isPending } = useCreateOrUpdateTimesheetEntries();
  const isSaving = isPending || isSavingLocally;

  // Clear local state when week changes
  useEffect(() => {
    setAttachedFile(null);
    setIsFileModified(false);
    setNonEditableDays([]);
    setSelectedDates([]);
  }, [startOfWeekStr]);


  // Load timesheet data from weekly timesheet hook response
  // Each time_log becomes its own row in the grid
  useEffect(() => {
    console.log("Weekly timesheet data hook response:", weeklyData);
    if (!weeklyData) return;

    let foundName = "";

    // Collect unique time_log entries across all days by index order
    // Each time_log (project+task combo) gets its own row
    const rowsMap: Record<string, TimesheetRow> = {};
    const submittedDays: string[] = [];
    const lockedDays: string[] = []; // days with non-Draft approval status

    // Track all custom_timesheet_status values to derive overall status
    const allStatuses = new Set<TimesheetApprovalStatus>();

    (weeklyData.days || []).forEach(day => {
      const dateStr = day.date; // "yyyy-MM-dd"

      let isDaySubmitted = false;
      let isDayLocked = false;

      (day.timesheet_records || []).forEach(record => {
        if (!foundName && record.name) {
          foundName = record.name;
        }

        // Track the custom_timesheet_status
        const approvalStatus = record.custom_timesheet_status;
        if (approvalStatus) {
          allStatuses.add(approvalStatus);
        }

        // A day is locked (non-editable) if any record is NOT "Draft" and NOT "Rejected"
        if (approvalStatus && approvalStatus !== "Draft" && approvalStatus !== "Rejected") {
          isDayLocked = true;
        }

        if (
          approvalStatus === "Pending for Approval" ||
          (approvalStatus as string) === "Submitted"
        ) {
          isDaySubmitted = true;
        }

        (record.time_logs || []).forEach((log, logIndex) => {
          const projectId = log.project_id || "";
          const taskId = log.task || log.task_id || "";
          const parentTaskId = log.custom_parent_task_id || (!showSubtask ? taskId : "");
          const parentTaskName = log.custom_parent_task_name || (!showSubtask ? (log.task_name || taskId) : (log.custom_parent_task_id || ""));
          const key = `${projectId}_${taskId}_${logIndex}`;

          if (!rowsMap[key]) {
            rowsMap[key] = {
              id: key,
              project: projectId,
              projectName: log.project_name || projectId,
              parentTask: parentTaskId,
              parentTaskSubject: parentTaskName,
              task: taskId,
              taskSubject: log.task_name || taskId,
              activityType: "Service",
              isBillable: true,
              days: {}
            };
          }

          rowsMap[key].days[dateStr] = {
            hours: log.hours || 0,
            description: log.description || ""
          };
        });
      });

      if (isDaySubmitted) {
        submittedDays.push(dateStr);
      }
      if (isDayLocked) {
        lockedDays.push(dateStr);
      }
    });

    setSubmittedDatesList(submittedDays);
    setNonEditableDays(lockedDays);

    // Derive overall status:
    // Exclude non-editable days configured by backend (disabled week-offs / disabled holidays)
    // Rules:
    // - any Rejected -> Rejected
    // - any Draft (and no Rejected) -> Draft
    // - all Approved -> Approved
    // - all Pending For Approval / Submitted -> Submitted
    const configEligibleDays = daysOfWeek
      .map(day => format(day, "yyyy-MM-dd"))
      .filter(dateKey => {
        const isWeekOffDisabled = !allowWeekoffTimesheet && weekOffDates.includes(dateKey);
        const isHolidayDisabled = hideHolidayTimesheet && holidayDates.includes(dateKey);
        return !isWeekOffDisabled && !isHolidayDisabled;
      });

    let derivedStatus = "Draft";
    if (configEligibleDays.length > 0) {
      const dayStatuses = configEligibleDays.map(dateKey => {
        const dayRecords = (weeklyData.days || []).find(d => d.date === dateKey)?.timesheet_records || [];
        if (dayRecords.some(r => r.custom_timesheet_status === "Rejected")) {
          return "Rejected";
        }
        if (dayRecords.some(r => r.custom_timesheet_status === "Draft")) {
          return "Draft";
        }
        if (dayRecords.length > 0 && dayRecords.every(r => r.custom_timesheet_status === "Approved")) {
          return "Approved";
        }
        if (
          submittedDays.includes(dateKey) ||
          dayRecords.some(
            r =>
              r.custom_timesheet_status === "Pending for Approval" ||
              (r.custom_timesheet_status as string) === "Submitted"
          )
        ) {
          return "Submitted";
        }
        return "Draft";
      });

      if (dayStatuses.some(s => s === "Rejected")) {
        derivedStatus = "Rejected";
      } else if (dayStatuses.some(s => s === "Draft")) {
        derivedStatus = "Draft";
      } else if (dayStatuses.every(s => s === "Approved")) {
        derivedStatus = "Approved";
      } else if (dayStatuses.every(s => s === "Submitted" || s === "Approved")) {
        derivedStatus = "Submitted";
      } else {
        derivedStatus = "Draft";
      }
    }

    setTimesheetStatus(derivedStatus);

    const parsedData = Object.values(rowsMap);
    setProjectsData(parsedData);
    setInitialProjectsData(parsedData);
  }, [weeklyData, showSubtask, daysOfWeek, allowWeekoffTimesheet, weekOffDates, hideHolidayTimesheet, holidayDates]);

  // Add cell hour changes
  const handleHourChange = (rowId: string, dateKey: string, value: string) => {
    // Parse the input (support decimal or HH:MM)
    let hours = 0;
    if (value.trim()) {
      if (value.includes(":")) {
        const [h, m] = value.split(":").map(Number);
        if (!isNaN(h) && !isNaN(m)) {
          hours = h + m / 60;
        }
      } else {
        const parsed = parseFloat(value);
        if (!isNaN(parsed)) {
          hours = parsed;
        }
      }
    }

    setProjectsData(prev =>
      prev.map(row => {
        if (row.id !== rowId) return row;
        const currentDay = row.days[dateKey] || { hours: 0, description: "" };
        return {
          ...row,
          days: {
            ...row.days,
            [dateKey]: {
              ...currentDay,
              hours: hours
            }
          }
        };
      })
    );

    setValidationErrors(prev => {
      const newErrs = { ...prev };
      delete newErrs[`${rowId}_${dateKey}_hours`];
      return newErrs;
    });
  };

  // Format cell hours display on blur
  const formatCellOnBlur = (hours: number): string => {
    if (!hours) return "";
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}:${String(m).padStart(2, "0")}`;
  };

  // Summary stats
  const totals = useMemo(() => {
    let totalWeeklyHours = 0;
    let billableHours = 0;
    let nonBillableHours = 0;

    const dailyTotals: Record<string, number> = {};
    daysOfWeek.forEach(day => {
      dailyTotals[format(day, "yyyy-MM-dd")] = 0;
    });

    projectsData.forEach(row => {
      let rowTotal = 0;
      daysOfWeek.forEach(day => {
        const dateKey = format(day, "yyyy-MM-dd");
        const cell = row.days[dateKey];
        if (cell) {
          const hrs = cell.hours || 0;
          rowTotal += hrs;
          if (dailyTotals[dateKey] !== undefined) {
            dailyTotals[dateKey] += hrs;
          }
        }
      });

      totalWeeklyHours += rowTotal;
      if (row.isBillable) {
        billableHours += rowTotal;
      } else {
        nonBillableHours += rowTotal;
      }
    });

    return {
      totalWeeklyHours,
      billableHours,
      nonBillableHours,
      dailyTotals
    };
  }, [projectsData, daysOfWeek]);

  // Row Total Helper
  const getRowTotal = (row: TimesheetRow) => {
    return daysOfWeek.reduce((sum, day) => {
      const dateKey = format(day, "yyyy-MM-dd");
      return sum + (row.days[dateKey]?.hours || 0);
    }, 0);
  };

  // Navigation handlers
  const handlePrevWeek = () => {
    setCurrentDate(prev => subDays(prev, 7));
  };

  const handleNextWeek = () => {
    if (!disableNextWeek) {
      setCurrentDate(prev => addDays(prev, 7));
    } else {
      toast.error("You can not select uncoming Weeks.");
    }
  };



  const handleWeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value) {
      // value is "yyyy-Www" e.g. "2026-W32"
      const [yearStr, weekStr] = e.target.value.split("-W");
      const year = parseInt(yearStr, 10);
      const week = parseInt(weekStr, 10);
      // Calculate date from ISO week number
      // Jan 4 is always in ISO week 1
      const jan4 = new Date(year, 0, 4);
      const jan4Day = jan4.getDay() || 7; // Convert Sunday(0) to 7 for ISO
      const isoWeek1Start = new Date(jan4);
      isoWeek1Start.setDate(jan4.getDate() - jan4Day + 1); // Monday of ISO week 1
      const targetMonday = new Date(isoWeek1Start);
      targetMonday.setDate(isoWeek1Start.getDate() + (week - 1) * 7);
      // ISO week already starts on Monday, matching our weekStartsOn: 1
      const selected = targetMonday;
      const selectedStart = startOfWeek(selected, { weekStartsOn: 1 });
      if (selectedStart.getTime() > realCurrentWeekStart.getTime()) {
        toast.error("You can not select uncoming Weeks.");
        return;
      }
      setCurrentDate(selected);
    }
  };

  // Copy last week hours
  const handleCopyLastWeek = async () => {
    if (!employeeId) return;
    const prevWeekStart = subDays(currentWeekStart, 7);
    const prevWeekStartStr = format(prevWeekStart, "yyyy-MM-dd");

    loadingOverlay.show("Fetching last week's timesheet...");
    try {
      const prevData = await getWeeklyTimesheetData({
        employee_id: employeeId,
        week_start_date: prevWeekStartStr
      });

      loadingOverlay.hide();

      let hasLogs = false;
      let hasConflicts = false;
      const rowsMap: Record<string, TimesheetRow> = {};

      // Preserve already submitted days from current projectsData
      projectsData.forEach(row => {
        const preservedDays: Record<string, { hours: number; description: string }> = {};
        let hasSubmittedDays = false;

        Object.keys(row.days).forEach(dateKey => {
          if (submittedDatesList.includes(dateKey)) {
            preservedDays[dateKey] = { ...row.days[dateKey] };
            hasSubmittedDays = true;
          }
        });

        if (hasSubmittedDays) {
          rowsMap[row.id] = { ...row, days: preservedDays };
        }
      });

      (prevData.days || []).forEach(day => {
        const logDate = day.date; // "yyyy-MM-dd"
        // Shift date to current week
        const logDayIndex = parseISO(logDate).getDay(); // Sun-0, Mon-1...
        const mappedIndex = (logDayIndex + 6) % 7; // Mon-0, Tue-1... Sun-6
        const shiftedDateStr = format(addDays(currentWeekStart, mappedIndex), "yyyy-MM-dd");

        const dayHasLogs = (day.timesheet_records || []).some(record => (record.time_logs || []).length > 0);

        if (submittedDatesList.includes(shiftedDateStr) && dayHasLogs) {
          hasConflicts = true;
          return;
        }

        // Do not overwrite disabled days (week-offs or holidays based on settings)
        if (allDisabledDays.includes(shiftedDateStr)) {
          return;
        }

        (day.timesheet_records || []).forEach(record => {
          (record.time_logs || []).forEach((log, logIndex) => {
            hasLogs = true;
            const projectId = log.project_id || "";
            const taskId = log.task || log.task_id || "";
            const parentTaskId = log.custom_parent_task_id || (!showSubtask ? taskId : "");
            const parentTaskName = log.custom_parent_task_name || (!showSubtask ? (log.task_name || taskId) : (log.custom_parent_task_id || ""));
            const key = `${projectId}_${taskId}_${logIndex}`;

            if (!rowsMap[key]) {
              rowsMap[key] = {
                id: key,
                project: projectId,
                projectName: log.project_name || projectId,
                parentTask: parentTaskId,
                parentTaskSubject: parentTaskName,
                task: taskId,
                taskSubject: log.task_name || taskId,
                activityType: "Service",
                isBillable: true,
                days: {}
              };
            }

            rowsMap[key].days[shiftedDateStr] = {
              hours: log.hours || 0,
              description: log.description || ""
            };
          });
        });
      });

      if (hasLogs) {
        setProjectsData(Object.values(rowsMap));
        if (hasConflicts) {
          toast.error("Some records were skipped as they conflict with already submitted days.");
        } else {
          toast.success("Copied last week hours successfully!");
        }
      } else {
        if (hasConflicts) {
          toast.error("Could not copy last week hours because those days are already submitted.");
        } else {
          toast.error("No entries found in last week's timesheet");
        }
      }
    } catch (err) {
      loadingOverlay.hide();
      console.error(err);
      toast.error("Failed to copy last week hours");
    }
  };

  // Download Excel Template handler
  const handleDownloadTemplate = () => {
    try {
      downloadTimesheetTemplate({
        currentWeekStart,
        currentWeekEnd,
        daysOfWeek,
        projectsData,
        dayStatusMap,
        disabledDays: allDisabledDays,
        showSubtask,
      });
      toast.success("Timesheet template downloaded successfully");
    } catch (err) {
      console.error("Failed to download timesheet template", err);
      toast.error("Failed to download template");
    }
  };

  // Process Excel File handler (used by file input and drag-and-drop)
  const processExcelFile = async (file: File) => {
    loadingOverlay.show("Reading and parsing Excel file...");
    try {
      const { rows, rowCount, skippedDisabledHours } = await parseTimesheetExcelFile({
        file,
        daysOfWeek,
        existingRows: projectsData,
        disabledDays: allDisabledDays,
        showSubtask,
      });

      loadingOverlay.hide();

      if (rows.length > 0) {
        setProjectsData(rows);
        setValidationErrors({});
        if (skippedDisabledHours) {
          toast.success(`Imported ${rowCount} timesheet row${rowCount > 1 ? "s" : ""}. Disabled days (week-offs/submitted/locked) were not modified.`);
        } else {
          toast.success(`Successfully imported ${rowCount} timesheet row${rowCount > 1 ? "s" : ""} from Excel!`);
        }
      } else {
        toast.error("No valid timesheet rows found in the uploaded file.");
      }
    } catch (err: unknown) {
      loadingOverlay.hide();
      console.error("Failed to upload/parse Excel file", err);
      const msg = err instanceof Error ? err.message : "Failed to parse Excel file";
      toast.error(msg);
    }
  };

  // Upload and Parse Excel handler
  const handleUploadExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    await processExcelFile(files[0]);
  };

  // Drag and Drop Excel handler
  const handleDropExcel = async (file: File) => {
    await processExcelFile(file);
  };

  // Add Blank Row handler
  const handleAddBlankRow = () => {
    const tempId = `new_row_${Date.now()}`;
    const newRow: TimesheetRow = {
      id: tempId,
      project: "",
      projectName: "",
      parentTask: "",
      parentTaskSubject: "",
      task: "",
      taskSubject: "",
      activityType: "Service",
      isBillable: true,
      days: {}
    };
    setProjectsData([...projectsData, newRow]);
  };

  // Configure inline Formio row
  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */ }
  const handleConfigureRow = useCallback((rowId: string, submission: any) => {
    const data = submission.data;
    const projectVal = data.project || "";
    const parentTaskVal = data.custom_parent_task || "";
    const taskVal = showSubtask ? (data.task || "") : (data.custom_parent_task || "");
    const isBillable = data.is_billable !== undefined ? !!data.is_billable : true;

    setProjectsData(prev =>
      prev.map(r => {
        if (r.id !== rowId) return r;
        return {
          ...r,
          project: projectVal,
          projectName: projectVal,
          parentTask: parentTaskVal,
          parentTaskSubject: parentTaskVal,
          task: taskVal,
          taskSubject: taskVal,
          isBillable: isBillable
        };
      })
    );

    setValidationErrors(prev => {
      const newErrs = { ...prev };
      delete newErrs[`${rowId}_project_task`];
      return newErrs;
    });
  }, [showSubtask]);
  const formSchema = useMemo(() => {
    const schema = JSON.parse(JSON.stringify(addTimeEntrySchema));
    if (!showSubtask) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const projectComp = schema.components.find((c: any) => c.key === "project");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const taskColumns = schema.components.find((c: any) => c.key === "taskColumns");
      if (projectComp && taskColumns && taskColumns.columns) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const parentTaskComp = taskColumns.columns[0].components.find((c: any) => c.key === "custom_parent_task");

        // When subtask is hidden, show only non-group (leaf) tasks instead of group tasks
        if (parentTaskComp) {
          parentTaskComp.data.url = parentTaskComp.data.url.replace(
            '["is_group","=",1]',
            '["is_group","=",0]'
          );
        }

        // Put project and parent_task side-by-side in a new columns layout
        schema.components = [
          {
            type: "columns",
            columns: [
              {
                width: 6,
                components: [projectComp]
              },
              {
                width: 6,
                components: [parentTaskComp]
              }
            ]
          }
        ];
      }
    }
    return schema;
  }, [showSubtask]);


  // Comments handlers
  const handleOpenComment = (rowId: string, dateKey: string, projectName: string, dayLabel: string) => {
    const row = projectsData.find(r => r.id === rowId);
    const cell = row?.days[dateKey] || { hours: 0, description: "" };
    setCommentModalConfig({
      isOpen: true,
      rowId,
      dateKey,
      projectName,
      dayLabel,
      comment: cell.description || ""
    });
    setModalCommentText(cell.description || "");
  };

  const handleSaveComment = (commentText: string) => {
    if (!commentModalConfig) return;
    const { rowId, dateKey } = commentModalConfig;

    setProjectsData(prev =>
      prev.map(row => {
        if (row.id !== rowId) return row;
        const currentDay = row.days[dateKey] || { hours: 0, description: "" };
        return {
          ...row,
          days: {
            ...row.days,
            [dateKey]: {
              ...currentDay,
              description: commentText
            }
          }
        };
      })
    );

    setValidationErrors(prev => {
      const newErrs = { ...prev };
      delete newErrs[`${rowId}_${dateKey}_comment`];
      return newErrs;
    });

    setCommentModalConfig(null);
    toast.success("Comment updated locally");
  };


  // Delete entry row
  const handleDeleteRow = (rowId: string) => {
    setProjectsData(prev => prev.filter(row => row.id !== rowId));
    toast.success("Row removed");
  };



  // Save / Submit Backend Actions
  const handleSaveOrSubmit = (isSubmit: boolean) => {
    if (!employeeId) {
      toast.error("Employee details not loaded.");
      return;
    }

    const isSelective = showSelectDaysToSubmit && selectedDates.length > 0;
    const targetDates = isSelective
      ? selectedDates.filter(d => !allDisabledDays.includes(d))
      : daysOfWeek
        .map(d => format(d, "yyyy-MM-dd"))
        .filter(d => !allDisabledDays.includes(d));

    if (targetDates.length === 0) {
      toast.error("No editable days available to " + (isSubmit ? "submit." : "save."));
      return;
    }

    const newErrors: Record<string, string> = {};
    let hasValidationError = false;

    if (isSelective) {
      // Validate that every selected day has logged hours on at least one row
      targetDates.forEach(dateKey => {
        const dayTotal = projectsData.reduce((sum, row) => sum + (row.days[dateKey]?.hours || 0), 0);
        if (dayTotal <= 0) {
          hasValidationError = true;
          const dayDate = parseISO(dateKey);
          const dayLabel = format(dayDate, "EEE, dd MMM");
          newErrors[`day_${dateKey}_empty`] = `${dayLabel}: Please log hours for this selected day.`;
        }
      });
    }

    projectsData.forEach((row, index) => {
      const rowIndex = index + 1;
      const isTaskMissing = showSubtask ? (!row.task || !row.parentTask) : !row.parentTask;

      // Check if this row has logged hours on any target date
      const hasHoursOnTargetDates = targetDates.some(dateKey => {
        const cell = row.days[dateKey];
        return cell && cell.hours > 0;
      });

      if (!isSelective || hasHoursOnTargetDates) {
        if (!row.project || isTaskMissing) {
          hasValidationError = true;
          newErrors[`${row.id}_project_task`] = `Row ${rowIndex}: Project and Task are required.`;
        }
      }

      let hasAtLeastOneCellInRow = false;

      for (const day of daysOfWeek) {
        const dateKey = format(day, "yyyy-MM-dd");
        const cell = row.days[dateKey];

        if (cell && cell.hours > 0) {
          hasAtLeastOneCellInRow = true;
          if (targetDates.includes(dateKey) && (!cell.description || !cell.description.trim())) {
            hasValidationError = true;
            newErrors[`${row.id}_${dateKey}_comment`] = `Row ${rowIndex} (${format(day, 'EEE')}): Comment is required.`;
          }
        }
      }

      if (!isSelective && !hasAtLeastOneCellInRow) {
        hasValidationError = true;
        if (!newErrors[`${row.id}_project_task`]) {
          newErrors[`${row.id}_empty_row`] = `Row ${rowIndex}: Must have at least one logged hour.`;
        }
      }
    });

    setValidationErrors(newErrors);

    if (hasValidationError) {
      Object.values(newErrors).forEach(err => toast.error(err));
      return;
    }

    const statusValue = isSubmit ? "Submit" : "Draft";
    const payload: Record<string, { status: string; rows?: RowItemType[] }> = {};

    let hasAtLeastOneHourEntry = false;

    targetDates.forEach(dateKey => {
      const rowsForDay: RowItemType[] = [];

      projectsData.forEach(row => {
        const cell = row.days[dateKey];
        if (cell && cell.hours > 0) {
          const taskPayload = showSubtask
            ? {
              task: row.task || "",
              custom_parent_task: row.parentTask || "",
            }
            : {
              task: row.parentTask || "",
            };

          rowsForDay.push({
            project: row.project || "",
            ...taskPayload,
            comment: cell.description || "",
            hrs: cell.hours
          });
        }
      });

      if (rowsForDay.length > 0) {
        hasAtLeastOneHourEntry = true;
        payload[dateKey] = {
          status: statusValue,
          rows: rowsForDay
        };
      } else {
        // Check if this day originally had data from the backend that was cleared
        const hadBackendData = initialProjectsData.some(row => {
          const initialCell = row.days[dateKey];
          return initialCell && initialCell.hours > 0;
        });

        if (hadBackendData) {
          // Day had backend data but user cleared hours/comment — send Delete
          payload[dateKey] = {
            status: "Delete"
          };
        }
      }
    });

    if (!hasAtLeastOneHourEntry && !Object.values(payload).some(entry => entry.status === "Delete")) {
      toast.error(
        targetDates.length === 1
          ? `Please log at least one hour for ${format(parseISO(targetDates[0]), "dd MMM")}.`
          : "Please log at least one hour on any project day."
      );
      return;
    }

    const loadingMsg = isSubmit
      ? (targetDates.length === 1 ? `Submitting timesheet for ${format(parseISO(targetDates[0]), "dd MMM")}...` : "Submitting timesheet entries...")
      : (targetDates.length === 1 ? `Saving timesheet for ${format(parseISO(targetDates[0]), "dd MMM")}...` : "Saving timesheet entries...");

    loadingOverlay.show(loadingMsg);
    setIsSavingLocally(true);

    createOrUpdateEntries(payload, {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onSuccess: async (data: any) => {
        setIsSavingLocally(false);
        loadingOverlay.hide();
        const successMsg = isSubmit
          ? (targetDates.length === 1 ? `Timesheet for ${format(parseISO(targetDates[0]), "dd MMM")} submitted successfully` : "Timesheet submitted successfully")
          : (targetDates.length === 1 ? `Timesheet for ${format(parseISO(targetDates[0]), "dd MMM")} saved successfully` : "Timesheet saved successfully");
        toast.success(successMsg);
        setLastSavedTime(format(new Date(), "hh:mm a"));
        if (isSubmit) {
          const newSubmitted = Object.keys(payload).filter(date => payload[date].status === "Submit");
          const updatedSubmittedList = Array.from(new Set([...submittedDatesList, ...newSubmitted]));
          setSubmittedDatesList(updatedSubmittedList);
          setNonEditableDays(prev => Array.from(new Set([...prev, ...newSubmitted])));
          setSelectedDates(prev => prev.filter(d => !newSubmitted.includes(d)));

          const configEligibleDays = daysOfWeek
            .map(day => format(day, "yyyy-MM-dd"))
            .filter(dateKey => {
              const isWeekOffDisabled = !allowWeekoffTimesheet && weekOffDates.includes(dateKey);
              const isHolidayDisabled = hideHolidayTimesheet && holidayDates.includes(dateKey);
              return !isWeekOffDisabled && !isHolidayDisabled;
            });

          let derivedStatus = "Draft";
          if (configEligibleDays.length > 0) {
            const dayStatuses = configEligibleDays.map(dateKey => {
              const dayRecords = (weeklyData?.days || []).find(d => d.date === dateKey)?.timesheet_records || [];
              if (dayRecords.some(r => r.custom_timesheet_status === "Rejected")) {
                return "Rejected";
              }
              if (dayRecords.some(r => r.custom_timesheet_status === "Draft") && !updatedSubmittedList.includes(dateKey)) {
                return "Draft";
              }
              if (dayRecords.length > 0 && dayRecords.every(r => r.custom_timesheet_status === "Approved")) {
                return "Approved";
              }
              if (
                updatedSubmittedList.includes(dateKey) ||
                dayRecords.some(
                  r =>
                    r.custom_timesheet_status === "Pending for Approval" ||
                    (r.custom_timesheet_status as string) === "Submitted"
                )
              ) {
                return "Submitted";
              }
              return "Draft";
            });

            if (dayStatuses.some(s => s === "Rejected")) {
              derivedStatus = "Rejected";
            } else if (dayStatuses.some(s => s === "Draft")) {
              derivedStatus = "Draft";
            } else if (dayStatuses.every(s => s === "Approved")) {
              derivedStatus = "Approved";
            } else if (dayStatuses.every(s => s === "Submitted" || s === "Approved")) {
              derivedStatus = "Submitted";
            } else {
              derivedStatus = "Draft";
            }
          }
          setTimesheetStatus(derivedStatus);
        } else {
          setTimesheetStatus("Draft");
        }

        setInitialProjectsData(projectsData);

        if (attachedFile && isFileModified) {
          const timesheetIds = data?.timesheets || [];
          if (timesheetIds.length > 0) {
            try {
              loadingOverlay.show("Uploading attached file...");
              await uploadFiles([{ file: attachedFile }], "Timesheet", timesheetIds);
              setIsFileModified(false);
              setAttachedFile(null);
              toast.success("File uploaded and attached successfully.");
            } catch (err) {
              console.error("Failed to upload/attach file", err);
              toast.error("Failed to upload attached file.");
            } finally {
              loadingOverlay.hide();
            }
          }
        }
      },
      onError: (err) => {
        setIsSavingLocally(false);
        loadingOverlay.hide();
        toast.error(errorResponseFormater(err, "Failed to save timesheet entries"));
      }
    });
  };

  const handleCancelTimesheet = () => {
    if (!employeeId) {
      toast.error("Employee details not loaded.");
      return;
    }

    const payload: Record<string, { status: string }> = {};
    daysOfWeek.forEach(day => {
      const dateKey = format(day, "yyyy-MM-dd");
      payload[dateKey] = {
        status: "Cancel"
      };
    });

    loadingOverlay.show("Cancelling timesheet entries...");
    setIsSavingLocally(true);

    createOrUpdateEntries(payload, {
      onSuccess: () => {
        setIsSavingLocally(false);
        loadingOverlay.hide();
        toast.success("Timesheet cancelled successfully");
        setLastSavedTime(format(new Date(), "hh:mm a"));
        setTimesheetStatus("Cancelled");
        setProjectsData([]);
      },
      onError: (err) => {
        setIsSavingLocally(false);
        loadingOverlay.hide();
        toast.error(errorResponseFormater(err, "Failed to cancel timesheet entries"));
      }
    });
  };


  // Attachment upload simulation
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setAttachedFile(e.target.files[0]);
      setIsFileModified(true);
      toast.success(`Attached file: ${e.target.files[0].name}`);
    }
  };

  return (
    <div className="flex flex-col h-full bg-app project-theme-wrapper pb-24">
      {/* Header Info */}
      {isDesktop &&
        <TimesheetHeader isReadOnly={isReadOnly} />
      }
      {/* Navigation and Summary stats */}
      <div className="p-0 sm:p-6 space-y-6 w-full sm:pb-24 pb-2">
        <TimesheetTopBar
          currentWeekStart={currentWeekStart}
          currentWeekEnd={currentWeekEnd}
          handlePrevWeek={handlePrevWeek}
          handleNextWeek={handleNextWeek}
          handleWeekChange={handleWeekChange}
          isReadOnly={isReadOnly}
          isGridEditable={isGridEditable}
          handleCopyLastWeek={handleCopyLastWeek}
          handleDownloadTemplate={handleDownloadTemplate}
          handleUploadExcel={handleUploadExcel}
          handleDropExcel={handleDropExcel}
          timesheetStatus={timesheetStatus}
        />

        {/* Progress Bar & Details */}
        <TimesheetMetrics
          totals={totals}
          formatCellOnBlur={formatCellOnBlur}
          employeeDetails={employeeDetails}
          user={user}
          company={company}
          timesheetStatus={timesheetStatus}
        />

        {!isDetailLoading && attachedFilesList.length > 0 && (
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-3">
            <Typography variant="subheading" className="text-gray-800 text-sm font-semibold">Attached File{attachedFilesList.length > 1 ? "s" : ""}</Typography>
            <div className="w-full md:w-2/3 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {attachedFilesList.map((fileInfo, idx) => (
                <AttachmentCard
                  key={idx}
                  fileUrl={fileInfo.file_url}
                  fileName={fileInfo.file_name}
                />
              ))}
            </div>
          </div>
        )}

        {showSelectDaysToSubmit && !isDesktop && !isDetailLoading && (
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Typography variant="bodySmall" className="text-gray-900 font-bold text-xs tracking-wide">
                  Select Days
                </Typography>
                {selectedDates.length > 0 && (
                  <span className="bg-primary/10 text-primary text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                    {selectedDates.length} selected
                  </span>
                )}
              </div>
              {!isReadOnly && isGridEditable && daysOfWeek.some(day => !allDisabledDays.includes(format(day, "yyyy-MM-dd"))) && (() => {
                const selectableDays = daysOfWeek.filter(day => !allDisabledDays.includes(format(day, "yyyy-MM-dd")));
                const allSelected = selectableDays.length > 0 && selectableDays.every(day => selectedDates.includes(format(day, "yyyy-MM-dd")));
                return (
                  <button
                    type="button"
                    onClick={handleSelectAllDays}
                    className="flex items-center gap-1.5 cursor-pointer select-none group"
                    title="Select / Deselect all editable days"
                  >
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${allSelected
                        ? "bg-primary border-primary text-white scale-110"
                        : "border-gray-300 text-transparent group-hover:border-primary/50"
                      }`}>
                      {allSelected && (
                        <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <span className="text-gray-600 group-hover:text-primary transition-colors text-xs font-semibold">
                      All
                    </span>
                  </button>
                );
              })()}
            </div>
            <div className="grid grid-cols-7 gap-0.5 sm:gap-1.5">
              {daysOfWeek.map(day => {
                const dateKey = format(day, "yyyy-MM-dd");
                const status = dayStatusMap[dateKey];
                const isDayDisabled = allDisabledDays.includes(dateKey) || !isGridEditable || isReadOnly;
                const isSelected = selectedDates.includes(dateKey);
                const holidayTitle = holidayTitleMap[dateKey];

                return (
                  <div
                    key={dateKey}
                    onClick={() => {
                      if (!isDayDisabled) {
                        handleToggleDateSelection(dateKey);
                      }
                    }}
                    className={`relative min-w-0 flex flex-col items-center py-2 px-0.5 sm:py-2.5 sm:px-1 rounded-xl border transition-all duration-200 select-none ${!isDayDisabled ? "cursor-pointer hover:shadow-md active:scale-[0.97]" : "cursor-default"
                      } ${isSelected
                        ? "bg-primary-50/70 border-primary shadow-sm ring-1 ring-primary/20"
                        : isDayDisabled
                          ? "bg-gray-50/90 border-gray-200/80"
                          : "bg-white border-gray-200 hover:border-gray-300 shadow-xs"
                      }`}
                  >
                    <div className="flex items-center justify-center mb-1.5">
                      {!isDayDisabled ? (
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${isSelected
                            ? "bg-primary border-primary text-white scale-110"
                            : "border-gray-300 text-transparent"
                          }`}>
                          {isSelected && (
                            <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                      ) : (
                        <div className="w-4 h-4 rounded-full bg-gray-200/60 flex items-center justify-center">
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                        </div>
                      )}
                    </div>
                    <span className={`text-sm font-bold leading-none ${isDayDisabled ? "text-gray-600" : "text-gray-900"}`}>
                      {format(day, "d")}
                    </span>
                    <span className={`text-[10px] font-semibold mt-1 leading-none uppercase ${isDayDisabled ? "text-gray-400" : "text-gray-500"}`}>
                      {format(day, "EEE")}
                    </span>
                    {status && (
                      <div className="mt-2 flex flex-col items-center gap-1 w-full">
                        {status !== "Holiday" && (
                          <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-md leading-none text-center w-full truncate ${status === "Week Off"
                              ? "bg-orange-50 text-orange-600 border border-orange-200/70"
                              : status === "Approved"
                                ? "bg-emerald-50 text-emerald-600 border border-emerald-200/70"
                                : status === "Submitted"
                                  ? "bg-amber-50 text-amber-600 border border-amber-200/70"
                                  : status === "Rejected"
                                    ? "bg-red-50 text-red-600 border border-red-200/70"
                                    : "bg-sky-50 text-sky-700 border border-sky-200/80 font-semibold"
                            }`}>
                            {status === "Week Off" ? "Off" : (status || "Draft")}
                          </span>
                        )}
                        {(status === "Holiday" || holidayDates.includes(dateKey)) && (
                          <div className="group relative flex items-center justify-center w-full">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveHolidayTooltipDate(prev => prev === dateKey ? null : dateKey);
                              }}
                              className="inline-flex items-center gap-0.5 text-[8px] font-bold px-1.5 py-0.5 rounded-md leading-none text-center bg-violet-50 text-violet-700 border border-violet-200/70 cursor-pointer hover:bg-violet-100 transition-colors"
                            >
                              <span>Holiday</span>
                              {holidayTitle && (
                                <span className="w-2.5 h-2.5 rounded-full bg-violet-200/80 text-violet-800 text-[7px] font-bold inline-flex items-center justify-center leading-none">
                                  ?
                                </span>
                              )}
                            </button>
                            {holidayTitle && (
                              <span className={`pointer-events-none absolute top-full left-1/2 -translate-x-1/2 mt-1.5 px-2.5 py-1 rounded-lg bg-gray-900 text-white text-[10px] font-medium whitespace-nowrap text-center transition-all duration-200 shadow-2xl z-[100] ${activeHolidayTooltipDate === dateKey ? "opacity-100 visible" : "opacity-0 invisible group-hover:opacity-100 group-hover:visible"
                                }`}>
                                {holidayTitle}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Weekly Grid Sheet Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {isDetailLoading ? (
            <div className="p-6">
              <TableSkeleton columns={8} rows={4} />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className={`w-full text-sm text-left border-collapse ${isDesktop ? "min-w-[1000px]" : ""}`}>
                {isDesktop && (
                  <thead className="bg-gray-50/70 border-b border-gray-100">
                    <tr>
                      <th className="px-6 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider min-w-[380px] align-top">
                        <div className="flex items-center justify-between min-h-[20px]">
                          <span>Projects / Tasks</span>
                          {showSelectDaysToSubmit && !isReadOnly && isGridEditable && daysOfWeek.some(day => !allDisabledDays.includes(format(day, "yyyy-MM-dd"))) && (() => {
                            const selectableDays = daysOfWeek.filter(day => !allDisabledDays.includes(format(day, "yyyy-MM-dd")));
                            const allSelected = selectableDays.length > 0 && selectableDays.every(day => selectedDates.includes(format(day, "yyyy-MM-dd")));
                            return (
                              <button
                                type="button"
                                onClick={handleSelectAllDays}
                                className="flex items-center gap-1.5 cursor-pointer select-none group"
                                title="Select / Deselect all editable days"
                              >
                                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${allSelected
                                    ? "bg-primary border-primary text-white scale-110"
                                    : "border-gray-300 text-transparent group-hover:border-primary/50"
                                  }`}>
                                  {allSelected && (
                                    <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                  )}
                                </div>
                                <span className="text-gray-500 group-hover:text-primary transition-colors text-[11px] normal-case font-medium">
                                  Select all
                                </span>
                              </button>
                            );
                          })()}
                        </div>
                      </th>
                      {daysOfWeek.map((day) => {
                        const dateKey = format(day, "yyyy-MM-dd");
                        const status = dayStatusMap[dateKey];
                        const isDayDisabled = allDisabledDays.includes(dateKey) || !isGridEditable || isReadOnly;
                        const isSelected = selectedDates.includes(dateKey);
                        const holidayTitle = holidayTitleMap[dateKey];

                        return (
                          <th
                            key={dateKey}
                            onClick={() => {
                              if (showSelectDaysToSubmit && !isDayDisabled) {
                                handleToggleDateSelection(dateKey);
                              }
                            }}
                            className={`px-3 py-3.5 text-center border-l border-gray-100/60 min-w-[100px] align-top transition-all duration-200 ${isSelected ? "bg-primary-50/40" : ""
                              } ${showSelectDaysToSubmit && !isDayDisabled ? "cursor-pointer hover:bg-gray-100/50 select-none" : ""}`}
                          >
                            <div className="flex flex-col items-center justify-start gap-1">
                              {showSelectDaysToSubmit && (
                                <div className="h-5 flex items-center justify-center">
                                  {!isDayDisabled ? (
                                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${isSelected
                                        ? "bg-primary border-primary text-white scale-110"
                                        : "border-gray-300 text-transparent hover:border-primary/50"
                                      }`}>
                                      {isSelected && (
                                        <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                        </svg>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="w-4 h-4 rounded-full bg-gray-200/50 flex items-center justify-center">
                                      <span className="w-1 h-1 rounded-full bg-gray-400/70" />
                                    </div>
                                  )}
                                </div>
                              )}

                              <span className={`text-sm font-bold leading-none ${isDayDisabled ? "text-gray-600" : "text-gray-900"}`}>
                                {format(day, "d MMM")}
                              </span>

                              <span className={`text-[11px] font-bold text-center leading-none uppercase ${isDayDisabled ? "text-gray-400" : "text-gray-500"}`}>
                                {format(day, "EEE")}
                              </span>

                              {status && (
                                <div className="mt-1 flex flex-col items-center justify-center gap-1">
                                  {status !== "Holiday" && (
                                    <span
                                      className={`text-[10px] font-semibold px-2 py-[3px] rounded-xl ${status === "Week Off"
                                          ? "bg-orange-50 text-orange-600 border border-orange-200/60"
                                          : status === "Approved"
                                            ? "bg-emerald-50 text-emerald-600 border border-emerald-200/60"
                                            : status === "Submitted"
                                              ? "bg-amber-50 text-amber-600 border border-amber-200/60"
                                              : status === "Rejected"
                                                ? "bg-red-50 text-red-600 border border-red-200/60"
                                                : "bg-sky-50 text-sky-700 border border-sky-200/80 font-semibold"
                                        }`}
                                    >
                                      {status}
                                    </span>
                                  )}
                                  {(status === "Holiday" || holidayDates.includes(dateKey)) && (
                                    <div className="group relative inline-flex items-center">
                                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-[3px] rounded-xl bg-violet-50 text-violet-700 border border-violet-200/80 cursor-help hover:bg-violet-100 transition-colors">
                                        <span>Holiday</span>
                                        {holidayTitle && (
                                          <span className="w-3 h-3 rounded-full bg-violet-200/80 text-violet-800 text-[9px] font-bold inline-flex items-center justify-center leading-none">
                                            ?
                                          </span>
                                        )}
                                      </span>
                                      {holidayTitle && (
                                        <span className="pointer-events-none absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-1.5 rounded-lg bg-gray-900 text-white text-xs font-medium whitespace-nowrap text-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-2xl z-[100]">
                                          {holidayTitle}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </th>
                        );
                      })}
                      <th className="px-4 py-3.5 text-center border-l border-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wider w-[120px] align-top">
                        Total Hours
                      </th>
                      <th className="px-4 py-3.5 text-center border-l border-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wider w-[60px] align-top">

                      </th>
                    </tr>
                  </thead>
                )}
                <tbody className="divide-y divide-gray-100">
                  {/* Attendance row */}
                  {weeklyData?.days && (
                    isDesktop ? (
                      <tr className="bg-gray-50/30 text-gray-600 font-medium">
                        <td className="px-6 py-3 font-semibold text-gray-700">
                          Attendance Hours
                        </td>
                        {daysOfWeek.map(day => {
                          const dateKey = format(day, "yyyy-MM-dd");
                          return (
                            <td key={dateKey} className="px-3 py-3 text-center border-l border-gray-100/60">
                              <span className="text-sm text-gray-600 font-medium">
                                {attendanceHoursMap[dateKey] || "0:00"}
                              </span>
                            </td>
                          );
                        })}
                        <td className="px-4 py-3 text-center border-l border-gray-100/60 font-bold">
                          {formatCellOnBlur(
                            daysOfWeek.reduce((acc, day) => {
                              const dateKey = format(day, "yyyy-MM-dd");
                              const dData = weeklyData.days.find(d => d.date === dateKey);
                              return acc + (dData?.attendance_hours || 0);
                            }, 0)
                          ) || "0:00"}
                        </td>
                        <td className="border-l border-gray-100/60"></td>
                      </tr>
                    ) : (
                      <tr className="block border-none px-1 py-2 sm:px-2 sm:py-3">
                        <td className="block border-none w-full">
                          <div className="bg-gray-50/80 backdrop-blur-sm rounded-xl p-2 sm:p-3 shadow-sm space-y-2.5">
                            <div className="flex justify-between items-center font-semibold text-gray-700">
                              <span className="text-sm">Attendance Hours</span>
                              <span className="text-primary font-bold">
                                {formatCellOnBlur(daysOfWeek.reduce((acc, day) => acc + ((weeklyData.days.find(d => d.date === format(day, "yyyy-MM-dd")))?.attendance_hours || 0), 0)) || "0:00"}
                              </span>
                            </div>
                            <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
                              {daysOfWeek.map(day => {
                                const dateKey = format(day, "yyyy-MM-dd");
                                return (
                                  <div key={dateKey} className="min-w-0 flex flex-col items-center">
                                    <span className="text-[10px] sm:text-[11px] font-bold text-gray-900 leading-tight">{format(day, "d")}</span>
                                    <span className="text-[8px] sm:text-[9px] font-semibold text-gray-400 mb-0.5 leading-tight uppercase">{format(day, "EEE")}</span>
                                    <span className="text-[9px] sm:text-[10px] font-bold text-gray-600 bg-gray-200/40 w-full text-center py-1 rounded-md truncate px-0.5">
                                      {attendanceHoursMap[dateKey] || "0:00"}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )
                  )}

                  {/* Project Rows */}
                  {projectsData.length === 0 ? (
                    <tr className={isDesktop ? "" : "block"}>
                      <td colSpan={10} className={isDesktop ? "px-6 py-12" : "block p-8 w-full"}>
                        <NoDataFound
                          title="No time logs added"
                          subtitle={(!isReadOnly && isGridEditable) ? "+ Add Time Entry" : "No project rows found."}
                          onClick={(!isReadOnly && isGridEditable) ? handleAddBlankRow : undefined}
                        />
                      </td>
                    </tr>
                  ) : (
                    projectsData.map(row => {
                      const projName = row.projectName || row.project || "[No Project]";
                      const taskName = showSubtask
                        ? (row.taskSubject || row.task || "[No Task]")
                        : (row.parentTaskSubject || row.parentTask || row.taskSubject || row.task || "[No Task]");

                      return (
                        <TimesheetRow
                          key={row.id}
                          row={row}
                          projName={projName}
                          taskName={taskName}
                          isGridEditable={isGridEditable}
                          isReadOnly={isReadOnly}
                          validationErrors={validationErrors}
                          handleConfigureRow={handleConfigureRow}
                          formSchema={formSchema}
                          daysOfWeek={daysOfWeek}
                          formatCellOnBlur={formatCellOnBlur}
                          handleHourChange={handleHourChange}
                          handleOpenComment={handleOpenComment}
                          getRowTotal={getRowTotal}
                          handleDeleteRow={handleDeleteRow}
                          disabledDays={allDisabledDays}
                          dayStatusMap={dayStatusMap}
                          showSubtask={showSubtask}
                          company={company}
                          selectedDates={selectedDates}
                        />
                      );
                    })
                  )}

                  {/* Add Entry Action Row */}
                  {!isReadOnly && isGridEditable && (
                    isDesktop ? (
                      <tr>
                        <td colSpan={10} className="px-6 py-4 bg-gray-50/50">
                          <AddTimeEntryButton onClick={handleAddBlankRow} variant="desktop" />
                        </td>
                      </tr>
                    ) : (
                      <tr className="block p-4">
                        <td className="block w-full text-center">
                          <AddTimeEntryButton onClick={handleAddBlankRow} variant="mobile" />
                        </td>
                      </tr>
                    )
                  )}

                  {/* Table Footer Totals */}
                  {isDesktop ? (
                    <tr className="bg-gray-100/50 text-gray-900 font-bold border-t border-gray-200">
                      <td className="px-6 py-4 font-bold text-gray-800">
                        Total hours/day
                      </td>
                      {daysOfWeek.map(day => {
                        const dateKey = format(day, "yyyy-MM-dd");
                        const dayHrs = totals.dailyTotals[dateKey] || 0;
                        return (
                          <td key={dateKey} className="px-3 py-4 text-center border-l border-gray-100">
                            {formatCellOnBlur(dayHrs) || "0:00"}
                          </td>
                        );
                      })}
                      <td className="px-4 py-4 text-center border-l border-gray-100 text-base font-extrabold text-primary">
                        {formatCellOnBlur(totals.totalWeeklyHours) || "0:00"}
                      </td>
                      <td className="border-l border-gray-100"></td>
                    </tr>
                  ) : (
                    <tr className="block border-t border-gray-200 px-1 py-2 sm:px-2 sm:py-4 bg-gray-50/50">
                      <td className="block w-full">
                        <div className="space-y-3 bg-white p-2 sm:p-3 rounded-xl border border-gray-200 shadow-sm">
                          <div className="flex justify-between items-center font-bold text-gray-900">
                            <span className="text-sm">Total Weekly Hours</span>
                            <span className="text-primary text-base sm:text-lg">{formatCellOnBlur(totals.totalWeeklyHours) || "0:00"}</span>
                          </div>
                          <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
                            {daysOfWeek.map(day => {
                              const dateKey = format(day, "yyyy-MM-dd");
                              const dayHrs = totals.dailyTotals[dateKey] || 0;
                              const isSelected = selectedDates.includes(dateKey);
                              return (
                                <div key={dateKey} className={`min-w-0 flex flex-col items-center p-0.5 rounded ${isSelected ? "bg-primary-50" : ""}`}>
                                  <span className="text-[10px] sm:text-[11px] font-bold text-gray-600 leading-tight">{format(day, "d")}</span>
                                  <span className="text-[8px] sm:text-[9px] text-gray-400 mb-0.5 leading-tight uppercase">{format(day, "EEE")}</span>
                                  <span className="text-[9px] sm:text-[10px] font-bold bg-primary/10 text-primary w-full text-center py-1 rounded truncate px-0.5">{formatCellOnBlur(dayHrs) || "0:00"}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Edit Cell Comment Modal */}
      {commentModalConfig?.isOpen &&
        <CommentModal
          onClose={() => setCommentModalConfig(null)}
          label={`${commentModalConfig?.projectName} • ${commentModalConfig?.dayLabel}`}
          value={modalCommentText}
          onChange={(e) => setModalCommentText(e.target.value)}
          disabled={isReadOnly || !isGridEditable || (commentModalConfig?.dateKey ? allDisabledDays.includes(commentModalConfig.dateKey) : false)}
          showSubmitButton={!isReadOnly && isGridEditable && (commentModalConfig?.dateKey ? !allDisabledDays.includes(commentModalConfig.dateKey) : true)}
          handleSaveComment={() => {
            handleSaveComment(modalCommentText);
          }}
          onReset={() => {
            setModalCommentText("");
            handleSaveComment("");
          }}
        />
      }

      {/* Action Footer Bar */}
      <TimesheetActionFooter
        lastSavedTime={lastSavedTime}
        isGridEditable={isGridEditable}
        hasSavePermission={hasSavePermission}
        hasSubmitPermission={hasSubmitPermission}
        hasCancelPermission={hasCancelPermission}
        timesheetStatus={timesheetStatus}
        isSaving={isSaving}
        hasChanges={hasChanges}
        attachedFile={attachedFile}
        handleFileChange={handleFileChange}
        handleSaveOrSubmit={handleSaveOrSubmit}
        handleCancelTimesheet={handleCancelTimesheet}
        showSelectDaysToSubmit={showSelectDaysToSubmit}
        selectedDates={selectedDates}
        onClearSelectedDates={() => setSelectedDates([])}
      />
    </div>
  );
};

export default TimesheetCreate;
