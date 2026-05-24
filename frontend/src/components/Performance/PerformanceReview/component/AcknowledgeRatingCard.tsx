import { ArrowRight, FileSignature } from "lucide-react";
import { Typography } from "../../../shared/atoms/Typography";

type AcknowledgeRatingCardProps = {
  agreed: boolean;
  comment: string;
  onAgreedChange: (agreed: boolean) => void;
  onCommentChange: (comment: string) => void;
};

const AcknowledgeRatingCard = ({
  agreed,
  comment,
  onAgreedChange,
  onCommentChange,
}: AcknowledgeRatingCardProps) => {
  return (
    <div className="mb-8 flex flex-col gap-5 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:mb-12 sm:p-6">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-blue-500">
          <FileSignature className="h-5 w-5" />
        </div>
        <div className="mt-0.5 flex min-w-0 flex-col">
          <Typography
            variant="h3"
            className="mb-1 text-lg font-bold leading-snug text-gray-900"
          >
            Acknowledge your Final Rating
          </Typography>
          <Typography
            variant="bodyMedium"
            className="text-sm leading-relaxed text-gray-600"
          >
            Acknowledging confirms you've seen this rating. If you disagree, you
            can{" "}
            <span className="cursor-pointer font-medium text-red-600 hover:underline">
              Raise a Concern
            </span>{" "}
            within <strong>7 days</strong> — it goes to HRBP{" "}
            <strong>Aditi Sharma</strong>.
          </Typography>
        </div>
      </div>

      <textarea
        aria-label="Optional comment for manager"
        value={comment}
        onChange={(event) => onCommentChange(event.target.value)}
        placeholder="Optional comment for your manager..."
        className="min-h-[80px] w-full resize-none rounded-lg border border-gray-200 p-3 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
      />

      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <label className="group flex min-w-0 cursor-pointer items-start gap-3 sm:items-center">
          <div className="relative mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border border-gray-300 bg-white transition-colors group-hover:border-blue-500 sm:mt-0">
            <input
              aria-label="Confirm rating acknowledgement"
              type="checkbox"
              className="peer sr-only"
              checked={agreed}
              onChange={(event) => onAgreedChange(event.target.checked)}
            />
            <div
              className={`absolute inset-0 rounded border border-blue-500 bg-blue-500 transition-opacity ${
                agreed ? "opacity-100" : "opacity-0"
              }`}
            />
            <svg
              className={`absolute h-3.5 w-3.5 text-white transition-opacity ${
                agreed ? "opacity-100" : "opacity-0"
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="3"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <Typography
            variant="bodyMedium"
            className="select-none text-sm leading-relaxed text-gray-700"
          >
            I have read and understood my rating
          </Typography>
        </label>

        <div className="flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:items-center">
          <button
            className="w-full rounded-lg border border-red-200 px-5 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 sm:w-auto"
            aria-label="Raise a concern"
          >
            Raise a Concern
          </button>
          <button
            className={`flex w-full items-center justify-center gap-2 rounded-lg px-6 py-2.5 text-sm font-medium transition-colors sm:w-auto ${
              agreed
                ? "bg-blue-500 text-white shadow-sm hover:bg-blue-600"
                : "cursor-not-allowed bg-blue-300 text-white"
            }`}
            aria-label="Acknowledge and e-sign performance review"
          >
            Acknowledge & e-Sign <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AcknowledgeRatingCard;

