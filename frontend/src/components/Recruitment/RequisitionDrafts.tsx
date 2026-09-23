/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { FileEdit, Trash2 } from "lucide-react";
import { Card } from "../shared/atoms/Card";
import { Typography } from "../shared/atoms/Typography";
import formatToIndianDate from "../../utils/formatToIndianDate";
import { errorResponseFormater } from "../../utils/errorResponseFormater";
import {
  requisitionDraftService,
  type RequisitionDraftSummary,
} from "../../services/requisitionDraftService";

/**
 * Requisitions the user saved with "Save as Draft" but has not submitted.
 * A draft is only the form's own state — no requisition exists yet — so this
 * sits above the list rather than in it, and renders nothing at all when there
 * are no drafts.
 */
const RequisitionDrafts = () => {
  const navigate = useNavigate();
  const [drafts, setDrafts] = useState<RequisitionDraftSummary[]>([]);
  const [removing, setRemoving] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    requisitionDraftService
      .list()
      .then((rows) => {
        if (!cancelled) setDrafts(rows);
      })
      // A drafts panel that cannot load is not worth an error toast over the
      // list the user actually came for.
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const openDraft = useCallback(
    (name: string) => {
      navigate(`/webapp/recruitment/requisition/new?draft=${encodeURIComponent(name)}`);
    },
    [navigate],
  );

  const discardDraft = useCallback(async (name: string, title: string) => {
    if (!window.confirm(`Delete the draft "${title}"? This cannot be undone.`)) return;
    setRemoving(name);
    try {
      await requisitionDraftService.remove(name);
      setDrafts((rows) => rows.filter((row) => row.name !== name));
      toast.success("Draft deleted.");
    } catch (err: any) {
      toast.error(errorResponseFormater(err, "Could not delete this draft."));
    } finally {
      setRemoving(null);
    }
  }, []);

  if (!drafts.length) return null;

  return (
    <Card radius="xl" className="border p-4 md:p-5 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <FileEdit className="size-4 text-gray-500" />
        <Typography variant="subheading" color="primary">
          Drafts ({drafts.length})
        </Typography>
        <Typography variant="bodySmall" color="body2">
          — not submitted yet
        </Typography>
      </div>

      <ul className="flex flex-col divide-y divide-gray-100">
        {drafts.map((draft) => {
          const details = [draft.department, draft.company, draft.hiring_type]
            .filter(Boolean)
            .join(" · ");
          return (
            <li key={draft.name} className="flex items-center gap-3 py-2">
              <button
                type="button"
                onClick={() => openDraft(draft.name)}
                className="flex-1 text-left min-w-0"
                title="Continue this draft"
              >
                <Typography variant="body" color="primary" className="truncate">
                  {draft.title}
                </Typography>
                <Typography variant="bodySmall" color="body2" className="truncate">
                  {details ? `${details} · ` : ""}
                  Saved {formatToIndianDate(draft.modified)}
                </Typography>
              </button>
              <button
                type="button"
                onClick={() => openDraft(draft.name)}
                className="text-sm font-medium text-primary-600 hover:underline shrink-0"
              >
                Continue
              </button>
              <button
                type="button"
                onClick={() => discardDraft(draft.name, draft.title)}
                disabled={removing === draft.name}
                className="p-1 text-gray-400 hover:text-red-600 disabled:opacity-50 shrink-0"
                title="Delete this draft"
                aria-label={`Delete draft ${draft.title}`}
              >
                <Trash2 className="size-4" />
              </button>
            </li>
          );
        })}
      </ul>
    </Card>
  );
};

export default RequisitionDrafts;
