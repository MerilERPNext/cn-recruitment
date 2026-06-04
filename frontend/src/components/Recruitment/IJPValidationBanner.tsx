import { AlertTriangle, X } from "lucide-react";

type ValidationBannerProps = {
  fields: string[];
  onDismiss: () => void;
};

export default function IJPValidationBanner({
  fields,
  onDismiss,
}: ValidationBannerProps) {
  if (fields.length === 0) return null;
  return (
    <div className="relative flex items-start gap-3 bg-rose-50 border border-rose-200 rounded-xl px-5 py-4 shadow-sm">
      {/* left accent bar */}
      <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl bg-rose-500" />
      <div className="shrink-0 mt-0.5 text-rose-500">
        <AlertTriangle size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-rose-700 mb-1">
          Please complete all required fields before proceeding
        </p>
        <ul className="flex flex-wrap gap-1.5 mt-1.5">
          {fields.map((f) => (
            <li
              key={f}
              className="inline-flex items-center text-[10px] font-semibold bg-rose-100 text-rose-700 px-2 py-0.5 rounded border border-rose-250"
            >
              {f}
            </li>
          ))}
        </ul>
      </div>
      <button
        onClick={onDismiss}
        className="shrink-0 text-rose-400 hover:text-rose-600 transition-colors"
        aria-label="Dismiss"
      >
        <X size={15} />
      </button>
    </div>
  );
}
