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

// 🎨 Pastel Color Generator
const stringToPastelColor = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = Math.abs(hash % 360);
    return `hsl(${h}, 65%, 58%)`;
};

// 👤 Avatar Renderer
const getAvatar = (data: any[]) => {
    const imageItem = data.find((item) => item.label === "Image");
    const fullName = data.find((item) => item.label === "Full Name")?.value || "";
    const employeeId = data.find((item) => item.label === "ID (name)")?.value || "";
    const fallbackChar = fullName?.charAt(0)?.toUpperCase() ?? "?";

    const color = stringToPastelColor(fullName || "default");

    const AvatarWrapper = ({ children }: { children: React.ReactNode }) => (
        <div className="flex flex-col items-center gap-2 pb-3">
            {children}
            <div className="text-center">
                <p className="text-sm font-semibold text-gray-900 leading-tight">
                    {fullName}
                </p>
                <p className="text-xs text-gray-500">{employeeId}</p>
            </div>
        </div>
    );

    if (imageItem?.value) {
        return (
            <AvatarWrapper>
                <img
                    src={imageItem.value}
                    alt="avatar"
                    className="w-14 h-14 rounded-full object-cover ring-2 ring-gray-200"
                />
            </AvatarWrapper>
        );
    }

    return (
        <AvatarWrapper>
            <div
                className="w-14 h-14 rounded-full flex items-center justify-center text-white font-semibold text-xl shadow-inner"
                style={{ background: color }}
            >
                {fallbackChar}
            </div>
        </AvatarWrapper>
    );
};

const WrapperHoverCard: React.FC<WrapperHoverCardProps> = ({
    children,
    className = "",
    cardClassName = "",
    employeeId = "",
    placement = "center-right",
}) => {
    const { mutateAsync: fetchEmployee } = useGetEmployeeHoverData();

    const [isLoading, setIsLoading] = useState(false);
    const [isError, setIsError] = useState(false);
    const [error, setError] = useState<any>(null);
    const [EmployeeInfo, setEmployeeInfo] = useState<any>(null);

    const hasFetchedRef = useRef(false);

    const handleFetchProfile = async () => {
        if (hasFetchedRef.current || !employeeId) return;

        setIsLoading(true);
        setIsError(false);
        setError(null);

        try {
            const data = await fetchEmployee(employeeId);
            setEmployeeInfo(data);
            hasFetchedRef.current = true;
        } catch (err: any) {
            setIsError(true);
            setError(err);
        } finally {
            setIsLoading(false);
        }
    };

    const targetRef = useRef<HTMLDivElement>(null);
    const cardRef = useRef<HTMLDivElement>(null);

    const [pos, setPos] = useState({ top: 0, left: 0 });
    const [show, setShow] = useState(false);
    const hideTimer = useRef<any>(null);

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
        }

        setPos({ top, left });
    };

    useLayoutEffect(() => {
        if (show) updatePosition();
        window.addEventListener("scroll", updatePosition, true);
        window.addEventListener("resize", updatePosition);

        return () => {
            window.removeEventListener("scroll", updatePosition, true);
            window.removeEventListener("resize", updatePosition);
        };
    }, [show, placement]);

    return (
        <>
            {/* Trigger */}
            <div
                ref={targetRef}
                className={`inline-block ${className}`}
                onMouseEnter={() => {
                    handleEnter();
                    handleFetchProfile();
                }}
                onMouseLeave={handleLeave}
            >
                {children}
            </div>

            {/* Hover Card */}
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
                            className={`w-[260px] max-h-[380px] overflow-hidden rounded-xl 
                bg-white border border-gray-200 shadow-xl ${cardClassName}`}
                        >
                            <div className="px-3 pt-3">
                                {isLoading ? (
                                    <div className="flex flex-col items-center gap-1.5 py-4">
                                        <Loader2 className="w-6 h-6 animate-spin text-gray-600" />
                                        <span className="text-[11px] font-medium text-gray-500">
                                            Loading employee info…
                                        </span>
                                    </div>
                                ) : isError ? (
                                    <div className="py-4 text-center text-red-600">
                                        <p className="text-xs font-semibold">
                                            Failed to load data
                                        </p>
                                        <p className="text-[11px] opacity-80">
                                            {error?.message ?? "Unknown error"}
                                        </p>
                                    </div>
                                ) : EmployeeInfo?.data ? (
                                    <>
                                        {/* Avatar */}
                                        <div className="pb-2">
                                            {getAvatar(EmployeeInfo.data)}
                                        </div>

                                        {/* Details */}
                                        <div className="border-t pt-2 max-h-[240px] overflow-y-auto scrollbar-hide">
                                            <table className="w-full">
                                                <tbody>
                                                    {EmployeeInfo.data
                                                        .filter(
                                                            (item: any) =>
                                                                !["Full Name", "ID (name)", "Image"].includes(
                                                                    item.label
                                                                )
                                                        )
                                                        .map((item: any) => (
                                                            <tr
                                                                key={item.label}
                                                                className="flex justify-between gap-3 py-[2px]"
                                                            >
                                                                <td className="text-[11px] border-none font-medium text-gray-600 whitespace-nowrap">
                                                                    {item.label}
                                                                </td>
                                                                <td className="text-[11px] border-none text-gray-900 text-right break-words">
                                                                    {item.value ?? "—"}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </>
                                ) : (
                                    <p className="text-[11px] text-gray-500 py-4 text-center">
                                        No data available
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>,
                    document.body
                )}
        </>
    );
};

export default WrapperHoverCard;
