import { ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import Button from "./Button";

interface SelectOption<T = string> {
    label: string;
    value: T;
}

interface SelectProps<T> {
    label?: string;
    options: SelectOption<T>[];
    value: SelectOption<T>;
    onChange: (value: SelectOption<T>) => void;
    disabled?: boolean;
    className?: string;
}

export const Select = <T extends string | number>({
    label,
    options,
    value,
    onChange,
    disabled = false,
    className = "",
}: SelectProps<T>) => {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    return (
        <div className={`w-64 ${className}`} ref={ref}>
            {label && (
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    {label}
                </label>
            )}

            <Button
                variant="subtle"
                size="md"
                disabled={disabled}
                onClick={() => setOpen((v) => !v)}
                className={`
          flex w-full items-center justify-between
          rounded-lg border border-gray-300
          bg-white px-4 py-2.5
          text-gray-900
          shadow-sm transition
          focus:outline-none focus:ring-2 focus:ring-primary-500/30
          hover:border-gray-400
          ${disabled
                        ? "cursor-not-allowed bg-gray-100 text-gray-400 border-gray-200"
                        : ""
                    }
        `}
            >
                <span className="truncate font-medium">{value.label}</span>
                <ChevronDown
                    className={`h-4 w-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
                />
            </Button>

            {open && !disabled && (
                <div
                    className="
            absolute z-50 mt-2 w-64
            rounded-xl border border-gray-200
            bg-white shadow-lg
            animate-in fade-in zoom-in-95
          "
                >
                    <ul className="max-h-60 overflow-auto p-1">
                        {options.map((opt) => {
                            const selected = opt.value === value.value;

                            return (
                                <li
                                    key={String(opt.value)}
                                    onClick={() => {
                                        onChange(opt);
                                        setOpen(false);
                                    }}
                                    className={`
                    flex cursor-pointer items-center
                    rounded-lg px-3 py-2 text-sm
                    transition
                    ${selected
                                            ? "bg-primary-50 text-primary-600 font-medium"
                                            : "text-gray-700 hover:bg-gray-100"
                                        }
                  `}
                                >
                                    {opt.label}
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}
        </div>
    );
};
