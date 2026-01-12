import React, { useMemo } from 'react';
import { FunnelActivityLog } from '../../../../types/separation';
import Button from '../../../shared/atoms/Button';
import useCurrentUser from '../../../../hooks/useCurrentUser';
import Badge from '../../../shared/Badge';
import { useScreenSize } from '../../../../hooks/useScreenSize';

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
        "Approved": "text-green-500 bg-green-100",
        "Completed": "text-green-500 bg-green-100",
        "Cancled": "text-green-500 bg-green-100",
        "Rejected": "text-red-500 bg-red-100",
        "Pending": "text-gray-500 ",
        _: "text-gray-500 bg-gray-100"
    }

    const { isDesktop } = useScreenSize();

    return (
        isDesktop ?
            <div className={`grid gap-4  hover:bg-blue-50 px-6 py-4 items-center`}
                style={{ gridTemplateColumns: gtc }}
            >
                <span>{data?.idx}</span>
                <Badge label={data?.status} textColor={statusColors[data?.status] ?? statusColors._} />
                <span>{data?.target}</span>
                <span>{data?.selected_action}</span>
                <span>{
                    canPerformActions &&
                    actions?.map((action: string, idx: number) =>
                        <Button key={action + idx} onClick={() => onClickAction(action)} size='md'>{action}</Button>
                    )

                }</span>
            </div>
            :
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col gap-4 mb-4 relative overflow-hidden">

                {/* 1. Header: Target Name & Status */}
                <div className="flex justify-between items-start gap-3">
                    <div className="flex flex-col">
                        <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                            #{data?.idx}
                        </span>
                        <span className="font-bold text-gray-900 text-lg leading-tight">
                            {data?.target}
                        </span>
                    </div>
                    <div className="shrink-0">
                        <Badge
                            label={data?.status}
                            textColor={statusColors[data?.status] ?? statusColors._}
                        />
                    </div>
                </div>

                {/* 2. Middle: Contextual Info */}
                <div className="bg-gray-50 rounded-lg p-3 flex items-center justify-between border border-gray-100">
                    <span className="text-sm text-gray-500 font-medium">Selected Action</span>
                    <span className="text-sm font-semibold text-gray-700">
                        {data?.selected_action || "—"}
                    </span>
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
