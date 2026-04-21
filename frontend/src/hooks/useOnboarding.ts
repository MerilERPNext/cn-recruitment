import { useState, useCallback, useRef } from "react";
import type React from "react";
import {
  fetchApprovalFields,
  updateFieldApprovalStatus,
  updateSectionApprovalStatus,
  bulkUpdateApprovalStatus,
} from "../services/employeeOnboardingService";
import type {
  ApprovalField,
  ApprovalStatus,
  ApiConfig,
  FieldLocalState,
  SectionEntry,
  Toast,
  ToastType,
  UseApprovalActionsReturn,
  UseApprovalDataReturn,
  UseSectionNavReturn,
  UseToastReturn,
} from "../types/onboarding";

// ─── Utility: Build section map from flat field list ──────────────────────────

function buildSections(fields: ApprovalField[]): Record<string, SectionEntry> {
  return fields.reduce<Record<string, SectionEntry>>((map, field) => {
    const key = field.section || "General";
    if (!map[key]) {
      map[key] = { section_fieldname: field.section_fieldname || "", fields: [] };
    }
    map[key].fields.push(field);
    return map;
  }, {});
}

// ─── Utility: Build initial local state from API field list ───────────────────

function buildInitialFieldStates(
  fields: ApprovalField[]
): Record<string, FieldLocalState> {
  return fields.reduce<Record<string, FieldLocalState>>((acc, field) => {
    acc[field.fieldname] = {
      status: field.status || "Pending",
      comment: "",
      showComment: false,
      loading: false,
    };
    return acc;
  }, {});
}

// ─── useToast ─────────────────────────────────────────────────────────────────

/**
 * Manages a temporary toast notification.
 * Auto-dismisses after 2800ms.
 */
export function useToast(): UseToastReturn {
  const [toast, setToast] = useState<Toast | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback(
    (msg: string, type: ToastType = "success") => {
      setToast({ msg, type });
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setToast(null), 2800);
    },
    []
  );

  return { toast, showToast };
}

// ─── useApprovalData ──────────────────────────────────────────────────────────

/**
 * Fetches approval fields from the API and manages their local state.
 * Exposes helpers to mutate individual field states optimistically.
 */
export function useApprovalData(config: ApiConfig): UseApprovalDataReturn {
  const [allFields, setAllFields] = useState<ApprovalField[]>([]);
  const [sections, setSections] = useState<Record<string, SectionEntry>>({});
  const [fieldStates, setFieldStates] = useState<Record<string, FieldLocalState>>({});
  const [pageLoading, setPageLoading] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setPageLoading(true);
    setPageError(null);
    setAllFields([]);
    setSections({});
    setFieldStates({});

    try {
      const fields = await fetchApprovalFields(config);

      if (fields.length === 0) {
        throw new Error("No fields returned from API. Check your onboarding name.");
      }

      setAllFields(fields);
      setSections(buildSections(fields));
      setFieldStates(buildInitialFieldStates(fields));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unexpected error occurred.";
      setPageError(message);
    } finally {
      setPageLoading(false);
    }
  }, [config.baseUrl, config.onboardingName, config.authToken]); // eslint-disable-line

  const patchFieldState = useCallback(
    (fieldname: string, patch: Partial<FieldLocalState>) => {
      setFieldStates((prev) => ({
        ...prev,
        [fieldname]: { ...prev[fieldname], ...patch },
      }));
    },
    []
  );

  return {
    allFields,
    sections,
    fieldStates,
    pageLoading,
    pageError,
    loadData,
    patchFieldState,
    setFieldStates,
  };
}

// ─── useApprovalActions ───────────────────────────────────────────────────────

/**
 * Wraps all approval mutation API calls.
 * Each action optimistically updates local state, calls the service,
 * then shows a toast on completion or error.
 */
export function useApprovalActions(
  config: ApiConfig,
  sections: Record<string, SectionEntry>,
  patchFieldState: (fieldname: string, patch: Partial<FieldLocalState>) => void,
  setFieldStates: React.Dispatch<
    React.SetStateAction<Record<string, FieldLocalState>>
  >,
  showToast: (msg: string, type?: ToastType) => void
): UseApprovalActionsReturn {

  // ── Single field approve / reject ──────────────────────────────────────────

  const singleAction = useCallback(
    async (fieldname: string, status: ApprovalStatus) => {
      patchFieldState(fieldname, { loading: true });

      try {
        await updateFieldApprovalStatus(config, fieldname, status);
        patchFieldState(fieldname, { status, loading: false });
        showToast(`"${fieldname}" ${status.toLowerCase()}`, "success");
      } catch (err: unknown) {
        patchFieldState(fieldname, { loading: false });
        const msg = err instanceof Error ? err.message : "Request failed";
        showToast(`Error: ${msg}`, "error");
      }
    },
    [config, patchFieldState, showToast]
  );

  // ── Bulk selected fields approve / reject ──────────────────────────────────

  const bulkSelectedAction = useCallback(
    async (fieldnames: string[], status: ApprovalStatus) => {
      if (fieldnames.length === 0) return;

      fieldnames.forEach((fn) => patchFieldState(fn, { loading: true }));

      let successCount = 0;

      await Promise.allSettled(
        fieldnames.map(async (fn) => {
          try {
            await updateFieldApprovalStatus(config, fn, status);
            patchFieldState(fn, { status, loading: false });
            successCount++;
          } catch {
            patchFieldState(fn, { loading: false });
          }
        })
      );

      const total = fieldnames.length;
      const toastType: ToastType =
        successCount === total ? "success" : successCount > 0 ? "info" : "error";
      showToast(`${successCount}/${total} fields ${status.toLowerCase()}`, toastType);
    },
    [config, patchFieldState, showToast]
  );

  // ── Section approve / reject ───────────────────────────────────────────────

  const sectionAction = useCallback(
    async (sectionName: string, status: ApprovalStatus) => {
      try {
        await updateSectionApprovalStatus(config, sectionName, status);

        const sectionFields = sections[sectionName]?.fields ?? [];
        sectionFields.forEach((f) => patchFieldState(f.fieldname, { status }));

        showToast(`Section "${sectionName}" ${status.toLowerCase()}`, "success");
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Request failed";
        showToast(`Error: ${msg}`, "error");
      }
    },
    [config, sections, patchFieldState, showToast]
  );

  // ── Bulk approve ALL pending fields across entire document ─────────────────

  const bulkApproveAllPending = useCallback(async () => {
    try {
      await bulkUpdateApprovalStatus(config, "Approved");

      setFieldStates((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((fn) => {
          if (next[fn].status === "Pending") {
            next[fn] = { ...next[fn], status: "Approved" };
          }
        });
        return next;
      });

      showToast("All pending fields approved", "success");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Request failed";
      showToast(`Error: ${msg}`, "error");
    }
  }, [config, setFieldStates, showToast]);

  return {
    singleAction,
    bulkSelectedAction,
    sectionAction,
    bulkApproveAllPending,
  };
}

// ─── useSectionNav ────────────────────────────────────────────────────────────

/**
 * Manages which section is active and exposes prev/next navigation.
 * Resets selectedFields on section change via the onNavigate callback.
 */
export function useSectionNav(
  secKeys: string[],
  onNavigate?: () => void
): UseSectionNavReturn {
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const goToSection = useCallback(
    (key: string) => {
      setActiveSection(key);
      onNavigate?.();
    },
    [onNavigate]
  );

  const activeIdx = activeSection ? secKeys.indexOf(activeSection) : -1;

  const goNext = useCallback(() => {
    if (activeIdx < secKeys.length - 1) goToSection(secKeys[activeIdx + 1]);
  }, [activeIdx, secKeys, goToSection]);

  const goPrev = useCallback(() => {
    if (activeIdx > 0) goToSection(secKeys[activeIdx - 1]);
  }, [activeIdx, secKeys, goToSection]);

  // Auto-select first section when keys become available
  const prevKeysRef = useRef<string[]>([]);
  if (
    secKeys.length > 0 &&
    prevKeysRef.current.length === 0 &&
    activeSection === null
  ) {
    prevKeysRef.current = secKeys;
    setActiveSection(secKeys[0]);
  }

  return { activeSection, secKeys, activeIdx, goToSection, goNext, goPrev };
}