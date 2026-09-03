import React from "react";
import { FolderSearch } from "lucide-react";
import { Typography } from "./Typography";
import { BeatLoader } from "react-spinners";
import Button from "./Button";

interface NoDataFoundProps {
    title?: string;
    subtitle?: string;
    className?: string;
    loading?: boolean;
    onClick?: () => void;
}

export const NoDataFound: React.FC<NoDataFoundProps> = ({
    title = "No Data Found",
    subtitle = "There's nothing to show here right now.",
    className = "",
    loading = false,
    onClick,
}) => {
    if (loading) {
        return (
            <div className={`flex flex-col items-center justify-center py-10 px-4 ${className}`}>
                <BeatLoader color="rgb(var(--primary))" size={10} />
            </div>
        );
    }

    return (
        <div
            className={`flex flex-col items-center justify-center py-10 px-4 ${className}`}
            style={{ animation: "ndFadeUp 0.5s ease-out both" }}
        >
            <div
                className="relative mb-5"
                style={{ animation: "ndFloat 3s ease-in-out infinite" }}
            >
                <div
                    className="relative flex items-center justify-center w-20 h-20 rounded-2xl bg-primary/10 border border-primary/30"
                    style={{ boxShadow: "0 4px 16px rgb(var(--shadow-color))" }}
                >
                    <FolderSearch className="text-text-link" size={32} strokeWidth={1.8} />
                </div>
                <span
                    className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-primary-300"
                    style={{ animation: "ndOrbit 3s ease-in-out infinite" }}
                />
                <span
                    className="absolute -bottom-1 -left-2 w-1.5 h-1.5 rounded-full bg-secondary-300"
                    style={{ animation: "ndOrbit 3s ease-in-out infinite 1s" }}
                />
                <span
                    className="absolute top-1/2 -right-3 w-1 h-1 rounded-full bg-primary-200"
                    style={{ animation: "ndOrbit 3s ease-in-out infinite 0.5s" }}
                />
            </div>
            <Typography variant="subheading" color="title" className="mb-1 text-center">
                {title}
            </Typography>
            <Typography variant="bodySmall" color="body2" className="text-center max-w-xs">
                {onClick ? (
                    <Button
                        variant="soft"
                        size="md"
                        onClick={onClick}
                        className="bg-primary/10 text-text-link border border-primary/20 hover:bg-primary/20 hover:border-primary/40"
                    >
                        {subtitle}
                    </Button>
                ) : (
                    subtitle
                )}
            </Typography>
        </div>
    );
};

export default NoDataFound;
