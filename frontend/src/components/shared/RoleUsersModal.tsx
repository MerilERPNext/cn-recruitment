import React from "react";
import { createPortal } from "react-dom";
import { RoleAssignedUsersType } from "../../types/flows";
import { Typography } from "./atoms/Typography";
import Button from "./atoms/Button";
import WrapperHoverCard from "./WrapperHoverCard";
import { User, Users, X, UserX } from "lucide-react";
import { useScreenSize } from "../../hooks/useScreenSize";
import Tooltip from "./Tooltip";

interface RoleUsersModalProps {
    isOpen: boolean;
    onClose: () => void;
    roleData: RoleAssignedUsersType | null;
}

const RoleUsersModal: React.FC<RoleUsersModalProps> = ({ isOpen, onClose, roleData }) => {
    const isDesktop = useScreenSize();
    if (!isOpen || !roleData) return null;

    return createPortal(
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            style={{ animation: "roleModalFadeIn 200ms ease-out" }}
            onMouseDown={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            {/* Inline keyframes */}
            <style>{`
                @keyframes roleModalFadeIn {
                    from { opacity: 0; }
                    to   { opacity: 1; }
                }
                @keyframes roleModalSlideUp {
                    from { opacity: 0; transform: translateY(16px) scale(0.98); }
                    to   { opacity: 1; transform: translateY(0) scale(1); }
                }
                @keyframes roleCardReveal {
                    from { opacity: 0; transform: translateX(-8px); }
                    to   { opacity: 1; transform: translateX(0); }
                }
            `}</style>

            {/* Modal Container */}
            <div
                className="w-full max-w-md max-h-[80vh] rounded-2xl bg-white flex flex-col overflow-hidden shadow-2xl"
                style={{ animation: "roleModalSlideUp 280ms ease-out" }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* ============ Header ============ */}
                <div className="relative px-5 py-4 border-b border-primary-100/60 bg-gradient-to-r from-primary-50 via-secondary-10 to-white shrink-0">
                    {/* Decorative background dot */}
                    <div className="absolute -top-3 -right-3 w-20 h-20 rounded-full bg-primary-100/30 blur-xl pointer-events-none" />

                    <div className="flex items-center justify-between relative z-10">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary-100 text-primary-600 shadow-sm shrink-0">
                                <Users className="w-5 h-5" strokeWidth={2} />
                            </div>
                            <div className="min-w-0">
                                <Tooltip content={roleData.role} triggerClassName="block min-w-0 max-w-full">
                                    <Typography variant={isDesktop ? "subheading" : "caption"} className="text-gray-900 truncate leading-tight">
                                        {roleData.role}
                                    </Typography>
                                </Tooltip>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                    <span className="inline-flex items-center gap-1 text-xs font-semibold font-brand text-primary-600 bg-primary-50 border border-primary-200/60 rounded-md px-1.5 py-0.5 tracking-wide">
                                        {roleData?.user?.length}
                                        <span className="font-medium text-primary-500">
                                            {roleData?.user?.length === 1 ? 'member' : 'members'}
                                        </span>
                                    </span>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200"
                            aria-label="Close"
                        >
                            <X className="h-4 w-4 text-gray-500" />
                        </button>
                    </div>
                </div>

                {/* ============ Content ============ */}
                <div className="flex-1 overflow-y-auto p-4 bg-gray-50/30">
                    {roleData?.user?.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                            <div className="flex items-center justify-center w-14 h-14 rounded-full bg-gray-100 mb-4">
                                <UserX size={28} strokeWidth={1.5} className="text-gray-300" />
                            </div>
                            <Typography variant="bodyMedium" className="text-gray-500 font-medium">
                                No users assigned
                            </Typography>
                            <Typography variant="caption" className="text-gray-400 mt-1">
                                This role has no members yet
                            </Typography>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-2">
                            {roleData.user?.map((u, index) => (
                                <div
                                    className="flex items-center gap-3 w-full text-left p-3 rounded-xl border border-gray-100 bg-white hover:border-primary-200 hover:shadow-[0_2px_12px_rgba(97,114,243,0.1)] hover:bg-gradient-to-r hover:from-primary-50/40 hover:to-white transition-all duration-200 cursor-pointer group"
                                    style={{
                                        animation: `roleCardReveal 250ms ease-out ${index * 40}ms both`,
                                    }}
                                >
                                    <div className="flex items-center justify-center w-9 h-9 rounded-full bg-gradient-to-br from-primary-50 to-secondary-50 text-primary-400 group-hover:from-primary-100 group-hover:to-secondary-100 group-hover:text-primary-600 transition-all duration-200 shrink-0 ring-1 ring-primary-100/50">
                                        <User className="w-4 h-4" />
                                    </div>
                                    <div className="flex flex-col min-w-0 flex-1">
                                        <WrapperHoverCard
                                            key={u.user_id}
                                            employeeId={u.employee}
                                            placement="bottom-right"
                                            className="block w-full"
                                        >
                                            <Typography variant="bodyMedium" className="text-gray-800 group-hover:text-primary-700 transition-colors truncate">
                                                {u.name}
                                            </Typography>
                                        </WrapperHoverCard>
                                        {u.employee && (
                                            <Typography variant="caption" className="truncate mt-0.5 text-gray-400 group-hover:text-primary-500/70 transition-colors">
                                                {u.employee}
                                            </Typography>
                                        )}
                                    </div>
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 shrink-0">
                                        <div className="w-1.5 h-1.5 rounded-full bg-primary-400" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* ============ Footer ============ */}
                <div className="px-5 py-3.5 border-t border-gray-100 bg-white/95 backdrop-blur-sm flex justify-end shrink-0">
                    <Button onClick={onClose} size="sm" variant="outline" bgColor="primary">
                        Close
                    </Button>
                </div>
            </div>
        </div>,
        document.body,
    );
};

export default RoleUsersModal;
