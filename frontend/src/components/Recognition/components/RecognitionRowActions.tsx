import React, { useState } from "react";
import { Download, Eye } from "lucide-react";
import { toast } from "react-hot-toast";
import Tooltip from "../../shared/Tooltip";
import { fetchAppreciationCertificate } from "../../../services/recognitionService";
import AppreciationDetailDrawer from "./AppreciationDetailDrawer";

// Normalised shape the row actions operate on (mapped from award / appreciation rows).
export type RecognitionActionItem = {
  /** Backend Employee Appreciation name — required for the PDF certificate. */
  name: string;
  title: string;
  person?: string;
  date?: string;
  direction?: "received" | "given";
  values?: string[];
  message?: string;
  org?: string;
  points?: number;
  status?: string;
};

// Decode the base64 certificate PDF and trigger a download.
const downloadPdf = (filename: string, base64: string) => {
  const bytes = atob(base64);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  const blob = new Blob([arr], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

type RecognitionRowActionsProps = {
  item: RecognitionActionItem;
  /** "buttons" = labelled pills (award history); "icons" = compact icon row. */
  layout?: "buttons" | "icons";
  actions?: ("view" | "download")[];
  /** Whether item.name is an Employee Appreciation (enables details fetch + PDF). */
  appreciation?: boolean;
  kind?: "appreciation" | "nomination";
  className?: string;
};

const RecognitionRowActions: React.FC<RecognitionRowActionsProps> = ({
  item,
  layout = "icons",
  actions = ["download", "view"],
  appreciation = true,
  kind = "appreciation",
  className = "",
}) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const download = async () => {
    if (!item.name) return;
    setDownloading(true);
    const id = toast.loading("Generating PDF…");
    try {
      const { filename, content_base64 } = await fetchAppreciationCertificate(item.name);
      downloadPdf(filename, content_base64);
      toast.success("Certificate downloaded.", { id });
    } catch (err) {
      toast.error((err as Error)?.message || "Download failed.", { id });
    } finally {
      setDownloading(false);
    }
  };

  const handlers = {
    view: () => setDrawerOpen(true),
    download,
  };

  const ICONS = {
    download: { icon: <Download className="h-4 w-4 text-primary" />, label: "Download" },
    view: { icon: <Eye className="h-4 w-4 text-primary" />, label: "View" },
  } as const;

  return (
    <>
      {layout === "icons" ? (
        <div
          className={`flex h-8 w-fit items-center gap-1 rounded-3xl bg-gray-10 px-3 py-1 ${className}`}
        >
          {actions.map((a, i) => (
            <React.Fragment key={a}>
              {i > 0 && <span className="h-4 w-px bg-gray-300" />}
              <Tooltip content={ICONS[a].label} position="top">
                <button
                  type="button"
                  onClick={handlers[a]}
                  aria-label={`${ICONS[a].label} ${kind}`}
                  className="flex items-center justify-center"
                >
                  {ICONS[a].icon}
                </button>
              </Tooltip>
            </React.Fragment>
          ))}
        </div>
      ) : (
        <div className={`flex items-center gap-2 ${className}`}>
          {actions.map((a) => (
            <button
              key={a}
              type="button"
              onClick={handlers[a]}
              disabled={a === "download" && downloading}
              className="flex items-center gap-1.5 rounded-lg border border-purple-200 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-purple-50"
            >
              {ICONS[a].icon}
              {a === "download" && downloading ? "Preparing…" : ICONS[a].label}
            </button>
          ))}
        </div>
      )}

      <AppreciationDetailDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        item={item}
        appreciation={appreciation}
        kind={kind}
        downloading={downloading}
        onDownload={appreciation ? download : undefined}
      />
    </>
  );
};

export default RecognitionRowActions;
