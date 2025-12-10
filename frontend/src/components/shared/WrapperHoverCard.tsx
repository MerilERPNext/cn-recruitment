import React from "react";
import { Loader2 } from "lucide-react";
import { useCurrentEmployee } from "../../hooks/useEmployee";

type WrapperHoverCardProps = {
    children: React.ReactNode;
    className?: string;
    cardClassName?: string;
    employeeId?: string;
    placement?: "bottom-right" | "bottom-left" | "top-right" | "top-left" | "center-left" | "center-right";
};

const WrapperHoverCard: React.FC<WrapperHoverCardProps> = ({
    children,
    className = "",
    cardClassName = "",
    employeeId = "",
    placement = "center-right"
}) => {

    const { data, isLoading } = useCurrentEmployee();

    const positionClasses: Record<string, string> = {
        "bottom-right": "top-1/2 left-full",
        "bottom-left": "top-1/2 right-full",
        "top-right": "bottom-1/2 left-full",
        "top-left": "bottom-1/2 right-full",
        "center-left": "top-0 -translate-y-1/2 right-[calc(100%+10px)]",
        "center-right": "top-0 -translate-y-1/2 left-[calc(100%+10px)]",
    };

    return (
        <div className={`group relative inline-block ${className}`}>
            <div className="relative z-10">{children}</div>

            <div
                className={`pointer-events-none absolute p-4 opacity-100 z-[9999] ${positionClasses[placement]}`}
            >
                <div
                    className="w-full max-w-xs md:max-w-sm lg:max-w-md rounded-xl backdrop-blur-md bg-gray-200 border border-gray-600/10 shadow-xl p-4 pointer-events-auto opacity-0 group-hover:opacity-100 "
                    style={{
                        WebkitBackdropFilter: "blur(4px)",
                        backdropFilter: "blur(4px)",
                    }}
                >
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center gap-2 py-2">
                            <Loader2 className="w-8 h-8 animate-spin text-gray-700" />
                            <span className="text-sm font-medium text-gray-700 animate-pulse whitespace-nowrap">
                                Loading employee info…
                            </span>
                        </div>
                    ) : (
                        <div className="text-gray-800 font-semibold">
                            <p className="whitespace-nowrap font-bold ">{data?.employee_name}</p>
                            <p className="whitespace-nowrap text-sm font-semibold text-gray-500">{data?.name}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default WrapperHoverCard;
