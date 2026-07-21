import { statusConfig } from "../constants";

const StatusTimelineItem = ({
  isLast,
  status,
}: {
  isLast: boolean;
  status: keyof typeof statusConfig;
}) => {
  const {
    icon: Icon,
    bg,
    line,
  } = statusConfig[status] ?? statusConfig["default"];
  return (
    <div className="flex flex-shrink-0 items-center translate-y-6 flex-col">
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center ${bg}`}
      >
        <Icon size={14} className="text-white" />
      </div>

      {!isLast &&
        (status == "action_required" ? (
          <div className={`flex-1 w-[3px] bg-gray-400`}>
            {" "}
            <div className={`w-full h-4 ${line}`} />
          </div>
        ) : (
          <div className={`flex-1 w-[3px] ${line}`} />
        ))}
    </div>
  );
};

export default StatusTimelineItem;
