import React from "react";
import { Loader2 } from "lucide-react";
import { useGetEmployeeHoverData } from "../../hooks/useEmployee";

type WrapperHoverCardProps = {
    children: React.ReactNode;
    className?: string;
    cardClassName?: string;
    employeeId?: string;
    placement?: "bottom-right" | "bottom-left" | "top-right" | "top-left" | "center-left" | "center-right";
};

const data = {
    data: [
        { label: "Employee", value: "PP00129" },
        { label: "First Name", value: "omkar" },
        { label: "Middle Name", value: null },
        { label: "Last Name", value: null },
        { label: "Full Name", value: "omkar" },
        { label: "Gender", value: "Transgender" },
        { label: "Image", value: "/private/files/photo-1568602471122-7832951cc4c5.jpeg" },
        { label: "Bank A/C No.", value: null },
        { label: "Marital Status", value: "" },
        { label: "Encashment Date", value: null }
    ]
};

const WrapperHoverCard: React.FC<WrapperHoverCardProps> = ({
    children,
    className = "",
    cardClassName = "",
    employeeId = "",
    placement = "center-right"
}) => {

    const { data: EmployeeInfo, isLoading } = useGetEmployeeHoverData(employeeId);

    const positionClasses: Record<string, string> = {
        "bottom-right": "top-1/2 left-full",
        "bottom-left": "top-1/2 right-full",
        "top-right": "bottom-1/2 left-full",
        "top-left": "bottom-1/2 right-full",
        "center-left": "top-0 -translate-y-1/2 right-[calc(100%+10px)]",
        "center-right": "top-0 -translate-y-1/2 left-[calc(100%+10px)]",
    };

    return (
        <div className={`relative inline-block group ${className}`}>
            {/* Trigger */}
            <div>{children}</div>

            {/* Hover Card */}
            <div
                className={`
        absolute py-4 opacity-0 group-hover:opacity-100 
        pointer-events-none group-hover:pointer-events-auto
        transition-opacity duration-150 z-[9999] 
        ${positionClasses[placement]}
    `}
            >
                <div
                    className={`w-full max-h-[400px] overflow-y-auto py-4 md:max-w-sm lg:max-w-md 
            rounded-xl backdrop-blur-md bg-white border border-gray-400 shadow-xl ${cardClassName}`}
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
                            {data?.data?.map(item => (
                                <div key={item.label} className="grid grid-cols-2 w-[300px] px-2 py-2 border-b border-gray-400">
                                    <p className="text-sm text-gray-500">{item.label}</p>
                                    <span>{item.value ?? "—"}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

        </div>
    );
};

export default WrapperHoverCard;
