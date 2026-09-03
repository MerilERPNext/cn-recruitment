import React, { useMemo, memo } from "react";
import { Trash2 } from "lucide-react";
import { format } from "date-fns";
import { Form } from "@tsed/react-formio";
import Tooltip from "../../../shared/Tooltip";
import { useScreenSize } from "../../../../hooks/useScreenSize";
import { TimesheetRow as TimesheetRowType } from "../TimesheetCreate";

interface InlineFormRowProps {
  row: TimesheetRowType;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handleConfigureRow: (rowId: string, submission: any) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  formSchema: any;
}

const InlineFormRow = memo(({ row, handleConfigureRow, formSchema }: InlineFormRowProps) => {
  const submission = useMemo(
    () => ({
      data: {
        project: row.project,
        task: row.task,
        is_billable: row.isBillable,
      },
    }),
    [row.project, row.task, row.isBillable]
  );
  return (
    <Form
      form={formSchema}
      submission={submission}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onChange={(sub: any) => {
        const data = sub.data || {};
        const projectVal = data.project || "";
        const taskVal = data.task || "";
        const isBillableVal = data.is_billable !== undefined ? !!data.is_billable : true;

        if (
          projectVal === (row.project || "") &&
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
    prevProps.row.task === nextProps.row.task &&
    prevProps.row.isBillable === nextProps.row.isBillable
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
  dayStatusMap = {}
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
      <tr className="block border-none px-2 py-3 sm:p-4">
        <td className="block border-none w-full">
          <div className="bg-card text-text-body1 border border-border border-t-[3px] border-t-primary rounded-xl p-3 shadow-sm space-y-4">
            <div className="flex justify-between items-start">
              {isGridEditable && !hasLockedRecord ? (
                <div className={`flex-1 w-full add-time-entry-form-inline p-2 rounded-lg border ${validationErrors[`${row.id}_project_task`] ? 'border-error bg-error/10' : 'bg-gray-50/50 border-border'}`}>
                  <InlineFormRow
                    row={row}
                    handleConfigureRow={handleConfigureRow}
                    formSchema={formSchema}
                  />
                  {validationErrors[`${row.id}_project_task`] && (
                    <div className="text-error text-[10px] mt-1 font-semibold text-center">
                      Project and Task are required
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex-1 flex flex-col gap-1">
                  <span className="font-bold text-gray-900 text-sm">{projName}</span>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-gray-500 text-xs font-medium">{taskName}</span>
                    <span className="text-gray-300 text-xs">|</span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${row.isBillable ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-600"}`}>
                      {row.isBillable ? "Billable" : "Non-Billable"}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className={`mt-2 p-1 rounded-lg ${validationErrors[`${row.id}_empty_row`] ? 'bg-error/10 border border-error' : ''}`}>
              <div className="grid grid-cols-7 gap-1">
                {daysOfWeek.map(day => {
                const dateKey = format(day, "yyyy-MM-dd");
                const cell = row.days[dateKey] || { hours: 0, description: "" };
                const hasComment = !!cell.description;
                const hoursError = validationErrors[`${row.id}_${dateKey}_hours`];
                const commentError = validationErrors[`${row.id}_${dateKey}_comment`];
                const status = dayStatusMap[dateKey];
                return (
                  <div key={dateKey} className="flex flex-col items-center">
                    <div className="text-[10px] font-bold text-gray-700 leading-tight">{format(day, "d")}</div>
                    <div className="text-[9px] font-medium text-gray-400 mb-1 leading-tight">{format(day, "EEE")}</div>
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
                      disabled={isReadOnly || !isGridEditable || disabledDays.includes(dateKey)}
                      className={`w-full text-center border rounded-md py-1 px-0.5 font-medium text-xs bg-card text-text-title focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary disabled:bg-gray-100 disabled:text-text-body2 ${hoursError ? "border-error ring-1 ring-error" : "border-border"}`}
                    />
                    <button
                      onClick={() => handleOpenComment(row.id, dateKey, projName, format(day, "EEE, dd MMM"))}
                      disabled={(isReadOnly || !isGridEditable || disabledDays.includes(dateKey)) && !hasComment}
                      className={`mt-1 text-[9px] font-bold transition-all w-full py-0.5 rounded border disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-0.5 ${commentError ? 'border-error text-error bg-error/10' : (hasComment ? "text-primary hover:text-text-link border-transparent bg-primary/10" : "text-gray-400 hover:text-gray-600 border-transparent")}`}
                    >
                      <span>{hasComment ? "★" : "+"}</span>
                      {cell.hours > 0 && <span className="text-red-500">*</span>}
                    </button>
                    {status && (
                      <span
                        className={`text-[8px] font-semibold px-0.5 py-0.5 rounded mt-1 border leading-none text-center w-full truncate ${
                          status === "Week Off"
                            ? "bg-error/10 text-error border-error/30"
                            : status === "Approved"
                            ? "bg-success/10 text-success border-success/30"
                            : status === "Submitted"
                            ? "bg-warning/10 text-warning border-warning/30"
                            : status === "Rejected"
                            ? "bg-error/10 text-error border-error/30"
                            : "bg-gray-50 text-gray-600 border-gray-200"
                        }`}
                      >
                        {status}
                      </span>
                    )}
                  </div>
                );
              })}
              </div>
              {validationErrors[`${row.id}_empty_row`] && (
                <div className="text-error text-[10px] mt-2 font-semibold text-center">
                  Must have at least one logged hour
                </div>
              )}
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-border">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Hours</span>
              <span className="font-bold text-primary">{formatCellOnBlur(getRowTotal(row)) || "0:00"}</span>
            </div>

            {isGridEditable && !hasLockedRecord && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => handleDeleteRow(row.id)}
                  className="w-full h-9 flex items-center justify-center gap-2 rounded-xl bg-gray-50 hover:bg-error/10 text-error transition-colors focus:outline-none border border-border hover:border-error/30"
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
    <tr className={`hover:bg-gray-50/50 ${validationErrors[`${row.id}_empty_row`] ? 'bg-error/10' : ''}`}>
      {/* Row Projects info */}
      <td className="px-6 py-4 align-middle">
        {isGridEditable && !hasLockedRecord ? (
          <div className="flex items-start gap-2">
            <div className={`add-time-entry-form-inline flex-1 min-w-[340px] max-w-[360px] p-2 rounded-lg border ${validationErrors[`${row.id}_project_task`] ? 'border-error bg-error/10' : 'bg-gray-50/50 border-border'}`}>
              <InlineFormRow
                row={row}
                handleConfigureRow={handleConfigureRow}
                formSchema={formSchema}
              />
              {validationErrors[`${row.id}_project_task`] && (
                <div className="text-error text-[10px] mt-1 font-semibold text-center">
                  Project and Task are required
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-gray-900 text-sm">
                {projName}
              </span>
              <span className="text-gray-300 text-xs">|</span>
              <span className="text-gray-500 text-xs font-medium">
                {taskName}
              </span>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${row.isBillable ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-600"
                }`}>
                {row.isBillable ? "Billable" : "Non-Billable"}
              </span>
            </div>
          </div>
        )}
      </td>

      {/* Day input cells */}
      {daysOfWeek.map(day => {
        const dateKey = format(day, "yyyy-MM-dd");
        const cell = row.days[dateKey] || { hours: 0, description: "" };
        const hasComment = !!cell.description;

        return (
          <td
            key={dateKey}
            className="px-2 py-3 text-center border-l border-border align-middle"
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
                        className={`w-16 text-center border rounded-lg py-1 px-1.5 font-medium text-sm bg-card text-text-title focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary disabled:bg-gray-100 disabled:text-text-body2 ${hoursError ? "border-error ring-1 ring-error" : "border-border"
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
                      className={`text-[10px] font-bold transition-all px-2 py-0.5 rounded border disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-0.5 ${commentError ? 'border-error text-error bg-error/10' :
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
      <td className="px-4 py-3 text-center border-l border-border font-bold text-gray-900 align-middle">
        {formatCellOnBlur(getRowTotal(row)) || "0:00"}
      </td>
      {/* Delete Action */}
      <td className="px-4 py-3 text-center border-l border-border align-middle">
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
          <div className="text-error text-[11px] font-semibold text-center bg-error/10 border border-error/40 rounded p-1.5 shadow-sm">
            Must have at least one logged hour
          </div>
        </td>
        <td colSpan={2}></td>
      </tr>
    )}
    </>
  );
};
