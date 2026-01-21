import React, { useMemo } from 'react';
import { FunnelActivityLog } from '../../../../types/separation';
import Button from '../../../shared/atoms/Button';
import useCurrentUser from '../../../../hooks/useCurrentUser';
import Badge from '../../../shared/Badge';
import { useScreenSize } from '../../../../hooks/useScreenSize';
import { Typography } from '../../../shared/atoms/Typography';

interface SeparationLogCardProps {
    gtc: string;
    data: FunnelActivityLog;
    isActive: boolean;
    onClickAction: (selected_option: string) => void;
}
const SeparationLogCard: React.FC<SeparationLogCardProps> = ({ onClickAction, gtc, data, isActive }) => {
    // fallback: all columns equally sized

    const actions = useMemo(() => {
        try {
            return data?.action_options ? JSON.parse(data.action_options) : [];
        } catch {
            return [];
        }
    }, [data?.action_options]);
    const { data: currentUser, isLoading: loadingUser } = useCurrentUser();

    const canPerformActions = useMemo(() => {
        if (!isActive || loadingUser || !currentUser) return false;

        // Check current User name
        if (data?.target_type === "User" && data?.target === currentUser?.name) return true;

        // Check current User Role
        if (data?.target_type === "Role" && currentUser?.roles?.some(role => role.role === data?.target)) return true;

        return false;
    }, [currentUser, data, loadingUser, isActive]);

    const statusColors: Record<string, string> = {
        "Approved": "bg-green-100 text-green-600",
        "Completed": "text-green-500 bg-green-100",
        "Cancled": "bg-red-100 text-red-600",
        "Rejected": "bg-red-100 text-red-600",
        "Pending": "bg-yellow-100 text-yellow-600",
        _: "text-gray-500"
    }

    const { isDesktop } = useScreenSize();

    return (
        isDesktop ?
            <div className={`grid gap-4 border-b border-b-gray-300 hover:bg-primary/30 px-6 py-4 items-center`}
                style={{ gridTemplateColumns: gtc }}
            >
                <Typography variant="bodySmall" className="font-semibold tracking-tight">
                    {data?.idx}
                </Typography>
                <Badge label={data?.status} textColor={statusColors[data?.status] ?? statusColors._} />
                <Typography variant="bodySmall" className="font-semibold tracking-tight">
                    {data?.target}
                </Typography>
                <Typography variant="bodySmall" className="font-semibold tracking-tight">
                    {data?.selected_action}
                </Typography>
                <span>{
                    canPerformActions &&
                    actions?.map((action: string, idx: number) =>
                        <Button key={action + idx} onClick={() => onClickAction(action)} size='md'>{action}</Button>
                    )

                }</span>
            </div>
            :
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col gap-4 mb-4 relative overflow-hidden">




                <div className="flex items-center justify-between">
                    <div>
                        <Typography variant="bodySmall">
                            Stage
                        </Typography>
                        <Typography variant="bodyMedium">
                            {data?.idx}
                        </Typography>
                    </div>

                    <Badge
                        label={data?.status}
                        textColor={statusColors[data?.status] ?? statusColors._}
                    // textColor={getStatusBadgeClasses(data?.status)}
                    />
                </div>

                {/* User */}
                <div className="flex justify-between">
                    <div>
                        <Typography variant="bodySmall">
                            Assigned To
                        </Typography>
                        <Typography variant="bodyMedium">
                            {data?.target}
                        </Typography>
                    </div>

                    <div>
                        <Typography variant="bodySmall">
                            Selected Action
                        </Typography>
                        <Typography variant="bodyMedium">
                            {data?.selected_action || "-"}
                        </Typography>
                    </div>
                </div>

                {/* 3. Footer: Action Buttons */}
                {canPerformActions && actions?.length > 0 && (
                    <div className="pt-2 mt-auto border-t border-gray-100 grid grid-cols-2 gap-3">
                        {actions.map((action: string, index: number) => (
                            <Button
                                key={index}
                                onClick={() => onClickAction(action)}
                                // Assuming your Button accepts className props for overrides
                                className="w-full justify-center py-2.5 text-sm"
                            >
                                {action}
                            </Button>
                        ))}
                    </div>
                )}
            </div>
    );
};

export default SeparationLogCard;
