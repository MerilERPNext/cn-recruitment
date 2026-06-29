import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Loader2, Search, X } from "lucide-react";
import { EmployeeService } from "../../services/employeeService";
import { useCurrentEmployee } from "../../hooks/useEmployee";

const SEARCH_LIMIT = 20;

/** Shape returned by cn_hrms_core search_employees API */
interface SearchEmployeeResult {
    employee_id: string;
    employee_name: string;
    display_text: string;
    department: string | null;
    department_display: string | null;
    designation: string | null;
    designation_display: string | null;
    branch: string | null;
    branch_display: string | null;
    image: string | null;
    company: string | null;
}

interface EmployeeOption {
    id: string;
    name: string;
    department?: string;
    designation?: string;
}

interface EmployeeSelectProps {
    value: string;
    onChange: (employeeId: string) => void;
    placeholder?: string;
    disabled?: boolean;
}

const EmployeeSelect: React.FC<EmployeeSelectProps> = ({
    value,
    onChange,
    placeholder = "Select Employee",
    disabled = false,
}) => {
    const wrapperRef = useRef<HTMLDivElement | null>(null);
    const dropdownRef = useRef<HTMLDivElement | null>(null);
    const listRef = useRef<HTMLDivElement | null>(null);
    const inputRef = useRef<HTMLInputElement | null>(null);

    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [employees, setEmployees] = useState<EmployeeOption[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedLabel, setSelectedLabel] = useState("");
    const [positionReady, setPositionReady] = useState(false);
    const [dropdownPosition, setDropdownPosition] = useState({
        top: 0,
        left: 0,
        width: 0,
    });

    const debounceRef = useRef<number | null>(null);
    const initialDataRef = useRef<EmployeeOption[] | null>(null);

    // Get current user's employee record to pass to backend for exclusion
    const { data: currentEmployee } = useCurrentEmployee();
    const currentEmployeeId = currentEmployee?.name ?? "";

    const mapEmployees = (data: SearchEmployeeResult[]): EmployeeOption[] =>
        data.map((e) => ({
            id: e.employee_id,
            name: e.employee_name || e.employee_id,
            department: e.department_display ?? e.department ?? undefined,
            designation: e.designation_display ?? e.designation ?? undefined,
        }));

    // Fetch employees using cn_hrms_core search_employees API
    const fetchEmployees = useCallback(
        async (search: string) => {
            setIsLoading(true);

            try {
                const data = await EmployeeService.getSearchMembers(
                    search.trim() || undefined,
                    SEARCH_LIMIT,
                    true, // exclude current user's employee
                    currentEmployeeId || undefined,
                ) as unknown as SearchEmployeeResult[];

                const mapped = mapEmployees(data);
                setEmployees(mapped);

                // Cache initial (no-search) data
                if (!search.trim()) {
                    initialDataRef.current = mapped;
                }
            } catch {
                setEmployees([]);
            } finally {
                setIsLoading(false);
            }
        },
        [currentEmployeeId],
    );

    // Initial load when dropdown opens — use cached data if available
    useEffect(() => {
        if (!isOpen) return;

        if (initialDataRef.current) {
            setEmployees(initialDataRef.current);
        } else {
            fetchEmployees("");
        }
    }, [isOpen, fetchEmployees]);

    // Debounced search — only fires when searchTerm actually changes
    useEffect(() => {
        if (!isOpen) return;

        // If empty, restore cached initial data instead of re-fetching
        if (!searchTerm.trim()) {
            if (initialDataRef.current) {
                setEmployees(initialDataRef.current);
            } else {
                fetchEmployees("");
            }
            return;
        }

        if (debounceRef.current) window.clearTimeout(debounceRef.current);

        debounceRef.current = window.setTimeout(() => {
            fetchEmployees(searchTerm);
        }, 300);

        return () => {
            if (debounceRef.current) window.clearTimeout(debounceRef.current);
        };
    }, [searchTerm, isOpen, fetchEmployees]);

    // Dropdown position — useLayoutEffect to compute position before paint
    useLayoutEffect(() => {
        if (isOpen && wrapperRef.current) {
            const updatePos = () => {
                if (!wrapperRef.current) return;
                const rect = wrapperRef.current.getBoundingClientRect();
                setDropdownPosition({
                    top: rect.bottom + window.scrollY,
                    left: rect.left + window.scrollX,
                    width: rect.width,
                });
                setPositionReady(true);
            };
            updatePos();
            const onScroll = () => updatePos();
            window.addEventListener("scroll", onScroll, true);
            window.addEventListener("resize", updatePos);
            return () => {
                window.removeEventListener("scroll", onScroll, true);
                window.removeEventListener("resize", updatePos);
                setPositionReady(false);
            };
        } else {
            setPositionReady(false);
        }
    }, [isOpen]);

    // Focus the input after the dropdown is ready
    useEffect(() => {
        if (isOpen && positionReady) {
            // small timeout to ensure the portal input is mounted & inputRef is set
            const t = window.setTimeout(() => inputRef.current?.focus(), 0);
            return () => window.clearTimeout(t);
        }
    }, [isOpen, positionReady]);

    // Click outside — attach listener only while dropdown is open to avoid race
    useEffect(() => {
        if (!isOpen) return;

        const handleOutside = (e: MouseEvent) => {
            const target = e.target as Node;
            // if dropdownRef isn't ready yet, be conservative and don't close immediately
            if (!dropdownRef.current) return;
            if (
                !wrapperRef.current?.contains(target) &&
                !dropdownRef.current?.contains(target)
            ) {
                setIsOpen(false);
                setSearchTerm("");
            }
        };
        document.addEventListener("mousedown", handleOutside);
        return () => document.removeEventListener("mousedown", handleOutside);
    }, [isOpen]);

    // Resolve selected label
    useEffect(() => {
        if (!value) {
            setSelectedLabel("");
            return;
        }
        const found = employees.find((e) => e.id === value);
        if (found) {
            setSelectedLabel(`${found.name} (${found.id})`);
        }
    }, [value, employees]);

    const handleSelect = (emp: EmployeeOption) => {
        onChange(emp.id);
        setSelectedLabel(`${emp.name} (${emp.id})`);
        setIsOpen(false);
        setSearchTerm("");
    };

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange("");
        setSelectedLabel("");
    };

    const dropdown =
        isOpen && !disabled && positionReady ? (
            <div
                ref={dropdownRef}
                style={{
                    position: "absolute",
                    top: `${dropdownPosition.top}px`,
                    left: `${dropdownPosition.left}px`,
                    width: `${dropdownPosition.width}px`,
                    zIndex: 9999,
                }}
                className="mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden"
            >
                {/* Search input inside dropdown */}
                <div className="p-2 border-b border-gray-100">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                        <input
                            ref={inputRef}
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search by name or ID..."
                            className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                </div>

                {/* Employee list with scroll */}
                <div
                    ref={listRef}
                    className="max-h-52 overflow-y-auto"
                >
                    {isLoading ? (
                        <div className="flex items-center justify-center py-6">
                            <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                        </div>
                    ) : employees.length > 0 ? (
                        <>
                            {employees.map((emp) => (
                                <div
                                    key={emp.id}
                                    onClick={() => handleSelect(emp)}
                                    className={`px-3 py-2 cursor-pointer text-sm transition-colors hover:bg-blue-50 ${value === emp.id ? "bg-blue-50 text-blue-700" : "text-gray-700"
                                        }`}
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" || e.key === " ") handleSelect(emp);
                                    }}
                                >
                                    <div className="font-medium">{emp.name}</div>
                                    <div className="text-xs text-gray-400">
                                        {emp.id}
                                        {emp.department ? ` · ${emp.department}` : ""}
                                    </div>
                                </div>
                            ))}
                        </>
                    ) : (
                        <div className="px-3 py-4 text-center text-sm text-gray-400">
                            No employees found
                        </div>
                    )}
                </div>
            </div>
        ) : null;

    return (
        <div ref={wrapperRef} className="relative w-full">
            <div
                onClick={() => !disabled && setIsOpen((s) => !s)}
                className={`w-full flex items-center justify-between px-3 py-2 border rounded-lg text-sm cursor-pointer transition-all ${disabled
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200"
                        : isOpen
                            ? "border-blue-500 ring-2 ring-blue-500/20"
                            : "border-gray-300 hover:border-gray-400"
                    } ${selectedLabel ? "text-gray-900" : "text-gray-500"}`}
            >
                <span className="truncate">{selectedLabel || placeholder}</span>
                <div className="flex items-center gap-1 ml-2 shrink-0">
                    {value && (
                        <button
                            onClick={handleClear}
                            className="p-0.5 rounded hover:bg-gray-200 transition-colors"
                            aria-label="Clear"
                        >
                            <X className="w-3.5 h-3.5 text-gray-400" />
                        </button>
                    )}
                    <ChevronDown
                        className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
                    />
                </div>
            </div>

            {typeof document !== "undefined" && dropdown && createPortal(dropdown, document.body)}
        </div>
    );
};

export default EmployeeSelect;