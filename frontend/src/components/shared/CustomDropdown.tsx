// import { Funnel } from "lucide-react";
import React, { useState, useRef, useEffect, useCallback } from "react";
import ReactDOM from "react-dom";
import Button, { ButtonContentAlign } from "./atoms/Button";

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
  label?: string;
  contentAlign?: ButtonContentAlign;
  variant?: "contain" | "outline" | "subtle" | "soft";
  emptyMessage?: string;
  menuClassName?: string;
  customTrigger?: React.ReactNode;
}

const CustomDropdown: React.FC<CustomDropdownProps> = ({
  value,
  onChange,
  className,
  options,
  position = "bottom-left",
  label = "Select",
  contentAlign = "center",
  emptyMessage = "No options available",
  menuClassName,
  customTrigger,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});
  const triggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const computeMenuPosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const isTop = position.startsWith("top");
    const isRight = position.endsWith("right");

    const style: React.CSSProperties = {
      position: "fixed",
      zIndex: 99999,
      minWidth: 160
    };

    if (isTop) {
      style.bottom = window.innerHeight - rect.top + 10;
    } else {
      style.top = rect.bottom + 8;
    }

    if (isRight) {
      style.left = rect.left;
    } else {
      style.right = window.innerWidth - rect.right;
    }

    setMenuStyle(style);
  }, [position]);

  useEffect(() => {
    if (isOpen) {
      computeMenuPosition();
    }
  }, [isOpen, computeMenuPosition]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        menuRef.current &&
        !menuRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    const handleScroll = () => {
      if (isOpen) computeMenuPosition();
    };

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", computeMenuPosition);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", computeMenuPosition);
    };
  }, [isOpen, computeMenuPosition]);

  const handleSelect = (optionValue: string): void => {
    const syntheticEvent = {
      target: { value: optionValue },
      currentTarget: { value: optionValue },
    } as React.ChangeEvent<HTMLSelectElement>;

    onChange(syntheticEvent);
    setIsOpen(false);
  };

  const selectedLabel =
    options.find((opt) => opt.value === value)?.label || label;

  const menu = isOpen
    ? ReactDOM.createPortal(
      <div
        ref={menuRef}
        style={menuStyle}
        className={`bg-white rounded-lg shadow-lg border border-gray-200 py-1 max-h-60 overflow-y-auto ${menuClassName || ""}`}
      >
        {options.length === 0 ? (
          <div className="px-4 py-2.5 text-sm text-gray-500 whitespace-nowrap">
            {emptyMessage}
          </div>
        ) : (
          options.map((option) => (
            <Button
              size="md"
              variant={value === option.value ? "soft" : "subtle"}
              bgColor={value === option.value ? "primary" : "disabled"}
              key={option.value}
              onClick={() => handleSelect(option.value)}
              contentAlign={contentAlign}
              className="block whitespace-nowrap w-full text-left px-4 py-2.5 hover:bg-primary-50 transition-colors"
            >
              {option.label}
            </Button>
          ))
        )}
      </div>,
      document.body
    )
    : null;

  return (
    <div
      ref={triggerRef}
      className={`relative inline-block ${className || ""}`}
    >
      {customTrigger ? (
        <div onClick={() => setIsOpen((prev) => !prev)} className="cursor-pointer inline-flex items-center justify-center h-full">
          {customTrigger}
        </div>
      ) : (
        <Button
          variant="outline"
          bgColor="white"
          size="md"
          onClick={() => setIsOpen((prev) => !prev)}
          className="flex items-center gap-2 border border-primary/20 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors"
        >
          <span>{selectedLabel}</span>
          <svg
            className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
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
        </Button>
      )}

      {menu}
    </div>
  );
};

export default CustomDropdown;
