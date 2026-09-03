import React, { ReactNode, useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { User, Shield } from "lucide-react";
import { allocatedToType } from "../../types/allocatedToTooltip";
import { RoleAssignedUsersType } from "../../types/flows";
import RoleUsersModal from "./RoleUsersModal";

interface AllocatedToTooltipProps {
    users?: string | string[] | allocatedToType[];
    allocated_to_user?: string | string[] | null | allocatedToType[];
    username?: string;
    allocated_to?: string | string[] | null | allocatedToType[];
    roles?: string[];
    role?: string;
    title?: string;
    children: ReactNode;
    position?: "top" | "bottom" | "left" | "right";
    showUserRoleLables?: boolean;
    RoleAssignedUsers?: RoleAssignedUsersType[];
    overrideDesignation?: string;
}

type NormalizedUser = {
    name: string;
    designation?: string;
    employee?: string;
};

const AllocatedToTooltip: React.FC<AllocatedToTooltipProps> = ({
    users,
    title = "Allocated To",
    allocated_to_user,
    username,
    allocated_to,
    roles,
    role,
    children,
    position = "top",
    showUserRoleLables = false,
    RoleAssignedUsers,
    overrideDesignation,
}) => {
    const [selectedRoleData, setSelectedRoleData] = useState<RoleAssignedUsersType | null>(null);
    const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);

    /** Merge all user sources → deduped array */
    const usersArray: NormalizedUser[] = React.useMemo(() => {
        const normalize = (
            value?: string | string[] | allocatedToType[] | null
        ): NormalizedUser[] => {
            if (value == null) return [];

            if (Array.isArray(value)) {
                return value
                    .map((v): NormalizedUser | null => {
                        if (!v) return null;

                        if (typeof v === "string") {
                            const name = v.trim();
                            return name ? { name, designation: overrideDesignation } : null;
                        }

                        if (typeof v === "object") {
                            const name = v.name?.trim();
                            if (!name) return null;

                            return {
                                name,
                                designation: overrideDesignation || v.designation_name?.trim() || undefined,
                                employee: v.employee?.trim() || undefined,
                            };
                        }

                        return null;
                    })
                    .filter((v): v is NormalizedUser => Boolean(v));
            }

            const str = String(value).trim();
            return str ? [{ name: str, designation: overrideDesignation }] : [];
        };

        const merged = [
            ...normalize(users),
            ...normalize(allocated_to_user),
            ...normalize(username),
            ...normalize(allocated_to),
        ];

        const seen = new Set<string>();
        const deduped: NormalizedUser[] = [];

        for (const item of merged) {
            const key = `${item.name}__${item.designation ?? ""}`;
            if (!seen.has(key)) {
                seen.add(key);
                deduped.push(item);
            }
        }

        return deduped;
    }, [users, allocated_to_user, username, allocated_to, overrideDesignation]);

    /** Merge roles + role + RoleAssignedUsers.role → deduped array */
    const rolesArray: string[] = React.useMemo(() => {
        const explicitRoles = [
            ...(roles ?? []).filter(Boolean),
            ...(role ? [role] : []),
        ];

        const derivedRoles =
            RoleAssignedUsers?.map((r) => r.role).filter(Boolean) ?? [];

        return [...new Set([...explicitRoles, ...derivedRoles])];
    }, [roles, role, RoleAssignedUsers]);

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

        const triggerRect = triggerRef.current.getBoundingClientRect();
        const tooltipRect = tooltipRef.current.getBoundingClientRect();
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const PADDING = 8;

        let top = 0;
        let left = 0;

        left = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;

        const spaceBelow = vh - triggerRect.bottom;
        const spaceAbove = triggerRect.top;
        const fits = (side: "top" | "bottom") =>
            side === "bottom"
                ? spaceBelow >= tooltipRect.height + PADDING
                : spaceAbove >= tooltipRect.height + PADDING;

        let resolvedPosition = position;
        if ((position === "bottom" || position === "top") && !fits(position as "top" | "bottom")) {
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

        left = Math.max(PADDING, Math.min(left, vw - tooltipRect.width - PADDING));
        top = Math.max(PADDING, Math.min(top, vh - tooltipRect.height - PADDING));

        setCoords({ top, left });
    }, [position]);

    useEffect(() => {
        if (isVisible) {
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

    const hideDelayed = () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => setIsVisible(false), 300);
    };

    const toggle = (e: React.MouseEvent | React.TouchEvent) => {
        e.stopPropagation();
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setIsVisible((v) => !v);
    };

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

    const renderUserItem = (u: NormalizedUser, idx: number, prefix: string) => (
        <span
            key={`${prefix}-${idx}-${u.name}-${u.designation ?? ""}`}
            className="
                inline-flex flex-col items-start
                text-[11px] font-brand font-medium
                text-text-link bg-primary/10
                border border-primary/20
                px-2 py-1 rounded-md max-w-full
            "
        >
            <span className="leading-4">{u.name} {u?.employee && `(${u.employee})`}</span>
            {u.designation && (
                <span className="text-[10px] leading-4 text-gray-500">
                    {u.designation}
                </span>
            )}
        </span>
    );

    const tooltipEl = isVisible && (
        <div
            ref={tooltipRef}
            role="tooltip"
            className="fixed z-[9999]"
            style={{ top: `${coords.top}px`, left: `${coords.left}px` }}
            onMouseEnter={() => { if (!isTouchRef.current) show(); }}
            onMouseLeave={() => { if (!isTouchRef.current) hideDelayed(); }}
        >
            <div className="
                bg-raised text-text-body1 rounded-xl shadow-xl
                border border-border-strong
                min-w-[200px] max-w-[320px]
                max-h-[60vh] overflow-y-auto
            ">
                <div className="bg-primary/10 px-3.5 py-2 border-b border-border">
                    <span className="text-[11px] font-brand font-semibold uppercase tracking-wider text-text-link">
                        {title}
                    </span>
                </div>

                <div className="flex flex-col gap-2.5 p-3.5">
                    {!hasContent && (
                        <div className="flex items-center gap-2.5">
                            <span className="text-[11px] font-brand font-medium italic text-gray-500">
                                Not Allocated
                            </span>
                        </div>
                    )}

                    {!showUserRoleLables && hasContent && (
                        <div className="flex flex-wrap gap-1 mt-1">
                            {usersArray.map((u, idx) => renderUserItem(u, idx, "val-u"))}

                            {rolesArray.map((r, idx) => {
                                const assigned = RoleAssignedUsers?.find((data) => data.role === r);
                                const userCount = assigned?.users?.length || assigned?.user?.length || 0;
                                const hasUsers = assigned && userCount > 0;
                                return (
                                    <span
                                        key={`val-r-${idx}-${r}`}
                                        onClick={(e) => {
                                            if (hasUsers) {
                                                e.stopPropagation();
                                                setSelectedRoleData(assigned);
                                                setIsRoleModalOpen(true);
                                                hide();
                                            }
                                        }}
                                        className={`
                                            inline-flex items-center
                                            text-[11px] font-brand font-medium
                                            text-text-body1 bg-secondary/15
                                            border border-secondary/30
                                            px-2 py-0.5 rounded-md
                                            ${hasUsers ? "cursor-pointer hover:bg-secondary/25 transition-colors" : ""}
                                        `}
                                    >
                                        {r} {hasUsers && `(${userCount})`}
                                    </span>
                                );
                            })}
                        </div>
                    )}

                    {showUserRoleLables && hasUsers && (
                        <div className="flex items-start gap-2.5">
                            <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10 shrink-0">
                                <User className="w-3.5 h-3.5 text-text-link" />
                            </div>

                            <div className="flex flex-col gap-0.5 min-w-0">
                                <span className="text-[10px] font-brand font-semibold uppercase tracking-wider text-gray-500">
                                    {usersArray?.length > 1 ? "Users" : "User"}
                                </span>

                                <div className="flex flex-wrap gap-1 mt-1">
                                    {usersArray.map((u, idx) => renderUserItem(u, idx, "user"))}
                                </div>
                            </div>
                        </div>
                    )}

                    {showUserRoleLables && hasUsers && hasRoles && <div className="border-t border-gray-100" />}

                    {showUserRoleLables && hasRoles && (
                        <div className="flex items-start gap-2.5">
                            <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-secondary/15 shrink-0">
                                <Shield className="w-3.5 h-3.5 text-secondary-600" />
                            </div>

                            <div className="flex flex-col gap-1 min-w-0">
                                <span className="text-[10px] font-brand font-semibold uppercase tracking-wider text-gray-500">
                                    {rolesArray?.length > 1 ? "Roles" : "Role"}
                                </span>

                                <div className="flex flex-wrap gap-1">
                                    {rolesArray.map((r, idx) => {
                                        const assigned = RoleAssignedUsers?.find((data) => data.role === r);
                                        const userCount = assigned?.users?.length || assigned?.user?.length || 0;
                                        const hasUsers = assigned && userCount > 0;
                                        return (
                                            <span
                                                key={`role-${idx}-${r}`}
                                                onClick={(e) => {
                                                    if (hasUsers) {
                                                        e.stopPropagation();
                                                        setSelectedRoleData(assigned);
                                                        setIsRoleModalOpen(true);
                                                        hide();
                                                    }
                                                }}
                                                className={`
                                                    inline-flex items-center
                                                    text-[11px] font-brand font-medium
                                                    text-text-body1 bg-secondary/15
                                                    border border-secondary/30
                                                    px-2 py-0.5 rounded-md
                                                    ${hasUsers ? "cursor-pointer hover:bg-secondary/25 transition-colors" : ""}
                                                `}
                                            >
                                                {r} {hasUsers && `(${userCount})`}
                                            </span>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

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
                onMouseLeave={() => { if (!isTouchRef.current) hideDelayed(); }}
                onFocus={show}
                onBlur={hide}
                onTouchStart={() => { isTouchRef.current = true; }}
                onClick={toggle}
            >
                {children}
            </div>
            {isVisible && createPortal(tooltipEl, document.body)}

            <RoleUsersModal
                isOpen={isRoleModalOpen}
                onClose={() => setIsRoleModalOpen(false)}
                roleData={selectedRoleData}
            />
        </>
    );
};

export default AllocatedToTooltip;
