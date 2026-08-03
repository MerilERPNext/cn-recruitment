import { useCallback, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Upload,
  FileSpreadsheet,
  X,
  CheckCircle2,
  AlertCircle,
  Download,
  FileText,
  Trash2,
  Loader2,
  Pencil,
  Check,
  XCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import toast from 'react-hot-toast';
import PageLayoutWrapper from "../../shared/PageLayoutWrapper";
import Button from "../../shared/atoms/Button";
import { Typography } from "../../shared/atoms/Typography";
import { AsyncSelect } from "../../shared/atoms/AsyncSelect";
import { performanceService } from "../../../services/performanceService";
import { getPerformanceErrorMessage } from "../../../services/performanceService";
import { useCurrentEmployeeDetails } from "../../../hooks/useEmployee";
import { useSaveGoals } from "../../../hooks/usePerformance";
import type { GoalSaveItem } from "../../../types/goal";

/* ──────────────────────────────────────────────
   Types
   ────────────────────────────────────────────── */

interface ParsedRow {
  [key: string]: string | number | undefined;
}

interface FileValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

type UploadStatus = "idle" | "parsing" | "parsed" | "error";

const ACCEPTED_EXTENSIONS = [".csv", ".xlsx", ".xls"];
const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const EXPECTED_COLUMNS = [
  "Goal Title",
  "Sub Goal Title",
  "Sub Goal Weightage",
  "Department",
  "Designation",
  "Goal Weightage",
];

/** Columns that must have a non-empty value in every row */
const REQUIRED_COLUMNS = [
  "Goal Title",
  "Sub Goal Title",
  "Sub Goal Weightage",
];

/* ──────────────────────────────────────────────
   Helpers
   ────────────────────────────────────────────── */

function getFileExtension(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot === -1 ? "" : name.slice(dot).toLowerCase();
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function validateFile(file: File): FileValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  const ext = getFileExtension(file.name);

  if (!ACCEPTED_EXTENSIONS.includes(ext)) {
    errors.push(
      `Unsupported file format "${ext}". Please upload a CSV or XLSX file.`,
    );
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    errors.push(
      `File size (${formatFileSize(file.size)}) exceeds the ${MAX_FILE_SIZE_MB} MB limit.`,
    );
  }
  if (file.size === 0) {
    errors.push("The file is empty. Please upload a file with data.");
  }

  return { isValid: errors.length === 0, errors, warnings };
}

function validateParsedData(
  rows: ParsedRow[],
  headers: string[],
): FileValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (rows.length === 0) {
    errors.push(
      "The file contains no data rows. Please add at least one row of data.",
    );
  }

  const missingColumns = EXPECTED_COLUMNS.filter(
    (col) =>
      !headers.some((h) => h.toLowerCase().trim() === col.toLowerCase().trim()),
  );

  if (missingColumns.length > 0) {
    warnings.push(
      `Missing expected columns: ${missingColumns.join(", ")}. The data may not import correctly.`,
    );
  }

  if (rows.length > 5000) {
    warnings.push(
      `The file contains ${rows.length.toLocaleString()} rows. Only the first 5,000 rows will be processed.`,
    );
  }

  return { isValid: errors.length === 0, errors, warnings };
}

function generateTemplate(): void {
  const ws = XLSX.utils.aoa_to_sheet([
    EXPECTED_COLUMNS,
    [
      "Improve product quality",
      "Reduce bug count by 30%",
      40,
      "Engineering",
      "Senior Engineer",
      25,
    ],
    [
      "Improve product quality",
      "Achieve 95% test coverage",
      30,
      "Engineering",
      "Senior Engineer",
      25,
    ],
    [
      "Improve product quality",
      "Ship zero P0 bugs in Q3",
      30,
      "Engineering",
      "Senior Engineer",
      25,
    ],
  ]);

  // Column widths
  ws["!cols"] = EXPECTED_COLUMNS.map((col) => ({
    wch: Math.max(col.length + 4, 20),
  }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Goal Import Template");
  XLSX.writeFile(wb, "goal_import_template.xlsx");
}

/* ── Row-level validation ──────────────────── */

interface RowValidation {
  isValid: boolean;
  missingFields: string[];
  weightageError: string | null;
}

/**
 * Validate a single row: check required columns are filled.
 * Weightage errors are computed separately at the goal-group level.
 */
function validateRow(
  row: ParsedRow,
  visibleHeaders: string[],
): Omit<RowValidation, "weightageError"> {
  const missingFields: string[] = [];
  for (const col of REQUIRED_COLUMNS) {
    // Only validate if the column is still visible
    if (
      !visibleHeaders.some(
        (h) => h.toLowerCase().trim() === col.toLowerCase().trim(),
      )
    )
      continue;
    const value = row[col];
    if (value === undefined || value === null || String(value).trim() === "") {
      missingFields.push(col);
    }
  }
  return { isValid: missingFields.length === 0, missingFields };
}

/**
 * Compute per-row weightage validation.
 * Groups rows by 'Goal Title' and checks if 'Sub Goal Weightage' sums to 100.
 */
function computeWeightageErrors(
  rows: ParsedRow[],
  visibleHeaders: string[],
): Map<number, string> {
  const errorMap = new Map<number, string>();

  const hasObjectiveTitle = visibleHeaders.some(
    (h) => h.toLowerCase().trim() === "goal title",
  );
  const hasKRWeightage = visibleHeaders.some(
    (h) => h.toLowerCase().trim() === "sub goal weightage",
  );

  if (!hasObjectiveTitle || !hasKRWeightage) return errorMap;

  // Group row indices by objective title
  const groups = new Map<string, number[]>();
  rows.forEach((row, idx) => {
    const objective = String(row["Goal Title"] ?? "")
      .trim()
      .toLowerCase();
    if (!objective) return;
    if (!groups.has(objective)) groups.set(objective, []);
    groups.get(objective)!.push(idx);
  });

  for (const [, indices] of groups) {
    let sum = 0;
    for (const idx of indices) {
      const w = Number(rows[idx]["Sub Goal Weightage"]);
      if (!isNaN(w)) sum += w;
    }
    if (sum !== 100) {
      const msg = `Sub Goal Weightage for this goal sums to ${sum}% (expected 100%)`;
      for (const idx of indices) {
        errorMap.set(idx, msg);
      }
    }
  }

  return errorMap;
}

/* ──────────────────────────────────────────────
   Component
   ────────────────────────────────────────────── */

const BulkImportGoals: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: currentEmployee } = useCurrentEmployeeDetails({ logged_in_employee_details: true });
  const currentCompany = currentEmployee?.company;

  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [validation, setValidation] = useState<FileValidation | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Editable preview state
  const [editingCell, setEditingCell] = useState<{
    row: number;
    col: string;
  } | null>(null);
  const [editValue, setEditValue] = useState<string>("");

  // Removed columns tracking
  const [removedColumns, setRemovedColumns] = useState<Set<string>>(new Set());

  /* ─── Derived state ──────────────────────── */

  const visibleHeaders = useMemo(
    () => headers.filter((h) => !removedColumns.has(h)),
    [headers, removedColumns],
  );



  const weightageErrors = useMemo(
    () => computeWeightageErrors(parsedRows, visibleHeaders),
    [parsedRows, visibleHeaders],
  );

  /** Full row validation results (required fields + weightage) */
  const rowValidations: RowValidation[] = useMemo(
    () =>
      parsedRows.map((row, idx) => {
        const base = validateRow(row, visibleHeaders);
        return {
          ...base,
          weightageError: weightageErrors.get(idx) ?? null,
          isValid: base.isValid && !weightageErrors.has(idx),
        };
      }),
    [parsedRows, visibleHeaders, weightageErrors],
  );

  /** Summary counts */
  const validCount = rowValidations.filter((v) => v.isValid).length;
  const invalidCount = rowValidations.length - validCount;
  const hasInvalidRows = invalidCount > 0;

  /* ─── API integration ──────────────────────── */

  const { mutate: saveGoals, isPending: isImporting } = useSaveGoals();

  /**
   * Transform parsed rows into GoalSaveItem[] grouped by Goal Title,
   * then call the save_goals API.
   */
  const handleImport = useCallback(() => {
    if (hasInvalidRows || parsedRows.length === 0) return;

    // Group rows by Goal Title
    const goalMap = new Map<string, GoalSaveItem>();

    for (const row of parsedRows) {
      const objectiveTitle = String(row['Goal Title'] ?? '').trim();
      if (!objectiveTitle) continue;

      if (!goalMap.has(objectiveTitle)) {
        goalMap.set(objectiveTitle, {
          goal: null,
          goal_type: String(row['Goal Type'] ?? 'Individual').trim(),
          title: objectiveTitle,
          description: '',
          weightage: Number(row['Goal Weightage']) || 0,
          department: String(row['Department'] ?? '').trim(),
          designation: String(row['Designation'] ?? '').trim(),
          key_results: [],
        });
      }

      const krTitle = String(row['Sub Goal Title'] ?? '').trim();
      const krWeightage = Number(row['Sub Goal Weightage']) || 0;

      if (krTitle) {
        goalMap.get(objectiveTitle)!.key_results.push({
          title: krTitle,
          weightage: krWeightage,
        });
      }
    }

    const goals = Array.from(goalMap.values());

    if (goals.length === 0) {
      toast.error('No valid goals found to import.');
      return;
    }

    saveGoals(
      { action: 'draft', goals },
      {
        onSuccess: (response) => {
          if (!response.success) {
            toast.error(response.message || 'Unable to import goals. Please try again.');
            return;
          }
          toast.success(response.message || `${goals.length} goal(s) imported successfully!`);
          navigate('/webapp/performance-app/my-goals');
        },
        onError: (error) => toast.error(getPerformanceErrorMessage(error, 'Unable to import goals. Please try again.')),
      },
    );
  }, [hasInvalidRows, parsedRows, saveGoals, navigate]);

  /* ─── File parsing ───────────────────────── */

  const parseFile = useCallback(async (selectedFile: File) => {
    setStatus("parsing");
    setValidation(null);
    setParsedRows([]);
    setHeaders([]);
    setRemovedColumns(new Set());
    setEditingCell(null);

    const fileValidation = validateFile(selectedFile);
    if (!fileValidation.isValid) {
      setValidation(fileValidation);
      setStatus("error");
      return;
    }

    try {
      const data = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];

      const jsonData = XLSX.utils.sheet_to_json<ParsedRow>(sheet, {
        defval: "",
      });
      const sheetHeaders =
        XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 })[0] ?? [];

      const dataValidation = validateParsedData(
        jsonData,
        sheetHeaders as unknown as string[],
      );

      const combinedErrors = [
        ...fileValidation.errors,
        ...dataValidation.errors,
      ];
      const combinedWarnings = [
        ...fileValidation.warnings,
        ...dataValidation.warnings,
      ];

      setHeaders(sheetHeaders as unknown as string[]);
      setParsedRows(jsonData.slice(0, 5000));
      setValidation({
        isValid: combinedErrors.length === 0,
        errors: combinedErrors,
        warnings: combinedWarnings,
      });
      setStatus(combinedErrors.length > 0 ? "error" : "parsed");
    } catch {
      setValidation({
        isValid: false,
        errors: [
          "Failed to parse the file. Please ensure it is a valid CSV or XLSX file.",
        ],
        warnings: [],
      });
      setStatus("error");
    }
  }, []);

  /* ─── Event handlers ─────────────────────── */

  const handleFileSelect = useCallback(
    (selectedFile: File | undefined) => {
      if (!selectedFile) return;
      const ext = getFileExtension(selectedFile.name);
      if (!ACCEPTED_EXTENSIONS.includes(ext)) {
        setFile(null);
        setStatus('error');
        setParsedRows([]);
        setHeaders([]);
        setRemovedColumns(new Set());
        setEditingCell(null);
        setValidation({
          isValid: false,
          errors: [
            `Unsupported file format "${ext || 'unknown'}". Only CSV, XLSX, and XLS files are allowed.`,
          ],
          warnings: [],
        });
        return;
      }
      setFile(selectedFile);
      parseFile(selectedFile);
    },
    [parseFile],
  );

  const handleInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      handleFileSelect(event.target.files?.[0]);
      // Reset so the same file can be re-selected
      event.target.value = "";
    },
    [handleFileSelect],
  );

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      event.stopPropagation();
      setIsDragOver(false);
      handleFileSelect(event.dataTransfer.files?.[0]);
    },
    [handleFileSelect],
  );

  const handleRemoveFile = useCallback(() => {
    setFile(null);
    setStatus("idle");
    setParsedRows([]);
    setHeaders([]);
    setValidation(null);
    setRemovedColumns(new Set());
    setEditingCell(null);
  }, []);

  const handleGoBack = useCallback(() => {
    navigate("/webapp/performance-app/my-goals/new-goal");
  }, [navigate]);

  /* ─── Inline edit handlers ───────────────── */

  const startEditing = useCallback(
    (rowIndex: number, header: string, currentValue: string) => {
      setEditingCell({ row: rowIndex, col: header });
      setEditValue(currentValue);
    },
    [],
  );

  const commitEdit = useCallback(() => {
    if (!editingCell) return;
    const { row, col } = editingCell;
    setParsedRows((prev) => {
      const updated = [...prev];
      updated[row] = { ...updated[row], [col]: editValue };
      return updated;
    });
    setEditingCell(null);
    setEditValue("");
  }, [editingCell, editValue]);

  const cancelEdit = useCallback(() => {
    setEditingCell(null);
    setEditValue("");
  }, []);

  const handleEditKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        commitEdit();
      } else if (e.key === "Escape") {
        cancelEdit();
      }
    },
    [commitEdit, cancelEdit],
  );

  /* ─── Department / Designation dropdown helpers ── */

  const fetchDepartmentOptions = useCallback(
    async (search: string, skip: number) => {
      try {
        return await performanceService.getDepartmentOptions({
          search_text: search,
          skip,
          company: currentCompany,
        });
      } catch (e) {
        console.error(e);
        return [];
      }
    },
    [currentCompany],
  );

  const fetchDesignationOptions = useCallback(
    (department: string) => async (search: string, skip: number) => {
      if (!department) return [];
      try {
        return await performanceService.getDesignationOptions({
          search_text: search,
          skip,
          department,
        });
      } catch (e) {
        console.error(e);
        return [];
      }
    },
    [],
  );

  const handleDropdownSelect = useCallback(
    (rowIndex: number, header: string, value: string) => {
      setParsedRows((prev) => {
        const updated = [...prev];
        updated[rowIndex] = { ...updated[rowIndex], [header]: value };
        // Clear designation when department changes
        if (header === "Department") {
          updated[rowIndex] = { ...updated[rowIndex], Designation: "" };
        }
        return updated;
      });
    },
    [],
  );

  /* ─── Column removal ─────────────────────── */

  const removeColumn = useCallback((header: string) => {
    setRemovedColumns((prev) => {
      const next = new Set(prev);
      next.add(header);
      return next;
    });
    // If editing a cell in this column, cancel
    setEditingCell((prev) => (prev?.col === header ? null : prev));
  }, []);

  const restoreAllColumns = useCallback(() => {
    setRemovedColumns(new Set());
  }, []);

  /* ─── Row deletion ───────────────────────── */

  const deleteRow = useCallback((rowIndex: number) => {
    setParsedRows((prev) => prev.filter((_, i) => i !== rowIndex));
    // If editing a cell in the deleted row, cancel
    setEditingCell((prev) => {
      if (!prev) return prev;
      if (prev.row === rowIndex) return null;
      // Adjust index for rows after the deleted one
      if (prev.row > rowIndex) return { ...prev, row: prev.row - 1 };
      return prev;
    });
  }, []);

  /* ─── Render ─────────────────────────────── */

  /** Check if a column header matches a required column (case-insensitive) */
  const isRequiredColumn = (header: string) =>
    REQUIRED_COLUMNS.some(
      (rc) => rc.toLowerCase().trim() === header.toLowerCase().trim(),
    );

  return (
    <PageLayoutWrapper
      title="Bulk Import Goals"
      subtitle="Upload a CSV or XLSX file to import multiple goals at once — up to 5,000 rows with row-level validation."
      footerLeft={
        <Button
          type="button"
          variant="outline"
          bgColor="text"
          fullWidth
          className="h-9 cursor-pointer justify-center w-full rounded-lg border-gray-200 bg-white px-4 text-gray-700 md:w-auto"
          onClick={handleGoBack}
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Goal Creation
        </Button>
      }
      footerRight={
        <div className="flex w-full flex-col gap-2 md:flex-row md:items-center md:justify-end md:gap-3">
          {hasInvalidRows && status === 'parsed' && parsedRows.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 md:mr-2">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>
                <span className="font-semibold">{invalidCount} row{invalidCount !== 1 ? 's have' : ' has'} issues.</span>
                {' '}Fix or remove them to enable import.
              </span>
            </div>
          )}
          <Button
            type="button"
            variant="contain"
            bgColor="primary"
            fullWidth
            disabled={
              status !== "parsed" ||
              parsedRows.length === 0 ||
              hasInvalidRows ||
              isImporting
            }
            onClick={handleImport}
            className="h-9 justify-center rounded-lg bg-blue-600 px-4 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed md:w-auto"
          >
            {isImporting ? (
              <>
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                Importing…
              </>
            ) : (
              <>
                Import{" "}
                {parsedRows.length > 0
                  ? `${parsedRows.length} Goal${parsedRows.length !== 1 ? "s" : ""}`
                  : "Goals"}
              </>
            )}
          </Button>
        </div>
      }
    >
      {/* ── Template download banner ── */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 sm:p-5 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
          <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <Typography
              variant="subheading"
              className="font-semibold text-gray-900 text-sm"
            >
              Need a template?
            </Typography>
            <Typography variant="bodySmall" className="text-gray-600 text-xs">
              Download our pre-formatted template with all required columns and
              sample data.
            </Typography>
          </div>
        </div>
        <Button
          variant="outline"
          bgColor="primary"
          className="w-full sm:w-auto justify-center whitespace-nowrap border-blue-200 text-blue-600 hover:bg-blue-100"
          onClick={generateTemplate}
        >
          <Download className="w-4 h-4 mr-1.5" />
          Download Template
        </Button>
      </div>

      {/* ── Upload area ── */}
      <div
        className={`
                    relative rounded-2xl border-2 border-dashed transition-all duration-200 cursor-pointer
                    ${
                      isDragOver
                        ? "border-blue-400 bg-blue-50/60 shadow-[0_0_0_4px_rgba(59,130,246,0.1)]"
                        : file
                          ? "border-green-200 bg-green-50/30"
                          : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/50"
                    }
                `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !file && fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) =>
          e.key === "Enter" && !file && fileInputRef.current?.click()
        }
        aria-label="Upload CSV or XLSX file"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={handleInputChange}
          className="hidden"
          aria-hidden="true"
        />

        {/* ─ Idle / drag state ─ */}
        {!file && (
          <div className="flex flex-col items-center justify-center py-14 px-6 text-center">
            <div
              className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-5 transition-colors ${
                isDragOver
                  ? "bg-blue-100 text-blue-500"
                  : "bg-gray-100 text-gray-400"
              }`}
            >
              <Upload className="w-7 h-7" />
            </div>
            <Typography
              variant="subheading"
              className="font-semibold text-gray-900 mb-1"
            >
              {isDragOver
                ? "Drop your file here"
                : "Drag & drop your file here"}
            </Typography>
            <Typography variant="bodySmall" className="text-gray-500 mb-5">
              or click to browse from your computer
            </Typography>
            <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-gray-400">
              <span className="px-2.5 py-1 rounded-md bg-gray-100 font-medium">
                .CSV
              </span>
              <span className="px-2.5 py-1 rounded-md bg-gray-100 font-medium">
                .XLSX
              </span>
              <span className="px-2.5 py-1 rounded-md bg-gray-100 font-medium">
                .XLS
              </span>
              <span className="text-gray-300 mx-1">·</span>
              <span>Max {MAX_FILE_SIZE_MB} MB</span>
            </div>
          </div>
        )}

        {/* ─ File selected state ─ */}
        {file && (
          <div className="flex items-center gap-4 p-5">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                status === "error"
                  ? "bg-red-100 text-red-500"
                  : status === "parsed"
                    ? "bg-green-100 text-green-600"
                    : "bg-blue-100 text-blue-500"
              }`}
            >
              {status === "parsing" ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <FileSpreadsheet className="w-6 h-6" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <Typography
                variant="subheading"
                className="font-semibold text-gray-900 truncate text-sm"
              >
                {file.name}
              </Typography>
              <div className="flex items-center gap-2 mt-0.5">
                <Typography
                  variant="bodySmall"
                  className="text-gray-500 text-xs"
                >
                  {formatFileSize(file.size)}
                </Typography>
                {status === "parsed" && (
                  <>
                    <span className="text-gray-300">·</span>
                    <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {parsedRows.length} row
                      {parsedRows.length !== 1 ? "s" : ""} found
                    </span>
                  </>
                )}
                {status === "parsing" && (
                  <>
                    <span className="text-gray-300">·</span>
                    <span className="text-xs text-blue-500 font-medium">
                      Parsing…
                    </span>
                  </>
                )}
                {status === "error" && (
                  <>
                    <span className="text-gray-300">·</span>
                    <span className="flex items-center gap-1 text-xs text-red-500 font-medium">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Validation failed
                    </span>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                className="p-2 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition-colors"
                title="Replace file"
              >
                <Upload className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveFile();
                }}
                className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                title="Remove file"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Validation messages ── */}
      {validation &&
        (validation.errors.length > 0 || validation.warnings.length > 0) && (
          <div className="mt-4 space-y-3">
            {validation.errors.map((error, i) => (
              <div
                key={`err-${i}`}
                className="flex items-start gap-3 p-3 rounded-lg bg-red-50 border border-red-100 text-sm text-red-700"
              >
                <X className="w-4 h-4 mt-0.5 shrink-0 text-red-400" />
                <span>{error}</span>
              </div>
            ))}
            {validation.warnings.map((warning, i) => (
              <div
                key={`warn-${i}`}
                className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 border border-amber-100 text-sm text-amber-700"
              >
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-amber-400" />
                <span>{warning}</span>
              </div>
            ))}
          </div>
        )}

      {/* ── Preview table ── */}
      {status === "parsed" && headers.length > 0 && parsedRows.length > 0 && (
        <div className="mt-6">
          {/* ── Preview header bar ── */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-2">
            <div className="flex items-center gap-3">
              <Typography
                variant="subheading"
                className="font-semibold text-gray-900"
              >
                Data Preview
              </Typography>
              {/* Validation summary pills */}
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-xl text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                  <CheckCircle2 className="w-3 h-3" />
                  {validCount} valid
                </span>
                {invalidCount > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-xl text-xs font-medium bg-red-50 text-red-700 border border-red-200">
                    <XCircle className="w-3 h-3" />
                    {invalidCount} issue{invalidCount !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              {removedColumns.size > 0 && (
                <button
                  type="button"
                  onClick={restoreAllColumns}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium underline underline-offset-2"
                >
                  Restore {removedColumns.size} removed column
                  {removedColumns.size !== 1 ? "s" : ""}
                </button>
              )}
              <Typography variant="bodySmall" className="text-gray-400 text-xs">
                {parsedRows.length} row{parsedRows.length !== 1 ? "s" : ""}
              </Typography>
            </div>
          </div>

          {/* ── Weightage validation banner ── */}
          {weightageErrors.size > 0 && (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-orange-50 border border-orange-200 text-sm text-orange-800 mb-3">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-orange-500" />
              <div>
                <span className="font-semibold">
                  Sub Goal Weightage mismatch:{" "}
                </span>
                <span>
                  Some goals have Sub Goal Weightages that don't sum to
                  100%. Edit the values below to fix.
                </span>
              </div>
            </div>
          )}

          {/* ── Editable hint ── */}
          <div className="flex items-center gap-1.5 mb-2">
            <Pencil className="w-3 h-3 text-gray-400" />
            <Typography
              variant="bodySmall"
              className="text-gray-400 text-xs italic"
            >
              Click any cell to edit · Press Enter to save or Esc to cancel
            </Typography>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white shadow-sm" style={{ position: "relative" }}>
            <div className="overflow-x-auto" style={{ maxHeight: "460px", overflowY: "auto" }}>
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-gray-50 border-b border-gray-200">
                    {/* Row number */}
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap w-12">
                      #
                    </th>
                    {/* Status column */}
                    <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap w-16 bg-gray-50">
                      Status
                    </th>
                    {/* Data columns */}
                    {visibleHeaders.map((header) => {
                      const required = isRequiredColumn(header);
                      return (
                        <th
                          key={header}
                          className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap group relative"
                        >
                          <div className="flex items-center gap-1.5">
                            <span className="flex items-center gap-1">
                              {header}
                              {required && (
                                <span
                                  className="text-red-400 text-[10px] font-bold"
                                  title="Required"
                                >
                                  *
                                </span>
                              )}
                            </span>
                            {/* Remove column button */}
                            <button
                              type="button"
                              onClick={() => removeColumn(header)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-red-100 text-gray-300 hover:text-red-500"
                              title={`Remove "${header}" column`}
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        </th>
                      );
                    })}
                    {/* Actions column header */}
                    <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap w-14 bg-gray-50"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {parsedRows.map((row, rowIndex) => {
                    const rv = rowValidations[rowIndex];
                    const isRowValid = rv?.isValid ?? true;

                    return (
                      <tr
                        key={rowIndex}
                        className={`transition-colors ${
                          !isRowValid
                            ? "bg-red-50/40 hover:bg-red-50/60"
                            : "hover:bg-gray-50/50"
                        }`}
                      >
                        {/* Row number */}
                        <td className="px-4 py-2.5 text-gray-400 font-mono text-xs whitespace-nowrap">
                          {rowIndex + 1}
                        </td>

                        {/* Status indicator */}
                        <td className="px-3 py-2.5 text-center whitespace-nowrap">
                          {isRowValid ? (
                            <span
                              className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-100"
                              title="All required fields are filled and weightage is valid"
                            >
                              <CheckCircle2 className="w-4 h-4 text-green-600" />
                            </span>
                          ) : (
                            <span
                              className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-100 cursor-help"
                              title={[
                                ...(rv?.missingFields.length
                                  ? [`Missing: ${rv.missingFields.join(", ")}`]
                                  : []),
                                ...(rv?.weightageError
                                  ? [rv.weightageError]
                                  : []),
                              ].join(" | ")}
                            >
                              <XCircle className="w-4 h-4 text-red-500" />
                            </span>
                          )}
                        </td>

                        {/* Data cells (editable) */}
                        {visibleHeaders.map((header) => {
                          const cellValue = String(row[header] ?? "");
                          const isEditing =
                            editingCell?.row === rowIndex &&
                            editingCell?.col === header;
                          const isMissingRequired =
                            rv?.missingFields.includes(header) ?? false;
                          const hasWeightageError =
                            header.toLowerCase().trim() ===
                              "sub goal weightage" && !!rv?.weightageError;

                          const isDepartmentCol = header === "Department";
                          const isDesignationCol = header === "Designation";
                          const isDropdownCol = isDepartmentCol || isDesignationCol;

                          return (
                            <td
                              key={`${rowIndex}-${header}`}
                              className={`px-4 py-2.5 whitespace-nowrap ${
                                isDropdownCol ? "min-w-[200px] overflow-visible" : "max-w-[200px]"
                              } ${
                                isEditing ? "p-1" : ""
                              } ${
                                isMissingRequired
                                  ? "bg-red-50"
                                  : hasWeightageError
                                    ? "bg-orange-50"
                                    : ""
                              }`}
                              style={isDropdownCol ? { overflow: "visible" } : undefined}
                            >
                              {isDropdownCol ? (
                                /* ── Dropdown mode for Department / Designation ── */
                                <div className="relative">
                                  <AsyncSelect
                                    value={cellValue ? { label: cellValue, value: cellValue } : { label: "Select", value: "" }}
                                    onChange={(opt: any) => handleDropdownSelect(rowIndex, header, opt.value)}
                                    fetchOptions={
                                      isDepartmentCol
                                        ? fetchDepartmentOptions
                                        : fetchDesignationOptions(String(row["Department"] ?? ""))
                                    }
                                    placeholder={isDepartmentCol ? "Search department..." : "Search designation..."}
                                    disabled={isDesignationCol && !String(row["Department"] ?? "").trim()}
                                    className="relative  !w-full"
                                    useFixedPositioning
                                  />
                                </div>
                              ) : isEditing ? (
                                /* ── Editing mode ── */
                                <div className="flex items-center gap-1">
                                  <input
                                    type="text"
                                    value={editValue}
                                    onChange={(e) =>
                                      setEditValue(e.target.value)
                                    }
                                    onKeyDown={handleEditKeyDown}
                                    autoFocus
                                    className="w-full min-w-[100px] px-2 py-1 text-sm border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/30 bg-white"
                                  />
                                  <button
                                    type="button"
                                    onClick={commitEdit}
                                    className="p-1 rounded hover:bg-green-100 text-green-600"
                                    title="Save"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={cancelEdit}
                                    className="p-1 rounded hover:bg-red-100 text-red-500"
                                    title="Cancel"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ) : (
                                /* ── Display mode ── */
                                <div
                                  className="flex items-center gap-1.5 group/cell cursor-pointer rounded px-1 py-0.5 -mx-1 -my-0.5 hover:bg-blue-50/60 transition-colors"
                                  onClick={() =>
                                    startEditing(rowIndex, header, cellValue)
                                  }
                                  title={
                                    isMissingRequired
                                      ? `"${header}" is required`
                                      : hasWeightageError
                                        ? (rv?.weightageError ?? "")
                                        : `Click to edit`
                                  }
                                >
                                  <span
                                    className={`truncate ${
                                      isMissingRequired
                                        ? "text-red-400 italic"
                                        : hasWeightageError
                                          ? "text-orange-700 font-medium"
                                          : "text-gray-700"
                                    }`}
                                  >
                                    {cellValue ||
                                      (isMissingRequired ? "(required)" : "—")}
                                  </span>
                                  <Pencil className="w-3 h-3 text-gray-300 opacity-0 group-hover/cell:opacity-100 transition-opacity shrink-0" />
                                </div>
                              )}
                            </td>
                          );
                        })}

                        {/* Delete row button */}
                        <td className="px-3 py-2.5 text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => deleteRow(rowIndex)}
                            className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                            title="Delete row"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Instructions ── */}
      <div className="mt-8 mb-4">
        <Typography
          variant="subheading"
          className="font-semibold text-gray-900 mb-3"
        >
          File Requirements
        </Typography>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            {
              title: "File Formats",
              description: "CSV, XLSX, or XLS files are supported.",
            },
            {
              title: "Max File Size",
              description: `Up to ${MAX_FILE_SIZE_MB} MB per file.`,
            },
            {
              title: "Row Limit",
              description: "Up to 5,000 rows per upload.",
            },
            {
              title: "Required Columns",
              description:
                "Goal Title, Sub Goal Title, Sub Goal Weightage.",
            },
            {
              title: "Optional Columns",
              description:
                "Department, Designation, Goal Weightage.",
            },
            {
              title: "Template",
              description:
                "Download the template above for the correct format.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="bg-white border border-gray-100 rounded-lg p-3.5 shadow-xs"
            >
              <Typography
                variant="bodyMedium"
                className="font-semibold text-gray-800 text-xs mb-0.5"
              >
                {item.title}
              </Typography>
              <Typography
                variant="bodySmall"
                className="text-gray-500 text-xs leading-relaxed"
              >
                {item.description}
              </Typography>
            </div>
          ))}
        </div>
      </div>
    </PageLayoutWrapper>
  );
};

export default BulkImportGoals;
