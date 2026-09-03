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
import { useCreateOrUpdateTimesheetEntries, useWeeklyTimesheetData } from "../../../hooks/useTimesheet";
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
  activityType: string;
  isBillable: boolean;
  days: Record<string, { hours: number; description: string }>;
}

interface RowItemType {
  project: string;
  task: string;
  comment: string;
  hrs: number;
}

import { TimesheetHeader } from "./components/TimesheetHeader";
import { TimesheetTopBar } from "./components/TimesheetTopBar";
import { TimesheetMetrics } from "./components/TimesheetMetrics";
import { TimesheetActionFooter } from "./components/TimesheetActionFooter";
import { AddTimeEntryButton } from "./components/AddTimeEntryButton";
import Badge from "../../shared/Badge";

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

  const daysOfWeek = useMemo(() => {
    return Array.from({ length: 7 }).map((_, idx) => addDays(currentWeekStart, idx));
  }, [currentWeekStart]);

  // Employee details
  const { data: user } = useCurrentUser();
  const { data: employeeDetails, isLoading: isEmployeeLoading } = useCurrentEmployeeDetails({
    logged_in_employee_details: true,
  });
  const employeeId = employeeDetails?.employee || "";
  const company = employeeDetails?.company_name || "";

  // Weekly Timesheet Data Hook
  const { data: weeklyData, isLoading: isWeeklyLoading } = useWeeklyTimesheetData({
    employee_id: employeeId || "",
    week_start_date: startOfWeekStr
  }, !!employeeId);

  const isDetailLoading = isWeeklyLoading || isEmployeeLoading;

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
    if (!attendanceEvents) return [];
    return attendanceEvents
      .filter((event) => event.status === "Weekly Off" || event.custom_status === "Weekly Off" || event.title === "Weekly Off")
      .map((event) => event.start?.split(" ")[0] || "");
  }, [attendanceEvents]);

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

  const allDisabledDays = useMemo(() => {
    return Array.from(new Set([...weekOffDates, ...submittedDatesList, ...nonEditableDays]));
  }, [weekOffDates, submittedDatesList, nonEditableDays]);

  const dayStatusMap = useMemo(() => {
    const map: Record<string, "Week Off" | "Draft" | "Submitted" | "Approved" | "Rejected"> = {};
    daysOfWeek.forEach(day => {
      const dateKey = format(day, "yyyy-MM-dd");
      if (weekOffDates.includes(dateKey)) {
        map[dateKey] = "Week Off";
        return;
      }
      if (submittedDatesList.includes(dateKey)) {
        map[dateKey] = "Submitted";
        return;
      }
      const dayData = weeklyData?.days?.find(d => d.date === dateKey);
      const records = dayData?.timesheet_records || [];

      if (records.length === 0) {
        return; // Day with no timesheet records has no status
      }

      // Check custom_timesheet_status directly from the timesheet records for this day
      const hasApproved = records.some(r => r.custom_timesheet_status === "Approved");
      const hasSubmitted = records.some(
        r => r.custom_timesheet_status === "Pending for Approval" || (r.custom_timesheet_status as string) === "Submitted"
      );
      const hasRejected = records.some(r => r.custom_timesheet_status === "Rejected");

      if (hasApproved) {
        map[dateKey] = "Approved";
      } else if (hasSubmitted) {
        map[dateKey] = "Submitted";
      } else if (hasRejected) {
        map[dateKey] = "Rejected";
      } else {
        map[dateKey] = "Draft";
      }
    });
    return map;
  }, [daysOfWeek, weekOffDates, weeklyData, submittedDatesList]);

  const { uploadFiles } = useFileUploader();

  const hasChanges = useMemo(() => {
    return JSON.stringify(projectsData) !== JSON.stringify(initialProjectsData) || isFileModified;
  }, [projectsData, initialProjectsData, isFileModified]);

  const { data: uiPermission } = useGetUiPermission("Timesheet");
  const hasSavePermission = isActionEnabled(uiPermission, "save", "Timesheet");
  const hasSubmitPermission = isActionEnabled(uiPermission, "submit", "Timesheet");
  const hasCancelPermission = isActionEnabled(uiPermission, "cancel", "Timesheet");

  const isGridEditable = timesheetStatus !== "Approved" && (hasSavePermission || hasSubmitPermission);

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
          approvalStatus !== "Rejected" && (
            ["Submitted", "Billed", "Cancelled"].includes(record.status || "") ||
            record.docstatus === 1 ||
            record.docstatus === 2
          )
        ) {
          isDaySubmitted = true;
        }

        (record.time_logs || []).forEach((log, logIndex) => {
          const projectId = log.project_id || "";
          const taskId = log.task_id || "";
          const key = `${projectId}_${taskId}_${logIndex}`;

          if (!rowsMap[key]) {
            rowsMap[key] = {
              id: key,
              project: projectId,
              projectName: log.project_name || projectId,
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

    // Derive overall status from custom_timesheet_status values
    // Priority: Rejected > Pending for Approval > Approved > Draft
    let derivedStatus = "Draft";
    if (allStatuses.size > 0) {
      if (allStatuses.has("Rejected")) {
        derivedStatus = "Rejected";
      } else if (allStatuses.has("Pending for Approval")) {
        derivedStatus = "Pending for Approval";
      } else if (allStatuses.has("Approved")) {
        derivedStatus = "Approved";
      } else {
        derivedStatus = "Draft";
      }
    } else if (!foundName) {
      derivedStatus = "Draft";
    }

    setTimesheetStatus(derivedStatus);

    const parsedData = Object.values(rowsMap);
    setProjectsData(parsedData);
    setInitialProjectsData(parsedData);
  }, [weeklyData]);

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

        // Do not overwrite week off dates
        if (weekOffDates.includes(shiftedDateStr)) {
          return;
        }

        (day.timesheet_records || []).forEach(record => {
          (record.time_logs || []).forEach((log, logIndex) => {
            hasLogs = true;
            const projectId = log.project_id || "";
            const taskId = log.task_id || "";
            const key = `${projectId}_${taskId}_${logIndex}`;

            if (!rowsMap[key]) {
              rowsMap[key] = {
                id: key,
                project: projectId,
                projectName: log.project_name || projectId,
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
    const taskVal = data.task || "";
    const isBillable = data.is_billable !== undefined ? !!data.is_billable : true;

    setProjectsData(prev =>
      prev.map(r => {
        if (r.id !== rowId) return r;
        return {
          ...r,
          project: projectVal,
          projectName: projectVal,
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
  }, []);
  const formSchema = useMemo(() => addTimeEntrySchema, []);


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

    const newErrors: Record<string, string> = {};
    let hasValidationError = false;

    projectsData.forEach((row, index) => {
      const rowIndex = index + 1;
      if (!row.project || !row.task) {
        hasValidationError = true;
        newErrors[`${row.id}_project_task`] = `Row ${rowIndex}: Project and Task are required.`;
      }

      let hasAtLeastOneCellInRow = false;

      for (const day of daysOfWeek) {
        const dateKey = format(day, "yyyy-MM-dd");
        const cell = row.days[dateKey];

        if (cell && cell.hours > 0) {
          hasAtLeastOneCellInRow = true;
          if (!cell.description || !cell.description.trim()) {
            hasValidationError = true;
            newErrors[`${row.id}_${dateKey}_comment`] = `Row ${rowIndex} (${format(day, 'EEE')}): Comment is required.`;
          }
        }
      }

      if (!hasAtLeastOneCellInRow) {
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

    daysOfWeek.forEach(day => {
      const dateKey = format(day, "yyyy-MM-dd");

      if (submittedDatesList.includes(dateKey) || nonEditableDays.includes(dateKey)) {
        return; // Skip already submitted or non-editable days
      }

      const rowsForDay: RowItemType[] = [];

      projectsData.forEach(row => {
        const cell = row.days[dateKey];
        if (cell && cell.hours > 0) {
          rowsForDay.push({
            project: row.project || "",
            task: row.task || "",
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
      toast.error("Please log at least one hour on any project day.");
      return;
    }

    loadingOverlay.show(isSubmit ? "Submitting timesheet entries..." : "Saving timesheet entries...");
    setIsSavingLocally(true);

    createOrUpdateEntries(payload, {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onSuccess: async (data: any) => {
        setIsSavingLocally(false);
        loadingOverlay.hide();
        toast.success(isSubmit ? "Timesheet submitted successfully" : "Timesheet saved successfully");
        setLastSavedTime(format(new Date(), "hh:mm a"));
        if (isSubmit) {
          const newSubmitted = Object.keys(payload).filter(date => payload[date].status === "Submit");
          setSubmittedDatesList(prev => {
            const updated = Array.from(new Set([...prev, ...newSubmitted]));
            return updated;
          });
          setTimesheetStatus("Pending for Approval");
          setNonEditableDays(prev => Array.from(new Set([...prev, ...newSubmitted])));
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

  // Read-only only when ALL 7 days are disabled (all approved/submitted/week-off)
  const isReadOnly = useMemo(() => {
    if (timesheetStatus === "Cancelled") return true;
    const allDaysDisabled = daysOfWeek.every(day => {
      const dateKey = format(day, "yyyy-MM-dd");
      return weekOffDates.includes(dateKey) || submittedDatesList.includes(dateKey) || nonEditableDays.includes(dateKey);
    });
    return allDaysDisabled;
  }, [timesheetStatus, daysOfWeek, weekOffDates, submittedDatesList, nonEditableDays]);

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

        {/* Weekly Grid Sheet Table */}
        <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
          {isDetailLoading ? (
            <div className="p-6">
              <TableSkeleton columns={8} rows={4} />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className={`w-full text-sm text-left border-collapse ${isDesktop ? "min-w-[1000px]" : ""}`}>
                {isDesktop && (
                  <thead className="bg-gray-50/70 border-b border-border">
                    <tr>
                      <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider min-w-[380px]">
                        Projects / Tasks
                      </th>
                      {daysOfWeek.map((day) => {
                        const dateKey = format(day, "yyyy-MM-dd");
                        const status = dayStatusMap[dateKey];
                        return (
                          <th
                            key={dateKey}
                            className="px-3 py-3 text-center border-l border-border min-w-[100px]"
                          >
                            <div className="text-gray-900 font-bold text-sm">
                              {format(day, "d MMM")}
                            </div>
                            <div className="text-gray-500 text-xs font-semibold mt-0.5">
                              {format(day, "EEE").toUpperCase()}
                            </div>
                            {status && (
                              <div className="mt-1.5 flex justify-center">
                                <span
                                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${status === "Week Off"
                                    ? "bg-red-50 text-red-700 border-red-200"
                                    : status === "Approved"
                                      ? "bg-green-50 text-green-700 border-green-200"
                                      : status === "Submitted"
                                        ? "bg-amber-50 text-amber-700 border-amber-200"
                                        : status === "Rejected"
                                          ? "bg-red-50 text-red-700 border-red-200"
                                          : "bg-gray-50 text-gray-600 border-gray-200"
                                    }`}
                                >
                                  {status}
                                </span>
                              </div>
                            )}
                          </th>
                        );
                      })}
                      <th className="px-4 py-3 text-center border-l border-border text-xs font-bold text-gray-500 uppercase tracking-wider w-[120px]">
                        Total Hours
                      </th>
                      <th className="px-4 py-3 text-center border-l border-border text-xs font-bold text-gray-500 uppercase tracking-wider w-[60px]">

                      </th>
                    </tr>
                  </thead>
                )}
                <tbody className="divide-y divide-border">
                  {/* Attendance row */}
                  {weeklyData?.days && (
                    isDesktop ? (
                      <tr className="bg-gray-50/40 text-gray-600 font-medium">
                        <td className="px-6 py-3  font-semibold text-gray-700">
                          Attendance Hours
                        </td>
                        {daysOfWeek.map(day => {
                          const dateKey = format(day, "yyyy-MM-dd");
                          return (
                            <td key={dateKey} className="px-3 py-3 text-center border-l border-border">
                              {weekOffDates.includes(dateKey) ? (
                                <div className="flex w-full  justify-center"><Badge variant="danger" label="Week Off" size="sm" /></div>
                              ) : (
                                attendanceHoursMap[dateKey] || "0h 0m"
                              )}
                            </td>
                          );
                        })}
                        <td className="px-4 py-3 text-center border-l border-border font-bold">
                          {/* sum up daily attendance hours */}
                          {formatCellOnBlur(
                            daysOfWeek.reduce((acc, day) => {
                              const dateKey = format(day, "yyyy-MM-dd");
                              const dData = weeklyData.days.find(d => d.date === dateKey);
                              return acc + (dData?.attendance_hours || 0);
                            }, 0)
                          ) || "0:00"}
                        </td>
                        <td className="border-l border-border"></td>
                      </tr>
                    ) : (
                      <tr className="block  border-none  px-2 py-3 sm:p-4">
                        <td className="block border-none w-full">
                          <div className="bg-gray-50 rounded-xl p-3 shadow-sm space-y-4">
                            <div className="flex justify-between items-center font-semibold text-gray-700">
                              <span className="text-sm">Attendance Hours</span>
                              <span className="text-primary font-bold">
                                {formatCellOnBlur(daysOfWeek.reduce((acc, day) => acc + ((weeklyData.days.find(d => d.date === format(day, "yyyy-MM-dd")))?.attendance_hours || 0), 0)) || "0:00"}
                              </span>
                            </div>
                            <div className="grid grid-cols-7 gap-1">
                              {daysOfWeek.map(day => {
                                const dateKey = format(day, "yyyy-MM-dd");
                                return (
                                  <div key={dateKey} className="flex flex-col items-center">
                                    <span className="text-[10px] font-bold text-gray-600 leading-tight">{format(day, "d")}</span>
                                    <span className="text-[9px] text-gray-400 mb-1 leading-tight">{format(day, "EEE")}</span>
                                    {weekOffDates.includes(dateKey) ? (
                                      <div className="w-full flex justify-center pt-0.5"><Badge variant="danger" label="Off" size="sm" /></div>
                                    ) : (
                                      <span className="text-[10px] font-bold text-gray-700 bg-gray-200/50 w-full text-center py-1 rounded">{attendanceHoursMap[dateKey] || "0h"}</span>
                                    )}
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
                      const taskName = row.taskSubject || row.task || "[No Task]";

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
                    <tr className="bg-gray-100/50 text-gray-900 font-bold border-t border-border">
                      <td className="px-6 py-4 font-bold text-gray-800">
                        Total hours/day
                      </td>
                      {daysOfWeek.map(day => {
                        const dateKey = format(day, "yyyy-MM-dd");
                        const dayHrs = totals.dailyTotals[dateKey] || 0;
                        return (
                          <td key={dateKey} className="px-3 py-4 text-center border-l border-border">
                            {formatCellOnBlur(dayHrs) || "0:00"}
                          </td>
                        );
                      })}
                      <td className="px-4 py-4 text-center border-l border-border text-base font-extrabold text-primary">
                        {formatCellOnBlur(totals.totalWeeklyHours) || "0:00"}
                      </td>
                      <td className="border-l border-border"></td>
                    </tr>
                  ) : (
                    <tr className="block border-t border-gray-200 px-2 py-4 sm:p-4 bg-gray-50/50">
                      <td className="block w-full">
                        <div className="space-y-4 bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
                          <div className="flex justify-between items-center font-bold text-gray-900">
                            <span className="text-sm">Total Weekly Hours</span>
                            <span className="text-primary text-lg">{formatCellOnBlur(totals.totalWeeklyHours) || "0:00"}</span>
                          </div>
                          <div className="grid grid-cols-7 gap-1">
                            {daysOfWeek.map(day => {
                              const dateKey = format(day, "yyyy-MM-dd");
                              const dayHrs = totals.dailyTotals[dateKey] || 0;
                              return (
                                <div key={dateKey} className="flex flex-col items-center">
                                  <span className="text-[10px] font-bold text-gray-600 leading-tight">{format(day, "d")}</span>
                                  <span className="text-[9px] text-gray-400 mb-1 leading-tight">{format(day, "EEE")}</span>
                                  <span className="text-[10px] font-bold bg-primary/10 text-primary w-full text-center py-1 rounded">{formatCellOnBlur(dayHrs) || "0:00"}</span>
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
      />
    </div>
  );
};

export default TimesheetCreate;
