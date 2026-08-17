import * as XLSX from "xlsx";
import { format } from "date-fns";
import FrappeAPI from "../../../../utils/frappeAPI";
import type { TimesheetRow } from "../TimesheetCreate";

interface DocItem {
  name: string;
  project_name?: string;
  subject?: string;
}

/**
 * Downloads an Excel template formatted for the current week's timesheet.
 */
export const downloadTimesheetTemplate = ({
  currentWeekStart,
  currentWeekEnd,
  daysOfWeek,
  projectsData,
  dayStatusMap = {},
  disabledDays = [],
}: {
  currentWeekStart: Date;
  currentWeekEnd: Date;
  daysOfWeek: Date[];
  projectsData: TimesheetRow[];
  dayStatusMap?: Record<string, string>;
  disabledDays?: string[];
}): void => {
  const headers = [
    "Row ID (Optional)",
    "Project",
    "Task",
    ...daysOfWeek.flatMap((d) => {
      const dateKey = format(d, "yyyy-MM-dd");
      const status = dayStatusMap[dateKey];
      const statusTag = status ? ` [${status}]` : "";
      return [
        `${format(d, "EEE")} (${format(d, "dd MMM")}) Hours${statusTag}`,
        `${format(d, "EEE")} (${format(d, "dd MMM")}) Comment${statusTag}`,
      ];
    }),
  ];

  const rows: (string | number)[][] =
    projectsData.length > 0
      ? projectsData.map((r) => [
          r.id || "",
          r.projectName || r.project || "",
          r.taskSubject || r.task || "",
          ...daysOfWeek.flatMap((d) => {
            const dateKey = format(d, "yyyy-MM-dd");
            const cell = r.days[dateKey];
            const rawHours = cell?.hours ? cell.hours : "";
            const rawComment = cell?.description || "";
            return [rawHours, rawComment];
          }),
        ])
      : [
          [
            "",
            "Sample Project",
            "Sample Task",
            ...daysOfWeek.flatMap((d, idx) => {
              const dateKey = format(d, "yyyy-MM-dd");
              const isDisabled = disabledDays.includes(dateKey);
              if (isDisabled) {
                return ["", ""];
              }
              return idx < 5 ? [8, "Development work"] : ["", ""];
            }),
          ],
        ];

  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  worksheet["!cols"] = [
    { wch: 22 },
    { wch: 26 },
    { wch: 26 },
    ...daysOfWeek.flatMap((d) => {
      const dateKey = format(d, "yyyy-MM-dd");
      const hasStatus = !!dayStatusMap[dateKey];
      return [{ wch: hasStatus ? 28 : 20 }, { wch: hasStatus ? 32 : 28 }];
    }),
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Timesheet");
  XLSX.writeFile(
    workbook,
    `Timesheet_Template_${format(currentWeekStart, "yyyy-MM-dd")}_to_${format(currentWeekEnd, "yyyy-MM-dd")}.xlsx`
  );
};

/**
 * Parses hours from various formats: number, "8", "8.5", "8:30", "08:30"
 */
export const parseHourValue = (val: unknown): number => {
  if (val === undefined || val === null || val === "") return 0;
  if (typeof val === "number") return isNaN(val) ? 0 : Math.max(0, val);
  const s = String(val).trim();
  if (s.includes(":")) {
    const [h = 0, m = 0] = s.split(":").map(Number);
    return isNaN(h) || isNaN(m) ? 0 : Math.max(0, h + m / 60);
  }
  const num = parseFloat(s);
  return isNaN(num) ? 0 : Math.max(0, num);
};

const resolveDoc = (docs: DocItem[], val: string, labelKey: "project_name" | "subject") => {
  const trimmed = (val || "").trim();
  if (!trimmed) return { id: "", label: "" };

  const match = docs.find(
    (d) =>
      d.name.toLowerCase() === trimmed.toLowerCase() ||
      d[labelKey]?.toLowerCase() === trimmed.toLowerCase()
  );
  return {
    id: match?.name || trimmed,
    label: match?.[labelKey] || match?.name || trimmed,
  };
};

const matchProjectAndTask = (
  r: TimesheetRow,
  projId: string,
  projLabel: string,
  taskId: string,
  taskLabel: string
) => {
  const pId = (projId || "").toLowerCase().trim();
  const pLabel = (projLabel || "").toLowerCase().trim();
  const tId = (taskId || "").toLowerCase().trim();
  const tLabel = (taskLabel || "").toLowerCase().trim();

  if (!pId && !pLabel && !tId && !tLabel) return false;

  const rp = (r.project || "").toLowerCase().trim();
  const rpn = (r.projectName || "").toLowerCase().trim();
  const rt = (r.task || "").toLowerCase().trim();
  const rts = (r.taskSubject || "").toLowerCase().trim();

  const pMatch =
    !pId && !pLabel
      ? true
      : (pId && (rp === pId || rpn === pId)) ||
        (pLabel && (rp === pLabel || rpn === pLabel));

  const tMatch =
    !tId && !tLabel
      ? true
      : (tId && (rt === tId || rts === tId)) ||
        (tLabel && (rt === tLabel || rts === tLabel));

  return pMatch && tMatch;
};

/**
 * Parses an uploaded Excel file and maps rows to TimesheetRow objects for the given week.
 */
export const parseTimesheetExcelFile = async ({
  file,
  daysOfWeek,
  existingRows = [],
  disabledDays = [],
}: {
  file: File;
  daysOfWeek: Date[];
  existingRows?: TimesheetRow[];
  disabledDays?: string[];
}): Promise<{ rows: TimesheetRow[]; rowCount: number; skippedDisabledHours: boolean }> => {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error("No sheet found in workbook.");

  const rawRows: unknown[][] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
    header: 1,
    defval: "",
  });
  const headerIdx = rawRows.findIndex((r) => r && r.some((c) => String(c).trim().length > 0));
  if (headerIdx === -1 || rawRows.length <= headerIdx + 1) {
    throw new Error("The uploaded file does not contain data rows.");
  }

  const headers = rawRows[headerIdx].map((h) => String(h || "").trim().toLowerCase());
  const idCol = headers.findIndex((h) => /(^id$|row\s*id|entry\s*id|row_id)/i.test(h));
  let projectCol = headers.findIndex((h) => h.includes("project"));
  if (projectCol === -1) {
    projectCol = idCol === 0 ? 1 : 0;
  }
  let taskCol = headers.findIndex((h) => h.includes("task"));
  if (taskCol === -1) {
    taskCol = projectCol === 1 ? 2 : 1;
  }

  let projectDocs: DocItem[] = [];
  let taskDocs: DocItem[] = [];
  try {
    const [projRes, taskRes] = await Promise.all([
      FrappeAPI.getDocumentList("Project", { fields: ["name", "project_name"], limit: 0 }),
      FrappeAPI.getDocumentList("Task", { fields: ["name", "subject", "project"], limit: 0 }),
    ]);
    projectDocs = (projRes?.data as unknown as DocItem[]) || [];
    taskDocs = (taskRes?.data as unknown as DocItem[]) || [];
  } catch (e) {
    console.warn("Could not fetch project/task list:", e);
  }

  const dayColMap = daysOfWeek.map((day, idx) => {
    const dateKey = format(day, "yyyy-MM-dd");
    const dayShort = format(day, "EEE").toLowerCase();
    const dayFull = format(day, "EEEE").toLowerCase();
    const dayD = format(day, "d");
    const dayDD = format(day, "dd");
    const monthShort = format(day, "MMM").toLowerCase();
    const datePattern = `${dayD} ${monthShort}`;
    const datePatternDD = `${dayDD} ${monthShort}`;

    const isDayHeader = (h: string) => {
      if (!h) return false;
      const lower = h.toLowerCase();
      if (lower.includes(dateKey)) return true;
      if (lower.includes(datePattern) || lower.includes(datePatternDD)) return true;
      if (lower.includes(dayFull)) return true;
      const dayWordRegex = new RegExp(`\\b${dayShort}\\b|\\(${dayShort}\\)`, "i");
      return dayWordRegex.test(lower);
    };

    const hoursCol = headers.findIndex(
      (h) => isDayHeader(h) && (/(hour|hrs|time)/i.test(h) || !/(comment|desc|note|remark)/i.test(h))
    );
    const commentCol = headers.findIndex(
      (h) => isDayHeader(h) && /(comment|desc|note|remark)/i.test(h)
    );

    const baseOffset = idCol !== -1 ? 1 : 0;
    const resolvedHoursCol = hoursCol !== -1 ? hoursCol : 2 + baseOffset + idx * 2;
    const resolvedCommentCol =
      commentCol !== -1
        ? commentCol
        : hoursCol !== -1 &&
          hoursCol + 1 < headers.length &&
          /(comment|desc|note|remark)/i.test(headers[hoursCol + 1])
        ? hoursCol + 1
        : 3 + baseOffset + idx * 2;

    return {
      dateKey,
      hoursCol: resolvedHoursCol,
      commentCol: resolvedCommentCol,
    };
  });

  let skippedDisabledHours = false;
  const parsedRows: TimesheetRow[] = [];
  const usedExistingRowIds = new Set<string>();

  rawRows.slice(headerIdx + 1).forEach((row, rIdx) => {
    const rawRowId = idCol !== -1 ? String(row[idCol] || "").trim() : "";
    const rawProj = String(row[projectCol] || "").trim();
    const rawTask = String(row[taskCol] || "").trim();
    if (!rawRowId && !rawProj && !rawTask && !row.some((c) => String(c).trim() !== "")) return;

    const proj = resolveDoc(projectDocs, rawProj, "project_name");
    const task = resolveDoc(taskDocs, rawTask, "subject");

    // Match priority:
    // 1. By unique Row ID (if present and matches an unused existing row)
    let matchedExisting: TimesheetRow | undefined;
    if (rawRowId) {
      matchedExisting = existingRows.find(
        (r) => r.id === rawRowId && !usedExistingRowIds.has(r.id)
      );
    }

    // 2. Sequential fallback by Project and Task among unused existing rows
    if (!matchedExisting) {
      matchedExisting = existingRows.find(
        (r) =>
          !usedExistingRowIds.has(r.id) &&
          matchProjectAndTask(r, proj.id, proj.label, task.id, task.label)
      );
    }

    if (matchedExisting) {
      usedExistingRowIds.add(matchedExisting.id);
    }

    // Check if the matched existing row has locked/submitted records on any disabled day
    const hasLockedOnDisabledDay = matchedExisting
      ? disabledDays.some(
          (d) =>
            (matchedExisting.days[d]?.hours || 0) > 0 ||
            (matchedExisting.days[d]?.description || "").trim().length > 0
        )
      : false;

    // For rows with disabled/locked records, project and task MUST NOT be updated from Excel
    const finalProjectId = hasLockedOnDisabledDay && matchedExisting ? matchedExisting.project : proj.id;
    const finalProjectName =
      hasLockedOnDisabledDay && matchedExisting
        ? matchedExisting.projectName || matchedExisting.project
        : proj.label;
    const finalTaskId = hasLockedOnDisabledDay && matchedExisting ? matchedExisting.task : task.id;
    const finalTaskSubject =
      hasLockedOnDisabledDay && matchedExisting
        ? matchedExisting.taskSubject || matchedExisting.task
        : task.label;

    const days: Record<string, { hours: number; description: string }> = {};
    let rowHasEditableData = false;

    dayColMap.forEach(({ dateKey, hoursCol, commentCol }) => {
      const excelHours = parseHourValue(row[hoursCol]);
      const rawDesc = commentCol >= 0 ? row[commentCol] : "";
      const excelDesc = rawDesc !== undefined && rawDesc !== null ? String(rawDesc).trim() : "";
      const existingCell = matchedExisting?.days?.[dateKey];

      // If the day is a disabled/submitted day:
      if (disabledDays.includes(dateKey)) {
        if (excelHours > 0 || excelDesc.length > 0) {
          skippedDisabledHours = true;
        }
        // Preserve existing data only; do not accept new entries or changes on disabled days
        days[dateKey] = existingCell ? { ...existingCell } : { hours: 0, description: "" };
        return;
      }

      // For editable days: take Excel values
      if (excelHours > 0 || excelDesc.length > 0) {
        rowHasEditableData = true;
      }

      days[dateKey] = {
        hours: excelHours,
        description: excelDesc.length > 0 ? excelDesc : existingCell?.description || "",
      };
    });

    // If it's a completely new row and has no data on editable days (only attempted on disabled days or empty), skip it
    if (!matchedExisting && !rowHasEditableData) {
      return;
    }

    parsedRows.push({
      id: matchedExisting
        ? matchedExisting.id
        : `import_row_${Date.now()}_${rIdx}_${Math.random().toString(36).substring(2, 7)}`,
      project: finalProjectId,
      projectName: finalProjectName,
      task: finalTaskId,
      taskSubject: finalTaskSubject,
      activityType: matchedExisting?.activityType || "Service",
      isBillable: matchedExisting?.isBillable ?? true,
      days,
    });
  });

  // Preserve any existing rows with submitted/locked data that were not in the uploaded Excel
  existingRows.forEach((existingRow) => {
    if (!usedExistingRowIds.has(existingRow.id)) {
      const hasDisabledData = disabledDays.some((d) => (existingRow.days[d]?.hours || 0) > 0);
      if (hasDisabledData) {
        parsedRows.push(existingRow);
        usedExistingRowIds.add(existingRow.id);
      }
    }
  });

  if (parsedRows.length === 0) {
    throw new Error("No valid rows found. Please ensure Project and Task columns are present with hours on editable days.");
  }

  return { rows: parsedRows, rowCount: parsedRows.length, skippedDisabledHours };
};
