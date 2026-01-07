import React, { useEffect, useRef } from "react";

export type DrawerSize = "sm" | "md" | "lg" | "xl" | "xxl" | "full";

interface SideDrawerProps {
    open: boolean;
    onClose?: () => void;
    side?: "left" | "right";
    size?: DrawerSize;
    title?: string;
    children: React.ReactNode;
}

const sizeClasses: Record<DrawerSize, string> = {
    sm: "w-screen sm:w-64",
    md: "w-screen sm:w-80",
    lg: "w-screen sm:w-96",
    xl: "w-screen sm:w-[32rem]",
    xxl: "w-screen sm:w-[42rem]",
    full: "w-screen",
};

const SideDrawer: React.FC<SideDrawerProps> = ({
    open,
    onClose,
    side = "right",
    size = "md",
    title,
    children,
}) => {
    const drawerRef = useRef<HTMLDivElement>(null);

    // Close on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            // Check if the click is on a Choice.js dropdown or its items
            const isChoiceDropdown =
                target.closest(".choices__list--dropdown") ||
                target.closest(".choices__item--choice") ||
                target.closest(".choices__button ") ||
                target.closest(".form-control input active") ||
                target.closest(".choices");

            if (
                drawerRef.current &&
                !drawerRef.current.contains(target) &&
                !isChoiceDropdown
            ) {
                onClose?.();
            }
        };

        if (open) {
            document.addEventListener("mousedown", handler);
        }

        return () => document.removeEventListener("mousedown", handler);
    }, [open, onClose]);

    return (
        <>
            {/* Backdrop */}
            {open && (
                <div
                    className="fixed inset-0 bg-black/40 z-40"
                    onClick={onClose}
                />
            )}

            {/* Drawer */}
            <div
                ref={drawerRef}
                className={`
          fixed top-0 h-full bg-white z-50
          shadow-xl ring-1 ring-black/5
          transition-[left,right] duration-300 ease-in-out
          ${side === "right"
                        ? (open ? "right-0" : "-right-full sm:-right-[42rem]")
                        : (open ? "left-0" : "-left-full sm:-left-[42rem]")
                    }
          ${sizeClasses[size]}
        `}
            >
                {/* Header */}
                {(title || onClose) && (
                    <div className="flex items-center justify-between px-4 py-3 border-b">
                        <h2 className="text-sm font-semibold">{title}</h2>
                        <button
                            onClick={onClose}
                            className="rounded-md p-1 hover:bg-gray-100"
                        >
                            ✕
                        </button>
                    </div>
                )}

                {/* Content */}
                <div className="p-4 overflow-y-auto h-full">
                    {children}
                </div>
            </div>
        </>
    );
};

export default SideDrawer;
