// import React, { useState, useRef, useEffect } from "react";

// interface Option {
//   value: string;
//   label: string;
// }

// interface SearchableSelectProps {
//   options: Option[];
//   value: string;
//   onChange: (value: string) => void;
//   placeholder?: string;
//   disabled?: boolean;
// }

// const SearchableSelect: React.FC<SearchableSelectProps> = ({
//   options,
//   value,
//   onChange,
//   placeholder = "Search...",
//   disabled = false,
// }) => {
//   const [isOpen, setIsOpen] = useState(false);
//   const [searchTerm, setSearchTerm] = useState("");
//   const wrapperRef = useRef<HTMLDivElement>(null);

//   const selectedOption = options.find((opt) => opt.value === value);

//   const filteredOptions = options.filter((option) =>
//     option.label.toLowerCase().includes(searchTerm.toLowerCase())
//   );

//   useEffect(() => {
//     const handleClickOutside = (event: MouseEvent) => {
//       if (
//         wrapperRef.current &&
//         !wrapperRef.current.contains(event.target as Node)
//       ) {
//         setIsOpen(false);
//         setSearchTerm("");
//       }
//     };

//     document.addEventListener("mousedown", handleClickOutside);
//     return () => document.removeEventListener("mousedown", handleClickOutside);
//   }, []);

//   const handleSelect = (optionValue: string) => {
//     onChange(optionValue);
//     setIsOpen(false);
//     setSearchTerm("");
//   };

//   return (
//     <div ref={wrapperRef} className="relative w-full">
//       <input
//         type="text"
//         value={isOpen ? searchTerm : selectedOption?.label || ""}
//         onChange={(e) => {
//           setSearchTerm(e.target.value);
//           if (!isOpen) setIsOpen(true);
//         }}
//         onFocus={() => setIsOpen(true)}
//         placeholder={placeholder}
//         disabled={disabled}
//         className="w-full p-1 border rounded text-sm"
//       />

//       {isOpen && !disabled && (
//         <div className="absolute z-10 w-full mt-1 bg-white border rounded shadow-lg max-h-60 overflow-y-auto">
//           {filteredOptions.length > 0 ? (
//             filteredOptions.map((option) => (
//               <div
//                 key={option.value}
//                 onClick={() => handleSelect(option.value)}
//                 className="p-2 hover:bg-gray-100 cursor-pointer text-sm"
//               >
//                 {option.label}
//               </div>
//             ))
//           ) : (
//             <div className="p-2 text-gray-500 text-sm">No results found</div>
//           )}
//         </div>
//       )}
//     </div>
//   );
// };

// export default SearchableSelect;

import React, { useEffect, useRef, useState } from "react";

export interface Option {
  value: string;
  label: string;
}

interface Props {
  options: Option[]; // initial options
  value: string; // selected value (employee.name)
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  onSearch?: (q: string) => Promise<Option[]>; // optional async search
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
  const debounceRef = useRef<number | null>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [term, setTerm] = useState("");
  const [internalOptions, setInternalOptions] = useState<Option[]>(options);
  const [loading, setLoading] = useState(false);

  // Keep a separate selectedLabel state so we can show it when the dropdown is closed,
  // even if the option isn't present in `options` anymore.
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);

  // Sync internalOptions whenever parent `options` changes (fallback list).
  useEffect(() => {
    setInternalOptions(options);
  }, [options]);

  // When parent changes `value`, try to update selectedLabel by finding it from options/internalOptions.
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
      // value exists but not in current lists: keep current selectedLabel if already set,
      // otherwise set to the raw value (fallback) so user sees something.
      setSelectedLabel((prev) => prev ?? String(value));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, options, internalOptions]);

  // click outside closes
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        setTerm("");
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  // debounced search or local filter when open
  useEffect(() => {
    if (!isOpen) return;

    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
    }

    debounceRef.current = window.setTimeout(async () => {
      const q = term.trim();

      if (onSearch) {
        // if short, return the passed options as fallback
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
          // on error, clear results (or keep previous)
          setInternalOptions([]);
        } finally {
          setLoading(false);
        }
      } else {
        // local filter
        setInternalOptions(
          options.filter((o) => o.label.toLowerCase().includes(q.toLowerCase()))
        );
      }
    }, debounceMs);

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [term, isOpen]);

  const handleSelect = (opt: Option) => {
    onChange(opt.value);
    setSelectedLabel(opt.label); // remember label even if options are later replaced
    setIsOpen(false);
    setTerm("");
  };

  // input shows search term when open, otherwise show selectedLabel (if available) or find label
  const displayedValue = isOpen
    ? term
    : selectedLabel ??
      internalOptions.find((o) => o.value === value)?.label ??
      options.find((o) => o.value === value)?.label ??
      "";

  return (
    <div ref={wrapperRef} className="relative w-full">
      <input
        type="text"
        value={displayedValue}
        onChange={(e) => {
          setTerm(e.target.value);
          if (!isOpen) setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full p-1 border rounded text-sm"
      />

      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-white border rounded shadow-lg max-h-60 overflow-y-auto">
          {loading ? (
            <div className="p-2 text-sm">Loading...</div>
          ) : internalOptions.length > 0 ? (
            internalOptions.map((opt) => (
              <div
                key={opt.value}
                onClick={() => handleSelect(opt)}
                className="p-2 hover:bg-gray-100 cursor-pointer text-sm flex items-center gap-2"
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
            <div className="p-2 text-gray-500 text-sm">No results found</div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchableSelect;
