import { useState, useEffect } from "react";
import { useCurrentEmployeeDetails } from "../../../hooks/useEmployee";
import { useGetYearFilterOptions } from "../../../hooks/useBenefit";
import {
  useFlexiComponents,
  useUpdateFlexiComponents,
  // useFlexiLockingPeriodVisibility,
  useIndividualEmployeeFlexiLockingPeriod
} from "../../../hooks/payroll/useFlexiDeclaration";
import { FlexiComponent, ComponentPartOfCTC } from "../../../types/flexiDeclaration";
import { IoIosArrowDown } from "react-icons/io";
import { EditFlexiLockingPeriod } from "./Component/EditFlexiLockingPeriod";
import { SquarePen } from "lucide-react";
import NoDataFound from "../../shared/atoms/NoDataFound";
import { useScreenSize } from "../../../hooks/useScreenSize";
// import { format } from "date-fns";

function formatINR(num: string | number | undefined | null) {
  if (num === undefined || num === null || num === "") return "";
  const val = typeof num === "string" ? parseFloat(num) : num;
  if (isNaN(val)) return "";
  return val.toLocaleString("en-IN");
}

export default function FlexiDeclaration() {
  const [showValues, setShowValues] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState("25-26");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const { isDesktop } = useScreenSize();
  const { data: currentEmployee, } = useCurrentEmployeeDetails({ logged_in_employee_details: true });
  const { data: yearOptions } = useGetYearFilterOptions(currentEmployee?.company || "");

  useEffect(() => {
    if (yearOptions && yearOptions.length > 0 && !selectedPeriod) {
      setSelectedPeriod(yearOptions[0].name);
    }
  }, [yearOptions, selectedPeriod]);

  const { data: flexiData, isLoading } = useFlexiComponents(
    currentEmployee?.name || "",
    selectedPeriod || "",
    currentEmployee?.company || ""
  );

  const { data: lockingPeriodData, refetch: refetchLockingPeriod } = useIndividualEmployeeFlexiLockingPeriod(
    currentEmployee?.name || ""
  );

  const updateMutation = useUpdateFlexiComponents();

  const [flexi, setFlexi] = useState<Record<string, string>>({});

  useEffect(() => {
    if (flexiData?.flexi_components) {
      const initialFlexi: Record<string, string> = {};
      flexiData.flexi_components.forEach((comp: FlexiComponent) => {
        initialFlexi[comp.salary_component] = comp.amount?.toString() || "";
      });
      setFlexi(initialFlexi);
    }
  }, [flexiData]);

  const earningsData = flexiData?.salary_data?.component_part_of_ctc?.map((item: ComponentPartOfCTC) => ({
    label: item.component,
    monthly: item.amount,
    annually: item.annual_amount,
    info: false,
  })) || [];

  const flexiComponents = flexiData?.flexi_components || [];

  const handleSave = async () => {
    if (!flexiData?.salary_data?.assignment_name) return;

    const updatedComponents = flexiComponents.map((comp) => ({
      ...comp,
      amount: Number(flexi[comp.salary_component]) || 0
    }));

    try {
      await updateMutation.mutateAsync({
        id: flexiData.salary_data.assignment_name,
        flexi_components: updatedComponents
      });
      alert("Flexi components updated successfully!");
    } catch (err) {
      console.error("Update failed:", err);
      alert("Failed to update flexi components.");
    }
  };

  const isClosed = lockingPeriodData?.status === "Closed";

  return (
    <div className="bg-app min-h-screen text-text-title font-brand">

      {/* ── Top bar ──────────────────────────────────────────────────────────── */}
      {/* Desktop layout preserved exactly; mobile gets a stacked layout */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">

        {/* Desktop top bar (hidden on mobile) */}
        {isDesktop && (<div className="sm:flex items-center justify-between h-[52px] px-7">
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
              disabled={updateMutation.isPending}
              className={`bg-primary text-white border-none rounded-md px-4 py-1.5 text-[13px] font-semibold ml-2.5 transition-all duration-200 ${updateMutation.isPending ? "opacity-70 cursor-not-allowed" : "cursor-pointer"}`}
            >
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
        )}

        {/* Mobile top bar (hidden on sm+) */}
        {!isDesktop && ( <div className="flex flex-col px-4 pt-3 pb-3 gap-2.5">
          {/* Row 1: title */}
<div className="flex items-center justify-between">
<span className="font-bold text-[16px] text-text-title tracking-tight">Flexi Declaration</span>
          <button
            onClick={handleSave}
            disabled={updateMutation.isPending}
            className={`w-[150px] bg-primary text-white border-none rounded-md px-4 py-2 text-[13px] font-semibold transition-all duration-200 ${updateMutation.isPending ? "opacity-70 cursor-not-allowed" : "cursor-pointer"}`}
          >
            {updateMutation.isPending ? "Saving..." : "Save Changes"}
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

          {/* Row 3: Save button full-width */}

        </div>
        )}
      </div>

      {/* ── Main content ─────────────────────────────────────────────────────── */}
      {/*
        Desktop: 2-column grid (unchanged)
        Mobile:  single column, stacked
      */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 max-w-[1400px] mx-auto px-4 sm:px-7 py-5 sm:py-7 pb-10">

        {/* LEFT: Flexi Declaration */}
        <div className="pr-0 sm:pr-6 mb-6 sm:mb-0">
          <div className="flex items-center gap-2.5 mb-5">
            <span className="font-bold text-[14px] sm:text-[15px] text-text-title">
              Flexi Declaration For FY {selectedPeriod} (₹)
            </span>
            <span className={`${isClosed ? "bg-error-50 text-error" : "bg-success-50 text-success"} text-[10px] font-bold px-2 py-0.5 rounded tracking-widest uppercase`}>
              {lockingPeriodData?.status || "OPEN"}
            </span>
            <span
              className="text-text-body2 cursor-pointer text-[14px]"
              onClick={() => setIsEditModalOpen(true)}
            >
              <SquarePen size={14} />
            </span>
          </div>

          <div className="flex flex-col gap-4">
            {flexiComponents.map((comp: FlexiComponent) =>
              comp.salary_component === "NPS" ? (
                <div key={comp.salary_component}>
                  <label className="text-[12px] text-text-body2 block mb-1.5">
                    {comp.salary_component} (0 - {formatINR(comp.max_amount)}) Annual
                  </label>
                  <input
                    type="text"
                    placeholder="Enter Amount"
                    value={flexi[comp.salary_component] || ""}
                    onChange={e => setFlexi(f => ({ ...f, [comp.salary_component]: e.target.value }))}
                    className={`w-full border border-gray-100 rounded-[7px] px-3.5 py-2.5 text-[14px] text-text-title outline-none box-border transition-colors duration-150 ${comp.visibility_type !== "Editable" ? "bg-gray-10/50 cursor-not-allowed" : "bg-white"}`}
                    readOnly={comp.visibility_type !== "Editable"}
                  />
                </div>
              ) : (
                <div key={comp.salary_component}>
                  <label className="text-[12px] text-text-body2 block mb-1.5">
                    {comp.salary_component} (0 - {formatINR(comp.max_amount)}) Annual
                  </label>
                  <input
                    type="text"
                    value={flexi[comp.salary_component] || ""}
                    onChange={e => setFlexi(f => ({ ...f, [comp.salary_component]: e.target.value }))}
                    className={`w-full border border-gray-100 rounded-[7px] px-3.5 py-2.5 text-[14px] text-text-title outline-none box-border transition-colors duration-150 ${comp.visibility_type !== "Editable" ? "bg-gray-10/50 cursor-not-allowed" : "bg-white"}`}
                    readOnly={comp.visibility_type !== "Editable"}
                  />
                </div>
              )
            )}
            {flexiComponents.length === 0 && !isLoading && (
              <div className="text-[14px] text-text-body2 text-center py-5">
                <NoDataFound
                  title="No Records Found"
                  subtitle="No Flexi Declaration records available for this period."
                />
              </div>
            )}
            {isLoading && (
              <div className="text-[14px] text-text-body2 text-center py-5">
                <NoDataFound
                  title="No Records Found"
                  subtitle="No Flexi Declaration records available for this period."
                />
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
          </div>
        </div>
      </div>

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