// import { Funnel } from "lucide-react";
import React, { useState, useRef, useEffect } from "react";

interface Option {
  value: string;
  label: string;
}

type Position = "top-left" | "top-right" | "bottom-left" | "bottom-right";

interface CustomDropdownProps {
  value: string;
  onChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  className?: string;
  options: Option[];
  position?: Position;
}

const CustomDropdown: React.FC<CustomDropdownProps> = ({
  value,
  onChange,
  className,
  options,
  position = "bottom-left",
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const positionCss = {
    "top-left": "bottom-[calc(100%+10px)] right-0 ",
    "top-right": "bottom-[calc(100%+10px)] left-0 ",
    "bottom-left": "top-full right-0",
    "bottom-right": "top-full left-0 ",
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (optionValue: string): void => {
    const syntheticEvent = {
      target: { value: optionValue },
      currentTarget: { value: optionValue },
    } as React.ChangeEvent<HTMLSelectElement>;

    onChange(syntheticEvent);
    setIsOpen(false);
  };

  const selectedLabel =
    options.find((opt) => opt.value === value)?.label || "Select";

  return (
    <div
      ref={dropdownRef}
      className={`relative inline-block ${className || ""}`}
    >
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
      >
        <span>{selectedLabel}</span>
        <svg
          className={`w-4 h-4 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
        {/* <Funnel size={18} /> */}
      </button>

      {isOpen && (
        <div
        className={`absolute right-0 mt-2 w-max min-w-[160px] bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10 ${positionCss[position]}`}
      >
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => handleSelect(option.value)}
            className={`block whitespace-nowrap w-full text-left px-4 py-2.5 text-sm hover:bg-blue-50 transition-colors ${
              value === option.value
                ? "bg-blue-50 text-blue-600 font-medium"
                : "text-gray-700"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
      
      )}
    </div>
  );
};

export default CustomDropdown;
