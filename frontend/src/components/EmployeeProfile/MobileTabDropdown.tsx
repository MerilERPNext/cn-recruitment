import React, { useEffect, useRef, useState } from "react";
import { ChevronDown, Check } from "lucide-react";

export interface TabOption {
  key: string;
  label: string;
  count?: number;
}

export interface BreadcrumbDropdownProps {
  options: TabOption[];
  value: string;
  onChange: (key: string) => void;
  label?: string;
  variant?: "primary" | "neutral";
  maxLabelWidth?: string;
  align?: "left" | "right";
  stickyTopClass?: string;
  className?: string;
  zIndex?: number;
}

export const BreadcrumbDropdown: React.FC<BreadcrumbDropdownProps> = ({
  options,
  value,
  onChange,
  variant = "neutral",
  maxLabelWidth = "max-w-[145px]",
  align = "left",
  className = "",
}) => {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.key === value) || options[0];
  const isPrimary = variant === "primary";

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  if (!options || options.length === 0) return null;

  return (
    <div ref={dropdownRef} className={`relative inline-flex items-center ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`group flex items-center gap-1.5 text-xs font-semibold rounded-lg pl-2.5 pr-2 py-1.5 transition-all cursor-pointer border bg-transparent ${
          isPrimary
            ? "border-gray-200/90 text-gray-900 hover:text-primary-700 hover:border-primary-300 hover:bg-gray-50/80 active:bg-gray-100"
            : "border-gray-200/90 text-gray-800 hover:text-gray-950 hover:border-gray-300 hover:bg-gray-50/80 active:bg-gray-100"
        } ${open ? "border-primary-400 bg-gray-50 ring-2 ring-primary-500/20" : "shadow-2xs"}`}
      >
        <span className={`truncate ${maxLabelWidth}`}>{selectedOption?.label}</span>
        {options.length > 0 && (
          <ChevronDown
            size={13}
            className={`transition-transform duration-200 shrink-0 ${
              open ? "rotate-180 text-primary-600" : isPrimary ? "text-gray-500 group-hover:text-primary-600" : "text-gray-400 group-hover:text-gray-600"
            }`}
          />
        )}
      </button>

      {/* Custom Animated Popup Menu */}
      {open && options.length > 0 && (
        <div
          className={`absolute top-full mt-1.5 w-max min-w-[190px] max-w-[280px] bg-white rounded-2xl shadow-xl border border-gray-100 p-1.5 z-[100] animate-in fade-in zoom-in-95 duration-150 ${
            align === "right" ? "right-0 origin-top-right" : "left-0 origin-top-left"
          }`}
        >
          <div className="max-h-[260px] overflow-y-auto scrollbar-hide space-y-0.5">
            {options.map((option) => {
              const isSelected = option.key === value;
              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => {
                    onChange(option.key);
                    setOpen(false);
                  }}
                  className={`w-full flex items-center justify-between gap-3 px-3 py-2 text-xs rounded-xl transition-all text-left ${
                    isSelected
                      ? "bg-primary-50 text-primary-700 font-bold"
                      : "text-gray-700 hover:bg-gray-50 hover:text-gray-900 font-medium"
                  }`}
                >
                  <span className="truncate">
                    {option.label}
                    {option.count !== undefined ? ` (${option.count})` : ""}
                  </span>
                  {isSelected && (
                    <Check size={14} className="text-primary-600 shrink-0 stroke-[2.5]" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

interface MobileProfileBreadcrumbsProps {
  prefixLabel?: string;
  sectionOptions?: TabOption[];
  selectedSection?: string;
  onSectionChange?: (key: string) => void;
  subSectionOptions?: TabOption[];
  selectedSubSection?: string;
  onSubSectionChange?: (key: string) => void;
  stickyTopClass?: string;
  className?: string;
  zIndex?: number;
}

export const MobileProfileBreadcrumbs: React.FC<MobileProfileBreadcrumbsProps> = ({
  prefixLabel,
  sectionOptions = [],
  selectedSection,
  onSectionChange,
  subSectionOptions = [],
  selectedSubSection,
  onSubSectionChange,
  stickyTopClass = "top-[105px]",
  className = "",
  zIndex = 20,
}) => {
  return (
    <div
      className={`bg-white px-4 min-h-[44px] py-1.5 border-b border-gray-100 flex items-center gap-1.5 select-none sticky overflow-visible ${stickyTopClass} ${className}`}
      style={{ zIndex }}
    >
      {/* Static Prefix or Section Breadcrumb Dropdown */}
      {prefixLabel ? (
        <span className="text-xs font-semibold text-gray-500 pl-1">{prefixLabel}</span>
      ) : sectionOptions && sectionOptions.length > 0 && onSectionChange ? (
        <BreadcrumbDropdown
          options={sectionOptions}
          value={selectedSection || sectionOptions[0]?.key}
          onChange={onSectionChange}
          variant="primary"
          align="left"
        />
      ) : null}

      {/* Breadcrumb Separator & Sub-Section Dropdown */}
      {subSectionOptions && subSectionOptions.length > 0 && onSubSectionChange && (
        <>
          <span className="text-gray-300 text-xs font-medium select-none px-0.5">/</span>
          <BreadcrumbDropdown
            options={subSectionOptions}
            value={selectedSubSection || subSectionOptions[0]?.key}
            onChange={onSubSectionChange}
            variant="neutral"
            align="left"
          />
        </>
      )}
    </div>
  );
};

// Backwards compatibility export
export const MobileTabDropdown = BreadcrumbDropdown;
