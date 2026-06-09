"use client";

import { Trash2, CheckCircle, MessageSquare, RotateCcw, MoreVertical } from "lucide-react";
import type { JSX } from "react";
import Tooltip from "../shared/Tooltip";
import { useScreenSize } from "../../hooks/useScreenSize";
import Button, { ButtonColor } from "../shared/atoms/Button";
import DropdownMenu from "../shared/DropDownMenu";
import IconButton from "../shared/atoms/IconButton";

type HDActionPillProp = {
    canRevoke?: boolean;
    canClose?: boolean;
    canReply?: boolean;
    canReopen?: boolean;
    canResolve?: boolean;

    onRevoke?: () => void;
    onClose?: () => void;
    onReply?: () => void;
    onReopen?: () => void;
    onResolve?: () => void;

    revokeLoading?: boolean;
    closeLoading?: boolean;
    replyLoading?: boolean;
    reopenLoading?: boolean;
    resolveLoading?: boolean;

    variant?: "pill" | "buttons" | "modal";
    placement?: "top-right" | "bottom-left";
};

type ActionItem = {
    key: "revoke" | "close" | "reply" | "reopen" | "resolve";
    tooltip: string;
    icon: JSX.Element;
    onClick?: () => void;
    loading?: boolean;
    color: ButtonColor;
};

const HDActionPill = ({
    canRevoke,
    canClose,
    canReply,
    canReopen,
    canResolve,
    onResolve,
    onRevoke,
    onClose,
    onReply,
    onReopen,
    revokeLoading = false,
    closeLoading = false,
    replyLoading = false,
    reopenLoading = false,
    resolveLoading = false,
    variant = "pill",
    placement = "top-right"
}: HDActionPillProp) => {
    const hasActions = canRevoke || canClose || canReply || canReopen;
    const { isDesktop } = useScreenSize();
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
            icon: <CheckCircle className="w-4 h-4" />,
            color: "success"
        });
    }

    if (canReopen && onReopen) {
        actions.push({
            key: "reopen",
            tooltip: "Reopen Ticket",
            loading: reopenLoading,
            onClick: onReopen,
            icon: <RotateCcw className="w-4 h-4" />,
            color: "warning"
        });
    }

    if (canRevoke && onRevoke) {
        actions.push({
            key: "revoke",
            tooltip: "Revoke",
            loading: revokeLoading,
            onClick: onRevoke,
            icon: <Trash2 className="w-4 h-4" />,
            color: "error"
        });
    }

    if (canReply && onReply && isDesktop) {
        actions.push({
            key: "reply",
            tooltip: "Reply",
            loading: replyLoading,
            onClick: onReply,
            icon: <MessageSquare className="w-4 h-4" />,
            color: "primary"
        });
    }

    if (canResolve && onResolve) {
        actions.push({
            key: "resolve",
            tooltip: "Resolve",
            loading: resolveLoading,
            onClick: onResolve,
            icon: <CheckCircle className="w-4 h-4" />,
            color: "success"
        });
    }

    const getIconColorClass = (color: ButtonColor) => {
        switch (color) {
            case "success": return "text-green-500";
            case "warning": return "text-warning";
            case "error": return "text-error";
            case "primary": return "text-primary";
            default: return "text-gray-600";
        }
    };

    // ✅ MODAL VARIANT (FLOATING BOTTOM BUTTONS)
    if (variant === "modal") {
        return (
            <div className="sticky bottom-0 left-0 right-0 p-3 bg-white border-t border-gray-100 flex gap-2 w-full z-10 shadow-[0_-4px_6px_-1px_rgb(0,0,0,0.05)] overflow-x-auto no-scrollbar">
                {actions.map((action) => (
                    <Button
                        key={action.key}
                        bgColor={action.color}
                        variant="contain"
                        size="md"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            action.onClick?.();
                        }}
                        disabled={action.loading}
                        loading={action.loading}
                        icon={action.icon}
                        className="flex-1 min-w-fit whitespace-nowrap"
                    >
                        <span className="capitalize">{action.key === "close" ? "Close Ticket" : action.key === "reopen" ? "Reopen Ticket" : action.key}</span>
                    </Button>
                ))}
            </div>
        );
    }

    // ✅ MOBILE VARIANT
    if (!isDesktop) {
        return (
            <div className="flex justify-end w-full">
                <DropdownMenu
                    placement={placement}
                    className="capitalize"
                    items={actions.map((action) => ({
                        label: action.key === "close" ? "Close Ticket" : action.key === "reopen" ? "Reopen Ticket" : action.key,
                        icon: action.loading ? <span className="w-4 h-4 border border-gray-400 border-t-transparent rounded-full animate-spin" /> : <span className={getIconColorClass(action.color)}>{action.icon}</span>,
                        onClick: () => {
                            if (!action.loading) {
                                action.onClick?.();
                            }
                        },
                    }))}
                >
                    <div className="w-fit">
                        <IconButton
                            icon={<MoreVertical className="h-4 w-4" />}
                            size="xs"
                            variant="subtle"
                            color="secondary"
                            radius="md"
                        />
                    </div>
                </DropdownMenu>
            </div>
        );
    }

    // ✅ DESKTOP BUTTON VARIANT
    if (variant === "buttons") {
        return (
            <div className="flex gap-2 w-full mt-3">
                {actions.map((action) => (
                    <Button
                        key={action.key}
                        bgColor={action.color}
                        variant="contain"
                        size="sm"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            action.onClick?.();
                        }}
                        disabled={action.loading}
                        loading={action.loading}
                        icon={action.icon}
                        className="flex-1"
                    >
                        <span className="capitalize">{action.key === "close" ? "Close Ticket" : action.key === "reopen" ? "Reopen Ticket" : action.key}</span>
                    </Button>
                ))}
            </div>
        );
    }

    // ✅ PILL VARIANT (DESKTOP)
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
                            className="flex items-center justify-center gap-1.5"
                        >
                            {action.loading ? (
                                <span className="w-4 h-4 border border-gray-400 border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <span className={getIconColorClass(action.color)}>{action.icon}</span>
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