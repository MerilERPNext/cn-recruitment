// Badge.jsx

const Badge = ({ label, backgroundColor = 'bg-gray-200', textColor = 'text-black' }: { label: string, backgroundColor?: string, textColor?: string }) => {
    return (
        <span className={`flex items-center justify-center py-1 px-3 rounded-xl text-sm font-medium ${backgroundColor} ${textColor}`}>
            {label}
        </span>
    );
};

export default Badge;
