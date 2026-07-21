import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export interface Option {
  value: string;
  label: string;
}

interface Props {
  options: Option[];
  value: string;
  onChange: (value: string, label?: string) => void; // Add optional label parameter
  placeholder?: string;
  disabled?: boolean;
  onSearch?: (q: string) => Promise<Option[]>;
  debounceMs?: number;
}

const SearchableSelect: React.FC<Props> = ({
  options,
  value,
  onChange,
  placeholder = "Search...",
  disabled = false,
  onSearch,
  debounceMs = 300,
}) => {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const debounceRef = useRef<number | null>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [term, setTerm] = useState("");
  const [internalOptions, setInternalOptions] = useState<Option[]>(options);
  const [loading, setLoading] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState({
    top: 0,
    left: 0,
    width: 0,
  });

  useEffect(() => {
    setInternalOptions(options);
  }, [options]);

  useEffect(() => {
    if (!value) {
      setSelectedLabel(null);
      return;
    }

    const found =
      internalOptions.find((o) => o.value === value) ||
      options.find((o) => o.value === value);

    if (found) {
      setSelectedLabel(found.label);
    } else {
      setSelectedLabel((prev) => prev ?? String(value));
    }
  }, [value, options, internalOptions]);

  // Update dropdown position when open
  useEffect(() => {
    if (isOpen && inputRef.current) {
      const updatePosition = () => {
        const rect = inputRef.current!.getBoundingClientRect();
        setDropdownPosition({
          top: rect.bottom + window.scrollY,
          left: rect.left + window.scrollX,
          width: rect.width,
        });
      };

      updatePosition();
      window.addEventListener("scroll", updatePosition, true);
      window.addEventListener("resize", updatePosition);

      return () => {
        window.removeEventListener("scroll", updatePosition, true);
        window.removeEventListener("resize", updatePosition);
      };
    }
  }, [isOpen]);

  // Click outside detection - check BOTH input and dropdown refs
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      const target = e.target as Node;

      const clickedInsideInput = wrapperRef.current?.contains(target);
      const clickedInsideDropdown = dropdownRef.current?.contains(target);

      if (!clickedInsideInput && !clickedInsideDropdown) {
        setIsOpen(false);
        setTerm("");
      }
    };

    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
    }

    debounceRef.current = window.setTimeout(async () => {
      const q = term.trim();

      if (onSearch) {
        if (q.length < 2) {
          setInternalOptions(options);
          setLoading(false);
          return;
        }
        setLoading(true);
        try {
          const res = await onSearch(q);
          setInternalOptions(res || []);
        } catch (err) {
          console.error(err);
          setInternalOptions([]);
        } finally {
          setLoading(false);
        }
      } else {
        setInternalOptions(
          options.filter((o) => o.label.toLowerCase().includes(q.toLowerCase()))
        );
      }
    }, debounceMs);

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [term, isOpen, onSearch, options, debounceMs]);

  const handleSelect = (opt: Option) => {
    onChange(opt.value, opt.label); // Pass both value and label
    setSelectedLabel(opt.label);
    setIsOpen(false);
    setTerm("");
  };

  const displayedValue = isOpen
    ? term
    : selectedLabel ??
    internalOptions.find((o) => o.value === value)?.label ??
    options.find((o) => o.value === value)?.label ??
    "";

  const dropdown = isOpen && !disabled && (
    <div
      ref={dropdownRef}
      style={{
        position: "absolute",
        top: `${dropdownPosition.top}px`,
        left: `${dropdownPosition.left}px`,
        width: `${dropdownPosition.width}px`,
        zIndex: 9999,
      }}
      className="mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto"
    >
      {loading ? (
        <div className="p-2 text-sm">Loading...</div>
      ) : internalOptions.length > 0 ? (
        internalOptions.map((opt) => (
          <div
            key={opt.value}
            onClick={() => handleSelect(opt)}
            className="px-3 py-2.5 hover:bg-blue-50 cursor-pointer text-sm text-gray-700 flex items-center gap-2 transition-colors"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") handleSelect(opt);
            }}
          >
            {opt.label}
          </div>
        ))
      ) : (
        <div className="px-3 py-2.5 text-gray-400 text-sm">No results found</div>
      )}
    </div>
  );

  return (
    <div ref={wrapperRef} className="relative w-full">
      <input
        ref={inputRef}
        type="text"
        value={displayedValue}
        onChange={(e) => {
          setTerm(e.target.value);
          if (!isOpen) setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all text-sm"
      />

      {typeof document !== "undefined" && createPortal(dropdown, document.body)}
    </div>
  );
};

export default SearchableSelect;
