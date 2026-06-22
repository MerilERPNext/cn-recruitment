import { memo } from "react";
import Badge from "../../../shared/Badge";
import CardTable from "../../../shared/CardTable";
import { Typography } from "../../../shared/atoms/Typography";
import FilterButton from "./FilterButton";
import SearchInput from "./SearchInput";
import { DocumentRow } from "./types";

interface DocumentsSectionProps {
  documents: DocumentRow[];
  searchQuery: string;
  onSearchChange: (value: string) => void;
  isDesktop: boolean;
}

const DocumentsSection = ({
  documents,
  searchQuery,
  onSearchChange,
  isDesktop,
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
            <DocumentDesktopRow key={idx} doc={doc} />
          ) : (
            <DocumentMobileRow key={idx} doc={doc} />
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

const DocumentDesktopRow = memo(({ doc }: { doc: DocumentRow }) => (
  <div
    className="grid gap-4 px-6 py-4 border-b border-slate-100 items-center hover:bg-slate-50/50 transition-colors text-sm"
    style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr" }}
  >
    <Typography variant="bodySmall" className="font-semibold text-left text-slate-800">
      {doc.name}
    </Typography>
    <div className="flex justify-center">
      <Badge
        label={doc.status}
        variant={doc.status === "Completed" ? "success" : "warning"}
        size="sm"
      />
    </div>
    <Typography variant="bodySmall" className="text-slate-500 text-center">
      {doc.timeSinceTrigger}
    </Typography>
    <Typography variant="bodySmall" className="text-slate-500 text-center">
      {doc.completionDate}
    </Typography>
    <div className="text-center">
      <a href="#" className="text-blue-500 hover:text-blue-700 font-semibold transition-colors text-sm">
        View
      </a>
    </div>
  </div>
));

const DocumentMobileRow = memo(({ doc }: { doc: DocumentRow }) => (
  <div className="p-4 border-b border-slate-100 hover:bg-slate-50/50 transition-colors space-y-3">
    <div className="flex justify-between items-start gap-2">
      <Typography variant="body" className="font-bold text-slate-800 break-words">
        {doc.name}
      </Typography>
      <Badge
        label={doc.status}
        variant={doc.status === "Completed" ? "success" : "warning"}
        size="sm"
      />
    </div>
    <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
      <div>
        <span className="font-semibold text-slate-400 block uppercase tracking-wider text-[10px]">
          Time Since Trigger
        </span>
        <span>{doc.timeSinceTrigger}</span>
      </div>
      <div>
        <span className="font-semibold text-slate-400 block uppercase tracking-wider text-[10px]">
          Completion Date
        </span>
        <span>{doc.completionDate}</span>
      </div>
    </div>
    <div className="pt-1">
      <a href="#" className="text-blue-500 hover:text-blue-700 font-semibold text-sm transition-colors">
        View
      </a>
    </div>
  </div>
));

export default memo(DocumentsSection);
