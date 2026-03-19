import React from "react";
import { User, Shield } from "lucide-react";
import AllocatedToTooltip from "./AllocatedToTooltip";
import { Typography } from "./atoms/Typography";

interface MobileAllocatedToProps {
    /** Full list of user display names (already de-duplicated by caller) */
    users?: string[];

    /** Full list of role names */
    roles?: string[];

    /**
     * Fallback: single username string
     * Used ONLY when both users[] and roles[] are empty
     */
    username?: string;

    /**
     * Fallback: allocated_to can be:
     * - string (single user)
     * - string[] (multiple users)
     * Used ONLY when both users[] and roles[] are empty
     */
    allocated_to?: string | string[];

    /** Text alignment for label + value — matches the card column position. Default: "left" */
    align?: "left" | "right";
}

const MobileAllocatedTo: React.FC<MobileAllocatedToProps> = ({
    users = [],
    roles = [],
    username,
    allocated_to,
    align = "left",
}) => {
    /**
     * Build de-duplicated user list.
     *
     * Priority:
     * 1. If users[] exists → use it directly
     * 2. If roles exist → DO NOT fallback to allocated_to/username
     *    (because this is a role-based assignment)
     * 3. If no users & no roles:
     *    - Use username
     *    - Use allocated_to (supports string OR string[])
     */
    const allUsers: string[] = React.useMemo(() => {
        // Case 1: users[] already provided
        if (users.length > 0) {
            return [...new Set(users.filter(Boolean))];
        }

        const hasRoles = (roles ?? []).filter(Boolean).length > 0;

        // Case 2: No users AND no roles → fallback
        if (!hasRoles) {
            // Normalize allocated_to → always array
            const allocatedList = Array.isArray(allocated_to)
                ? allocated_to
                : [allocated_to];

            // Combine username + allocated_to
            const base = [username, ...allocatedList].filter(Boolean) as string[];

            return [...new Set(base)];
        }

        // Case 3: Roles exist → no users
        return [];
    }, [users, roles, username, allocated_to]);

    /**
     * Build de-duplicated role list
     */
    const allRoles: string[] = React.useMemo(() => {
        return [...new Set((roles ?? []).filter(Boolean))];
    }, [roles]);

    const totalCount = allUsers.length + allRoles.length;

    // Determine what to show first (user has priority over role)
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

    // No tooltip if nothing to show
    if (totalCount === 0) {
        return <div className={wrapperClass}>{labelEl}</div>;
    }

    return (
        <div className={wrapperClass}>
            <AllocatedToTooltip users={allUsers} roles={allRoles} position="top">
                {labelEl}
            </AllocatedToTooltip>
        </div>
    );
};

export default MobileAllocatedTo;