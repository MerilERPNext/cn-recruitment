import { memo } from "react";
import { History } from "lucide-react";
import { Typography } from "../../../shared/atoms/Typography";

const PageHeader = ({ setShowActivityLog }: { setShowActivityLog: (show: boolean) => void }) => (
  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
    <div>
      <Typography variant="h3" className="font-bold text-slate-900">
        Onboarding
      </Typography>
      <Typography variant="caption" className="text-slate-500">
        Manage and view your onboarding details
      </Typography>
    </div>
    <button 
      onClick={() => setShowActivityLog(true)} 
      className="w-full sm:w-auto flex justify-center items-center gap-2 px-4 py-2.5 sm:py-2 bg-white border border-slate-200 rounded-xl sm:rounded-lg shadow-sm text-sm font-medium text-slate-700 hover:bg-slate-50 active:bg-slate-100 transition-colors"
    >
      <History size={16} className="text-slate-500" />
      View Activity Log
    </button>
  </div>
);

export default memo(PageHeader);
