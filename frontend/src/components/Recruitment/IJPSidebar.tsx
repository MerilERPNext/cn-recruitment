import { CheckCircle, AlertTriangle } from "lucide-react";
import { IJPField } from "./IJPTypes";

interface IJPSidebarProps {
  sections: string[];
  currentStep: number;
  fields: IJPField[];
  formData: Record<string, any>;
  rowCounts: Record<string, number>;
  stepValidationErrors: string[];
  onStepClick: (index: number) => void;
  getMissingRequiredInSection: (sectionName: string) => string[];
}

export default function IJPSidebar({
  sections,
  currentStep,
  fields,
  formData,
  rowCounts,
  stepValidationErrors,
  onStepClick,
  getMissingRequiredInSection,
}: IJPSidebarProps) {
  const isSectionVisitedOrFilled = (sectionName: string) => {
    if (sectionName === "Review") {
      return false;
    }
    const sectionFields = fields.filter((f) => f.section === sectionName);
    return sectionFields.some((f) => {
      if (f.fieldtype === "Table") {
        const rowCount = rowCounts[f.reference_name] ?? (f.reqd === 1 ? 1 : 0);
        return rowCount > 0;
      }
      return (
        formData[f.reference_name] !== undefined &&
        formData[f.reference_name] !== null &&
        formData[f.reference_name] !== ""
      );
    });
  };

  return (
    <div className="w-full md:w-56 shrink-0 bg-white border border-gray-100 rounded-lg shadow-sm overflow-hidden">
      <div className="text-xs font-semibold p-4 border-b border-gray-50 text-gray-700">
        Apply for IJP
      </div>
      <div className="flex flex-col">
        {sections.map((section, index) => {
          const isActive = index === currentStep;
          const isFilled = isSectionVisitedOrFilled(section);
          const hasMissing = isActive && stepValidationErrors.length > 0;

          // A step is reachable if all previous sections are completely filled/valid
          let isReachable = true;
          for (let s = 0; s < index; s++) {
            if (getMissingRequiredInSection(sections[s]).length > 0) {
              isReachable = false;
              break;
            }
          }

          return (
            <button
              key={section}
              type="button"
              onClick={() => {
                if (isReachable || index < currentStep) {
                  onStepClick(index);
                }
              }}
              className={`w-full py-4 px-5 flex items-center gap-3 text-left transition-all duration-200 border-b border-gray-50 last:border-b-0 border-l-4 ${
                isActive
                  ? hasMissing
                    ? "bg-rose-50/60 border-l-rose-500"
                    : "bg-[var(--primary-color)]/5 border-l-[var(--primary-color)]"
                  : isReachable
                  ? "hover:bg-gray-50/60 border-l-transparent cursor-pointer"
                  : "border-l-transparent cursor-not-allowed opacity-60"
              }`}
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-black transition-all ${
                  isActive
                    ? hasMissing
                      ? "bg-rose-500 text-white"
                      : "text-white"
                    : isFilled
                    ? "bg-emerald-500 text-white"
                    : isReachable
                    ? "bg-gray-100 text-gray-400"
                    : "bg-gray-50 text-gray-300"
                }`}
                style={isActive && !hasMissing ? { background: "var(--primary-color)" } : {}}
              >
                {isFilled && !isActive ? (
                  <CheckCircle size={14} className="text-white" />
                ) : isActive && hasMissing ? (
                  <AlertTriangle size={13} />
                ) : (
                  index + 1
                )}
              </div>
              <span
                className="text-xs font-semibold leading-tight transition-colors truncate"
                style={{
                  color: isActive
                    ? hasMissing
                      ? "#ef4444"
                      : "var(--primary-color)"
                    : isReachable
                    ? "#6b7280"
                    : "#d1d5db"
                }}
              >
                {section}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
