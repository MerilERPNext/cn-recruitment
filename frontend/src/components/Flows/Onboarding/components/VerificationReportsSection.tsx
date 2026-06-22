import { memo } from "react";
import Badge from "../../../shared/Badge";
import { Typography } from "../../../shared/atoms/Typography";

const VerificationReportsSection = () => (
  <div className="space-y-5">
    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <Typography variant="bodyMedium" className="font-bold text-slate-800">
          Intermediate Report
        </Typography>
        <Badge label="In Progress" variant="warning" size="sm" />
      </div>
      <a href="#" className="text-blue-500 hover:text-blue-700 font-semibold text-sm transition-colors">
        Reassign Partner
      </a>
    </div>

    <div className="bg-blue-50 border border-slate-100 rounded-xl p-5 space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <ReportField label="Verification Type" value="Onboarding BGV" />
        <ReportField label="Partner Name" value="OnGrid" />
        <ReportField label="Assigned On" value="30 - 07 - 2025" />
        <ReportField label="Last Updated on" value="05 - 08 - 2025" />
        <ReportField label="Report Status" value="Verification Initiated" />
        <ReportField label="Report" value="-" />
      </div>

      <div className="border-t border-slate-100 pt-4 space-y-1">
        <ReportField label="Comments" value="BGV initiated for the candidate" />
      </div>
    </div>

    <a href="#" className="inline-block text-blue-500 hover:text-blue-700 font-semibold text-sm transition-colors">
      View all Reports (2)
    </a>
  </div>
);

const ReportField = memo(({ label, value }: { label: string; value: string }) => (
  <div className="space-y-1">
    <Typography
      variant="bodySmall"
      className="text-slate-400 font-medium text-xs uppercase tracking-wider block"
    >
      {label}
    </Typography>
    <Typography variant="body" className="font-bold text-slate-800 block">
      {value}
    </Typography>
  </div>
));

export default memo(VerificationReportsSection);
