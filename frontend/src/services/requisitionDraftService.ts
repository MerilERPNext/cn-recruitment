import FrappeAPI from "../utils/frappeAPI";

/**
 * "Save as Draft" on the requisition wizard. A draft holds the form's own
 * state — not a Job Requisition — so nothing is validated, approved or
 * created until the form is actually submitted. Drafts are private to whoever
 * saved them; the server scopes every call to the caller.
 *
 * Backend: recruitment/api/requisition_draft.py
 */

export interface RequisitionDraftSummary {
  name: string;
  title: string;
  hiring_type?: string | null;
  company?: string | null;
  department?: string | null;
  designation?: string | null;
  positions_count?: number | null;
  modified: string;
}

export interface RequisitionDraft {
  name: string;
  title: string;
  modified: string;
  /** The wizard's `formData`, plus the hiring type it was saved with. */
  state: Record<string, any>;
}

const METHOD = "recruitment.api.requisition_draft";

export const requisitionDraftService = {
  save: async (
    state: Record<string, any>,
    name?: string | null,
  ): Promise<{ name: string; title: string; modified: string }> =>
    FrappeAPI.callMethod(`${METHOD}.save_requisition_draft`, {
      state,
      name: name || undefined,
    }) as Promise<{ name: string; title: string; modified: string }>,

  list: async (): Promise<RequisitionDraftSummary[]> => {
    const res = (await FrappeAPI.callMethod(`${METHOD}.list_requisition_drafts`, {})) as
      | RequisitionDraftSummary[]
      | null;
    return Array.isArray(res) ? res : [];
  },

  get: async (name: string): Promise<RequisitionDraft> =>
    FrappeAPI.callMethod(`${METHOD}.get_requisition_draft`, { name }) as Promise<RequisitionDraft>,

  remove: async (name: string): Promise<void> => {
    await FrappeAPI.callMethod(`${METHOD}.delete_requisition_draft`, { name });
  },
};
