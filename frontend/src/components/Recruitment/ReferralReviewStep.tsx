import { AlertTriangle } from "lucide-react";

import { ReferralField as Field, ReferralApplicationValue } from "../../types/recruitment";

interface ReferralReviewStepProps {
  sections: string[];
  fields: Field[];
  formData: Record<string, ReferralApplicationValue>;
  acknowledged: boolean;
  setAcknowledged: (val: boolean) => void;
  missingRequiredFields: string[];
  hasMissingRequiredFields: boolean;
}

export default function ReferralReviewStep({
  sections,
  fields,
  formData,
  acknowledged,
  setAcknowledged,
  missingRequiredFields,
  hasMissingRequiredFields,
}: ReferralReviewStepProps) {
  const renderValue = (field: Field) => {
    const val = formData[field.reference_name];
    if (val === undefined || val === null || val === "") {
      if (field.reqd === 1) {
        return (
          <span className="text-rose-500 font-semibold">
            Missing required field
          </span>
        );
      }
      return <span className="text-gray-400">—</span>;
    }

    if (
      typeof val === "string" &&
      (field.fieldtype === "Attach" ||
        field.fieldtype === "Attach Image" ||
        val.startsWith("http://") ||
        val.startsWith("https://") ||
        val.startsWith("/files/"))
    ) {
      return (
        <a
          href={val}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 font-semibold hover:underline"
        >
          View Attachment
        </a>
      );
    }

    if (typeof val === "boolean") {
      return val ? "Yes" : "No";
    }

    return String(val);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h2 className="text-base font-bold text-slate-800">
          Review Referral Details
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Please review the referral information below before submitting.
        </p>
      </div>

      {hasMissingRequiredFields && (
        <div className="bg-rose-50/70 border border-rose-200/80 rounded-xl p-4 flex items-start gap-3">
          <div className="w-5 h-5 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
            <AlertTriangle size={12} className="text-rose-700" />
          </div>
          <div className="space-y-1">
            <h4 className="text-xs font-semibold text-rose-800">
              Required Information Missing
            </h4>
            <p className="text-xs text-rose-600 leading-relaxed">
              The following required fields must be completed before you can
              submit:
            </p>
            <ul className="list-disc list-inside text-[11px] text-rose-600 space-y-0.5 font-medium mt-1">
              {missingRequiredFields.map((f, idx) => (
                <li key={idx}>{f}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {sections
          .filter((s) => s !== "Review")
          .map((sect) => {
            const sectFields = fields.filter(
              (f) =>
                (f.section || "Basic Details") === sect &&
                f.visibility !== "None",
            );
            if (sectFields.length === 0) return null;

            return (
              <div
                key={sect}
                className="bg-slate-50/50 border border-slate-200/60 rounded-xl p-5 space-y-4"
              >
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200/60 pb-2">
                  {sect}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  {sectFields.map((field) => (
                    <div key={field.reference_name} className="space-y-1">
                      <span className="text-slate-400 font-medium block">
                        {field.display_name}{" "}
                        {field.reqd === 1 && (
                          <span className="text-rose-500">*</span>
                        )}
                      </span>
                      <span className="font-semibold text-slate-800 block">
                        {renderValue(field)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
      </div>

      {/* Acknowledge and Submit */}
      <div className="bg-blue-50/30 border border-blue-100 rounded-xl p-5 space-y-4 mt-6">
        <div className="flex items-start gap-3">
          <input
            id="acknowledge"
            type="checkbox"
            checked={acknowledged}
            onChange={(e) => setAcknowledged(e.target.checked)}
            className="w-4 h-4 mt-0.5 border-gray-300 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
          />
          <label
            htmlFor="acknowledge"
            className="text-xs text-slate-700 font-medium cursor-pointer select-none leading-relaxed"
          >
            I hereby declare that the referral details provided are accurate and
            the candidate has given consent to share their information for this
            opportunity.
          </label>
        </div>
      </div>
    </div>
  );
}
