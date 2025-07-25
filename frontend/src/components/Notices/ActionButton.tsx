import React from 'react';

interface Props {
    children: React.ReactNode;
    onClick: (e?: React.MouseEvent) => void;
    variant?: 'primary' | 'danger' | 'secondary';
    className?: string;
    disabled?: boolean;
}

const ActionButton = ({ children, onClick, variant = 'primary', className = '', disabled = false }: Props) => {
    const baseClasses = "text-xs font-medium py-1.5 px-3 rounded-md transition-colors";
    const variantClasses: Record<string, string> = {
        primary: "bg-blue-500 text-white hover:bg-blue-700 disabled:bg-blue-300",
        danger: "bg-red-500 text-white hover:bg-red-600 disabled:bg-red-300",
        secondary: "bg-gray-200 text-gray-800 hover:bg-gray-300 disabled:bg-gray-100"
    };

    return (
        <button
            className={`${baseClasses} ${variantClasses[variant]} ${className} ${disabled ? 'cursor-not-allowed' : ''}`}
            onClick={onClick}
            disabled={disabled}
        >
            {children}
        </button>
    );
};

export default ActionButton;
