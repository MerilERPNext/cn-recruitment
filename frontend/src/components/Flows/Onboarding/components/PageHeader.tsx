import { memo } from "react";
import { History } from "lucide-react";
import { Typography } from "../../../shared/atoms/Typography";

const PageHeader = ({ setShowActivityLog }: { setShowActivityLog: (show: boolean) => void }) => (
  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
    <div>
      <Typography variant="h3" className="font-bold text-text-title">
        Onboarding
      </Typography>
      <Typography variant="caption" className="text-text-body2">
        Manage and view your onboarding details
      </Typography>
    </div>
    <button 
      onClick={() => setShowActivityLog(true)} 
      className="w-full sm:w-auto flex justify-center items-center gap-2 px-4 py-2.5 sm:py-2 bg-card border border-border rounded-xl sm:rounded-lg shadow-sm text-sm font-semibold text-text-body1 hover:bg-gray-50 hover:border-border-strong active:bg-gray-100 transition-colors"
    >
      <History size={16} className="text-primary" />
      View Activity Log
    </button>
  </div>
);

export default memo(PageHeader);
