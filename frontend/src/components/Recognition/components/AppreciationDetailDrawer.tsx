/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from "react";
import { Download, Trophy, X } from "lucide-react";
import { useAppreciationDetails } from "../../../services/recognitionService";
import type { RecognitionActionItem } from "./RecognitionRowActions";

const API_HOST =
  (import.meta as any).env?.VITE_API_BASE_URL ||
  (import.meta as any).env?.VITE_API_DOMAIN ||
  (typeof window !== "undefined" ? window.location.origin : "");

const resolveImage = (image?: string | null): string | undefined => {
  if (!image) return undefined;
  if (/^https?:\/\//i.test(image)) return image;
  if (image.startsWith("/")) return `${API_HOST}${image}`;
  return image;
};

const Section: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="mb-6">
    <p className="mb-1.5 text-sm font-bold text-gray-900">{label}</p>
    {children}
  </div>
);

const Badge: React.FC<{ logo?: string; title: string }> = ({ logo, title }) => {
  const src = resolveImage(logo);
  const [failed, setFailed] = useState(false);
  return (
    <div className="flex items-center gap-3">
      {src && !failed ? (
        <img
          src={src}
          alt=""
          onError={() => setFailed(true)}
          className="size-10 rounded-lg object-cover"
        />
      ) : (
        <div className="flex size-10 items-center justify-center rounded-lg bg-indigo-100">
          <Trophy className="size-5 text-indigo-500" />
        </div>
      )}
      <span className="text-sm text-gray-700">{title}</span>
    </div>
  );
};

type Props = {
  open: boolean;
  onClose: () => void;
  item: RecognitionActionItem;
  /** When true, fetch rich Employee Appreciation details by name. */
  appreciation?: boolean;
  kind?: "appreciation" | "nomination";
  onDownload?: () => void;
  downloading?: boolean;
};

const AppreciationDetailDrawer: React.FC<Props> = ({
  open,
  onClose,
  item,
  appreciation = true,
  kind = "appreciation",
  onDownload,
  downloading,
}) => {
  const { data: detail, isLoading } = useAppreciationDetails(
    item.name,
    open && appreciation,
  );
  const [hideNote, setHideNote] = useState(false);

  if (!open) return null;

  // Prefer fetched detail, fall back to the row's own fields.
  const title = detail?.title || item.title;
  const logo = detail?.logo;
  const personName =
    item.direction === "given"
      ? detail?.receiver_name || item.person
      : detail?.recognized_by || item.person;
  const date = detail?.date || item.date;
  const points = detail?.points ?? item.points;
  const note = detail?.note || item.message;
  const values = detail?.values || item.values || [];

  const isNomination = kind === "nomination";
  const personLabel = isNomination
    ? "Nominated By"
    : item.direction === "given"
      ? "Given To"
      : "Recognized by";
  const dateLabel = isNomination ? "Nomination Date" : "Received Date";
  const noteLabel = isNomination ? "Nomination Note" : "Nomination Note";

  return (
    <div className="fixed inset-0 z-[1000]">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Slide-over panel */}
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-[460px] flex-col bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-base font-bold text-gray-900">
            {isNomination ? "Nomination Details" : "Appreciation Details"}
          </h2>
          <button onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-gray-700">
            <X className="size-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {isLoading ? (
            <p className="py-10 text-center text-sm text-gray-400">Loading…</p>
          ) : (
            <>
              <Section label={isNomination ? "Award" : "Appreciation"}>
                <Badge logo={logo} title={title} />
              </Section>

              {personName && (
                <Section label={personLabel}>
                  <p className="text-sm font-medium text-blue-600">{personName}</p>
                </Section>
              )}

              {date && (
                <Section label={dateLabel}>
                  <p className="text-sm text-gray-700">{date}</p>
                </Section>
              )}

              {isNomination && item.status && (
                <Section label="Status">
                  <p className="text-sm text-gray-700">{item.status}</p>
                </Section>
              )}

              {typeof points === "number" && points > 0 && (
                <Section label="Points Received">
                  <p className="text-sm text-gray-700">{points}</p>
                </Section>
              )}

              {note && (
                <Section label={noteLabel}>
                  <p className="text-sm text-gray-600">{note}</p>
                  {!isNomination && (
                    <button
                      type="button"
                      onClick={() => setHideNote((v) => !v)}
                      className="mt-3 flex items-center gap-2"
                    >
                      <span
                        className={`relative h-5 w-9 rounded-xl transition-colors ${
                          hideNote ? "bg-primary" : "bg-gray-300"
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 size-4 rounded-2xl bg-white transition-all ${
                            hideNote ? "left-[18px]" : "left-0.5"
                          }`}
                        />
                      </span>
                      <span className="text-sm text-gray-600">Hide Note from Profile</span>
                    </button>
                  )}
                </Section>
              )}

              {values.length > 0 && (
                <Section label="Values">
                  <div className="flex flex-wrap gap-2">
                    {values.map((v, i) => (
                      <span
                        key={`${v}-${i}`}
                        className="rounded-md bg-blue-50 px-3 py-1 text-xs font-medium text-blue-600"
                      >
                        {v}
                      </span>
                    ))}
                  </div>
                </Section>
              )}
            </>
          )}
        </div>

        {/* Footer actions */}
        {onDownload && (
          <div className="flex items-center justify-end gap-2 border-t border-gray-100 px-6 py-4">
            {onDownload && appreciation && (
              <button
                onClick={onDownload}
                disabled={downloading}
                className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-600 disabled:opacity-60"
              >
                <Download className="size-4" /> {downloading ? "Preparing…" : "Download PDF"}
              </button>
            )}
          </div>
        )}
      </aside>
    </div>
  );
};

export default AppreciationDetailDrawer;
