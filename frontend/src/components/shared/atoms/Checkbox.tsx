import React, { forwardRef, useEffect, useRef } from "react";

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size" | "onChange"> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  label?: React.ReactNode;
  indeterminate?: boolean;
  size?: "sm" | "md" | "lg";
  containerClassName?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  (
    {
      checked = false,
      onCheckedChange,
      onChange,
      disabled = false,
      label,
      indeterminate = false,
      size = "md",
      className = "",
      containerClassName = "",
      title,
      ...props
    },
    forwardedRef
  ) => {
    const innerRef = useRef<HTMLInputElement>(null);
    const resolvedRef = (forwardedRef as React.RefObject<HTMLInputElement>) || innerRef;

    useEffect(() => {
      if (resolvedRef.current) {
        resolvedRef.current.indeterminate = !!indeterminate;
      }
    }, [indeterminate, resolvedRef]);

    const sizeClasses = {
      sm: "w-3.5 h-3.5",
      md: "w-4 h-4",
      lg: "w-5 h-5",
    }[size];

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (disabled) return;
      onChange?.(e);
      onCheckedChange?.(e.target.checked);
    };

    const inputElement = (
      <input
        ref={resolvedRef}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={handleChange}
        title={title}
        className={`
          ${sizeClasses}
          text-primary
          bg-white
          border-gray-300
          rounded
          focus:ring-2
          focus:ring-primary/20
          focus:ring-offset-0
          accent-primary
          transition-all
          cursor-pointer
          disabled:cursor-not-allowed
          disabled:opacity-40
          ${className}
        `}
        {...props}
      />
    );

    if (!label) {
      return (
        <span className={`inline-flex items-center justify-center ${containerClassName}`}>
          {inputElement}
        </span>
      );
    }

    return (
      <label
        className={`inline-flex items-center gap-2 cursor-pointer ${
          disabled ? "cursor-not-allowed opacity-50" : ""
        } ${containerClassName}`}
        title={title}
      >
        {inputElement}
        {typeof label === "string" ? (
          <span className="text-sm font-medium text-gray-700 select-none">{label}</span>
        ) : (
          label
        )}
      </label>
    );
  }
);

Checkbox.displayName = "Checkbox";

export default Checkbox;
