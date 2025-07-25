const UnreadIndicator = ({ color = 'bg-blue-500' }) => (
    <div className={`absolute top-2 right-2 w-3 h-3 ${color} rounded-full`} title="Unread notification" />
);

export default UnreadIndicator;
