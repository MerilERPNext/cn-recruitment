import React from "react";
import { User, Shield } from "lucide-react";
import AllocatedToTooltip from "./AllocatedToTooltip";
import { Typography } from "./atoms/Typography";

interface MobileAllocatedToProps {
    /** Full list of user display names (already de-duplicated by caller) */
    users?: string[];
    /** Full list of role names */
    roles?: string[];
    /** Fallback: single username string (used when users array is empty) */
    username?: string;
    /** Fallback: single allocated_to string (used when users array is empty) */
    allocated_to?: string;
    /** When true, shows a pulsing amber dot to signal the item is tappable/pending */
    hasPendingStatus?: boolean;
    /** Text alignment for label + value — matches the card column position. Default: "left" */
    align?: "left" | "right";
}

/**
 * Renders the "Allocated To" field for mobile card views.
 *
 * – Shows the first assignee (user 👤 or role 🛡️) with an icon.
 * – If there are more assignees, appends a (+N) badge.
 * – Wraps everything in AllocatedToTooltip so tapping/hovering reveals the full list.
 * – When hasPendingStatus is true, shows a small pulsing amber dot (CSS only).
 * – align="right" mirrors the layout for right-side card columns (items-end, flex-row-reverse).
 */
const MobileAllocatedTo: React.FC<MobileAllocatedToProps> = ({
    users = [],
    roles = [],
    username,
    allocated_to,
    hasPendingStatus = false,
    align = "left",
}) => {
    // Build de-duplicated user list.
    // Falls back to username/allocated_to ONLY when both users[] and roles[] are empty,
    // so that role-only assignments correctly show a role instead of the fallback string.
    const allUsers: string[] = React.useMemo(() => {
        if (users.length > 0) return [...new Set(users.filter(Boolean))];
        const hasRoles = (roles ?? []).filter(Boolean).length > 0;
        if (!hasRoles) {
            const base = [username, allocated_to].filter(Boolean) as string[];
            return [...new Set(base)];
        }
        return [];
    }, [users, roles, username, allocated_to]);

    const allRoles: string[] = React.useMemo(() => {
        return [...new Set((roles ?? []).filter(Boolean))];
    }, [roles]);

    const totalCount = allUsers.length + allRoles.length;

    const firstIsUser = allUsers.length > 0;
    const firstLabel = firstIsUser ? allUsers[0] : allRoles[0];
    const extraCount = totalCount - 1;

    const isRight = align === "right";

    const labelEl = (
        <div className={`flex flex-col gap-0.5 ${isRight ? "items-end" : "items-start"}`}>
            <Typography variant="mobileCardLabel">Allocated To</Typography>

            {totalCount === 0 ? (
                <Typography variant="mobileCardValue" className="text-gray-400">
                    —
                </Typography>
            ) : (
                // When right-aligned, reverse the icon→name→badge order so it reads right-to-left naturally
                <div className={`flex items-center gap-1 flex-wrap`}>
                    {/* Icon */}
                    <span className={`flex items-center justify-center w-5 h-5 rounded-md shrink-0 ${firstIsUser ? "bg-primary-50" : "bg-secondary-50"}`}>
                        {firstIsUser
                            ? <User className="w-3 h-3 text-primary-600" />
                            : <Shield className="w-3 h-3 text-secondary-600" />
                        }
                    </span>

                    {/* Primary name */}
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

    if (totalCount === 0) {
        return labelEl;
    }

    return (
        <AllocatedToTooltip users={allUsers} roles={allRoles} position="top">
            {labelEl}
        </AllocatedToTooltip>
    );
};

export default MobileAllocatedTo;
