import { useState, useMemo, useEffect, forwardRef } from "react";
import { Search, Check, Minus, ChevronDown, ChevronUp, Loader2, Calendar } from "lucide-react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import Button from "../shared/atoms/Button";
import { EmployeeDirectoryFilterData } from "./EmployeeSearch";
import {
  useCompanyOptions,
  useDepartmentOptions,
  useEmploymentTypeOptions,
  useBranchOptions,
  useBusinessUnitOptions,
} from "../../hooks/useEmployeeDirectoryFilters";

// ─── Internal Sub-Components ─────────────────────────────────────────────────

interface MultiSelectSectionProps {
  label: string;
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (selected: string[]) => void;
  isLoading?: boolean;
  disabled?: boolean;
  disabledMessage?: string;
}

/**
 * A self-contained, accessible multi-select checklist with:
 *  - inline search filter
 *  - Select All / Deselect All toggle
 *  - collapsible body
 */
const MultiSelectSection: React.FC<MultiSelectSectionProps> = ({
  label,
  options,
  selected,
  onChange,
  isLoading = false,
  disabled = false,
  disabledMessage,
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const normalizedOptions = useMemo(
    () =>
      options.flatMap((option) => {
        const value = String(option?.value ?? "").trim();
        const optionLabel = String(option?.label ?? value).trim();

        return value && optionLabel
          ? [{ value, label: optionLabel }]
          : [];
      }),
    [options],
  );

  const filteredOptions = useMemo(
    () =>
      normalizedOptions.filter((o) =>
        o.label.toLowerCase().includes(searchTerm.toLowerCase()),
      ),
    [normalizedOptions, searchTerm],
  );

  const allSelected =
    filteredOptions.length > 0 &&
    filteredOptions.every((o) => selected.includes(o.value));

  const someSelected = filteredOptions.some((o) => selected.includes(o.value));

  const handleToggleAll = () => {
    if (allSelected) {
      // Deselect all filtered options, keep others
      const filteredValues = new Set(filteredOptions.map((o) => o.value));
      onChange(selected.filter((v) => !filteredValues.has(v)));
    } else {
      // Select all filtered options (merge with existing)
      const existing = new Set(selected);
      filteredOptions.forEach((o) => existing.add(o.value));
      onChange(Array.from(existing));
    }
  };

  const handleToggleItem = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const selectedCount = normalizedOptions.filter((o) =>
    selected.includes(o.value),
  ).length;

  return (
    <div className="border border-slate-200 dark:border-[#1E3A4C] rounded-xl overflow-hidden bg-white dark:bg-[#0B1724]">
      {/* Header */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-[#102030] hover:bg-slate-100 dark:hover:bg-[#162A3E] transition-colors border-b border-slate-200 dark:border-[#1E3A4C]"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{label}</span>
          {selectedCount > 0 && (
            <span className="inline-flex items-center justify-center h-5 min-w-[1.25rem] px-1.5 rounded-full bg-primary text-white text-[10px] font-bold">
              {selectedCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {/* Select All toggle — visible in header only when open */}
          {isOpen && !disabled && normalizedOptions.length > 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleToggleAll();
              }}
              className="text-xs font-medium text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 hover:underline underline-offset-2 transition-colors whitespace-nowrap"
            >
              {allSelected ? "Deselect All" : "Select All"}
            </button>
          )}
          {isOpen ? (
            <ChevronUp size={16} className="text-slate-400 dark:text-slate-500 shrink-0" />
          ) : (
            <ChevronDown size={16} className="text-slate-400 dark:text-slate-500 shrink-0" />
          )}
        </div>
      </button>

      {/* Body */}
      {isOpen && (
        <div className="px-3 py-2">
          {disabled ? (
            <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-3">
              {disabledMessage ?? "Select a company first"}
            </p>
          ) : isLoading ? (
            <div className="flex items-center justify-center py-4 gap-2 text-slate-400 dark:text-slate-500">
              <Loader2 size={16} className="animate-spin" />
              <span className="text-xs">Loading options…</span>
            </div>
          ) : normalizedOptions.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-3">
              No options available
            </p>
          ) : (
            <>
              {/* Inline search */}
              <div className="relative mb-2">
                <Search
                  size={13}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none"
                />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={`Search ${label.toLowerCase()}…`}
                  className="w-full pl-7 pr-3 py-1.5 text-xs border border-slate-200 dark:border-[#1E3A4C] rounded-lg focus:outline-none focus:ring-1 focus:ring-cyan-500/40 focus:border-cyan-500 bg-slate-50 dark:bg-[#102030] text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
              </div>

              {/* Select / Deselect All within search results */}
              {filteredOptions.length > 1 && (
                <div className="flex items-center gap-1.5 mb-1.5 px-1">
                  <button
                    type="button"
                    onClick={handleToggleAll}
                    className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-colors border ${
                      allSelected
                        ? "border-cyan-500/30 bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300"
                        : someSelected
                          ? "border-slate-200 dark:border-[#1E3A4C] bg-slate-50 dark:bg-[#102030] text-slate-700 dark:text-slate-300"
                          : "border-slate-200 dark:border-[#1E3A4C] bg-slate-50 dark:bg-[#102030] text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    <span
                      className={`flex h-3.5 w-3.5 items-center justify-center rounded border ${
                        allSelected
                          ? "bg-primary border-primary"
                          : someSelected
                            ? "bg-primary/30 border-primary/50"
                            : "border-slate-300 dark:border-slate-600 bg-white dark:bg-[#102030]"
                      }`}
                    >
                      {allSelected ? (
                        <Check size={8} className="text-white" strokeWidth={3} />
                      ) : someSelected ? (
                        <Minus size={8} className="text-primary" strokeWidth={3} />
                      ) : null}
                    </span>
                    {allSelected ? "Deselect all" : "Select all"}
                    {filteredOptions.length < normalizedOptions.length && (
                      <span className="text-gray-400">
                        ({filteredOptions.length} results)
                      </span>
                    )}
                  </button>
                </div>
              )}

              {/* Option list */}
              <ul className="max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-[#1E3A4C]/60 rounded-lg border border-slate-100 dark:border-[#1E3A4C]">
                {filteredOptions.length === 0 ? (
                  <li className="px-3 py-2 text-xs text-slate-400 dark:text-slate-500 text-center">
                    No results for "{searchTerm}"
                  </li>
                ) : (
                  filteredOptions.map((option) => {
                    const isChecked = selected.includes(option.value);
                    return (
                      <li key={option.value}>
                        <button
                          type="button"
                          onClick={() => handleToggleItem(option.value)}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 text-left text-xs transition-colors ${
                            isChecked
                              ? "bg-cyan-50/80 dark:bg-cyan-950/40 text-cyan-900 dark:text-cyan-200 border-l-2 border-cyan-500"
                              : "bg-white dark:bg-[#0B1724] hover:bg-slate-50 dark:hover:bg-[#102030] text-slate-700 dark:text-slate-300"
                          }`}
                        >
                          <span
                            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                              isChecked
                                ? "bg-primary border-primary"
                                : "border-slate-300 dark:border-slate-600 bg-white dark:bg-[#102030]"
                            }`}
                          >
                            {isChecked && (
                              <Check
                                size={9}
                                className="text-white"
                                strokeWidth={3}
                              />
                            )}
                          </span>
                          <span
                            className={`leading-snug ${isChecked ? "text-cyan-900 dark:text-cyan-200 font-semibold" : "text-slate-700 dark:text-slate-300"}`}
                          >
                            {option.label}
                          </span>
                        </button>
                      </li>
                    );
                  })
                )}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Single-Select (native) ───────────────────────────────────────────────────

interface SingleSelectSectionProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { label: string; value: string }[];
  placeholder?: string;
}

const SingleSelectSection: React.FC<SingleSelectSectionProps> = ({
  label,
  value,
  onChange,
  options,
  placeholder,
}) => (
  <div className="border border-slate-200 dark:border-[#1E3A4C] rounded-xl overflow-hidden bg-white dark:bg-[#0B1724]">
    <div className="px-4 py-3 bg-slate-50 dark:bg-[#102030] border-b border-slate-200 dark:border-[#1E3A4C]">
      <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{label}</span>
    </div>
    <div className="px-3 py-2">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-[#1E3A4C] rounded-lg bg-white dark:bg-[#102030] focus:outline-none focus:ring-1 focus:ring-cyan-500/40 focus:border-cyan-500 text-slate-800 dark:text-slate-100"
      >
        {placeholder && (
          <option value="">{placeholder}</option>
        )}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  </div>
);

// ─── Date Range Section ───────────────────────────────────────────────────────

interface DateRangeSectionProps {
  label: string;
  fromValue: string;
  toValue: string;
  onFromChange: (v: string) => void;
  onToChange: (v: string) => void;
}

const CustomDateInput = forwardRef<HTMLInputElement, any>(
  ({ value, onClick, placeholder }, ref) => (
    <div className="flex w-full">
      <input
        type="text"
        value={value}
        onClick={onClick}
        readOnly
        placeholder={placeholder}
        className="flex-1 w-full pl-3 pr-2 py-2 text-sm border border-slate-300 dark:border-[#1E3A4C] border-r-0 rounded-l focus:outline-none bg-white dark:bg-[#102030] text-slate-800 dark:text-slate-100 cursor-pointer placeholder:text-slate-400 dark:placeholder:text-slate-500"
        ref={ref}
      />
      <button
        type="button"
        onClick={onClick}
        className="px-3 py-2 border border-slate-300 dark:border-[#1E3A4C] rounded-r bg-slate-100 dark:bg-[#162A3E] text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#1C354E] flex items-center justify-center transition-colors"
      >
        <Calendar size={16} />
      </button>
    </div>
  )
);
CustomDateInput.displayName = "CustomDateInput";

const DateRangeSection: React.FC<DateRangeSectionProps> = ({
  label,
  fromValue,
  toValue,
  onFromChange,
  onToChange,
}) => {
  const fromDate = fromValue ? new Date(fromValue) : null;
  const toDate = toValue ? new Date(toValue) : null;

  const handleFromChange = (date: Date | null) => {
    if (!date) {
      onFromChange("");
    } else {
      const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
      onFromChange(localDate.toISOString().split("T")[0]);
    }
  };

  const handleToChange = (date: Date | null) => {
    if (!date) {
      onToChange("");
    } else {
      const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
      onToChange(localDate.toISOString().split("T")[0]);
    }
  };

  return (
    <div className="border border-slate-200 dark:border-[#1E3A4C] rounded-xl bg-white dark:bg-[#0B1724] flex flex-col">
      <div className="px-4 py-3 bg-slate-50 dark:bg-[#102030] rounded-t-xl border-b border-slate-200 dark:border-[#1E3A4C]">
        <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{label}</span>
      </div>
      <div className="px-3 py-3 grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm text-slate-700 dark:text-slate-300 mb-1">From</label>
          <DatePicker
            selected={fromDate}
            onChange={handleFromChange}
            dateFormat="dd-MM-yyyy"
            placeholderText="dd-mm-yyyy"
            customInput={<CustomDateInput />}
            popperProps={{ strategy: "fixed" }}
            popperPlacement="bottom-start"
            portalId="root"
            wrapperClassName="w-full"
            calendarClassName="popup-datepicker-reset"
          />
        </div>
        <div>
          <label className="block text-sm text-slate-700 dark:text-slate-300 mb-1">To</label>
          <DatePicker
            selected={toDate}
            onChange={handleToChange}
            dateFormat="dd-MM-yyyy"
            placeholderText="dd-mm-yyyy"
            customInput={<CustomDateInput />}
            popperProps={{ strategy: "fixed" }}
            popperPlacement="bottom-end"
            portalId="root"
            wrapperClassName="w-full"
            calendarClassName="popup-datepicker-reset"
          />
        </div>
      </div>
    </div>
  );
};

// ─── Helper: normalize stored date to YYYY-MM-DD for <input type="date"> ─────

function toInputDate(raw: string | undefined): string {
  if (!raw) return "";
  // ISO datetime string → date-only part
  return raw.split("T")[0];
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface EmployeeDirectoryFiltersProps {
  onUpdate: (data: EmployeeDirectoryFilterData) => void;
  data: EmployeeDirectoryFilterData;
  onCancel: () => void;
  onReset: () => void;
}

const EMPTY_ARRAY: string[] = [];

const EmployeeDirectoryFilters: React.FC<EmployeeDirectoryFiltersProps> = ({
  onUpdate,
  data,
  onCancel,
  onReset,
}) => {
  // ── Local form state (mirrors EmployeeDirectoryFilterData) ──────────────────
  const [status, setStatus] = useState<string>(
    (data.status as string) ?? "Active",
  );
  const [company, setCompany] = useState<string[]>(
    Array.isArray(data.company) ? (data.company as string[]) : data.company ? [data.company as string] : EMPTY_ARRAY,
  );
  const [department, setDepartment] = useState<string[]>(
    Array.isArray(data.department) ? (data.department as string[]) : data.department ? [data.department as string] : EMPTY_ARRAY,
  );
  const [employmentType, setEmploymentType] = useState<string[]>(
    Array.isArray(data.employment_type) ? (data.employment_type as string[]) : data.employment_type ? [data.employment_type as string] : EMPTY_ARRAY,
  );
  const [branch, setBranch] = useState<string[]>(
    Array.isArray(data.branch) ? (data.branch as string[]) : data.branch ? [data.branch as string] : EMPTY_ARRAY,
  );
  const [businessUnit, setBusinessUnit] = useState<string[]>(
    Array.isArray(data.custom_business_unit)
      ? (data.custom_business_unit as string[])
      : data.custom_business_unit
        ? [data.custom_business_unit as string]
        : EMPTY_ARRAY,
  );
  const [selfService, setSelfService] = useState<string>(
    data.employee_self_service !== undefined
      ? String(data.employee_self_service)
      : "",
  );
  const [dojFrom, setDojFrom] = useState<string>(
    toInputDate(data.doj_from as string | undefined),
  );
  const [dojTo, setDojTo] = useState<string>(
    toInputDate(data.doj_to as string | undefined),
  );

  // ── Sync with external data prop changes ─────────────────────────────────────
  
  useEffect(() => {
    setStatus((data.status as string) ?? "Active");
    setCompany(
      Array.isArray(data.company) ? (data.company as string[]) : data.company ? [data.company as string] : EMPTY_ARRAY,
    );
    setDepartment(
      Array.isArray(data.department) ? (data.department as string[]) : data.department ? [data.department as string] : EMPTY_ARRAY,
    );
    setEmploymentType(
      Array.isArray(data.employment_type) ? (data.employment_type as string[]) : data.employment_type ? [data.employment_type as string] : EMPTY_ARRAY,
    );
    setBranch(
      Array.isArray(data.branch) ? (data.branch as string[]) : data.branch ? [data.branch as string] : EMPTY_ARRAY,
    );
    setBusinessUnit(
      Array.isArray(data.custom_business_unit)
        ? (data.custom_business_unit as string[])
        : data.custom_business_unit
          ? [data.custom_business_unit as string]
          : EMPTY_ARRAY,
    );
    setSelfService(
      data.employee_self_service !== undefined
        ? String(data.employee_self_service)
        : "",
    );
    setDojFrom(toInputDate(data.doj_from as string | undefined));
    setDojTo(toInputDate(data.doj_to as string | undefined));
  }, [data]);

  // ── Data fetching ────────────────────────────────────────────────────────────
  const { data: companyOptions = [], isLoading: isCompanyLoading } =
    useCompanyOptions();
  const { data: departmentOptions = [], isLoading: isDeptLoading } =
    useDepartmentOptions(company);
  const { data: employmentTypeOptions = [], isLoading: isEmpTypeLoading } =
    useEmploymentTypeOptions();
  const { data: branchOptions = [], isLoading: isBranchLoading } =
    useBranchOptions(company);
  const { data: businessUnitOptions = [], isLoading: isBuLoading } =
    useBusinessUnitOptions(company);

  // ── Option shapes for MultiSelectSection ────────────────────────────────────
  const companySelectOptions = companyOptions.map((c) => ({
    value: c.name,
    label: c.company_name,
  }));
  const departmentSelectOptions = departmentOptions.map((d) => ({
    value: d.name,
    label: d.department_name,
  }));
  const empTypeSelectOptions = employmentTypeOptions.map((e) => ({
    value: e.name,
    label: e.employee_type_name,
  }));
  const branchSelectOptions = branchOptions.map((b) => ({
    value: b.name,
    label: b.branch,
  }));
  const businessUnitSelectOptions = businessUnitOptions.map((bu) => ({
    value: bu.name,
    label: bu.business_unit,
  }));

  // ── When company changes, clear dependent filters ────────────────────────────
  const handleCompanyChange = (selected: string[]) => {
    setCompany(selected);
    setDepartment(EMPTY_ARRAY);
    setBranch(EMPTY_ARRAY);
    setBusinessUnit(EMPTY_ARRAY);
  };

  // ── Apply ───────────────────────────────────────────────────────────────────
  const handleApply = () => {
    const result: EmployeeDirectoryFilterData = {};
    if (status) result.status = status;
    if (company.length > 0) result.company = company;
    if (department.length > 0) result.department = department;
    if (employmentType.length > 0) result.employment_type = employmentType;
    if (branch.length > 0) result.branch = branch;
    if (businessUnit.length > 0) result.custom_business_unit = businessUnit;
    if (selfService !== "") result.employee_self_service = Number(selfService);
    if (dojFrom) result.doj_from = dojFrom;
    if (dojTo) result.doj_to = dojTo;
    onUpdate(result);
  };

  // ── Reset ───────────────────────────────────────────────────────────────────
  const handleReset = () => {
    setStatus("Active");
    setCompany(EMPTY_ARRAY);
    setDepartment(EMPTY_ARRAY);
    setEmploymentType(EMPTY_ARRAY);
    setBranch(EMPTY_ARRAY);
    setBusinessUnit(EMPTY_ARRAY);
    setSelfService("");
    setDojFrom("");
    setDojTo("");
    onReset();
  };

  const companyDependentDisabled = company.length === 0;

  return (
    <div className="flex flex-col h-full w-full bg-slate-50/50 dark:bg-[#060E17]">
      {/* ── Scrollable form body ─────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-6">

        {/* Employee Status */}
        <SingleSelectSection
          label="Employee Status"
          value={status}
          onChange={setStatus}
          options={[
            { label: "Active Employees", value: "Active" },
            { label: "Inactive Employees", value: "Inactive" },
            { label: "Pending Employees", value: "Pending" },
          ]}
        />

        {/* Company */}
        <MultiSelectSection
          label="Select Company"
          options={companySelectOptions}
          selected={company}
          onChange={handleCompanyChange}
          isLoading={isCompanyLoading}
        />

        {/* Departments — depends on company */}
        <MultiSelectSection
          label="Select Departments"
          options={departmentSelectOptions}
          selected={department}
          onChange={setDepartment}
          isLoading={isDeptLoading}
          disabled={companyDependentDisabled}
          disabledMessage="Select a company to load departments"
        />

        {/* Employment Type */}
        <MultiSelectSection
          label="Select Employee Type"
          options={empTypeSelectOptions}
          selected={employmentType}
          onChange={setEmploymentType}
          isLoading={isEmpTypeLoading}
        />

        {/* Branch — depends on company */}
        <MultiSelectSection
          label="Select Current Office Location"
          options={branchSelectOptions}
          selected={branch}
          onChange={setBranch}
          isLoading={isBranchLoading}
          disabled={companyDependentDisabled}
          disabledMessage="Select a company to load office locations"
        />

        {/* Business Unit — depends on company */}
        <MultiSelectSection
          label="Select Business Unit"
          options={businessUnitSelectOptions}
          selected={businessUnit}
          onChange={setBusinessUnit}
          isLoading={isBuLoading}
          disabled={companyDependentDisabled}
          disabledMessage="Select a company to load business units"
        />

        {/* Self Service */}
        <SingleSelectSection
          label="Self Service"
          value={selfService}
          onChange={setSelfService}
          placeholder="All"
          options={[
            { label: "Yes", value: "1" },
            { label: "No", value: "0" },
          ]}
        />

        {/* DOJ Date Range */}
        <DateRangeSection
          label="DOJ Date"
          fromValue={dojFrom}
          toValue={dojTo}
          onFromChange={setDojFrom}
          onToChange={setDojTo}
        />
      </div>

      {/* ── Footer action bar ────────────────────────────────────────────────── */}
      <div className="flex justify-between items-center w-full bg-white dark:bg-[#0B1724] border-t border-slate-200 dark:border-[#1E3A4C] px-4 py-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] dark:shadow-none shrink-0">
        <Button onClick={handleReset} size="md" variant="outline">
          Reset
        </Button>
        <div className="flex gap-2">
          <Button onClick={onCancel} size="md" variant="outline">
            Cancel
          </Button>
          <Button onClick={handleApply} size="md" variant="contain">
            Apply
          </Button>
        </div>
      </div>
    </div>
  );
};

export default EmployeeDirectoryFilters;
