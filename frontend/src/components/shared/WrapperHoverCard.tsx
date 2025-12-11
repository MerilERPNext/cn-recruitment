import React, { useLayoutEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { useGetEmployeeHoverData } from "../../hooks/useEmployee";
import { createPortal } from "react-dom";

type WrapperHoverCardProps = {
    children: React.ReactNode;
    className?: string;
    cardClassName?: string;
    employeeId?: string;
    placement?:
    | "bottom-right"
    | "bottom-left"
    | "top-right"
    | "top-left"
    | "center-left"
    | "center-right";
};

const WrapperHoverCard: React.FC<WrapperHoverCardProps> = ({
    children,
    className = "",
    cardClassName = "",
    employeeId = "",
    placement = "center-right",
}) => {
    const { data: EmployeeInfo, isLoading, isError, error } = useGetEmployeeHoverData(employeeId);

    const targetRef = useRef<HTMLDivElement>(null);
    const cardRef = useRef<HTMLDivElement>(null);

    const [pos, setPos] = useState({ top: 0, left: 0 });
    const [show, setShow] = useState(false);
    const hideTimer = useRef<any>(null);

    // Delay hover show/hide to prevent flicker
    const handleEnter = () => {
        if (hideTimer.current) clearTimeout(hideTimer.current);
        setShow(true);
    };
    const handleLeave = () => {
        hideTimer.current = setTimeout(() => setShow(false), 120);
    };

    const updatePosition = () => {
        const el = targetRef.current;
        const card = cardRef.current;
        if (!el || !card) return;

        const rect = el.getBoundingClientRect();
        const cardRect = card.getBoundingClientRect();

        let top = 0;
        let left = 0;

        switch (placement) {
            case "bottom-left":
                top = rect.bottom + window.scrollY + 8;
                left = rect.right + window.scrollX - cardRect.width;
                break;
            case "bottom-right":
                top = rect.bottom + window.scrollY + 8;
                left = rect.left + window.scrollX;
                break;
            case "top-left":
                top = rect.top + window.scrollY - cardRect.height - 8;
                left = rect.right + window.scrollX - cardRect.width;
                break;
            case "top-right":
                top = rect.top + window.scrollY - cardRect.height - 8;
                left = rect.left + window.scrollX;
                break;
            case "center-right":
                top = rect.top + window.scrollY + rect.height / 2 - cardRect.height / 2;
                left = rect.right + window.scrollX + 12;
                break;
            case "center-left":
                top = rect.top + window.scrollY + rect.height / 2 - cardRect.height / 2;
                left = rect.left + window.scrollX - cardRect.width - 12;
                break;
            default:
                break;
        }

        setPos({ top, left });
    };

    useLayoutEffect(() => {
        updatePosition();
        window.addEventListener("scroll", updatePosition, true);
        window.addEventListener("resize", updatePosition);

        return () => {
            window.removeEventListener("scroll", updatePosition, true);
            window.removeEventListener("resize", updatePosition);
        };
    }, [placement, show]);

    return (
        <>
            {/* TRIGGER */}
            <div
                ref={targetRef}
                className={`inline-block ${className}`}
                onMouseEnter={handleEnter}
                onMouseLeave={handleLeave}
            >
                {children}
            </div>

            {/* HOVER CARD */}
            {show &&
                createPortal(
                    <div
                        ref={cardRef}
                        className="absolute z-[9999]"
                        style={{ top: pos.top, left: pos.left }}
                        onMouseEnter={handleEnter}
                        onMouseLeave={handleLeave}
                    >
                        <div
                            className={`w-full max-h-[400px] overflow-y-auto py-4 md:max-w-sm lg:max-w-md 
                  rounded-xl backdrop-blur-md bg-white border border-gray-400 shadow-xl ${cardClassName}`}
                        >
                            {isLoading ? (
                                <div className="flex flex-col items-center justify-center gap-2 py-2">
                                    <Loader2 className="w-8 h-8 animate-spin text-gray-700" />
                                    <span className="text-sm font-medium text-gray-700 animate-pulse whitespace-nowrap">
                                        Loading employee info…
                                    </span>
                                </div>
                            ) : isError ? (
                                <div className="flex flex-col items-center justify-center gap-2 py-4 text-red-600">
                                    <p className="text-sm font-semibold">Failed to load employee info.</p>
                                    <p className="text-xs">{error?.message ?? "Unknown error"}</p>
                                </div>
                            ) : (
                                <div className="text-gray-800 font-semibold">
                                    {(EmployeeInfo?.data ?? []).map((item: any) => (
                                        <div
                                            key={item.label}
                                            className="grid grid-cols-2 w-[300px] px-2 py-2 border-b border-gray-300"
                                        >
                                            <p className="text-xs text-gray-500">{item.label}</p>
                                            <span className="text-xs">{item.value ?? "—"}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>,
                    document.body
                )}
        </>
    );
};

export default WrapperHoverCard;
