import React, { useMemo, memo } from "react";
import { Trash2, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { Form } from "@tsed/react-formio";
import Tooltip from "../../../shared/Tooltip";
import { Typography } from "../../../shared/atoms/Typography";
import { useScreenSize } from "../../../../hooks/useScreenSize";
import { TimesheetRow as TimesheetRowType } from "../TimesheetCreate";

interface InlineFormRowProps {
  row: TimesheetRowType;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handleConfigureRow: (rowId: string, submission: any) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  formSchema: any;
  showSubtask: boolean;
  company?: string;
}

const InlineFormRow = memo(({ row, handleConfigureRow, formSchema, showSubtask, company }: InlineFormRowProps) => {
  const parentTaskVal = row.parentTask || (!showSubtask ? row.task : "");
  const submission = useMemo(
    () => ({
      data: {
        project: row.project || "",
        custom_parent_task: parentTaskVal || "",
        ...(showSubtask ? { task: row.task || "" } : {}),
        company: company || "",
        is_billable: row.isBillable !== undefined ? row.isBillable : true,
      },
    }),
    [row.project, parentTaskVal, row.task, row.isBillable, showSubtask, company]
  );

  return (
    <Form
      form={formSchema}
      submission={submission}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onChange={(sub: any) => {
        const data = sub.data || {};
        const projectVal = data.project || "";
        const curParentTaskVal = data.custom_parent_task || "";
        const taskVal = showSubtask ? (data.task || "") : (data.custom_parent_task || "");
        const isBillableVal = data.is_billable !== undefined ? !!data.is_billable : true;

        if (
          projectVal === (row.project || "") &&
          curParentTaskVal === (parentTaskVal || "") &&
          taskVal === (row.task || "") &&
          isBillableVal === row.isBillable
        ) {
          return;
        }

        handleConfigureRow(row.id, sub);
      }}
      options={{
        buttonSettings: {
          showSubmit: true,
          submitText: "Confirm"
        }
      }}
    />
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.row.id === nextProps.row.id &&
    prevProps.row.project === nextProps.row.project &&
    prevProps.row.parentTask === nextProps.row.parentTask &&
    prevProps.row.task === nextProps.row.task &&
    prevProps.row.isBillable === nextProps.row.isBillable &&
    prevProps.showSubtask === nextProps.showSubtask &&
    prevProps.company === nextProps.company
  );
});

export interface TimesheetRowProps {
  row: TimesheetRowType;
  projName: string;
  taskName: string;
  isGridEditable: boolean;
  isReadOnly: boolean;
  validationErrors: Record<string, string>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handleConfigureRow: (rowId: string, submission: any) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  formSchema: any;
  daysOfWeek: Date[];
  formatCellOnBlur: (hours: number) => string;
  handleHourChange: (rowId: string, dateKey: string, value: string) => void;
  handleOpenComment: (rowId: string, dateKey: string, projectName: string, dayLabel: string) => void;
  getRowTotal: (row: TimesheetRowType) => number;
  handleDeleteRow: (rowId: string) => void;
  disabledDays?: string[];
  dayStatusMap?: Record<string, string>;
  showSubtask: boolean;
  company?: string;
  selectedDates?: string[];
}

export const TimesheetRow: React.FC<TimesheetRowProps> = ({
  row,
  projName,
  taskName,
  isGridEditable,
  isReadOnly,
  validationErrors,
  handleConfigureRow,
  formSchema,
  daysOfWeek,
  formatCellOnBlur,
  handleHourChange,
  handleOpenComment,
  getRowTotal,
  handleDeleteRow,
  disabledDays = [],
  dayStatusMap = {},
  showSubtask = true,
  company = "",
  selectedDates = []
}) => {
  const { isDesktop } = useScreenSize();

  const hasLockedRecord = useMemo(() => {
    if (!disabledDays || disabledDays.length === 0) return false;
    return daysOfWeek.some(day => {
      const dateKey = format(day, "yyyy-MM-dd");
      return disabledDays.includes(dateKey) && (row.days[dateKey]?.hours || 0) > 0;
    });
  }, [disabledDays, daysOfWeek, row.days]);

  if (!isDesktop) {
    return (
      <tr className="block border-none px-1 py-2 sm:px-2 sm:py-3">
        <td className="block border-none w-full">
          <div className="bg-white border border-t-[3px] border-t-primary rounded-xl p-2 sm:p-3 shadow-sm space-y-3">
            <div className="flex justify-between items-start">
              {isGridEditable && !hasLockedRecord ? (
                <div className="w-full">
                  <InlineFormRow
                    row={row}
                    handleConfigureRow={handleConfigureRow}
                    formSchema={formSchema}
                    showSubtask={showSubtask}
                    company={company}
                  />
                </div>
              ) : (
                <div className="flex items-start justify-between w-full">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <Typography variant="subheading" className="font-semibold text-gray-900 text-sm">
                        {projName}
                      </Typography>
                      {showSubtask && row.parentTask && (
                        <span className="text-[10px] font-semibold bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                          {row.parentTaskSubject || row.parentTask}
                        </span>
                      )}
                    </div>
                    {showSubtask && (
                      <Tooltip content={taskName} position="top">
                        <Typography variant="caption" className="block font-medium text-gray-700 truncate max-w-[120px]">
                          {taskName}
                        </Typography>
                      </Tooltip>
                    )}
                  </div>
                  <Typography variant="caption" className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${row.isBillable ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-600"}`}>
                    {row.isBillable ? "Billable" : "Non-Billable"}
                  </Typography>
                </div>
              )}
            </div>

            <div className={`mt-1 p-0.5 rounded-lg ${validationErrors[`${row.id}_empty_row`] ? 'bg-red-50/50 border border-red-500' : ''}`}>
              <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
                {daysOfWeek.map(day => {
                const dateKey = format(day, "yyyy-MM-dd");
                const cell = row.days[dateKey] || { hours: 0, description: "" };
                const hasComment = !!cell.description;
                const hoursError = validationErrors[`${row.id}_${dateKey}_hours`];
                const commentError = validationErrors[`${row.id}_${dateKey}_comment`];
                const status = dayStatusMap[dateKey];
                const isDateSelected = selectedDates.includes(dateKey);
                const isDayDisabled = isReadOnly || !isGridEditable || disabledDays.includes(dateKey);
                return (
                  <div key={dateKey} className={`min-w-0 flex flex-col items-center p-0.5 rounded-lg transition-colors ${isDateSelected ? 'bg-primary-50/40 ring-1 ring-primary/30' : ''}`}>
                    <Typography variant="caption" className="text-[10px] sm:text-[11px] font-bold text-gray-900 leading-tight">{format(day, "d")}</Typography>
                    <Typography variant="caption" className="text-[9px] sm:text-[10px] font-bold text-gray-600 mb-0.5 leading-tight uppercase">{format(day, "EEE")}</Typography>
                    <input
                      key={`mob-input-${dateKey}-${cell.hours}`}
                      type="text"
                      placeholder="0"
                      defaultValue={cell.hours > 0 ? formatCellOnBlur(cell.hours) : ""}
                      onBlur={(e) => {
                        handleHourChange(row.id, dateKey, e.target.value);
                        const parsed = parseFloat(e.target.value);
                        if (e.target.value.includes(":")) {
                          const [h, m] = e.target.value.split(":").map(Number);
                          if (!isNaN(h) && !isNaN(m)) {
                            e.target.value = formatCellOnBlur(h + m / 60);
                          }
                        } else if (!isNaN(parsed)) {
                          e.target.value = formatCellOnBlur(parsed);
                        } else {
                          e.target.value = "";
                        }
                      }}
                      disabled={isDayDisabled}
                      className={`w-full min-w-0 text-center border rounded-md py-1 px-0.5 font-medium text-[11px] sm:text-xs focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary disabled:bg-gray-100 disabled:text-gray-800 ${hoursError ? "border-red-500 ring-1 ring-red-500" : "border-gray-200"}`}
                    />
                    <button
                      onClick={() => handleOpenComment(row.id, dateKey, projName, format(day, "EEE, dd MMM"))}
                      disabled={isDayDisabled && !hasComment}
                      className={`mt-1 text-[9px] font-bold transition-all w-full min-w-0 py-0.5 rounded border disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-0.5 ${commentError ? 'border-red-500 text-red-500 bg-red-50' : (hasComment ? "text-primary hover:text-primary-600 border-transparent bg-primary/10" : "text-gray-400 hover:text-gray-600 border-transparent")}`}
                    >
                      <span>{hasComment ? "★" : "+"}</span>
                      {cell.hours > 0 && <span className="text-red-500">*</span>}
                    </button>
                    {status && (
                      <span
                        className={`text-[7px] sm:text-[8px] font-semibold px-0.5 py-0.5 rounded-md mt-1 border leading-none text-center w-full min-w-0 truncate ${
                          status === "On Leave"
                            ? "bg-pink-50 text-pink-700 border border-pink-200/60"
                            : status === "Week Off"
                            ? "bg-orange-50 text-orange-600 border border-orange-200/60"
                            : status === "Holiday"
                            ? "bg-violet-50 text-violet-600 border-violet-200/60"
                            : status === "Approved"
                            ? "bg-emerald-50 text-emerald-600 border-emerald-200/60"
                            : status === "Submitted"
                            ? "bg-amber-50 text-amber-600 border-amber-200/60"
                            : status === "Rejected"
                            ? "bg-red-50 text-red-600 border-red-200/60"
                            : "bg-sky-50 text-sky-700 border-sky-200/80 font-semibold"
                        }`}
                      >
                        {status === "Week Off" ? "Off" : status}
                      </span>
                    )}
                  </div>
                );
              })}
              </div>
              {validationErrors[`${row.id}_empty_row`] && (
                <div className="text-red-500 text-[10px] mt-2 font-semibold text-center">
                  Must have at least one logged hour
                </div>
              )}
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-gray-50">
              <Typography variant="label" className="font-bold text-gray-500">Total Hours</Typography>
              <Typography variant="bodyMedium" className="font-bold text-primary">{formatCellOnBlur(getRowTotal(row)) || "0:00"}</Typography>
            </div>

            {isGridEditable && !hasLockedRecord && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => handleDeleteRow(row.id)}
                  className="w-full h-9 flex items-center justify-center gap-2 rounded-xl bg-gray-50 hover:bg-red-50 text-red-400 hover:text-red-500 transition-colors focus:outline-none border border-gray-100 hover:border-red-100"
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="text-sm font-semibold">Remove</span>
                </button>
              </div>
            )}
          </div>
        </td>
      </tr>
    );
  }

  return (
    <>
    <tr className={`hover:bg-gray-50/50 ${validationErrors[`${row.id}_empty_row`] ? 'bg-red-50/30' : ''}`}>
      {/* Row Projects info */}
      <td className="px-6 py-4 align-middle">
        {isGridEditable && !hasLockedRecord ? (
          <div className="flex items-start gap-2">
            <div className={`add-time-entry-form-inline flex-1 min-w-[340px] max-w-[360px] p-2 rounded-lg border ${validationErrors[`${row.id}_project_task`] ? 'border-red-500 bg-red-50/50' : 'bg-gray-50/50 border-gray-150'}`}>
              <InlineFormRow
                row={row}
                handleConfigureRow={handleConfigureRow}
                formSchema={formSchema}
                showSubtask={showSubtask}
                company={company}
              />
              {validationErrors[`${row.id}_project_task`] && (
                <div className="text-red-500 text-[10px] mt-1 font-semibold text-center">
                  Project and Task are required
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <Typography variant="bodyMedium" className="font-bold text-gray-900">
                {projName}
              </Typography>
              <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-0.5 rounded-md border border-gray-100">
                {row.parentTaskSubject && (
                  <>
                    <Tooltip content={row.parentTaskSubject} position="top">
                      <Typography variant="caption" className="block font-semibold text-gray-500 truncate max-w-[150px]">
                        {row.parentTaskSubject}
                      </Typography>
                    </Tooltip>
                    {showSubtask && <ChevronRight className="w-3 h-3 text-primary/70 shrink-0" strokeWidth={3} />}
                  </>
                )}
                {showSubtask && (
                  <Tooltip content={taskName} position="top">
                    <Typography variant="caption" className="block font-medium text-gray-700 truncate max-w-[150px]">
                      {taskName}
                    </Typography>
                  </Tooltip>
                )}
              </div>
              <Typography variant="caption" className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${row.isBillable ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-600"
                }`}>
                {row.isBillable ? "Billable" : "Non-Billable"}
              </Typography>
            </div>
          </div>
        )}
      </td>

      {/* Day input cells */}
      {daysOfWeek.map(day => {
        const dateKey = format(day, "yyyy-MM-dd");
        const cell = row.days[dateKey] || { hours: 0, description: "" };
        const hasComment = !!cell.description;
        const isDateSelected = selectedDates.includes(dateKey);

        return (
          <td
            key={dateKey}
            className={`px-2 py-3 text-center border-l border-gray-50 align-middle transition-colors ${
              isDateSelected ? "bg-primary-50/25" : ""
            }`}
          >
            {(() => {
              const hoursError = validationErrors[`${row.id}_${dateKey}_hours`];
              const commentError = validationErrors[`${row.id}_${dateKey}_comment`];
              return (
                <>
                  <div className="flex flex-col items-center justify-center relative pb-3">
                    <div className="flex items-center justify-center gap-1">
                      <input
                        key={`desk-input-${dateKey}-${cell.hours}`}
                        type="text"
                        placeholder="0:00"
                        defaultValue={cell.hours > 0 ? formatCellOnBlur(cell.hours) : ""}
                        onBlur={(e) => {
                          handleHourChange(row.id, dateKey, e.target.value);
                          const parsed = parseFloat(e.target.value);
                          if (e.target.value.includes(":")) {
                            const [h, m] = e.target.value.split(":").map(Number);
                            if (!isNaN(h) && !isNaN(m)) {
                              e.target.value = formatCellOnBlur(h + m / 60);
                            }
                          } else if (!isNaN(parsed)) {
                            e.target.value = formatCellOnBlur(parsed);
                          } else {
                            e.target.value = "";
                          }
                        }}
                        disabled={isReadOnly || !isGridEditable || disabledDays.includes(dateKey)}
                        className={`w-16 text-center border rounded-lg py-1 px-1.5 font-medium text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary disabled:bg-gray-100 disabled:text-gray-800 ${hoursError ? "border-red-500 ring-1 ring-red-500" : "border-gray-200"
                          }`}
                      />
                    </div>
                  </div>

                  <div className="mt-1 flex flex-col items-center relative pb-3">
                    <button
                      onClick={() => handleOpenComment(
                        row.id,
                        dateKey,
                        projName,
                        format(day, "EEE, dd MMM")
                      )}
                      disabled={(isReadOnly || !isGridEditable || disabledDays.includes(dateKey)) && !hasComment}
                      className={`text-[10px] font-bold transition-all px-2 py-0.5 rounded border disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-0.5 ${commentError ? 'border-red-500 text-red-500 bg-red-50' :
                        (hasComment ? "text-primary hover:text-primary-600 border-transparent" : "text-gray-400 hover:text-gray-600 border-transparent")
                        }`}
                    >
                      <span>{hasComment ? "★ Comment" : "Comment"}</span>
                      {cell.hours > 0 && <span className="text-red-500">*</span>}
                    </button>
                  </div>
                </>
              );
            })()}
          </td>
        );
      })}

      {/* Row Total */}
      <td className="px-4 py-3 text-center border-l border-gray-50 align-middle">
        <Typography variant="bodyMedium" className="font-bold text-gray-900">
          {formatCellOnBlur(getRowTotal(row)) || "0:00"}
        </Typography>
      </td>
      {/* Delete Action */}
      <td className="px-4 py-3 text-center border-l border-gray-50 align-middle">
        {isGridEditable && !hasLockedRecord && (
          <div className="h-8 flex items-center justify-center gap-1 px-3 py-1 rounded-3xl bg-gray-10 w-fit mx-auto">
            <Tooltip content="Delete row" position="top">
              <button
                type="button"
                onClick={() => handleDeleteRow(row.id)}
                className="flex items-center justify-center focus:outline-none"
              >
                <Trash2 className="w-4 h-4 text-red-400 hover:text-red-500 transition-colors" />
              </button>
            </Tooltip>
          </div>
        )}
      </td>
    </tr>
    {validationErrors[`${row.id}_empty_row`] && (
      <tr>
        <td></td>
        <td colSpan={7} className="px-2 pb-2">
          <div className="text-red-500 text-[11px] font-semibold text-center bg-red-50 border border-red-200 rounded p-1.5 shadow-sm">
            Must have at least one logged hour
          </div>
        </td>
        <td colSpan={2}></td>
      </tr>
    )}
    </>
  );
};
