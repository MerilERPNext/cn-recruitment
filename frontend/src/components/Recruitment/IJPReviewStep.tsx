import React from "react";
import { IJPField, IJPApplicationValue } from "./IJPTypes";
import Button from "../shared/atoms/Button";

interface IJPReviewStepProps {
  sections: string[];
  fields: IJPField[];
  rowCounts: Record<string, number>;
  formData: Record<string, IJPApplicationValue>;
  acknowledged: boolean;
  setAcknowledged: (val: boolean) => void;
  missingRequiredFields: string[];
  hasMissingRequiredFields: boolean;
  onSubmit: () => void;
  onBack: () => void;
  submitPending: boolean;
}

export default function IJPReviewStep({
  sections,
  fields,
  rowCounts,
  formData,
  acknowledged,
  setAcknowledged,
  missingRequiredFields,
  hasMissingRequiredFields,
  onSubmit,
  onBack,
  submitPending,
}: IJPReviewStepProps) {
  const renderFileOrObject = (val: unknown): React.ReactNode => {
    if (Array.isArray(val) && val.length > 0) {
      const first = val[0];
      if (first && typeof first === "object") {
        const obj = first as Record<string, unknown>;
        const name = String(obj.name || "File uploaded");
        const url = String(obj.url || obj.file_url || "");
        if (url) {
          return (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              {name}
            </a>
          );
        }
        return name;
      }
    }
    if (val && typeof val === "object" && val !== null && !Array.isArray(val)) {
      const obj = val as Record<string, unknown>;
      const name = String(obj.name || "File uploaded");
      const url = String(obj.url || obj.file_url || "");
      if (url) {
        return (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            {name}
          </a>
        );
      }
      return name;
    }
    return String(val);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Review Application</h2>
        <p className="text-base text-slate-500 mt-1">
          Please review all the information you entered. Once submitted, you will not be able to edit these details.
        </p>
      </div>

      {hasMissingRequiredFields && (
        <div className="bg-rose-50/70 border border-rose-200/80 rounded-xl p-4 flex items-start gap-3">
          <div className="w-5 h-5 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-base shrink-0 mt-0.5">
            ⚠️
          </div>
          <div className="space-y-1">
            <h4 className="text-base font-semibold text-rose-800">
              Required Information Missing
            </h4>
            <p className="text-base text-rose-600 leading-relaxed">
              The following required fields must be completed before you can submit:
            </p>
            <ul className="list-disc list-inside text-[15px] text-rose-600 space-y-0.5 font-medium mt-1">
              {missingRequiredFields.map((f, idx) => (
                <li key={idx}>{f}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {sections.filter((s) => s !== "Review").map((sect) => {
          const sectFields = fields.filter(
            (f) => f.section === sect && f.visibility !== "Hidden"
          );
          if (sectFields.length === 0) return null;

          return (
            <div
              key={sect}
              className="bg-slate-50/50 border border-slate-200/60 rounded-xl p-5 space-y-4"
            >
              <h3 className="text-base font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200/60 pb-2">
                {sect}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sectFields.map((field) => {
                  if (field.fieldtype === "Table") {
                    const rowCount =
                      rowCounts[field.reference_name] ??
                      (field.reqd === 1 ? 1 : 0);
                    const subFields = field.table_fields || [];
                    const rows: { index: number; data: Record<string, IJPApplicationValue> }[] = [];
                    for (let i = 0; i < rowCount; i++) {
                      const rowData: Record<string, IJPApplicationValue> = {};
                      let hasValue = false;
                      subFields.forEach((sub) => {
                        const key = `${field.reference_name}_${i}_${sub.fieldname}`;
                        if (
                          formData[key] !== undefined &&
                          formData[key] !== null &&
                          formData[key] !== ""
                        ) {
                          rowData[sub.fieldname] = formData[key];
                          hasValue = true;
                        }
                      });
                      if (hasValue || rowCount === 1) {
                        rows.push({ index: i, data: rowData });
                      }
                    }

                    return (
                      <div
                        key={field.reference_name}
                        className="col-span-1 md:col-span-2 space-y-2"
                      >
                        <label className="text-base text-slate-500 font-medium">
                          {field.display_name}
                        </label>
                        {rows.length === 0 ? (
                          <div className="text-base text-slate-400 italic">
                            No entries added
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {rows.map((row) => (
                              <div
                                key={row.index}
                                className="bg-white border border-slate-150 rounded-lg p-3.5 shadow-sm space-y-3"
                              >
                                <div className="text-base font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded inline-block">
                                  Entry #{row.index + 1}
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  {subFields.map((sub) => {
                                    const key = `${field.reference_name}_${row.index}_${sub.fieldname}`;
                                    const rawVal = formData[key];
                                    const isMissing =
                                      sub.reqd === 1 &&
                                      (rawVal === undefined ||
                                        rawVal === null ||
                                        rawVal === "");
                                    const val = formData[`${key}_title`] || rawVal;

                                    return (
                                      <div
                                        key={sub.fieldname}
                                        className="space-y-0.5"
                                      >
                                        <span className="text-[14px] text-slate-400 font-medium block">
                                          {sub.label}{" "}
                                          {sub.reqd === 1 && (
                                            <span className="text-rose-500">
                                              *
                                            </span>
                                          )}
                                        </span>
                                        <span
                                          className={`text-base font-semibold block ${
                                            isMissing
                                              ? "text-rose-500"
                                              : "text-slate-800"
                                          }`}
                                        >
                                          {isMissing ? (
                                            "Missing required field"
                                          ) : typeof val === "object" &&
                                            val !== null ? (
                                            renderFileOrObject(val)
                                          ) : (
                                            String(val ?? "—")
                                          )}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  } else {
                    const rawVal = formData[field.reference_name];
                    const isMissing =
                      field.reqd === 1 &&
                      (rawVal === undefined ||
                        rawVal === null ||
                        rawVal === "");
                    const val = formData[`${field.reference_name}_title`] || rawVal;

                    return (
                      <div
                        key={field.reference_name}
                        className="space-y-1"
                      >
                        <span className="text-base text-slate-400 font-medium block">
                          {field.display_name}{" "}
                          {field.reqd === 1 && (
                            <span className="text-rose-500">*</span>
                          )}
                        </span>
                        <span
                          className={`text-base font-semibold block ${
                            isMissing ? "text-rose-500" : "text-slate-800"
                          }`}
                        >
                          {isMissing ? (
                            "Missing required field"
                          ) : typeof val === "object" && val !== null ? (
                            renderFileOrObject(val)
                          ) : field.fieldtype === "Check" ? (
                            val ? "Yes" : "No"
                          ) : (
                            String(val ?? "—")
                          )}
                        </span>
                      </div>
                    );
                  }
                })}
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
            className="text-base text-slate-700 font-medium cursor-pointer select-none leading-relaxed"
          >
            I hereby declare that all the information provided in this application is true, complete, and correct to the best of my knowledge and belief. I understand that any false statement or omission may result in rejection of my application or termination of employment if hired.
          </label>
        </div>
      </div>

      {/* Review Buttons */}
      <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-100">
        <Button variant="outline" bgColor="secondary" onClick={onBack}>
          Back
        </Button>
        <Button
          bgColor="primary"
          onClick={onSubmit}
          disabled={!acknowledged || hasMissingRequiredFields}
          loading={submitPending}
        >
          Submit Application
        </Button>
      </div>
    </div>
  );
}
