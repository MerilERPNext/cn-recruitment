import { memo } from "react";
import StatusBadge from "../../../shared/atoms/statusBadge";
import CardTable from "../../../shared/CardTable";
import { Typography } from "../../../shared/atoms/Typography";
import FilterButton from "./FilterButton";
import SearchInput from "./SearchInput";
import { OnboardingDocument } from "../../../../types/onboarding";
import { useNavigate } from "react-router-dom";
import formatToIndianDate from "../../../../utils/formatToIndianDate";

interface DocumentsSectionProps {
  documents: OnboardingDocument[];
  searchQuery: string;
  onSearchChange: (value: string) => void;
  isDesktop: boolean;
  onboardingId: string;
}

const DocumentsSection = ({
  documents,
  searchQuery,
  onSearchChange,
  isDesktop,
  onboardingId,
}: DocumentsSectionProps) => (
  <div className="space-y-4">
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
      <SearchInput value={searchQuery} onChange={onSearchChange} />
      <FilterButton />
    </div>

    <CardTable
      titles={[
        "Onboarding Form Name",
        "Status",
        "Time Since Trigger",
        "Completion Date",
        "Actions",
      ]}
      columnWidths={["2fr", "1fr", "1fr", "1fr", "1fr"]}
    >
      {documents.length > 0 ? (
        documents.map((doc, idx) =>
          isDesktop ? (
            <DocumentDesktopRow key={doc.form || idx} doc={doc} onboardingId={onboardingId} />
          ) : (
            <DocumentMobileRow key={doc.form || idx} doc={doc} onboardingId={onboardingId} />
          )
        )
      ) : (
        <div className="p-8 text-center text-slate-400 text-sm">
          No documents found
        </div>
      )}
    </CardTable>
  </div>
);

const DocumentDesktopRow = memo(({ doc, onboardingId }: { doc: OnboardingDocument, onboardingId: string }) => {
  const navigate = useNavigate();

  return (
    <div
      className="grid gap-4 px-6 py-4 border-b border-slate-100 items-center hover:bg-slate-50/50 transition-colors text-sm"
      style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr" }}
    >
      <div className="flex flex-col justify-center items-center min-w-0 px-2">
        <Typography variant="bodySmall" className="font-semibold text-center truncate w-full block text-slate-800">
          {doc.form_name || "—"}
        </Typography>
      </div>
      <div className="flex justify-center items-center">
        <StatusBadge status={doc.status || "—"} />
      </div>
      <div className="flex justify-center items-center">
        <Typography variant="bodySmall" className="font-medium text-center text-slate-600">
          {doc.time_since_trigger_days != null ? `${doc.time_since_trigger_days}d ago` : "—"}
        </Typography>
      </div>
      <div className="flex justify-center items-center">
        <Typography variant="bodySmall" className="font-medium text-center text-slate-600">
          {doc.completion_date ? formatToIndianDate(doc.completion_date) : "—"}
        </Typography>
      </div>
      <div className="flex justify-center items-center">
        <a
          href={`/webapp/employee-onboarding/onboarding-field-approval/${onboardingId}`}
          onClick={(e) => {
            e.preventDefault();
            navigate(`/webapp/employee-onboarding/onboarding-field-approval/${onboardingId}`);
          }}
          className="text-primary-600 hover:text-primary-700 font-semibold transition-colors text-sm underline"
        >
          View
        </a>
      </div>
    </div>
  );
});

const DocumentMobileRow = memo(({ doc, onboardingId }: { doc: OnboardingDocument, onboardingId: string }) => {
  const navigate = useNavigate();

  return (
    <div className="bg-white rounded-2xl border border-slate-100 border-t-4 border-t-primary-500 shadow-sm p-4 sm:p-5 space-y-4 mb-4 transition-all">
      <div className="flex justify-between items-start gap-2">
        <div className="min-w-0 flex-1">
          <Typography variant="mobileCardTitle" className="font-medium text-slate-800 block break-words">
            {doc.form_name || "—"}
          </Typography>
        </div>
        <div className="flex-shrink-0">
          <StatusBadge status={doc.status || "-"} />
        </div>
      </div>
      <div className="space-y-2.5 mb-2">
        <div className="flex justify-between items-start text-sm gap-4">
          <Typography variant="mobileCardLabel" className="block text-gray-500 shrink-0 mt-0.5 whitespace-nowrap">
            Time Since Trigger
          </Typography>
          <Typography variant="mobileCardValue" className="text-right flex-1 min-w-0 mt-0.5 text-slate-600">
            {doc.time_since_trigger_days != null ? `${doc.time_since_trigger_days}d ago` : "—"}
          </Typography>
        </div>
        <div className="flex justify-between items-start text-sm gap-4">
          <Typography variant="mobileCardLabel" className="block text-gray-500 shrink-0 mt-0.5 whitespace-nowrap">
            Completion Date
          </Typography>
          <Typography variant="mobileCardValue" className="text-right flex-1 min-w-0 mt-0.5 text-slate-600">
            {doc.completion_date ? formatToIndianDate(doc.completion_date) : "—"}
          </Typography>
        </div>
      </div>
      <div className="pt-2">
        <a
          href={`/webapp/employee-onboarding/onboarding-field-approval/${onboardingId}`}
          onClick={(e) => {
            e.preventDefault();
            navigate(`/webapp/employee-onboarding/onboarding-field-approval/${onboardingId}`);
          }}
          className="w-full flex justify-center items-center px-4 py-2 bg-white border border-slate-200 rounded-lg shadow-sm text-sm font-medium text-slate-700 hover:bg-slate-50 active:bg-slate-100 transition-colors"
        >
          View Document
        </a>
      </div>
    </div>
  );
});

export default memo(DocumentsSection);
