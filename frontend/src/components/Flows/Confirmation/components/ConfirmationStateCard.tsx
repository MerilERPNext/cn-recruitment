import React from "react";
import { Typography } from "../../../shared/atoms/Typography";
import { LucideIcon } from "lucide-react";
import { useScreenSize } from "../../../../hooks/useScreenSize";

type dataType = {
  label: string;
  value?: string;
  Icon: LucideIcon;
  bg: string;
  text: string;
};

interface ConfirmationStateCardProps {
  data: dataType;
}

const ConfirmationStateCard: React.FC<ConfirmationStateCardProps> = ({
  data,
}) => {
  const { isDesktop } = useScreenSize();

  if (isDesktop) {
    return (
      <div className="flex items-center gap-4 px-4 py-8 bg-white border border-slate-200 hover:border-primary rounded-xl shadow-sm">
        <div
          className={`w-10 h-10 flex items-center justify-center rounded-lg ${data.bg} ${data.text}`}
        >
          <data.Icon size={20} strokeWidth={1.75} />
        </div>

        <div className="space-y-0.5">
          <Typography variant="bodyMedium" className="font-semibold">
            {data.value || "-"}
          </Typography>
          <Typography variant="bodySmall">{data.label}</Typography>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col rounded-xl shadow-sm">
      <Typography variant="bodySmall">{data.label}</Typography>
      <Typography variant="bodyMedium" className="font-semibold">
        {data.value || "-"}
      </Typography>
    </div>
  );
};

export default ConfirmationStateCard;
