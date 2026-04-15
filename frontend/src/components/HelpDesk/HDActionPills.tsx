"use client";

import { Trash2, CheckCircle, MessageSquare } from "lucide-react";
import type { JSX } from "react";
import Tooltip from "../shared/Tooltip";

type HDActionPillProp = {
    canRevoke?: boolean;
    canClose?: boolean;
    canReply?: boolean;

    onRevoke?: () => void;
    onClose?: () => void;
    onReply?: () => void;

    revokeLoading?: boolean;
    closeLoading?: boolean;
    replyLoading?: boolean;

    variant?: "pill" | "buttons";
};

type ActionItem = {
    key: "revoke" | "close" | "reply";
    tooltip: string;
    icon: JSX.Element;
    onClick?: () => void;
    loading?: boolean;
};

const HDActionPill = ({
    canRevoke,
    canClose,
    canReply,
    onRevoke,
    onClose,
    onReply,
    revokeLoading = false,
    closeLoading = false,
    replyLoading = false,
    variant = "pill",
}: HDActionPillProp) => {
    const hasActions = canRevoke || canClose || canReply;

    if (!hasActions) {
        if (variant === "buttons") return null;

        return (
            <div className="h-8 px-3 flex items-center justify-center rounded-3xl bg-gray-10 text-gray-600 text-xs font-medium w-fit">
                NA
            </div>
        );
    }

    const actions: ActionItem[] = [];

    if (canClose && onClose) {
        actions.push({
            key: "close",
            tooltip: "Close Ticket",
            loading: closeLoading,
            onClick: onClose,
            icon: <CheckCircle className="w-4 h-4 text-green-500" />,
        });
    }

    if (canRevoke && onRevoke) {
        actions.push({
            key: "revoke",
            tooltip: "Revoke",
            loading: revokeLoading,
            onClick: onRevoke,
            icon: <Trash2 className="w-4 h-4 text-red-400" />,
        });
    }

    if (canReply && onReply) {
        actions.push({
            key: "reply",
            tooltip: "Reply",
            loading: replyLoading,
            onClick: onReply,
            icon: <MessageSquare className="w-4 h-4 text-primary" />,
        });
    }

    // ✅ MOBILE BUTTON VARIANT
    if (variant === "buttons") {
        return (
            <div className="flex gap-2 mt-3 w-full">
                {actions.map((action) => (
                    <button
                        key={action.key}
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            action.onClick?.();
                        }}
                        disabled={action.loading}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-primary text-white text-sm"
                    >
                        {action.loading ? (
                            <span className="w-4 h-4 border border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <>
                                {action.icon}
                                <span className="capitalize">
                                    {action.key}
                                </span>
                            </>
                        )}
                    </button>
                ))}
            </div>
        );
    }

    // ✅ PILL VARIANT
    return (
        <div className="h-8 flex items-center gap-1 px-3 py-1 rounded-3xl bg-gray-10 w-fit">
            {actions.map((action, index) => (
                <div key={action.key} className="flex items-center gap-2">
                    <Tooltip content={action.tooltip} position="top">
                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                action.onClick?.();
                            }}
                            disabled={action.loading}
                            className="flex items-center justify-center"
                        >
                            {action.loading ? (
                                <span className="w-4 h-4 border border-gray-400 border-t-transparent rounded-full animate-spin" />
                            ) : (
                                action.icon
                            )}
                        </button>
                    </Tooltip>

                    {index < actions.length - 1 && (
                        <span className="w-px h-4 bg-gray-300" />
                    )}
                </div>
            ))}
        </div>
    );
};

export default HDActionPill;