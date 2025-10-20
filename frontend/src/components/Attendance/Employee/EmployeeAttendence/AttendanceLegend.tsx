interface AttendanceLegendProps {
  isCompact?: boolean;
}

const AttendanceLegend: React.FC<AttendanceLegendProps> = ({
  isCompact = false,
}) => {
  const attendanceLegendItems = [
    {
      label: "Present",
      bgColor: "bg-green-100",
      textColor: "text-green-700",
      borderColor: "border-green-200",
    },
    {
      label: "Absent",
      bgColor: "bg-red-100",
      textColor: "text-red-700",
      borderColor: "border-red-200",
    },
    {
      label: "On Leave",
      bgColor: "bg-yellow-100",
      textColor: "text-yellow-700",
      borderColor: "border-yellow-200",
    },
    {
      label: "Unpaid",
      bgColor: "bg-orange-100",
      textColor: "text-orange-700",
      borderColor: "border-orange-200",
    },
    {
      label: "WFH",
      bgColor: "bg-purple-100",
      textColor: "text-purple-700",
      borderColor: "border-purple-200",
    },
    {
      label: "Holiday",
      bgColor: "bg-blue-100",
      textColor: "text-blue-700",
      borderColor: "border-blue-200",
    },
    {
      label: "Week Off",
      bgColor: "bg-gray-200",
      textColor: "text-gray-700",
      borderColor: "border-gray-300",
    },
  ];

  const eventDotLegendItems = [
    { label: "Attendance Request", dotColor: "bg-blue-500" },
    { label: "Leave Request", dotColor: "bg-pink-500" },
    { label: "Overtime Request", dotColor: "bg-orange-500" },
  ];

  const containerClass = isCompact
    ? "flex flex-wrap gap-2 text-xs justify-between px-4"
    : "flex flex-wrap gap-7 text-xs ml-5";

  const itemClass = isCompact
    ? "flex items-center gap-1 px-1 py-1 rounded-lg border"
    : "flex items-center gap-1 px-2 py-1 rounded-lg border";

  return (
    <div className="space-y-3">
      <div className={containerClass}>
        {attendanceLegendItems.map((item, index) => (
          <span
            key={index}
            className={`${itemClass} ${item.bgColor} ${item.textColor} ${item.borderColor}`}
          >
            {item.label}
          </span>
        ))}
      </div>
      <div className={containerClass}>
        {eventDotLegendItems.map((item, index) => (
          <span key={index} className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${item.dotColor}`}></div>
            <span className="text-gray-700">{item.label}</span>
          </span>
        ))}
      </div>
    </div>
  );
};

export default AttendanceLegend;
