import { useRef, useState } from "react";
import { Eye, Loader2, Paperclip, X } from "lucide-react";
import RecognitionCcFields from "../RecognitionCcFields";
import {
  useCertificateTemplates,
  type NominationRow,
} from "../../../services/recognitionService";

/**
 * "Points Allocation" — the publish form for one award nomination.
 *
 * Publishing is irreversible, so everything issued alongside it is chosen here
 * rather than afterwards: the certificate template, an optional voucher, and
 * who gets CC'd on the certificate email.
 */

export interface PublishNominationModalProps {
  row: NominationRow;
  /** Program title + code, shown under "Talent Program". */
  programTitle: string;
  programCode?: string;
  busy?: boolean;
  error?: string;
  onCancel: () => void;
  onPublish: (payload: {
    certificateTemplate?: string;
    ccEmployees: string[];
    ccEmails: string[];
    voucher?: File;
  }) => void;
}

const PublishNominationModal: React.FC<PublishNominationModalProps> = ({
  row,
  programTitle,
  programCode,
  busy = false,
  error,
  onCancel,
  onPublish,
}) => {
  const [certificateTemplate, setCertificateTemplate] = useState("");
  const [ccEmployees, setCcEmployees] = useState<string[]>([]);
  const [ccEmails, setCcEmails] = useState<string[]>([]);
  const [voucher, setVoucher] = useState<File | null>(null);
  const [showCc, setShowCc] = useState(false);
  const voucherInput = useRef<HTMLInputElement>(null);

  const { data: templates = [], isLoading: templatesLoading } =
    useCertificateTemplates();

  const selected = templates.find((t) => t.name === certificateTemplate);

  // The nominee cell reads "Anuja Joshi (PW1617)" — id only when we have one.
  const nominee = row.nominee_id
    ? `${row.nominee} (${row.nominee_id})`
    : row.nominee;

  return (
    <div
      className="fixed inset-0 z-[1100] flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="publish-title"
    >
      <div className="absolute inset-0 bg-black/50" onClick={busy ? undefined : onCancel} />

      <div className="relative max-h-[90vh] w-[calc(100%-2rem)] max-w-3xl overflow-y-auto rounded-lg bg-white p-6 shadow-2xl md:p-8">
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          aria-label="Close"
          className="absolute right-4 top-4 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50"
        >
          <X className="size-4" />
        </button>

        <h2 id="publish-title" className="text-lg font-semibold text-gray-900">
          Points Allocation
        </h2>

        <div className="mt-4">
          <p className="text-xs text-gray-500">Talent Program</p>
          <p className="text-base font-semibold text-gray-900">
            {programCode ? `${programTitle} (${programCode})` : programTitle}
          </p>
        </div>

        {/* Nominee / Certificates / Voucher */}
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-left">
            <thead>
              <tr className="bg-gray-50 text-xs font-semibold text-gray-600">
                <th className="px-4 py-3">Nominee</th>
                <th className="px-4 py-3">Certificates</th>
                <th className="px-4 py-3">Voucher</th>
              </tr>
            </thead>
            <tbody>
              <tr className="align-middle">
                <td className="px-4 py-4 text-sm text-gray-800">{nominee}</td>

                <td className="px-4 py-4">
                  <div className="flex items-center gap-2">
                    <select
                      aria-label="Select certificate template"
                      value={certificateTemplate}
                      onChange={(e) => setCertificateTemplate(e.target.value)}
                      disabled={busy || templatesLoading}
                      className="min-w-[210px] flex-1 rounded border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#e2622b] disabled:bg-gray-50"
                    >
                      <option value="">
                        {templatesLoading ? "Loading…" : "Select Template"}
                      </option>
                      {templates.map((template) => (
                        <option key={template.name} value={template.name}>
                          {template.letter_name}
                        </option>
                      ))}
                    </select>

                    {/* Preview the chosen template; inert until one is picked. */}
                    <button
                      type="button"
                      title={selected ? `Preview ${selected.letter_name}` : "Select a template to preview"}
                      aria-label="Preview template"
                      disabled={!selected}
                      onClick={() =>
                        selected &&
                        window.open(
                          `/app/document-template/${encodeURIComponent(selected.name)}`,
                          "_blank",
                          "noopener",
                        )
                      }
                      className="shrink-0 rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Eye className="size-4" />
                    </button>
                  </div>
                </td>

                <td className="px-4 py-4">
                  <input
                    ref={voucherInput}
                    type="file"
                    className="hidden"
                    onChange={(e) => setVoucher(e.target.files?.[0] ?? null)}
                  />
                  {voucher ? (
                    <span className="inline-flex max-w-[200px] items-center gap-1.5 text-sm text-gray-700">
                      <Paperclip className="size-3.5 shrink-0 text-gray-400" />
                      <span className="truncate" title={voucher.name}>
                        {voucher.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => setVoucher(null)}
                        disabled={busy}
                        aria-label="Remove voucher"
                        className="shrink-0 text-gray-400 hover:text-red-600"
                      >
                        <X className="size-3.5" />
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => voucherInput.current?.click()}
                      disabled={busy}
                      className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#e2622b] hover:underline disabled:opacity-50"
                    >
                      <Paperclip className="size-3.5" />
                      Add Voucher
                    </button>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* CC. Collapsed to a link until asked for, as in the reference. */}
        <div className="mt-5">
          {showCc ? (
            <RecognitionCcFields
              showEmployees
              showEmails
              ccEmployees={ccEmployees}
              onChangeEmployees={setCcEmployees}
              ccEmails={ccEmails}
              onChangeEmails={setCcEmails}
              disabled={busy}
            />
          ) : (
            <button
              type="button"
              onClick={() => setShowCc(true)}
              className="text-sm font-semibold text-[#e2622b] hover:underline"
            >
              Add Employees to CC
            </button>
          )}
        </div>

        <div className="mt-6 rounded border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-xs text-amber-800">
            Publishing is an irreversible action. Please review carefully before
            publishing.
          </p>
        </div>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded border border-gray-300 px-5 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-60"
          >
            CANCEL
          </button>
          <button
            type="button"
            onClick={() =>
              onPublish({
                certificateTemplate: certificateTemplate || undefined,
                ccEmployees,
                ccEmails,
                voucher: voucher ?? undefined,
              })
            }
            disabled={busy}
            className="inline-flex items-center gap-2 rounded bg-[#e2622b] px-6 py-2 text-sm font-semibold text-white hover:bg-[#cf5721] disabled:opacity-60"
          >
            {busy && <Loader2 className="size-4 animate-spin" />}
            PUBLISH
          </button>
        </div>
      </div>
    </div>
  );
};

export default PublishNominationModal;
