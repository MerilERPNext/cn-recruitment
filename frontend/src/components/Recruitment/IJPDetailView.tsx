import { propsDetailViewComponents } from "./IJPTypes";
import formatToIndianDate from "../../utils/formatToIndianDate";
import Button from "../shared/atoms/Button";
import DOMPurify from "dompurify";

export default function DetailView({
  job,
  appliedIds,
  onBack,
  onApply,
}: propsDetailViewComponents) {
  const applied = appliedIds.includes(job.name);
  return (
    <div className="w-full max-w-full overflow-hidden text-sm text-[#1a1a2e] px-2">
      <div className="text-xs text-gray-500 mb-5">
        <span
          className="text-gray-500 cursor-pointer no-underline hover:underline"
          onClick={onBack}
        >
          Internal Job Movement
        </span>
        <span className="mx-1.5 opacity-50">/</span>
        <strong>
          {job.job_title} ({job.name || job.opening_code})
        </strong>
      </div>
      <div className="bg-white border border-gray-200 rounded-xl p-5 flex flex-wrap items-center justify-between gap-3 mb-4 w-full max-w-full">
        <div className="min-w-0 flex-1 pr-2">
          <span className="text-lg font-semibold text-[#1a1a2e] block md:inline truncate">
            {job.job_title} ({job.name || job.opening_code})
          </span>
          <span className="text-xs text-gray-500 md:ml-2.5 block md:inline mt-1 md:mt-0">
            (Open since {job.posted_on ? formatToIndianDate(job.posted_on) : ""}
            )
          </span>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" bgColor="secondary" onClick={onBack}>
            Back
          </Button>
          {applied ? (
            <Button bgColor="success" disabled>
              ✓ Applied
            </Button>
          ) : (
            <Button bgColor="primary" onClick={onApply}>
              Apply
            </Button>
          )}
        </div>
      </div>
      <div className="flex flex-col md:flex-row gap-4 w-full max-w-full">
        <div className="flex-1 bg-white border border-gray-200 rounded-xl p-5 min-w-0">
          <div
            className="prose prose-sm max-w-none text-xs text-slate-700 leading-relaxed mb-3.5 break-words"
            dangerouslySetInnerHTML={{
              __html: DOMPurify.sanitize(job.description || ""),
            }}
          />
        </div>
        <div className="w-full md:w-60 shrink-0 bg-white border border-gray-200 rounded-xl p-5">
          {[
            ["Company", job.company],
            ["Department", job.department],
            ["Location", job.location],
            ["Designation", job.designation],
            [
              "Expires on",
              job.closes_on ? formatToIndianDate(job.closes_on) : "--",
            ],
          ].map(([label, value]) => (
            <div key={label} className="mb-5 last:mb-0">
              <div className="text-[10px] text-slate-500 mb-1 uppercase tracking-wider font-semibold">
                {label}
              </div>
              <div className="text-xs text-slate-900 leading-relaxed font-semibold break-words">
                {value}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
