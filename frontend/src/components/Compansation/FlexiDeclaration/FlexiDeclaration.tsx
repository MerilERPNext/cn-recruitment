/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import { useCurrentEmployeeDetails } from "../../../hooks/useEmployee";
import { useTargetUser } from "../../../context/ViewedUserContext";
import { useGetYearFilterOptions } from "../../../hooks/useBenefit";
import {
  useFlexiComponents,
  useUpdateFlexiComponents,
  useIndividualEmployeeFlexiLockingPeriod,
  useFlexiLockingPeriodVisibility
} from "../../../hooks/payroll/useFlexiDeclaration";
import { format } from "date-fns";
import { FlexiComponent, ComponentPartOfCTC } from "../../../types/flexiDeclaration";
import { IoIosArrowDown } from "react-icons/io";
import { EditFlexiLockingPeriod } from "./Component/EditFlexiLockingPeriod";
import { SquarePen } from "lucide-react";
import { useScreenSize } from "../../../hooks/useScreenSize";
import toast from "react-hot-toast";
import { getCurrentPeriod } from "../../Benefits/shared/logic";
import NoDataFound from "../../shared/atoms/NoDataFound";
import { getActionsEnabled } from "../../../utils/uiPermission";
import { useGetUiPermission } from "../../../hooks/userUiPermission";

function formatINR(num: string | number | undefined | null) {
  if (num === undefined || num === null || num === "") return "";
  const val = typeof num === "string" ? parseFloat(num) : num;
  if (isNaN(val)) return "";
  return val.toLocaleString("en-IN");
}

/** Shared validation helper — returns an error string or null if valid. */
function validateFlexiField(value: any, maxAmount: number): string | null {
  const strVal = value !== undefined && value !== null ? String(value) : "";
  const cleanValue = strVal.replace(/,/g, "");
  const numericVal = Number(cleanValue);
  if (strVal.trim() !== "" && isNaN(numericVal)) {
    return "Please enter a valid number";
  }
  if (numericVal < 0) {
    return "Amount cannot be negative";
  }
  if (numericVal > maxAmount) {
    return `Amount cannot exceed ${formatINR(maxAmount)}`;
  }
  return null;
}

export default function FlexiDeclaration() {
  const [showValues, setShowValues] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState("");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const { isDesktop } = useScreenSize();
  const { data: userUiPermission } = useGetUiPermission("Compensation");
  const actionsEnabled = getActionsEnabled(
    userUiPermission,
    ["edit_flexi_locking_period"],
    "Flexi Declaration"
  );
  const { data: currentEmployee, isLoading: isEmployeeLoading } = useCurrentEmployeeDetails({ logged_in_employee_details: true });
  const { targetEmployeeId } = useTargetUser();
  // When an admin/HR is viewing another user, target their employee id.
  const effectiveEmployee = targetEmployeeId || currentEmployee?.name;
  const { data: yearOptions, isLoading: isYearOptionsLoading } = useGetYearFilterOptions(currentEmployee?.company || "");

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (yearOptions && yearOptions.length > 0 && !selectedPeriod) {
      const optionYears = yearOptions.map(opt => ({ label: opt.name, value: opt.name }));
      const defaultYear = getCurrentPeriod(optionYears);
      setSelectedPeriod(defaultYear || yearOptions[0].name);
    }
  }, [yearOptions, selectedPeriod]);

  const { data: flexiData, isLoading: isFlexiLoading } = useFlexiComponents(
    effectiveEmployee || "",
    selectedPeriod || "",
    currentEmployee?.company || ""
  );

  const { data: lockingPeriodData, isLoading: isLockingLoading, refetch: refetchLockingPeriod } = useIndividualEmployeeFlexiLockingPeriod(
    effectiveEmployee || ""
  );

  // Submission-window visibility: drives whether the FlexiBenefit window is
  // open and the fields are editable. The window is open only when the API
  // reports status "success" AND flexibenefit_enabled === 1.
  const { data: visibilityData, isLoading: isVisibilityLoading } =
    useFlexiLockingPeriodVisibility({
      employee: effectiveEmployee || "",
      payroll_period: selectedPeriod || "",
      posting_date: format(new Date(), "yyyy-MM-dd"),
      doctype: "Salary Structure Assignment",
    });

  // Frappe double-wraps the response; callMethod strips one layer, leaving
  // { message: {...} }. Tolerate a flattened shape too.
  const windowInfo: any =
    visibilityData?.message && typeof visibilityData.message === "object"
      ? visibilityData.message
      : visibilityData;
  const windowMessage: string = windowInfo?.message || "";
  const flexiEnabled = Number(windowInfo?.flexibenefit_enabled) === 1;
  const isWindowOpen = windowInfo?.status === "success" && flexiEnabled;

  const isLoading =
    isEmployeeLoading ||
    isYearOptionsLoading ||
    isFlexiLoading ||
    isLockingLoading ||
    isVisibilityLoading;

  const updateMutation = useUpdateFlexiComponents();

  const [flexi, setFlexi] = useState<Record<string, string>>({});

  useEffect(() => {
    if (flexiData?.flexi_components) {
      const initialFlexi: Record<string, string> = {};
      flexiData.flexi_components.forEach((comp: FlexiComponent) => {
        initialFlexi[comp.salary_component] = comp.amount?.toString() || "";
      });
      setFlexi(initialFlexi);
      setErrors({});
    }
  }, [flexiData]);

  const earningsData = flexiData?.salary_data?.component_part_of_ctc?.map((item: ComponentPartOfCTC) => ({
    label: item.component,
    monthly: item.amount,
    annually: item.annual_amount,
    info: false,
  })) || [];

  const flexiComponents = flexiData?.flexi_components || [];

  // Open/closed (and therefore field editability + Save) is driven by the
  // visibility API: closed whenever the submission window isn't open. Until that
  // data arrives, fall back to the individual locking-period status.
  const isClosed = windowInfo
    ? !isWindowOpen
    : lockingPeriodData?.status === "Closed";

  const handleInputChange = (componentName: string, value: string, maxAmount: number) => {
    setFlexi(f => ({ ...f, [componentName]: value }));

    const error = validateFlexiField(value, maxAmount);
    setErrors(e => {
      const next = { ...e };
      if (error) {
        next[componentName] = error;
      } else {
        delete next[componentName];
      }
      return next;
    });
  };

  const handleSave = async () => {
    console.log("handleSave triggered. flexiData:", flexiData, "isClosed:", isClosed, "errors:", errors);
    if (!flexiData?.salary_data?.assignment_name) {
      toast.error("Cannot save changes: Active salary structure assignment is missing.");
      return;
    }

    // Run full validation on save
    const newErrors: Record<string, string> = {};
    flexiComponents.forEach((comp) => {
      const val = flexi[comp.salary_component];
      const maxAmt = Number(comp.max_amount) || 0;
      const error = validateFlexiField(val, maxAmt);
      if (error) {
        newErrors[comp.salary_component] = error;
      }
    });

    if (Object.keys(newErrors).length > 0) {
      console.warn("Validation errors found:", newErrors);
      setErrors(newErrors);
      toast.error("Please resolve the validation errors before saving.");
      return;
    }

    if (isClosed) {
      toast.error("Cannot save changes as the locking period is closed.");
      return;
    }

    const updatedComponents = flexiComponents.map((comp) => {
      const val = flexi[comp.salary_component];
      const strVal = val !== undefined && val !== null ? String(val) : "0";
      const cleanVal = strVal.replace(/,/g, '');
      return {
        ...comp,
        amount: Number(cleanVal) || 0
      };
    });

    console.log("Submitting updated components payload:", updatedComponents);

    try {
      await updateMutation.mutateAsync({
        id: flexiData.salary_data.assignment_name,
        flexi_components: updatedComponents
      });
      toast.success("Flexi components updated successfully!");
    } catch (err) {
      console.error("Mutation failed inside handleSave:", err);
      toast.error(`Failed to update flexi components. ${err instanceof Error ? err.message : ""}`);
    }
  };

  return (
    <div className="bg-app min-h-screen text-text-title font-brand">

      {/* ── Top bar ──────────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">

        {/* Desktop top bar (hidden on mobile) */}
        {isDesktop && (
          <div className="sm:flex items-center justify-between h-[52px] px-7">
            <span className="font-bold text-[17px] text-text-title tracking-tight">Flexi Declaration</span>
            <div className="flex items-center gap-3.5">
              <span className="text-[13px] text-text-body2 flex items-center gap-1.5">
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M2 4l.5-1h11l.5 1" stroke="currentColor" strokeWidth="1.3" /><rect x="1" y="4" width="14" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.3" /></svg>
                Financial Year
              </span>
              <div className="relative inline-block">
                <select
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  className="font-bold text-[13px] text-text-title bg-gray-100 px-2.5 py-0.5 pr-7 rounded-md border-none outline-none cursor-pointer appearance-none"
                >
                  {yearOptions?.map((opt: { name: string }) => (
                    <option key={opt.name} value={opt.name}>{opt.name}</option>
                  ))}
                  {!yearOptions && <option value="25-26">2026–27</option>}
                </select>
                <IoIosArrowDown className="absolute right-2 top-1/2 -translate-y-1/2 text-text-title pointer-events-none text-sm" />
              </div>
              <span className="text-[13px] text-text-body2 ml-2">Show Values</span>
              <div
                onClick={() => setShowValues(v => !v)}
                className={`w-10 h-[22px] rounded-xl relative cursor-pointer transition-colors duration-200 ${showValues ? "bg-primary" : "bg-gray-300"}`}
              >
                <div className={`absolute top-[3px] w-4 h-4 rounded-lg bg-white shadow-md transition-all duration-200 ${showValues ? "left-[21px]" : "left-[3px]"}`} />
              </div>
              <button
                onClick={handleSave}
                disabled={updateMutation.isPending || isClosed}
                className={`bg-primary text-white border-none rounded-md px-4 py-1.5 text-[13px] font-semibold ml-2.5 transition-all duration-200 ${(updateMutation.isPending || isClosed)
                  ? "opacity-50 cursor-not-allowed bg-gray-400"
                  : "cursor-pointer"
                  }`}
              >
                {updateMutation.isPending ? "Saving..." : isClosed ? "Locked" : "Save Changes"}
              </button>
            </div>
          </div>
        )}

        {/* Mobile top bar (hidden on sm+) */}
        {!isDesktop && (
          <div className="flex flex-col px-4 pt-3 pb-3 gap-2.5">
            {/* Row 1: title */}
            <div className="flex items-center justify-between">
              <span className="font-bold text-[16px] text-text-title tracking-tight">Flexi Declaration</span>
              <button
                onClick={handleSave}
                disabled={updateMutation.isPending || isClosed}
                className={`w-[150px] bg-primary text-white border-none rounded-md px-4 py-2 text-[13px] font-semibold transition-all duration-200 ${(updateMutation.isPending || isClosed)
                  ? "opacity-50 cursor-not-allowed bg-gray-400"
                  : "cursor-pointer"
                  }`}
              >
                {updateMutation.isPending ? "Saving..." : isClosed ? "Locked" : "Save Changes"}
              </button>
            </div>

            {/* Row 2: financial year selector + show values toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M2 4l.5-1h11l.5 1" stroke="currentColor" strokeWidth="1.3" /><rect x="1" y="4" width="14" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.3" /></svg>
                <span className="text-[12px] text-text-body2">FY</span>
                <div className="relative inline-block">
                  <select
                    value={selectedPeriod}
                    onChange={(e) => setSelectedPeriod(e.target.value)}
                    className="font-bold text-[12px] text-text-title bg-gray-100 px-2 py-0.5 pr-6 rounded-md border-none outline-none cursor-pointer appearance-none"
                  >
                    {yearOptions?.map((opt: { name: string }) => (
                      <option key={opt.name} value={opt.name}>{opt.name}</option>
                    ))}
                    {!yearOptions && <option value="25-26">2026–27</option>}
                  </select>
                  <IoIosArrowDown className="absolute right-1.5 top-1/2 -translate-y-1/2 text-text-title pointer-events-none text-xs" />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[12px] text-text-body2">Show Values</span>
                <div
                  onClick={() => setShowValues(v => !v)}
                  className={`w-9 h-[20px] rounded-xl relative cursor-pointer transition-colors duration-200 ${showValues ? "bg-primary" : "bg-gray-300"}`}
                >
                  <div className={`absolute top-[2px] w-4 h-4 rounded-lg bg-white shadow-md transition-all duration-200 ${showValues ? "left-[18px]" : "left-[2px]"}`} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Main content ─────────────────────────────────────────────────────── */}
      {isLoading ? (
        /* Single loader covers both panels */
        <div className="flex flex-col items-center justify-center h-screen py-12">
          <NoDataFound loading />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 max-w-[1400px] mx-auto px-4 sm:px-7 py-5 sm:py-7 pb-10">

          {/* LEFT: Flexi Declaration */}
          <div className="pr-0 sm:pr-6 mb-6 sm:mb-0">
            <div className="flex items-center gap-2.5 mb-5">
              <span className="font-bold text-[14px] sm:text-[15px] text-text-title">
                Flexi Declaration For FY {selectedPeriod} (₹)
              </span>
              <span className={`${isClosed ? "bg-error-50 text-error" : "bg-success-50 text-success"} text-[10px] font-bold px-2 py-0.5 rounded tracking-widest uppercase`}>
                {isClosed ? "Closed" : "Open"}
              </span>
              {actionsEnabled?.edit_flexi_locking_period && (
                <span
                  className="text-text-body2 cursor-pointer text-[14px]"
                  onClick={() => setIsEditModalOpen(true)}
                >
                  <SquarePen size={14} />
                </span>
              )}
            </div>

            {windowMessage && (
              <div
                className={`mb-5 flex items-start gap-2 rounded-lg border px-3.5 py-2.5 text-[12px] leading-snug ${isWindowOpen
                  ? "border-success-50 bg-success-50 text-success"
                  : "border-error-50 bg-error-50 text-error"
                  }`}
                role="status"
              >
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 16 16"
                  fill="none"
                  className="mt-0.5 shrink-0"
                >
                  <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3" />
                  <path d="M8 5v3.5M8 11h.01" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
                <span className="font-medium">{windowMessage}</span>
              </div>
            )}

            <div className="flex flex-col gap-4">
              {flexiComponents.map((comp: FlexiComponent) => {
                const isEditable = !isClosed && comp.visibility_type === "Editable";
                const maxAmt = Number(comp.max_amount) || 0;
                const hasError = !!errors[comp.salary_component];
                return (
                  <div key={comp.salary_component}>
                    <label className="text-[12px] text-text-body2 block mb-1.5 font-medium">
                      {comp.salary_component} (0 - {formatINR(comp.max_amount)}) Annual
                    </label>
                    <input
                      type="text"
                      placeholder={comp.salary_component === "NPS" ? "Enter Amount" : undefined}
                      value={flexi[comp.salary_component] || ""}
                      onChange={e => handleInputChange(comp.salary_component, e.target.value, maxAmt)}
                      className={`w-full border rounded-[7px] px-3.5 py-2.5 text-[14px] text-text-title outline-none box-border transition-colors duration-150 ${hasError ? "border-error focus:border-error focus:ring-1 focus:ring-error" : "border-gray-100"
                        } ${!isEditable ? "bg-gray-10/50 cursor-not-allowed" : "bg-white"
                        }`}
                      readOnly={!isEditable}
                    />
                    {hasError && (
                      <span className="text-[11px] text-error mt-1 block font-medium">
                        {errors[comp.salary_component]}
                      </span>
                    )}
                  </div>
                );
              })}
              {flexiComponents.length === 0 && (
                <div className="text-[14px] text-text-body2 text-center py-5">
                  No flexi components found.
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Annual & Monthly Fixed Gross */}
          <div className="pl-0 sm:pl-1">
            <div className="mb-4">
              <span className="font-bold text-[14px] sm:text-[15px] text-text-title">
                Annual &amp; Monthly Fixed Gross (Annual)(Eg-100000)
              </span>
            </div>

            <div className="bg-white rounded-[10px] border border-gray-100 overflow-hidden shadow-sm">
              {/* Table Header */}
              <div className="grid grid-cols-[1fr_90px_90px] sm:grid-cols-[1fr_130px_130px] bg-gray-10/30 border-b border-gray-100 px-3 sm:px-4 py-2.5">
                <span className="text-[11px] sm:text-[12px] font-semibold text-text-body1">Earnings</span>
                <span className="text-[11px] sm:text-[12px] font-semibold text-text-body1 text-right">Monthly</span>
                <span className="text-[11px] sm:text-[12px] font-semibold text-text-body1 text-right">Annually</span>
              </div>

              {earningsData.map((row, i) => (
                <div
                  key={row.label}
                  className={`grid grid-cols-[1fr_90px_90px] sm:grid-cols-[1fr_130px_130px] px-3 sm:px-4 py-[10px] sm:py-[11px] items-center ${i % 2 === 0 ? "bg-white" : "bg-gray-10/10"} ${i < earningsData.length - 1 ? "border-b border-gray-50" : ""}`}
                >
                  <span className="text-[12px] sm:text-[13px] text-text-body1 flex items-center gap-1 leading-snug">
                    {row.label}
                    {row.info && (
                      <span className="inline-flex items-center justify-center w-[15px] h-[15px] rounded-full bg-gray-100 text-[10px] text-text-body2 font-bold cursor-pointer">i</span>
                    )}
                  </span>
                  <span className="text-[12px] sm:text-[13px] text-text-title text-right tabular-nums">
                    {showValues ? formatINR(row.monthly) : "*****"}
                  </span>
                  <span className="text-[12px] sm:text-[13px] text-text-title text-right tabular-nums">
                    {showValues ? formatINR(row.annually) : "*****"}
                  </span>
                </div>
              ))}
              {earningsData.length === 0 && (
                <div className="text-[14px] text-text-body2 text-center py-5">
                  No earnings data found.
                </div>
              )}

              {flexiData?.salary_data && (
                <>
                  {/* Fixed Gross (Annual)(Eg-100000) */}
                  <div
                    className="grid grid-cols-[1fr_90px_90px] sm:grid-cols-[1fr_130px_130px] px-3 sm:px-4 py-[10px] sm:py-[11px] items-center bg-primary/10 border-t border-gray-200 font-bold"
                  >
                    <span className="text-[12px] sm:text-[13px] text-text-body1 leading-snug">
                      Fixed Gross (Annual)(Eg-100000)
                    </span>
                    <span className="text-[12px] sm:text-[13px] text-text-title text-right tabular-nums">
                      {showValues ? formatINR(flexiData.salary_data.fixed_gross_monthly) : "*****"}
                    </span>
                    <span className="text-[12px] sm:text-[13px] text-text-title text-right tabular-nums">
                      {showValues ? formatINR(flexiData.salary_data.fixed_gross_annual) : "*****"}
                    </span>
                  </div>

                  {/* Variable Pay Included in CTC */}
                  {flexiData.salary_data.variable_pay_include_ctc?.map((item: any, idx: number) => (
                    <div
                      key={`var-${item.component || idx}`}
                      className="grid grid-cols-[1fr_90px_90px] sm:grid-cols-[1fr_130px_130px] px-3 sm:px-4 py-[10px] sm:py-[11px] items-center bg-white border-t border-gray-100"
                    >
                      <span className="text-[12px] sm:text-[13px] text-text-body1 leading-snug">
                        {item.component}
                      </span>
                      <span className="text-[12px] sm:text-[13px] text-text-title text-right tabular-nums">
                        -
                      </span>
                      <span className="text-[12px] sm:text-[13px] text-text-title text-right tabular-nums">
                        {showValues ? formatINR(item.annual_amount) : "*****"}
                      </span>
                    </div>
                  ))}

                  {/* Total CTC */}
                  <div
                    className="grid grid-cols-[1fr_90px_90px] sm:grid-cols-[1fr_130px_130px] px-3 sm:px-4 py-[10px] sm:py-[11px] items-center bg-primary/10 border-t border-gray-200 font-bold"
                  >
                    <span className="text-[12px] sm:text-[13px] text-text-body1 leading-snug">
                      Total CTC
                    </span>
                    <span className="text-[12px] sm:text-[13px] text-text-title text-right tabular-nums">
                      -
                    </span>
                    <span className="text-[12px] sm:text-[13px] text-text-title text-right tabular-nums">
                      {showValues ? formatINR(flexiData.salary_data.total_ctc || flexiData.salary_data.annual_ctc) : "*****"}
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Variable Pay (Excluded from CTC) */}
            {flexiData?.salary_data?.variable_pay_exclude_ctc && flexiData.salary_data.variable_pay_exclude_ctc.length > 0 && (
              <div className="mt-6">
                <div className="mb-4">
                  <span className="font-bold text-[14px] sm:text-[15px] text-text-title">
                    Variable Pay (Excluded from CTC)
                  </span>
                </div>
                <div className="bg-white rounded-[10px] border border-gray-100 overflow-hidden shadow-sm">
                  {/* Table Header */}
                  <div className="grid grid-cols-[1fr_90px] sm:grid-cols-[1fr_130px] bg-gray-10/30 border-b border-gray-100 px-3 sm:px-4 py-2.5">
                    <span className="text-[11px] sm:text-[12px] font-semibold text-text-body1">Component</span>
                    <span className="text-[11px] sm:text-[12px] font-semibold text-text-body1 text-right">Annually</span>
                  </div>

                  {flexiData.salary_data.variable_pay_exclude_ctc.map((item: any, i: number) => (
                    <div
                      key={item.component || i}
                      className={`grid grid-cols-[1fr_90px] sm:grid-cols-[1fr_130px] px-3 sm:px-4 py-[10px] sm:py-[11px] items-center ${i % 2 === 0 ? "bg-white" : "bg-gray-10/10"} ${i < flexiData.salary_data.variable_pay_exclude_ctc.length - 1 ? "border-b border-gray-50" : ""}`}
                    >
                      <span className="text-[12px] sm:text-[13px] text-text-body1 flex items-center gap-1 leading-snug">
                        {item.component}
                      </span>
                      <span className="text-[12px] sm:text-[13px] text-text-title text-right tabular-nums">
                        {showValues ? formatINR(item.annual_amount) : "*****"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <EditFlexiLockingPeriod
        open={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        data={lockingPeriodData}
        onRefetchData={() => {
          refetchLockingPeriod();
        }}
      />
    </div>
  );
}