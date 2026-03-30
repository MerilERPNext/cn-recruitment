import React, { ReactNode, useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { User, Shield } from "lucide-react";

interface AllocatedToTooltipProps {
    /** User names — string or string[] */
    users?: string | string[];
    /** Fallback user identifier (single or array) */
    allocated_to_user?: string | string[] | null;
    /** Fallback username (single string) */
    username?: string;
    /** Fallback allocated_to (single or array) */
    allocated_to?: string | string[] | null;
    /** Role names array */
    roles?: string[];
    /** Single role fallback */
    role?: string;
    children: ReactNode;
    position?: "top" | "bottom" | "left" | "right";
    /** If false, do not show user, role label or badge in the tooltip. Default true. */
    showUserRoleLables?: boolean;
}

const AllocatedToTooltip: React.FC<AllocatedToTooltipProps> = ({
    users,
    allocated_to_user,
    username,
    allocated_to,
    roles,
    role,
    children,
    position = "top",
    showUserRoleLables = false,
}) => {
    /** Merge all user sources → deduped array */
    const usersArray: string[] = React.useMemo(() => {
        const normalize = (value?: string | string[] | null): string[] => {
            if (!value && value !== "") return [];
            if (Array.isArray(value)) return value.filter(Boolean).map(v => String(v));
            return [String(value).trim()].filter(Boolean);
        };

        return Array.from(new Set([
            ...normalize(users),
            ...normalize(allocated_to_user),
            ...normalize(username),
            ...normalize(allocated_to),
        ]));
    }, [users, allocated_to_user, username, allocated_to]);

    /** Merge roles + role → deduped array */
    const rolesArray: string[] = React.useMemo(() => {
        const base = (roles ?? []).filter(Boolean);
        if (typeof role === "string" && role) base.push(role);
        return [...new Set(base)];
    }, [roles, role]);

    const hasUsers = usersArray.length > 0;
    const hasRoles = rolesArray.length > 0;
    const hasContent = hasUsers || hasRoles;

    const [isVisible, setIsVisible] = useState(false);
    const [coords, setCoords] = useState({ top: 0, left: 0 });
    const triggerRef = useRef<HTMLDivElement>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isTouchRef = useRef(false);

    const calculatePosition = useCallback(() => {
        if (!triggerRef.current || !tooltipRef.current) return;
        // getBoundingClientRect() is already viewport-relative.
        // Since the tooltip is position:fixed we must NOT add scrollY/scrollX.
        const triggerRect = triggerRef.current.getBoundingClientRect();
        const tooltipRect = tooltipRef.current.getBoundingClientRect();
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const PADDING = 8;

        let top = 0;
        let left = 0;

        // Centre horizontally on the trigger
        left = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;

        // Auto-flip: prefer the requested side, but flip if it would clip
        const spaceBelow = vh - triggerRect.bottom;
        const spaceAbove = triggerRect.top;
        const fits = (side: "top" | "bottom") =>
            side === "bottom"
                ? spaceBelow >= tooltipRect.height + PADDING
                : spaceAbove >= tooltipRect.height + PADDING;

        let resolvedPosition = position;
        if ((position === "bottom" || position === "top") && !fits(position as "top" | "bottom")) {
            // flip to the other side if current side doesn't fit
            resolvedPosition = position === "bottom" ? "top" : "bottom";
        }

        switch (resolvedPosition) {
            case "bottom":
                top = triggerRect.bottom + PADDING;
                break;
            case "left":
                top = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2;
                left = triggerRect.left - tooltipRect.width - PADDING;
                break;
            case "right":
                top = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2;
                left = triggerRect.right + PADDING;
                break;
            case "top":
            default:
                top = triggerRect.top - tooltipRect.height - PADDING;
                break;
        }

        // Clamp horizontal so tooltip never overflows left/right edge
        left = Math.max(PADDING, Math.min(left, vw - tooltipRect.width - PADDING));
        // Clamp vertical so tooltip never overflows top/bottom edge
        top = Math.max(PADDING, Math.min(top, vh - tooltipRect.height - PADDING));

        setCoords({ top, left });
    }, [position]);

    useEffect(() => {
        if (isVisible) {
            // recalc after next paint to ensure tooltip size is measured correctly
            requestAnimationFrame(() => {
                calculatePosition();
            });
            window.addEventListener("scroll", calculatePosition, true);
            window.addEventListener("resize", calculatePosition);
            return () => {
                window.removeEventListener("scroll", calculatePosition, true);
                window.removeEventListener("resize", calculatePosition);
            };
        }
    }, [isVisible, calculatePosition]);

    const show = () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => setIsVisible(true), 200);
    };

    const hide = () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setIsVisible(false);
    };

    const toggle = (e: React.MouseEvent | React.TouchEvent) => {
        e.stopPropagation();
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setIsVisible((v) => !v);
    };

    // Dismiss on outside click/tap
    useEffect(() => {
        if (!isVisible) return;
        const handleOutside = (e: MouseEvent | TouchEvent) => {
            if (
                triggerRef.current && !triggerRef.current.contains(e.target as Node) &&
                tooltipRef.current && !tooltipRef.current.contains(e.target as Node)
            ) {
                setIsVisible(false);
            }
        };
        document.addEventListener("mousedown", handleOutside);
        document.addEventListener("touchstart", handleOutside);
        return () => {
            document.removeEventListener("mousedown", handleOutside);
            document.removeEventListener("touchstart", handleOutside);
        };
    }, [isVisible]);

    const getArrowClasses = () => {
        switch (position) {
            case "bottom":
                return "bottom-full left-1/2 -translate-x-1/2 border-l-[6px] border-r-[6px] border-b-[6px] border-l-transparent border-r-transparent border-b-white";
            case "left":
                return "left-full top-1/2 -translate-y-1/2 border-t-[6px] border-b-[6px] border-l-[6px] border-t-transparent border-b-transparent border-l-white";
            case "right":
                return "right-full top-1/2 -translate-y-1/2 border-t-[6px] border-b-[6px] border-r-[6px] border-t-transparent border-b-transparent border-r-white";
            case "top":
            default:
                return "top-full left-1/2 -translate-x-1/2 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-white";
        }
    };

    const tooltipEl = isVisible && (
        <div
            ref={tooltipRef}
            role="tooltip"
            className="fixed z-[9999]"
            style={{ top: `${coords.top}px`, left: `${coords.left}px` }}
        >
            <div
                className="
          bg-white rounded-xl shadow-xl
          border border-primary-100
          min-w-[200px] max-w-[320px]
          max-h-[60vh] overflow-y-auto
        "
            >
                {/* Header */}
                <div className="bg-primary-50 px-3.5 py-2 border-b border-primary-100">
                    <span className="text-[11px] font-brand font-semibold uppercase tracking-wider text-primary-700">
                        Allocated To
                    </span>
                </div>

                <div className="flex flex-col gap-2.5 p-3.5">
                    {/* Fallback Section */}
                    {!hasContent && (
                        <div className="flex items-center gap-2.5">
                            <span className="text-[11px] font-brand font-medium italic text-gray-500">
                                Not Allocated
                            </span>
                        </div>
                    )}

                    {!showUserRoleLables && hasContent && (
                        <div className="flex flex-wrap gap-1 mt-1">
                            {usersArray.map((u, idx) => (
                                <span
                                    key={`val-u-${idx}-${u}`}
                                    className="
                                        inline-flex items-center
                                        text-[11px] font-brand font-medium
                                        text-primary-700 bg-primary-50
                                        border border-primary-200
                                        px-2 py-0.5 rounded-md max-w-full truncate
                                    "
                                    title={u}
                                >
                                    {u}
                                </span>
                            ))}
                            {rolesArray.map((r, idx) => (
                                <span
                                    key={`val-r-${idx}-${r}`}
                                    className="
                                        inline-flex items-center
                                        text-[11px] font-brand font-medium
                                        text-secondary-700 bg-secondary-50
                                        border border-secondary-200
                                        px-2 py-0.5 rounded-md
                                    "
                                >
                                    {r}
                                </span>
                            ))}
                        </div>
                    )}

                    {/* Users Section (now badges) */}
                    {showUserRoleLables && hasUsers && (
                        <div className="flex items-start gap-2.5">
                            <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary-50 shrink-0">
                                <User className="w-3.5 h-3.5 text-primary-600" />
                            </div>
                            <div className="flex flex-col gap-0.5 min-w-0">
                                <span className="text-[10px] font-brand font-semibold uppercase tracking-wider text-gray-500">
                                    {usersArray.length > 1 ? "Users" : "User"}
                                </span>

                                <div className="flex flex-wrap gap-1 mt-1">
                                    {usersArray.map((u, idx) => (
                                        <span
                                            key={`user-${idx}-${u}`}
                                            className="
                        inline-flex items-center
                        text-[11px] font-brand font-medium
                        text-primary-700 bg-primary-50
                        border border-primary-200
                        px-2 py-0.5 rounded-md max-w-full truncate
                      "
                                            title={u}
                                        >
                                            {u}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Divider between sections */}
                    {showUserRoleLables && hasUsers && hasRoles && <div className="border-t border-gray-100" />}

                    {/* Roles Section */}
                    {showUserRoleLables && hasRoles && (
                        <div className="flex items-start gap-2.5">
                            <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-secondary-50 shrink-0">
                                <Shield className="w-3.5 h-3.5 text-secondary-600" />
                            </div>
                            <div className="flex flex-col gap-1 min-w-0">
                                <span className="text-[10px] font-brand font-semibold uppercase tracking-wider text-gray-500">
                                    {rolesArray.length > 1 ? "Roles" : "Role"}
                                </span>
                                <div className="flex flex-wrap gap-1">
                                    {rolesArray.map((r, idx) => (
                                        <span
                                            key={`role-${idx}-${r}`}
                                            className="
                        inline-flex items-center
                        text-[11px] font-brand font-medium
                        text-secondary-700 bg-secondary-50
                        border border-secondary-200
                        px-2 py-0.5 rounded-md
                      "
                                        >
                                            {r}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Arrow */}
            <div
                className={`absolute w-0 h-0 ${getArrowClasses()}`}
                style={{ filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.06))" }}
            />
        </div>
    );

    return (
        <>
            <div
                ref={triggerRef}
                className="inline-block"
                onMouseEnter={() => { if (!isTouchRef.current) show(); }}
                onMouseLeave={() => { if (!isTouchRef.current) hide(); }}
                onFocus={show}
                onBlur={hide}
                onTouchStart={() => { isTouchRef.current = true; }}
                onClick={toggle}
            >
                {children}
            </div>
            {isVisible && createPortal(tooltipEl, document.body)}
        </>
    );
};

export default AllocatedToTooltip;