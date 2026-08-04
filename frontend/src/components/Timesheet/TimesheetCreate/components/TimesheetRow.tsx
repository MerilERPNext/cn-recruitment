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
        const data = sub.data;

        if (!data.project || !data.task) return;

        if (
          data.project === row.project &&
          data.task === row.task &&
          (data.is_billable ?? true) === row.isBillable
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
  disabledDays = []
}) => {
  const { isDesktop } = useScreenSize();

  if (!isDesktop) {
    return (
      <tr className="block border-none px-2 py-3 sm:p-4">
        <td className="block border-none w-full">
          <div className="bg-white border border-t-[3px] border-t-primary rounded-xl p-3 shadow-sm space-y-4">
            <div className="flex justify-between items-start">
              {isGridEditable ? (
                <div className={`flex-1 w-full add-time-entry-form-inline p-2 rounded-lg border ${validationErrors[`${row.id}_project_task`] ? 'border-red-500 bg-red-50/50' : 'bg-gray-50/50 border-gray-150'}`}>
                  <InlineFormRow
                    row={row}
                    handleConfigureRow={handleConfigureRow}
                    formSchema={formSchema}
                  />
                  {validationErrors[`${row.id}_project_task`] && (
                    <div className="text-red-500 text-[10px] mt-1 font-semibold text-center">
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

            <div className={`mt-2 p-1 rounded-lg ${validationErrors[`${row.id}_empty_row`] ? 'bg-red-50/50 border border-red-500' : ''}`}>
              <div className="grid grid-cols-7 gap-1">
                {daysOfWeek.map(day => {
                const dateKey = format(day, "yyyy-MM-dd");
                const cell = row.days[dateKey] || { hours: 0, description: "" };
                const hasComment = !!cell.description;
                const hoursError = validationErrors[`${row.id}_${dateKey}_hours`];
                const commentError = validationErrors[`${row.id}_${dateKey}_comment`];
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
                      className={`w-full text-center border rounded-md py-1 px-0.5 font-medium text-xs focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary disabled:bg-gray-100 disabled:text-gray-800 ${hoursError ? "border-red-500 ring-1 ring-red-500" : "border-gray-200"}`}
                    />
                    <button
                      onClick={() => handleOpenComment(row.id, dateKey, projName, format(day, "EEE, dd MMM"))}
                      disabled={disabledDays.includes(dateKey)}
                      className={`mt-1 text-[9px] font-bold transition-all w-full py-0.5 rounded border disabled:opacity-50 disabled:cursor-not-allowed ${commentError ? 'border-red-500 text-red-500 bg-red-50' : (hasComment ? "text-primary hover:text-primary-600 border-transparent bg-primary/10" : "text-gray-400 hover:text-gray-600 border-transparent")}`}
                    >
                      {hasComment ? "★" : "+"}
                    </button>
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
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Hours</span>
              <span className="font-bold text-primary">{formatCellOnBlur(getRowTotal(row)) || "0:00"}</span>
            </div>

            {isGridEditable && (
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
        {isGridEditable ? (
          <div className="flex items-start gap-2">
            <div className={`add-time-entry-form-inline flex-1 min-w-[340px] max-w-[360px] p-2 rounded-lg border ${validationErrors[`${row.id}_project_task`] ? 'border-red-500 bg-red-50/50' : 'bg-gray-50/50 border-gray-150'}`}>
              <InlineFormRow
                row={row}
                handleConfigureRow={handleConfigureRow}
                formSchema={formSchema}
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
            className="px-2 py-3 text-center border-l border-gray-50 align-middle"
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
                      disabled={disabledDays.includes(dateKey)}
                      className={`text-[10px] font-bold transition-all px-2 py-0.5 rounded border disabled:opacity-50 disabled:cursor-not-allowed ${commentError ? 'border-red-500 text-red-500 bg-red-50' :
                        (hasComment ? "text-primary hover:text-primary-600 border-transparent" : "text-gray-400 hover:text-gray-600 border-transparent")
                        }`}
                    >
                      {hasComment ? "★ Comment" : "Comment"}
                    </button>
                  </div>
                </>
              );
            })()}
          </td>
        );
      })}

      {/* Row Total */}
      <td className="px-4 py-3 text-center border-l border-gray-50 font-bold text-gray-900 align-middle">
        {formatCellOnBlur(getRowTotal(row)) || "0:00"}
      </td>
      {/* Delete Action */}
      <td className="px-4 py-3 text-center border-l border-gray-50 align-middle">
        {isGridEditable && (
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
