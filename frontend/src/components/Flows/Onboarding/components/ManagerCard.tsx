import { memo } from "react";
import { Pencil } from "lucide-react";
import Avatar from "../../../shared/Avatar";
import { Typography } from "../../../shared/atoms/Typography";

const ManagerCard = () => (
  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-6 space-y-4">
    <div className="flex justify-between items-center">
      <Typography variant="bodyMedium" className="font-bold text-slate-800">
        Manager
      </Typography>
      <button className="text-blue-500 hover:text-blue-700 transition-colors">
        <Pencil size={16} />
      </button>
    </div>

    <div className="flex gap-3 sm:gap-4 items-start">
      <Avatar
        name="Gopal Kumar"
        src=""
        size="h-14 w-14 shrink-0"
      />
      <div className="min-w-0 space-y-1">
        <Typography variant="body" className="font-bold text-slate-800 leading-tight block break-words">
          Gopal Kumar
        </Typography>
        <Typography variant="caption" className="text-slate-500 leading-relaxed block break-words">
          Human Resources | Corporate - KLJ Noida One - Noida - UP, Noida, Uttar Pradesh
        </Typography>
      </div>
    </div>
  </div>
);

export default memo(ManagerCard);
