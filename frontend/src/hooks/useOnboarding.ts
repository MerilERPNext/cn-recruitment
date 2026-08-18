import { useState, useCallback, useRef } from "react";
import type React from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  fetchApprovalFields,
  updateFieldApprovalStatus,
  updateSectionApprovalStatus,
  bulkUpdateApprovalStatus,
  updateSelectedFieldsApprovalStatus,
} from "../services/employeeOnboardingService";
import type {
  ApprovalField,
  ApprovalStatus,
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

export function useToast(): UseToastReturn {
  const [toast, setToast] = useState<Toast | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback(
    (msg: string, type: ToastType = "success",) => {
      setToast({ msg, type });
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setToast(null), 2800);
    },
    []
  );

  return { toast, showToast };
}

// ─── useApprovalData ──────────────────────────────────────────────────────────

export function useApprovalData(onboardingName: string): UseApprovalDataReturn {
  const [allFields, setAllFields] = useState<ApprovalField[]>([]);
  const [sections, setSections] = useState<Record<string, SectionEntry>>({});
  const [fieldStates, setFieldStates] = useState<Record<string, FieldLocalState>>({});
  const [pageLoading, setPageLoading] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);

  const loadData = useCallback(async (silent: boolean = false) => {
    if (!silent) setPageLoading(true);
    setPageError(null);
    if (!silent) {
      setAllFields([]);
      setSections({});
      setFieldStates({});
    }

    try {
      const fields = await fetchApprovalFields(onboardingName);

      if (fields.length === 0) {
        throw new Error("No fields returned from API. Check your onboarding name.");
      }

      setAllFields(fields);
      setSections(buildSections(fields));
      
      if (silent) {
        setFieldStates((prev) => {
          const newStates = buildInitialFieldStates(fields);
          // Only add new states, preserve existing ones to avoid losing local modifications
          return { ...newStates, ...prev };
        });
      } else {
        setFieldStates(buildInitialFieldStates(fields));
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unexpected error occurred.";
      setPageError(message);
    } finally {
      if (!silent) setPageLoading(false);
    }
  }, [onboardingName]);

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

export function useApprovalActions(
  onboardingName: string,
  sections: Record<string, SectionEntry>,
  patchFieldState: (fieldname: string, patch: Partial<FieldLocalState>) => void,
  setFieldStates: React.Dispatch<
    React.SetStateAction<Record<string, FieldLocalState>>
  >,
  showToast: (msg: string, type?: ToastType) => void
): UseApprovalActionsReturn {

  const queryClient = useQueryClient();

  // Any field-status change affects the onboarding list view's progress, so
  // invalidate that list query to trigger a refetch.
  const refetchOnboardingList = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["onboarding"] });
  }, [queryClient]);

  // ── Single field approve / reject ──────────────────────────────────────────

  const singleAction = useCallback(
    async (fieldname: string, status: ApprovalStatus, comment?: string) => {
      patchFieldState(fieldname, { loading: true });

      try {
        await updateFieldApprovalStatus(onboardingName, fieldname, status, comment);
        patchFieldState(fieldname, { status, loading: false });
        refetchOnboardingList();
        showToast(`"${fieldname}" ${status.toLowerCase()}`, "success");
      } catch (err: unknown) {
        patchFieldState(fieldname, { loading: false });
        const msg = err instanceof Error ? err.message : "Request failed";
        showToast(`Error: ${msg}`, "error");
      }
    },
    [onboardingName, patchFieldState, showToast, refetchOnboardingList]
  );

  // ── Bulk selected fields approve / reject — uses new dedicated endpoint ────

  const bulkSelectedAction = useCallback(
    async (fieldnames: string[], status: ApprovalStatus, comment?: string) => {
      if (fieldnames.length === 0) return;

      // Mark all as loading
      fieldnames.forEach((fn) => patchFieldState(fn, { loading: true }));

      try {
        await updateSelectedFieldsApprovalStatus(onboardingName, fieldnames, status, comment);

        // On success update all statuses at once
        fieldnames.forEach((fn) =>
          patchFieldState(fn, { status, loading: false })
        );

        refetchOnboardingList();
        showToast(
          `${fieldnames.length} field${fieldnames.length > 1 ? "s" : ""} ${status.toLowerCase()}`,
          "success"
        );
      } catch (err: unknown) {
        fieldnames.forEach((fn) => patchFieldState(fn, { loading: false }));
        const msg = err instanceof Error ? err.message : "Request failed";
        showToast(`Error: ${msg}`, "error");
      }
    },
    [onboardingName, patchFieldState, showToast, refetchOnboardingList]
  );

  // ── Section approve / reject ───────────────────────────────────────────────

  const sectionAction = useCallback(
    async (sectionName: string, status: ApprovalStatus, comment?: string) => {
      try {
        await updateSectionApprovalStatus(onboardingName, sectionName, status, comment);

        const sectionFields = sections[sectionName]?.fields ?? [];
        sectionFields.forEach((f) => patchFieldState(f.fieldname, { status }));

        refetchOnboardingList();
        showToast(`Section "${sectionName}" ${status.toLowerCase()}`, "success");
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Request failed";
        showToast(`Error: ${msg}`, "error");
      }
    },
    [onboardingName, sections, patchFieldState, showToast, refetchOnboardingList]
  );

  // ── Bulk approve ALL pending fields across entire document ─────────────────

  const bulkApproveAllPending = useCallback(async () => {
    try {
      await bulkUpdateApprovalStatus(onboardingName, "Approved");

      setFieldStates((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((fn) => {
          if (next[fn].status === "Pending") {
            next[fn] = { ...next[fn], status: "Approved" };
          }
        });
        return next;
      });

      refetchOnboardingList();
      showToast("All pending fields approved", "success");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Request failed";
      showToast(`Error: ${msg}`, "error");
    }
  }, [onboardingName, setFieldStates, showToast, refetchOnboardingList]);

  return {
    singleAction,
    bulkSelectedAction,
    sectionAction,
    bulkApproveAllPending,
  };
}

// ─── useSectionNav ────────────────────────────────────────────────────────────

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