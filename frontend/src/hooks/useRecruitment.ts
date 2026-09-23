import { useSyncExternalStore } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
  QueryClient,
  UseMutationResult,
} from "@tanstack/react-query";
import toast from "react-hot-toast";
import { recruitmentService } from "../services/recruitmentService";
import { requisitionService } from "../services/requisitionService";
import { errorResponseFormater } from "../utils/errorResponseFormater";
import { ApprovalAllocation, CreateJobRequisitionPayload } from "../types/recruitment";
import {
  IJPApplicationSubmitResponse,
  UseSubmitIJPApplicationVariables,
  IJPApplicationWithdrawPayload,
  IJPApplicationWithdrawResponse,
} from "../components/Recruitment/IJPTypes";

// Refetch the Requisition list. DataListView (fetchFunction mode) nests its list
// key as [["job-requisitions", <employee>], "pagination", ...], so the key is
// wrapped one level deep for React Query's partial matcher to hit it, and
// refetchType "all" refetches even while the list is unmounted (the user is
// still on the form when the first of these fires).
const invalidateRequisitionList = (queryClient: QueryClient) =>
  queryClient.invalidateQueries({
    queryKey: [["job-requisitions"]],
    refetchType: "all",
  });

// Write approvers into the Requisition rows the list already holds in cache,
// leaving every other field (and the query's fetch state) untouched — the list
// re-renders with the approver filled in and nothing else moves. Covers both
// shapes DataListView caches: a single page ({ data: rows }) and the infinite
// query's page array.
const applyApprovalAllocationToCache = (
  queryClient: QueryClient,
  allocationByName: Map<string, ApprovalAllocation[]>,
) => {
  const patchRows = (rows: unknown[]) =>
    rows.map((row) => {
      const name = (row as { name?: string } | null)?.name;
      const allocation = name ? allocationByName.get(name) : undefined;
      return allocation ? { ...(row as object), approval_allocation: allocation } : row;
    });

  const patchPage = (page: unknown) => {
    const rows = (page as { data?: unknown } | null)?.data;
    return Array.isArray(rows) ? { ...(page as object), data: patchRows(rows) } : page;
  };

  queryClient.setQueriesData({ queryKey: [["job-requisitions"]] }, (cached: unknown) => {
    if (!cached || typeof cached !== "object") return cached;

    const pages = (cached as { pages?: unknown }).pages;
    if (Array.isArray(pages)) {
      return { ...(cached as object), pages: pages.map(patchPage) };
    }

    return patchPage(cached);
  });
};

// Approvers of just-created requisitions, keyed by name: `null` while still
// being polled, the approvers once found. The list rows alone can't be trusted
// for this — QueryProvider re-fetches the list for ~12s after an invalidate,
// and a fetch that started before the allocation landed overwrites the patched
// row with an empty one. Keeping the result here lets the "Pending With"
// tooltip show a loader while polling and the found approvers after, instead
// of flashing "Not Allocated" in between.
const createdAllocations = new Map<string, ApprovalAllocation[] | null>();
const createdAllocationListeners = new Set<() => void>();

const setCreatedAllocation = (name: string, allocation: ApprovalAllocation[] | null | undefined) => {
  if (allocation === undefined) createdAllocations.delete(name);
  else createdAllocations.set(name, allocation);
  createdAllocationListeners.forEach((listener) => listener());
};

const subscribeCreatedAllocations = (listener: () => void) => {
  createdAllocationListeners.add(listener);
  return () => {
    createdAllocationListeners.delete(listener);
  };
};

// Resolve a requisition's approvers for display: the row's own allocation when
// it has one, else the one found after create; `loading` while still polling.
export function useApprovalAllocation(
  name: string | undefined,
  rowAllocation: ApprovalAllocation[] | undefined,
): { allocation: ApprovalAllocation[] | undefined; loading: boolean } {
  const created = useSyncExternalStore(subscribeCreatedAllocations, () =>
    name ? createdAllocations.get(name) : undefined,
  );

  if (rowAllocation?.length) return { allocation: rowAllocation, loading: false };
  if (created === null) return { allocation: rowAllocation, loading: true };
  return { allocation: created ?? rowAllocation, loading: false };
}

export function useCreateJobRequisition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (
      variables:
        | CreateJobRequisitionPayload
        | { payload: CreateJobRequisitionPayload; draft?: string | null },
    ) => {
      // Either the payload on its own (the v1 form) or the payload plus the
      // draft it was raised from (the v2 wizard).
      const { payload, draft } =
        variables && "payload" in variables
          ? (variables as { payload: CreateJobRequisitionPayload; draft?: string | null })
          : { payload: variables as CreateJobRequisitionPayload, draft: null };
      return recruitmentService.createJobRequisition(payload, draft);
    },

    onSuccess: (response) => {
      // One refetch, to pull in the rows that were just created.
      invalidateRequisitionList(queryClient);

      // That refetch races the background job that allocates approvers, so it
      // often lands before `approval_allocation` is populated and the list
      // shows a pending requisition with no approver until a manual reload.
      // Wait for the approvers (detached — it must outlive this form's
      // unmount), then write them straight into the cached rows. Deliberately
      // NOT a second invalidate: this is one field on one row, and a refetch
      // would flash the list's loading state and shift the page for it.
      const createdNames = (response?.data?.requisitions ?? [])
        .map((requisition) => requisition?.name)
        .filter((name): name is string => Boolean(name));

      createdNames.forEach((name) => {
        setCreatedAllocation(name, null);
        void requisitionService.waitForApprovalAllocation(name).then((allocation) => {
          if (!allocation.length) {
            setCreatedAllocation(name, undefined);
            return;
          }
          setCreatedAllocation(name, allocation);
          applyApprovalAllocationToCache(queryClient, new Map([[name, allocation]]));
        });
      });
    },
    onError: (error) => {
      toast.error(
        errorResponseFormater(
          error,
          "Failed to create job requisition. Please try again.",
        ),
      );
    },
  });
}

export function useIJPApplicationFields(opening: string) {
  return useQuery({
    queryKey: ["ijp-application-fields", opening],
    queryFn: () => recruitmentService.getIJPApplicationFields(opening),
    enabled: !!opening,
    staleTime: 5 * 60 * 1000,
  });
}

export function useIJPOpeningColumns() {
  return useQuery({
    queryKey: ["ijp-opening-columns"],
    queryFn: () => recruitmentService.getIJPOpeningColumns(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useSubmitIJPApplication(): UseMutationResult<
  IJPApplicationSubmitResponse,
  Error,
  UseSubmitIJPApplicationVariables
> {
  const queryClient = useQueryClient();

  return useMutation<
    IJPApplicationSubmitResponse,
    Error,
    UseSubmitIJPApplicationVariables
  >({
    mutationFn: ({ opening, data }: UseSubmitIJPApplicationVariables) =>
      recruitmentService.submitIJPApplication(opening, data),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["ijp-openings"],
      });
      queryClient.invalidateQueries({
        queryKey: ["my-applications"],
      });
      toast.success("Application submitted successfully");
    },
    onError: (error) => {
      toast.error(
        errorResponseFormater(
          error,
          "Failed to submit IJP application. Please try again.",
        ),
      );
    },
  });
}

export function useMyApplications() {
  return useQuery({
    queryKey: ["my-applications"],
    queryFn: () => recruitmentService.getMyApplications(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useWithdrawIJPApplication(): UseMutationResult<
  IJPApplicationWithdrawResponse,
  Error,
  IJPApplicationWithdrawPayload
> {
  const queryClient = useQueryClient();

  return useMutation<
    IJPApplicationWithdrawResponse,
    Error,
    IJPApplicationWithdrawPayload
  >({
    mutationFn: (payload: IJPApplicationWithdrawPayload) =>
      recruitmentService.withdrawIJPApplication(payload),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["ijp-openings"],
      });
      queryClient.invalidateQueries({
        queryKey: ["my-applications"],
      });
      toast.success("Application withdrawn successfully");
    },
    onError: (error) => {
      toast.error(
        errorResponseFormater(
          error,
          "Failed to withdraw IJP application. Please try again.",
        ),
      );
    },
  });
}
