import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import FrappeAPI from "../utils/frappeAPI";

const PENDO_API_BASE = "recruitment.api.pendo";

export type PendoAction = "Acted" | "Declined" | "Closed";

export type ActivePendo = {
  name: string;
  title: string;
  image: string;
  message: string | null;
  act_button_label: string;
  act_url: string | null;
  decline_button_label: string;
};

export type ActivePendoResponse = {
  success: boolean;
  pendo: ActivePendo | null;
};

const ACTIVE_PENDO_QUERY_KEY = ["pendo", "active"];

/**
 * The single popup (if any) due for the logged-in employee right now — see
 * recruitment.api.pendo.get_active_pendo. `staleTime` is deliberately long:
 * this is meant to be checked once per session ("after login"), not
 * re-fetched on every in-app navigation.
 */
export const useActivePendo = () => {
  return useQuery<ActivePendoResponse>({
    queryKey: ACTIVE_PENDO_QUERY_KEY,
    queryFn: async () => {
      const response = await FrappeAPI.callMethod(`${PENDO_API_BASE}.get_active_pendo`);
      return response as ActivePendoResponse;
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 1,
  });
};

/** Logs the employee's Act / Decline / Close response to the active popup. */
export const useRespondToPendo = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { pendo_popup: string; action: PendoAction }) => {
      const response = await FrappeAPI.callMethod(`${PENDO_API_BASE}.respond_to_pendo`, data);
      return response as { success: boolean };
    },
    onSuccess: () => {
      // So a Daily/Weekly/Monthly popup that's still due today doesn't
      // immediately reopen from a stale cached "active" response.
      queryClient.invalidateQueries({ queryKey: ACTIVE_PENDO_QUERY_KEY });
    },
  });
};
