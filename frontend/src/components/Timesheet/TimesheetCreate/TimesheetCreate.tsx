import type React from "react";
import { useState, useEffect, useMemo, useCallback } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Copy,
  Plus,
  Check,
  Save,
  Upload,
  Info,
  X,
  FileText
} from "lucide-react";
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
import { useCreateOrUpdateTimesheetEntries, useWeeklyTimesheetData } from "../../../hooks/useTimesheet";
import { getWeeklyTimesheetData } from "../../../services/timesheetService";
import { useGetUiPermission } from "../../../hooks/userUiPermission";
import { isActionEnabled } from "../../../utils/uiPermission";
import { useScreenSize } from "../../../hooks/useScreenSize";
import { useFileUploader } from "../../../hooks/useFileUploader";


import Button from "../../shared/atoms/Button";
import { Typography } from "../../shared/atoms/Typography";
import Modal from "../../shared/Modal";

import { addTimeEntrySchema } from "./addTimeEntrySchema";
import { errorResponseFormater } from "../../../utils/errorResponseFormater";
import { useLoadingOverlay } from "../../../context/OverlayContext";
import { TimesheetRow } from "./components/TimesheetRow";
import { AttachmentCard } from "../../shared/molecules/AttachmentCard";


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

const AddTimeEntryButton = ({ onClick, variant }: { onClick: () => void; variant: "desktop" | "mobile" }) => {
  if (variant === "desktop") {
    return (
      <Button variant="soft" onClick={onClick} size="md">
        <Plus className="w-4 h-4" /> Add Time Entry
      </Button>
    )
  }
  return (
    <button onClick={onClick} className="inline-flex items-center gap-2 text-primary hover:text-primary-600 font-semibold text-sm transition-colors focus:outline-none py-2 px-4 bg-primary/10 rounded-lg">
      <Plus className="w-4 h-4" /> Add Time Entry
    </button>
  )
}

const TimesheetCreate: React.FC = () => {
  const loadingOverlay = useLoadingOverlay();
  const { isDesktop } = useScreenSize();

  // Date states
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [isSavingLocally, setIsSavingLocally] = useState<boolean>(false);
  const currentWeekStart = useMemo(() => startOfWeek(currentDate, { weekStartsOn: 1 }), [currentDate]);
  const currentWeekEnd = useMemo(() => addDays(currentWeekStart, 4), [currentWeekStart]);

  const realToday = useMemo(() => new Date(), []);
  const realCurrentWeekStart = useMemo(() => startOfWeek(realToday, { weekStartsOn: 1 }), [realToday]);
  const realCurrentWeekEnd = useMemo(() => addDays(realCurrentWeekStart, 6), [realCurrentWeekStart]);

  const disableNextWeek = currentWeekStart.getTime() >= realCurrentWeekStart.getTime();

  const startOfWeekStr = useMemo(() => format(currentWeekStart, "yyyy-MM-dd"), [currentWeekStart]);

  const daysOfWeek = useMemo(() => {
    return Array.from({ length: 5 }).map((_, idx) => addDays(currentWeekStart, idx));
  }, [currentWeekStart]);

  // Employee details
  const { data: user } = useCurrentUser();
  const { data: employeeDetails, isLoading: isEmployeeLoading } = useCurrentEmployeeDetails({
    logged_in_employee_details: true,
  });
  const employeeId = employeeDetails?.employee || "";
  const company = employeeDetails?.company || "";

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

  // Project & Task names are now provided directly in the API response
  // No need for separate projectsList / tasksList fetches

  // Timesheet Fetching
  const [timesheetName, setTimesheetName] = useState<string>("");
  const [timesheetStatus, setTimesheetStatus] = useState<string>("Not Submitted");

  // Grid/Rows data
  const [projectsData, setProjectsData] = useState<TimesheetRow[]>([]);
  const [initialProjectsData, setInitialProjectsData] = useState<TimesheetRow[]>([]);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [lastSavedTime, setLastSavedTime] = useState<string>("");
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [isFileModified, setIsFileModified] = useState<boolean>(false);

  const { uploadFiles } = useFileUploader();

  const hasChanges = useMemo(() => {
    return JSON.stringify(projectsData) !== JSON.stringify(initialProjectsData) || isFileModified;
  }, [projectsData, initialProjectsData, isFileModified]);

  const { data: uiPermission } = useGetUiPermission("Timesheet");
  const hasSavePermission = isActionEnabled(uiPermission, "save", "Timesheet");
  const hasSubmitPermission = isActionEnabled(uiPermission, "submit", "Timesheet");
  const hasCancelPermission = isActionEnabled(uiPermission, "cancel", "Timesheet");

  const [isBackendEditable, setIsBackendEditable] = useState<boolean>(true);
  const isGridEditable = isBackendEditable && (hasSavePermission || hasSubmitPermission);

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

  // Clear local attachment state when week changes
  useEffect(() => {
    setAttachedFile(null);
    setIsFileModified(false);
  }, [startOfWeekStr]);


  // Load timesheet data from weekly timesheet hook response
  // Each time_log becomes its own row in the grid
  useEffect(() => {
    console.log("Weekly timesheet data hook response:", weeklyData);
    if (!weeklyData) return;

    let foundName = "";
    let foundStatus = "Not Submitted";

    // Collect unique time_log entries across all days by index order
    // Each time_log (project+task combo) gets its own row
    const rowsMap: Record<string, TimesheetRow> = {};

    (weeklyData.days || []).forEach(day => {
      const dateStr = day.date; // "yyyy-MM-dd"

      (day.timesheet_records || []).forEach(record => {
        if (!foundName && record.name) {
          foundName = record.name;
          foundStatus = record.status || "Draft";
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
    });

    // Use is_editable from the response
    setIsBackendEditable(weeklyData.is_editable !== false);
    setTimesheetName(foundName);
    setTimesheetStatus(foundStatus);
    
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
      toast.error("You cannot select dates in the future.");
    }
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value) {
      const selected = new Date(e.target.value);
      const selectedStart = startOfWeek(selected, { weekStartsOn: 1 });
      if (selectedStart.getTime() > realCurrentWeekStart.getTime()) {
        toast.error("You cannot select dates in the future.");
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
      const rowsMap: Record<string, TimesheetRow> = {};

      (prevData.days || []).forEach(day => {
        const logDate = day.date; // "yyyy-MM-dd"
        // Shift date to current week
        const logDayIndex = (parseISO(logDate).getDay() + 6) % 7; // Mon-0, Sun-6
        if (logDayIndex > 4) return; // Skip Saturday (5) and Sunday (6)
        const shiftedDateStr = format(addDays(currentWeekStart, logDayIndex), "yyyy-MM-dd");

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
        toast.success("Copied last week hours successfully!");
      } else {
        toast.error("No entries found in last week's timesheet");
      }
    } catch (err) {
      loadingOverlay.hide();
      console.error(err);
      toast.error("Failed to copy last week hours");
    }
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

    for (const row of projectsData) {
      if (!row.project || !row.task) {
        hasValidationError = true;
        newErrors[`${row.id}_project_task`] = "Required";
      }

      for (const day of daysOfWeek) {
        const dateKey = format(day, "yyyy-MM-dd");
        const cell = row.days[dateKey];

        if (cell && cell.hours > 0) {
          if (!cell.description || !cell.description.trim()) {
            hasValidationError = true;
            newErrors[`${row.id}_${dateKey}_comment`] = "Required";
          }
        }
      }
    }

    setValidationErrors(newErrors);

    if (hasValidationError) {
      toast.error("Please fill comments for all days where hours are logged, and ensure project/task are selected.");
      return;
    }

    const statusValue = isSubmit ? "Submit" : "Draft";
    const payload: Record<string, { status: string; rows?: RowItemType[] }> = {};

    daysOfWeek.forEach(day => {
      const dateKey = format(day, "yyyy-MM-dd");
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
        payload[dateKey] = {
          status: statusValue,
          rows: rowsForDay
        };
      }
    });

    if (Object.keys(payload).length === 0) {
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
          setTimesheetStatus("Submitted");
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

  // Check if timesheet is read-only (Submitted or Billed or Cancelled)
  const isReadOnly = timesheetStatus === "Submitted" || timesheetStatus === "Billed" || timesheetStatus === "Cancelled";

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
      <div className="flex-shrink-0 bg-white border-b px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Typography variant="h4" className="text-gray-900 flex items-center gap-3">
            <span>Weekly Timesheet Entry</span>
            {timesheetName && (
              <span className="text-sm font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                ID: {timesheetName}
              </span>
            )}
          </Typography>
          <Typography variant="bodySmall" color="body2" className="mt-1">
            Log your daily project and task timesheets.
          </Typography>
        </div>

        <div className="flex items-center gap-3">
          {isReadOnly && (
            <span className="flex items-center gap-1 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-xl text-xs font-semibold border border-blue-200">
              <Check className="w-3.5 h-3.5" /> Checked / Locked
            </span>
          )}
        </div>
      </div>

      {/* Navigation and Summary stats */}
      <div className="p-6 space-y-6 max-w-[1600px] mx-auto w-full pb-24">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Week Date Picker */}
          <div className="flex items-center gap-3 bg-white p-2 rounded-xl border border-gray-100 shadow-sm">
            <button
              onClick={handlePrevWeek}
              className="p-2 hover:bg-gray-50 rounded-lg transition-colors border border-gray-100"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div className="flex items-center gap-2 px-3 font-semibold text-gray-900 text-sm md:text-base">
              <span>{format(currentWeekStart, "dd MMM")}</span>
              <span>-</span>
              <span>{format(currentWeekEnd, "dd MMM yyyy")}</span>
            </div>
            <button
              onClick={handleNextWeek}
              className="p-2 hover:bg-gray-50 rounded-lg transition-colors border border-gray-100"
            >
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>

            {/* Custom Calendar date pick */}
            <div className="relative">
              <label className="p-2 hover:bg-gray-50 rounded-lg transition-colors border border-gray-100 flex items-center justify-center cursor-pointer">
                <Calendar className="w-4 h-4 text-gray-600" />
                <input
                  type="date"
                  onChange={handleDateChange}
                  value={format(currentDate, "yyyy-MM-dd")}
                  max={format(realCurrentWeekEnd, "yyyy-MM-dd")}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
              </label>
            </div>
          </div>

          {/* Center Actions */}
          <div className="flex items-center gap-3">

            <Button
              variant="outline"
              bgColor="primary"
              size="md"
              icon={<Copy className="w-4 h-4" />}
              onClick={handleCopyLastWeek}
              disabled={isReadOnly || !isGridEditable}
            >
              Copy last week hours
            </Button>
          </div>

          {/* Right Status / Submit toggle */}
          <div className="flex items-center gap-4 bg-white px-4 py-2.5 rounded-xl border border-gray-100 shadow-sm text-sm">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-700">Timesheet Status:</span>
              <span className={`px-2.5 py-1 rounded-xl text-xs font-semibold ${timesheetStatus === "Submitted" ? "bg-blue-50 text-blue-700 border border-blue-100" :
                timesheetStatus === "Billed" ? "bg-green-50 text-green-700 border border-green-100" :
                  "bg-yellow-50 text-yellow-700 border border-yellow-100"
                }`}>
                {timesheetStatus}
              </span>
            </div>
          </div>
        </div>

        {/* Progress Bar & Details */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          {/* Total logged hours progress bar */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex justify-between items-center text-sm font-semibold">
              <span className="text-gray-700 flex items-center gap-1.5">
                Total Logs <Info className="w-4 h-4 text-gray-400" />
              </span>
              <span className="text-gray-900 text-base">
                {formatCellOnBlur(totals.totalWeeklyHours) || "0:00"} / 40:00 hrs
              </span>
            </div>
            <div className="w-full bg-gray-100 h-3.5 rounded-xl overflow-hidden">
              <div
                className="bg-primary h-full rounded-xl transition-all duration-300"
                style={{ width: `${Math.min((totals.totalWeeklyHours / 40) * 100, 100)}%` }}
              />
            </div>
            <div className="flex gap-4 text-xs font-medium text-gray-500 pt-1">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-primary" />
                Billable: <strong className="text-gray-700">{formatCellOnBlur(totals.billableHours) || "0:00"}</strong>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-gray-300" />
                Non-Billable: <strong className="text-gray-700">{formatCellOnBlur(totals.nonBillableHours) || "0:00"}</strong>
              </span>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="flex flex-col justify-center border-t md:border-t-0 md:border-l border-gray-100 md:pl-6 space-y-2">
            <div className="text-sm font-medium text-gray-500">
              Employee: <strong className="text-gray-800">{employeeDetails?.employee_name || user?.full_name || "-"}</strong>
            </div>
            <div className="text-sm font-medium text-gray-500">
              Department: <strong className="text-gray-800">{employeeDetails?.department_name || "-"}</strong>
            </div>
            <div className="text-sm font-medium text-gray-500">
              Company: <strong className="text-gray-800">{company || "-"}</strong>
            </div>
          </div>
        </div>

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
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {isDetailLoading ? (
            <div className="p-12 text-center text-gray-500 flex flex-col items-center justify-center gap-4">
              <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent" />
              <span>Fetching timesheet logs...</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className={`w-full text-sm text-left border-collapse ${isDesktop ? "min-w-[1000px]" : ""}`}>
                {isDesktop && (
                  <thead className="bg-gray-50/70 border-b border-gray-100">
                    <tr>
                      <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider min-w-[380px]">
                        Projects / Tasks
                      </th>
                      {daysOfWeek.map((day) => {
                        const dateKey = format(day, "yyyy-MM-dd");
                        return (
                          <th
                            key={dateKey}
                            className="px-3 py-3 text-center border-l border-gray-50 min-w-[100px]"
                          >
                            <div className="text-gray-900 font-bold text-sm">
                              {format(day, "d MMM")}
                            </div>
                            <div className="text-gray-500 text-xs font-semibold mt-0.5">
                              {format(day, "EEE").toUpperCase()}
                            </div>
                            {attendanceHoursMap[dateKey] && (
                              <div className="text-[10px] text-gray-400 font-normal mt-1 bg-gray-100/50 py-0.5 rounded">
                                {attendanceHoursMap[dateKey]}
                              </div>
                            )}
                          </th>
                        );
                      })}
                      <th className="px-4 py-3 text-center border-l border-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wider w-[120px]">
                        Total Hours
                      </th>
                      <th className="px-4 py-3 text-center border-l border-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wider w-[60px]">

                      </th>
                    </tr>
                  </thead>
                )}
                <tbody className="divide-y divide-gray-100">
                  {/* Attendance row */}
                  {weeklyData?.days && (
                    isDesktop ? (
                      <tr className="bg-gray-50/40 text-gray-600 font-medium">
                        <td className="px-6 py-3 font-semibold text-gray-700">
                          Attendance Hours
                        </td>
                        {daysOfWeek.map(day => {
                          const dateKey = format(day, "yyyy-MM-dd");
                          return (
                            <td key={dateKey} className="px-3 py-3 text-center border-l border-gray-50">
                              {attendanceHoursMap[dateKey] || "0h 0m"}
                            </td>
                          );
                        })}
                        <td className="px-4 py-3 text-center border-l border-gray-50 font-bold">
                          {/* sum up daily attendance hours */}
                          {formatCellOnBlur(
                            daysOfWeek.reduce((acc, day) => {
                              const dateKey = format(day, "yyyy-MM-dd");
                              const dData = weeklyData.days.find(d => d.date === dateKey);
                              return acc + (dData?.attendance_hours || 0);
                            }, 0)
                          ) || "0:00"}
                        </td>
                        <td className="border-l border-gray-50"></td>
                      </tr>
                    ) : (
                      <tr className="block border-b border-gray-100 p-4">
                        <td className="block w-full">
                          <div className="bg-gray-50 rounded-xl p-4 shadow-sm space-y-4">
                            <div className="flex justify-between items-center font-semibold text-gray-700">
                              <span>Attendance Hours</span>
                              <span className="text-primary font-bold">
                                {formatCellOnBlur(daysOfWeek.reduce((acc, day) => acc + ((weeklyData.days.find(d => d.date === format(day, "yyyy-MM-dd")))?.attendance_hours || 0), 0)) || "0:00"}
                              </span>
                            </div>
                            <div className="grid grid-cols-5 gap-2">
                              {daysOfWeek.map(day => {
                                const dateKey = format(day, "yyyy-MM-dd");
                                return (
                                  <div key={dateKey} className="flex flex-col items-center">
                                    <span className="text-[10px] font-semibold text-gray-500 mb-1">{format(day, "d MMM")}</span>
                                    <span className="text-xs font-medium text-gray-700">{attendanceHoursMap[dateKey] || "0h"}</span>
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
                    isDesktop ? (
                      <tr>
                        <td colSpan={8} className="px-6 py-12 text-center text-gray-400">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <FileText className="w-8 h-8 text-gray-300" />
                            <span>No time logs added. Click "+ Add Time Entry" to add project rows.</span>
                            {!isReadOnly && isGridEditable && (
                              <AddTimeEntryButton onClick={handleAddBlankRow} variant="desktop" />
                            )}
                          </div>
                        </td>
                      </tr>
                    ) : (
                      <tr className="block p-8 text-center text-gray-400">
                        <td className="block w-full">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <FileText className="w-8 h-8 text-gray-300" />
                            <span className="text-sm">No time logs added. Click "+ Add Time Entry" to add project rows.</span>
                            {!isReadOnly && isGridEditable && (
                              <AddTimeEntryButton onClick={handleAddBlankRow} variant="mobile" />
                            )}
                          </div>
                        </td>
                      </tr>
                    )
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
                        />
                      );
                    })
                  )}

                  {/* Add Entry Action Row */}
                  {!isReadOnly && isGridEditable && (
                    isDesktop ? (
                      <tr>
                        <td colSpan={8} className="px-6 py-4 bg-gray-50/50">
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
                    <tr className="block border-t border-gray-200 p-4 bg-gray-50">
                      <td className="block w-full">
                        <div className="space-y-4">
                          <div className="flex justify-between items-center font-bold text-gray-900">
                            <span>Total Weekly Hours</span>
                            <span className="text-primary text-lg">{formatCellOnBlur(totals.totalWeeklyHours) || "0:00"}</span>
                          </div>
                          <div className="grid grid-cols-5 gap-2">
                            {daysOfWeek.map(day => {
                              const dateKey = format(day, "yyyy-MM-dd");
                              const dayHrs = totals.dailyTotals[dateKey] || 0;
                              return (
                                <div key={dateKey} className="flex flex-col items-center">
                                  <span className="text-[10px] font-semibold text-gray-500 mb-1">{format(day, "d MMM")}</span>
                                  <span className="text-xs font-bold text-gray-800">{formatCellOnBlur(dayHrs) || "0:00"}</span>
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
      {commentModalConfig?.isOpen && (
        <Modal isOpen={true} onClose={() => setCommentModalConfig(null)} size="md">
          <div className="flex flex-col bg-white overflow-hidden rounded-2xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div>
                <Typography variant="h4" className="text-gray-900">
                  Daily Log Comment
                </Typography>
                <Typography variant="bodySmall" color="body2" className="mt-1">
                  {commentModalConfig.projectName} • {commentModalConfig.dayLabel}
                </Typography>
              </div>
              <button
                onClick={() => setCommentModalConfig(null)}
                className="p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 rounded-full transition-colors focus:outline-none"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <label className="block text-sm font-semibold text-gray-700">
                Description / Comment <span className="text-red-500">*</span>
              </label>
              <textarea
                placeholder="Enter log comments here..."
                value={modalCommentText}
                onChange={(e) => setModalCommentText(e.target.value)}
                disabled={isReadOnly || !isGridEditable}
                id="timesheet-cell-comment-textarea"
                rows={4}
                className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary disabled:bg-gray-100 disabled:text-gray-800"
              />
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/50">
              <Button
                variant="outline"
                bgColor="primary"
                size="md"
                onClick={() => setCommentModalConfig(null)}
              >
                Close
              </Button>
              {!isReadOnly && isGridEditable && (
                <Button
                  variant="contain"
                  bgColor="primary"
                  size="md"
                  disabled={!modalCommentText.trim()}
                  onClick={() => {
                    handleSaveComment(modalCommentText);
                  }}
                >
                  Save Comment
                </Button>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Action Footer Bar */}
      <div className="fixed bottom-6 left-6 right-6 z-30 pointer-events-none">
        <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="flex items-center gap-6 pointer-events-auto">


            {lastSavedTime && (
              <span className="text-gray-500 text-xs font-semibold bg-white/90 backdrop-blur px-4 py-2 rounded-xl shadow-lg border border-gray-100">
                Saved at {lastSavedTime}
              </span>
            )}
          </div>

          <div className="flex items-center gap-4 pointer-events-auto bg-white/90 backdrop-blur-md px-4 py-3 rounded-2xl shadow-2xl border border-gray-200">

            {isGridEditable ? (
              <>
                {/* File Attachment Upload */}
                <div className="relative">
                  <label className="flex items-center gap-2 cursor-pointer text-gray-600 hover:text-gray-800 text-sm font-semibold border border-gray-200 rounded-xl px-4 py-2.5 hover:bg-gray-50 transition-colors bg-white">
                    <Upload className="w-4 h-4" />
                    <span>{attachedFile ? attachedFile.name : "Attach File"}</span>
                    <input
                      type="file"
                      onChange={handleFileChange}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                  </label>
                </div>
                {hasSavePermission && (
                  <Button
                    variant="outline"
                    bgColor="primary"
                    size="md"
                    disabled={isSaving || !hasChanges}
                    icon={<Save className="w-4 h-4" />}
                    onClick={() => handleSaveOrSubmit(false)}
                  >
                    {isSaving ? "Saving..." : "Save Draft"}
                  </Button>
                )}
                {hasSubmitPermission && (
                  <Button
                    variant="contain"
                    bgColor="primary"
                    size="md"
                    disabled={isSaving}
                    icon={<Check className="w-4 h-4" />}
                    onClick={() => handleSaveOrSubmit(true)}
                  >
                    {isSaving ? "Submitting..." : "Submit Timesheet"}
                  </Button>
                )}
              </>
            ) : (
              timesheetStatus !== "Cancelled" && hasCancelPermission && (
                <Button
                  variant="outline"
                  bgColor="error"
                  size="md"
                  disabled={isSaving}
                  icon={<X className="w-4 h-4" />}
                  onClick={handleCancelTimesheet}
                >
                  Cancel
                </Button>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimesheetCreate;
