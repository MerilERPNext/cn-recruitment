import { ChangeEvent, useMemo, useState } from "react";
import { Form } from "@tsed/react-formio";
import { format, isValid, parse } from "date-fns";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import Badge from "../../../../shared/Badge";
import { Card } from "../../../../shared/atoms/Card";
import { AsyncSelect, SelectOption } from "../../../../shared/atoms/AsyncSelect";
import { performanceService } from "../../../../../services/performanceService";
import { Typography } from "../../../../shared/atoms/Typography";
import type { DepartmentSelectOption, DesignationSelectOption, KeyResult } from "../DefineGoal";
import { KeyResultsCard } from "./KeyResultsCard";

interface ObjectiveCardProps {
  title?: string;
  setTitle?: (title: string) => void;
  description?: string;
  setDescription?: (desc: string) => void;
  weightage: number;
  setWeightage: (weightage: number) => void;
  selectedDepartment: DepartmentSelectOption;
  setSelectedDepartment: (department: DepartmentSelectOption) => void;
  selectedDesignation?: DesignationSelectOption;
  setSelectedDesignation?: (designation: DesignationSelectOption) => void;
  startDate: string;
  setStartDate: (date: string) => void;
  endDate: string;
  setEndDate: (date: string) => void;
  labelClass: string;
  currentCompany?: string;
  keyResults: KeyResult[];
  onDeleteKeyResult: (id: string) => void;
  onAddKeyResult: () => void;
  onUpdateKeyResult: (
    id: string,
    field: "title" | "weight",
    value: string,
  ) => void;
  minimumKeyResults: number;
  maximumKeyResults: number | null;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  goalNumber?: number;
  onDeleteGoal?: () => void;
}

const buildGoalPeriodFormSchema = (minDateStr?: string, maxDateStr?: string) => ({
  display: "form",
  components: [
    {
      type: "columns",
      key: "periodDates",
      label: "",
      hideLabel: true,
      columns: [
        {
          width: 6,
          offset: 0,
          push: 0,
          pull: 0,
          components: [
            {
              type: "datetime",
              key: "start_date",
              label: "Start Date",
              placeholder: "Select start date",
              format: "dd-MM-yyyy",
              enableTime: false,
              validateOn: "blur",
              validate: { required: true },
              customClass: "mb-0",
              input: true,
              datePicker: {
                minDate: minDateStr || null,
                maxDate: maxDateStr || null,
              },
              widget: {
                type: "calendar",
                displayInTimezone: "viewer",
                locale: "en",
                useLocaleSettings: false,
                allowInput: true,
                mode: "single",
                enableTime: false,
                noCalendar: false,
                format: "yyyy-MM-dd",
                hourIncrement: 1,
                minuteIncrement: 5,
                time_24hr: false,
                minDate: minDateStr || null,
                disabledDates: "",
                maxDate: maxDateStr || null,
              },
            },
          ],
        },
        {
          width: 6,
          offset: 0,
          push: 0,
          pull: 0,
          components: [
            {
              type: "datetime",
              key: "end_date",
              label: "End Date",
              placeholder: "Select end date",
              format: "dd-MM-yyyy",
              enableTime: false,
              validateOn: "blur",
              validate: { required: true },
              customClass: "mb-0",
              input: true,
              datePicker: {
                minDate: minDateStr || null,
                maxDate: maxDateStr || null,
              },
              widget: {
                type: "calendar",
                displayInTimezone: "viewer",
                locale: "en",
                useLocaleSettings: false,
                allowInput: true,
                mode: "single",
                enableTime: false,
                noCalendar: false,
                format: "yyyy-MM-dd",
                hourIncrement: 1,
                minuteIncrement: 5,
                time_24hr: false,
                minDate: minDateStr || null,
                disabledDates: "",
                maxDate: maxDateStr || null,
              },
            },
          ],
        },
      ],
    },
  ],
});

const parseGoalDate = (value: string, pattern = "yyyy-MM-dd") => {
  if (!value) return null;
  const parsedDate = parse(value, pattern, new Date());
  return isValid(parsedDate) ? parsedDate : null;
};

const formatGoalDateForForm = (value: string) => {
  const parsedDate =
    parseGoalDate(value, "yyyy-MM-dd") ||
    parseGoalDate(value, "MM/dd/yyyy") ||
    parseGoalDate(value, "dd-MM-yyyy");
  return parsedDate ? format(parsedDate, "yyyy-MM-dd") : "";
};

const formatFormDateForGoal = (value?: string) => {
  if (!value) return "";
  const dateValue = String(value).split("T")[0];
  const parsedDate =
    parseGoalDate(dateValue, "yyyy-MM-dd") ||
    parseGoalDate(dateValue, "dd-MM-yyyy") ||
    parseGoalDate(dateValue, "MM/dd/yyyy");
  return parsedDate ? format(parsedDate, "yyyy-MM-dd") : "";
};

export const ObjectiveCard = ({
  title = "",
  setTitle,
  description = "",
  setDescription,
  weightage,
  setWeightage,
  selectedDepartment,
  setSelectedDepartment,
  selectedDesignation,
  setSelectedDesignation,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  labelClass,
  currentCompany,
  keyResults,
  onDeleteKeyResult,
  onAddKeyResult,
  onUpdateKeyResult,
  minimumKeyResults,
  maximumKeyResults,
  isCollapsed: controlledIsCollapsed,
  onToggleCollapse,
  goalNumber,
  onDeleteGoal,
}: ObjectiveCardProps) => {
  const [localIsCollapsed, setLocalIsCollapsed] = useState(false);

  const isCollapsed =
    controlledIsCollapsed !== undefined
      ? controlledIsCollapsed
      : localIsCollapsed;
  const handleToggle = () => {
    if (onToggleCollapse) {
      onToggleCollapse();
    } else {
      setLocalIsCollapsed((prev) => !prev);
    }
  };

  const fetchDepartmentOptions = async (search: string, skip: number) => {
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
  };

  const fetchDesignationOptions = async (search: string, skip: number) => {
    if (!selectedDepartment?.value) return [];
    try {
      return await performanceService.getDesignationOptions({
        search_text: search,
        skip,
        department: selectedDepartment.value,
      });
    } catch (e) {
      console.error(e);
      return [];
    }
  };
  const submissionData = useMemo(() => ({
    data: {
      start_date: formatGoalDateForForm(startDate),
      end_date: formatGoalDateForForm(endDate),
    }
  }), [startDate, endDate]);
  return (
    <Card
      className="relative border border-violet-200 bg-white p-5 shadow-sm"
      radius="xl"
      padding="none"
    >
      {onDeleteGoal && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDeleteGoal();
          }}
          className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-100 text-red-500 shadow-sm transition-colors hover:bg-red-500 hover:text-white"
          aria-label="Delete objective"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
      <div className="flex items-center justify-between">
        <div
          className="flex flex-wrap items-center gap-2 cursor-pointer select-none"
          onClick={handleToggle}
        >
          <Badge
            label={`Objective ${goalNumber !== undefined ? goalNumber : ""}`}
            variant="purple"
            size="sm"
          />
          <Typography
            variant="caption"
            className={
              isCollapsed && title.trim()
                ? "font-semibold text-gray-900 text-sm"
                : "text-gray-500"
            }
          >
            {isCollapsed && title.trim()
              ? `${title} (${weightage || 0}%)`
              : "What you want to achieve - qualitative"}
          </Typography>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleToggle}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            aria-label={
              isCollapsed ? "Expand objective card" : "Collapse objective card"
            }
          >
            {isCollapsed ? (
              <ChevronDown className="h-5 w-5" />
            ) : (
              <ChevronUp className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <div className="mt-4">
          <input
            className="mb-3 h-12 w-full rounded-lg border border-violet-200 bg-white px-4 text-base font-semibold text-gray-900 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 placeholder:text-gray-400"
            value={title}
            onChange={(e) => setTitle?.(e.target.value)}
            placeholder="Enter your objective title"
            aria-label="Goal objective title"
          />

          <textarea
            className="mb-5 min-h-[76px] w-full resize-none rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm leading-5 text-gray-600 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 placeholder:text-gray-400"
            value={description}
            onChange={(e) => setDescription?.(e.target.value)}
            placeholder="Describe your objective in detail"
            aria-label="Goal objective description"
          />

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
            <div>
              <label className={labelClass}>Weightage (%)</label>
              <div className="w-full">
                <input
                  type="text"
                  aria-label="Goal weightage"
                  className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium text-gray-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 placeholder:text-gray-400"
                  value={weightage === 0 ? "" : weightage}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => {
                    const rawVal = e.target.value;
                    if (rawVal === "") {
                      setWeightage(0);
                      return;
                    }
                    if (/^\d*\.?\d*$/.test(rawVal)) {
                      const num = parseFloat(rawVal);
                      if (!isNaN(num)) {
                        const cappedVal = Math.min(num, 100);
                        setWeightage(cappedVal);
                      }
                    }
                  }}
                  placeholder="Weight %"
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>Department</label>
              <AsyncSelect
                fetchOptions={fetchDepartmentOptions}
                value={selectedDepartment}
                onChange={(opt: SelectOption ) => setSelectedDepartment(opt)}
                className="relative w-full"
                placeholder="Search department..."
              />
            </div>

            <div>
              <label className={labelClass}>Designation</label>
              <AsyncSelect
                fetchOptions={fetchDesignationOptions}
                value={selectedDesignation || { label: 'Select', value: '' }}
                onChange={(opt: SelectOption) => setSelectedDesignation?.(opt)}
                className="relative w-full"
                placeholder="Search designation..."
                disabled={!selectedDepartment?.value}
              />
            </div>

            <div className="lg:col-span-2 [&_.formio-component]:!mb-0 [&_.formio-component-datetime_input]:!mb-0 [&_label]:!mt-0 [&_label]:!pt-0 [&_label]:!pb-0 [&_label]:!mb-1.5 [&_label]:!text-xs [&_label]:!font-medium [&_label]:!text-gray-600 [&_label]:!h-auto [&_label]:!block [&_.form-group]:!mt-0 [&_.form-group]:!mb-0 [&_.formio-form]:!mt-0 [&_.form-control]:h-[40px] [&_.form-control]:w-full [&_.form-control]:rounded-lg [&_.form-control]:border [&_.form-control]:border-gray-200 [&_.form-control]:bg-white [&_.form-control]:px-4 [&_.form-control]:text-sm [&_.form-control]:text-gray-900 [&_.form-control]:shadow-sm [&_.form-control]:outline-none [&_.row]:-mx-2 [&_.row>div]:px-2">
              <Form
                form={buildGoalPeriodFormSchema(formatGoalDateForForm(startDate), formatGoalDateForForm(endDate))}
                submission={submissionData}
                onChange={(form: { data: Record<string, string> }) => {
                  const start = formatFormDateForGoal(form.data.start_date);
                  const end = formatFormDateForGoal(form.data.end_date);
                  const minStr = formatGoalDateForForm(startDate);
                  const maxStr = formatGoalDateForForm(endDate);

                  if (start) {
                    if (minStr && start < minStr) {
                      setStartDate(minStr);
                    } else if (maxStr && start > maxStr) {
                      setStartDate(maxStr);
                    } else {
                      setStartDate(start);
                    }
                  }
                  if (end) {
                    if (minStr && end < minStr) {
                      setEndDate(minStr);
                    } else if (maxStr && end > maxStr) {
                      setEndDate(maxStr);
                    } else {
                      setEndDate(end);
                    }
                  }
                }}
                options={{
                  noAlerts: true,
                  submitButton: false,
                  validateOn: "change",
                }}
              />
            </div>
          </div>

          <KeyResultsCard
            keyResults={keyResults}
            onDeleteKeyResult={onDeleteKeyResult}
            onAddKeyResult={onAddKeyResult}
            onUpdateKeyResult={onUpdateKeyResult}
            minimumKeyResults={minimumKeyResults}
            maximumKeyResults={maximumKeyResults}
          />
        </div>
      )}
    </Card>
  );
};
