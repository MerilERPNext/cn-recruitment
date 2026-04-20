import React from "react";
import { User, Shield } from "lucide-react";
import AllocatedToTooltip from "./AllocatedToTooltip";
import { Typography } from "./atoms/Typography";
import { allocatedToType } from "../../types/allocatedToTooltip";

interface MobileAllocatedToProps {
    /** User names — string or string[] */
    users?: string | string[] | allocatedToType[];
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
    /** Text alignment — matches the card column position. Default: "left" */
    align?: "left" | "right";
    showLabel?: boolean;
}

const MobileAllocatedTo: React.FC<MobileAllocatedToProps> = ({
    users,
    allocated_to_user,
    username,
    allocated_to,
    roles,
    role,
    align = "left",
    showLabel = true
}) => {
    /** Merge all user sources → deduped array (same logic as AllocatedToTooltip) */
    const allUsers: string[] = React.useMemo(() => {
        const normalize = (
            value?: string | string[] | allocatedToType[] | null
        ): string[] => {
            if (value == null) return [];

            if (Array.isArray(value)) {
                return value
                    .map((v): string | null => {
                        if (!v) return null;

                        if (typeof v === "string") {
                            const trimmed = v.trim();
                            return trimmed || null;
                        }

                        if (typeof v === "object") {
                            const name = v.name?.trim();
                            if (!name) return null;

                            return v.designation_name
                                ? `${name} (${v.employee}) - (${v.designation_name})`
                                : name;
                        }

                        return null;
                    })
                    .filter((v): v is string => Boolean(v));
            }

            const str = String(value).trim();
            return str ? [str] : [];
        };

        return Array.from(new Set([
            ...normalize(users),
            ...normalize(allocated_to_user),
            ...normalize(username),
            ...normalize(allocated_to),
        ]));
    }, [users, allocated_to_user, username, allocated_to]);

    /** Merge roles + role → deduped array (same logic as AllocatedToTooltip) */
    const allRoles: string[] = React.useMemo(() => {
        const base = (roles ?? []).filter(Boolean);
        if (typeof role === "string" && role) base.push(role);
        return [...new Set(base)];
    }, [roles, role]);

    const totalCount = allUsers.length + allRoles.length;

    // Determine what to show first (user has priority over role)
    const firstIsUser = allUsers.length > 0;
    const firstLabel = firstIsUser ? allUsers[0] : allRoles[0];

    const extraCount = totalCount - 1;

    const isRight = align === "right";

    const labelEl = (
        <div className={`flex flex-col gap-0.5 ${isRight ? "items-end" : "items-start"}`}>
            {showLabel && <Typography variant="mobileCardLabel">Allocated To</Typography>}

            {totalCount === 0 ? (
                <Typography variant="mobileCardValue" className="text-gray-400">
                    —
                </Typography>
            ) : (
                <div className="flex items-center gap-1">
                    {/* Icon: User or Role */}
                    <span
                        className={`flex items-center justify-center w-5 h-5 rounded-md shrink-0 ${firstIsUser ? "bg-primary-50" : "bg-secondary-50"
                            }`}
                    >
                        {firstIsUser ? (
                            <User className="w-3 h-3 text-primary-600" />
                        ) : (
                            <Shield className="w-3 h-3 text-secondary-600" />
                        )}
                    </span>

                    {/* Primary name (first user/role) */}
                    <Typography
                        variant="mobileCardValue"
                        className="truncate max-w-[120px]"
                        title={firstLabel}
                    >
                        {firstLabel}
                    </Typography>

                    {/* (+N) overflow badge */}
                    {extraCount > 0 && (
                        <span className="text-[10px] font-brand font-semibold text-primary-700 bg-primary-100 border border-primary-200 px-1.5 py-0.5 rounded-full leading-none shrink-0">
                            +{extraCount}
                        </span>
                    )}
                </div>
            )}
        </div>
    );

    const wrapperClass = `flex ${isRight ? "justify-end ml-auto" : "justify-start"}`;

    return (
        <div className={wrapperClass}>
            <AllocatedToTooltip users={users} allocated_to_user={allocated_to_user} username={username} allocated_to={allocated_to} roles={allRoles} position="top">
                {labelEl}
            </AllocatedToTooltip>
        </div>
    );
};

export default MobileAllocatedTo;